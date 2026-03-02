# Mockups - Analyze Design Mockups

Extract components, entities, interactions, and design tokens from design mockups.

## Usage

`@mockups`

## What It Does

1. **Check refs/design/ Folder**
   - Scans for mockup files (JSX, HTML, images, PDFs)
   - If empty: prompts user to add files
   - If files exist: proceeds with analysis

2. **Load Mockup Analyzer Agent**
   ```
   → agents/meta/mockup-analyzer.md
   ```

3. **5-Layer Extraction**

   **Layer A: Components (visual inventory)**
   - Component names
   - Props shown
   - Layout structure
   - Interactive elements

   **Layer B: Entities (data schema inference)**
   - Entity names
   - Fields detected
   - Relationships
   - Types inferred

   **Layer C: Interactions (behavior mapping)**
   - Button → inferred API endpoint
   - Form → submission flow
   - Links → navigation paths
   - State changes → mutations

   **Layer D: Design Tokens (exact values)**
   - Colors (hex, rgb, or Tailwind class → resolved)
   - Spacing (padding, margin, gap)
   - Typography (font, size, weight, line-height)
   - Borders, shadows, breakpoints

   **Layer E: States (shown vs missing)**
   - ✓ Success state
   - ? Loading state
   - ? Error state
   - ? Empty state
   - ? Validation feedback

4. **Gap Detection (6 categories)**
   - Incomplete CRUD (delete without confirmation)
   - Incomplete state machines (Pending but no Approved/Rejected)
   - Missing feedback (button without loading state)
   - Dependency gaps (Archive but no Unarchive)
   - Accessibility gaps (icon-only button without label)
   - Mobile gaps (large table without mobile alternative)

5. **Contextual Suggestions**

   Based on app type (from RESEARCH-SUMMARY.md):
   - **Email app:** archive button → tooltip, keyboard shortcut, undo
   - **Dashboard:** chart → date range picker, export CSV, refresh
   - **Ecommerce:** product → variant selector, quantity, reviews
   - **SaaS:** settings → confirmation, undo, success feedback

6. **Output Files Generated**

   **DESIGN-CONTRACT.md**
   ```markdown
   # Design Contract — Generated from Mockups

   ## Components Inventory
   ### [ComponentName]
   **Location:** refs/design/[file]
   **Props:** [list]
   **States Shown:** [checkmarks]
   **States Missing:** [flags]

   ## Entities Detected
   ### [EntityName]
   **Fields:** [list with types]
   **CRUD Operations:** [shown/missing]

   ## API Endpoints Needed
   → DELETE /api/account/:id — Delete user account

   ## Design Tokens
   **Colors:** Primary #3B82F6, Danger #EF4444
   **Spacing:** Container 1024px, gap 16px

   ## Critical Gaps Flagged
   ### 🛑 CRITICAL
   ⚠️ Delete button shown but no confirmation modal

   ### ⚠️ HIGH PRIORITY
   💡 Archive button missing tooltip and keyboard shortcut
   ```

   **Enhanced FIX-QUEUE.md items**
   - Each atomic unit gets embedded design spec
   - Exact values from mockup (colors, spacing, typography)
   - Explicit state requirements (loading, error, empty)
   - Gap fixes as P1 items

   **UI-RESEARCH.md updates**
   - Design tokens from mockups override general research
   - Mockup values take precedence

7. **Cross-Reference with FLOWS.md**
   - Compare mockup entities vs FLOWS.md entities
   - Flag missing entities
   - Flag extra entities (in mockup but not in flows)

8. **Report to User**
   ```
   🍞 CodeBakers: Mockup analysis complete.

   Extracted:
   → [N] components
   → [N] entities
   → [N] API endpoints inferred
   → Design tokens: [colors, spacing, typography]

   Gaps flagged:
   → [N] missing states (loading, error, empty)
   → [N] incomplete interactions (confirmations, feedback)
   → [N] accessibility issues

   Created:
   → DESIGN-CONTRACT.md ([N] components listed)
   → Enhanced FIX-QUEUE items with design specs

   Contextual suggestions: [N] improvements based on app type

   Next: Review DESIGN-CONTRACT.md and proceed with build
   ```

## When to Use

- **New project:** After onboarding, when design mockups are available
- **Existing project:** Anytime new mockups are added to refs/design/
- **During build:** When design specs are unclear or ambiguous
- **Before launch:** To verify all mockup components were built

## Automatic Triggering

The Mockup Analyzer runs automatically in these scenarios:
1. **During onboarding (Phase 0.75):** If user adds mockups to refs/design/
2. **New project flow (Step 3.6):** If refs/design/ has files and DESIGN-CONTRACT.md missing

## Supported Formats

| Format | Method | Accuracy | Notes |
|--------|--------|----------|-------|
| JSX/TSX | Code parsing | Exact values | Best option — no guessing |
| HTML | Code parsing | Exact values | Staff mockups ideal |
| Images | Vision extraction | Estimates | Requires validation |
| PDFs | Vision extraction | Estimates | Requires validation |
| Figma exports | Vision (as image/PDF) | Estimates | Export to image or PDF first |

**Priority order (highest to lowest):**
1. Staff JSX/HTML mockups → exact contract
2. Client image/PDF mockups → overrides general UI research
3. Brand files from refs/brand/ → overrides colors/typography
4. General UI research → baseline when nothing else provided

## Benefits

✓ **No design guessing** — builds exactly what's shown
✓ **Schema inference** — extracts data model from UI
✓ **Gap prevention** — flags missing states before build
✓ **Context-aware suggestions** — domain-specific improvements
✓ **Binding specification** — DESIGN-CONTRACT.md is the source of truth

## Example Flow

```bash
# 1. User adds mockups
cp my-dashboard.jsx refs/design/

# 2. Run analysis
# Type: @mockups

# 3. Review output
cat DESIGN-CONTRACT.md

# 4. Proceed with build
# All FIX-QUEUE items now have embedded design specs
```

## Integration with Build Process

Once mockups are analyzed:
- Every component build references DESIGN-CONTRACT.md
- Design tokens from mockups override defaults
- Gap fixes added to FIX-QUEUE as P1 items
- Build follows mockup structure exactly

## Re-running Analysis

Safe to run @mockups multiple times:
- Overwrites DESIGN-CONTRACT.md with fresh analysis
- Updates FIX-QUEUE with new items
- Preserves existing completed work

## Limitations

- Vision extraction (images/PDFs) estimates values — requires validation
- Cannot extract behavior from static images (infers from context)
- Complex animations need manual specification
- Mockups should show all critical states (or gaps will be flagged)

---

*CodeBakers V4 | Command: @mockups | .claude/commands/mockups.md*
