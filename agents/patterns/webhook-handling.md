---
triggers:
  - "webhook"
  - "Stripe webhook"
  - "webhook security"
  - "verify webhook"
  - "webhook signature"
  - "HMAC webhook"
  - "webhook retry"
  - "idempotent webhook"
  - "duplicate webhook"

depends_on:
  - security.md (signature verification, rate limiting)

prerequisites:
  - Next.js App Router
  - TypeScript
  - Supabase or database
  - Webhook provider (Stripe, GitHub, etc.)
  - Understanding of HMAC signatures

description: |
  Production-ready webhook handling covering: signature verification (HMAC-SHA256), idempotency (preventing
  duplicates), retry logic, error handling, Stripe webhooks, GitHub webhooks, database deduplication,
  and security best practices.
---

# Webhook Handling Pattern

## Research Foundation

**Searches performed:**
1. Webhook security verify signature HMAC Next.js 2024
2. Stripe webhook Next.js API route svix webhook verification 2024
3. Webhook retry idempotency database deduplication 2024

**Key findings:**
- **HMAC-SHA256 is standard** for webhook signature verification
- **Use timing-safe comparison** (`crypto.timingSafeEqual`) to prevent timing attacks
- **Raw request body required** for signature verification (disable Next.js body parser)
- **Webhooks delivered at-least-once** — expect and handle duplicates
- **Idempotency key** — track event IDs in database to prevent duplicate processing
- **Decouple ingestion from processing** — acknowledge webhook (200 OK) immediately, process async
- **Retention periods match retry policy** — if provider retries for 72 hours, keep event IDs 72+ hours
- **Redis for speed, database for durability** — use Redis for fast dedup checks, DB for audit trail

---

## Core Principles

1. **Verify signatures** — never trust webhook payload without verification
2. **Acknowledge immediately** — respond 200 OK within 5s, process async
3. **Idempotent processing** — handle duplicate events gracefully
4. **Fail gracefully** — return 500 for errors (provider will retry)
5. **Log everything** — webhook events are audit trail

---

## 1. Basic Webhook Handler (Stripe Example)

### API Route with Signature Verification

```typescript
// app/api/webhooks/stripe/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    // Verify signature
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // Log event (audit trail)
  console.log(`Received event: ${event.type} (${event.id})`);

  try {
    // Handle event
    await handleStripeEvent(event);
    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error('Error processing webhook:', err);
    // Return 500 so Stripe retries
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
  }
}

async function handleStripeEvent(event: Stripe.Event) {
  const supabase = await createClient();

  // Check for duplicate (idempotency)
  const { data: existing } = await supabase
    .from('webhook_events')
    .select('id')
    .eq('event_id', event.id)
    .single();

  if (existing) {
    console.log(`Duplicate event ${event.id} - skipping`);
    return;
  }

  // Record event (prevents duplicates)
  await supabase.from('webhook_events').insert({
    event_id: event.id,
    type: event.type,
    data: event.data,
    processed_at: new Date().toISOString(),
  });

  // Handle specific event types
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object as Stripe.Checkout.Session;
      await handleCheckoutCompleted(session);
      break;

    case 'customer.subscription.created':
      const subscription = event.data.object as Stripe.Subscription;
      await handleSubscriptionCreated(subscription);
      break;

    case 'customer.subscription.deleted':
      const deletedSub = event.data.object as Stripe.Subscription;
      await handleSubscriptionDeleted(deletedSub);
      break;

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const supabase = await createClient();

  // Upgrade user to premium
  await supabase
    .from('users')
    .update({
      plan: 'premium',
      stripe_customer_id: session.customer as string,
      upgraded_at: new Date().toISOString(),
    })
    .eq('email', session.customer_email);

  console.log(`User upgraded: ${session.customer_email}`);
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  // Handle subscription creation
  console.log(`Subscription created: ${subscription.id}`);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const supabase = await createClient();

  // Downgrade user
  await supabase
    .from('users')
    .update({
      plan: 'free',
      cancelled_at: new Date().toISOString(),
    })
    .eq('stripe_customer_id', subscription.customer as string);

  console.log(`Subscription cancelled: ${subscription.id}`);
}
```

### Database Schema for Idempotency

```sql
-- Store webhook events for idempotency and audit
CREATE TABLE webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT UNIQUE NOT NULL, -- Provider's event ID (e.g., evt_1234)
  type TEXT NOT NULL,             -- Event type (e.g., checkout.session.completed)
  data JSONB,                     -- Full event payload
  processed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast duplicate checking
CREATE INDEX idx_webhook_events_event_id ON webhook_events(event_id);

-- Auto-delete old events (after 90 days)
-- Adjust based on provider's retry window
CREATE OR REPLACE FUNCTION delete_old_webhook_events()
RETURNS void AS $$
BEGIN
  DELETE FROM webhook_events
  WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;
```

---

## 2. Generic HMAC Signature Verification

For providers that use HMAC but don't have an SDK (e.g., custom webhooks).

```typescript
// app/api/webhooks/custom/route.ts
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET!;

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get('x-webhook-signature');

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 });
  }

  // Verify HMAC signature
  if (!verifySignature(body, signature, WEBHOOK_SECRET)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  // Parse and process
  const event = JSON.parse(body);
  console.log('Received webhook:', event);

  // Process event...
  return NextResponse.json({ success: true });
}

function verifySignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  // Compute HMAC
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload, 'utf8');
  const expectedSignature = hmac.digest('hex');

  // Timing-safe comparison (prevents timing attacks)
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}
```

---

## 3. GitHub Webhook Example

```typescript
// app/api/webhooks/github/route.ts
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

const GITHUB_WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET!;

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get('x-hub-signature-256');

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 });
  }

  // Verify GitHub signature (SHA256)
  const hmac = crypto.createHmac('sha256', GITHUB_WEBHOOK_SECRET);
  hmac.update(body, 'utf8');
  const expectedSignature = `sha256=${hmac.digest('hex')}`;

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const event = JSON.parse(body);
  const eventType = req.headers.get('x-github-event');

  console.log(`GitHub event: ${eventType}`, event);

  // Handle specific events
  switch (eventType) {
    case 'push':
      await handlePush(event);
      break;
    case 'pull_request':
      await handlePullRequest(event);
      break;
    case 'issues':
      await handleIssue(event);
      break;
  }

  return NextResponse.json({ success: true });
}

async function handlePush(event: any) {
  console.log('Push to:', event.repository.full_name);
  // Trigger CI/CD, etc.
}

async function handlePullRequest(event: any) {
  console.log('PR:', event.action, event.pull_request.title);
}

async function handleIssue(event: any) {
  console.log('Issue:', event.action, event.issue.title);
}
```

---

## 4. Async Processing with Queue

Decouple webhook ingestion from processing for reliability.

```typescript
// lib/queue.ts
interface QueuedWebhook {
  eventId: string;
  type: string;
  data: any;
  receivedAt: string;
}

const webhookQueue: QueuedWebhook[] = [];

export function enqueueWebhook(event: QueuedWebhook) {
  webhookQueue.push(event);
  // In production, use BullMQ, AWS SQS, or similar
  processQueue(); // Start processing asynchronously
}

async function processQueue() {
  while (webhookQueue.length > 0) {
    const event = webhookQueue.shift()!;

    try {
      await processWebhookEvent(event);
    } catch (err) {
      console.error('Error processing queued webhook:', err);
      // Re-queue or send to dead-letter queue
    }
  }
}

async function processWebhookEvent(event: QueuedWebhook) {
  // Heavy processing here (can take minutes)
  console.log('Processing:', event.eventId);
  await new Promise((resolve) => setTimeout(resolve, 5000)); // Simulate work
  console.log('Completed:', event.eventId);
}
```

```typescript
// app/api/webhooks/stripe/route.ts
import { enqueueWebhook } from '@/lib/queue';

export async function POST(req: NextRequest) {
  // ... signature verification ...

  // Enqueue for async processing
  enqueueWebhook({
    eventId: event.id,
    type: event.type,
    data: event.data,
    receivedAt: new Date().toISOString(),
  });

  // Respond immediately (within 5s)
  return NextResponse.json({ received: true });
}
```

---

## 5. Testing Webhooks Locally

### Using Stripe CLI

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Trigger test events
stripe trigger checkout.session.completed
stripe trigger customer.subscription.deleted
```

### Using ngrok (Generic)

```bash
# Install ngrok
brew install ngrok

# Start tunnel
ngrok http 3000

# Use ngrok URL in webhook provider
# Example: https://abc123.ngrok.io/api/webhooks/custom
```

---

## Anti-Patterns

### Anti-Pattern 1: Not Verifying Signatures

**❌ WRONG:**
```typescript
export async function POST(req: NextRequest) {
  const event = await req.json();
  // Process without verification
  await handleEvent(event);
  return NextResponse.json({ success: true });
}
```

**Problem:** Anyone can send fake webhooks to your endpoint.

**✅ CORRECT:** Always verify signatures (see examples above).

---

### Anti-Pattern 2: No Idempotency

**❌ WRONG:**
```typescript
export async function POST(req: NextRequest) {
  // No duplicate check
  await upgradeUserToPremium(userId);
  return NextResponse.json({ success: true });
}
```

**Problem:** Webhook retries cause duplicate charges, multiple emails, etc.

**✅ CORRECT:** Check event ID in database before processing.

---

### Anti-Pattern 3: Long-Running Processing Blocks Response

**❌ WRONG:**
```typescript
export async function POST(req: NextRequest) {
  // Heavy processing (takes 30 seconds)
  await sendEmailToAllUsers();
  await generateReports();
  await syncWithThirdParty();

  return NextResponse.json({ success: true }); // Timeout!
}
```

**Problem:** Provider times out, retries, creates duplicates.

**✅ CORRECT:** Enqueue for async processing, respond immediately.

---

### Anti-Pattern 4: Returning 200 on Error

**❌ WRONG:**
```typescript
export async function POST(req: NextRequest) {
  try {
    await processEvent(event);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed' }, { status: 200 }); // Wrong!
  }
}
```

**Problem:** Provider thinks webhook succeeded, doesn't retry.

**✅ CORRECT:** Return 500 so provider retries.

---

### Anti-Pattern 5: No Logging

**❌ WRONG:**
```typescript
export async function POST(req: NextRequest) {
  await processEvent(event);
  return NextResponse.json({ success: true });
}
```

**Problem:** No audit trail, can't debug issues.

**✅ CORRECT:** Log every webhook event to database and console.

---

## Testing Checklist

- [ ] **Signature verification works**
  - [ ] Valid signatures accepted
  - [ ] Invalid signatures rejected (401)
  - [ ] Missing signatures rejected (400)

- [ ] **Idempotency works**
  - [ ] Duplicate events skipped
  - [ ] Event IDs stored in database
  - [ ] No double-processing

- [ ] **Error handling correct**
  - [ ] Return 200 on success
  - [ ] Return 500 on processing error (triggers retry)
  - [ ] Return 400/401 on invalid request (no retry)

- [ ] **Tested locally**
  - [ ] Stripe CLI or ngrok used for testing
  - [ ] All event types handled
  - [ ] Logs show correct processing

---

## Security Checklist

- [ ] **Signatures verified**
  - [ ] HMAC-SHA256 verification implemented
  - [ ] Timing-safe comparison used
  - [ ] Secret stored securely (environment variable)

- [ ] **Rate limiting applied**
  - [ ] Max 100 webhooks per minute per provider
  - [ ] Prevents spam/DDoS

- [ ] **Webhook URL not guessable**
  - [ ] Use UUIDs in URL if possible (`/api/webhooks/abc-123`)
  - [ ] Or restrict by IP (if provider supports)

- [ ] **Events logged for audit**
  - [ ] All webhook events stored in database
  - [ ] Includes timestamp, type, payload

---

## Integration Notes

**Works well with:**
- **security.md** — Signature verification, rate limiting
- **real-time-sync.md** — Trigger real-time updates from webhooks

**Dependencies:**
- Depends on `security.md` for signature verification patterns

---

## References

1. [Stripe Webhooks Documentation](https://stripe.com/docs/webhooks)
2. [GitHub Webhooks Documentation](https://docs.github.com/en/webhooks)
3. [Hookdeck: Webhook Best Practices](https://hookdeck.com/webhooks/guides/implement-webhook-idempotency)
4. [HMAC Security](https://webhooks.fyi/security/hmac)

---

## Version History

- **v1.0** (2024-01-15): Initial webhook handling pattern covering signature verification, idempotency, retry logic, Stripe/GitHub examples
