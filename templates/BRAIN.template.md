# Project Brain — [APP NAME]
Created: [DATE] | Last updated: [DATE] | Session: 001

> This file is read at the start of every session. Keep it accurate. Update it after every significant decision or state change.

---

## What This App Is

[One paragraph. What does it do? Who uses it? What problem does it solve?]

---

## Core Entities

[List the main data models with one-line descriptions]

- **[Entity]:** [what it represents]
- **[Entity]:** [what it represents]

---

## Architecture Decisions (Permanent)

Decisions that affect the entire codebase and cannot be changed without major refactoring.

- **Auth:** Supabase Auth — [providers configured]
- **Database:** Supabase PostgreSQL
- **Deployment:** Vercel (frontend) + [worker host if applicable]
- **Email sync:** [Nylas / MS Graph / none] — [approach]
- **Background jobs:** [BullMQ on Railway / pg_cron / none]
- **Multi-tenant:** [yes/no] — [isolation approach]

---

## Known Patterns In This Codebase

Things discovered during the build that differ from CodeBakers defaults. Future sessions read this first to avoid relearning.

[Empty at start — append as patterns are discovered]

Example entries:
- Ownership column is 'created_by' not 'user_id' (learned session 002)
- Delta cursor stored as 'sync_cursor' not 'delta_token' (learned session 001)
- Server actions are in src/lib/actions/ not src/app/ (project convention)

---

## Current Build State

| Feature | Status | Notes |
|---------|--------|-------|
| Auth + onboarding | [not started / in progress / complete] | |
| [Feature 2] | [not started / in progress / complete] | |
| [Feature 3] | [not started / in progress / complete] | |

---

## Fix Queue Status

- Total fixes identified: [N]
- Completed: [N]
- Remaining: [N]
- Last fix applied: [FIX-NNN — description]

---

## External Services Status

| Service | Purpose | Credentials | Status |
|---------|---------|-------------|--------|
| [Supabase] | Database/Auth | In .env.local | ✓ Connected |
| [Nylas] | Email sync | Needed — see CREDENTIALS-NEEDED.md | ○ Pending |

---

## What The Next Session Should Start With

[Updated at end of every session]

Example: "Continue from FIX-019. Matter tagging UI needs the tag selector wired to the server action. Auth and sync are complete. Run tsc --noEmit first — should be clean."
