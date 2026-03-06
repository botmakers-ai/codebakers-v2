# Pattern Lifecycle Policy
# CodeBakers V4 | agents/patterns/_LIFECYCLE.md

**Purpose:** Prevent pattern bloat through data-driven lifecycle management

**Principle:** Not every pattern needs to live forever. Patterns move through stages based on usage metrics.

---

## Pattern Stages

### 1. **Experimental** (`agents/patterns/experimental/`)

**Criteria:**
- New pattern, not yet proven
- <5 successful uses
- OR migrated from another project (needs validation in this codebase)

**Behavior:**
- Not auto-loaded during builds
- Must be manually referenced: `@pattern experimental/new-pattern`
- Warnings clearly marked as "EXPERIMENTAL"
- High override tolerance (learning phase)

**Promotion to Active:**
- After 5 successful uses with <20% override rate
- OR manually promoted by maintainer after code review

---

### 2. **Active** (`agents/patterns/`)

**Criteria:**
- 5-20 successful uses
- >80% success rate (not overridden)
- Used within last 30 days

**Behavior:**
- Auto-loaded during relevant builds
- Warnings displayed normally
- Tracked in PATTERN-METRICS.md

**Promotion to Stable:**
- After 20+ successful uses with >90% success rate
- Pattern proven reliable across multiple features/projects

**Demotion to Experimental:**
- If override rate increases above 50% (pattern becoming inaccurate)
- Requires investigation: fix pattern OR deprecate

---

### 3. **Stable** (`agents/patterns/` with ⭐ marker)

**Criteria:**
- 20+ successful uses
- >90% success rate
- Proven across multiple projects

**Behavior:**
- Auto-loaded with high confidence
- Warnings rarely overridden
- Reference implementation for similar patterns

**Demotion to Active:**
- If success rate drops below 90% (needs review)
- If not used in 90 days (may be outdated)

**Marker in file:**
```markdown
# Pattern: Mutation Handler ⭐ STABLE
# CodeBakers V4 | agents/patterns/mutation-handler.md

**Status:** Stable (142 uses, 96% success rate)
```

---

### 4. **Deprecated** (`agents/patterns/archive/`)

**Criteria:**
- Not used in 180 days
- OR replaced by better pattern
- OR consistently >50% override rate (false positives)

**Behavior:**
- Moved to `agents/patterns/archive/`
- Not loaded during builds
- Kept for historical reference
- Can be restored if needed

**Archive note in file:**
```markdown
# Pattern: Old OAuth Flow [DEPRECATED]
# Deprecated: 2026-03-01
# Replaced by: agents/patterns/oauth-token-management.md
# Reason: New pattern handles multi-account and incremental consent
```

---

## Lifecycle Automation

### **Weekly Check (Auto-run)**

Script: `scripts/check-pattern-lifecycle.ts`

```bash
pnpm pattern:lifecycle
```

**Actions:**
1. Read `.codebakers/PATTERN-METRICS.md`
2. Check each pattern against lifecycle criteria
3. Generate recommendations:
   ```
   📊 Pattern Lifecycle Report

   Promotions Recommended:
     - ssr-safe-imports.md (12 uses, 92% success) → STABLE
     - oauth-token-management.md (8 uses, 87% success) → Keep in ACTIVE

   Review Needed:
     - old-pattern.md (3 uses, 45% success) → Move to EXPERIMENTAL or DEPRECATE
     - unused-pattern.md (0 uses in 90 days) → DEPRECATE

   No Action Required:
     - mutation-handler.md ⭐ STABLE (142 uses, 96% success)
   ```

4. Log to `.codebakers/PATTERN-LIFECYCLE-LOG.md`

---

## Manual Lifecycle Commands

```bash
# Promote pattern
@pattern promote ssr-safe-imports

# Demote pattern
@pattern demote old-pattern

# Archive pattern (deprecate)
@pattern archive unused-pattern

# Restore archived pattern
@pattern restore old-pattern
```

---

## Decision Matrix

| Uses | Success Rate | Last Used | Stage      | Action                          |
|------|--------------|-----------|------------|---------------------------------|
| 0-4  | Any          | Any       | Experimental | Keep experimental              |
| 5-19 | >80%         | <30 days  | Active     | Keep active                     |
| 5-19 | >80%         | >30 days  | Active     | Monitor (trending deprecated)   |
| 5-19 | <80%         | Any       | Active     | Demote to experimental OR fix   |
| 20+  | >90%         | <90 days  | Stable ⭐   | Promote to stable               |
| 20+  | 80-90%       | <90 days  | Active     | Keep active (good but not stable)|
| 20+  | <80%         | Any       | Any        | Review urgently (high override) |
| Any  | Any          | >180 days | Any        | Deprecate to archive            |

---

## Pattern Composition (Anti-Bloat)

**Problem:** 20 domain files each duplicating "authentication" pattern

**Solution:** Modular composition

```
agents/patterns/modules/
  ├── authentication.md       ← Reusable
  ├── search.md              ← Reusable
  ├── notifications.md       ← Reusable
  └── pagination.md          ← Reusable

agents/domains/
  ├── email.md
      includes: [authentication, search, pagination]
      specific: [threading, folders, attachments]

  ├── crm.md
      includes: [authentication, search, notifications]
      specific: [pipeline, deals, activities]
```

**Benefits:**
- Authentication pattern maintained once, used everywhere
- Domains only contain domain-specific patterns
- Easier to keep patterns up-to-date

---

## Metrics Integration

Track lifecycle transitions in `.codebakers/PATTERN-LIFECYCLE-LOG.md`:

```markdown
# Pattern Lifecycle Log

## 2026-03-05

**Promoted:**
- ssr-safe-imports.md → STABLE (12 uses, 92% success)

**Demoted:**
- old-auth-pattern.md → EXPERIMENTAL (3 uses, 45% success, needs fix)

**Deprecated:**
- unused-form-pattern.md → ARCHIVE (0 uses in 120 days)

---

## 2026-02-15

**Promoted:**
- oauth-token-management.md → ACTIVE (5 uses, 87% success)

...
```

---

## Example: Pattern Promotion Flow

```
Day 1: Create pattern
  → agents/patterns/experimental/new-pattern.md

Day 5: Used 5 times, 100% success
  → scripts/check-pattern-lifecycle.ts detects
  → Recommends: Promote to ACTIVE
  → User runs: @pattern promote new-pattern
  → Moved to: agents/patterns/new-pattern.md

Day 30: Used 22 times, 95% success
  → scripts/check-pattern-lifecycle.ts detects
  → Recommends: Promote to STABLE
  → User runs: @pattern promote new-pattern
  → File updated: adds ⭐ STABLE marker
  → Logged: PATTERN-LIFECYCLE-LOG.md

Day 150: Not used in 90 days
  → scripts/check-pattern-lifecycle.ts detects
  → Recommends: Review (trending deprecated)
  → User decides: Keep (niche but valid) OR Deprecate

Day 250: Not used in 180 days
  → scripts/check-pattern-lifecycle.ts detects
  → Recommends: DEPRECATE
  → User runs: @pattern archive new-pattern
  → Moved to: agents/patterns/archive/new-pattern.md
```

---

## Benefits

**1. Prevents Bloat**
- Unused patterns archived, not deleted (can restore if needed)
- Active patterns proven useful

**2. Data-Driven**
- Decisions based on metrics, not opinions
- Clear criteria for each stage

**3. Quality Improvement**
- Stable patterns are reference implementations
- High-override patterns flagged for review

**4. Maintainability**
- Fewer patterns to maintain actively
- Composition reduces duplication

---

*CodeBakers V4 | Pattern Lifecycle Policy | agents/patterns/_LIFECYCLE.md*
