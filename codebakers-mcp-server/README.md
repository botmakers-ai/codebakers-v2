# CodeBakers MCP Server v5.0.0

**Complete implementation of the CodeBakers Method as an MCP server**

This MCP server provides technical enforcement and proactive guidance for the CodeBakers Method - a 7-phase, spec-first, mockup-driven AI development framework.

---

## 🎯 What This Is

An MCP (Model Context Protocol) server that:
- **Automatically detects project state** (what phase you're in)
- **Proactively suggests next steps** (you don't need to know the Method)
- **Technically enforces the CodeBakers Method** (not instruction-based)
- **Maps dependencies from moment 1** (zero stale UI bugs)
- **Guides you through 7 phases** (spec → mockups → schema → build → test → deploy)

**Key Innovation:** You don't tell CodeBakers what to do - CodeBakers tells YOU what's next based on project state.

---

## 🏗️ Current Build Status

### ✅ COMPLETED (Working Now)

**Core MCP Server:**
- ✅ MCP server setup (index.ts)
- ✅ Tool registration system
- ✅ TypeScript configuration
- ✅ Package.json with dependencies

**Critical Tools (Fully Implemented):**
1. **`codebakers_get_context`** - Self-aware context detection
   - Detects project state automatically
   - Determines current phase (0-6)
   - Identifies blockers
   - Generates proactive suggestions
   - Returns next steps

2. **`codebakers_init_session`** - Session initialization protocol
   - Loads BUILD-STATE.md
   - Loads PROJECT-SPEC.md
   - Loads phase-specific artifacts
   - Confirms verification gate requirements
   - Returns complete session context

### 🚧 STUB IMPLEMENTATIONS (Need Completion)

These tools are registered and callable but return placeholder messages:

3. `codebakers_generate_spec` - Phase 0: Spec generation (Gates 0-5)
4. `codebakers_analyze_mockups_deep` - Phase 2: Deep mockup analysis
5. `codebakers_generate_schema` - Phase 2: Schema generation from mockups
6. `codebakers_map_dependencies` - Phase 2: **Comprehensive dependency mapping**
7. `codebakers_generate_store_contracts` - Phase 2: Store contract generation
8. `codebakers_check_gate` - Phase verification
9. `codebakers_enforce_feature` - Feature build enforcement
10. `codebakers_fix_commit` - Auto-fix commit violations
11. `codebakers_check_scope` - Scope enforcement

---

## 📦 Installation

### Prerequisites
- Node.js 18+
- Claude Code (with MCP support)

### Step 1: Install Dependencies

```bash
cd codebakers-mcp-server
npm install
```

### Step 2: Build the Server

```bash
npm run build
```

This compiles TypeScript to `dist/` folder.

### Step 3: Configure Claude Code

Add to your Claude Code MCP settings (usually in `~/Library/Application Support/Claude/claude_desktop_config.json` on Mac or `%APPDATA%\Claude\claude_desktop_config.json` on Windows):

```json
{
  "mcpServers": {
    "codebakers": {
      "command": "node",
      "args": [
        "/absolute/path/to/codebakers-mcp-server/dist/index.js"
      ]
    }
  }
}
```

**Replace `/absolute/path/to/` with your actual path.**

### Step 4: Restart Claude Code

The MCP server will auto-start when Claude Code loads.

### Step 5: Test It

In any project folder, type in Claude Code:

```
hi
```

CodeBakers should automatically detect project state and suggest next steps.

---

## 🎮 How It Works

### Automatic Context Detection

**Every time you send a message**, CodeBakers runs `codebakers_get_context` automatically to:
1. Detect if `.codebakers/` folder exists
2. Check what phase you're in (0-6)
3. Identify what's blocking progress
4. Suggest next steps

**You don't need to know anything** - CodeBakers guides you.

### Example Session

```
You: hi

CodeBakers (auto-detects state):
🍞 CodeBakers: Hello! I see this is a new project.

I'm going to help you build this using the CodeBakers Method
(7 phases from spec to deployment).

We're currently at: Phase 0 (Domain Research & Spec)

To get started, I need to understand what you're building.

Options:
1. Tell me about your idea (I'll research and write the spec)
2. You already have a spec/requirements doc (I'll process it)
3. You want to see an example first

Which would you prefer?
```

**No commands needed. No manual setup. Just conversation.**

---

## 🔧 What Needs to Be Completed

### Priority 1: Phase 2 Tools (Critical for Method)

**`codebakers_analyze_mockups_deep`** - Most important
- Read mockup files from `refs/design/`
- Extract ALL data fields, types, relationships
- Identify all UI interactions
- Generate MOCK-ANALYSIS.md

**`codebakers_generate_schema`**
- Read MOCK-ANALYSIS.md
- Generate complete SQL schema
- Include: tables, columns, indexes, RLS policies, triggers
- Save to `.codebakers/SCHEMA.sql`

**`codebakers_map_dependencies`** - YOUR enhancement
- Map read dependencies (component → stores → queries)
- Map write dependencies (mutation → updates → cascades)
- Map store-to-store connections
- Map all cascade effects
- Generate DEPENDENCY-MAP.md with complete graph

**`codebakers_generate_store_contracts`**
- Read DEPENDENCY-MAP.md
- Generate store contracts (what each store exposes)
- Save to STORE-CONTRACTS.md

### Priority 2: Phase 0 Tool

**`codebakers_generate_spec`**
- Research domain and competitors
- Generate Gates 0-5 specification
- Save to PROJECT-SPEC.md

### Priority 3: Enforcement Tools

**`codebakers_enforce_feature`**
- Load DEPENDENCY-MAP.md
- Build feature with full atomic unit protocol
- Update all dependent stores
- Verify against dependencies

**`codebakers_check_scope`**
- Load PROJECT-SPEC.md
- Check if requested feature is in scope
- Prompt user if scope expansion detected

**`codebakers_fix_commit`**
- Read .codebakers/commit-violations.json
- Fix TypeScript errors
- Update BUILD-LOG.md
- Retry commit

**`codebakers_check_gate`**
- Load phase-specific requirements
- Verify all gate items met
- Return pass/fail

---

## 📝 File Structure

```
codebakers-mcp-server/
├── package.json
├── tsconfig.json
├── README.md (this file)
├── src/
│   ├── index.ts (MCP server entry point)
│   ├── tools/
│   │   ├── get-context.ts ✅ COMPLETE
│   │   ├── init-session.ts ✅ COMPLETE
│   │   ├── generate-spec.ts 🚧 STUB
│   │   ├── analyze-mockups.ts 🚧 STUB
│   │   ├── generate-schema.ts 🚧 STUB
│   │   ├── map-dependencies.ts 🚧 STUB (CRITICAL)
│   │   ├── generate-store-contracts.ts 🚧 STUB
│   │   ├── check-gate.ts 🚧 STUB
│   │   ├── enforce-feature.ts 🚧 STUB
│   │   ├── fix-commit.ts 🚧 STUB
│   │   └── check-scope.ts 🚧 STUB
│   ├── lib/ (helper functions - to be created)
│   └── phases/ (phase implementations - to be created)
└── dist/ (compiled output)
```

---

## 🔗 Integration with CLAUDE.md

**CLAUDE.md will be TINY** in v5.0.0:

```markdown
# CodeBakers V5

You are a senior engineer using CodeBakers Method via MCP.

## Session Start

Every session:
1. Auto-run: codebakers_get_context (detects state)
2. Auto-run: codebakers_init_session (loads BUILD-STATE.md)
3. Follow suggestions from context

## User Requests

When user types //:
→ Call: codebakers_enforce_feature(feature_name)

When user requests feature not in spec:
→ Call: codebakers_check_scope(feature_description)

## Hard Rules

- Stack: Supabase + Next.js only
- Queries: .maybeSingle() not .single()
- Mutations: Filter by id AND user_id
- Versions: --save-exact

MCP tools handle everything else.
```

**That's it. ~30 lines instead of 1200.**

---

## 🚀 Next Steps

### To Complete v5.0.0:

1. **Implement Phase 2 tools** (analyze-mockups, generate-schema, map-dependencies, store-contracts)
2. **Implement Phase 0 tool** (generate-spec)
3. **Implement enforcement tools** (enforce-feature, check-scope, fix-commit, check-gate)
4. **Create BUILD-STATE.md template**
5. **Update CLAUDE.md** to integrate with MCP
6. **Test full workflow** (Phase 0 → 6)
7. **Create example project** showing complete build

### To Test Current Build:

```bash
# Build
npm run build

# Test context detection
node dist/index.js

# (MCP server starts and waits for stdin)
```

---

## 📚 Architecture Decisions

### Why MCP?

**Problem:** Instruction-based enforcement is fragile (Claude can ignore it)

**Solution:** MCP tools execute BEFORE Claude decides what to do
- Context is loaded automatically
- Dependencies are mapped before building
- Scope is checked before expanding
- Technical enforcement, not instructions

### Why Self-Aware Context?

**Problem:** User doesn't know what phase they're in or what to do next

**Solution:** `codebakers_get_context` auto-detects and suggests
- No manual commands needed
- CodeBakers guides the user
- Proactive, not reactive

### Why Comprehensive Dependency Mapping?

**Problem:** Stale UI bugs from missed store updates

**Solution:** Map ALL dependencies in Phase 2 BEFORE building
- Every mutation knows what to update
- Every component knows what stores it needs
- Zero surprises during build

---

## 🤝 Contributing

To implement a stub tool:

1. Open the tool file (e.g., `src/tools/map-dependencies.ts`)
2. Replace stub implementation with real logic
3. Add helper functions to `src/lib/` if needed
4. Update tests (when test suite is added)
5. Rebuild: `npm run build`

Example structure:

```typescript
// src/tools/map-dependencies.ts
import { readMockAnalysis } from '../lib/readers.js';
import { analyzeDependencies } from '../lib/analyzers.js';

export async function mapDependencies(args: any): Promise<string> {
  // 1. Read MOCK-ANALYSIS.md
  const mockAnalysis = await readMockAnalysis();

  // 2. Analyze dependencies
  const deps = await analyzeDependencies(mockAnalysis);

  // 3. Generate DEPENDENCY-MAP.md
  await saveDependencyMap(deps);

  return `✓ Dependency map generated
  - ${deps.readPaths.length} read paths
  - ${deps.writePaths.length} write paths
  - ${deps.cascades.length} cascades`;
}
```

---

## 📄 License

MIT © 2026 BotMakers Inc.

---

**Built as part of CodeBakers Method v5.0.0**

For questions or issues: https://github.com/botmakers-ai/codebakers-v2
