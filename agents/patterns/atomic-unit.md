# Pattern: Atomic Unit
# CodeBakers V4 | agents/patterns/atomic-unit.md
# Trigger: Starting any new feature in the build loop

---

## What Is an Atomic Unit

One complete vertical slice of functionality. Every layer. Every state. Every test. Locked shut before the next feature starts.

A unit is either **complete** or **not started**. There is no in-progress.

---

## The Vertical Slice

Every atomic unit covers all of these. No exceptions unless @fast mode is active.

```
ATOMIC UNIT: [Feature Name]
Entity: [entity from dep map]
─────────────────────────────────────────────
BACKEND
  □ API route created (with HOF wrapper)
  □ Zod schema defined, type derived with z.infer
  □ Every .update() and .delete() filters by id AND user_id
  □ Error responses are specific, not generic 500s

MUTATION HANDLER (if create/update/delete)
  □ Dep map read — all stores identified
  □ All stores updated
  □ Active/selected state handled
  □ Last-item edge case handled
  □ Optimistic update + rollback on failure

UI
  □ Loading state (every async action)
  □ Success state (confirms what happened)
  □ Error state (what went wrong + what to do)
  □ Empty state (explicit, never blank)
  □ Confirmation dialog (every destructive action)
  □ Form validation visible before submit
  □ Mobile layout correct

TESTS
  □ E2E test covers the full flow start to finish
  □ Test runs against built app (never dev server)
  □ Happy path passes
  □ Error path passes (API failure, empty state)

COMPLETENESS CHECK
  □ Real user can complete this flow in FLOWS.md
  □ Hard refresh — state correct after reload
  □ No console errors
  □ pnpm dep:map run and committed
─────────────────────────────────────────────
GATE: Every box checked = unit complete = next feature unlocks
```

---

## The Lock Rule

**Do not start the next feature until the current atomic unit passes the gate.**

This means:
- No "I'll add the error state later"
- No "tests can wait until the end"
- No "I'll fix the empty state in a cleanup pass"

Later never comes. If it's not built in the unit, it ships broken.

If a box genuinely cannot be completed right now (external credential needed, blocked on dependency):
- Document it in `CREDENTIALS-NEEDED.md` with exact unblock steps
- Mark the unit `[BLOCKED: reason]` in FIX-QUEUE.md
- Move to the next unit — do not leave it silently incomplete

---

## Build Order Within a Unit

Always build in this order. Each layer depends on the one before it.

```
1. Zod schema + derived type
2. API route (uses the schema)
3. Store action (calls the API)
4. Mutation handler (uses store action + dep map)
5. UI component (uses mutation handler)
6. States (loading, success, error, empty — added to the component)
7. E2E test (tests the full flow through the UI)
8. pnpm dep:map (captures what was added)
9. Gate check (every box above)
```

Never build UI before API. Never build tests before UI. The order matters because each layer validates the one before it.

---

## @fast Mode

When `@fast` is active, these boxes are skipped:

```
SKIPPED IN @fast:
  □ E2E tests
  □ Error path tests
  □ Mobile layout check
  □ Empty state (replaced with null render — must be noted in ASSUMPTIONS.md)

NEVER SKIPPED (even in @fast):
  □ All stores updated (dep map)
  □ Active/selected state handled
  □ API error handling (try/catch + toast)
  □ TypeScript clean (tsc --noEmit)
  □ Zod schemas
  □ id AND user_id filters on mutations
```

@fast builds faster but accumulates known debt. Every skipped item is logged in FIX-QUEUE.md as P2 automatically. Running `@rebuild` later will close the debt.

---

## Integration Check (Every 2 Units)

After every 2 atomic units complete, run a cross-unit integration check before continuing:

```
□ Do the two new features work together correctly?
□ Do they share any entities? If yes — does the dep map reflect this?
□ Does completing unit A affect the state that unit B depends on?
□ Run: pnpm test:e2e (full suite, not just new tests)
□ Run: tsc --noEmit
□ Commit: git commit -m "feat: [unit A] + [unit B] — integration verified"
```

---

## What Goes in FIX-QUEUE for a Blocked Unit

```markdown
## [BLOCKED-001] [Feature Name] — waiting on [blocker]
Status: BLOCKED
Blocker: [exact reason — e.g. "Nylas grant_id needed", "Supabase bucket policy needed"]
Completed layers: [list what IS done]
Remaining: [list what is NOT done]
Unblock: see CREDENTIALS-NEEDED.md → [section]
Resume: When unblocked, complete [specific remaining boxes]
```

---

*CodeBakers V4 | Pattern: Atomic Unit | agents/patterns/atomic-unit.md*
