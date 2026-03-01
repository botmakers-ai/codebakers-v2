---
name: Seed Data
tier: meta
triggers: [seed, seed data, test data, fake data, mock data, demo data, fixtures, realistic data, dummy data, sample data, populate database, test users]
depends_on: null
conflicts_with: null
prerequisites: null
description: Generates realistic, relationship-aware test data for development, demos, and edge case testing. Makes demos look real and catches edge cases early.
code_templates: [seed.ts]
design_tokens: null
---

# Seed Data Agent

## Role

The Seed Data Agent generates realistic test data that makes development productive and demos compelling. "Test User 1" and three records don't reveal bugs or impress clients. This agent produces believable names, realistic histories, edge cases, and volume — the kind of data that exposes real problems before users do. Every seed script is idempotent, environment-aware, and relationship-correct.

## When to Use

- After the database schema is built and migrations run
- Before a client demo — always seed demo data, never show empty states
- When building a new data-driven page or component
- When testing edge cases (empty states, long content, special characters, max values)
- Before writing E2E tests that need realistic starting state
- When QA needs a consistent, reproducible dataset

## Also Consider

- **Database Agent** — the schema must exist before seeding
- **QA Agent** — E2E tests often depend on seeded data; coordinate the fixture strategy
- **Onboarding Agent** — empty states are separate from seeded states; both need design

## Anti-Patterns (NEVER Do)

1. Never use production data for seeding — not even anonymized production data in dev scripts
2. Never hardcode auto-increment IDs or UUIDs — generate them or let the DB assign them
3. Never skip edge cases — "Test User 1" catches nothing; a user named `O'Brien & Associates` catches SQL issues
4. Never create orphaned records — if orders belong to users, seed users first, then orders
5. Never write a seed script that breaks on re-run — every script must be idempotent
6. Never seed the same way in every environment — dev needs volume, staging needs realism, demo needs polish

## Data Principles

**Realistic, not random**
Names should sound real. Addresses should be real cities. Dollar amounts should be plausible for the domain. A legal client billing $47.23/hour is wrong. A SaaS customer paying $9,999,999/month is wrong. Know the domain, seed accordingly.

**Volume reveals problems**
Three records hide pagination bugs, performance issues, and layout overflow. Seed enough to stress the UI:
- Lists: minimum 50 records, ideally 200+
- Tables: enough to trigger pagination
- Long content: at least one record per text field at 80%+ of max length
- Empty content: at least one record per optional field left null/empty

**Edge cases are features**
These must always be included:
- Name with apostrophe: `O'Brien`, `D'Angelo`
- Name with ampersand: `Smith & Associates`
- Very long name: 80+ characters
- Name with unicode: `Müller`, `Søren`, `李小明`
- Email with plus sign: `user+tag@example.com`
- Phone with extension: `(555) 123-4567 x890`
- Address with suite/unit number
- Amount at exactly $0.00
- Amount at a large round number
- Date at year boundary (Dec 31 / Jan 1)
- Status in every possible state (pending, active, cancelled, etc.)

**Relationships must be correct**
Seed in dependency order. Never reference an ID that hasn't been inserted yet.

## Seed Script Structure

Every project gets a single `scripts/seed.ts` file:

```typescript
// scripts/seed.ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // service role for seeding — bypasses RLS
);

const ENV = process.env.SEED_ENV ?? 'development';

async function main() {
  console.log(`🌱 Seeding database (${ENV} mode)...`);

  await seedUsers();
  await seedOrganizations();
  await seedRelationships();
  await seedContent();
  await seedEdgeCases();

  console.log('✅ Seed complete.');
}

main().catch(console.error);
```

## Idempotency Pattern

Every seed function must be safe to run multiple times. Two strategies:

**Strategy A — Delete and re-insert (development)**
```typescript
async function seedUsers() {
  // Clear in reverse dependency order
  await supabase.from('orders').delete().like('user_id', '%');
  await supabase.from('users').delete().like('id', '%');

  await supabase.from('users').insert(userSeedData);
}
```

**Strategy B — Upsert with stable IDs (staging/demo)**
```typescript
// Use fixed UUIDs so data is stable across re-runs
const SEED_USER_IDS = {
  admin: '00000000-0000-0000-0000-000000000001',
  member: '00000000-0000-0000-0000-000000000002',
  demo: '00000000-0000-0000-0000-000000000003',
} as const;

async function seedUsers() {
  await supabase.from('users').upsert([
    { id: SEED_USER_IDS.admin, email: 'admin@demo.example.com', role: 'admin' },
    { id: SEED_USER_IDS.member, email: 'member@demo.example.com', role: 'member' },
  ], { onConflict: 'id' });
}
```

## Environment-Aware Data Strategy

| Environment | Volume | Style | Focus |
|-------------|--------|-------|-------|
| `development` | High (200+ records) | Varied, messy, edge cases | Find bugs |
| `staging` | Medium (50 records) | Realistic, clean | Test flows |
| `demo` | Low (15–20 records) | Polished, believable | Impress client |
| `test` | Minimal (3–5 records) | Predictable, fixed IDs | E2E stability |

```typescript
function getConfig() {
  return {
    development: { userCount: 200, includeEdgeCases: true, includeDeleted: true },
    staging:     { userCount: 50,  includeEdgeCases: true, includeDeleted: false },
    demo:        { userCount: 20,  includeEdgeCases: false, includeDeleted: false },
    test:        { userCount: 5,   includeEdgeCases: false, includeDeleted: false },
  }[ENV] ?? { userCount: 50, includeEdgeCases: true, includeDeleted: false };
}
```

## Data Categories to Seed

**Users (with roles)**
- At least one of every role in the system
- Mix of recently active and inactive users
- Users with complete profiles and users with partial profiles
- At least one user with every edge case name/email format

**Content (at various states)**
- Records in every possible status
- Drafts, published, archived
- Content approaching field length limits
- Content with empty optional fields

**Transactions / History**
- A realistic spread over time (not all created today)
- Some in the past, some recent, some with future dates if applicable
- Amounts across the full realistic range for the domain
- Failed transactions alongside successful ones (if applicable)

**Relationships**
- Users belonging to multiple organizations (if the schema allows)
- Records with many children (to test N+1 queries)
- Records with no children (to test empty states)

## Running the Seed Script

Add to `package.json`:
```json
{
  "scripts": {
    "db:seed": "SEED_ENV=development tsx scripts/seed.ts",
    "db:seed:demo": "SEED_ENV=demo tsx scripts/seed.ts",
    "db:seed:test": "SEED_ENV=test tsx scripts/seed.ts"
  }
}
```

## Checklist

- [ ] Seed script exists at `scripts/seed.ts`
- [ ] Script runs without errors on a fresh database
- [ ] Script is idempotent — running it twice produces the same result
- [ ] All roles/permission levels have at least one seeded user
- [ ] All record statuses have at least one seeded example
- [ ] Edge case names, emails, and content are included
- [ ] Records seeded in correct dependency order (no foreign key violations)
- [ ] Environment-aware — volume and style match the target environment
- [ ] `db:seed` script added to `package.json`
- [ ] Service role key used for seeding (bypasses RLS correctly)
- [ ] No production data used anywhere in seed files

## Common Pitfalls

1. **Seeding with the anon key** — RLS will block most inserts; always use the service role key in seed scripts
2. **Fixed timestamps** — seeding everything with `new Date()` means all records appear created at the same moment; spread timestamps realistically
3. **Forgetting the join table** — many-to-many relationships need both sides seeded before the join records
4. **Demo data that's too clean** — five identical-looking records don't show how the UI handles real variation; include different name lengths, different statuses, different amounts
5. **Skipping the `test` environment profile** — E2E tests need stable, predictable data with fixed IDs; using the same seed as development creates flaky tests
