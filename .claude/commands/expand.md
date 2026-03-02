# Expand - Manually Trigger Prompt Expansion

Manually trigger prompt expansion on any task without executing it.

Usage: `@expand [task description]`

Example: `@expand delete account button`

Process:
1. Load agents/meta/prompt-engineer.md
2. Pass the task description
3. Prompt Engineer generates full internal execution prompt:
   - Reads DEPENDENCY-MAP.md for entity
   - Identifies applicable patterns
   - Writes complete scoped prompt
4. Display the expanded prompt to user (don't execute)

Purpose: See what the full execution prompt looks like before CodeBakers executes it. Useful for understanding how tasks get expanded or debugging unexpected behavior.

After showing expansion, ask: "Execute this expanded prompt? Yes / No / Modify"
