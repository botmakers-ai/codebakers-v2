# CodeBakers Suggestions — Complete Content Summary

This document captures 23 critical patterns and lessons from the EaseMail build, organized as actionable framework improvements for Claude Code.

## Core Categories

**Database & Infrastructure (Items 1-3)**
- Prisma + Supabase requires `DIRECT_URL` (port 5432), not pooler connection
- Turbopack cache corruption needs detection and recovery scripts
- Environment variable changes require dev server restart (no hot-reload)

**Frontend Patterns (Items 4, 7-8, 14)**
- SSR-safe imports: libraries accessing `window`/`document` need lazy loading
- Pagination state tracking in infinite scroll components
- Error component stubs (returning `null`) hide user feedback
- Display context awareness: sender vs. recipient fields change by folder type

**Authentication & OAuth (Items 5-6, 17-19)**
- Supabase user sync should use ID lookup, not list scans
- External OAuth token caching must tie to user ID
- MSAL scope conflicts cause token cache poisoning when mixing mail + Teams scopes
- Incremental consent flows enable adding scopes without forcing reconnection
- Admin-consent scopes (`.All` suffixes) require tenant admin approval, not user approval

**API Integration (Items 12-13, 15-16, 22)**
- Third-party API field names (e.g., `sentDateTime` vs. `receivedDateTime`) require verification
- `$filter` + `$orderby` incompatibilities return silent failures
- Account-scoped resource IDs need redirect handling on account switch
- Search scope should inherit from UI context, not default globally
- Search should query local cache first before hitting external APIs

**UX & Navigation (Items 9, 21)**
- Dev server port conventions should be documented; include kill scripts
- Post-action navigation should use `router.back()` to preserve context

**AI Integration (Item 20)**
- System prompts should contain persona; user messages contain tasks
- Domain context in system prompts significantly improves output quality

**Access Control (Item 23)**
- Single-tenant apps use environment variable gates
- Multi-tenant apps require database-driven access control per organization

**Process Gap (Item 11)**
- BUILD-LOG.md updates were deferred and forgotten; should be part of commit step, not separate
