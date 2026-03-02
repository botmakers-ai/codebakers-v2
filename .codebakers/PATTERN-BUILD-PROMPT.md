# Build Pattern Files — Comprehensive Execution Prompt

Build the following pattern files for the CodeBakers V4 framework. Each pattern must be production-quality, thoroughly researched, and complete with code examples.

---

## Execution Rules (Non-Negotiable)

1. **Research before writing** — Never write from training data alone
2. **Build in dependency order** — Later patterns reference earlier ones
3. **Follow exact format** — Match `agents/patterns/mutation-handler.md` structure
4. **Include anti-patterns** — "Never Do These" section with wrong/correct code
5. **Complete frontmatter** — triggers, depends_on, conflicts_with, prerequisites, description
6. **Code examples** — Real, copy-pasteable code, not pseudocode
7. **Verify completeness** — Check against checklist before moving to next pattern
8. **Update CLAUDE.md** — If pattern introduces new hard rules

---

## Build Order (Strict Sequence)

### Batch 1: Foundation Patterns (Build First)
These have no dependencies on each other. Build all 8 before proceeding to Batch 2.

1. **pagination.md**
2. **infinite-scroll.md**
3. **optimistic-updates.md**
4. **data-fetching.md**
5. **performance.md**
6. **security.md**
7. **forms.md**
8. **keyboard-navigation.md**

### Batch 2: Advanced Patterns (Build After Batch 1)
These depend on Batch 1 patterns.

9. **virtualization.md** (depends on infinite-scroll.md, performance.md)
10. **real-time-sync.md** (depends on data-fetching.md, optimistic-updates.md)
11. **offline-first.md** (depends on data-fetching.md, optimistic-updates.md)
12. **drag-and-drop.md** (depends on optimistic-updates.md, forms.md)
13. **webhook-handling.md** (depends on security.md)
14. **file-upload.md** (depends on security.md, forms.md)
15. **email-security.md** (depends on security.md)
16. **caching.md** (depends on data-fetching.md, performance.md)

---

## Research Protocol (For Each Pattern)

### Step 1: Domain Research (5-7 web searches minimum)

**For every pattern, search:**
1. `"[topic] best practices [current year]"`
2. `"[topic] Next.js React"`
3. `"[topic] common mistakes"`
4. `"[topic] vs [alternative] comparison"`
5. `"[topic] performance considerations"`
6. `"[topic] accessibility WCAG AA"`
7. `"[topic] security concerns"`

**Example for pagination.md:**
```
Search 1: "pagination best practices 2025 2026"
Search 2: "cursor-based pagination Next.js React"
Search 3: "pagination common mistakes"
Search 4: "cursor-based vs offset-based pagination comparison"
Search 5: "pagination performance considerations"
Search 6: "pagination accessibility WCAG AA"
Search 7: "pagination security concerns"
```

### Step 2: API-Specific Research (If applicable)

If the pattern involves a specific library or API:
```
Search: "[library name] official documentation"
Search: "[library name] GitHub issues common problems"
Search: "[library name] vs [alternative] [current year]"
WebFetch: Official docs URL (if found)
```

**Example for data-fetching.md:**
```
Search: "TanStack Query official documentation"
Search: "TanStack Query v5 migration guide"
Search: "TanStack Query GitHub issues common problems"
Search: "TanStack Query vs SWR vs Apollo [current year]"
WebFetch: https://tanstack.com/query/latest/docs/framework/react/overview
```

### Step 3: Anti-Pattern Research

Search specifically for what NOT to do:
```
Search: "[topic] anti-patterns"
Search: "[topic] bad practices"
Search: "reddit [topic] mistakes"
Search: "Stack Overflow [topic] common errors"
```

### Step 4: Document Research Findings

At the top of each pattern file, add a research log comment:
```markdown
<!--
RESEARCH LOG (remove before finalizing):
- Searched: [list searches performed]
- Key findings: [3-5 bullet points]
- Libraries researched: [names + versions]
- Anti-patterns found: [3-5 common mistakes]
- Last researched: [date]
-->
```

Remove this comment only after pattern is complete and verified.

---

## Pattern File Structure (Required Sections)

Every pattern must have these sections in this order:

```markdown
---
name: [Pattern Name]
tier: patterns
triggers: [comma-separated keywords that should load this pattern]
depends_on: [comma-separated paths to other agents/patterns this requires]
conflicts_with: [patterns that contradict this, or null]
prerequisites: "[What must exist before using this pattern]"
description: [One-sentence summary of what this pattern covers]
---

# Pattern: [Name]

## What This Pattern Covers

[2-3 sentences — scope, when to use, what problem it solves]

---

## When to Use This Pattern

[Bullet list of scenarios where this pattern applies]

Example:
- Displaying paginated lists with 50+ items
- Loading data from Graph API with $skipToken
- Infinite scroll feeds

---

## When NOT to Use This Pattern

[Bullet list of scenarios where this pattern is wrong choice]

Example:
- Small fixed datasets (<20 items) — render all at once
- Real-time feeds requiring newest-first — use WebSocket push
- CSV export pagination — use server-side streaming

---

## Architecture Overview

[High-level explanation of how this pattern works]

[Optional: Diagram in markdown/ASCII if helpful]

---

## Implementation

### [Step 1 Name]

[Explanation of what this step does and why]

```typescript
// Code example — production-ready, copy-pasteable
// Include imports, types, full context
```

### [Step 2 Name]

[Explanation]

```typescript
// Code example
```

[Repeat for all implementation steps]

---

## Integration With Other Patterns

**This pattern works with:**
- [pattern-name.md] — [how they work together]
- [pattern-name.md] — [how they work together]

**This pattern conflicts with:**
- [pattern-name.md] — [why they can't be used together]

---

## Error Handling

[All error cases and recovery strategies specific to this pattern]

```typescript
// Error handling code examples
```

---

## Testing Checklist

[How to verify this pattern works correctly]

- [ ] [Specific test case 1]
- [ ] [Specific test case 2]
- [ ] [Edge case 1]
- [ ] [Edge case 2]

---

## Common Mistakes — Never Do These

[Minimum 5 mistakes, each with wrong code + correct code]

### 1. [Mistake Name]

**Wrong:**
```typescript
// What developers commonly do wrong
```

**Why it's wrong:** [Explanation]

**Correct:**
```typescript
// The right way to do it
```

---

### 2. [Next Mistake]

[Repeat format]

---

## Performance Considerations

[Specific performance implications of this pattern]

- [Consideration 1 with metrics/thresholds]
- [Consideration 2 with metrics/thresholds]

---

## Accessibility Checklist

[WCAG AA requirements specific to this pattern]

- [ ] [Specific a11y requirement 1]
- [ ] [Specific a11y requirement 2]

---

## Security Checklist

[Security considerations specific to this pattern]

- [ ] [Specific security requirement 1]
- [ ] [Specific security requirement 2]

---

## Pre-Implementation Checklist

Before declaring this pattern complete in your codebase:

- [ ] [Specific item 1]
- [ ] [Specific item 2]
- [ ] [Specific item 3]
- [ ] Code examples tested in real Next.js app
- [ ] Anti-patterns section has 5+ examples
- [ ] All dependencies listed in frontmatter
- [ ] All web searches documented
- [ ] No TypeScript errors in code examples

---

## References

- [Official docs URL]
- [GitHub repo]
- [Key blog post or guide]
- [Alternative library comparison]

---

*CodeBakers V4 | Pattern: [name] | agents/patterns/[filename].md*
```

---

## Verification Checklist (Before Moving to Next Pattern)

After writing each pattern, verify ALL of these:

### Completeness
- [ ] All required sections present (see structure above)
- [ ] Frontmatter complete (name, tier, triggers, depends_on, prerequisites, description)
- [ ] At least 5 anti-patterns with wrong/correct code
- [ ] At least 3 code examples in Implementation section
- [ ] Error handling section with code examples
- [ ] Testing checklist with specific items
- [ ] Accessibility checklist present
- [ ] Security checklist present
- [ ] References section with real URLs

### Quality
- [ ] Research log at top documents all searches performed
- [ ] Code examples are production-ready (not pseudocode)
- [ ] Code examples include imports and types
- [ ] TypeScript examples have no type errors
- [ ] Anti-patterns show real mistakes, not strawmen
- [ ] "When NOT to use" section prevents misuse
- [ ] All claims backed by research or official docs

### Integration
- [ ] depends_on lists all prerequisite patterns
- [ ] "Integration With Other Patterns" section cross-references
- [ ] No circular dependencies
- [ ] If this pattern introduces a new hard rule, CLAUDE.md is updated

### Format
- [ ] Matches mutation-handler.md structure
- [ ] Headers are consistent (##, ###)
- [ ] Code blocks use correct language tags (typescript, bash, markdown)
- [ ] No broken markdown formatting
- [ ] File saved to agents/patterns/[name].md

---

## Build Protocol

For each pattern in build order:

1. **Research** (15-20 searches minimum)
   - Domain research (7 searches)
   - API-specific research (if applicable)
   - Anti-pattern research (3-5 searches)
   - Document findings in research log at top of file

2. **Write** (follow structure exactly)
   - Frontmatter
   - All required sections
   - Minimum 5 anti-patterns with code
   - Minimum 3 implementation code examples
   - Error handling with code
   - Testing, accessibility, security checklists

3. **Verify** (run checklist)
   - Completeness: all sections present
   - Quality: code is production-ready
   - Integration: dependencies listed correctly
   - Format: matches mutation-handler.md

4. **Test code examples** (if possible)
   - Create temp Next.js file
   - Copy code example
   - Verify no TypeScript errors
   - Delete temp file

5. **Commit**
   ```bash
   git add agents/patterns/[name].md
   git commit -m "feat(patterns): add [name] pattern — [one-line summary]"
   ```

6. **Update dependency map** (if pattern references new libraries)
   ```bash
   pnpm dep:map
   git add .codebakers/DEPENDENCY-MAP.md
   git commit -m "chore(deps): update dependency map after [pattern] pattern"
   ```

7. **Move to next pattern** in build order

---

## Specific Pattern Requirements

### 1. pagination.md
**Must cover:**
- Cursor-based vs offset-based (when to use each)
- Graph API $skipToken implementation
- Why offset is wrong for real-time data (emails, feeds)
- Next.js API route with pagination
- Client component with "Load More" button
- Prefetching next page before user clicks
- Scroll position restoration on back navigation
- Empty state vs end of list distinction

**Research:**
- Microsoft Graph API pagination docs
- TanStack Query pagination patterns
- Next.js API route pagination

**Anti-patterns to include:**
- Using offset for real-time data
- Not handling end-of-list state
- Re-fetching entire list on navigation
- Not prefetching next page
- Losing scroll position on back

### 2. infinite-scroll.md
**Must cover:**
- IntersectionObserver setup (no scroll event listeners)
- Sentinel element pattern
- Loading skeleton during fetch
- Deduplication (same item appearing twice)
- Virtualization threshold (when to switch to @tanstack/virtual)
- Scroll restoration between routes
- Mobile rubber-band scroll handling
- Keyboard accessibility (spacebar to scroll)

**Research:**
- IntersectionObserver MDN docs
- @tanstack/virtual documentation
- Infinite scroll accessibility patterns

**Anti-patterns to include:**
- Using scroll event listeners (performance)
- Not handling duplicates
- Not showing loading state
- Rendering 10,000 items without virtualization
- Breaking keyboard navigation

### 3. optimistic-updates.md
**Must cover:**
- Update UI before server confirms
- Rollback on failure with inline error message
- Which actions to make optimistic (archive, delete, read, star, move)
- Which NOT to make optimistic (send email, create account, payment)
- TanStack Query onMutate/onError pattern
- Conflict resolution when server disagrees
- Visual distinction: optimistic vs confirmed (opacity, icon)

**Research:**
- TanStack Query optimistic updates docs
- Real-time collaboration conflict resolution
- UX patterns for optimistic UI

**Anti-patterns to include:**
- Making payment actions optimistic
- Not rolling back on error
- No visual indication of optimistic state
- Not handling conflicts
- Optimistic delete without undo option

### 4. data-fetching.md
**Must cover:**
- TanStack Query setup and QueryClientProvider
- Query key conventions (never duplicate, array format)
- staleTime vs gcTime (formerly cacheTime) — what each means
- Background refetch strategy
- Dependent queries (useQuery with enabled)
- Parallel queries (useQueries)
- Prefetch on hover (queryClient.prefetchQuery)
- Invalidation patterns (what to invalidate after mutation)
- Error boundaries for query failures
- Loading and error states

**Research:**
- TanStack Query v5 docs (latest)
- Query key best practices
- TanStack Query vs SWR comparison

**Anti-patterns to include:**
- Duplicate query keys causing cache collisions
- Not setting staleTime (refetch on every mount)
- Invalidating everything after one mutation
- Not handling loading/error states
- Fetching in useEffect instead of useQuery

### 5. performance.md
**Must cover:**
- Code splitting: route-level (Next.js automatic) and component-level (dynamic import)
- Dynamic imports for heavy components (rich text editor, PDF viewer, chart library)
- next/image optimization rules
- Font loading strategy (next/font, no FOUT/FOIT)
- Bundle analysis (next-bundle-analyzer setup)
- Web Vitals targets: LCP <2.5s, FID <100ms, CLS <0.1
- React.memo rules (when it helps, when it doesn't)
- Avoiding layout thrash
- requestAnimationFrame for animations
- Debounce vs throttle (when to use each)

**Research:**
- Core Web Vitals documentation
- Next.js performance optimization docs
- React.memo performance characteristics
- Debounce vs throttle comparison

**Anti-patterns to include:**
- Not code-splitting heavy components
- Using <img> instead of next/image
- Inline anonymous functions in React.memo deps
- Layout thrash (read, write, read, write)
- Using throttle for search (should be debounce)

### 6. security.md
**Must cover:**
- Never trust client-provided IDs (always verify ownership server-side)
- RLS policies on every table, every operation (select, insert, update, delete)
- HOF wrapper for API routes (auth check → ownership check → rate limit → handler)
- Rate limiting per user, per endpoint (Upstash Redis pattern)
- Input sanitization (especially rich text, HTML email bodies)
- CSP headers for Next.js (in next.config.js)
- CORS configuration
- Webhook signature verification (mux, stripe, etc.)
- Secrets never in client bundle (NEXT_PUBLIC_ prefix awareness)
- SQL injection prevention with Supabase (parameterized queries always)

**Research:**
- Supabase RLS best practices
- Next.js security headers
- OWASP Top 10 for web apps
- Upstash Redis rate limiting

**Anti-patterns to include:**
- Trusting client-provided user_id
- No RLS policies (relying on client-side checks)
- API route without auth check
- No rate limiting on public endpoints
- Exposing secrets in client code

### 7. forms.md
**Must cover:**
- React Hook Form + Zod setup
- Validation on blur, not on change (UX consideration)
- Field-level errors vs form-level errors
- Async validation (check if email exists)
- Multi-step forms with state persistence
- File upload with progress (integration with file-upload.md)
- Auto-save drafts to database
- Dirty state detection (useFormState isDirty)
- Warn before navigate away if unsaved changes
- Accessibility: label association, error announcement, aria-invalid

**Research:**
- React Hook Form documentation
- Zod schema validation
- Form accessibility WCAG AA
- Multi-step form UX patterns

**Anti-patterns to include:**
- Validating on every keystroke (performance + UX)
- Not preserving form state on error
- Not warning before leaving unsaved changes
- Unlabeled form fields
- Errors not announced to screen readers

### 8. keyboard-navigation.md
**Must cover:**
- Global keyboard shortcuts (Gmail-style: j/k for navigation)
- Shortcut registry pattern (prevent conflicts)
- j/k to navigate message list
- e = archive, # = delete, r = reply, c = compose, / = search
- Focus trap in modals (react-focus-lock)
- Escape key handling stack (close modal, then close sidebar, etc.)
- Roving tabindex for lists (one item tabbable at a time)
- Skip-to-content link for main navigation
- Keyboard shortcut help dialog (?)

**Research:**
- Gmail keyboard shortcuts full list
- Roving tabindex pattern
- react-hotkeys-hook or similar library
- Focus management best practices

**Anti-patterns to include:**
- Conflicting shortcuts
- No escape key to close modals
- Focus lost after modal closes
- No visual focus indicators
- Shortcuts not documented

---

## After All Patterns Built

1. **Run comprehensive grep check:**
   ```bash
   # Check all patterns reference each other correctly
   grep -r "agents/patterns/" agents/patterns/*.md

   # Check no broken depends_on paths
   grep "depends_on:" agents/patterns/*.md
   ```

2. **Update CLAUDE.md if needed:**
   - If any pattern introduces new hard rules
   - If any pattern bans a library/approach

3. **Create pattern index:**
   ```bash
   ls agents/patterns/*.md > agents/patterns/INDEX.md
   # Add descriptions
   ```

4. **Commit all:**
   ```bash
   git add agents/patterns/
   git commit -m "feat(patterns): add 16 production pattern files

   Batch 1 (foundation):
   - pagination, infinite-scroll, optimistic-updates
   - data-fetching, performance, security
   - forms, keyboard-navigation

   Batch 2 (advanced):
   - virtualization, real-time-sync, offline-first
   - drag-and-drop, webhook-handling, file-upload
   - email-security, caching

   All patterns:
   - Researched via 15-20 web searches each
   - Production-ready code examples
   - 5+ anti-patterns with wrong/correct code
   - Complete accessibility and security checklists
   - Cross-referenced dependencies"

   git push origin main
   ```

---

## Success Criteria

All patterns are complete when:

- [ ] All 16 pattern files exist in agents/patterns/
- [ ] Each has complete frontmatter with triggers, depends_on, prerequisites
- [ ] Each has 5+ anti-patterns with code examples
- [ ] Each has 3+ implementation code examples
- [ ] Each has testing, accessibility, security checklists
- [ ] All code examples are TypeScript with no type errors
- [ ] All depends_on paths are correct and not circular
- [ ] No broken references between patterns
- [ ] CLAUDE.md updated if new hard rules introduced
- [ ] All patterns committed to git with descriptive messages

---

**Execute this prompt in order. Build Batch 1 completely before starting Batch 2. Verify each pattern before moving to the next. Production quality only.**
