# Fix - Run Fix Executor

Run fix executor on current findings in FIX-QUEUE.md.

Check for .codebakers/FIX-QUEUE.md:
- If missing: "🍞 CodeBakers: No fix queue found. Run @rebuild first to generate one."
- If exists: Load agents/meta/fix-executor.md and execute autonomous fix loop

Execute fixes sequentially:
- Pull next item from queue
- Apply fix
- Verify (tsc --noEmit, tests if applicable)
- Commit on success
- Move to next item

Report when complete: fixes applied count, remaining count.
