# Interactive Tutorial Agent
# CodeBakers V4 | agents/meta/tutorial.md

**Purpose:** Teach new users CodeBakers system through hands-on guided build

**Trigger:** `@tutorial` command OR first-time user (no .codebakers/CONFIG.md with tutorial_completed=true)

---

## Tutorial Structure

**Duration:** 10 minutes
**Project:** Simple Todo App (demonstrates all core patterns)
**Outcome:** User understands atomic units, dependency maps, error sniffer, crash recovery

---

## Step 1: Welcome (30 seconds)

```
🍞 CodeBakers Interactive Tutorial

This tutorial builds a simple todo app to teach you the system.

You'll learn:
  ✓ How to interview and start a project
  ✓ What atomic units are (and why they matter)
  ✓ How dependency maps prevent bugs
  ✓ How error sniffer catches problems before you write code
  ✓ How crash recovery works (resuming mid-build)

Time: ~10 minutes
Skip anytime: Type @skip-tutorial

Ready? [Press Enter to start]
```

---

## Step 2: Mini Interview (2 minutes)

```
Step 1/5: Project Interview

I'll ask 3 quick questions:

Q1: What type of app?
→ [Pre-selected: Todo list]

Q2: Who will use it?
→ [Pre-selected: Just me (single-user)]

Q3: Key features?
→ [Pre-selected: Add, complete, delete todos]

✓ Project profile created
→ project-profile.md
→ .codebakers/BRAIN.md initialized
→ domain: productivity (auto-detected)
```

---

## Step 3: Watch Atomic Unit Build (3 minutes)

```
Step 2/5: Atomic Unit Pattern

Now I'll build "Add Todo" feature using atomic units.
Watch each layer get built:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ATOMIC UNIT: Add Todo
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✓ Step 1/8: Schema (Zod validation for todo)
  → lib/schemas/todo.ts

✓ Step 2/8: API route (POST /api/todos)
  → app/api/todos/route.ts

✓ Step 3/8: Store update (useTodoStore.addTodo)
  → stores/todo-store.ts

✓ Step 4/8: UI component (AddTodoForm)
  → components/add-todo-form.tsx

✓ Step 5/8: Loading/error/success states
  → Inline feedback (no toasts)

✓ Step 6/8: Tests (E2E add todo)
  → tests/add-todo.spec.ts

✓ Step 7/8: TypeScript compile check
  → tsc --noEmit ✓

✓ Step 8/8: Gate check (all 8/8 passed)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Committed: feat(atomic): add todo — gate passed 8/8 checks

Key Takeaway:
  Atomic units are complete vertical slices.
  Every layer. Every state. Every test.
  Nothing ships incomplete.

[Press Enter to continue]
```

---

## Step 4: Dependency Map Explanation (2 minutes)

```
Step 3/5: Dependency Map

After building "Add Todo", let me show you the dependency map:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DEPENDENCY MAP
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Entity: Todo

Stores:
  - useTodoStore (todos: Todo[], addTodo, completeTodo, deleteTodo)

Components using useTodoStore:
  - AddTodoForm (calls: addTodo)
  - TodoList (reads: todos)
  - TodoItem (calls: completeTodo, deleteTodo)

Active State:
  - selectedTodoId (managed by useTodoStore)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Now let's see WHY this matters...

I'll build "Delete Todo" feature and show you the mutation handler pattern.

✓ Step 1: API delete successful
✓ Step 2: useTodoStore.deleteTodo (remove from todos array)
✓ Step 3: Check selectedTodoId — was it the deleted todo?
  → YES → set selectedTodoId = null (prevent stale selection)
✓ Step 4: Check if last todo in list?
  → YES → show empty state (not blank screen)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Key Takeaway:
  Dependency map shows ALL the places that need updates.
  Mutation handler updates: database + all stores + active state.
  This prevents the #1 bug class: stale UI after mutations.

[Press Enter to continue]
```

---

## Step 5: Error Sniffer Demo (2 minutes)

```
Step 4/5: Error Sniffer

Error Sniffer learns from past mistakes and prevents them BEFORE you write code.

Let me show you...

I'll intentionally introduce a bug (missing loading state):

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 Error Sniffer: Scanning for known patterns...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ HIGH CONFIDENCE WARNING

Pattern: Missing loading state on async operation

What failed before:
  → components/LoginForm.tsx (2 days ago)
  → components/UploadButton.tsx (1 week ago)

Root cause:
  User clicked button multiple times → duplicate API calls

How to prevent:
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit() {
    setIsLoading(true)
    try {
      await addTodo(text)
    } finally {
      setIsLoading(false)
    }
  }

  <button disabled={isLoading}>
    {isLoading ? 'Adding...' : 'Add Todo'}
  </button>

[Apply fix automatically / Proceed anyway / Show ERROR-LOG details]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

I'll apply the fix automatically...

✓ Fix applied
✓ Logged to BUILD-LOG.md: [Sniffer] Applied: loading state prevention

Key Takeaway:
  Error Sniffer learns from every mistake.
  Same error won't happen twice.
  Warnings before code is written (proactive, not reactive).

[Press Enter to continue]
```

---

## Step 6: Crash Recovery Demo (1 minute)

```
Step 5/5: Crash Recovery

CodeBakers survives crashes mid-build.

Simulating crash while building "Edit Todo" feature...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Building: Edit Todo (step 3/8)

✓ Step 1: Schema
✓ Step 2: API route
⚡ SIMULATED CRASH (Step 3 in progress)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Session ended]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[New session starts]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🍞 CodeBakers: Resuming from crash...

Reading .codebakers/UNIT-PROGRESS.md...
Reading .codebakers/BRAIN.md Mid-Build State...

Unit: edit-todo
Steps completed: 2/8
Last commit: wip(edit-todo): API route
Next step: Update useTodoStore.editTodo

✓ Crash recovery successful
→ Resuming from Step 3/8...

✓ Step 3: Store update
✓ Step 4: UI component
... [continues from where it left off]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Key Takeaway:
  UNIT-PROGRESS.md + wip commits = crash recovery state.
  Never lose progress mid-build.
  Resume from exact step after context reset.

[Press Enter to finish]
```

---

## Tutorial Complete

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎉 Tutorial Complete!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

You learned:
  ✓ Atomic units (complete vertical slices)
  ✓ Dependency maps (update all the things)
  ✓ Error Sniffer (learn from mistakes)
  ✓ Crash recovery (never lose progress)

Your tutorial todo app is fully functional:
  → Add, complete, delete todos
  → Loading states
  → Error handling
  → Tests passing

Next steps:
  1. Keep this app as reference (or delete it)
  2. Start your real project: @interview
  3. Build in INTERACTIVE mode (pick features one at a time)
  4. After 3 successful builds → auto-promoted to STANDARD mode

Commands:
  @help       — Show all commands
  @interview  — Start new project
  @build      — Build next feature
  @status     — Show progress

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Ready to build for real? Type: @interview
```

**Mark tutorial complete in CONFIG.md:**
```yaml
tutorial_completed: true
```

---

## Implementation Notes

**Tutorial Mode Detection:**
```typescript
// Check if tutorial needed
const configPath = '.codebakers/CONFIG.md'
const configExists = fs.existsSync(configPath)

if (!configExists || !config.includes('tutorial_completed: true')) {
  // Run tutorial
  await runTutorial()
}
```

**Simulated Crash:**
- Don't actually crash Claude Code
- Just demonstrate by showing "Session ended" then "Session starts"
- Create UNIT-PROGRESS.md with partial state
- Show resume logic reading it

**Tutorial App Cleanup:**
```
After tutorial complete, offer:
[Keep tutorial app for reference / Delete tutorial files]

If delete:
  → Remove all generated files
  → Reset .codebakers/ to empty state
  → Ready for @interview
```

---

*CodeBakers V4 | Interactive Tutorial | agents/meta/tutorial.md*
