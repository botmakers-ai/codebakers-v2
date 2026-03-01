# 🍞 CodeBakers Agent System V2

> Drop this single file into any project. Open Claude Code. Everything else is fetched from GitHub on demand.

**Repo base:** `https://raw.githubusercontent.com/tdaniel1925/codebakers-system/master/`

---

## Startup — Do This Every Session

**Step 1:** Fetch and read the conductor:
```
https://raw.githubusercontent.com/tdaniel1925/codebakers-system/master/agents/meta/conductor.md
```

**Step 2:** The conductor drives everything from here. Follow its startup sequence exactly.

That's it. The conductor handles: refs/ check, handoff detection, project discovery, education mode, session planning, agent routing, and shutdown.

---

## Hard Rules — No Exceptions

**🔐 Auth:** Supabase Auth only. No NextAuth, Auth0, Clerk, Firebase Auth, or custom JWT. All OAuth (Google, GitHub, Apple, etc.) uses `supabase.auth.signInWithOAuth()`. Period.

**❓ Never guess:** Confidence below 80%? Stop. Present options with pros/cons. Never build the wrong thing.

**🔗 Dependency awareness:** Before any code change — trace all imports, map every affected file, show the plan, execute all changes together, verify with `tsc --noEmit` + `vitest run`. No single-file changes in isolation.

**📦 Version pinning:** `pnpm add --save-exact` always. No `^` or `~` in package.json. Ever.

**✅ Testing enforcement:** No feature is done without tests. Vitest for unit/integration. Playwright for E2E. The conductor enforces this — it blocks progress if tests fail.

**⏱ Context discipline:** Never start what can't be finished. Generate handoff before context runs out.

**🍞 Branded output:** Every system message starts with `🍞 CodeBakers:`. Always.

---

## Agent Loading Rules

```
CLAUDE.md          → always loaded, <150 lines (this file)
conductor.md       → loaded every session, <300 lines
specialist agents  → 2–4 max per task, fetched on demand
```

**Never bulk-load all agents.** AI attention is scarce. The conductor selects the right 2–4 agents per task.

All agents fetched from:
`https://raw.githubusercontent.com/tdaniel1925/codebakers-system/master/agents/[tier]/[agent].md`

| Tier | Agents |
|------|--------|
| `meta/` | conductor, research, code-review, api-docs, migration-assistant, seed-data |
| `core/` | auth, qa, devops, error-handling, security, backend, database |
| `features/` | onboarding, analytics, i18n, ui-components, forms, dashboard |
| `integrations/` | stripe, resend, vapi, storage |
| `industries/` | legal, insurance, healthcare, accounting |
| `compliance/` | hipaa, gdpr, soc2 |

Full registry: fetch `MANIFEST.md` from repo root.

---

## If GitHub Is Unreachable

Fall back to CODEBAKERS.md standards only. Retry on next message. Never block the user entirely.

---

## Commands

| Command | Action |
|---------|--------|
| `@conductor` | Force-load the conductor agent |
| `@agent [name]` | Load a specific agent by name |
| `@status` | Show active agents, session progress |
| `@handoff` | Generate handoff doc now |
| `@explain` | Explain the last decision made |
| `@standards` | Show CODEBAKERS.md summary |

---

*V2 — 41 improvements. Read the conductor to see them all.*
