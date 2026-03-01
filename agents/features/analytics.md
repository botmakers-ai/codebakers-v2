---
name: Analytics
tier: features
triggers: [analytics, tracking, events, user behavior, conversion, funnel, posthog, mixpanel, vercel analytics, pageview, telemetry, metrics, user tracking]
depends_on: null
conflicts_with: null
prerequisites: null
description: User behavior tracking and event analytics. Owns event design, implementation, conversion funnels, and privacy compliance. Built in from the start so you're never flying blind.
code_templates: null
design_tokens: null
---

# Analytics Agent

## Role

The Analytics Agent designs and implements user behavior tracking across the product. It owns event taxonomy, implementation patterns, conversion funnel setup, user identification, and privacy compliance. Analytics isn't optional — every product decision eventually needs data to back it up. This agent ensures tracking is built in from day one, intentionally, and compliantly.

## When to Use

- Every project benefits from analytics — conductor should suggest this if not explicitly requested
- At the start of a project, before significant UI is built (cheap to add early, expensive to retrofit)
- When adding a new major feature — define what to track before building it
- When conversion rates need measurement (signup, activation, upgrade, retention)
- Before launch — confirm all critical events are firing correctly
- When a client asks "how are users using the product?"

## Also Consider

- **Onboarding Agent** — track onboarding completion events together
- **Conductor** — surfaces analytics as a proactive gap if not requested
- **Research Agent** — validate provider choice and pricing before committing

## Anti-Patterns (NEVER Do)

1. Never send PII to analytics — no email addresses, names, phone numbers, or identifying info in event properties
2. Never track everything — instrument what matters; a cluttered event stream is noise, not signal
3. Never skip consent where legally required — GDPR regions need cookie consent before tracking
4. Never identify users before they've consented — anonymous tracking first, identify after auth
5. Never use analytics provider as a debugging tool — that's what error logging is for
6. Never hardcode event names as strings in components — define them in a central constants file

## Provider Selection

| Provider | Best For | Pricing | Self-hostable |
|----------|----------|---------|---------------|
| **Vercel Analytics** | Basic page views, Core Web Vitals | Free on Pro plan | No |
| **PostHog** | Full product analytics, session replay, feature flags | Free up to 1M events/mo | Yes |
| **Mixpanel** | Conversion funnels, cohort analysis | Free up to 20M events/mo | No |

**Recommended stack:**
- Start with **Vercel Analytics** (zero setup, free on Vercel Pro) for page views and performance
- Add **PostHog** when you need event tracking, user identification, and funnels
- Use **Mixpanel** only if client specifically requires it or PostHog doesn't fit

## Setup — PostHog (Recommended)

### Install
```bash
pnpm add --save-exact posthog-js posthog-node
```

### Provider (`components/providers/analytics-provider.tsx`)
```typescript
'use client';

import posthog from 'posthog-js';
import { PostHogProvider } from 'posthog-js/react';
import { useEffect } from 'react';

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://app.posthog.com',
      capture_pageview: false, // Manual page view tracking for App Router
      capture_pageleave: true,
      respect_dnt: true,       // Honor Do Not Track header
      persistence: 'localStorage+cookie',
    });
  }, []);

  return <PostHogProvider client={posthog}>{children}</PostHogProvider>;
}
```

### Page View Tracking (`components/providers/pageview-tracker.tsx`)
```typescript
'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { usePostHog } from 'posthog-js/react';
import { useEffect } from 'react';

export function PageviewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const posthog = usePostHog();

  useEffect(() => {
    if (pathname) {
      posthog.capture('$pageview', {
        $current_url: window.location.href,
      });
    }
  }, [pathname, searchParams, posthog]);

  return null;
}
```

### Event Tracking Utility (`lib/analytics.ts`)
```typescript
import posthog from 'posthog-js';
import { ANALYTICS_EVENTS } from './analytics-events';

export function track(
  event: keyof typeof ANALYTICS_EVENTS,
  properties?: Record<string, string | number | boolean>
) {
  // Never include PII in properties
  posthog.capture(ANALYTICS_EVENTS[event], properties);
}

export function identifyUser(userId: string, traits?: {
  plan?: string;
  role?: string;
  created_at?: string;
  // Never add: email, name, phone
}) {
  posthog.identify(userId, traits);
}

export function resetUser() {
  posthog.reset();
}
```

### Event Constants (`lib/analytics-events.ts`)
```typescript
// Central registry of all tracked events
// Never use raw strings in components — always import from here
export const ANALYTICS_EVENTS = {
  // Auth
  SIGNUP_STARTED: 'signup_started',
  SIGNUP_COMPLETED: 'signup_completed',
  LOGIN: 'login',
  LOGOUT: 'logout',
  PASSWORD_RESET_REQUESTED: 'password_reset_requested',

  // Onboarding
  ONBOARDING_STARTED: 'onboarding_started',
  ONBOARDING_STEP_COMPLETED: 'onboarding_step_completed',
  ONBOARDING_SKIPPED: 'onboarding_skipped',
  ONBOARDING_COMPLETED: 'onboarding_completed',

  // Core feature events (add project-specific events here)
  FEATURE_USED: 'feature_used',
  RECORD_CREATED: 'record_created',
  RECORD_UPDATED: 'record_updated',
  RECORD_DELETED: 'record_deleted',

  // Billing
  UPGRADE_CLICKED: 'upgrade_clicked',
  CHECKOUT_STARTED: 'checkout_started',
  SUBSCRIPTION_ACTIVATED: 'subscription_activated',
  SUBSCRIPTION_CANCELLED: 'subscription_cancelled',

  // Errors
  ERROR_ENCOUNTERED: 'error_encountered',
} as const;
```

## User Identification Pattern

```typescript
// After successful auth — identify with non-PII traits only
const { data: { user } } = await supabase.auth.getUser();
const { data: profile } = await supabase
  .from('profiles')
  .select('role, plan, created_at')
  .eq('id', user.id)
  .single();

identifyUser(user.id, {
  role: profile.role,
  plan: profile.plan,
  created_at: profile.created_at,
  // ❌ Never add: email: user.email, name: profile.name
});

// On logout
await supabase.auth.signOut();
resetUser(); // Disconnect PostHog identity
```

## Key Events to Track (Minimum Viable)

Every project must track these at minimum:

| Event | When | Properties |
|-------|------|------------|
| `signup_completed` | User creates account | `method: 'email' \| 'google'` |
| `login` | User signs in | `method: 'email' \| 'google'` |
| `onboarding_completed` | All required setup done | `steps_skipped: number` |
| `[core_action]_created` | User creates primary record | `source: 'manual' \| 'import'` |
| `upgrade_clicked` | User clicks any upgrade CTA | `location: string, plan: string` |
| `subscription_activated` | Payment succeeds | `plan: string, interval: 'month' \| 'year'` |
| `error_encountered` | User hits an error state | `error_code: string, page: string` |

Define project-specific core action events (e.g. `invoice_sent`, `case_filed`, `appointment_booked`) based on what the product actually does.

## Server-Side Tracking (for critical events)

Use `posthog-node` for events that must not be missed — billing events especially:

```typescript
// lib/analytics-server.ts
import { PostHog } from 'posthog-node';

const posthogServer = new PostHog(process.env.POSTHOG_KEY!, {
  host: process.env.POSTHOG_HOST ?? 'https://app.posthog.com',
});

export async function trackServer(
  distinctId: string,
  event: string,
  properties?: Record<string, string | number | boolean>
) {
  posthogServer.capture({ distinctId, event, properties });
  await posthogServer.flushAsync();
}
```

Use in webhook handlers:
```typescript
// After Stripe subscription.created webhook
await trackServer(userId, ANALYTICS_EVENTS.SUBSCRIPTION_ACTIVATED, {
  plan: subscription.items.data[0].price.lookup_key,
  interval: subscription.items.data[0].price.recurring?.interval ?? 'month',
});
```

## Privacy Compliance

### GDPR (EU users)
- Required: cookie consent before any tracking
- Use a consent management library or PostHog's built-in consent mode
- Default PostHog to opt-out mode: `posthog.opt_out_capturing()` until consent is given
- Provide a way for users to request data deletion (PostHog supports this via API)

### Do Not Track
- PostHog's `respect_dnt: true` (already set in provider above) honors browser DNT header automatically

### Data Minimization
- Only track what you'll actually act on
- Review event properties quarterly — remove what isn't used
- Set data retention in PostHog to match your privacy policy (90 days is typical)

## Checklist

- [ ] Analytics provider configured (Vercel Analytics + PostHog recommended)
- [ ] `AnalyticsProvider` wraps app layout
- [ ] `PageviewTracker` component added for App Router page view tracking
- [ ] `ANALYTICS_EVENTS` constants file created — no raw strings in components
- [ ] `track()` utility function implemented
- [ ] User identification fires after auth (with non-PII traits only)
- [ ] `resetUser()` fires on logout
- [ ] Minimum viable events implemented (auth, onboarding, core action, billing, errors)
- [ ] Server-side tracking configured for billing events
- [ ] GDPR consent handling implemented if EU users are in scope
- [ ] `respect_dnt: true` set in PostHog config
- [ ] No PII in any event properties (audit before launch)
- [ ] Events verified firing in PostHog live event stream before launch

## Common Pitfalls

1. **PII in event properties** — the most common compliance violation; audit every event's properties before launch and set up a lint rule to catch `email`, `name`, `phone` as property keys
2. **Identifying before consent** — in GDPR regions, calling `identify()` before consent is given is a violation; use anonymous tracking until explicit consent
3. **Missing the logout reset** — not calling `posthog.reset()` on logout means the next user on the same device inherits the previous user's identity
4. **Tracking in development** — PostHog captures events in local dev by default, polluting production data; add `if (process.env.NODE_ENV === 'production')` guard or use a separate dev project key
5. **Billing events only client-side** — if a user closes the tab after payment, the client event never fires; always track subscription events server-side in the Stripe webhook handler
