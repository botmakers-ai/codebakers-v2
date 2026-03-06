# Pattern: OAuth Token Management
# CodeBakers V4 | agents/patterns/oauth-token-management.md

---

## The Problem

**OAuth token caching errors cause authentication loops, stale tokens, and scope conflicts:**

```
Common symptoms:
- User connects account → logout/login → wrong account loads
- Add new permission → stuck with old permissions, can't access new scope
- Multi-account app → Account A data shows for Account B
- Token refresh fails silently → user sees stale data
```

**Root causes:**
1. **Token cache not tied to user ID** — multiple users share one cache key
2. **Scope conflicts** — mixing different permission sets in same cache
3. **No incremental consent** — adding scope forces full re-authentication
4. **Admin consent confusion** — `.All` scopes require admin, not user approval

---

## Universal OAuth Rules

These apply to ALL OAuth providers (Microsoft, Google, GitHub, etc.):

### Rule 1: Token Cache MUST Tie to User ID

**❌ WRONG - Global cache (multiple users overwrite each other):**
```typescript
// Single cache key for all users
const cacheKey = 'oauth_tokens'
await redis.set(cacheKey, JSON.stringify(tokens))
```

**✅ CORRECT - User-scoped cache:**
```typescript
// Unique cache key per user
const cacheKey = `oauth_tokens:${userId}`
await redis.set(cacheKey, JSON.stringify(tokens))
```

**Why this matters:**
- User A connects account → tokens cached under A's ID
- User B logs in → reads from B's cache, not A's
- No cross-user token leakage

---

### Rule 2: Scope Changes Require Cache Invalidation

**❌ WRONG - Old tokens persist with old scopes:**
```typescript
// Add new scope but keep old tokens
const tokens = await getTokens(userId)  // Has old scopes
await callAPI(tokens.accessToken)       // Missing new permission → fails
```

**✅ CORRECT - Clear cache when scopes change:**
```typescript
// Option 1: Invalidate cache when adding scope
async function addScope(userId: string, newScope: string) {
  await redis.del(`oauth_tokens:${userId}`)  // Force re-auth with new scope
  return { requiresReauth: true }
}

// Option 2: Incremental consent (supported by some providers)
async function addScope(userId: string, newScope: string) {
  const currentScopes = await getCurrentScopes(userId)
  const allScopes = [...currentScopes, newScope]

  // Request new token with combined scopes
  const tokens = await requestTokensWithScopes(userId, allScopes)
  await redis.set(`oauth_tokens:${userId}`, JSON.stringify(tokens))
}
```

---

### Rule 3: Never Mix Scopes in Single Token

**❌ WRONG - One token for everything:**
```typescript
// Request all scopes at once
const scopes = ['email', 'calendar', 'mail.read', 'files.read', 'teams.read']
const tokens = await getTokens(scopes)  // Token cache poisoning risk
```

**✅ CORRECT - Separate tokens per resource:**
```typescript
// Mail-specific token
const mailScopes = ['mail.read', 'mail.send']
const mailTokens = await getTokens(userId, 'mail', mailScopes)

// Files-specific token
const filesScopes = ['files.read', 'files.write']
const filesTokens = await getTokens(userId, 'files', filesScopes)

// Cache keys: oauth_tokens:user123:mail, oauth_tokens:user123:files
```

**Why this matters:**
- Scope conflicts don't poison entire cache
- Can revoke file access without breaking mail
- Easier to debug permission issues

---

### Rule 4: Token Refresh Must Handle Failures

**❌ WRONG - Silent failure returns stale token:**
```typescript
async function getAccessToken(userId: string) {
  const cached = await redis.get(`oauth_tokens:${userId}`)
  if (cached) return JSON.parse(cached).accessToken  // Might be expired!
}
```

**✅ CORRECT - Refresh expired tokens, handle failures:**
```typescript
async function getAccessToken(userId: string): Promise<string | null> {
  const cacheKey = `oauth_tokens:${userId}`
  const cached = await redis.get(cacheKey)

  if (!cached) {
    return null  // No token → require re-auth
  }

  const tokens = JSON.parse(cached)

  // Check expiration (5 minute buffer)
  const expiresAt = tokens.expiresAt
  const now = Date.now()
  const bufferMs = 5 * 60 * 1000

  if (now < expiresAt - bufferMs) {
    return tokens.accessToken  // Still valid
  }

  // Token expired → attempt refresh
  try {
    const refreshed = await refreshAccessToken(tokens.refreshToken)

    // Update cache with new tokens
    await redis.set(cacheKey, JSON.stringify({
      accessToken: refreshed.accessToken,
      refreshToken: refreshed.refreshToken,
      expiresAt: Date.now() + (refreshed.expiresIn * 1000)
    }))

    return refreshed.accessToken
  } catch (error) {
    // Refresh failed → invalidate cache
    await redis.del(cacheKey)
    return null  // Require re-auth
  }
}
```

---

## Provider-Specific Patterns

### Microsoft (MSAL + Graph API)

**Scope Conflict Issue:**

```typescript
// ❌ WRONG - Mixing mail and Teams scopes causes cache poisoning
const scopes = [
  'https://graph.microsoft.com/Mail.Read',
  'https://graph.microsoft.com/Chat.Read'  // ← Conflicts with Mail scope
]

const token = await msalClient.acquireTokenSilent({ scopes })
// Result: Token has Mail.Read but NOT Chat.Read (cache poisoned)
```

**✅ CORRECT - Separate token acquisition per resource:**

```typescript
// Mail token
const mailToken = await msalClient.acquireTokenSilent({
  scopes: ['https://graph.microsoft.com/Mail.Read'],
  account: userAccount
})

// Teams token (separate cache entry)
const teamsToken = await msalClient.acquireTokenSilent({
  scopes: ['https://graph.microsoft.com/Chat.Read'],
  account: userAccount
})
```

**Admin Consent Scopes:**

Scopes ending in `.All` require tenant admin approval, not user approval:

```typescript
// ❌ These require admin consent - user auth will fail:
'https://graph.microsoft.com/Mail.ReadWrite.All'
'https://graph.microsoft.com/Calendars.ReadWrite.All'
'https://graph.microsoft.com/Files.ReadWrite.All'

// ✅ These work with user consent:
'https://graph.microsoft.com/Mail.ReadWrite'
'https://graph.microsoft.com/Calendars.ReadWrite'
'https://graph.microsoft.com/Files.ReadWrite'
```

**Detect admin-consent scopes and warn:**

```typescript
function requiresAdminConsent(scope: string): boolean {
  return scope.endsWith('.All')
}

function validateScopes(scopes: string[]): { valid: boolean; adminRequired: string[] } {
  const adminScopes = scopes.filter(requiresAdminConsent)

  if (adminScopes.length > 0) {
    return {
      valid: false,
      adminRequired: adminScopes
    }
  }

  return { valid: true, adminRequired: [] }
}

// Usage:
const { valid, adminRequired } = validateScopes(requestedScopes)
if (!valid) {
  throw new Error(
    `Admin consent required for: ${adminRequired.join(', ')}\n` +
    `User cannot grant these permissions. Contact tenant admin.`
  )
}
```

**Incremental Consent Flow:**

```typescript
async function addScopeToExistingAuth(
  userId: string,
  newScope: string
): Promise<{ success: boolean; requiresReauth: boolean }> {
  // Get current scopes from cache
  const cacheKey = `msal_tokens:${userId}`
  const cached = await redis.get(cacheKey)

  if (!cached) {
    return { success: false, requiresReauth: true }
  }

  const { scopes: currentScopes, account } = JSON.parse(cached)

  // Check if scope already granted
  if (currentScopes.includes(newScope)) {
    return { success: true, requiresReauth: false }
  }

  // Attempt incremental consent (silent)
  try {
    const result = await msalClient.acquireTokenSilent({
      scopes: [...currentScopes, newScope],
      account
    })

    // Success → update cache with new scopes
    await redis.set(cacheKey, JSON.stringify({
      ...JSON.parse(cached),
      scopes: [...currentScopes, newScope],
      accessToken: result.accessToken,
      expiresAt: result.expiresOn.getTime()
    }))

    return { success: true, requiresReauth: false }
  } catch (error) {
    // Silent acquisition failed → need interactive consent
    if (error instanceof InteractionRequiredAuthError) {
      return { success: false, requiresReauth: true }
    }

    throw error
  }
}
```

---

### Google OAuth

**Incremental Authorization:**

Google supports incremental authorization natively:

```typescript
// Initial auth - basic profile only
const initialScopes = ['openid', 'email', 'profile']
const tokens = await googleClient.getToken(code, initialScopes)

// Later - add Gmail access without re-auth
const newScopes = ['https://www.googleapis.com/auth/gmail.readonly']
const updatedTokens = await googleClient.getToken(refreshToken, newScopes)

// Token now has both profile AND gmail scopes
```

**Token Storage:**

```typescript
interface GoogleTokenCache {
  userId: string
  accessToken: string
  refreshToken: string
  scopes: string[]
  expiresAt: number
}

async function cacheGoogleTokens(userId: string, tokens: GoogleTokenCache) {
  await redis.set(
    `google_tokens:${userId}`,
    JSON.stringify(tokens),
    'EX',
    3600  // 1 hour TTL (tokens valid for 1 hour)
  )
}
```

---

### GitHub OAuth

**Scope Addition:**

GitHub doesn't support incremental consent. Adding scope requires full re-authentication:

```typescript
async function addGitHubScope(userId: string, newScope: string) {
  // GitHub: must re-auth with all scopes at once
  await redis.del(`github_tokens:${userId}`)

  return {
    requiresReauth: true,
    authUrl: `https://github.com/login/oauth/authorize?` +
      `client_id=${clientId}&` +
      `scope=${encodeURIComponent([...existingScopes, newScope].join(' '))}&` +
      `state=${userId}`
  }
}
```

---

## Account Switching Pattern

**Multi-account apps must clear/reload tokens on account switch:**

```typescript
async function switchAccount(
  userId: string,
  fromAccountId: string,
  toAccountId: string
) {
  // Clear previous account's token cache
  await redis.del(`oauth_tokens:${userId}:${fromAccountId}`)

  // Load new account's tokens
  const newTokens = await redis.get(`oauth_tokens:${userId}:${toAccountId}`)

  if (!newTokens) {
    // New account not connected → require auth
    return { requiresAuth: true }
  }

  // Verify token is valid
  const tokens = JSON.parse(newTokens)
  const isValid = await verifyToken(tokens.accessToken)

  if (!isValid) {
    // Token expired/invalid → require re-auth
    await redis.del(`oauth_tokens:${userId}:${toAccountId}`)
    return { requiresAuth: true }
  }

  return {
    requiresAuth: false,
    accessToken: tokens.accessToken
  }
}
```

---

## Integration with Error Sniffer

Add to Error Sniffer detection (category: Integration Errors):

```typescript
// Pattern signatures:
"Token cache not scoped to user ID"
"Scope conflict in token acquisition"
"Admin consent required but user auth attempted"
"Token refresh failed silently"

// Auto-trigger warning when:
- OAuth library usage detected without user ID in cache key
- Multiple scopes requested in single token (Microsoft Graph)
- Scope ending in .All detected (Microsoft)
- Token refresh without error handling

// Confidence: HIGH (these always cause auth issues)
```

---

## Checklist: OAuth Implementation

```
□ Token cache key includes user ID (never global)
□ Token cache key includes resource/scope category (if multi-resource)
□ Token expiration checked before use (5 min buffer)
□ Token refresh implemented with error handling
□ Refresh failure invalidates cache (forces re-auth)
□ Scope changes invalidate cache OR use incremental consent
□ Admin-consent scopes (.All) rejected with clear error
□ Multi-account switching clears old account cache
□ Account ID stored with tokens (for account-scoped resources)
```

---

## Common Errors and Fixes

### Error: "Token valid but API returns 401"

**Cause:** Token has wrong scopes (scope conflict or cache poisoning)

**Fix:**
1. Clear token cache: `await redis.del(`oauth_tokens:${userId}`)`
2. Re-authenticate with correct scopes
3. Separate tokens per resource to prevent conflicts

---

### Error: "User granted permission but still can't access"

**Cause:** Using cached token with old scopes

**Fix:**
1. Invalidate cache when adding scope: `await redis.del(cacheKey)`
2. Or implement incremental consent (if provider supports)
3. Verify new scope appears in `token.scopes` array

---

### Error: "Admin consent required"

**Cause:** Requesting scope ending in `.All` (Microsoft)

**Fix:**
1. Change to user-delegated scope (remove `.All`)
2. Or: Get tenant admin to pre-approve scope in Azure portal
3. Show clear error: "This permission requires admin approval"

---

### Error: "Wrong account data after switching"

**Cause:** Token cache not account-scoped

**Fix:**
```typescript
// Before (wrong):
const cacheKey = `tokens:${userId}`

// After (correct):
const cacheKey = `tokens:${userId}:${accountId}`
```

---

## CodeBakers Integration

**Auto-log to ASSUMPTIONS.md:**

```markdown
## [Date] OAuth Token Management

Decision: Implemented user-scoped token caching with separate resource tokens

Context: Multi-account email app with Microsoft Graph integration

Token cache structure:
- Key pattern: `msal_tokens:{userId}:{accountId}:{resource}`
- Resources: mail, calendar, files (separate tokens to prevent scope conflicts)
- TTL: 1 hour (matches Graph token expiration)

Scope conflict prevention:
- Mail token: scopes=['Mail.Read', 'Mail.Send']
- Calendar token: scopes=['Calendars.ReadWrite']
- Never mix mail + calendar in same token (prevents MSAL cache poisoning)

Incremental consent:
- Adding scope attempts silent acquisition first
- Falls back to interactive auth if required
- Admin-consent scopes (.All) blocked with clear error

Reasoning:
- User ID in cache key prevents cross-user token leakage
- Account ID in cache key handles account switching correctly
- Resource separation prevents scope conflicts (EaseMail lesson learned)
- Incremental consent avoids forcing full re-auth for new permissions

Alternatives considered:
- Single token for all scopes (rejected - causes cache poisoning)
- Global cache key (rejected - security risk)
- No expiration checking (rejected - stale token errors)

Reversibility: Medium - changing cache structure requires migration
```

---

*CodeBakers V4 | Pattern: OAuth Token Management | agents/patterns/oauth-token-management.md*
