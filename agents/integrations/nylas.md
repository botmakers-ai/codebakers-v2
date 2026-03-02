---
name: Nylas Integration Specialist
tier: integrations
triggers: nylas, nylas email, nylas calendar, nylas v3, email sync nylas, nylas webhook, nylas oauth, nylas contacts
depends_on: agents/core/auth.md, agents/core/backend.md, agents/features/realtime.md
conflicts_with: null
prerequisites: "Nylas v3 account, API key from https://app.nylas.com"
description: Nylas v3 email and calendar sync — auth flow, webhook setup with polling fallback, email read/send, folder sync, token refresh, staleness detection. V3 SDK only (7.x+). Contains v2→v3 migration patterns.
---

# Nylas Integration Specialist

## Role

Implements production-grade email and calendar sync using the Nylas v3 API. Manages the Nylas OAuth flow through Supabase, webhook-driven sync with automatic polling fallback when webhooks stall, email read/send operations, and folder normalization. Understands the critical v2→v3 breaking changes and how to avoid them.

**Nylas v2 was deprecated December 31, 2024. All new implementations use v3 only.**

## When to Use

- Building email client features (read inbox, send email, sync folders)
- Syncing calendar events from Gmail or Outlook via Nylas
- Implementing email-based workflows (process inbound, auto-reply)
- Migrating a v2 Nylas integration to v3

## Also Consider

- **microsoft-365.md** — if you need deep Graph API features beyond what Nylas provides
- **features/realtime.md** — for the webhook staleness detection pattern
- **infrastructure/background-jobs.md** — for BullMQ sync workers

---

## Anti-Patterns (NEVER Do)

1. ❌ Use Nylas v2 SDK patterns (`Nylas.config()`, static methods) — v3 is instance-based
2. ❌ Assume camelCase field names — v3 removed automatic conversion, verify each field
3. ❌ Rely on webhooks alone — Nylas silently marks endpoints as `failed` after repeated failures
4. ❌ Store Nylas access tokens without refresh logic — they expire
5. ❌ Fetch full email body in list queries — paginate headers first, fetch body on demand
6. ❌ Skip idempotency in sync handlers — webhooks and polling may deliver the same event twice

---

## V2 → V3 Breaking Changes (Migration Reference)

```typescript
// ❌ V2: Static class methods
import Nylas from 'nylas';
Nylas.config({ clientId: '...', clientSecret: '...' });
const nylas = Nylas.with(accessToken);
const messages = await nylas.messages.list({ limit: 10 });

// ✅ V3: Instance-based, explicit API key
import Nylas from 'nylas';
const nylas = new Nylas({ apiKey: process.env.NYLAS_API_KEY! });
const messages = await nylas.messages.list({
  identifier: grantId,  // V3: "grant" replaces access token
  queryParams: { limit: 10 },
});
```

Key differences:
- V2: `accessToken` per user. V3: `grantId` per connected account + API key on the Nylas client
- V2: auto camelCase. V3: exact field names from API docs (mostly snake_case in responses)
- V2: `Nylas.with(token)`. V3: all calls pass `identifier: grantId`
- V2: webhook payload structure different. V3: new payload format with `grantId`

---

## Standards & Patterns

### Installation

```bash
pnpm add --save-exact nylas
```

Verify version is 7.x+:
```bash
node -e "console.log(require('./node_modules/nylas/package.json').version)"
```

### Nylas Client Setup

```typescript
// lib/nylas/client.ts
import Nylas from 'nylas';

export const nylas = new Nylas({
  apiKey: process.env.NYLAS_API_KEY!,
  apiUri: 'https://api.us.nylas.com',  // or api.eu.nylas.com for EU
});
```

### OAuth Flow — Connect a User's Email Account

```typescript
// 1. Generate auth URL (server action)
// lib/nylas/auth.ts
export async function getNylasAuthUrl(userId: string): Promise<string> {
  const authUrl = nylas.auth.urlForOAuth2({
    clientId: process.env.NYLAS_CLIENT_ID!,
    redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/nylas/callback`,
    loginHint: undefined,  // Optional: pre-fill email
    state: userId,  // Pass userId to retrieve in callback
  });
  return authUrl;
}

// 2. Handle callback (API route)
// app/api/nylas/callback/route.ts
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const userId = searchParams.get('state');

  if (!code || !userId) return NextResponse.redirect('/connect-email?error=missing_params');

  try {
    // Exchange code for grant
    const { grantId } = await nylas.auth.exchangeCodeForToken({
      clientId: process.env.NYLAS_CLIENT_ID!,
      clientSecret: process.env.NYLAS_CLIENT_SECRET!,
      redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/nylas/callback`,
      code,
    });

    // Save grantId to DB (NOT accessToken — that's v2)
    await supabase
      .from('email_connections')
      .upsert({
        user_id: userId,
        grant_id: grantId,
        connected_at: new Date().toISOString(),
        last_webhook_at: null,
      });

    return NextResponse.redirect('/dashboard?connected=email');
  } catch (err) {
    console.error('[Nylas] OAuth callback error:', err);
    return NextResponse.redirect('/connect-email?error=auth_failed');
  }
}
```

### Email Sync — Webhook + Polling Fallback

```typescript
// lib/nylas/sync-manager.ts
const WEBHOOK_STALE_THRESHOLD_MS = 15 * 60 * 1000; // 15 minutes

export async function syncEmailsForUser(userId: string) {
  const connection = await getEmailConnection(userId);
  if (!connection) return;

  const mode = await getSyncMode(connection);
  
  if (mode === 'polling') {
    await pollEmails(userId, connection.grant_id);
  }
  // If webhook mode — just wait for webhooks, they call syncEmailBatch
}

async function getSyncMode(connection: EmailConnection): Promise<'webhook' | 'polling'> {
  if (!connection.last_webhook_at) return 'polling';
  const staleMs = Date.now() - new Date(connection.last_webhook_at).getTime();
  return staleMs > WEBHOOK_STALE_THRESHOLD_MS ? 'polling' : 'webhook';
}

async function pollEmails(userId: string, grantId: string) {
  try {
    const messages = await nylas.messages.list({
      identifier: grantId,
      queryParams: {
        limit: 50,
        // Fetch only since last sync
        received_after: Math.floor((Date.now() - 24 * 60 * 60 * 1000) / 1000),
      },
    });

    await upsertMessages(userId, messages.data);
  } catch (err) {
    console.error(`[Nylas] Poll failed for ${userId}:`, err);
    // Don't throw — log and continue
  }
}
```

### Webhook Handler

```typescript
// app/api/nylas/webhook/route.ts
export async function POST(req: NextRequest) {
  // 1. Verify webhook signature
  const signature = req.headers.get('x-nylas-signature');
  const body = await req.text();
  
  const isValid = verifyNylasWebhook(body, signature, process.env.NYLAS_WEBHOOK_SECRET!);
  if (!isValid) return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });

  const payload = JSON.parse(body);

  // 2. Process each delta
  for (const delta of payload.deltas ?? []) {
    const { grantId, type, object } = delta;
    
    // Find user by grantId
    const connection = await getConnectionByGrantId(grantId);
    if (!connection) continue;

    // 3. Update last_webhook_at — staleness detection
    await supabase
      .from('email_connections')
      .update({ last_webhook_at: new Date().toISOString() })
      .eq('grant_id', grantId);

    // 4. Process the event
    if (type === 'message.created' && object.type === 'message') {
      await syncSingleMessage(connection.user_id, grantId, object.id);
    }
    // Handle message.updated, message.deleted, etc.
  }

  // Always return 200 — if Nylas gets non-200, it marks webhook as failed
  return NextResponse.json({ received: true });
}

// ⚠️ Critical: Nylas marks your webhook as "failed" if it gets repeated non-200 responses
// Return 200 even for events you don't handle — log and move on
```

### Webhook Signature Verification

```typescript
// lib/nylas/webhook-verify.ts
import crypto from 'crypto';

export function verifyNylasWebhook(
  body: string,
  signature: string | null,
  secret: string
): boolean {
  if (!signature) return false;
  
  const hmac = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');
  
  return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(signature));
}
```

### Fetch and Send Email

```typescript
// lib/nylas/email.ts

// Read messages
export async function getMessages(grantId: string, limit = 20) {
  const { data } = await nylas.messages.list({
    identifier: grantId,
    queryParams: { limit },
  });
  return data;
}

// Fetch a single message with body
export async function getMessage(grantId: string, messageId: string) {
  const { data } = await nylas.messages.find({
    identifier: grantId,
    messageId,
  });
  return data;
}

// Send email
export async function sendEmail(
  grantId: string,
  { to, subject, body }: { to: string; subject: string; body: string }
) {
  const { data } = await nylas.messages.send({
    identifier: grantId,
    requestBody: {
      to: [{ email: to }],
      subject,
      body,
    },
  });
  return data;
}
```

### Upsert Pattern (Idempotent Sync)

```typescript
// lib/nylas/upsert-messages.ts
// Must be idempotent — called from both webhook and polling

export async function upsertMessages(userId: string, messages: NylasMessage[]) {
  if (!messages.length) return;

  const rows = messages.map(msg => ({
    user_id: userId,
    message_id: msg.id,
    subject: msg.subject ?? '',
    from_email: msg.from?.[0]?.email ?? '',
    from_name: msg.from?.[0]?.name ?? '',
    received_at: new Date(msg.date * 1000).toISOString(),
    is_read: msg.unread === false,
    thread_id: msg.threadId ?? null,
    snippet: msg.snippet ?? '',
    // Don't store body in list sync — fetch on demand
  }));

  await supabase
    .from('emails')
    .upsert(rows, { onConflict: 'message_id' });  // idempotent
}
```

---

## Environment Variables

```bash
# .env.local
NYLAS_API_KEY=nylas_...            # From Nylas Dashboard → API Keys
NYLAS_CLIENT_ID=...                # From Nylas App Settings
NYLAS_CLIENT_SECRET=...            # From Nylas App Settings
NYLAS_WEBHOOK_SECRET=...           # From Nylas Webhook Settings
```

---

## Checklist

- [ ] Nylas SDK version is 7.x+ (v3) — verified with `node -e "require('nylas/package.json').version"`
- [ ] No v2 patterns (`Nylas.config()`, `Nylas.with()`, static methods)
- [ ] OAuth flow uses `grantId`, not `accessToken`
- [ ] Webhook handler returns 200 for ALL payloads (including unhandled types)
- [ ] Webhook signature verification implemented
- [ ] `last_webhook_at` updated on every webhook received
- [ ] Polling fallback kicks in when `last_webhook_at` is stale (> 15 min)
- [ ] Sync handlers are idempotent (upsert with `onConflict`, not insert)
- [ ] Email body fetched on demand — not in list sync
- [ ] Grant ID stored in DB, not access token
- [ ] Webhook secret in env vars — not hardcoded
