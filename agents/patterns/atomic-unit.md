# Pattern: Atomic Unit
# CodeBakers V4 | agents/patterns/atomic-unit.md
# Trigger: Starting any new feature in the build loop

---

## What Is an Atomic Unit

One complete vertical slice of functionality. Every layer. Every state. Every test. Locked shut before the next feature starts.

A unit has three states:
- **NOT STARTED** - declared in FIX-QUEUE.md, no code written
- **IN PROGRESS** - step-level progress tracked in `.codebakers/UNIT-PROGRESS.md`, wip commits per step
- **COMPLETE** - all steps done, gate check passed, squashed into single feat(atomic) commit

This three-state system enables crash recovery. If Claude Code dies mid-build, the next session reads UNIT-PROGRESS.md and wip commits to resume from the exact step that was interrupted.

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
  □ Loading state (on button/component, not global spinner)
  □ Success state (inline message where action happened)
  □ Error state (inline message where action happened)
  □ Empty state
  □ NO browser toasts — all feedback inline
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

## Step-Level Tracking and Crash Recovery

### The Problem

When Claude Code crashes mid-unit, partial work exists in the codebase with no record of what's done vs not done. The next session can't tell if schema was written, if stores were updated, or which layer failed.

### The Solution: Three-Layer Recovery System

**Layer 1 — `.codebakers/UNIT-PROGRESS.md`**

Tracks exactly which steps are complete for the in-progress unit. Updated after every step.

```markdown
# Unit Progress — Crash Recovery State

## Current Unit: delete-account-button
Started: 2026-03-02T14:32:00Z
Type: CRUD (mutation)
Entity: Account
Last Updated: 2026-03-02T14:45:12Z

### Steps (8 total)
- [x] 1. Schema/types — `src/lib/schemas/account.ts`
- [x] 2. API route — `src/app/api/account/delete/route.ts`
- [x] 3. Store updates — `useAccountStore` (1/3 complete)
      - [x] `useAccountStore.deleteAccount`
      - [ ] `useMailStore.clearAccountMessages` ← NEXT STEP
      - [ ] `activeMessageId` clear logic
- [ ] 4. Active state handling
- [ ] 5. UI component
- [ ] 6. Loading/error/empty states
- [ ] 7. Tests
- [ ] 8. Gate check

### Last Commit
Hash: abc1234
Message: wip(delete-account): API route

### Resume Context
Next step: Update `useMailStore.clearAccountMessages` — remove all messages where `accountId` matches deleted account. Then clear `activeMessageId` if it belongs to deleted account.

Why this approach: Dep map shows useMailStore references Account entity. Must clear stale messages to prevent rendering deleted account's data.

Edge case to handle: If last message in folder is from deleted account, set activeMessageId to null (not next message, since there isn't one).
```

**Layer 2 — wip Commits Per Step**

After completing each step, commit immediately:
```bash
git add -A
git commit -m "wip(delete-account): schema/types"
git commit -m "wip(delete-account): API route"
git commit -m "wip(delete-account): useAccountStore update"
# ← Claude Code dies here
```

Next session:
```bash
git log --oneline --grep="wip(delete-account)" | wc -l
# Output: 3
# Cross-reference with UNIT-PROGRESS.md → 3 steps done → resume from step 4
```

**Layer 3 — Mid-Build State in BRAIN.md**

Updated after every step (not just at 70% context):
```markdown
## Mid-Build State
Unit: delete-account-button
Type: CRUD
Status: IN PROGRESS
Started: 2026-03-02T14:32:00Z
Last Updated: 2026-03-02T14:45:12Z
Completed Steps: 3/8
Last Commit: abc1234
Next Step: Update useMailStore.clearAccountMessages
Resume: Read .codebakers/UNIT-PROGRESS.md for full step list and context
```

### Crash Recovery Flow

**When Claude Code starts a session:**
1. Check BRAIN.md for Mid-Build State section
2. If exists → read `.codebakers/UNIT-PROGRESS.md`
3. Run `git log --grep="wip([unit-name])" --oneline`
4. Verify: commit count matches completed steps in UNIT-PROGRESS.md
5. Run `tsc --noEmit` to verify current state is valid
6. Resume from next unchecked step

**Never:**
- Restart unit from scratch
- Re-do completed steps
- Guess which step to resume from

### Unit Type-Specific Steps

Different unit types have different step sequences:

**CRUD (create/update/delete):**
1. Schema/types
2. API route
3. Store updates (all stores from dep map)
4. Active state handling
5. UI component
6. Loading/error/empty states
7. Tests
8. Gate check

**Read-Only (list, detail, search):**
1. Schema/types
2. API route
3. Store updates (fetch + cache)
4. UI component
5. Loading/error/empty states
6. Tests
7. Gate check

**Integration (external API):**
1. API client setup
2. Credential handling
3. Webhook endpoints (if needed)
4. Store integration
5. Degraded state handling
6. Rate limit handling
7. Tests
8. Gate check

**Background Job (cron, queue worker):**
1. Job definition
2. Trigger logic
3. Error handling + retries
4. Logging
5. Tests
6. Gate check

**Refactor (no new functionality):**
1. Snapshot commit
2. Code changes
3. Type validation
4. Tests still pass
5. Gate check

When declaring a unit in FIX-QUEUE.md, specify the type. This determines the step sequence.

### After Each Step

**Immediate actions (no exceptions):**
```bash
# 1. Check off step in UNIT-PROGRESS.md
# 2. Update "Last Updated" timestamp
# 3. Update "Resume Context" with what's next
# 4. wip commit
git add -A
git commit -m "wip([unit-name]): [step-name]"

# 5. Update BRAIN.md Mid-Build State
#    - Increment completed steps count
#    - Update last commit hash
#    - Update next step description

# 6. Append to BUILD-LOG.md
echo "[timestamp] wip([unit-name]): [step-name] — [what was done]" >> .codebakers/BUILD-LOG.md
```

Never batch multiple steps. One step = one wip commit = one state update.

### On Unit Completion

After gate check passes, squash all wip commits into one clean commit:

```bash
# Count wip commits for this unit
git log --oneline --grep="wip(delete-account)" | wc -l
# Output: 8

# Squash them
git reset --soft HEAD~8

# Create final atomic commit
git add -A
git commit -m "feat(atomic): delete account — gate passed 8/8 checks

Completed:
- Schema/types for account deletion
- API route with HOF wrapper
- Store updates: useAccountStore, useMailStore, activeMessageId
- Active state edge case: null on last message delete
- UI component with confirmation dialog
- Loading/success/error states inline
- E2E tests (happy + error path)
- Gate check verified

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"

# Clean up progress tracking
rm .codebakers/UNIT-PROGRESS.md
# Remove Mid-Build State section from BRAIN.md
```

Git history now shows one clean commit per feature, not 8 wip commits cluttering the log.

### UNIT-PROGRESS.md Format Specification

This file lives at `.codebakers/UNIT-PROGRESS.md` and tracks exactly one in-progress unit at a time.

**When to create:** Immediately after declaring unit in FIX-QUEUE.md, before writing first line of code.

**When to update:** After every single step completion.

**When to delete:** After gate check passes and wip commits are squashed.

**Format:**
```markdown
# Unit Progress — Crash Recovery State

## Current Unit: [unit-name-from-FIX-QUEUE]
Started: [ISO timestamp]
Type: [CRUD | read-only | integration | refactor | background-job]
Entity: [entity name from DEPENDENCY-MAP.md or N/A]
Last Updated: [ISO timestamp — updates after every step]

### Steps ([N] total)
- [x] 1. [Step name] — [file(s) affected]
- [x] 2. [Step name] — [file(s) affected]
- [ ] 3. [Step name] — [file(s) affected] ← NEXT STEP
- [ ] 4. [Step name]
... [remaining steps based on unit type]

### Last Commit
Hash: [git commit hash — updates after every wip commit]
Message: wip([unit-name]): [step name]

### Resume Context
[2-4 sentences describing what's next and WHY]

What to do: [exact next action]
Why this approach: [reasoning, not just "because dep map says so" — explain the dependency]
Edge cases: [any gotchas to handle in next step]
Decisions made: [any architectural choices made so far that next step depends on]
```

**Example for CRUD unit:**
```markdown
# Unit Progress — Crash Recovery State

## Current Unit: delete-account-button
Started: 2026-03-02T14:32:00Z
Type: CRUD
Entity: Account
Last Updated: 2026-03-02T14:45:12Z

### Steps (8 total)
- [x] 1. Schema/types — `src/lib/schemas/account.ts`
- [x] 2. API route — `src/app/api/account/delete/route.ts`
- [x] 3. Store updates (partial: 1/3 complete)
      - [x] `useAccountStore.deleteAccount` — `src/stores/account-store.ts`
      - [ ] `useMailStore.clearAccountMessages` ← NEXT STEP
      - [ ] `activeMessageId` handling
- [ ] 4. Active state handling
- [ ] 5. UI component
- [ ] 6. Loading/error/empty states
- [ ] 7. Tests
- [ ] 8. Gate check

### Last Commit
Hash: a3f8e92
Message: wip(delete-account): useAccountStore update

### Resume Context
Next: Update `useMailStore` to clear messages when account is deleted.

What to do: Add `clearAccountMessages(accountId)` method to useMailStore. Filter out messages where `message.accountId === accountId`. Call this from `useAccountStore.deleteAccount` after successful API response.

Why this approach: DEPENDENCY-MAP.md shows useMailStore has `messages` array with accountId foreign key. If we don't clear these, deleted account's messages still render in UI — breaking UX and potentially showing stale data.

Edge cases:
1. If active message belongs to deleted account → set activeMessageId to null (don't auto-select next)
2. If folder becomes empty after deletion → show empty state (handled in step 6)

Decisions made:
- Chose optimistic delete (remove from store immediately, rollback on API error)
- Using soft delete on backend (account.deleted_at timestamp, not hard delete)
- RLS filters handle hiding deleted accounts from queries automatically
```

**Never:**
- Track multiple units in one file (only one unit can be in progress at a time)
- Leave Resume Context vague ("finish the store updates" is not enough — explain WHAT and WHY)
- Skip updating Last Updated timestamp
- Leave NEXT STEP unmarked (always mark which step is next with ← arrow)

### BRAIN.md Mid-Build State Format Specification

This section appears at the top of `.codebakers/BRAIN.md` when a unit is in progress.

**When to write:** After every step completion + at 70% context + at shutdown if unit incomplete.

**When to remove:** After gate check passes and unit is complete.

**Format:**
```markdown
## Mid-Build State
Unit: [unit-name]
Type: [CRUD | read-only | integration | refactor | background-job]
Status: IN PROGRESS
Started: [ISO timestamp]
Last Updated: [ISO timestamp — updates after every step]
Completed Steps: [N/total]
Last Commit: [git hash]
Next Step: [step name — one line summary]
Resume: Read .codebakers/UNIT-PROGRESS.md for full step list and context
```

**Example:**
```markdown
## Mid-Build State
Unit: delete-account-button
Type: CRUD
Status: IN PROGRESS
Started: 2026-03-02T14:32:00Z
Last Updated: 2026-03-02T14:45:12Z
Completed Steps: 3/8
Last Commit: a3f8e92
Next Step: Update useMailStore.clearAccountMessages
Resume: Read .codebakers/UNIT-PROGRESS.md for full step list and context
```

**Purpose:**
- Crash recovery trigger — Conductor checks for this section on startup
- Quick summary — tells next session "unit incomplete, read UNIT-PROGRESS.md"
- Timestamp tracking — how long has unit been in progress
- Commit verification — cross-reference with git log

**Never:**
- Put full resume context in BRAIN.md (that goes in UNIT-PROGRESS.md)
- Leave this section after unit completes (delete it during squash)
- Update only at shutdown (update after every step)

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
  □ Loading state on every async action (on button/component, not global)
  □ Success state confirms what happened (inline, where action occurred)
  □ Error state: what went wrong + what to do next (inline, where action occurred)
  □ Empty state: explicit, never blank
  □ NO browser toasts — all feedback inline
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

**Before starting:** Declare unit in FIX-QUEUE.md with type (CRUD/read-only/integration/refactor/background-job). Type determines step sequence.

**For each step:**
1. Complete the work for that step
2. Run `tsc --noEmit` to verify
3. Check off step in `.codebakers/UNIT-PROGRESS.md`
4. Update "Resume Context" with what's next
5. Make wip commit: `git commit -m "wip([unit-name]): [step-name]"`
6. Update BRAIN.md Mid-Build State
7. Append to BUILD-LOG.md

**After all steps → gate check → squash wip commits → final feat(atomic) commit**

Never build UI before API. Never build tests before UI. Never skip a wip commit. Never batch multiple steps into one commit during the build — only squash at the end.

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
