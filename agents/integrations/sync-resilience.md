---
name: Sync Resilience Specialist
tier: integrations
triggers: sync resilience, sync state machine, sync recovery, webhook fallback, integration resilience, sync failure, sync degraded, sync status, delta sync, idempotent sync, sync health
depends_on: backend.md, infrastructure/background-jobs.md, features/realtime.md
conflicts_with: null
prerequisites: null
description: Resilience patterns for any external sync integration — state machine (healthy/degraded/recovering/failed), delta token management, webhook staleness detection, full resync triggers, idempotent upsert patterns. Use alongside any integration agent (Nylas, MS Graph, Stripe, etc.).
---

# Sync Resilience Specialist

## Role

Any integration that syncs external data (email, calendar, files, CRM records) needs resilience built in from day one — not bolted on after the first outage. This agent provides the resilience layer that wraps any external sync, making it observable, recoverable, and self-healing.

**Every integration in CodeBakers apps uses these patterns. No exceptions.**

## When to Use

- Building any sync that pulls data from an external API
- Setting up webhook handlers for external events
- After implementing a Nylas, MS Graph, Stripe, or similar integration
- When a sync is failing silently (the worst kind)
- When you need to explain the health of a sync to users

---

## The Sync State Machine

Every sync connection has one of four states. Track it. Surface it to users and admins.

```typescript
// lib/sync/types.ts
type SyncState = 
  | 'healthy'    // Webhooks firing, sync up to date
  | 'degraded'   // Webhooks stale, polling fallback active
  | 'recovering' // Full resync in progress after failure
  | 'failed';    // Multiple retries exhausted, manual intervention needed

interface SyncStatus {
  userId: string;
  integration: string;  // 'nylas', 'ms_graph', 'stripe', etc.
  state: SyncState;
  lastSyncAt: Date | null;
  lastWebhookAt: Date | null;
  lastErrorAt: Date | null;
  lastError: string | null;
  fullResyncRequired: boolean;
  consecutiveFailures: number;
}
```

### State Transition Logic

```typescript
// lib/sync/state-machine.ts

const WEBHOOK_STALE_MS = 15 * 60 * 1000;       // 15 min → degrade to polling
const MAX_CONSECUTIVE_FAILURES = 5;               // 5 failures → mark as failed
const FULL_RESYNC_THRESHOLD_HOURS = 24;           // If not synced in 24h → full resync

export async function evaluateSyncHealth(status: SyncStatus): Promise<SyncState> {
  // Already failed — don't auto-recover (needs manual trigger or full resync)
  if (status.state === 'failed') return 'failed';
  
  // Too many consecutive failures → fail
  if (status.consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) return 'failed';
  
  // Never synced or synced too long ago → needs full resync
  if (!status.lastSyncAt) return 'recovering';
  const hoursSinceSync = (Date.now() - status.lastSyncAt.getTime()) / (1000 * 60 * 60);
  if (hoursSinceSync > FULL_RESYNC_THRESHOLD_HOURS) return 'recovering';
  
  // Webhooks are stale → degrade to polling
  if (status.lastWebhookAt) {
    const msSinceWebhook = Date.now() - status.lastWebhookAt.getTime();
    if (msSinceWebhook > WEBHOOK_STALE_MS) return 'degraded';
  }
  
  return 'healthy';
}

export async function updateSyncState(
  userId: string,
  integration: string,
  update: Partial<SyncStatus>
) {
  await supabase
    .from('sync_status')
    .upsert({
      user_id: userId,
      integration,
      ...update,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,integration' });
}
```

---

## Database Schema

```sql
-- migration: create_sync_status_table
CREATE TABLE sync_status (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  integration TEXT NOT NULL,  -- 'nylas', 'ms_graph', 'stripe'
  state TEXT NOT NULL DEFAULT 'healthy' 
    CHECK (state IN ('healthy', 'degraded', 'recovering', 'failed')),
  last_sync_at TIMESTAMPTZ,
  last_webhook_at TIMESTAMPTZ,
  last_error_at TIMESTAMPTZ,
  last_error TEXT,
  consecutive_failures INT NOT NULL DEFAULT 0,
  full_resync_required BOOLEAN NOT NULL DEFAULT false,
  delta_cursor TEXT,  -- integration-specific: deltaLink, sync token, cursor, etc.
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, integration)
);

ALTER TABLE sync_status ENABLE ROW LEVEL SECURITY;

-- Users can read their own sync status
CREATE POLICY "users_read_own_sync_status" ON sync_status
  FOR SELECT USING (user_id = (select auth.uid()));

-- Only service role writes (sync workers run with service role)
CREATE POLICY "service_role_write_sync_status" ON sync_status
  FOR ALL USING (auth.role() = 'service_role');

CREATE INDEX idx_sync_status_user ON sync_status(user_id);
CREATE INDEX idx_sync_status_stale ON sync_status(last_webhook_at) 
  WHERE state != 'failed';
```

---

## Delta Token Management

The cursor/token that tells an integration "give me everything since last time."

```typescript
// lib/sync/delta-cursor.ts

export async function getDeltaCursor(userId: string, integration: string): Promise<string | null> {
  const { data } = await adminSupabase
    .from('sync_status')
    .select('delta_cursor')
    .eq('user_id', userId)
    .eq('integration', integration)
    .maybeSingle();
  return data?.delta_cursor ?? null;
}

export async function saveDeltaCursor(userId: string, integration: string, cursor: string) {
  await updateSyncState(userId, integration, {
    delta_cursor: cursor,
    last_sync_at: new Date(),
    consecutive_failures: 0,
    state: 'healthy',
  });
}

export async function clearDeltaCursor(userId: string, integration: string) {
  // Called when a full resync is needed
  await updateSyncState(userId, integration, {
    delta_cursor: null,
    full_resync_required: true,
    state: 'recovering',
  });
}
```

---

## Webhook Staleness Detection (Cron Job)

```typescript
// app/api/cron/sync-health/route.ts
// Run every 5 minutes via Vercel Cron / pg_cron

export async function GET(req: NextRequest) {
  // Verify cron secret
  if (req.headers.get('Authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Find all connections with stale webhooks
  const staleCutoff = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  
  const { data: staleConnections } = await adminSupabase
    .from('sync_status')
    .select('user_id, integration, state')
    .lt('last_webhook_at', staleCutoff)
    .neq('state', 'failed');

  for (const conn of staleConnections ?? []) {
    if (conn.state === 'healthy') {
      console.warn(`[SyncHealth] Webhook stale for ${conn.user_id}/${conn.integration} — degrading`);
      await updateSyncState(conn.user_id, conn.integration, { state: 'degraded' });
      
      // Trigger a poll to catch up on missed events
      await pollQueue.add('poll-sync', { userId: conn.user_id, integration: conn.integration });
    }
  }

  return NextResponse.json({ checked: staleConnections?.length ?? 0 });
}
```

---

## Idempotent Upsert Pattern

All sync handlers must be idempotent. Webhooks and polling may deliver the same event twice.

```typescript
// Pattern: upsert with conflict resolution, never raw insert

// ✅ Idempotent email upsert
await supabase
  .from('emails')
  .upsert(
    { message_id: msg.id, user_id: userId, subject: msg.subject, /* ... */ },
    { onConflict: 'message_id' }  // If duplicate, update (don't error)
  );

// ✅ Idempotent event upsert
await supabase
  .from('calendar_events')
  .upsert(
    { event_id: event.id, user_id: userId, title: event.title, /* ... */ },
    { onConflict: 'event_id', ignoreDuplicates: false }  // Update if exists
  );
```

**Never use `.insert()` in sync handlers.** Always `.upsert()` with the external ID as the conflict key.

---

## Error Handling in Sync Workers

```typescript
// lib/sync/run-sync.ts

export async function runSync(userId: string, integration: string, syncFn: () => Promise<void>) {
  try {
    await syncFn();
    
    // Success — reset failure counter
    await updateSyncState(userId, integration, {
      last_sync_at: new Date(),
      consecutive_failures: 0,
      last_error: null,
    });

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error(`[Sync] Failed for ${userId}/${integration}:`, errorMessage);

    // Increment failure counter
    const { data: current } = await adminSupabase
      .from('sync_status')
      .select('consecutive_failures')
      .eq('user_id', userId)
      .eq('integration', integration)
      .maybeSingle();

    const failures = (current?.consecutive_failures ?? 0) + 1;
    
    await updateSyncState(userId, integration, {
      consecutive_failures: failures,
      last_error: errorMessage,
      last_error_at: new Date(),
      state: failures >= 5 ? 'failed' : 'degraded',
    });
  }
}

// Usage in a worker:
await runSync(userId, 'nylas', () => syncEmailsForUser(userId));
```

---

## Surfacing Sync Status to Users

```typescript
// components/sync-status-badge.tsx
import { SyncState } from '@/lib/sync/types';

const STATUS_CONFIG: Record<SyncState, { label: string; color: string; description: string }> = {
  healthy:    { label: 'Synced', color: 'green', description: 'Up to date' },
  degraded:   { label: 'Syncing', color: 'yellow', description: 'Catching up via polling' },
  recovering: { label: 'Reconnecting', color: 'orange', description: 'Running full sync' },
  failed:     { label: 'Sync Error', color: 'red', description: 'Action required' },
};

export function SyncStatusBadge({ state }: { state: SyncState }) {
  const config = STATUS_CONFIG[state];
  return (
    <div data-testid="sync-status-badge" className={`badge badge-${config.color}`}>
      {config.label}
      <span className="tooltip">{config.description}</span>
    </div>
  );
}
```

---

## Checklist

- [ ] `sync_status` table created with migrations
- [ ] RLS on sync_status: users read own, service role writes
- [ ] SyncState enum covers: healthy / degraded / recovering / failed
- [ ] Delta cursor stored in `sync_status.delta_cursor`
- [ ] Cron job checks webhook staleness every 5 minutes
- [ ] Stale webhooks → state set to `degraded`, polling triggered
- [ ] All sync handlers use `runSync()` wrapper for error tracking
- [ ] 5+ consecutive failures → state set to `failed`
- [ ] All upsert operations use `.upsert()` with external ID conflict key
- [ ] Sync status badge visible to users in settings/dashboard
- [ ] Admin view shows all `failed` and `degraded` connections
