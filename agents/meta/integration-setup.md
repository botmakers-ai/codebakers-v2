# Integration Setup Agent
# CodeBakers V4 | agents/meta/integration-setup.md

**Purpose:** Test external integrations in isolation BEFORE building features

**Trigger:** `@integration setup` OR user says "I need to test [API] integration first"

**Why This Exists:** Real projects need to test OAuth, payment APIs, external services in a sandbox before building features. Mixing integration testing with feature development creates chaos.

---

## The Problem

**Without Integration Setup:**
```
You: "Build email inbox feature with Microsoft Graph"
CodeBakers: *starts building UI while figuring out Graph API*
Result: Half-built feature + half-working integration + confusion
```

**With Integration Setup:**
```
You: "I need to set up Microsoft Graph integration first"
CodeBakers: *creates sandbox, tests OAuth + API, documents patterns*
You: "Now build email inbox feature"
CodeBakers: *uses proven integration patterns, focuses on feature*
Result: Clean separation, working integration, focused feature development
```

---

## Integration Setup Workflow

### **Step 1: Declare Integration**

```bash
@integration setup

# CodeBakers asks:
What integration are you setting up?
  [Microsoft Graph / Google Workspace / Stripe / Twilio / Custom API]

# Or specify directly:
@integration setup microsoft-graph
```

**Creates:**
- `sandbox/integrations/[name]/` — Isolated test project
- `.codebakers/INTEGRATION-CONFIG.md` — Integration documentation

---

### **Step 2: Sandbox Environment**

CodeBakers creates minimal test project:

```
sandbox/integrations/microsoft-graph/
├── .env.example
│   GRAPH_CLIENT_ID=
│   GRAPH_CLIENT_SECRET=
│   GRAPH_TENANT_ID=
│   GRAPH_REDIRECT_URI=http://localhost:3000/api/auth/callback
│
├── test-auth.ts         ← Test OAuth flow
├── test-mail-api.ts     ← Test mail endpoints
├── test-calendar-api.ts ← Test calendar endpoints
├── package.json         ← Minimal deps (@azure/msal-node, @microsoft/microsoft-graph-client)
└── README.md            ← Setup instructions
```

**CodeBakers generates test scripts:**

**test-auth.ts:**
```typescript
// Test OAuth flow in isolation
import { PublicClientApplication } from '@azure/msal-node'

async function testAuth() {
  const msalConfig = {
    auth: {
      clientId: process.env.GRAPH_CLIENT_ID!,
      authority: `https://login.microsoftonline.com/${process.env.GRAPH_TENANT_ID}`,
    }
  }

  const pca = new PublicClientApplication(msalConfig)

  console.log('🔧 Testing OAuth flow...')

  try {
    // Interactive auth
    const authResult = await pca.acquireTokenByDeviceCode({
      scopes: ['https://graph.microsoft.com/Mail.Read'],
      deviceCodeCallback: (response) => {
        console.log(`\n📱 Device Code Auth:\n${response.message}\n`)
      }
    })

    console.log('✅ Auth successful!')
    console.log('Access Token:', authResult.accessToken.substring(0, 20) + '...')
    console.log('Scopes:', authResult.scopes)
    console.log('Expires:', new Date(authResult.expiresOn!))

    return authResult.accessToken
  } catch (error) {
    console.error('❌ Auth failed:', error)
    throw error
  }
}

testAuth()
```

**test-mail-api.ts:**
```typescript
// Test Graph Mail API
import { Client } from '@microsoft/microsoft-graph-client'
import { testAuth } from './test-auth'

async function testMailAPI() {
  console.log('🔧 Testing Mail API...')

  const accessToken = await testAuth()

  const client = Client.init({
    authProvider: (done) => done(null, accessToken)
  })

  try {
    // Test: Get messages
    const messages = await client
      .api('/me/messages')
      .top(10)
      .select('subject,from,receivedDateTime')
      .get()

    console.log('✅ Mail API working!')
    console.log(`Fetched ${messages.value.length} messages`)
    console.log('First message:', messages.value[0]?.subject)

    // Test: Send message
    const sendResult = await client
      .api('/me/sendMail')
      .post({
        message: {
          subject: 'Test from integration sandbox',
          body: { contentType: 'Text', content: 'Testing Graph API' },
          toRecipients: [{ emailAddress: { address: 'test@example.com' } }]
        }
      })

    console.log('✅ Send mail working!')

    return { success: true, messageCount: messages.value.length }
  } catch (error) {
    console.error('❌ Mail API failed:', error)
    throw error
  }
}

testMailAPI()
```

---

### **Step 3: Interactive Testing**

```bash
# User runs tests in sandbox
cd sandbox/integrations/microsoft-graph
npm install
node test-auth.ts       # Test OAuth
node test-mail-api.ts   # Test mail endpoints
```

**CodeBakers watches for:**
- ✅ Auth successful
- ✅ API calls working
- ❌ Errors encountered

**Documents results:**

`.codebakers/INTEGRATION-CONFIG.md`:
```markdown
# Integration Configuration

## Microsoft Graph (Tested 2026-03-05)

**Status:** ✅ Working

### Authentication
- Method: OAuth 2.0 (MSAL)
- Flow: Device Code (for testing), Authorization Code (for production)
- Scopes Tested:
  - ✅ Mail.Read (works)
  - ✅ Mail.Send (works)
  - ✅ Calendars.Read (works)

### Endpoints Tested
- ✅ `/me/messages` (GET) — Fetch inbox
- ✅ `/me/sendMail` (POST) — Send email
- ✅ `/me/calendar/events` (GET) — Fetch calendar

### Known Issues
- ⚠️ `/me/messages` with `$filter` and `$orderby` causes silent failure
  → Use `$filter` OR `$orderby`, not both
- ⚠️ Scope `Mail.ReadWrite.All` requires admin consent
  → Use `Mail.ReadWrite` for user-delegated access

### Credentials Required
- Client ID: [stored in .env]
- Client Secret: [stored in .env]
- Tenant ID: [stored in .env]
- Redirect URI: http://localhost:3000/api/auth/callback

### Token Management Pattern
- Cache tokens per user ID: `tokens:{userId}:mail`
- Separate tokens for mail vs. calendar (prevents scope conflicts)
- Token refresh: 5-min buffer before expiry

### Rate Limits
- 10,000 requests per 10 minutes per user
- Throttling: 429 response with Retry-After header

### Next Steps
1. Copy working config to main project
2. Create `lib/integrations/microsoft-graph.ts` wrapper
3. Use patterns from sandbox tests in features
```

---

### **Step 4: Document Patterns**

CodeBakers extracts reusable patterns from successful tests:

`sandbox/integrations/microsoft-graph/PATTERNS.md`:
```markdown
# Microsoft Graph Patterns (From Sandbox Testing)

## Pattern: OAuth Token Acquisition

**Tested:** ✅ Working

```typescript
import { ConfidentialClientApplication } from '@azure/msal-node'

const msalConfig = {
  auth: {
    clientId: process.env.GRAPH_CLIENT_ID!,
    clientSecret: process.env.GRAPH_CLIENT_SECRET!,
    authority: `https://login.microsoftonline.com/${process.env.GRAPH_TENANT_ID}`
  }
}

const cca = new ConfidentialClientApplication(msalConfig)

async function getAccessToken(userId: string, scopes: string[]) {
  const cacheKey = `tokens:${userId}:mail`

  // Check cache first
  let cached = await redis.get(cacheKey)
  if (cached) {
    const token = JSON.parse(cached)
    if (token.expiresAt > Date.now() + 300000) { // 5-min buffer
      return token.accessToken
    }
  }

  // Acquire new token (using auth code from OAuth flow)
  const result = await cca.acquireTokenByCode({
    code: authCode,
    scopes,
    redirectUri: process.env.GRAPH_REDIRECT_URI!
  })

  // Cache token
  await redis.set(cacheKey, JSON.stringify({
    accessToken: result.accessToken,
    expiresAt: result.expiresOn.getTime()
  }), 'EX', 3600)

  return result.accessToken
}
```

## Pattern: Mail API Call with Error Handling

**Tested:** ✅ Working

```typescript
import { Client } from '@microsoft/microsoft-graph-client'

async function fetchMessages(accessToken: string, folderId: string) {
  const client = Client.init({
    authProvider: (done) => done(null, accessToken)
  })

  try {
    const response = await client
      .api(`/me/mailFolders/${folderId}/messages`)
      .top(50)
      .select('id,subject,from,receivedDateTime,isRead,hasAttachments')
      .orderBy('receivedDateTime desc') // Don't use with $filter!
      .get()

    return {
      success: true,
      messages: response.value,
      nextLink: response['@odata.nextLink']
    }
  } catch (error: any) {
    if (error.statusCode === 429) {
      // Rate limited
      const retryAfter = error.headers?.['retry-after'] || 60
      return { success: false, error: 'rate_limit', retryAfter }
    }

    if (error.statusCode === 401) {
      // Token expired
      return { success: false, error: 'token_expired' }
    }

    return { success: false, error: 'unknown', message: error.message }
  }
}
```
```

---

### **Step 5: Transition to Main Project**

Once sandbox integration works:

```bash
@integration finalize microsoft-graph

# CodeBakers:
# 1. Copies working config to main project:
#    → lib/integrations/microsoft-graph.ts
#    → .env.example (with Graph variables)
#
# 2. Creates wrapper with proven patterns:
#    → Uses token caching pattern from sandbox
#    → Uses error handling pattern from sandbox
#    → Documents rate limits and gotchas
#
# 3. Updates BRAIN.md:
#    → "Integration: Microsoft Graph (tested in sandbox)"
#    → Links to INTEGRATION-CONFIG.md
#
# 4. Marks integration as ready for use in features

✅ Microsoft Graph integration ready for use in features
→ Use in features: @build "inbox view with Microsoft Graph"
```

**Generated integration wrapper:**

`lib/integrations/microsoft-graph.ts`:
```typescript
/**
 * Microsoft Graph Integration
 * Tested in sandbox: 2026-03-05
 * Config: .codebakers/INTEGRATION-CONFIG.md
 */

import { ConfidentialClientApplication } from '@azure/msal-node'
import { Client } from '@microsoft/microsoft-graph-client'
import { redis } from '@/lib/redis'

// [Patterns from sandbox testing copied here]

export const graphClient = {
  getAccessToken,
  fetchMessages,
  sendMessage,
  // ... other proven methods
}
```

---

## Integration Setup Checklist

When user runs `@integration setup [name]`:

```
✅ Create sandbox directory
✅ Generate minimal test project
✅ Create test scripts for key endpoints
✅ Provide setup instructions (credentials, scopes)
✅ Watch for test results
✅ Document working patterns
✅ Document known issues
✅ Create integration wrapper for main project
✅ Update BRAIN.md with integration status
```

---

## Pre-Interview Integration Check

Update Interview Agent to ask:

```
Do you need to set up external integrations first?
  [Yes - set up integrations in sandbox]
  [No - I have integrations working]
  [Skip - no external integrations]

If Yes:
  → Run Integration Setup Agent first
  → Then return to interview

If No:
  → Ask: Which integrations? Where's the config?
  → Import from .codebakers/INTEGRATION-CONFIG.md

If Skip:
  → Continue with standard interview
```

---

## Supported Integrations (Templates)

**Pre-built sandbox templates:**

- `@integration setup microsoft-graph` — Microsoft 365 (Mail, Calendar, Teams, OneDrive)
- `@integration setup google-workspace` — Gmail, Calendar, Drive, Docs
- `@integration setup stripe` — Payments, subscriptions, webhooks
- `@integration setup twilio` — SMS, WhatsApp, voice
- `@integration setup sendgrid` — Transactional email
- `@integration setup aws-s3` — File storage
- `@integration setup custom-api` — Generic REST API template

Each template includes:
- Test scripts for key endpoints
- Auth flow testing
- Error handling examples
- Rate limit handling
- Webhook setup (if applicable)

---

## Benefits

**1. Separation of Concerns**
- Integration testing ≠ feature development
- Prove integrations work in isolation
- Then use proven patterns in features

**2. Risk Reduction**
- Know integration works BEFORE building features
- Document gotchas early (scope conflicts, rate limits)
- No "surprise issues" during feature development

**3. Faster Feature Development**
- Features use proven integration patterns
- No "figure out API while building UI"
- Copy-paste from sandbox tests

**4. Better Documentation**
- INTEGRATION-CONFIG.md is living reference
- Patterns extracted from real tests
- Gotchas documented with solutions

---

## Example: EaseMail Workflow with Integration Setup

```
1. Design Phase
   → Drop mockups in refs/design/
   → Run: @mockups
   → Generates DESIGN-CONTRACT.md

2. Integration Setup Phase (NEW)
   → Run: @integration setup microsoft-graph
   → CodeBakers creates sandbox
   → You test: OAuth, mail API, calendar API
   → Document: scope conflicts, token caching patterns
   → Finalize: @integration finalize microsoft-graph
   → Result: lib/integrations/microsoft-graph.ts ready

3. Interview Phase
   → Run: @interview
   → CodeBakers: "Detected Microsoft Graph integration (tested)"
   → Uses integration patterns automatically in features

4. Build Phase
   → Run: @build "inbox view"
   → CodeBakers: Uses proven Graph patterns from sandbox
   → No API figuring-out, just feature building
```

**Time Saved:**
- Without sandbox: 2-3 days per integration (mixed with features)
- With sandbox: 4-6 hours upfront, then 0 delays during features

---

## Integration with Existing CodeBakers

**Session Start (Step 7.75):**
```
7.75. Check for Integration Config
   → Read .codebakers/INTEGRATION-CONFIG.md (if exists)
   → Load integration patterns into context
   → Make available for feature development
```

**Build Loop:**
```
When building feature that needs external API:
  1. Check: Is integration tested in sandbox?
  2. If YES: Use patterns from INTEGRATION-CONFIG.md
  3. If NO: Recommend: @integration setup [name]
```

---

*CodeBakers V4 | Integration Setup Agent | agents/meta/integration-setup.md*
