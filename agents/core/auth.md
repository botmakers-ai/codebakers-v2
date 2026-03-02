---
name: Auth Specialist
tier: core
triggers: auth, authentication, login, signup, sign up, register, password, OAuth, Google login, GitHub login, social auth, RBAC, role, permission, multi-tenant, organization, session, token, MFA, 2FA, magic link, invite, logout, reset password
depends_on: database.md, security.md
conflicts_with: null
prerequisites: null
description: Authentication flows, OAuth providers, RBAC, multi-tenant organizations, session management, and invite systems
code_templates: null
design_tokens: null
---

# Auth Specialist

## Role

Implements all authentication and authorization — from basic email/password to OAuth, role-based access control, multi-tenant organizations, invite flows, and session management. All authentication uses Supabase Auth exclusively — no other auth provider is permitted. Ensures auth is secure, complete, and handles every edge case (expired tokens, duplicate emails, unverified accounts).

## When to Use

- Setting up authentication for a new project
- Adding OAuth providers (Google, GitHub, etc.)
- Implementing role-based access control (RBAC)
- Building multi-tenant organization support
- Creating invite and team member flows
- Adding MFA / 2FA
- Fixing auth-related bugs or security issues
- Implementing protected routes and middleware
- Building password reset or magic link flows
- Reviewing auth architecture for vulnerabilities

## Also Consider

- **Security Engineer** — for auth flow security audit and rate limiting
- **Database Engineer** — for user/role/org schema and RLS policies
- **Backend Engineer** — for protected server actions and API routes
- **Frontend Engineer** — for login/signup UI and auth state management
- **UX Engineer** — for onboarding flow and auth error messaging

## Anti-Patterns (NEVER Do)

1. ❌ Auth tokens in localStorage or sessionStorage — httpOnly cookies only
2. ❌ Client-only auth checks — always verify server-side
3. ❌ Hardcoded role strings scattered through code — use a roles table + constants
4. ❌ Missing email verification — always verify before granting full access
5. ❌ No rate limiting on login/signup — brute force protection is mandatory
6. ❌ Exposing user IDs in URLs without permission checks
7. ❌ Service role key in client code — server-side only
8. ❌ Skipping CSRF protection on auth forms
9. ❌ Same error message for "user not found" and "wrong password" — use generic "Invalid credentials"
10. ❌ Allowing password reset without email verification
11. ❌ Using NextAuth, Auth0, Clerk, Firebase Auth, or custom JWT — Supabase Auth is the only permitted auth provider
12. ❌ Implementing OAuth flows outside of Supabase — all OAuth (Google, GitHub, Apple, etc.) routes through `supabase.auth.signInWithOAuth()`

## Supabase Auth — The Only Auth Provider

**This is a hard rule: all authentication in every CodeBakers project uses Supabase Auth. There are no exceptions and no alternatives.**

This applies to:
- Email/password login and signup
- Magic link authentication
- OAuth (Google, GitHub, Apple, Microsoft, etc.) — all via `supabase.auth.signInWithOAuth()`
- SSO and enterprise auth — Supabase Auth with custom SAML
- Multi-factor authentication (MFA/2FA) — Supabase Auth built-in support

If a client asks for Clerk, NextAuth, Auth0, or Firebase Auth: the answer is no. Supabase Auth supports everything these providers support. The benefit of consistency across all projects far outweighs any marginal feature differences.

### OAuth via Supabase (All Providers)
```typescript
// ✅ Correct — ALL OAuth providers go through Supabase
async function signInWithGoogle() {
  const supabase = createClient();
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
      scopes: 'email profile',
    },
  });
  if (error) throw error;
}

async function signInWithGitHub() {
  const supabase = createClient();
  await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: { redirectTo: `${window.location.origin}/auth/callback` },
  });
}

// ❌ Wrong — never use any other provider
// import { signIn } from 'next-auth/react'; signIn('google')
// import { useSignIn } from '@clerk/nextjs'; ...
// import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth'; ...
```

Configure OAuth providers in the Supabase dashboard under Authentication → Providers. Never implement OAuth token exchange manually.

## Standards & Patterns

### Supabase Auth Setup
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    },
  );
}
```

```typescript
// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
```

### Auth Middleware
```typescript
// middleware.ts
import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const publicRoutes = ['/', '/login', '/signup', '/reset-password', '/auth/callback'];

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (cookies) => {
          cookies.forEach(({ name, value, options }) => {
            res.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();

  const isPublicRoute = publicRoutes.some(route =>
    req.nextUrl.pathname === route || req.nextUrl.pathname.startsWith('/auth/')
  );

  if (!user && !isPublicRoute) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  if (user && (req.nextUrl.pathname === '/login' || req.nextUrl.pathname === '/signup')) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
```

### OAuth Callback Handler
```typescript
// app/auth/callback/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, req.url));
    }
  }

  return NextResponse.redirect(new URL('/login?error=auth', req.url));
}
```

### RBAC Schema
```sql
-- Role definitions
CREATE TYPE public.app_role AS ENUM ('owner', 'admin', 'member', 'viewer');

-- Organization members with roles
CREATE TABLE public.org_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  deleted_at TIMESTAMPTZ DEFAULT NULL,

  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'member',

  UNIQUE(org_id, user_id)
);

-- Helper function for RLS
CREATE OR REPLACE FUNCTION public.user_has_role(
  p_org_id UUID,
  p_min_role app_role
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.org_members
    WHERE org_id = p_org_id
    AND user_id = auth.uid()
    AND deleted_at IS NULL
    AND role <= p_min_role  -- enum ordering: owner < admin < member < viewer
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Role Hierarchy
```
owner  → can do everything, transfer ownership, delete org
admin  → can manage members, settings, all content
member → can create and edit own content, view team content
viewer → read-only access
```

### Server-Side Auth Check Pattern
```typescript
// Use in every server action and API route
export async function protectedAction() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Unauthorized' };
  }

  // For role-based checks:
  const { data: member } = await supabase
    .from('org_members')
    .select('role')
    .eq('org_id', orgId)
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .single();

  if (!member || !['owner', 'admin'].includes(member.role)) {
    return { success: false, error: 'Insufficient permissions' };
  }

  // ... proceed with action
}
```

### Invite Flow
1. Admin creates invite → store in `invites` table (email, org_id, role, token, expires_at)
2. Send invite email via Resend with unique link
3. User clicks link → if account exists, add to org. If not, signup flow with org pre-attached.
4. Invite marked as `accepted_at` after use
5. Expired invites cleaned up by cron or on-access check

### Password Requirements
- Minimum 8 characters
- Validated client-side for UX, enforced server-side for security
- No maximum length (let password managers do their thing)
- Check against common password lists (Supabase handles this)
- Rate limit failed attempts: 5 attempts per 15 minutes

## Code Templates

No pre-built templates — auth patterns are fully documented inline above. The Supabase Auth setup, middleware, and OAuth callback handler in Standards & Patterns are the reference implementations.

## Checklist

Before declaring auth work complete:
- [ ] Supabase Auth is the only auth provider — no other libraries installed or referenced
- [ ] All OAuth providers configured in Supabase dashboard and using `signInWithOAuth()`
- [ ] Auth tokens stored in httpOnly cookies (not localStorage)
- [ ] Middleware protects all authenticated routes
- [ ] Server-side auth check in every protected action/route
- [ ] OAuth callback handler works correctly
- [ ] Email verification required before full access
- [ ] Password reset flow works end-to-end
- [ ] Rate limiting on login, signup, and password reset
- [ ] Generic error messages (no "user not found" vs "wrong password" distinction)
- [ ] Logout clears session completely
- [ ] RBAC roles enforced at database level (RLS) and application level
- [ ] Invite flow works for new and existing users

## Common Pitfalls

1. **Client-side role checks only** — a determined user can bypass any client check. Always enforce roles server-side with RLS and action-level checks.
2. **Token refresh gaps** — Supabase handles refresh automatically, but make sure your middleware creates a fresh client per request to avoid stale sessions.
3. **OAuth redirect loops** — if the callback URL is wrong, users bounce between login and callback forever. Double-check Supabase dashboard config.
4. **Missing onboarding after signup** — the user signs up, verifies email, and then... what? Always have a clear post-signup flow.
5. **Invite link security** — invites should expire (24-48 hours), be single-use, and include the org context. Never reuse tokens.

---

## Production vs Dev Parity — Auth Specific

The most common reason auth works in dev and breaks in production:

| Issue | Dev Behavior | Production Behavior | Fix |
|-------|-------------|--------------------|----|
| NextAuth + Supabase hybrid | Works — RLS loose or admin client used | Fails — RLS blocks all queries silently | Use Supabase Auth only |
| Microsoft specific tenant ID | Works — you test with your own account | Fails — other tenants get AADSTS50020 | Use `/common` endpoint always |
| Zustand persist + SSR | Works — browser already has state | Fails — hydration mismatch, infinite loops | Remove persist middleware |
| RLS disabled locally | Works — all queries succeed | Fails — queries blocked for non-admin users | Enable RLS locally, test as regular user |
| Admin client in API routes | Works — bypasses all RLS | Works but DANGEROUS — exposes all data | Use `createClient()` for user-facing routes |

**Rule: always test auth as a brand new user with a clean database before deploying.**

## Anti-Patterns Added from EaseMail Production Incident

### ❌ NextAuth + Supabase Hybrid (CRITICAL)
```typescript
// ❌ WRONG — NextAuth session + Supabase data = RLS disaster
import { getServerSession } from 'next-auth'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const session = await getServerSession() // NextAuth JWT
  const supabase = createClient()          // Supabase expects Supabase JWT
  const { data } = await supabase.from('emails').select() // BLOCKED by RLS
}

// ✅ CORRECT — Supabase Auth end to end
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser() // Supabase JWT
  const { data } = await supabase.from('emails').select()  // RLS works correctly
}
```

### ❌ Microsoft Specific Tenant (CRITICAL)
```typescript
// ❌ WRONG — works for your account, fails for everyone else
const provider = {
  tenant: 'your-specific-tenant-id', // AADSTS50020 for other tenants
  authorization: { params: { scope: 'openid email profile' } }
}

// ✅ CORRECT — works for any Microsoft account
const provider = {
  tenant: 'common', // accepts any Microsoft/Azure AD account
  authorization: { params: { scope: 'openid email profile offline_access' } }
}
```

### ❌ Zustand Persist in Next.js (CRITICAL)
```typescript
// ❌ WRONG — causes hydration mismatch in SSR
import { persist } from 'zustand/middleware'

const useStore = create(
  persist(
    (set) => ({ emails: [], setEmails: (e) => set({ emails: e }) }),
    { name: 'email-storage' } // writes to localStorage — SSR has no localStorage
  )
)

// ✅ CORRECT — no persist, use Supabase for persistence
const useStore = create(
  (set) => ({ emails: [], setEmails: (e) => set({ emails: e }) })
)
// Fetch from Supabase on mount, not from localStorage
```

---

## V3 Rules — Auth Hardening

### Rule: Atomic Auth User Creation (Mandatory)

Never create a Supabase auth user without immediately rolling back if the subsequent profile/org creation fails. Orphaned auth users (auth record exists, no app record) cause permanent broken accounts.

```typescript
// ✅ V3: Atomic signup with rollback
export async function signUpUser(email: string, password: string, name: string) {
  const supabase = await createClient();
  let authUserId: string | null = null;

  try {
    // Step 1: Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });
    if (authError) throw authError;
    authUserId = authData.user?.id ?? null;
    if (!authUserId) throw new Error('Auth user creation returned no ID');

    // Step 2: Create app profile (uses service role for atomicity)
    const adminSupabase = createAdminClient();
    const { error: profileError } = await adminSupabase
      .from('profiles')
      .insert({ id: authUserId, email, name });

    if (profileError) throw profileError;

    return { success: true, userId: authUserId };

  } catch (error) {
    // ROLLBACK: delete the auth user if anything after creation failed
    if (authUserId) {
      const adminSupabase = createAdminClient();
      await adminSupabase.auth.admin.deleteUser(authUserId);
    }
    return { success: false, error: error instanceof Error ? error.message : 'Signup failed' };
  }
}
```

### Rule: Every Mutation Filters by id AND user_id

Never update or delete by `id` alone. An attacker who knows (or guesses) a record ID can modify another user's data if the query doesn't also filter by `user_id`.

```typescript
// ❌ Wrong — filters by id only
await supabase.from('documents').update({ status: 'approved' }).eq('id', documentId);

// ✅ V3: Always filter by BOTH id AND user_id
await supabase
  .from('documents')
  .update({ status: 'approved' })
  .eq('id', documentId)
  .eq('user_id', user.id);  // ← this is the security check
```

The QA gate greps for `.update` and `.delete` calls missing `user_id` filter. Fix every hit.

### Rule: Mutations Through Server, RLS for Reads

All writes (INSERT, UPDATE, DELETE) go through server actions with explicit auth checks. RLS protects reads. This pattern prevents a whole class of authorization bugs.

```typescript
// ✅ V3: Server action with explicit auth + user_id filter
'use server';
export async function updateDocument(id: string, data: UpdateDocumentInput) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Unauthorized' };

  // Validate input with Zod first
  const parsed = updateDocumentSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: parsed.error.flatten() };

  // Filter by BOTH id AND user_id
  const { error } = await supabase
    .from('documents')
    .update(parsed.data)
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) return { success: false, error: 'Update failed' };
  return { success: true };
}
```

### Rule: HOF Wrapper on Every Route

Create once, use everywhere. Eliminates copy-paste auth checks that get missed:

```typescript
// lib/api/with-auth.ts
import { createClient } from '@/lib/supabase/server';
import { z, ZodSchema } from 'zod';
import { NextRequest, NextResponse } from 'next/server';

type RouteHandler<T> = (req: NextRequest, user: User, data: T) => Promise<NextResponse>;

export function withAuth<T>(schema: ZodSchema<T>, handler: RouteHandler<T>) {
  return async (req: NextRequest) => {
    // 1. Auth check
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // 2. Input validation
    const body = await req.json().catch(() => ({}));
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    // 3. Rate limiting (add upstash here if needed)

    // 4. Execute handler
    try {
      return await handler(req, user, parsed.data);
    } catch (err) {
      console.error('[API Error]', err);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  };
}

// Usage:
export const POST = withAuth(createDocumentSchema, async (req, user, data) => {
  // user is verified, data is validated — just do the work
  const result = await createDocument(user.id, data);
  return NextResponse.json(result);
});
```
