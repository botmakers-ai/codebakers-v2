# Pattern: Mutation Handler
# CodeBakers V4 | agents/patterns/mutation-handler.md
# Trigger: Any create, update, or delete operation on an entity

---

## MANDATORY: Read This Before Writing Any Code

A mutation is never just the API call.
Every create, update, or delete touches at least:
- A database row
- One or more Zustand stores
- One or more UI components
- Possibly: active/selected state, derived values, cached data, related stores

Writing only the API call and leaving stores/UI untouched is an **incomplete implementation**.
Incomplete mutations are bugs by definition. They will surface in QA or production.

---

## Step 1: Read the Generated Dependency Map FIRST

Before anything else:

```bash
cat .codebakers/DEPENDENCY-MAP.md
```

Find the entity you're mutating in the **Entity → Store → Component Map** table.

This gives you instantly:
- Every store that must be updated
- Every component affected
- The active state field to handle
- The last-item behavior

**If the map is missing or feels stale:**
```bash
pnpm dep:map
cat .codebakers/DEPENDENCY-MAP.md
```

The map is generated from actual code — it cannot lie. If an entity isn't in it, run `pnpm dep:map` and it will appear.

---

## Step 2: Verify With a Live Grep Scan

The map is your primary source. The grep scan catches anything added since the last map generation.

```bash
# Catch stores added since last map run
grep -r "EntityName\|entityId\|entity_id" src/stores/ --include="*.ts" -l

# Catch components added since last map run
grep -r "EntityName\|entityId\|entity_id" src/components/ --include="*.tsx" -l

# Catch hooks added since last map run
grep -r "EntityName\|entityId\|entity_id" src/hooks/ --include="*.ts" -l
```

**If grep finds something NOT in the map:**
```bash
pnpm dep:map  # regenerate
# Then proceed with the updated map
```

Replace `EntityName`, `entityId`, `entity_id` with the actual entity name and ID field.

---

## Step 3: Build the Impact List

From the map + grep, list every affected item before writing line 1:

```
MUTATION IMPACT: [Action] [Entity]
──────────────────────────────────
Source: .codebakers/DEPENDENCY-MAP.md (generated [date])

API:
  □ [method] /api/[entity]/[id]

Stores (from map):
  □ [store-name] → [action needed]
  □ [store-name] → [action needed]

Stores (from grep delta — not yet in map):
  □ [any new stores found by grep but not in map]

Active State:
  □ Field: [activeStateField from map]
  □ Is this entity the currently active/selected one?
  □ If yes → switch to next available, or redirect if none left

Edge Cases:
  □ Last-item behavior: [from map]
  □ What if another entity depends on this one?
```

---

## Step 4: Write the Complete Handler — All Layers at Once

Never write a partial handler. All layers in one pass.

### Template: Delete Handler

```typescript
const handle[Entity]Delete = async (entityId: string) => {
  // ─── 1. Optimistic remove ───────────────────────────────────────
  use[Entity]Store.getState().remove[Entity](entityId);

  try {
    // ─── 2. API call ────────────────────────────────────────────
    const res = await fetch(`/api/[entity]/${entityId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(await res.text());

    // ─── 3. ALL stores from dependency map ──────────────────────
    // (replace with every store listed in DEPENDENCY-MAP.md for this entity)
    use[RelatedStore1].getState().clear[RelatedData]();
    use[RelatedStore2].getState().remove[DerivedData](entityId);

    // ─── 4. Active/selected state ───────────────────────────────
    const isActive = use[Entity]Store.getState().[activeStateField] === entityId;
    if (isActive) {
      const remaining = use[Entity]Store.getState().[entities];
      if (remaining.length > 0) {
        use[Entity]Store.getState().setActive[Entity](remaining[0].id);
      } else {
        router.push('/[last-item-fallback-route]');
        return;
      }
    }

    // ─── 5. Feedback ────────────────────────────────────────────
    toast.success('[Entity] deleted');

  } catch (error) {
    // ─── 6. Rollback ─────────────────────────────────────────────
    await use[Entity]Store.getState().fetch[Entities]();
    toast.error('Failed to delete [entity]');
    console.error('[Entity] delete failed:', error);
  }
};
```

### Template: Create Handler

```typescript
const handle[Entity]Create = async (data: [Entity]Input) => {
  try {
    const res = await fetch('/api/[entity]', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await res.text());
    const created: [Entity] = await res.json();

    // ALL stores from dependency map
    use[Entity]Store.getState().add[Entity](created);

    // Set active if appropriate
    use[Entity]Store.getState().setActive[Entity](created.id);

    toast.success('[Entity] created');
  } catch (error) {
    toast.error('Failed to create [entity]');
    console.error('[Entity] create failed:', error);
  }
};
```

### Template: Update Handler

```typescript
const handle[Entity]Update = async (entityId: string, updates: Partial<[Entity]>) => {
  const previous = use[Entity]Store.getState().get[Entity](entityId);
  use[Entity]Store.getState().update[Entity](entityId, updates);

  try {
    const res = await fetch(`/api/[entity]/${entityId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error(await res.text());

    // ALL derived/related stores from map

  } catch (error) {
    if (previous) use[Entity]Store.getState().update[Entity](entityId, previous);
    toast.error('Failed to update [entity]');
    console.error('[Entity] update failed:', error);
  }
};
```

---

## Step 5: Ripple Check Before Marking Complete

```
□ Perform the mutation in the running app
□ Check EVERY component listed in DEPENDENCY-MAP.md for this entity
  → Entity is gone/updated in ALL of them
□ Check active/selected state — correct item is now active
□ Check empty state — if last item deleted, correct fallback shown
□ Hard refresh — state is correct after reload
□ Browser console — no errors, no silent 404s
□ Run: pnpm test:e2e --grep "[entity]" if tests exist
```

---

## Step 6: Keep the Map Current

```bash
# After adding any new store or component during this work:
pnpm dep:map

# Commit the updated map with your work
git add .codebakers/DEPENDENCY-MAP.md
git commit -m "chore(deps): regenerate dependency map after [entity] [action]"
```

---

## Non-Negotiable Checklist

- [ ] `.codebakers/DEPENDENCY-MAP.md` was read before writing any code
- [ ] `pnpm dep:map` was run if map was stale or missing
- [ ] Grep scan verified nothing added since last map generation
- [ ] ALL stores from the map were updated
- [ ] Active/selected state handled
- [ ] Last-item edge case handled
- [ ] Rollback on API failure implemented
- [ ] Ripple check performed in running app
- [ ] Map regenerated and committed if new stores/components were added

---

## Common Mistakes

| Mistake | What Happens | Fix |
|---------|-------------|-----|
| Skipping map read, going straight to code | Miss stores, break UI | Always read map first |
| Trusting map without grep verification | Miss stores added since last run | Map + grep, always both |
| Map not regenerated after new store added | Next mutation misses the new store | `pnpm dep:map` after every new store |
| Not handling active-item case | App crashes after deleting active item | Always check activeStateField from map |
| Not handling last-item case | Infinite loading / broken state | Always check last-item behavior from map |
| No rollback on failure | Optimistic update leaves UI permanently wrong | Always re-fetch or revert in catch |

---

*CodeBakers V4 | Pattern: Mutation Handler | agents/patterns/mutation-handler.md*
