# Rollback - Undo Last Feature

Safely undo the last atomic unit if it broke something.

## Usage

`@rollback` or `@rollback [N]` (undo last N features, default: 1)

## What It Does

1. **Find Last Atomic Commit**
   ```bash
   git log --grep="feat(atomic):" --oneline -[N]
   ```

2. **Show What Will Be Undone**
   ```
   🍞 CodeBakers: Rollback preview

   Will undo:
   → [commit hash] feat(atomic): [feature name]
   → Files changed: [N]
   → Lines added: +[N]
   → Lines removed: -[N]

   Last working state: [commit before this]

   Continue with rollback?
   [Yes / No]
   ```

3. **If Yes — Safe Rollback Process**
   ```bash
   # Create safety branch
   git checkout -b rollback-safety-$(date +%s)
   git checkout main

   # Revert the commit (keeps history clean)
   git revert [commit-hash] --no-edit

   # Regenerate dependency map
   pnpm dep:map

   # Update BRAIN.md
   # - Remove entity from ENTITIES list if entity was added
   # - Update CURRENT TASK
   # - Log rollback in BUILD-LOG.md

   # Run quick verification
   tsc --noEmit

   # Commit rollback
   git commit --amend -m "revert: rollback [feature name] — returned to last working state"
   ```

4. **Report**
   ```
   🍞 CodeBakers: Rollback complete.

   Reverted: [feature name]
   Current state: [N/total] features complete
   Safety branch: rollback-safety-[timestamp] (delete when satisfied)

   Next: Continue with queue or fix what broke
   ```

## Safety Guarantees

✓ Creates safety branch before rollback (can restore if needed)
✓ Uses git revert (preserves history, reversible)
✓ Regenerates dependency map after rollback
✓ Runs TypeScript check to verify clean state
✓ Updates BRAIN.md to reflect current state

## When to Use

- Last feature broke the build
- Tests started failing after last feature
- UI is broken and you need to get back to working state
- Realized last feature was wrong approach

## Limitations

- Only rolls back atomic commits (feat(atomic):)
- Cannot rollback partially (atomic units are all-or-nothing)
- Rolling back > 5 features requires confirmation
- Cannot rollback if uncommitted changes exist (stash first)

## Alternative: @verify

If state is corrupted but you don't want to lose work:
- Use `@verify` to regenerate BRAIN.md from code
- Keeps all code changes, just fixes memory state
