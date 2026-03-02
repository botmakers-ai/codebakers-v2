# Pattern: Atomic Unit
# CodeBakers V4 | agents/patterns/atomic-unit.md
# Trigger: Starting any new feature in the build loop

---

## What Is an Atomic Unit

One complete vertical slice of functionality. Every layer. Every state. Every test. Locked shut before the next feature starts.

A unit is either **complete** or **not started**. There is no in-progress.

---

## Enforcement Mechanism 1: FIX-QUEUE Declaration

Before writing a single line of code for a feature, declare the atomic unit in FIX-QUEUE.md. This makes skipping items conscious, not accidental.

**Required format — copy this for every new feature:**

```markdown
## [F-001] [Feature Name]
Entity: [entity from dep map]
Actor: [user type from project-profile.md]
Status: IN PROGRESS
Started: [timestamp]

Atomic unit checklist:
BACKEND
  □ API route (with HOF wrapper)
  □ Zod schema + z.infer type
  □ id AND user_id filters on all mutations

MUTATION HANDLER (if create/update/delete)
  □ Dep map read — stores: [list from DEPENDENCY-MAP.md]
  □ All stores updated: [list each one]
  □ Active state field: [field name or N/A]
  □ Last-item case: [behavior or N/A]
  □ Optimistic update + rollback

UI
  □ Loading state
  □ Success state
  □ Error state
  □ Empty state
  □ Confirmation dialog (destructive actions only)
  □ Form validation before submit
  □ Mobile layout correct

TESTS
  □ E2E happy path
  □ E2E error path
  □ tsc --noEmit clean

GATE
  □ Real user can complete this flow end-to-end
  □ Hard refresh — state correct
  □ No console errors
  □ pnpm dep:map run and committed
  □ JSDoc on every new component and function
  □ API route documented inline (accepts, returns, errors)
  □ Every non-obvious decision has a // Why: comment
```

The checklist must be written out before coding starts. Every box must be checked before the feature is marked done.

---

## Enforcement Mechanism 2: Gate Commit Message

When a unit is complete, the commit message must follow this format:

```bash
git commit -m "feat(atomic): [feature name] — gate passed [N/N checks]"
```

Examples:
```bash
git commit -m "feat(atomic): delete account — gate passed 16/16 checks"
git commit -m "feat(atomic): upload document — gate passed 14/16 checks — 2 blocked (see FIX-QUEUE)"
```

If the commit message doesn't contain `gate passed`, the unit is not done. This creates an audit trail in `git log` that makes incomplete units immediately visible.

```bash
# See all atomic units and their gate status
git log --oneline | grep "feat(atomic)"
```

---

## Enforcement Mechanism 3: Completeness Verifier as Blocker

The Completeness Verifier does not just report findings — it blocks the next feature.

After every atomic unit, the Completeness Verifier runs automatically. If it finds any of the following, it adds them back to FIX-QUEUE.md as **P1 items ahead of the next feature**:

```
Blocker conditions:
□ Any button with no loading state
□ Any list with no empty state (blank is not empty state)
□ Any error that shows a technical message to the user
□ Any destructive action with no confirmation
□ Any form that doesn't validate before submit
□ Any flow in FLOWS.md that a real user cannot complete
□ tsc --noEmit fails
□ Hard refresh produces incorrect state
```

Since P1 items are always ahead of new features in the queue, the next feature literally cannot start until the current unit is truly complete.

**Completeness Verifier adds items in this format:**
```markdown
## [CV-001] Missing loading state — [Component].[action]
Priority: P1
Source: Completeness Verifier — [feature name]
Fix: Add loading state to [button/action] in [file]
Blocks: Next feature — resolve before continuing
```

---

## The Vertical Slice Checklist

Full reference. Use the FIX-QUEUE declaration format above during builds — this is the detailed explanation of each item.

```
ATOMIC UNIT: [Feature Name]
Entity: [entity]
─────────────────────────────────────────────
BACKEND
  □ API route created with HOF wrapper
  □ Zod schema defined, type derived with z.infer
  □ Every .update() and .delete() filters by id AND user_id
  □ Error responses are specific (not generic 500s)

MUTATION HANDLER (create/update/delete only)
  □ DEPENDENCY-MAP.md read before writing
  □ All stores updated (every one from the map)
  □ Active/selected state handled
  □ Last-item edge case handled
  □ Optimistic update implemented
  □ Rollback on API failure implemented

UI
  □ Loading state on every async action
  □ Success state confirms what happened
  □ Error state: what went wrong + what to do next
  □ Empty state: explicit, never blank
  □ Confirmation dialog on every destructive action
  □ Form validation visible before submit attempt
  □ Mobile layout works correctly (not just renders)

TESTS
  □ E2E test — happy path, start to finish
  □ E2E test — error path (API failure, empty state)
  □ Tests run against built app (pnpm build first)
  □ tsc --noEmit clean

GATE CHECK
  □ Real user can complete this flow in FLOWS.md
  □ Hard refresh — state correct after reload
  □ No console errors in browser
  □ pnpm dep:map run and result committed
  □ JSDoc on every new component and function
  □ API route documented inline (accepts, returns, errors)
  □ Every non-obvious decision has a // Why: comment
─────────────────────────────────────────────
GATE COMMIT: feat(atomic): [name] — gate passed [N/N checks]
```

---

## Build Order Within a Unit

Always build in this order. Each layer validates the one before it.

```
1. Zod schema + derived type
2. API route (uses the schema)
3. Store action (calls the API)
4. Mutation handler (uses store + dep map)
5. UI component (uses mutation handler)
6. All UI states (loading, success, error, empty)
7. E2E tests (tests the full flow)
8. pnpm dep:map (captures what was added)
9. Gate check + gate commit
```

Never build UI before API. Never build tests before UI.

---

## @fast Mode

Activated only when user explicitly requests it. For prototypes and internal tools only.

**Skipped in @fast:**
- E2E tests (both happy and error path)
- Mobile layout check
- Empty state (null render acceptable — logged as assumption)

**Never skipped even in @fast:**
- All store updates from dep map
- Active/selected state handling
- API error handling (try/catch + toast)
- tsc --noEmit clean
- Zod schemas
- id AND user_id filters on mutations

**@fast debt logging:** Every skipped item is automatically added to FIX-QUEUE.md as P2:
```markdown
## [FAST-001] Missing E2E test — [feature name]
Priority: P2
Source: @fast mode skip
Fix: Add E2E happy + error path tests for [feature]
```

Running `@rebuild` later closes all @fast debt.

---

## Blocked Units

If a unit cannot be completed (external credential needed, blocked on dependency):

```markdown
## [BLOCKED-001] [Feature Name]
Status: BLOCKED
Blocker: [exact reason]
Completed layers: [list what IS done]
Remaining: [list checkbox items not done]
Unblock: see CREDENTIALS-NEEDED.md → [section name]
Resume: When unblocked, complete [specific remaining items]
Gate commit: pending
```

Never mark a blocked unit complete. Never leave it silently incomplete. Always document exactly what's done and what's not.

---

## Integration Check (Every 2 Units)

After every 2 atomic units, before starting the third:

```bash
# Full test suite
pnpm test:e2e

# TypeScript clean across everything
tsc --noEmit

# Dep map current
pnpm dep:map
```

Check:
- Do the two new features work together?
- Do they share entities? Does the dep map reflect this?
- Does completing unit A affect state that unit B depends on?

Commit:
```bash
git commit -m "chore(integration): [unit A] + [unit B] — integration verified"
```

---

*CodeBakers V4 | Pattern: Atomic Unit | agents/patterns/atomic-unit.md*
