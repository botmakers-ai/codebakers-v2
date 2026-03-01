---
name: Error Handling
tier: core
triggers: [error, error handling, error boundary, toast, retry, fallback, offline, validation, exception, catch, 404, 500, error page, error message, error state]
depends_on: null
conflicts_with: null
prerequisites: null
description: Owns the complete error experience across the entire app — API errors, user-facing messages, error boundaries, retry logic, graceful degradation, and logging.
code_templates: [error-boundary.tsx, toast-system.tsx, api-error-handler.ts, retry-utility.ts]
design_tokens: null
---

# Error Handling Agent

## Role

The Error Handling Agent owns the full error experience — every layer, every user-facing moment where something can go wrong. It designs the strategy for API errors, server actions, client components, forms, third-party integrations, and database failures. It also owns logging, retry logic, graceful degradation, and offline states. Run this agent proactively during any feature build — not just when errors appear.

## When to Use

- During any feature build, before declaring it done (proactive — don't wait for errors)
- When the conductor's post-build audit flags missing error states
- When adding a new API route or server action
- When integrating a third-party service (Stripe, Resend, VAPI, etc.)
- When building any form with user input
- When setting up error pages (404, 500, maintenance)
- When configuring structured logging

## Also Consider

- **QA Agent** — validates error handling coverage in tests
- **Code Review Agent** — flags silently swallowed errors during review
- **Conductor** — triggers this agent's checklist during post-build audit

## Anti-Patterns (NEVER Do)

1. Never swallow errors silently — `catch (e) {}` with nothing inside is forbidden
2. Never show stack traces or raw error objects to users
3. Never use generic "Something went wrong" without a retry option or next step
4. Never catch without logging — if you catch it, you log it
5. Never log PII — no email addresses, names, or personal data in error logs
6. Never throw untyped errors — always use typed error results or typed Error subclasses
7. Never assume third-party APIs succeed — every external call needs timeout + fallback

## Error Strategy by Layer

### API Routes (`app/api/[route]/route.ts`)
Every API route returns a typed response. Never let Next.js return an unhandled 500.

```typescript
// Standard API route pattern
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { success: false, error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const result = await doTheWork(parsed.data);
    return Response.json({ success: true, data: result });

  } catch (error) {
    console.error('[API /route]', { error, timestamp: new Date().toISOString() });
    return Response.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### Server Actions (`app/actions/[name].ts`)
Use the `ActionResult` pattern from CODEBAKERS.md. Never throw from a server action that the client calls directly.

```typescript
type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; code?: string };

export async function createRecord(input: CreateInput): Promise<ActionResult<Record>> {
  try {
    const parsed = createSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: 'Invalid input', code: 'VALIDATION_ERROR' };
    }

    const { data, error } = await supabase.from('records').insert(parsed.data).select().single();
    if (error) {
      console.error('[createRecord]', { error, input: parsed.data });
      return { success: false, error: 'Failed to create record', code: 'DB_ERROR' };
    }

    return { success: true, data };
  } catch (error) {
    console.error('[createRecord] unexpected', { error });
    return { success: false, error: 'Unexpected error', code: 'UNKNOWN' };
  }
}
```

### Client Components — Error Boundaries
Three levels of error boundaries are required:

**Global** (`app/global-error.tsx`) — catches root layout errors:
```typescript
'use client';
export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <html><body>
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <h1>Something went wrong</h1>
        <button onClick={reset}>Try again</button>
      </div>
    </body></html>
  );
}
```

**Per-route** (`app/[route]/error.tsx`) — catches route-level errors. Required for every route segment.

**Per-component** — for critical widgets (payment forms, data tables) that shouldn't crash the whole page.

### Forms — Validation Feedback
Two levels of validation required on every form:
- **Field-level** — inline error below the field, shown on blur
- **Form-level** — summary error at the top or bottom, shown on failed submit

Never rely on HTML5 validation alone. Always validate with Zod on both client (for UX) and server (for security).

### Third-Party APIs — Retry + Timeout + Fallback
```typescript
import { retry } from '@/lib/retry';

const result = await retry(
  () => externalApi.call(payload),
  { attempts: 3, delay: 1000, backoff: 'exponential' }
);
```

Every external call needs:
- **Timeout** — never wait forever (default: 10s)
- **Retry** — transient failures should retry with exponential backoff
- **Fallback** — what does the user see if it never succeeds?

### Database — Constraint Violations → User Messages
Map Supabase/Postgres error codes to user-friendly messages. Never surface raw DB errors.

```typescript
function mapDbError(code: string): string {
  const map: Record<string, string> = {
    '23505': 'This record already exists.',
    '23503': 'Cannot delete — this record is referenced by other data.',
    '42501': 'You do not have permission to perform this action.',
  };
  return map[code] ?? 'Database error. Please try again.';
}
```

## User-Facing Error Patterns

### Toast Notifications
- **Success** — green, auto-dismiss after 4s
- **Error** — red, requires manual dismiss, includes retry button if action is retryable
- **Warning** — yellow, auto-dismiss after 6s
- **Info** — neutral, auto-dismiss after 4s

Never show more than 3 toasts simultaneously. Stack them, don't overlay.

### Error Pages
Required pages:
- `app/not-found.tsx` — 404, friendly message + link home
- `app/error.tsx` — 500, message + retry button + link home
- `app/maintenance/page.tsx` — maintenance mode, ETA if known

All error pages must match the app's design system. Plain text error pages are not acceptable.

### Retry Buttons
Any user-facing error that resulted from a transient failure (network, timeout, rate limit) must include a retry button. Permanent errors (validation, not found) should not — give direction instead.

## Structured Logging

Every `console.error` call must include:
```typescript
console.error('[context]', {
  error,           // the error object
  userId,          // if available — never include email, name, or other PII
  action,          // what was being attempted
  timestamp: new Date().toISOString(),
  // any other relevant non-PII context
});
```

Never log:
- Email addresses
- Names or identifying information
- Passwords, tokens, or secrets
- Full request bodies that may contain PII

## Retry Utility

```typescript
// lib/retry.ts
type RetryOptions = {
  attempts: number;
  delay: number;
  backoff?: 'linear' | 'exponential';
};

export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions
): Promise<T> {
  const { attempts, delay, backoff = 'exponential' } = options;

  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === attempts - 1) throw error;
      const wait = backoff === 'exponential' ? delay * Math.pow(2, i) : delay;
      await new Promise(resolve => setTimeout(resolve, wait));
    }
  }
  throw new Error('Retry failed'); // TypeScript exhaustiveness
}
```

## Checklist

- [ ] Every API route has a try/catch returning typed error responses
- [ ] Every server action uses the `ActionResult<T>` pattern
- [ ] Global error boundary exists at `app/global-error.tsx`
- [ ] Per-route error boundary exists at every route segment (`error.tsx`)
- [ ] Every form has field-level and form-level validation feedback
- [ ] Every third-party API call has timeout + retry + fallback
- [ ] Database errors mapped to user-friendly messages
- [ ] 404 page exists and matches design system
- [ ] 500 page exists and matches design system
- [ ] All `console.error` calls include context object (no PII)
- [ ] Toast system configured — success/error/warning/info variants
- [ ] Retryable errors have retry buttons; permanent errors give direction
- [ ] No silent catch blocks anywhere in the codebase

## Common Pitfalls

1. **Error boundary placement** — putting a single boundary at the root means one broken widget crashes the whole page; use per-route and per-component boundaries
2. **Retry on permanent errors** — retrying a 400 validation error wastes time; only retry on 5xx, timeouts, and network errors
3. **Missing error.tsx at nested routes** — Next.js App Router error boundaries don't bubble the same way; every route segment needs its own
4. **Logging the error object only** — `console.error(error)` loses context; always include what was happening and who it happened to (without PII)
5. **Form validation only on submit** — field-level errors on blur dramatically reduce user frustration; add them from the start
