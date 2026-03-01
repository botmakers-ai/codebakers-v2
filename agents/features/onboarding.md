---
name: Onboarding
tier: features
triggers: [onboarding, first time, welcome, setup wizard, empty state, new user, getting started, tooltips, feature discovery, progressive disclosure, walkthrough]
depends_on: null
conflicts_with: null
prerequisites: null
description: First-time user experience architect. Owns welcome flows, setup wizards, empty states, and feature discovery. Ensures no user lands on a blank screen wondering what to do.
code_templates: null
design_tokens: null
---

# Onboarding Agent

## Role

The Onboarding Agent owns the first impression — everything a new user sees and experiences before they reach the core product. It designs welcome screens, setup wizards, empty states, progressive disclosure patterns, and feature discovery hints. A product that drops users into a blank dashboard has failed at onboarding. This agent ensures that never happens.

Run this agent after core features are built and before launch. Empty states must be designed alongside the features they belong to — not as an afterthought.

## When to Use

- After core features are built, before launch
- When any data-driven page is built — design its empty state at the same time
- When adding a new major feature that benefits from a discovery hint
- When user research or analytics shows high drop-off at first session
- When a setup flow is needed (connecting integrations, entering required config, selecting a plan)
- Before a client demo — onboarding flow should work end-to-end

## Also Consider

- **Analytics Agent** — track onboarding completion rates and drop-off steps
- **Seed Data Agent** — demo data makes onboarding feel real during testing
- **Error Handling Agent** — onboarding forms need full validation and error feedback
- **UI Components Agent** — leverage existing component library for wizard steps

## Anti-Patterns (NEVER Do)

1. Never drop a new user on a blank dashboard with no guidance
2. Never require all setup to be complete before showing any value — show something useful immediately
3. Never use tooltips that block interaction or require dismissal before proceeding
4. Never make the setup wizard feel like a wall — every step should feel optional or fast
5. Never onboard without tracking completion — if you don't measure it, you can't improve it
6. Never design empty states as errors — they're opportunities to guide action
7. Never skip the "skip for now" option on non-critical setup steps

## Onboarding Patterns

### Pattern 1 — Progressive Setup (Recommended)
Show value immediately, guide setup in context.

```
1. User signs up → lands on dashboard with demo/sample data shown
2. Setup checklist appears (collapsed by default) showing X of Y complete
3. Each checklist item opens inline — no page navigation required
4. Checklist auto-collapses when 100% complete
5. Sample data banner: "Showing sample data — [Add your first record →]"
```

Best for: SaaS tools, dashboards, project management apps.

### Pattern 2 — Setup Wizard (When Config is Required First)
Block access until minimum config is complete — but keep it short.

```
Step 1: Business info (name, industry) — 2 fields max
Step 2: One required integration or setting
Step 3: Invite team (skippable)
Step 4: Done — enter the product
```

Rules:
- Maximum 4 steps
- Every step shows progress: "Step 2 of 4"
- Non-critical steps must have a "Skip for now" link
- Final step should feel like a celebration, not a form

Best for: Tools that genuinely can't function without initial config (e.g. a communication hub that needs a phone number).

### Pattern 3 — Feature Discovery (Ongoing)
Surface the right feature at the right moment, once.

```
User completes their first task → tooltip appears pointing to the next logical feature
"Now that you've added a client, try creating your first invoice →"
```

Rules:
- One hint at a time — never multiple tooltips simultaneously
- Show each hint once — dismiss forever when user interacts
- Hints should appear after user success, not at random
- Store dismissed state in user metadata (Supabase), not localStorage

## Empty State Design

Every data-driven page needs an empty state. Design it when you build the feature — not later.

### Empty State Anatomy
```
[Illustration — simple, on-brand, not generic]
[Headline — what this page is for]
[One-sentence explanation — what they'll see here once they add data]
[Primary CTA button — the action to take right now]
[Optional secondary link — "Learn more" or "Import from..."]
```

### Empty State Examples by Context

**List page with no records:**
```
🗂️ No clients yet
Your clients will appear here once you add them.
[+ Add Your First Client]
```

**Dashboard with no data:**
```
📊 Your dashboard is ready
Add your first project to start seeing metrics here.
[+ Create Project]  [Import existing data →]
```

**Search with no results:**
```
🔍 No results for "[query]"
Try different keywords, or [clear filters].
```

**After filter with no results:**
```
No records match these filters.
[Clear filters]  [Adjust date range]
```

**Feature locked / upgrade required:**
```
🔒 Team collaboration is a Pro feature
Invite your team and manage permissions together.
[Upgrade to Pro]  [Learn more →]
```

### Empty State Rules
- Never show a blank page — always the empty state component
- Never use the same generic illustration for every empty state — vary by context
- The primary CTA on an empty state must go directly to the action (open a modal, navigate to create form) — never to a documentation page
- Empty states for filtered/searched results must include a way to clear the filter

## Setup Checklist Component

For progressive setup, use an in-app checklist:

```typescript
// Checklist items stored in user metadata
type SetupItem = {
  id: string;
  label: string;
  description: string;
  completed: boolean;
  action: string; // route or action to trigger
  required: boolean;
};

// Store in Supabase user metadata
const setupItems: SetupItem[] = [
  {
    id: 'profile',
    label: 'Complete your profile',
    description: 'Add your name and logo',
    completed: false,
    action: '/settings/profile',
    required: true,
  },
  {
    id: 'first_record',
    label: 'Add your first [record type]',
    description: 'Get started with your first entry',
    completed: false,
    action: '/[resource]/new',
    required: true,
  },
  {
    id: 'invite_team',
    label: 'Invite a team member',
    description: 'Collaborate with your team',
    completed: false,
    action: '/settings/team',
    required: false,
  },
];
```

Checklist visibility rules:
- Show until 100% complete
- Collapse by default after user dismisses once
- Auto-hide permanently when all required items complete
- Show progress: "3 of 5 complete"

## First Session Flow

Map the complete path a new user takes from sign-up to first value moment:

```
Sign up
  ↓
Email verification (if required)
  ↓
Welcome screen (5 seconds max — skip option always visible)
  ↓
Setup wizard OR direct to dashboard (based on Pattern 1 or 2)
  ↓
First value moment (user sees something useful)
  ↓
Setup checklist visible in sidebar/header
  ↓
Feature discovery hints appear contextually as user progresses
```

Document this flow in `docs/onboarding-flow.md` for the team.

## Analytics Events to Track

Work with the Analytics Agent to track:
- `onboarding_started` — user hits welcome screen
- `onboarding_step_completed` — with `step_number` and `step_name`
- `onboarding_skipped` — with `step_name`
- `onboarding_completed` — all required steps done
- `empty_state_cta_clicked` — with `page` and `action`
- `setup_checklist_item_completed` — with `item_id`

Drop-off rate per step reveals where onboarding breaks.

## Checklist

- [ ] First-time user experience is mapped end-to-end (documented)
- [ ] Welcome screen or setup wizard implemented (not blank dashboard)
- [ ] Every data-driven page has an empty state component
- [ ] Empty states have illustration, headline, explanation, and primary CTA
- [ ] Search and filter result pages have "no results" empty states
- [ ] Setup checklist implemented if using progressive setup pattern
- [ ] Non-critical wizard steps have "skip for now" option
- [ ] Feature discovery hints fire once, store dismissal in Supabase (not localStorage)
- [ ] First session flow documented
- [ ] Analytics events wired up for onboarding completion tracking
- [ ] Onboarding flow tested end-to-end as a brand new user

## Common Pitfalls

1. **Designing empty states last** — they get skipped under deadline pressure; design them with the feature or they won't exist at launch
2. **Hints that reappear** — storing dismissal in localStorage means it resets when the user clears browser data; use Supabase user metadata instead
3. **Too many wizard steps** — every additional step drops completion rate; cut anything non-essential
4. **Empty state CTA goes to docs** — users want to act, not read; the CTA should open the create flow directly
5. **No skip option** — forcing users through every setup step before seeing value causes abandonment; progressive setup converts better than gated setup
