---
name: Integration Verifier
tier: meta
triggers: integration test, verify integration, feature handoff test, cross-feature test, end to end verify, agent handoff check
depends_on: qa.md, ui-smoke.md
conflicts_with: null
prerequisites: "supabase start, pnpm build"
description: Runs end-to-end flow tests after every 2 build agents complete. Tests that features work together — not just in isolation. Catches integration failures at handoff boundaries before they compound.
---

# Integration Verifier

## Role

After every 2 build agents complete, run integration tests that verify features work together as a system — not just as isolated units.

The most common failure pattern in audited apps: individual components pass their own tests, but break the moment they need to hand off to each other. Auth works. Database works. Backend works. But auth → backend → database together = broken.

**Conductor triggers this automatically after every 2 build agents complete.**

## When to Use

- After 2 build agents have completed (automatic)
- Before handing off to the next agent
- When a bug crosses multiple systems
- When "everything works individually but breaks together"

---

## The Integration Verification Checklist

### Layer 1: Data Flow (Auth → DB → API)

```typescript
// tests/integration/auth-db-api.test.ts
// Uses REAL local Supabase — never mocked

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

describe('Auth → DB Integration', () => {
  let testUserId: string;
  let session: any;

  beforeAll(async () => {
    // Sign up a fresh test user
    const { data, error } = await supabase.auth.signUp({
      email: `integration-test-${Date.now()}@example.com`,
      password: 'TestPassword123!',
    });
    expect(error).toBeNull();
    testUserId = data.user!.id;
    session = data.session;
  });

  afterAll(async () => {
    // Clean up test user
    // (use admin client to delete)
  });

  it('Authenticated user can read their own data', async () => {
    // Set the auth session
    await supabase.auth.setSession(session);
    
    const { data, error } = await supabase.from('profiles').select().eq('id', testUserId);
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data[0].id).toBe(testUserId);
  });

  it('Authenticated user CANNOT read another user\'s data (RLS check)', async () => {
    await supabase.auth.setSession(session);
    
    // Try to read records belonging to a different user
    const { data } = await supabase
      .from('profiles')
      .select()
      .neq('id', testUserId);  // Other users' profiles
    
    // RLS should return empty — not another user's data
    expect(data).toHaveLength(0);
  });

  it('Unauthenticated request returns empty (RLS blocks all)', async () => {
    // Sign out
    await supabase.auth.signOut();
    
    const { data } = await supabase.from('profiles').select();
    expect(data).toHaveLength(0);  // RLS blocks — not 401, just empty
  });
});
```

### Layer 2: API → Service → DB Flow

```typescript
// tests/integration/api-service-db.test.ts

describe('API Route → Service → DB Integration', () => {
  it('POST /api/[resource] creates record and returns it', async () => {
    const res = await fetch('http://localhost:3000/api/projects', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${testSession.access_token}`,
      },
      body: JSON.stringify({ name: 'Integration Test Project' }),
    });
    
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.id).toBeDefined();
    
    // Verify it actually exists in DB
    const { data: dbRecord } = await adminSupabase
      .from('projects')
      .select()
      .eq('id', data.id)
      .maybeSingle();
    expect(dbRecord).not.toBeNull();
    expect(dbRecord?.name).toBe('Integration Test Project');
  });

  it('GET /api/[resource] only returns current user\'s records', async () => {
    const res = await fetch('http://localhost:3000/api/projects', {
      headers: { 'Authorization': `Bearer ${testSession.access_token}` },
    });
    const data = await res.json();
    
    // Every record must belong to the test user
    data.forEach((record: any) => {
      expect(record.user_id).toBe(testUserId);
    });
  });
});
```

### Layer 3: Feature Handoff Verification

Run this after each specific agent handoff to verify the connection between the two:

```bash
# After Auth Agent + Backend Agent:
# - Protected route actually returns 401 for unauthenticated requests
# - Authenticated request reaches the handler (not rejected by middleware)

# After Backend Agent + Database Agent:
# - Server action creates record in DB
# - Server action reads correct records (respects user_id)

# After Database Agent + Frontend Agent:
# - UI shows data from DB (not hardcoded)
# - Empty state shows when DB is empty (not blank screen)

# After any Integration Agent (Nylas, Graph, Stripe):
# - Webhook endpoint returns 200 for valid payload
# - Webhook processes payload and updates DB
# - DB record visible in UI after webhook processed
```

---

## Integration Test Setup

```typescript
// tests/integration/setup.ts
import { execSync } from 'child_process';

// Before all integration tests: reset DB to clean state
beforeAll(() => {
  execSync('supabase db reset', { stdio: 'inherit' });
});

// After all integration tests: clean up
afterAll(() => {
  // supabase db reset again if needed, or just let it persist for debugging
});
```

---

## The Most Common Handoff Failures

From 6 audited apps — these are the patterns that break at handoffs:

| Agents | Common Failure |
|--------|---------------|
| Auth → Backend | Protected route accessible without auth (middleware gap) |
| Auth → Database | RLS not configured — queries return other users' data |
| Backend → Database | Service calls `.single()` → crashes on empty result |
| Database → Frontend | UI assumes data always exists — blank on empty DB |
| Feature → Feature | Second feature assumes first feature's data is present |
| Integration → DB | Webhook payload processed but DB not updated (silent fail) |

Run a targeted test for each of these after the relevant agents complete.

---

## Checklist

- [ ] Auth → DB integration: user can read own data, cannot read others
- [ ] RLS verified: unauthenticated requests return empty (not error)
- [ ] API routes return correct status codes (200/201/401/404/422)
- [ ] Server actions update DB and return expected response
- [ ] UI shows DB data (not hardcoded values)
- [ ] Empty state renders when DB is empty
- [ ] Webhook endpoints return 200 for valid payloads
- [ ] All tests run against local Supabase with `supabase start`
- [ ] No mocked Supabase calls in integration tests
