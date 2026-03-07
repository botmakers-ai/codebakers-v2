# Feature Enforcer Agent
# CodeBakers V4 | agents/meta/feature-enforcer.md

**Purpose:** Enforce full atomic unit protocol when user explicitly requests feature build

**Triggers:**
- User message starts with `@feature`
- User message starts with `//` (code-comment style)

**Why This Exists:** Clear signal from user = "Use full CodeBakers protocol, no shortcuts."

---

## Detection

**Auto-trigger when user message matches:**

```typescript
const message = user.message.trim()

const isFeatureRequest =
  message.startsWith('@feature ') ||
  message.startsWith('// ')

if (isFeatureRequest) {
  // ENFORCE full atomic unit workflow
  loadFeatureEnforcer()
}
```

---

## Enforcement Flow

When `@feature` or `//` detected:

```
1. STRIP PREFIX
   @feature inbox view → "inbox view"
   // inbox view → "inbox view"

2. LOAD CONTEXT (mandatory)
   ✓ Read .codebakers/BRAIN.md
   ✓ Read .codebakers/DEPENDENCY-MAP.md
   ✓ Read .codebakers/ERROR-LOG.md
   ✓ Read .codebakers/FIX-QUEUE.md
   ✓ Check .codebakers/CONFIG.md (mode)

3. RUN ERROR SNIFFER (mandatory)
   ✓ Scan ERROR-LOG.md for applicable patterns
   ✓ Display warnings (HIGH → MEDIUM → LOW)
   ✓ User can override, but warnings must be shown

4. DECLARE ATOMIC UNIT (mandatory, before any code)
   ✓ Add to FIX-QUEUE.md with full checklist
   ✓ Create UNIT-PROGRESS.md with step tracking
   ✓ Update BRAIN.md Mid-Build State
   ✓ Determine unit type: CRUD | read-only | integration | refactor

5. BUILD IN ORDER (mandatory sequence)
   Step 1: Schema/types (Zod + z.infer)
   Step 2: API route (with HOF wrapper)
   Step 3: Store updates (all from dep map)
   Step 4: Active state handling
   Step 5: UI component
   Step 6: Loading/error/success states
   Step 7: Tests (E2E happy + error path)
   Step 8: Gate check

   After EACH step:
     ✓ Check off in UNIT-PROGRESS.md
     ✓ Update "Resume Context"
     ✓ Log to BUILD-LOG.md (auto + manual)
     ✓ wip commit: git commit -m "wip([unit]): [step]"
     ✓ Update BRAIN.md Mid-Build State

6. GATE CHECK (mandatory, all items)
   ✓ Real user can complete flow end-to-end
   ✓ Hard refresh → state correct
   ✓ No console errors
   ✓ pnpm dep:map run and committed
   ✓ BUILD-LOG.md updated (1 entry per step)
   ✓ TypeScript compiles (tsc --noEmit)
   ✓ Tests pass (E2E)

7. SQUASH AND COMMIT (mandatory format)
   ✓ Count wip commits
   ✓ Squash into single commit
   ✓ Commit message: feat(atomic): [name] — gate passed [N/N checks]
   ✓ Delete UNIT-PROGRESS.md
   ✓ Remove Mid-Build State from BRAIN.md

8. POST-COMPLETION (mandatory)
   ✓ Run pnpm dep:map (if new store/component)
   ✓ Completeness Verifier (auto-runs)
   ✓ Update FIX-QUEUE.md (mark complete)
```

---

## Examples

### **Example 1: Full Enforcement**

```
User: @feature delete account button

System:
🍞 CodeBakers: Feature request detected — full protocol enforced

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 1: LOAD CONTEXT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✓ BRAIN.md: Project EaseMail, domain=email, 23 features built
✓ DEPENDENCY-MAP.md: Account entity → useAccountStore, useMailStore
✓ ERROR-LOG.md: 156 entries, 12 patterns learned
✓ MODE: standard

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 2: ERROR SNIFFER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ HIGH CONFIDENCE (3 warnings)
  1. Delete mutation without user_id filter (3 occurrences)
  2. Delete without confirmation dialog (2 occurrences)
  3. Delete without store update (4 occurrences)

Apply all HIGH confidence fixes? [Yes / No / Review]
→ Yes

✓ Preventions applied

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 3: DECLARE ATOMIC UNIT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Creating atomic unit: delete-account-button
Type: CRUD (mutation)
Entity: Account
Steps: 8

✓ Added to FIX-QUEUE.md
✓ Created UNIT-PROGRESS.md
✓ Updated BRAIN.md Mid-Build State

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 4: BUILD (8 steps)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Building step 1/8: Schema/types
  → lib/schemas/account.ts (DeleteAccountSchema)
  ✓ Built
  ✓ BUILD-LOG.md updated
  ✓ wip commit: wip(delete-account): schema/types

Building step 2/8: API route
  → app/api/account/delete/route.ts
  ✓ Built (with id AND user_id filters - sniffer prevention)
  ✓ BUILD-LOG.md updated
  ✓ wip commit: wip(delete-account): API route

... [continues through all 8 steps]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 5: GATE CHECK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Running gate checks...
  ✓ Flow completion test
  ✓ Hard refresh test
  ✓ Console clean
  ✓ dep:map current
  ✓ BUILD-LOG.md complete (8 entries)
  ✓ TypeScript compiles
  ✓ Tests pass

Gate: 8/8 passed

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 6: FINALIZE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Squashing 8 wip commits...
✓ Committed: feat(atomic): delete account — gate passed 8/8 checks

Cleanup:
✓ UNIT-PROGRESS.md deleted
✓ BRAIN.md Mid-Build State removed

✅ Feature complete: delete-account-button
```

---

### **Example 2: Alternative Syntax**

```
User: // inbox view with threading

System:
🍞 CodeBakers: Feature request detected — full protocol enforced

[Same full workflow as Example 1]
```

---

## Comparison: With vs Without Enforcement Trigger

### **WITHOUT TRIGGER (Regular message):**

```
User: "add delete account button"

System:
→ Goes through Manual Task Protocol
→ Reads context (BRAIN.md, dep map)
→ May apply patterns
→ May skip some steps (depending on mode)
→ Lighter enforcement
```

### **WITH TRIGGER (@feature or //):**

```
User: "@feature delete account button"

System:
→ ENFORCES full atomic unit workflow
→ NO shortcuts allowed
→ ALL steps mandatory
→ Gate check required
→ Atomic commit format required
```

---

## Mode Integration

**Enforcement applies across all modes:**

| Mode | Without Trigger | With @feature or // |
|------|----------------|---------------------|
| **Beginner** | Auto-applies patterns, hides steps | **FULL enforcement shown** (teaching moment) |
| **Standard** | Shows warnings, may allow shortcuts | **FULL enforcement, no shortcuts** |
| **Expert** | Full control, can override | **FULL enforcement, but expert can still override** |

**Key:** Even in Beginner mode, `@feature` shows full workflow (as learning experience).

---

## Git Hook Integration

Update pre-commit hook to check:

```bash
# In .git/hooks/pre-commit

# Check if commit message is atomic commit
if [[ $message == feat(atomic):* ]]; then
  # Verify all requirements met:
  # 1. BUILD-LOG.md updated recently
  # 2. UNIT-PROGRESS.md deleted (not in staging)
  # 3. Gate check passed (in commit message)

  if ! grep -q "gate passed" <<< "$message"; then
    echo "❌ Atomic commit missing 'gate passed [N/N checks]'"
    exit 1
  fi
fi
```

---

## Benefits

**1. Clear User Intent**
- `@feature` = "I want full quality, use the system"
- Regular message = "Quick task, lighter protocol OK"

**2. Enforces Best Practices**
- Can't skip steps when using `@feature`
- Can't commit without gate check
- Can't forget BUILD-LOG.md

**3. Teaching Tool**
- New users learn by using `@feature`
- See full workflow in action
- Understand why each step matters

**4. Quality Gate**
- Features built with `@feature` guaranteed complete
- All atomic unit requirements met
- No half-built features

---

## When to Use

**Use `@feature` or `//` when:**
- Building new feature from scratch
- Want full quality assurance
- Need crash recovery capability
- Teaching new team member
- Production-critical feature

**Use regular message when:**
- Quick bug fix
- Documentation update
- Refactoring existing code
- Exploratory change
- Non-feature work

---

## Error Messages

**If user tries to skip steps:**

```
User: @feature inbox view

System starts atomic unit workflow...

User (mid-build): "Actually just skip the tests, I'll do them later"

System:
❌ Cannot skip steps in @feature mode

You used @feature trigger, which enforces full atomic unit protocol.

Options:
  1. Complete all steps (recommended)
  2. Cancel this unit and start over without @feature
  3. Mark as BLOCKED with reason in FIX-QUEUE.md

Cannot proceed with partial implementation.
```

---

## CLAUDE.md Integration

Add to **Commands** section:

```markdown
## Feature Building Commands

**Enforce full atomic unit protocol:**
- `@feature [description]` — Build feature with full enforcement (no shortcuts)
- `// [description]` — Alternative syntax (code-comment style)

**Examples:**
```bash
@feature delete account button
// inbox view with threading
```

**What gets enforced:**
- ✓ Context loading (BRAIN.md, dep map, error log)
- ✓ Error Sniffer (mandatory scan)
- ✓ Atomic unit declaration (before code)
- ✓ Step-by-step build (schema → API → store → UI → tests)
- ✓ BUILD-LOG.md updates (every step)
- ✓ Gate check (all items)
- ✓ Atomic commit format

**Use when:** Building production features that need full quality assurance

**Don't use when:** Quick fixes, docs, refactoring (use regular messages)
```

---

## Summary

**Trigger:** `@feature [description]` or `// [description]`

**Effect:** ENFORCES full CodeBakers protocol (no shortcuts)

**Steps enforced:**
1. Load context
2. Run Error Sniffer
3. Declare atomic unit
4. Build all layers
5. Update BUILD-LOG.md
6. Gate check
7. Atomic commit

**Benefit:** Clear signal from user = "Use the full system, I want quality"

---

*CodeBakers V4 | Feature Enforcer Agent | agents/meta/feature-enforcer.md*
