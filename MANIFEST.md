# CodeBakers Agent Manifest V2

> Complete registry of all agents, templates, and system files. The conductor reads this to route tasks and load agents.

**Base URL:** `https://raw.githubusercontent.com/botmakers-ai/codebakers-v2/main/`

---

## System Statistics

| Metric | Count |
|--------|-------|
| Total Agents | 83 |
| Agent Tiers | 9 |
| Code Templates | 20 |
| Design Token Presets | 4 |
| Report Templates | 4 |
| Learning System Files | 3 |
| Root System Files | 8 |

---

## Agent Loading Rule

**Load 2–4 agents per task maximum.** Never bulk-load all agents. The conductor selects the right agents based on task triggers.

Fetch path: `agents/[tier]/[filename].md`

---

## Tier: meta (11 agents)

Session management, orchestration, research, review, and tooling agents. Conductor loads relevant meta agents at session start.

| # | Agent | File | Triggers | Depends On |
|---|-------|------|----------|-----------|
| 1 | Conductor | `agents/meta/conductor.md` | startup, session, begin, orchestrate, manage, lead | — |
| 2 | Research | `agents/meta/research.md` | research, investigate, best practice, compare, package, evaluate, before building | — |
| 3 | Code Review | `agents/meta/code-review.md` | review, code review, quality, refactor, maintainability, readability, naming, duplication | — |
| 4 | API Documentation | `agents/meta/api-docs.md` | api docs, openapi, swagger, document api, api reference, endpoint docs | — |
| 5 | Migration Assistant | `agents/meta/migration-assistant.md` | migration, migrate, legacy, existing codebase, technical debt, audit codebase | — |
| 6 | Seed Data | `agents/meta/seed-data.md` | seed, seed data, test data, fake data, demo data, fixtures, realistic data, populate database | — |
| 7 | Reviewer | `agents/meta/reviewer.md` | review, code review, audit code, check my work, critical issues, security review, dead code | — |
| 8 | Doctor | `agents/meta/doctor.md` | fix this, broken, not working, keeps happening, hydration error, bug won't go away, same error, diagnose, root cause, doozey, can't figure out, stuck, back and forth | — |
| 9 | Persistence Specialist | `agents/meta/persistence.md` | save where we are, don't lose this, context is full, save progress, write down what we tried, new session, losing context, about to compact | — |
| 10 | War Room | `agents/meta/war-room.md` | major issue, war room, open war room, multi-session bug, this is going to take a while, escalate, doctor failed, still broken after fix, can't crack this | `meta/doctor.md`, `meta/persistence.md` |
| 12 | Pre-Launch Specialist | `agents/meta/pre-launch.md` | going live, launch, pre-launch, production ready, ready to deploy, before we launch, production checklist, ship it, going to production, is this ready | `core/auth.md`, `core/qa.md`, `core/devops.md` |
| 13 | Audit Agent | `agents/meta/audit-agent.md` | run audit, audit this, audit codebase, generate audit report, what went wrong, analyze this app, review this codebase, audit mode | — |
| 14 | Design Review | `agents/meta/design-review.md` | design review, ui review, visual feedback, accessibility check, ux review | — |
| 8 | Estimation | `agents/meta/estimation.md` | estimate, timeline, effort, story points, sprint planning, scope | — |
| 9 | Metrics | `agents/meta/metrics.md` | metrics, kpis, business metrics, performance indicators, measurement | — |
| 10 | Monitoring Setup | `agents/meta/monitoring-setup.md` | monitoring, alerting, sentry, uptime, observability, logging setup | — |
| 11 | Report Generator | `agents/meta/report-generator.md` | report, generate report, status report, client report, project summary | — |

---

## Tier: core (11 agents)

Core engineering agents. Every project uses several of these.

| # | Agent | File | Triggers | Depends On |
|---|-------|------|----------|-----------|
| 12 | System Architect | `agents/core/architect.md` | architecture, system design, tech stack, project structure, monorepo, decisions | — |
| 13 | Auth Specialist | `agents/core/auth.md` | auth, login, signup, oauth, google login, github login, rbac, role, permission, session, mfa, magic link, invite | `core/database.md`, `core/security.md` |
| 14 | Backend Engineer | `agents/core/backend.md` | api routes, server actions, backend, next.js api, edge functions, middleware, server | — |
| 15 | Database Engineer | `agents/core/database.md` | database schema, postgresql, supabase tables, data modeling, migrations, indexes, rls | — |
| 16 | DevOps Engineer | `agents/core/devops.md` | deploy, ci/cd, github actions, vercel, environment, env vars, preview, staging, production, deploy error, build failed | `core/security.md` |
| 17 | Error Handling | `agents/core/error-handling.md` | error, error handling, error boundary, toast, retry, fallback, validation, 404, 500, error page | — |
| 18 | Frontend Engineer | `agents/core/frontend.md` | components, react, tsx, client component, hooks, state, props, ui, layout | — |
| 19 | Performance Engineer | `agents/core/performance.md` | page speed, lighthouse, caching, lazy loading, bundle size, core web vitals, optimization | — |
| 20 | QA Engineer | `agents/core/qa.md` | test, testing, qa, unit test, integration test, e2e, playwright, vitest, coverage, regression | — |
| 21 | Security Engineer | `agents/core/security.md` | security, owasp, csrf, xss, rate limiting, input sanitization, content security policy, encryption | `core/auth.md` |
| 22 | UX Engineer | `agents/core/ux.md` | ux, user experience, wireframe, user flow, interaction design, usability, accessibility | — |

---

## Tier: features (15 agents)

Feature-level agents that add specific capabilities to any project.

| # | Agent | File | Triggers | Depends On |
|---|-------|------|----------|-----------|
| 23 | Analytics | `agents/features/analytics.md` | analytics, tracking, events, user behavior, conversion, funnel, posthog, mixpanel, pageview | — |
| 24 | Billing & Subscriptions | `agents/features/billing.md` | stripe, payments, subscriptions, invoices, pricing plans, checkout, metered billing | `core/auth.md` |
| 25 | CMS | `agents/features/cms.md` | content management, cms, blog, articles, pages, rich text, markdown, headless cms | — |
| 26 | Dashboard | `agents/features/dashboard.md` | admin dashboard, overview page, stats cards, activity feed, quick actions, kpis | — |
| 27 | Data Tables | `agents/features/data-tables.md` | table view, sortable columns, pagination, bulk actions, data grid, tanstack table | — |
| 28 | Email System | `agents/features/email.md` | transactional email, email templates, resend, email notifications, drip | `core/backend.md` |
| 29 | File & Media | `agents/features/file-media.md` | file upload, document storage, supabase storage, image upload, pdf upload, media | `core/backend.md`, `core/security.md` |
| 30 | Forms & Wizards | `agents/features/forms-wizards.md` | form builder, multi-step form, validation, react-hook-form, zod, wizard | — |
| 31 | i18n | `agents/features/i18n.md` | i18n, internationalization, localization, multi-language, translation, locale, rtl | — |
| 32 | Maps | `agents/features/maps.md` | maps, geolocation, google maps, mapbox, location, address autocomplete, geocoding | — |
| 33 | Notifications | `agents/features/notifications.md` | push notifications, in-app notifications, notification preferences, bell icon, toast | `core/auth.md` |
| 34 | Onboarding | `agents/features/onboarding.md` | onboarding, first time, welcome, setup wizard, empty state, new user, getting started, tooltips | — |
| 35 | Realtime | `agents/features/realtime.md` | websockets, realtime updates, live data, supabase realtime, presence, collaboration | `core/database.md` |
| 36 | Scheduling | `agents/features/scheduling.md` | calendar, appointments, booking, time slots, availability, recurring events | `core/auth.md` |
| 37 | Search | `agents/features/search.md` | full-text search, search bar, filters, faceted search, typeahead, algolia | `core/database.md` |

---

## Tier: ai (6 agents)

AI and ML capability agents.

| # | Agent | File | Triggers | Depends On |
|---|-------|------|----------|-----------|
| 38 | Chatbot | `agents/ai/chatbot.md` | chatbot, ai chat, conversational ui, chat interface, assistant, llm chat | `core/backend.md` |
| 39 | Document AI | `agents/ai/document-ai.md` | document parsing, ocr, pdf extraction, contract analysis, document classification | `features/file-media.md` |
| 40 | Prompt Engineer | `agents/ai/prompt-engineer.md` | prompt engineering, system prompt, llm, claude api, openai, prompt design | — |
| 41 | RAG | `agents/ai/rag.md` | rag, retrieval augmented generation, vector search, embeddings, pgvector, knowledge base | `core/database.md` |
| 42 | Voice AI | `agents/ai/voice-ai.md` | voice, vapi, voice agent, phone calls, speech, voice assistant, telephony | `core/backend.md` |
| 43 | Workflow Automation | `agents/ai/workflow-automation.md` | automation, triggers, actions, workflow builder, conditional logic, task queue | `core/backend.md`, `core/database.md` |

---

## Tier: integrations (9 agents)

Third-party service connectors.

| # | Agent | File | Triggers | Depends On |
|---|-------|------|----------|-----------|
| 44 | CRM Integrations | `agents/integrations/crm.md` | crm, hubspot, salesforce connector, contact sync, lead sync | `core/auth.md` |
| 45 | Google Workspace | `agents/integrations/google-workspace.md` | google calendar, google drive, gmail api, google oauth, google sheets | `core/auth.md` |
| 46 | Microsoft 365 | `agents/integrations/microsoft-365.md` | outlook, microsoft graph, teams, sharepoint, onedrive, azure ad | `core/auth.md` |
| 47 | QuickBooks | `agents/integrations/quickbooks.md` | quickbooks, accounting sync, invoice sync, quickbooks online, financial data | `core/auth.md`, `features/billing.md` |
| 48 | Salesforce | `agents/integrations/salesforce.md` | salesforce crm, salesforce sync, leads, opportunities, salesforce api | `core/auth.md` |
| 49 | Slack | `agents/integrations/slack.md` | slack bot, slack notifications, slack commands, slack oauth, channel messages | `core/auth.md` |
| 50 | SMS & WhatsApp | `agents/integrations/sms-whatsapp.md` | twilio, sms notifications, whatsapp messaging, text messages, phone verification | `core/backend.md` |
| 51 | Webhooks | `agents/integrations/webhooks.md` | incoming webhooks, outgoing webhooks, webhook verification, event processing | `core/backend.md`, `core/security.md` |
| 52 | Zapier & Make | `agents/integrations/zapier-make.md` | zapier integration, make.com, automation platform, no-code integration, triggers | `integrations/webhooks.md` |

---

## Tier: industries (9 agents)

Domain-specific agents with industry knowledge and patterns.

| # | Agent | File | Triggers | Depends On |
|---|-------|------|----------|-----------|
| 53 | Accounting | `agents/industries/accounting.md` | bookkeeping, tax preparation, client portal, financial reports, cpa, general ledger | `core/auth.md`, `integrations/quickbooks.md` |
| 54 | E-Commerce | `agents/industries/ecommerce.md` | product catalog, shopping cart, checkout, orders, inventory, storefront | `core/auth.md`, `features/billing.md` |
| 55 | Education | `agents/industries/education.md` | lms, courses, students, assignments, grading, enrollment, classroom | `core/auth.md`, `core/database.md` |
| 56 | Healthcare | `agents/industries/healthcare.md` | patient portal, hipaa, medical records, appointments, telehealth, ehr | `core/auth.md`, `core/security.md`, `features/scheduling.md` |
| 57 | Insurance | `agents/industries/insurance.md` | insurance claims, policy management, underwriting, claims processing, coverage | `core/auth.md`, `core/database.md` |
| 58 | Legal | `agents/industries/legal.md` | law firm, case management, legal documents, client intake, matter tracking, court deadlines | `core/auth.md`, `core/database.md`, `ai/document-ai.md` |
| 59 | Nonprofit | `agents/industries/nonprofit.md` | donations, donor management, campaigns, fundraising, volunteer tracking, grants | `core/auth.md`, `features/billing.md` |
| 60 | Real Estate | `agents/industries/realestate.md` | property listings, mls, showings, real estate crm, property management, lease | `core/auth.md`, `core/database.md` |
| 61 | SaaS Platform | `agents/industries/saas.md` | multi-tenant, saas, subscription app, tenant isolation, usage tracking, plan limits | `core/auth.md`, `features/billing.md`, `features/analytics.md` |

---

## Tier: compliance (5 agents)

Regulatory and accessibility compliance agents.

| # | Agent | File | Triggers | Depends On |
|---|-------|------|----------|-----------|
| 62 | ADA / WCAG | `agents/compliance/ada-wcag.md` | accessibility, wcag, ada, screen reader, aria, keyboard navigation, color contrast | — |
| 63 | GDPR | `agents/compliance/gdpr.md` | gdpr, data privacy, consent, right to erasure, data retention, eu privacy | `core/auth.md`, `core/database.md` |
| 64 | HIPAA | `agents/compliance/hipaa.md` | hipaa, phi, protected health information, healthcare compliance, audit logging | `core/security.md`, `core/database.md` |
| 65 | PCI | `agents/compliance/pci.md` | pci, payment card, credit card security, pci-dss, cardholder data | `core/security.md`, `features/billing.md` |
| 66 | SOC 2 | `agents/compliance/soc2.md` | soc2, soc 2, trust service criteria, audit, security controls, compliance | `core/security.md` |

---

## Tier: infrastructure (7 agents)

Advanced infrastructure and scaling agents. Use for production-grade systems.

| # | Agent | File | Triggers | Depends On |
|---|-------|------|----------|-----------|
| 67 | Background Jobs | `agents/infrastructure/background-jobs.md` | background jobs, queue, cron, scheduled tasks, job processor, worker | `core/database.md` |
| 68 | Caching | `agents/infrastructure/caching.md` | caching, redis, cache invalidation, cdn, edge cache, memoization | `core/backend.md` |
| 69 | CI/CD Advanced | `agents/infrastructure/ci-cd.md` | advanced ci/cd, deployment strategy, blue-green, canary, release management | `core/devops.md` |
| 70 | Database Scaling | `agents/infrastructure/database-scaling.md` | database scaling, read replicas, connection pooling, pgbouncer, partitioning | `core/database.md` |
| 71 | Edge Computing | `agents/infrastructure/edge-computing.md` | edge functions, edge runtime, cloudflare workers, vercel edge, global distribution | `core/backend.md` |
| 72 | Monitoring | `agents/infrastructure/monitoring.md` | monitoring, alerting, sentry, datadog, logging, observability, tracing | — |
| 73 | Rate Limiting | `agents/infrastructure/rate-limiting.md` | rate limiting, throttling, api quotas, abuse prevention, token bucket | `core/backend.md`, `core/security.md` |

---

## Tier: migration (4 agents)

Codebase and data migration agents. Use when bringing existing projects into CodeBakers.

| # | Agent | File | Triggers | Depends On |
|---|-------|------|----------|-----------|
| 74 | API Versioning | `agents/migration/api-versioning.md` | api versioning, breaking changes, version strategy, deprecation, backwards compatible | `core/backend.md` |
| 75 | Codebase Migration | `agents/migration/codebase-migration.md` | migrate codebase, pages router to app router, next.js upgrade, framework migration | — |
| 76 | Database Migration | `agents/migration/database-migration.md` | database migration, migrate data, schema change, zero downtime, data transformation | `core/database.md` |
| 77 | Legacy Modernization | `agents/migration/legacy-modernization.md` | modernize, legacy code, technical debt, refactor plan, old codebase | — |

---

## Code Templates (20)

Production-ready TypeScript implementations. Fetch from `templates/code/[filename]`.

| # | Template | File | Description |
|---|----------|------|-------------|
| 1 | Google Calendar Sync | `templates/code/google-calendar-sync.ts` | Two-way Google Calendar sync with conflict resolution |
| 2 | Google Drive Upload | `templates/code/google-drive-upload.ts` | File upload to Google Drive with folder management |
| 3 | PDF Generation | `templates/code/pdf-generation.ts` | Server-side PDF generation with custom layouts |
| 4 | pgvector Search | `templates/code/pgvector-search.ts` | Vector similarity search using pgvector in Supabase |
| 5 | QuickBooks Invoice Sync | `templates/code/quickbooks-invoice-sync.ts` | Two-way invoice sync with QuickBooks Online via OAuth2 |
| 6 | RAG Pipeline | `templates/code/rag-pipeline.ts` | Retrieval-augmented generation pipeline with embeddings |
| 7 | Resend Transactional | `templates/code/resend-transactional.ts` | Transactional email sending via Resend with templates |
| 8 | Slack Bot Handler | `templates/code/slack-bot-handler.ts` | Slack bot with slash commands and event subscriptions |
| 9 | Stripe Customer Portal | `templates/code/stripe-customer-portal.ts` | Stripe customer portal for subscription self-management |
| 10 | Stripe Subscription Flow | `templates/code/stripe-subscription-flow.ts` | Full subscription creation with trial and upgrade/downgrade |
| 11 | Stripe Webhook Handler | `templates/code/stripe-webhook-handler.ts` | Stripe webhook processor with signature verification |
| 12 | Supabase Realtime Channel | `templates/code/supabase-realtime-channel.ts` | Realtime presence and broadcast with Supabase channels |
| 13 | Twilio SMS Handler | `templates/code/twilio-sms-handler.ts` | Send/receive SMS via Twilio with delivery tracking |
| 14 | Twilio WhatsApp | `templates/code/twilio-whatsapp.ts` | WhatsApp Business messaging with template support |
| 15 | VAPI Assistant Config | `templates/code/vapi-assistant-config.ts` | VAPI voice assistant configuration and setup |
| 16 | VAPI Call Handler | `templates/code/vapi-call-handler.ts` | VAPI inbound/outbound call management |
| 17 | VAPI Webhook | `templates/code/vapi-webhook.ts` | VAPI webhook processor for call events |
| 18 | Webhook Receiver | `templates/code/webhook-receiver.ts` | Generic incoming webhook handler with signature verification |
| 19 | Webhook Sender with Retry | `templates/code/webhook-sender-with-retry.ts` | Outgoing webhook dispatcher with exponential backoff |
| 20 | Workflow Engine | `templates/code/workflow-engine.ts` | Multi-step workflow engine with conditional branching |

---

## Design Token Presets (4)

Industry-specific CSS token overrides. Drop into `styles/tokens.css` to switch the full design theme.

| # | Preset | File | Use For |
|---|--------|------|---------|
| 1 | Corporate | `templates/design/tokens-corporate.css` | Professional services, enterprise SaaS, B2B tools |
| 2 | Healthcare | `templates/design/tokens-healthcare.css` | Medical apps, patient portals, health platforms |
| 3 | Legal | `templates/design/tokens-legal.css` | Law firms, legal tech, case management systems |
| 4 | SaaS | `templates/design/tokens-saas.css` | Consumer SaaS, startup tools, developer products |

---

## Report Templates (4)

Client-ready report formats. Fetch from `templates/reports/[filename]`.

| # | Template | File | Use For |
|---|----------|------|---------|
| 1 | Audit Report | `templates/reports/audit-report.md` | Security audits, compliance reviews, code quality assessments |
| 2 | Deployment Summary | `templates/reports/deployment-summary.md` | Post-deploy summaries for clients and stakeholders |
| 3 | Project Proposal | `templates/reports/project-proposal.md` | Scoping documents, statements of work, project bids |
| 4 | Status Update | `templates/reports/status-update.md` | Weekly/monthly client progress reports |

---

## Learning System (3 files)

Agent improvement and performance tracking. Located in `metrics/`.

| # | File | Path | Purpose |
|---|------|------|---------|
| 1 | Agent Improvement Workflow | `metrics/agent-improvement-workflow.md` | Process for identifying and implementing agent improvements |
| 2 | Metrics Dashboard Schema | `metrics/metrics-dashboard-schema.md` | Schema for tracking agent performance and usage metrics |
| 3 | Team Learning Protocol | `metrics/team-learning-protocol.md` | How lessons learned are captured and distributed across the system |

---

## Root System Files (8)

| # | File | Purpose |
|---|------|---------|
| 1 | `CLAUDE.md` | Session router and startup protocol — the only file in user projects |
| 2 | `CODEBAKERS.md` | Universal code standards — loaded by every agent |
| 3 | `MANIFEST.md` | This file — complete system registry |
| 4 | `AGENT-TEMPLATE.md` | Blank template for creating new agents |
| 5 | `CONVENTIONS.md` | Naming and structural conventions reference |
| 6 | `DESIGN-TOKENS.md` | Master token system documentation |
| 7 | `PROJECT-SPEC.md` | Gates 0-5 specification template |
| 8 | `project-profile.template.md` | Starter template for per-project profile files |

---

## Dependency Graph

```
┌──────────────────────────────────────────────────────────────┐
│                      meta agents                             │
│  conductor · research · code-review · api-docs               │
│  migration-assistant · seed-data · design-review · etc.      │
│  (session management — loaded by conductor as needed)        │
└───────────────────────────┬──────────────────────────────────┘
                            │ orchestrates
                            ▼
┌──────────────────────────────────────────────────────────────┐
│               industries + compliance                        │
│  legal · insurance · healthcare · accounting · saas          │
│  ecommerce · nonprofit · realestate · education              │
│  gdpr · hipaa · pci · soc2 · ada-wcag                        │
└──────────┬───────────────────────────┬────────────────────────┘
           │ depend on                 │ depend on
           ▼                           ▼
┌──────────────────┐       ┌──────────────────────────────────┐
│  integrations    │       │  features                        │
│  google · ms365  │       │  billing · email · analytics     │
│  salesforce ·    │       │  onboarding · i18n · search      │
│  quickbooks ·    │       │  dashboard · forms · scheduling  │
│  slack · twilio  │       │  notifications · realtime        │
│  webhooks        │       │  file-media · maps · cms         │
└──────────┬───────┘       └──────────────┬───────────────────┘
           │ depend on                    │ depend on
           └──────────────┬───────────────┘
                          ▼
┌──────────────────────────────────────────────────────────────┐
│                    core agents                               │
│  architect · auth · backend · database · devops              │
│  error-handling · frontend · performance · qa · security     │
│  ux                                                          │
└──────────────────────────────────────────────────────────────┘
                          │ supported by
                          ▼
┌──────────────────────────────────────────────────────────────┐
│              infrastructure + ai + migration                 │
│  background-jobs · caching · ci-cd · database-scaling        │
│  edge-computing · monitoring · rate-limiting                 │
│  chatbot · document-ai · prompt-engineer · rag · voice-ai    │
│  workflow-automation                                         │
│  api-versioning · codebase-migration · db-migration          │
│  legacy-modernization                                        │
└──────────────────────────────────────────────────────────────┘
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-02 | Initial release — 47 agents across 5 tiers, 8 templates |
| 2.0.0 | 2025-06 | V2 upgrade — 77 agents across 9 tiers, 20 templates, 41 improvements. Added conductor, research, code-review, api-docs, migration-assistant, seed-data to meta tier. Added error-handling to core tier. Added onboarding, i18n, analytics to features tier. Updated auth (Supabase Auth only), qa (Vitest + Playwright enforcement), devops (deploy error fix loop), CODEBAKERS (locked stack, version pinning, .env.example, git discipline). |
| 3.0.0 | 2026-03 | V3 upgrade — 5 new agents, 30 new rules across 10 agents. New agents: `meta/ui-smoke`, `meta/integration-verify`, `meta/rebuild-specialist`, `integrations/nylas`, `integrations/sync-resilience`. Updated agents: auth (atomic creation, mutation double-filter, HOF wrapper), database (maybeSingle, schema-first types, RLS subselect, storage RLS), security (raw SQL ban, IDOR protection), backend (Zod type source, bulk Promise.all, HOF wrapper), qa (17-point gate, coverage thresholds, built-app E2E, real Supabase), frontend (data-testid required, bounded polling), realtime (polling-first architecture), background-jobs (BullMQ Redis separation, worker process requirements, graceful shutdown), microsoft-365 (delta token handling, 410 Gone, deltaLink vs skipToken), audit-deps (Sentry/Next.js conflict, Nylas v2 in v3, ioredis dual client, BullMQ maxRetriesPerRequest). CLAUDE.md updated with V3 hard rules and all branch/URL references corrected to `main`. |

---

## V3 New Agents

| Agent | Tier | Triggers |
|-------|------|---------|
| `meta/ui-smoke` | meta | smoke test, generate tests, test all pages, playwright smoke |
| `meta/integration-verify` | meta | integration test, cross-feature test, verify integration, feature handoff |
| `meta/rebuild-specialist` | meta | rebuild, broken app, codebase rescue, nothing works, audit and rebuild |
| `integrations/nylas` | integrations | nylas, nylas email, nylas calendar, nylas v3, email sync nylas |
| `integrations/sync-resilience` | integrations | sync resilience, sync state machine, sync recovery, webhook fallback, sync health |
| 4.0.0 | 2026-03 | V4 upgrade — merged V3+V4 into single autonomous framework. New agents: `meta/interview` (only human moment — generates FLOWS.md + BRAIN.md), `meta/fix-queue-builder` (classifies and orders all issues for autonomous fixing), `meta/fix-executor` (autonomous self-healing loop — never stops, error is information), `meta/completeness-verifier` (verifies features work for real users against FLOWS.md). New templates: `BRAIN.template.md`. New project files: `.codebakers/BRAIN.md`, `.codebakers/BUILD-LOG.md`, `.codebakers/ERROR-LOG.md`, `.codebakers/FIX-QUEUE.md`, `.codebakers/FIXES-APPLIED.md`, `.codebakers/ASSUMPTIONS.md`, `.codebakers/CREDENTIALS-NEEDED.md`. Updated: `CLAUDE.md` (complete rewrite — identity, belief system, autonomous loop, memory system), `conductor.md` (V4 auto-chaining: QA fail→fix, feature complete→completeness check, 2 features→integration verify, 3 features→reviewer, build complete→pre-launch — all automatic), `qa.md` (auto-fix companion table for every gate check). Core principle: after interview, system is fully autonomous. The only output is working, verified, production-ready software. |

---

## V4 New Agents

| Agent | Tier | Triggers |
|-------|------|---------|
| `meta/interview` | meta | new project, start project, interview, what are we building |
| `meta/fix-queue-builder` | meta | fix queue, classify issues, prioritize fixes, what needs fixing |
| `meta/fix-executor` | meta | fix, auto-fix, fix everything, run fixes, self-heal, repair |
| `meta/completeness-verifier` | meta | completeness, verify feature, does this work, user flow check, is this done |

## V4 Auto-Chain Sequence

```
Interview → FLOWS.md + BRAIN.md initialized
  ↓
Build agents execute (conductor orchestrates from FLOWS.md)
  ↓ after every feature
Completeness Verifier → gaps? → Fix Executor
  ↓ after every 2 features  
Integration Verifier
  ↓ after every 3 features
Reviewer → issues? → Fix Executor
  ↓ build complete
Pre-Launch Checklist → gaps? → Fix Executor
  ↓ all passing
FIXES-APPLIED.md + CREDENTIALS-NEEDED.md → done
```
