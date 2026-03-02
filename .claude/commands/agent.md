# Agent - Load Specific Agent

Load and execute a specific agent by name.

Usage: `@agent [name]` or `@agent [category]/[name]`

Examples:
- `@agent interview` → loads agents/meta/interview.md
- `@agent mutation-handler` → loads agents/patterns/mutation-handler.md
- `@agent error-investigator` → loads agents/meta/error-investigator.md

Search for the agent:
1. Search agents/meta/[name].md
2. Search agents/patterns/[name].md
3. Search recursively in agents/**/*.md for filename match

If multiple matches: Ask user to clarify with numbered options
If single match: Load and execute that agent
If no match: "🍞 CodeBakers: Agent '[name]' not found. Type @team to see all agents."

After loading, follow the agent's instructions completely.
