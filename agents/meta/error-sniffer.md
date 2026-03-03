# Error Sniffer Agent
# CodeBakers V4 | agents/meta/error-sniffer.md

**Purpose:** Proactive error prevention. Scan ERROR-LOG.md for known patterns and prevent them BEFORE code is written.

**Core Principle:** Shift from reactive (fix errors after they happen) to proactive (prevent known errors before they occur).

**False Positive Mitigation:** Confidence-based warnings with override mechanism. Never blocks — always allows user to proceed.

---

## When This Agent Runs

**Auto-triggers before writing ANY code:**
- Feature implementation starts
- Mutation handler being written
- New API route being created
- New component being built
- Server action being implemented

**Manual trigger:**
```bash
@sniffer          # Run sniffer on current task
@sniffer report   # Show full ERROR-LOG analysis
@sniffer ignore [pattern]  # Add pattern to ignore list
```

---

## The System

### 1. Scan Phase (Silent)

Read `.codebakers/ERROR-LOG.md` and extract:
- Error patterns (what failed)
- Root causes (why it failed)
- Contexts (where/when it failed)
- Frequencies (how many times)
- Fixes applied (how it was resolved)

Build pattern database:
```typescript
type ErrorPattern = {
  signature: string          // ".single() without .maybeSingle()"
  category: ErrorCategory    // "database" | "typescript" | "ux-ui" | etc
  rootCause: string         // "Multiple rows returned, expected single"
  occurrences: number       // 4
  contexts: string[]        // ["API route", "auth flow", "RLS enabled"]
  lastSeen: string          // "2 days ago"
  confidence: "HIGH" | "MEDIUM" | "LOW"
  fixes: string[]           // ["Replace .single() with .maybeSingle()"]
}
```

Calculate confidence:
```typescript
function calculateConfidence(pattern: ErrorPattern): Confidence {
  const { occurrences, contexts } = pattern

  // HIGH: Failed 3+ times in similar contexts
  if (occurrences >= 3 && contextsAreSimilar(contexts)) {
    return "HIGH"
  }

  // MEDIUM: Failed 2 times, or 3+ times in different contexts
  if (occurrences >= 2) {
    return "MEDIUM"
  }

  // LOW: Failed once (could be edge case)
  return "LOW"
}
```

### 2. Analysis Phase (Context-Aware)

Given the current task, identify applicable patterns:

**Task:** "Build delete account feature"

**Applicable patterns:**
```markdown
HIGH CONFIDENCE:
- Delete mutation without user_id filter (3 occurrences)
- Delete without confirmation dialog (2 occurrences)
- Delete without store update (4 occurrences)

MEDIUM CONFIDENCE:
- Delete without cascade handling (2 occurrences)

LOW CONFIDENCE:
- Delete without audit log (1 occurrence)
```

**Not applicable patterns (filtered out):**
```markdown
- TypeScript null check on auth flow (context: auth routes, not delete)
- Missing loading state on list component (context: UI components, not mutations)
```

### 3. Warning Phase (Human-in-the-Loop)

**Format:**
```
🍞 CodeBakers: ⚠️ Error Sniffer — [N] patterns detected

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
HIGH CONFIDENCE (block 90% of known errors)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Delete mutation without user_id filter

   What failed before:
   → auth/delete-account.ts:23 (3 days ago)
   → settings/delete-profile.ts:45 (1 week ago)
   → admin/delete-user.ts:67 (2 weeks ago)

   Root cause:
   Missing RLS filter allowed deletion of other users' data

   How to prevent:
   ✓ Always filter by BOTH id AND user_id:
     await supabase.from('users')
       .delete()
       .eq('id', userId)
       .eq('user_id', session.user.id)  // ← Add this

   Impact if ignored: CRITICAL — data loss, security breach

   [Apply prevention automatically / Show me ERROR-LOG details / Ignore this warning]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MEDIUM CONFIDENCE (block 50% of known errors)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

2. Delete without cascade handling

   What failed before:
   → posts/delete-post.ts:34 (5 days ago)
   → comments/delete-comment.ts:12 (1 week ago)

   Root cause:
   Foreign key constraint violation (related records not deleted)

   How to prevent:
   ✓ Check for related records first OR use cascade delete:
     // Option 1: Manual cascade
     await supabase.from('comments').delete().eq('post_id', postId)
     await supabase.from('posts').delete().eq('id', postId)

     // Option 2: Database cascade (preferred)
     ALTER TABLE comments ADD CONSTRAINT fk_post
       FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE

   Impact if ignored: MEDIUM — constraint errors, partial deletes

   [Apply prevention / Show details / Ignore]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Proceed with these warnings in mind?
[Yes, I'll handle these / Apply all HIGH confidence fixes automatically / Show me full ERROR-LOG report]
```

### 4. Override Mechanism

User can:

**A) Apply fix automatically**
- Sniffer injects prevention code before implementation
- Logged to BUILD-LOG.md: `[Sniffer] Applied: user_id filter prevention`

**B) Proceed anyway**
- Warning dismissed for this instance
- Logged to BUILD-LOG.md: `[Sniffer] Warning dismissed: delete without cascade handling (user override)`
- If error happens: increase confidence for this pattern

**C) Ignore pattern permanently**
- Added to `.codebakers/ERROR-SNIFFER-IGNORES.md`
- Pattern never shown again for this project
- Example use case: "Delete without audit log" is intentional for this app

**D) Show ERROR-LOG details**
- Display full error entries for this pattern
- User sees exact context, stack traces, fixes applied before

### 5. Learning System

Track warning outcomes in `.codebakers/ERROR-SNIFFER-FEEDBACK.md`:

```markdown
## Pattern: Delete mutation without user_id filter

Warnings issued: 8
User proceeded anyway: 0
Errors occurred after proceeding: 0
Confidence: HIGH (100% accuracy)

Last warning: 2024-03-02 (applied fix automatically)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Pattern: Missing loading state on async operation

Warnings issued: 12
User proceeded anyway: 7
Errors occurred after proceeding: 1

False positive analysis:
→ Warning on delete button: proceeded, no error (2 times)
→ Warning on submit form: proceeded, no error (3 times)
→ Warning on fetch data: proceeded, no error (2 times)
→ Warning on export data: proceeded, ERROR occurred (1 time)

Adjustment: Reduce confidence from HIGH → MEDIUM
Context filter: Only warn on long-running operations (>2s expected)

Last adjusted: 2024-03-01
```

**Auto-adjustments:**
- 3+ false positives → reduce confidence level
- 2+ true positives after override → increase confidence level
- 5+ dismissals without error → add to ignore list (with user confirmation)

---

## Error Categories and Patterns

### 1. TypeScript Errors

**Common patterns detected:**
```typescript
// Pattern: Null/undefined access
error.includes("Cannot read property") || error.includes("is possibly 'null'")

// Prevention:
if (user?.profile) {
  // Safe access
}

// Or use type guard:
function isValidUser(user: User | null): user is User {
  return user !== null && user.profile !== undefined
}
```

**Pattern: Type mismatch**
```typescript
// Detected: Assigning string to number field
error.includes("Type 'string' is not assignable to type 'number'")

// Prevention: Zod schema with transform
const schema = z.object({
  age: z.string().transform(val => parseInt(val, 10))
})
```

### 2. Database Errors

**Pattern: .single() returning multiple rows**
```typescript
// Detected in ERROR-LOG:
"PostgrestError: Multiple rows returned"

// Prevention:
// Before:
const { data } = await supabase.from('users').select().eq('email', email).single()

// After:
const { data } = await supabase.from('users').select().eq('email', email).maybeSingle()
```

**Pattern: Missing RLS filter on mutation**
```typescript
// Detected in ERROR-LOG:
"User deleted another user's record"

// Prevention:
// Before:
await supabase.from('posts').delete().eq('id', postId)

// After:
await supabase.from('posts')
  .delete()
  .eq('id', postId)
  .eq('user_id', session.user.id)  // ← Always filter by user_id
```

**Pattern: N+1 query**
```typescript
// Detected in ERROR-LOG:
"Performance: 100 queries for 100 items (N+1)"

// Prevention:
// Before:
const posts = await supabase.from('posts').select()
for (const post of posts) {
  const author = await supabase.from('users').select().eq('id', post.user_id).single()
  // Use author
}

// After:
const posts = await supabase.from('posts').select('*, author:users(*)')
```

### 3. UX/UI Errors

**Pattern: Missing loading state**
```typescript
// Detected in ERROR-LOG:
"User clicked button multiple times, duplicate records created"

// Prevention:
const [isDeleting, setIsDeleting] = useState(false)

async function handleDelete() {
  setIsDeleting(true)
  try {
    await deleteAccount()
  } finally {
    setIsDeleting(false)
  }
}

<button disabled={isDeleting}>
  {isDeleting ? 'Deleting...' : 'Delete Account'}
</button>
```

**Pattern: Missing error state**
```typescript
// Detected in ERROR-LOG:
"Network error occurred, user saw no feedback"

// Prevention:
const [error, setError] = useState<string | null>(null)

try {
  await submitForm()
} catch (err) {
  setError(err.message)
}

{error && <div className="error">{error}</div>}
```

**Pattern: Missing empty state**
```typescript
// Detected in ERROR-LOG:
"User reported 'blank screen' — no data, no message"

// Prevention:
{items.length === 0 ? (
  <EmptyState
    title="No items yet"
    description="Create your first item to get started"
    action={<button>Create Item</button>}
  />
) : (
  <ItemList items={items} />
)}
```

### 4. Security Errors

**Pattern: Exposing service role key**
```typescript
// Detected in ERROR-LOG:
"Service role key committed to git"

// Prevention before writing code:
"⚠️ Creating .env file. Make sure to:
1. Add .env.local to .gitignore
2. Never use SUPABASE_SERVICE_ROLE_KEY on client
3. Use SUPABASE_ANON_KEY for client-side code"
```

**Pattern: Missing auth check**
```typescript
// Detected in ERROR-LOG:
"Unauthenticated user accessed protected route"

// Prevention:
// Before writing route handler:
"⚠️ This is an API route. Apply auth check:

import { withAuth } from '@/lib/with-auth'

export const POST = withAuth(async (request, { session, supabase }) => {
  // session.user guaranteed to exist
})"
```

### 5. Performance Errors

**Pattern: Unoptimized images**
```typescript
// Detected in ERROR-LOG:
"Lighthouse: 5MB image loaded, LCP >4s"

// Prevention before adding <img>:
"⚠️ Adding image component. Use Next.js Image:

import Image from 'next/image'

<Image
  src={url}
  alt={alt}
  width={800}
  height={600}
  placeholder='blur'
/>"
```

**Pattern: Missing pagination**
```typescript
// Detected in ERROR-LOG:
"Loaded 10,000 records, browser froze"

// Prevention before fetching all records:
"⚠️ Fetching list without limit. Add pagination:

const PAGE_SIZE = 50
const { data } = await supabase
  .from('items')
  .select()
  .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)"
```

### 6. Linter Errors

**Pattern: ESLint hook dependency warnings**
```typescript
// Detected in ERROR-LOG:
"React Hook useEffect has missing dependency"

// Prevention:
"⚠️ useEffect detected. Common mistake:

// Before:
useEffect(() => {
  fetchData(userId)
}, [])  // ← Missing userId dependency

// After:
useEffect(() => {
  fetchData(userId)
}, [userId])  // ← Correct"
```

### 7. Build Errors

**Pattern: Tailwind CSS custom properties not configured**
```typescript
// Detected in ERROR-LOG:
"Syntax error: The `border-border` class does not exist"
"The `ring-ring` class does not exist"

// Root cause:
Using shadcn/ui or custom design tokens without configuring Tailwind CSS variables

// Prevention before adding shadcn/ui components:
"⚠️ shadcn/ui setup detected. CRITICAL: Configure Tailwind CSS variables first.

This pattern causes build failures 100% of the time.

Required setup:
1. Add CSS variables to globals.css (see: agents/patterns/tailwind-css-variables.md)
2. Configure tailwind.config.ts to use CSS variables
3. Install tailwindcss-animate plugin

Without this setup:
→ Build fails with 'border-border class does not exist'
→ All shadcn/ui components broken
→ 30+ minutes debugging

Apply complete setup now?
[Yes — set up automatically / Show me the pattern / I'll do it manually]"

// Full pattern documentation:
→ agents/patterns/tailwind-css-variables.md
```

**Pattern: Missing TypeScript types for dependencies**
```typescript
// Detected in ERROR-LOG:
"Could not find a declaration file for module 'some-package'"

// Prevention before installing package:
"⚠️ Installing package without TypeScript types.

// After: pnpm add some-package
// Also add: pnpm add -D @types/some-package

Or check if package has built-in types."
```

### 8. API Errors

**Pattern: Missing error handling**
```typescript
// Detected in ERROR-LOG:
"Unhandled API error: Network request failed"

// Prevention:
"⚠️ External API call detected. Add comprehensive error handling:

try {
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`)
  }

  return await response.json()
} catch (error) {
  if (error instanceof TypeError) {
    // Network error
    return { error: 'Network connection failed' }
  }

  if (error.message.includes('429')) {
    // Rate limit
    return { error: 'Too many requests, try again later' }
  }

  // Unknown error
  return { error: 'Something went wrong' }
}"
```

### 9. Integration Errors

**Pattern: Webhook signature verification missing**
```typescript
// Detected in ERROR-LOG:
"Webhook received from unknown source, data breach"

// Prevention before creating webhook route:
"⚠️ Creating webhook endpoint. CRITICAL: Verify signature:

import { verifyWebhookSignature } from '@/lib/webhooks'

export async function POST(request: Request) {
  const signature = request.headers.get('x-webhook-signature')
  const body = await request.text()

  const isValid = verifyWebhookSignature(body, signature)

  if (!isValid) {
    return new Response('Invalid signature', { status: 401 })
  }

  // Process webhook
}"
```

---

## Integration with Build Flow

**conductor.md modification:**

```markdown
Before implementing any feature:

1. Load Error Sniffer agent
2. Sniffer scans ERROR-LOG.md
3. Sniffer identifies applicable patterns for this task
4. Sniffer displays warnings (HIGH → MEDIUM → LOW)
5. User chooses: Apply fixes / Proceed anyway / Show details / Ignore
6. Build proceeds with preventions in place
```

**Example flow:**

```bash
User: "Build delete account feature"

System:
→ Load agents/meta/error-sniffer.md
→ Scan .codebakers/ERROR-LOG.md
→ Detect 3 HIGH confidence patterns for delete mutations
→ Display warnings with prevention code
→ User: "Apply all HIGH confidence fixes automatically"
→ Inject preventions into implementation plan
→ Build feature with preventions already included
→ Log to BUILD-LOG.md: [Sniffer] Applied 3 preventions
→ Result: Feature built correctly first time, no errors
```

---

## File: .codebakers/ERROR-SNIFFER-IGNORES.md

**Format:**
```markdown
# Error Sniffer — Ignored Patterns
# Patterns in this file will never trigger warnings

## Delete without audit log
Context: Internal tool, audit logging not required
Added: 2024-03-01
Reason: Intentional — this is not a compliance app

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Missing loading state on instant operations
Context: Delete button with optimistic update
Added: 2024-03-02
Reason: Intentional — UX pattern is immediate feedback, not loading state

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## False Positive Handling

**When false positive occurs:**

1. **User reports:** "Sniffer warned about X, but it's not actually an error in this case"

2. **System asks:**
   ```
   Thanks for the feedback. What should I do?

   [A] Ignore this specific instance (one-time override)
   [B] Reduce confidence for this pattern (MEDIUM → LOW)
   [C] Add context filter (only warn in specific contexts)
   [D] Ignore this pattern entirely (never warn again)
   ```

3. **Learning applied:**
   - Option A: No change to pattern database
   - Option B: Confidence reduced in ERROR-SNIFFER-FEEDBACK.md
   - Option C: Context filter added (e.g., "only warn in API routes, not components")
   - Option D: Pattern added to ERROR-SNIFFER-IGNORES.md

4. **Logged to BUILD-LOG.md:**
   ```markdown
   [Sniffer] False positive reported: "Delete without confirmation"
   Context: Admin dashboard delete (bulk operation, confirmation in parent)
   Action: Added context filter — only warn in user-facing routes
   ```

---

## Expected Outcomes

**Week 1:**
- 10-15 warnings per feature
- 50% false positive rate (learning phase)
- User trains system by providing feedback

**Week 2:**
- 5-8 warnings per feature
- 20% false positive rate (patterns refined)
- Most warnings are HIGH confidence, highly accurate

**Week 3+:**
- 2-4 warnings per feature
- <10% false positive rate (system learned project patterns)
- Warnings are almost always correct, user trusts system

**Long-term:**
- Error Sniffer becomes invisible — preventions applied automatically
- ERROR-LOG.md stops growing (errors prevented before occurrence)
- New developers onboard faster (Sniffer teaches project patterns)

---

## Commands

```bash
@sniffer              # Run on current task
@sniffer report       # Show ERROR-LOG analysis + pattern database
@sniffer ignore [pattern]  # Add to ignore list
@sniffer confidence   # Show accuracy stats from feedback log
@sniffer reset        # Clear feedback, start learning from scratch
```

---

## Success Metrics

**Before Error Sniffer:**
- 10-15 errors per feature on first implementation
- 2-3 fix iterations per feature
- ERROR-LOG.md grows constantly

**After Error Sniffer:**
- 1-3 errors per feature on first implementation (90% reduction)
- 0-1 fix iterations per feature
- ERROR-LOG.md stops growing (same errors don't recur)

**The Goal:** Write code correctly the first time by learning from past mistakes.

---

*CodeBakers V4 | Error Sniffer Agent | Proactive Error Prevention System*
