# CodeBakers Method
## The AI-First Software Development Framework

**Version 1.0 — March 2026**  
**Authored by BotMakers Inc.**

> Designed for: Solo AI-assisted developers • Small dev teams (2–5) • Non-technical founders • Freelancers & agencies

---

## 1. The Problem This Solves

Every major software development methodology — Agile, Scrum, Shape Up, Lean, TDD — was designed for teams of human engineers writing code by hand. None of them account for the reality of building production-grade software with AI as the primary builder.

The result is that most AI-assisted builders operate without any standardized process. They start coding before thinking, build backends before designing UIs, invent database schemas before knowing what data the product actually needs, and accumulate technical debt from the very first session.

> **The Core Gap:** Existing methodologies assume humans write code. The CodeBakers Method assumes AI writes code and humans architect, direct, and verify it. This is a fundamentally different operating model that requires its own framework.

Specifically, the CodeBakers Method addresses these recurring failure patterns:

- Building backend and database schema before the UI is designed, resulting in tables for features that get cut
- Starting AI build sessions without sufficient context, causing the AI to make incorrect assumptions
- No standardized handoff between build phases, causing context loss and contradictions between stages
- Schema drift — database structure diverges from what the application actually uses over time
- No separation between UI verification and functional verification, causing bugs to compound
- Deploying without a defined ops baseline, leading to production incidents that are hard to trace

---

## 2. What Is The CodeBakers Method

The CodeBakers Method is a structured, phase-gated software development framework purpose-built for AI-assisted development. It standardizes the journey from initial idea to deployed, production-ready software across seven sequential phases, with defined artifacts, verification gates, and AI operating instructions at each stage.

The method is grounded in three foundational beliefs:

1. **Specification precedes everything.** You cannot build what you have not defined.
2. **The UI is the source of truth for data modeling.** Mockups reveal schema requirements more accurately than upfront design sessions.
3. **AI is the builder, humans are the architects.** The human's job is to think, decide, verify — not to write code.

> **One-Line Definition:** The CodeBakers Method is a spec-first, mockup-driven, AI-executed development framework that produces production-ready software through seven verified phases with no open-ended scope.

---

## 3. Core Principles

Every decision in the CodeBakers Method is governed by seven non-negotiable principles. These are not guidelines — they are constraints. A process that violates any one of them is no longer operating within the CodeBakers Method.

### P1 — Spec First, Always
No code is written — by a human or by AI — until a complete `PROJECT-SPEC.md` has been approved. The spec is not a living document during the build. Changes to scope require a formal spec amendment before any build resumes.

### P2 — Mockups Before Schema
UI mockups are built and approved before any database schema is designed. The data model is derived from what the UI actually displays and manipulates, not from abstract planning. This eliminates unused tables and missing fields.

### P3 — One Phase At A Time
Each of the seven phases is completed and verified before the next begins. There is no parallel execution of phases. A failed verification gate stops the build until the issue is resolved. You never proceed on a broken foundation.

### P4 — Fresh Context Per Phase
Each phase runs in a new AI session initialized with `BUILD-STATE.md`. AI does not carry memory across sessions. This is a feature, not a bug — it forces all context to be explicit, documented, and version-controlled.

### P5 — Derive, Don't Invent
Schema, APIs, and component contracts are derived from existing artifacts (mockups, specs, previous phases). The AI never makes assumptions about data structure or business logic. If it's not in the spec or the mockup, it doesn't get built.

### P6 — Verify Before Ship
Every phase produces a defined verification checklist. A phase is not complete until every item on its checklist passes. Verification is not optional and cannot be skipped to meet a deadline.

### P7 — Fixed Appetite, Not Open Scope
Every feature and phase has a defined scope boundary. If a feature cannot be completed within its defined phase, it is either descoped or moved to a future iteration. Scope creep is treated as a build failure.

---

## 4. The Seven Phases

| Phase | Name | Primary Output | AI Role |
|-------|------|----------------|---------|
| Phase 0 | Domain Research & Spec | PROJECT-SPEC.md | Research assistant |
| Phase 1 | UI Mockup & Design | Mockup files + Style guide | UI builder |
| Phase 2 | Mock Analysis & Schema | Schema + Dependency map | Analyst & modeler |
| Phase 3 | Foundation Build | Project scaffold + Auth | Primary builder |
| Phase 4 | Feature Build | All application features | Primary builder |
| Phase 5 | Testing & Verification | Test suite + Bug fixes | QA engineer |
| Phase 6 | Deployment & Ops | Live deployment + Runbook | DevOps engineer |

---

### Phase 0 — Domain Research & Specification

The foundational phase. No project begins without it. The human defines the problem, audience, and success criteria. The AI conducts competitive research, decomposes features to atomic components, maps technical dependencies, and produces a Gates 0–5 `PROJECT-SPEC.md`.

**Gates 0–5 Structure:**
- **Gate 0 — Identity:** Product name, mission, target user, core value proposition
- **Gate 1 — Entities:** All data objects the system must track
- **Gate 2 — State Changes:** Every action that mutates data
- **Gate 3 — Permissions:** Who can do what, role matrix
- **Gate 4 — Dependencies:** External services, APIs, automation flows
- **Gate 5 — Integrations:** Third-party connections, webhooks, data sync

> ✅ **Verification Gate:** `PROJECT-SPEC.md` is complete through all 6 gates. Feature list is atomically decomposed. All external dependencies are identified. Human has reviewed and approved the spec before Phase 1 begins.

---

### Phase 1 — UI Mockup & Design System

Every screen in the application is built as a high-fidelity static mockup with realistic dummy data. No database. No API calls. Pure UI. The design system is locked in this phase and cannot change in later phases without a Phase 1 amendment.

- All screens and states (empty, loading, error, filled) are mocked
- Navigation flows between screens are mapped
- Responsive behavior is defined (mobile-first)
- Reusable component inventory is documented
- Accessibility requirements (WCAG AA) are applied

> ✅ **Verification Gate:** Every screen in the spec has a corresponding mockup. All interactive states are represented. Design system tokens are documented. Human has reviewed and approved all screens before Phase 2 begins.

---

### Phase 2 — Mock Analysis, Schema Generation & Dependency Mapping

This is the phase that makes the CodeBakers Method unique. Rather than designing a database schema abstractly, the AI systematically analyzes every mockup to extract all data displayed, forms submitted, filters applied, and relationships implied. The schema is generated directly from this analysis.

#### 2A — Mock Analysis
For each mockup screen, the AI produces a structured analysis covering:
- All data fields displayed and their data types
- All form inputs and the entity they mutate
- All filters, sorts, and search parameters
- All computed or aggregated values (counts, totals, percentages)
- All relationships between entities implied by the UI
- All status values and state machines visible in the design

#### 2B — Schema Generation
From the mock analysis, the AI generates a complete database schema including:
- All tables with full column definitions (name, type, nullable, default, constraints)
- All foreign key relationships and join tables
- All indexes required for the query patterns revealed by the mockups
- All enum types and value sets
- Row-level security policies where applicable
- Seed data requirements for development

#### 2C — Dependency Mapping
The AI produces a complete dependency map covering:
- All npm/pip packages required with version pins
- All external services and APIs with authentication methods
- All environment variables required with descriptions
- All background jobs and scheduled tasks
- All real-time or webhook event flows
- Build and deployment dependencies

> ✅ **Verification Gate:** Every data field in every mockup has a corresponding database column. All entity relationships are captured. Dependency map is complete. Schema reviewed for normalization and security. No unresolved dependencies.

---

### Phase 3 — Foundation Build

The project scaffold is built: repository structure, framework setup, design system implementation, authentication, routing, and database migrations. This phase produces a running application shell that matches the design system but contains no business logic.

- Repository initialized with defined folder structure
- All dependencies installed and environment configured
- Database schema migrated and seed data loaded
- Authentication system fully implemented (login, register, session, roles)
- All routes defined and navigation working
- Design system components built and documented
- Error pages, loading states, and empty states implemented

> ✅ **Verification Gate:** Application runs without errors. All routes resolve. Auth flows work end-to-end. Database migrations run cleanly. All design system components render correctly. Lighthouse score baseline is recorded.

---

### Phase 4 — Feature Build

All application features are built in dependency order — foundational features first, dependent features after. Each feature is built against its corresponding mockup and schema. The AI builds one feature at a time with a verification check between each.

- Features are sequenced by dependency (no feature built before its dependencies)
- Each feature is built to match its Phase 1 mockup exactly
- All CRUD operations, business logic, and state management are implemented
- API routes and server actions are generated from Phase 2 schema
- All error handling, validation, and edge cases are covered

> ✅ **Verification Gate:** Every feature in the spec is implemented. Every screen matches its mockup. All forms validate correctly. All data operations work against the live database. No console errors or TypeScript violations.

---

### Phase 5 — Testing & Verification

A dedicated phase for quality assurance. The AI acts as a QA engineer, systematically testing every feature, writing automated tests for critical paths, and resolving all identified bugs before deployment is approved.

- Unit tests for all utility functions and business logic
- Integration tests for all API routes and database operations
- End-to-end tests for all critical user flows
- Security audit: auth bypass, SQL injection, exposed secrets, CORS
- Performance audit: Lighthouse >90, bundle size, query optimization
- Accessibility audit: WCAG AA compliance
- Cross-browser and mobile responsiveness testing

> ✅ **Verification Gate:** All automated tests pass. Lighthouse score >90. No critical or high security vulnerabilities. All WCAG AA requirements met. Performance baseline documented. Zero known blocking bugs.

---

### Phase 6 — Deployment & Operations

The application is deployed to production with a complete ops baseline. Environment configuration, CI/CD pipeline, monitoring, backup strategy, and incident response runbook are all defined and operational before the project is considered complete.

- Production environment configured with all environment variables
- CI/CD pipeline set up with automated test and deploy on merge
- Domain, SSL, and CDN configured
- Error monitoring and alerting configured (e.g. Sentry)
- Database backup schedule established
- Operations runbook written: common issues, rollback procedure, support contacts
- Data export capability verified

> ✅ **Verification Gate:** Application is live and accessible. CI/CD pipeline runs successfully. Monitoring alerts firing correctly. Backup and restore procedure tested. Runbook is complete. Project is formally closed.

---

## 5. Standard Artifacts

| Artifact | Description | Produced In |
|----------|-------------|-------------|
| `PROJECT-SPEC.md` | Full Gates 0–5 specification. Master document for the entire project. | Phase 0 |
| `COMPETITIVE-ANALYSIS.md` | Research on competitor products, feature gaps, and positioning. | Phase 0 |
| Mockup Files | High-fidelity static screens for every view and state in the application. | Phase 1 |
| `DESIGN-SYSTEM.md` | Color tokens, typography, spacing, component inventory, and usage rules. | Phase 1 |
| `MOCK-ANALYSIS.md` | Per-screen data extraction: fields, types, relationships, states. | Phase 2 |
| `SCHEMA.sql` | Complete database schema with all tables, columns, indexes, and policies. | Phase 2 |
| `DEPENDENCY-MAP.md` | All packages, services, environment variables, and external dependencies. | Phase 2 |
| `BUILD-STATE.md` | Current build state snapshot used to initialize each new AI session. | All Phases |
| `BUILD-LOG.md` | Chronological log of all build decisions, changes, and completions. | All Phases |
| `ERROR-LOG.md` | All errors encountered, root causes, and resolutions. | All Phases |
| `TEST-REPORT.md` | Results of all automated and manual testing with pass/fail status. | Phase 5 |
| `RUNBOOK.md` | Operations guide: deployment, rollback, common issues, monitoring. | Phase 6 |

---

## 6. AI Operating Model

### 6.1 Session Initialization Protocol

Every AI build session — regardless of phase — begins with the same initialization sequence:

1. Load `BUILD-STATE.md` to establish current project context
2. Load `PROJECT-SPEC.md` to confirm scope boundaries
3. Load the phase-specific artifact (mockup, schema, etc.) relevant to the current session
4. Confirm current phase and the specific task within that phase
5. Confirm what the verification gate for this phase requires
6. Begin work only after all five confirmations are complete

> ⚠️ **Critical Rule:** An AI session that begins without loading `BUILD-STATE.md` is operating blind. All assumptions it makes about project structure, conventions, and decisions are potentially wrong. This is the single most common source of build failures in AI-assisted development.

---

### 6.2 Human vs. AI Responsibilities

| Human Architect | AI Builder |
|-----------------|------------|
| Define the problem and success criteria | Research the domain and competitive landscape |
| Approve the specification | Generate the PROJECT-SPEC.md from research |
| Approve mockup designs | Build high-fidelity UI mockups |
| Approve database schema | Analyze mockups and generate schema |
| Direct phase sequencing | Execute build tasks within phase boundaries |
| Verify each phase gate | Run automated tests and self-verification |
| Make scope decisions | Flag scope ambiguities for human decision |
| Approve deployment | Configure deployment and write runbook |

---

### 6.3 Scope Enforcement

The AI must enforce scope boundaries. If a build task requires functionality not defined in the spec, the AI must stop, document the gap in `BUILD-LOG.md`, and request a human decision before proceeding. The AI never silently expands scope.

**Acceptable AI responses to scope ambiguity:**
- *"This feature requires [X] which is not in the spec. Should I add it, skip it, or flag it for a spec amendment?"*
- *"The mockup shows [X] but the spec does not define the data model for it. I have added this to the ERROR-LOG and am waiting for direction."*

**Never acceptable:**
- Silently building something not in the spec
- Silently skipping something that is in the spec
- Proceeding past a failing verification gate

---

## 7. Built-In Standards

Every project built under the CodeBakers Method must meet the following standards. These are not optional enhancements — they are part of the definition of a complete build.

### 7.1 Accessibility
- WCAG 2.1 Level AA compliance on all pages
- All images have descriptive alt text
- All interactive elements are keyboard navigable
- Color contrast ratios meet AA minimums
- Screen reader compatibility verified

### 7.2 Security
- All environment variables stored in `.env` files, never hardcoded
- All user inputs validated and sanitized server-side
- Authentication required on all non-public routes
- Row-level security policies on all database tables with user data
- CORS configured to allow only known origins
- No SQL injection vectors (parameterized queries only)
- Secrets scanning in CI/CD pipeline

### 7.3 Performance
- Lighthouse score >90 on Performance, Accessibility, Best Practices, SEO
- Core Web Vitals within Google's 'Good' thresholds
- Images optimized and served in modern formats (WebP)
- Database queries optimized with appropriate indexes
- Bundle size monitored and kept within defined limits

### 7.4 User Experience
- Mobile-first responsive design on all screens
- All loading states handled (skeleton loaders or spinners)
- All error states handled with user-friendly messages
- All empty states handled with contextual guidance
- Branded transactional emails for all user-triggered events
- User onboarding flow for first-time users
- Data export capability for user-owned data

### 7.5 Code Quality
- TypeScript strict mode enabled on all projects
- No commented-out code in production builds
- All functions have JSDoc comments
- ESLint and Prettier configured and enforced in CI
- No `console.log` statements in production code
- Test coverage minimum 70% on business logic

---

## 8. Relationship to Established Methodologies

The CodeBakers Method does not replace existing methodologies — it synthesizes the most applicable principles from each into a framework designed for AI-first development.

| Source Methodology | Principle Borrowed | How It Applies in CodeBakers |
|--------------------|-------------------|------------------------------|
| Shape Up | Fixed appetite, not open scope | Every phase and feature has defined boundaries. If it doesn't fit, it's cut — not expanded. |
| Lean | Eliminate waste | Only build what the spec and mockups require. No speculative features. |
| Agile | Working software over documentation | Every phase ends with verifiable, working output — not just documents. |
| Domain-Driven Design | Domain-driven modeling | Schema is derived from the real-world domain as expressed in the UI, not from technical abstractions. |
| 12-Factor App | Environment and config standards | All config in environment variables. Stateless processes. Defined ops baseline. |
| TDD (adapted) | Verify before ship | Verification gates replace test-first. Every phase must pass its gate before proceeding. |

---

## 9. Quick Reference — AI Session Rules

Copy this into every `CLAUDE.md` or system prompt when operating under the CodeBakers Method.

```
CodeBakers Method — Operating Rules for AI Sessions
────────────────────────────────────────────────────
1. Load BUILD-STATE.md before any action
2. Confirm current phase and task
3. Never build outside spec scope
4. Derive schema from mockups, not assumptions
5. One phase at a time. Pass the gate before proceeding.
6. Log all decisions to BUILD-LOG.md
7. Log all errors to ERROR-LOG.md
8. Update BUILD-STATE.md at end of every session
9. Never proceed past a failing verification gate
```

---

*© 2026 BotMakers Inc. — CodeBakers Method v1.0 — All Rights Reserved*
