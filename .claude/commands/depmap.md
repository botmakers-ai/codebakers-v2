# Depmap - Regenerate and Display Dependency Map

Regenerate and display the dependency map.

Run:
```bash
pnpm dep:map
```

Then read and display .codebakers/DEPENDENCY-MAP.md:
- Entity → Store → Component Map table
- Store Inventory
- Component → Store Usage table

Report:
- [N] entities tracked
- [N] stores
- [N] store-connected components
- Last generated: [timestamp]
- Git hash: [hash]

Purpose: Shows complete data flow through your app. Read this before any mutation to know which stores and components must be updated.

If dep:map script not installed: Run setup from CLAUDE.md "Setup: dep:map" section first.
