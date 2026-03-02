---
name: Fix Queue Builder
tier: meta
triggers: fix queue, build fix queue, classify issues, prioritize fixes, fix plan, what needs fixing
depends_on: agents/meta/audit-agent.md, agents/meta/audit-deps.md, agents/core/qa.md
conflicts_with: null
prerequisites: null
description: Reads QA gate output or audit report and produces a structured, dependency-ordered FIX-QUEUE.md that the Fix Executor can consume. Classifies every issue by fix type, orders by security → stability → quality → polish, identifies dependencies between fixes. The Fix Executor cannot run without this agent running first.
---

# Fix Queue Builder

## Role

You read findings — from the QA gate, the audit agent, or both — and produce a fix queue that tells the Fix Executor exactly what to do, in what order, with what approach.

The Fix Executor is autonomous. It needs complete information to work without stopping. Your job is to provide that information.

---

## Fix Classification System

Every issue gets classified as one of four types:

### MECHANICAL
Deterministic transformation. Same input always produces same output. Can be applied with find-and-replace or AST transformation. No judgment required.

Examples:
- `.single()` → `.maybeSingle()` + null check
- `strict: false` → `strict: true` in tsconfig
- Missing `data-testid` on interactive elements
- Unpinned package versions (`^1.2.3` → `1.2.3`)
- `console.log` → structured logging
- Missing `use client` directive when hooks present
- `supabase gen types typescript --local` (stale types)

**Fix Executor approach:** Apply transformation, run `tsc --noEmit`, commit.

### TEMPLATED
Structure is known, content must be filled from context. The pattern is fixed but the specifics come from reading the file.

Examples:
- Missing HOF wrapper on route (add wrapper, preserve existing handler logic)
- Missing bounded polling (wrap existing setInterval in max-attempts pattern)
- Missing atomic auth user creation (wrap existing signup in try/rollback)
- Missing error/loading/empty states on component (add states around existing render)

**Fix Executor approach:** Read file completely, inject template, fill specifics from context, verify.

### INFORMED
Fix requires reasoning about the specific code. The correct fix is deterministic once the context is understood, but can't be expressed as a template.

Examples:
- Missing `user_id` filter on mutation (must find correct ownership column from types)
- Raw SQL that needs parameterization (must understand the query logic)
- N+1 query in bulk operation (must understand what data is being fetched and why)
- Broken sync architecture (must understand what the sync is supposed to do)

**Fix Executor approach:** Read file + types + related files. Reason about correct fix. Apply. Verify. If wrong, read error and try again with new information.

### ARCHITECTURAL
Fix requires changing how a system works, not just how code is written. Usually means rebuilding a module rather than patching it.

Examples:
- Webhook-only sync with no polling fallback (rebuild sync layer)
- Auth provider other than Supabase (rebuild auth entirely)
- No RLS on tables with user data (add RLS to all tables — schema change)
- Worker running in Vercel API route (extract to separate process)

**Fix Executor approach:** Load relevant specialist agent (sync-resilience, auth, database, rebuild-specialist). Rebuild the module using correct patterns. Verify.

---

## Dependency Ordering

Fixes must execute in dependency order. Getting this wrong means fix B breaks A.

### Mandatory Order

```
Layer 1 — Foundation (must be first)
  → TypeScript strict mode (tsconfig)
  → Package version pinning
  → Stale Supabase types regeneration
  → Dead dependency removal

Layer 2 — Security (before anything that depends on auth working)
  → Raw SQL removal
  → Auth layer rebuild (if wrong provider)
  → RLS policies on all tables
  → Storage RLS (path-based ownership)

Layer 3 — Stability (before feature work)
  → .single() → .maybeSingle() replacements
  → Mutation double-filter (id + user_id)
  → HOF wrappers on all routes
  → Atomic auth user creation
  → Bounded polling (setInterval cleanup)

Layer 4 — Quality
  → TypeScript any types (after strict mode, layer 1)
  → Missing data-testid attributes
  → Console.log cleanup
  → Dead code removal
  → Missing error/loading/empty states

Layer 5 — Polish
  → Documentation updates
  → Test coverage gaps
  → Performance optimizations
  → Minor UX improvements
```

### Dependency Rules

- TypeScript errors (Layer 4) cannot be fixed before strict mode (Layer 1)
- Mutation security (Layer 3) cannot be fixed before types are current (Layer 1)
- HOF wrappers (Layer 3) cannot be fully added before auth layer is correct (Layer 2)
- Feature fixes cannot start before security layer is complete (Layer 2)

---

## FIX-QUEUE.md Format

```markdown
# Fix Queue — [App Name]
Built: [date] | Total: [N] | Completed: 0 | Remaining: [N]

## Summary
- Layer 1 (Foundation): [N] fixes
- Layer 2 (Security): [N] fixes  
- Layer 3 (Stability): [N] fixes
- Layer 4 (Quality): [N] fixes
- Layer 5 (Polish): [N] fixes
- Estimated sessions to clear: [N]

---

## FIX-001 [LAYER 1 / MECHANICAL]
**Issue:** TypeScript strict mode disabled
**File:** tsconfig.json
**Rule:** V3 Rule 7 — TypeScript strict mode mandatory
**Severity:** HIGH — hides entire categories of bugs

**Fix:**
Change `"strict": false` to `"strict": true`

**Verification:** `tsc --noEmit` (will surface new errors — these become FIX-002 through FIX-N)

**Expected side effects:** Will surface TypeScript errors in files that relied on loose typing.
These are NOT new bugs — they are existing bugs now visible. Add them to queue as Layer 4 items.

**Alternative path:** None needed — this is a single-line change.

---

## FIX-002 [LAYER 1 / MECHANICAL]
**Issue:** Supabase types stale — migration added tables not reflected in types.ts
**File:** src/lib/supabase/types.ts
**Rule:** V3 Rule 1 — Schema-First Type Safety
**Severity:** HIGH — type errors will surface in dependent files

**Fix:**
```bash
supabase gen types typescript --local > src/lib/supabase/types.ts
```

**Verification:** `tsc --noEmit`
**Depends on:** FIX-001 (strict mode should be on before regenerating)

---

## FIX-003 [LAYER 2 / MECHANICAL]
**Issue:** .single() used in 23 locations — crashes on empty result
**Files:** [list each file with line numbers]
**Rule:** V3 Rule 11 — .single() banned
**Severity:** HIGH — runtime crashes on any empty query result

**Fix (per file):**
Replace: `.single()`
With: `.maybeSingle()`
Then: Add null check after each call site:
  `if (!data) return { success: false, error: 'Not found' }`

**Verification:** `tsc --noEmit` after each file
**Batch:** Can apply to all 23 files before verifying — then fix any type errors surfaced.

---

## FIX-004 [LAYER 2 / INFORMED]
**Issue:** Missing user_id filter on document approve mutation
**File:** src/app/api/documents/approve/route.ts — line 47
**Rule:** V3 Rule 13 — Mutation auth double filter
**Severity:** CRITICAL — IDOR vulnerability, any user can approve any document

**Context for Fix Executor:**
Read src/lib/supabase/types.ts and find the documents table definition.
The ownership column will be one of: user_id, created_by, owner_id, author_id.
The auth user is available in this file from the HOF wrapper (or inline auth check).
Add .eq('[ownership_column]', user.id) to the update chain on line 47.

**Verification:** `tsc --noEmit` + manual review that filter uses correct column
**Alternative path:** If column name still ambiguous after reading types, add a 
pre-query ownership check: fetch the record, verify ownership, then update.

---

## FIX-005 [LAYER 2 / ARCHITECTURAL]
**Issue:** Email sync is webhook-only — no polling fallback
**Files:** src/lib/sync/ (entire directory)
**Rule:** V3 Rule 8 — Polling-first sync architecture
**Severity:** CRITICAL — 20% sync reliability in production

**Fix approach:** Load agents/integrations/sync-resilience.md
Rebuild sync layer with:
- 4-state machine (healthy/degraded/recovering/failed)
- Polling fallback when webhook stale > 15 minutes
- Idempotent upsert patterns
- sync_status table tracking

**Verification:** Sync integration tests pass
**Estimated complexity:** HIGH — this is a module rebuild, not a patch

---

[continues for all findings...]
```

---

## How to Build the Queue

### Step 1: Gather all findings

```bash
# Run QA gate (produces structured findings)
# Run audit agent (produces audit report)
# Run audit-deps (produces dependency conflicts)
# Combine all findings into a single list
```

### Step 2: Classify each finding

For each finding, determine:
1. Fix type: MECHANICAL / TEMPLATED / INFORMED / ARCHITECTURAL
2. Severity: CRITICAL / HIGH / MEDIUM / LOW
3. Layer: 1-5
4. Files affected (specific paths and line numbers)
5. Dependencies on other fixes

### Step 3: Order and number

Sort by:
1. Layer (1 before 2 before 3...)
2. Within layer: CRITICAL before HIGH before MEDIUM before LOW
3. Within severity: group related fixes (all .single() replacements together)

### Step 4: Write context for INFORMED fixes

For every INFORMED fix, write enough context that the Fix Executor can apply it without reading additional files:
- What the issue is
- Why it can't be done mechanically
- What to read (specific files/types)
- What to look for
- What the correct fix looks like once context is found
- Alternative path if primary approach fails

### Step 5: Update BRAIN.md

```markdown
## Fix Queue Status
Built: [date]
Total fixes: [N]
Layers: [breakdown]
Estimated sessions: [N based on ~15 fixes per session]
```

---

## Checklist

- [ ] All QA gate findings included
- [ ] All audit findings included  
- [ ] All dependency conflicts included
- [ ] Every fix classified (MECHANICAL/TEMPLATED/INFORMED/ARCHITECTURAL)
- [ ] Every fix has severity level
- [ ] Every fix has specific file paths and line numbers
- [ ] Dependencies between fixes identified
- [ ] Fixes ordered by layer
- [ ] INFORMED fixes have sufficient context for autonomous execution
- [ ] ARCHITECTURAL fixes reference correct specialist agent
- [ ] FIX-QUEUE.md written to .codebakers/
- [ ] BRAIN.md updated with queue summary
