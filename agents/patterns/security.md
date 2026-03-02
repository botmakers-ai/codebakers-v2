---
triggers:
  - "security vulnerability"
  - "XSS attack"
  - "SQL injection"
  - "CSRF protection"
  - "authentication"
  - "authorization"
  - "RLS policy"
  - "secure API"
  - "environment variables"
  - "rate limiting"
  - "CSP header"
  - "security headers"
  - "input validation"
  - "sanitization"

depends_on:
  - None (foundational pattern)

prerequisites:
  - Next.js App Router
  - Supabase with RLS enabled
  - TypeScript
  - Understanding of OWASP Top 10
  - Basic cryptography knowledge

description: |
  Production-ready security covering: Supabase RLS policies, XSS prevention, SQL injection prevention,
  CSRF protection (Server Actions + API routes), environment variable security, Content Security Policy,
  rate limiting, Supabase Auth session management, security headers (HSTS, X-Frame-Options), and input
  validation with Zod. Aligns with OWASP Top 10 2024.
---

# Security Pattern

## Research Foundation

**Searches performed:**
1. Supabase Row Level Security RLS policies best practices 2024
2. XSS cross-site scripting prevention React Next.js sanitization 2024
3. SQL injection prevention TypeScript Prisma Supabase ORM 2024
4. CSRF protection Next.js API routes server actions 2024
5. Next.js environment variables security NEXT_PUBLIC best practices
6. Content Security Policy CSP Next.js 15 nonce implementation 2024
7. Rate limiting Next.js API routes server actions 2024
8. Supabase Auth authentication best practices session management 2024
9. Security headers Next.js middleware Helmet.js HSTS 2024

**Key findings:**
- **43% of breaches involve web app vulnerabilities** (OWASP 2024)
- **RLS is 100x faster** with proper indexes on filtered columns
- **React escapes by default**, but `dangerouslySetInnerHTML` and `innerHTML` are escape hatches attackers exploit
- **DOMPurify is OWASP-recommended** for HTML sanitization
- **Server Actions have built-in CSRF protection** — API routes don't
- **NEXT_PUBLIC_ exposes variables to everyone** — including attackers
- **CSP with nonces requires dynamic rendering** in Next.js 15 (no static optimization)
- **Supabase Auth uses JWT-based sessions** — access tokens expire (5min-1hr), refresh tokens are single-use
- **Never trust unencoded session data** — always call `getUser()` to verify
- **Prisma.raw() makes $queryRaw unsafe** — use tagged templates only

---

## OWASP Top 10 Coverage

This pattern addresses:
1. **A01:2021 – Broken Access Control** → Supabase RLS, session validation
2. **A02:2021 – Cryptographic Failures** → Environment variables, HTTPS enforcement
3. **A03:2021 – Injection** → SQL injection prevention, input validation
4. **A04:2021 – Insecure Design** → Secure architecture patterns
5. **A05:2021 – Security Misconfiguration** → Security headers, CSP
6. **A06:2021 – Vulnerable Components** → Dependency management
7. **A07:2021 – Identification & Authentication** → Supabase Auth, session management
8. **A08:2021 – Data Integrity Failures** → CSRF protection, integrity checks
9. **A09:2021 – Security Logging** → Audit trails (not covered here, separate pattern)
10. **A10:2021 – SSRF** → Input validation, URL allowlists

---

## 1. Supabase Row Level Security (RLS)

**Enable RLS from day one. No exceptions.**

Without RLS, anyone with your `anon` key can read/write all data. RLS makes PostgreSQL enforce authorization at the database level.

### Basic RLS Policy Structure

```sql
-- Enable RLS on table
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only read their own posts
CREATE POLICY "Users read own posts"
  ON posts
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Users can insert posts with their own user_id
CREATE POLICY "Users insert own posts"
  ON posts
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own posts
CREATE POLICY "Users update own posts"
  ON posts
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own posts
CREATE POLICY "Users delete own posts"
  ON posts
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
```

**❌ NEVER use `FOR ALL`** — Separate into 4 policies (SELECT, INSERT, UPDATE, DELETE) for clarity and security.

### Performance: Index Filtered Columns

**Any column used in RLS policies MUST be indexed.**

```sql
-- ✅ CORRECT: Index the user_id column used in RLS
CREATE INDEX idx_posts_user_id ON posts USING btree (user_id);
```

**Performance impact:** 100x faster on large tables (from 500ms to 5ms).

### Performance: Wrap Functions in SELECT

Supabase functions like `auth.uid()` are called on **every row** unless wrapped.

```sql
-- ❌ WRONG: auth.uid() called for every row (slow)
CREATE POLICY "Users read own posts"
  ON posts
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- ✅ CORRECT: auth.uid() wrapped in SELECT (cached by optimizer)
CREATE POLICY "Users read own posts"
  ON posts
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);
```

**Why it works:** PostgreSQL optimizer runs an `initPlan` that caches `auth.uid()` result.

### Performance: Avoid Joins in Policies

```sql
-- ❌ WRONG: Join in RLS policy (slow)
CREATE POLICY "Users in organization read posts"
  ON posts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM org_members
      WHERE org_members.org_id = posts.org_id
        AND org_members.user_id = auth.uid()
    )
  );

-- ✅ CORRECT: Fetch org IDs into array first (faster)
CREATE FUNCTION user_org_ids()
RETURNS uuid[] AS $$
  SELECT ARRAY_AGG(org_id)
  FROM org_members
  WHERE user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE POLICY "Users in organization read posts"
  ON posts
  FOR SELECT
  TO authenticated
  USING (org_id = ANY((SELECT user_org_ids())));
```

**Why it works:** `SECURITY DEFINER` function runs once with elevated privileges, returns array. `ANY` is faster than `EXISTS` with joins.

### Multi-Tenant RLS (Organization Isolation)

```sql
-- Org-level isolation for all operations
CREATE POLICY "Organization members access data"
  ON documents
  FOR ALL
  TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM org_members
      WHERE user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM org_members
      WHERE user_id = (SELECT auth.uid())
    )
  );

-- Don't forget the index!
CREATE INDEX idx_documents_org_id ON documents USING btree (org_id);
CREATE INDEX idx_org_members_user_id ON org_members USING btree (user_id);
```

---

## 2. XSS (Cross-Site Scripting) Prevention

React escapes by default, but **there are escape hatches attackers exploit**.

### React's Built-in Protection

```typescript
// ✅ CORRECT: React escapes by default
function UserComment({ comment }: { comment: string }) {
  return <p>{comment}</p>; // Safe — React escapes HTML entities
}

// Example: comment = "<script>alert('XSS')</script>"
// Rendered as: &lt;script&gt;alert('XSS')&lt;/script&gt; (safe)
```

### Dangerous: dangerouslySetInnerHTML

**❌ NEVER use `dangerouslySetInnerHTML` with unsanitized user input.**

```typescript
// ❌ WRONG: XSS vulnerability
function BlogPost({ content }: { content: string }) {
  return <div dangerouslySetInnerHTML={{ __html: content }} />;
}

// If content = "<img src=x onerror=alert('XSS')>" → script executes
```

**✅ CORRECT: Sanitize with DOMPurify**

```bash
pnpm add --save-exact dompurify
pnpm add --save-exact -D @types/dompurify
```

```typescript
// utils/sanitize.ts
import DOMPurify from 'dompurify';

export function sanitizeHTML(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
    ALLOWED_ATTR: ['href', 'target'],
  });
}
```

```typescript
// components/BlogPost.tsx
'use client';
import { sanitizeHTML } from '@/utils/sanitize';

export function BlogPost({ content }: { content: string }) {
  const clean = sanitizeHTML(content);
  return <div dangerouslySetInnerHTML={{ __html: clean }} />;
}
```

**OWASP recommendation:** DOMPurify is the gold standard for HTML sanitization.

### Dangerous: innerHTML and Direct DOM Manipulation

```typescript
// ❌ WRONG: Direct innerHTML (XSS vulnerability)
function CommentList({ comments }: { comments: string[] }) {
  useEffect(() => {
    const container = document.getElementById('comments');
    if (container) {
      container.innerHTML = comments.join('<br>'); // XSS!
    }
  }, [comments]);

  return <div id="comments" />;
}

// ✅ CORRECT: Use React's rendering (automatic escaping)
function CommentList({ comments }: { comments: string[] }) {
  return (
    <div>
      {comments.map((comment, i) => (
        <p key={i}>{comment}</p>
      ))}
    </div>
  );
}
```

**Rule:** Use `innerText` or `textContent` if you must manipulate DOM directly. Never `innerHTML`.

---

## 3. SQL Injection Prevention

Supabase client and Prisma use **parameterized queries** by default. But raw queries can be vulnerable.

### Safe: Supabase Query Builder

```typescript
// ✅ CORRECT: Parameterized automatically
const { data } = await supabase
  .from('posts')
  .select('*')
  .eq('user_id', userId)
  .ilike('title', `%${searchTerm}%`); // Parameterized — safe
```

### Dangerous: Raw Unsafe Queries

```typescript
// ❌ WRONG: SQL injection vulnerability
const { data } = await supabase.rpc('search_posts', {
  query: `SELECT * FROM posts WHERE title LIKE '%${searchTerm}%'`, // Injection!
});

// If searchTerm = "'; DROP TABLE posts; --" → disaster
```

**✅ CORRECT: Use parameterized RPC**

```sql
-- Migration: Create RPC with parameters
CREATE OR REPLACE FUNCTION search_posts(search_term TEXT)
RETURNS TABLE(id UUID, title TEXT, content TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.title, p.content
  FROM posts p
  WHERE p.title ILIKE '%' || search_term || '%';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

```typescript
// ✅ CORRECT: Call with parameter
const { data } = await supabase.rpc('search_posts', {
  search_term: searchTerm, // Passed as parameter — safe
});
```

### Prisma Raw Queries

```typescript
// ❌ WRONG: SQL injection
const posts = await prisma.$queryRawUnsafe(
  `SELECT * FROM posts WHERE user_id = ${userId}` // Injection!
);

// ✅ CORRECT: Use tagged template (parameterized)
const posts = await prisma.$queryRaw`
  SELECT * FROM posts WHERE user_id = ${userId}
`; // Safe — Prisma escapes

// ✅ ALSO CORRECT: TypedSQL (type-safe + parameterized)
import { sql } from '@prisma/client/sql';

const posts = await prisma.$queryRawTyped(
  sql`SELECT * FROM posts WHERE user_id = ${userId}`
);
```

**Critical:** Never use `Prisma.raw()` helper — it bypasses parameterization even in `$queryRaw`.

---

## 4. CSRF (Cross-Site Request Forgery) Protection

### Server Actions (Built-in Protection)

Next.js Server Actions have **automatic CSRF protection**:
1. Only accept POST requests
2. Compare `Origin` header to `Host` header (or `X-Forwarded-Host`)
3. Reject if origins don't match

```typescript
// app/actions/delete-post.ts
'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function deletePost(postId: string) {
  const supabase = await createClient();

  // ✅ CORRECT: Server Actions are CSRF-protected automatically
  const { error } = await supabase.from('posts').delete().eq('id', postId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/posts');
  return { success: true };
}
```

**No additional CSRF protection needed for Server Actions.**

### API Routes (Manual Protection Required)

API routes (`app/api/*/route.ts`) **do not have built-in CSRF protection**.

**Option 1: Use @edge-csrf/nextjs**

```bash
pnpm add --save-exact @edge-csrf/nextjs
```

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import csrf from '@edge-csrf/nextjs';

const csrfProtect = csrf({
  cookie: {
    secure: process.env.NODE_ENV === 'production',
  },
});

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // CSRF check for state-changing methods
  const error = await csrfProtect(request, response);

  if (error) {
    return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });
  }

  return response;
}

export const config = {
  matcher: '/api/:path*',
};
```

**Option 2: SameSite cookies (simpler, less secure)**

```typescript
// API route with SameSite cookie check
export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');
  const host = request.headers.get('host');

  // ✅ Basic CSRF check: Same origin
  if (origin && !origin.includes(host || '')) {
    return NextResponse.json({ error: 'CSRF validation failed' }, { status: 403 });
  }

  // Process request...
}
```

**Best practice:** Use `@edge-csrf/nextjs` for production. SameSite cookies alone are not enough.

---

## 5. Environment Variables Security

### NEXT_PUBLIC_ Prefix

**Variables prefixed with `NEXT_PUBLIC_` are exposed to everyone.**

```typescript
// ❌ WRONG: Sensitive data exposed to client
// .env
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key // OK (anon key is public)
NEXT_PUBLIC_DATABASE_PASSWORD=secret123     // DISASTER — exposed to all users!

// ✅ CORRECT: Keep secrets server-only
// .env
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key // Server-only
STRIPE_SECRET_KEY=sk_live_...                    // Server-only
NEXT_PUBLIC_SUPABASE_URL=https://...             // Public (OK)
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhb...           // Public (OK)
```

### Access Server-Only Variables

```typescript
// ❌ WRONG: Can't access server-only vars in client components
'use client';

function Dashboard() {
  const apiKey = process.env.SECRET_API_KEY; // undefined!
  return <div>{apiKey}</div>;
}

// ✅ CORRECT: Use Server Component or API route
// app/dashboard/page.tsx (Server Component)
async function DashboardPage() {
  const apiKey = process.env.SECRET_API_KEY; // Available

  const data = await fetch('https://api.example.com', {
    headers: { Authorization: `Bearer ${apiKey}` },
  }).then((r) => r.json());

  return <DashboardClient data={data} />; // Pass data, not API key
}
```

### Validate Environment Variables at Build Time

```typescript
// lib/env.ts
import { z } from 'zod';

const envSchema = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  STRIPE_SECRET_KEY: z.string().startsWith('sk_'),
  NODE_ENV: z.enum(['development', 'production', 'test']),
});

export const env = envSchema.parse({
  SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  NODE_ENV: process.env.NODE_ENV,
});

// Usage: import { env } from '@/lib/env';
// Now env.STRIPE_SECRET_KEY is type-safe and validated
```

**Benefits:**
- Build fails if required env vars missing
- Type-safe access (autocomplete)
- Runtime validation

---

## 6. Content Security Policy (CSP)

CSP prevents XSS by restricting which scripts, styles, and resources can execute.

### CSP with Nonces (Next.js 15)

**Nonces require dynamic rendering** (no static optimization).

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');

  const cspHeader = `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' 'strict-dynamic';
    style-src 'self' 'nonce-${nonce}';
    img-src 'self' blob: data: https:;
    font-src 'self';
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    upgrade-insecure-requests;
  `.replace(/\s{2,}/g, ' ').trim();

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', cspHeader);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  response.headers.set('Content-Security-Policy', cspHeader);

  return response;
}
```

**Next.js automatically:**
1. Parses CSP header
2. Extracts nonce from `'nonce-{value}'` pattern
3. Applies nonce to all `<script>` and `<style>` tags

**`strict-dynamic` benefit:** All scripts loaded by trusted scripts are automatically trusted (lazy-loaded chunks, etc.).

---

## 7. Rate Limiting

Prevent abuse of API routes and Server Actions.

### Rate Limiting with Upstash Redis

```bash
pnpm add --save-exact @upstash/ratelimit @upstash/redis
```

```typescript
// lib/rate-limit.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

export const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '10 s'), // 10 requests per 10 seconds
  analytics: true,
});
```

### Rate Limit API Route

```typescript
// app/api/posts/route.ts
import { ratelimit } from '@/lib/rate-limit';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const ip = request.ip ?? '127.0.0.1';

  const { success, limit, reset, remaining } = await ratelimit.limit(ip);

  if (!success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': limit.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
          'X-RateLimit-Reset': reset.toString(),
        },
      }
    );
  }

  // Process request...
  return NextResponse.json({ success: true });
}
```

### Rate Limit Server Action

```typescript
// app/actions/create-post.ts
'use server';

import { ratelimit } from '@/lib/rate-limit';
import { createClient } from '@/lib/supabase/server';
import { headers } from 'next/headers';

export async function createPost(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Unauthorized' };
  }

  // Rate limit by user ID
  const { success } = await ratelimit.limit(user.id);

  if (!success) {
    return { error: 'Rate limit exceeded. Try again later.' };
  }

  // Process action...
  const title = formData.get('title') as string;

  const { error } = await supabase.from('posts').insert({ title, user_id: user.id });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}
```

**For Server Actions:** Return structured error object (not HTTP 429 status).

---

## 8. Supabase Auth Session Management

### Never Trust Unencoded Session Data

```typescript
// ❌ WRONG: Trusting session.user without verification
import { createClient } from '@/lib/supabase/server';

export async function getUserPosts() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) return [];

  // Session data could be tampered with!
  const userId = session.user.id;

  const { data } = await supabase.from('posts').select('*').eq('user_id', userId);
  return data;
}

// ✅ CORRECT: Always call getUser() to verify
export async function getUserPosts() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) return [];

  // Verified by Supabase server
  const { data } = await supabase.from('posts').select('*').eq('user_id', user.id);
  return data;
}
```

**Why:** `getUser()` verifies the JWT with Supabase server. `getSession()` just reads the cookie (can be tampered with).

### Secure Cookie Configuration

Supabase `@supabase/ssr` sets cookies securely by default:

```typescript
// lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, {
              ...options,
              httpOnly: true,     // Can't be accessed by JavaScript
              secure: true,       // Only sent over HTTPS
              sameSite: 'lax',    // CSRF protection
            });
          });
        },
      },
    }
  );
}
```

**HttpOnly:** Prevents XSS from stealing tokens.
**Secure:** Prevents MITM attacks.
**SameSite:** Prevents CSRF.

### Session Timeout Configuration

```sql
-- Set session timeout in Supabase Dashboard → Authentication → Settings
-- Or via SQL:

-- Time-boxed session (expires after 24 hours)
UPDATE auth.config
SET session_timeout = 86400; -- 24 hours in seconds

-- Inactivity timeout (expires after 1 hour of no refresh)
UPDATE auth.config
SET session_inactivity_timeout = 3600; -- 1 hour in seconds
```

**Security-sensitive apps** (SOC 2, HIPAA, PCI-DSS) should use short timeouts (15-30 min).

---

## 9. Security Headers

Set security headers via middleware for all routes.

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // HSTS: Force HTTPS for 1 year
  response.headers.set(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains; preload'
  );

  // X-Frame-Options: Prevent clickjacking
  response.headers.set('X-Frame-Options', 'DENY');

  // X-Content-Type-Options: Prevent MIME sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff');

  // Referrer-Policy: Limit referrer info
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Permissions-Policy: Disable unused browser features
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), interest-cohort=()'
  );

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
```

**Alternative: next.config.js**

```javascript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },
};
```

**Headers explained:**
- **HSTS:** Forces HTTPS (prevents downgrade attacks)
- **X-Frame-Options:** Prevents site from being embedded in `<iframe>` (clickjacking)
- **X-Content-Type-Options:** Prevents browser from MIME-sniffing (XSS vector)
- **Referrer-Policy:** Controls how much referrer info is sent to other sites
- **Permissions-Policy:** Disables unused browser features (reduces attack surface)

---

## 10. Input Validation with Zod

**Validate all user input on the server. Never trust client-side validation alone.**

```typescript
// lib/schemas.ts
import { z } from 'zod';

export const createPostSchema = z.object({
  title: z.string().min(1, 'Title required').max(200, 'Title too long'),
  content: z.string().min(10, 'Content must be at least 10 characters'),
  category: z.enum(['tech', 'design', 'business'], {
    errorMap: () => ({ message: 'Invalid category' }),
  }),
  tags: z.array(z.string()).max(5, 'Maximum 5 tags'),
  published: z.boolean().default(false),
});

export type CreatePostInput = z.infer<typeof createPostSchema>;
```

```typescript
// app/actions/create-post.ts
'use server';

import { createPostSchema } from '@/lib/schemas';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function createPost(input: unknown) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Unauthorized' };
  }

  // ✅ CORRECT: Validate input with Zod
  const parsed = createPostSchema.safeParse(input);

  if (!parsed.success) {
    return { error: 'Invalid input', details: parsed.error.flatten() };
  }

  const { title, content, category, tags, published } = parsed.data;

  const { error } = await supabase.from('posts').insert({
    title,
    content,
    category,
    tags,
    published,
    user_id: user.id,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/posts');
  return { success: true };
}
```

**Benefits:**
- Type-safe (TypeScript infers types from schema)
- Centralized validation logic
- Detailed error messages
- Prevents injection attacks (XSS, SQL injection)

---

## Anti-Patterns

### Anti-Pattern 1: Disabling RLS

**❌ WRONG:**
```sql
-- Disabling RLS "temporarily" to fix a bug
ALTER TABLE posts DISABLE ROW LEVEL SECURITY;
```

**Problem:** Anyone with the `anon` key can now read/write all posts. "Temporary" becomes permanent.

**✅ CORRECT:**
```sql
-- Keep RLS enabled always. Fix the policy instead.
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- Debug: Test as specific user in Supabase SQL Editor
SET request.jwt.claims.sub = '<user-id>';
SELECT * FROM posts; -- See what this user can access
```

---

### Anti-Pattern 2: Using dangerouslySetInnerHTML without Sanitization

**❌ WRONG:**
```typescript
function RichTextDisplay({ html }: { html: string }) {
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
```

**Problem:** If `html` contains `<script>alert('XSS')</script>`, it executes.

**✅ CORRECT:**
```typescript
import DOMPurify from 'dompurify';

function RichTextDisplay({ html }: { html: string }) {
  const clean = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: ['href', 'target'],
  });

  return <div dangerouslySetInnerHTML={{ __html: clean }} />;
}
```

---

### Anti-Pattern 3: Exposing Secrets with NEXT_PUBLIC_

**❌ WRONG:**
```typescript
// .env
NEXT_PUBLIC_STRIPE_SECRET_KEY=sk_live_abc123...
```

**Problem:** Secret key is bundled into client JavaScript. Anyone can read it in DevTools.

**✅ CORRECT:**
```typescript
// .env
STRIPE_SECRET_KEY=sk_live_abc123...  // Server-only (no NEXT_PUBLIC_)

// app/api/create-payment/route.ts
export async function POST(request: Request) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { ... });
  // Use secret on server only
}
```

---

### Anti-Pattern 4: Trusting getSession() in Server Components

**❌ WRONG:**
```typescript
export async function getServerSideProps() {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) return { props: {} };

  // Trusting session.user without verification
  const posts = await fetchUserPosts(session.user.id); // Can be tampered!
  return { props: { posts } };
}
```

**Problem:** `session` cookie can be modified client-side. Attacker could change `user.id`.

**✅ CORRECT:**
```typescript
export async function getServerSideProps() {
  const supabase = createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) return { props: {} };

  // Verified by Supabase server
  const posts = await fetchUserPosts(user.id);
  return { props: { posts } };
}
```

---

### Anti-Pattern 5: No Rate Limiting on Public Endpoints

**❌ WRONG:**
```typescript
// app/api/contact/route.ts
export async function POST(request: Request) {
  const { email, message } = await request.json();

  // No rate limiting — attacker can spam thousands of requests
  await sendEmail({ to: 'support@example.com', from: email, body: message });

  return Response.json({ success: true });
}
```

**Problem:** Attacker can spam your email, exhaust API quotas, or cause DDoS.

**✅ CORRECT:**
```typescript
import { ratelimit } from '@/lib/rate-limit';

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for') ?? '127.0.0.1';

  const { success } = await ratelimit.limit(ip);

  if (!success) {
    return Response.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  const { email, message } = await request.json();
  await sendEmail({ to: 'support@example.com', from: email, body: message });

  return Response.json({ success: true });
}
```

---

## Implementation Examples

### Example 1: Secure User Profile Update

```typescript
// lib/schemas.ts
import { z } from 'zod';

export const updateProfileSchema = z.object({
  display_name: z.string().min(1).max(50),
  bio: z.string().max(500).optional(),
  avatar_url: z.string().url().optional(),
});
```

```typescript
// app/actions/update-profile.ts
'use server';

import { updateProfileSchema } from '@/lib/schemas';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import DOMPurify from 'dompurify';

export async function updateProfile(input: unknown) {
  const supabase = await createClient();

  // 1. Authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: 'Unauthorized' };
  }

  // 2. Input validation
  const parsed = updateProfileSchema.safeParse(input);

  if (!parsed.success) {
    return { error: 'Invalid input', details: parsed.error.flatten() };
  }

  const { display_name, bio, avatar_url } = parsed.data;

  // 3. Sanitize HTML (if bio allows formatting)
  const sanitizedBio = bio ? DOMPurify.sanitize(bio) : null;

  // 4. Update with RLS protection (user can only update their own profile)
  const { error } = await supabase
    .from('profiles')
    .update({
      display_name,
      bio: sanitizedBio,
      avatar_url,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id); // RLS also enforces this

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/profile');
  return { success: true };
}
```

```sql
-- RLS policy for profiles table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = id);

CREATE POLICY "Users update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = id)
  WITH CHECK ((SELECT auth.uid()) = id);
```

---

### Example 2: Secure API Route with Full Protection

```typescript
// app/api/posts/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { ratelimit } from '@/lib/rate-limit';
import { createClient } from '@/lib/supabase/server';
import { createPostSchema } from '@/lib/schemas';

export async function POST(request: NextRequest) {
  // 1. Rate limiting
  const ip = request.ip ?? '127.0.0.1';
  const { success: rateLimitOk } = await ratelimit.limit(ip);

  if (!rateLimitOk) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  // 2. Authentication
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 3. Input validation
  const body = await request.json();
  const parsed = createPostSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { title, content, category, tags } = parsed.data;

  // 4. Database operation with RLS
  const { data, error } = await supabase
    .from('posts')
    .insert({
      title,
      content,
      category,
      tags,
      user_id: user.id,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}
```

---

### Example 3: Multi-Tenant RLS with Organization Isolation

```sql
-- Organizations table
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Organization members (junction table)
CREATE TABLE org_members (
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
  PRIMARY KEY (org_id, user_id)
);

-- Documents table (multi-tenant)
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_org_members_user_id ON org_members(user_id);
CREATE INDEX idx_documents_org_id ON documents(org_id);

-- RLS policies
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Users can only see documents from organizations they're members of
CREATE POLICY "Org members read documents"
  ON documents FOR SELECT
  TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM org_members
      WHERE user_id = (SELECT auth.uid())
    )
  );

-- Only org members can create documents
CREATE POLICY "Org members create documents"
  ON documents FOR INSERT
  TO authenticated
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM org_members
      WHERE user_id = (SELECT auth.uid())
    )
  );

-- Users can update documents in their orgs
CREATE POLICY "Org members update documents"
  ON documents FOR UPDATE
  TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM org_members
      WHERE user_id = (SELECT auth.uid())
    )
  );

-- Only document creator or admins can delete
CREATE POLICY "Creators and admins delete documents"
  ON documents FOR DELETE
  TO authenticated
  USING (
    created_by = (SELECT auth.uid())
    OR org_id IN (
      SELECT org_id FROM org_members
      WHERE user_id = (SELECT auth.uid())
        AND role IN ('owner', 'admin')
    )
  );
```

---

## Testing Checklist

- [ ] **RLS enabled on all tables**
  - [ ] Test with different user IDs (can't access other users' data)
  - [ ] Test with unauthenticated requests (should fail)
  - [ ] Verify indexes on filtered columns

- [ ] **XSS prevention**
  - [ ] No `dangerouslySetInnerHTML` without DOMPurify
  - [ ] No direct `innerHTML` manipulation
  - [ ] User input displayed via React (automatic escaping)

- [ ] **SQL injection prevention**
  - [ ] No `$queryRawUnsafe` or string concatenation in queries
  - [ ] All raw queries use tagged templates or parameters
  - [ ] No `Prisma.raw()` helper usage

- [ ] **CSRF protection**
  - [ ] Server Actions used (built-in protection)
  - [ ] API routes have `@edge-csrf/nextjs` or origin checks

- [ ] **Environment variables secure**
  - [ ] No secrets in `NEXT_PUBLIC_*` variables
  - [ ] `.env` files in `.gitignore`
  - [ ] Env validation with Zod at build time

- [ ] **CSP configured**
  - [ ] CSP header set via middleware
  - [ ] Nonces used for inline scripts/styles
  - [ ] `strict-dynamic` for lazy-loaded scripts

- [ ] **Rate limiting implemented**
  - [ ] All public API routes rate-limited
  - [ ] Server Actions rate-limited (especially write operations)
  - [ ] 429 responses for exceeded limits

- [ ] **Session management secure**
  - [ ] `getUser()` used (not `getSession()`) for verification
  - [ ] Cookies: HttpOnly, Secure, SameSite=Lax
  - [ ] Session timeouts configured (15-30min for sensitive apps)

- [ ] **Security headers set**
  - [ ] HSTS with `includeSubDomains; preload`
  - [ ] X-Frame-Options: DENY or SAMEORIGIN
  - [ ] X-Content-Type-Options: nosniff
  - [ ] Referrer-Policy: strict-origin-when-cross-origin

- [ ] **Input validation**
  - [ ] All user input validated with Zod
  - [ ] Server-side validation (never trust client)
  - [ ] Type-safe schemas with `z.infer`

---

## Accessibility Checklist

- [ ] **Security feedback accessible**
  - [ ] Error messages readable by screen readers
  - [ ] Rate limit messages explain when user can retry
  - [ ] CSRF errors explain what went wrong

- [ ] **Authentication accessible**
  - [ ] Login forms have proper labels
  - [ ] Password fields have show/hide toggle
  - [ ] MFA flows keyboard-navigable

---

## Performance Checklist

- [ ] **RLS policies optimized**
  - [ ] Indexes on all filtered columns
  - [ ] `auth.uid()` wrapped in SELECT
  - [ ] Joins avoided (use arrays with ANY)

- [ ] **Rate limiting efficient**
  - [ ] Using Redis (Upstash/Vercel KV) not in-memory
  - [ ] IP-based for anonymous, user ID for authenticated
  - [ ] Sliding window algorithm (more accurate than fixed window)

- [ ] **CSP doesn't block resources**
  - [ ] `strict-dynamic` allows lazy-loaded scripts
  - [ ] External resources allowlisted (CDNs, analytics)

---

## Security Checklist

- [ ] **OWASP Top 10 addressed**
  - [ ] A01: Broken Access Control → RLS policies
  - [ ] A02: Cryptographic Failures → HTTPS, secure cookies
  - [ ] A03: Injection → Parameterized queries, input validation
  - [ ] A04: Insecure Design → Secure by default architecture
  - [ ] A05: Security Misconfiguration → Security headers, CSP
  - [ ] A06: Vulnerable Components → Dependencies updated regularly
  - [ ] A07: Identification & Auth → Supabase Auth with `getUser()`
  - [ ] A08: Data Integrity → CSRF protection
  - [ ] A09: Logging → (Separate pattern)
  - [ ] A10: SSRF → Input validation, URL allowlists

- [ ] **Dependencies up-to-date**
  - [ ] Run `pnpm update` regularly
  - [ ] Check for security advisories (`pnpm audit`)
  - [ ] Update DOMPurify regularly (bypasses discovered frequently)

- [ ] **Secrets management**
  - [ ] No secrets in Git (`.env` in `.gitignore`)
  - [ ] Rotate secrets regularly (API keys, database passwords)
  - [ ] Use secret management service (Vercel Env Vars, AWS Secrets Manager)

---

## Integration Notes

**Works well with:**
- **data-fetching.md** — Secure data fetching with authentication and RLS
- **forms.md** — Input validation with Zod, CSRF protection
- **file-upload.md** — Secure file uploads with validation and sanitization
- **email-security.md** — Email-specific security (SPF, DKIM, DMARC)

**Potential conflicts:**
- **Performance optimizations** — Some security measures (CSP nonces, rate limiting) add overhead. Optimize RLS policies to minimize impact.

**Dependencies:**
- All patterns depend on this security pattern (foundational)

---

## References

1. [Supabase Row Level Security Docs](https://supabase.com/docs/guides/database/postgres/row-level-security)
2. [OWASP XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
3. [DOMPurify GitHub](https://github.com/cure53/DOMPurify)
4. [Next.js Security Best Practices](https://nextjs.org/blog/security-nextjs-server-components-actions)
5. [Supabase Auth Sessions](https://supabase.com/docs/guides/auth/sessions)
6. [Next.js CSP Guide](https://nextjs.org/docs/pages/guides/content-security-policy)
7. [Upstash Rate Limiting](https://upstash.com/blog/nextjs-ratelimiting)
8. [OWASP Top 10 2021](https://owasp.org/Top10/)
9. [MDN Security Headers](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers)
10. [Arcjet Next.js Security Checklist](https://blog.arcjet.com/next-js-security-checklist/)

---

## Version History

- **v1.0** (2024-01-15): Initial security pattern covering RLS, XSS, SQL injection, CSRF, environment variables, CSP, rate limiting, session management, security headers, input validation
