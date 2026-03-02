# Queue - Show Fix Queue

Show current fix queue from .codebakers/FIX-QUEUE.md.

Read .codebakers/FIX-QUEUE.md and display:
- Total items in queue
- Items by priority (P0, P1, P2)
- In-progress items
- Blocked items
- Completed count (if tracked)

Group by:
1. P0 (critical - blocks everything)
2. P1 (high priority - blocks new features)
3. P2 (nice to have)
4. Blocked (waiting on external dependency)

If FIX-QUEUE.md doesn't exist: "🍞 CodeBakers: No fix queue found. Run @rebuild to generate one."
