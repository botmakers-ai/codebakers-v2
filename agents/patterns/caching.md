---
triggers:
  - "caching"
  - "cache invalidation"
  - "HTTP cache"
  - "Redis"
  - "CDN"
  - "TanStack Query cache"
  - "stale-while-revalidate"
  - "cache stampede"
  - "ETag"
  - "Cache-Control"

depends_on:
  - data-fetching.md (TanStack Query caching)
  - performance.md (optimization strategies)
  - offline-first.md (browser storage, IndexedDB)

prerequisites:
  - Next.js App Router
  - TypeScript
  - Understanding of HTTP headers
  - Understanding of cache coherence

description: |
  Production-ready caching strategies covering: HTTP cache headers (Cache-Control, ETag, immutable), TanStack Query (staleTime, gcTime, invalidation), Next.js ISR (revalidation, on-demand purge), CDN caching (Cloudflare purge, tag-based invalidation), Redis patterns (cache-aside, TTL with jitter), browser storage (localStorage, IndexedDB), stale-while-revalidate, cache stampede prevention, and anti-patterns (over-caching, cache coherence negligence).
---

# Caching Pattern

## Research Foundation

**Searches performed:**
1. HTTP caching headers Cache-Control ETag 2025 best practices
2. TanStack Query cache invalidation staleTime gcTime 2025
3. Next.js caching fetch revalidate ISR 2025
4. CDN caching strategies Cloudflare cache purge 2024
5. Redis caching patterns TTL cache aside 2024
6. Cache invalidation patterns webhook purge 2024
7. Browser caching localStorage sessionStorage IndexedDB 2025
8. Stale-while-revalidate SWR pattern Next.js 2025
9. Cache stampede thundering herd prevention 2024
10. Cache anti-patterns over-caching cache coherence 2024

**Key findings:**
- **Cache-busting pattern is 2025 standard** — versioned URLs + `immutable` directive = 1 year max-age, no CDN purge needed
- **TanStack Query v5 renamed cacheTime → gcTime** — staleTime (freshness), gcTime (memory retention, default 5 min)
- **Next.js 15 ISR with stale-while-revalidate** — revalidateTag() now supports `profile="max"` semantics
- **Cloudflare purge <150ms globally** (90% improvement since May 2022) — all purge methods available for all plans
- **Redis cache-aside with TTL jitter** — prevents cache stampede by adding random 1-10% to TTL
- **Probabilistic early expiration (XFetch)** — optimal stampede prevention with exponential distribution
- **Browser storage quotas 2025** — localStorage/sessionStorage 5-10 MB, IndexedDB hundreds of MB to GBs
- **SWR HTTP header underutilized** — Fastly supports, Cloudflare doesn't (as of 2024), Cloudfront added 2023
- **HybridCache (Microsoft 2024)** — request coalescing prevents duplicate work during cache stampede
- **Over-caching is top anti-pattern** — caching infrequently accessed data wastes memory, increases complexity

---

## Core Principles

1. **Cache-bust with versioned URLs** — `/assets/app-[hash].js` + `immutable` = no purge needed
2. **Shortest viable TTL** — cache as long as tolerable, not as long as possible
3. **Stale-while-revalidate everywhere** — instant response + background refresh
4. **Invalidate, don't purge** — refresh files in background, serve latest when ready
5. **Prevent cache stampede** — use distributed locking, request coalescing, or probabilistic early expiration
6. **Tag-based invalidation** — group related assets for bulk purge (Cloudflare Cache-Tag header)
7. **Monitor cache hit ratio** — target 80%+ for static assets, 50-70% for dynamic data

---

## 1. HTTP Cache Headers (Static Assets)

### Cache-Busting Pattern with Immutable

```typescript
// next.config.mjs
export default {
  // Next.js adds content hashes automatically
  assetPrefix: process.env.CDN_URL, // Optional CDN

  async headers() {
    return [
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            // Fingerprinted assets get 1 year + immutable
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/images/:path*',
        headers: [
          {
            key: 'Cache-Control',
            // Images with versioned names
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};
```

**Why immutable?**
- Tells browsers/CDNs: "This file will never change"
- Skips revalidation requests (ETag/If-None-Match)
- Works because filename changes when content changes (`app-abc123.js` → `app-def456.js`)

### HTML with Stale-While-Revalidate

```typescript
// app/api/some-page/route.ts
export async function GET() {
  const html = `<!DOCTYPE html>...`;

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html',
      // Browser: 5 min fresh, CDN: 15 min fresh, both can serve stale for 1 hour
      'Cache-Control': 'public, max-age=300, s-maxage=900, stale-while-revalidate=3600',
      'ETag': generateETag(html), // Hash of content
    },
  });
}

function generateETag(content: string): string {
  const crypto = require('crypto');
  return `"${crypto.createHash('md5').update(content).digest('hex')}"`;
}
```

**Cache-Control directives:**
- `max-age=300` — Browser caches for 5 minutes
- `s-maxage=900` — CDN caches for 15 minutes (overrides max-age for shared caches)
- `stale-while-revalidate=3600` — Serve stale for 1 hour while fetching fresh copy in background

### ETag for Conditional Requests

```typescript
// app/api/data/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const data = await fetchData();
  const etag = generateETag(JSON.stringify(data));

  // Check If-None-Match header
  const clientEtag = req.headers.get('If-None-Match');

  if (clientEtag === etag) {
    // Content hasn't changed — 304 Not Modified (no body)
    return new NextResponse(null, {
      status: 304,
      headers: {
        'ETag': etag,
        'Cache-Control': 'public, max-age=60',
      },
    });
  }

  // Content changed — send full response
  return NextResponse.json(data, {
    headers: {
      'ETag': etag,
      'Cache-Control': 'public, max-age=60',
    },
  });
}
```

**Bandwidth savings:**
- 304 response = ~150 bytes (headers only)
- Full response = 10+ KB
- 98%+ bandwidth reduction for unchanged content

---

## 2. TanStack Query Client-Side Caching

### Configuration

```typescript
// lib/queryClient.ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute — data "fresh" for this duration
      gcTime: 5 * 60 * 1000, // 5 minutes — inactive data stays in memory (renamed from cacheTime in v5)
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
      refetchOnWindowFocus: true, // Re-fetch stale data when user returns to tab
      refetchOnReconnect: true, // Re-fetch when network reconnects
    },
  },
});
```

**staleTime vs gcTime:**
- **staleTime** — How long data is "fresh" (no refetch needed)
- **gcTime** — How long inactive data stays in memory before garbage collection
- **Rule:** `gcTime >= staleTime` (serve stale data instantly while refetching)

### Cache Invalidation with Tags

```typescript
// components/TodoList.tsx
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function TodoList() {
  const queryClient = useQueryClient();

  const { data: todos } = useQuery({
    queryKey: ['todos'], // Cache key
    queryFn: async () => {
      const res = await fetch('/api/todos');
      return res.json();
    },
  });

  const addTodoMutation = useMutation({
    mutationFn: async (newTodo: { title: string }) => {
      const res = await fetch('/api/todos', {
        method: 'POST',
        body: JSON.stringify(newTodo),
      });
      return res.json();
    },
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['todos'] });
    },
  });

  const deleteTodoMutation = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/todos/${id}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todos'] });
    },
  });

  return (
    <div>
      {todos?.map((todo) => (
        <div key={todo.id}>
          {todo.title}
          <button onClick={() => deleteTodoMutation.mutate(todo.id)}>Delete</button>
        </div>
      ))}
    </div>
  );
}
```

### Prefetching for Instant Navigation

```typescript
// components/UserList.tsx
'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';

export function UserList() {
  const queryClient = useQueryClient();

  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers,
  });

  function handleMouseEnter(userId: string) {
    // Prefetch user details on hover
    queryClient.prefetchQuery({
      queryKey: ['user', userId],
      queryFn: () => fetchUser(userId),
      staleTime: 60 * 1000,
    });
  }

  return (
    <div>
      {users?.map((user) => (
        <a
          key={user.id}
          href={`/users/${user.id}`}
          onMouseEnter={() => handleMouseEnter(user.id)}
        >
          {user.name}
        </a>
      ))}
    </div>
  );
}
```

---

## 3. Next.js ISR with On-Demand Revalidation

### Time-Based Revalidation

```typescript
// app/posts/page.tsx
export const revalidate = 3600; // Revalidate every 1 hour

export default async function PostsPage() {
  const posts = await fetch('https://api.example.com/posts', {
    next: { revalidate: 3600 }, // Per-fetch override
  }).then((res) => res.json());

  return (
    <div>
      {posts.map((post) => (
        <div key={post.id}>{post.title}</div>
      ))}
    </div>
  );
}
```

### On-Demand Revalidation with Tags

```typescript
// app/posts/page.tsx
export default async function PostsPage() {
  const posts = await fetch('https://api.example.com/posts', {
    next: { tags: ['posts'] }, // Tag for on-demand invalidation
  }).then((res) => res.json());

  return <div>{/* Render posts */}</div>;
}
```

```typescript
// app/api/revalidate/route.ts
import { revalidateTag } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const body = await req.json();

  // Verify webhook signature (Stripe, GitHub, etc.)
  if (!verifySignature(req, body)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Revalidate tagged cache
  revalidateTag('posts'); // Invalidates all fetches with tag 'posts'

  return NextResponse.json({ revalidated: true, now: Date.now() });
}

function verifySignature(req: NextRequest, body: any): boolean {
  // Implement signature verification
  return true;
}
```

**Webhook flow:**
1. CMS publishes new post
2. CMS sends webhook to `/api/revalidate`
3. Signature verified
4. `revalidateTag('posts')` invalidates cache
5. Next request gets fresh data

---

## 4. CDN Caching with Cloudflare

### Cache-Tag Header for Grouped Invalidation

```typescript
// app/api/posts/[id]/route.ts
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const post = await fetchPost(params.id);

  return NextResponse.json(post, {
    headers: {
      'Cache-Control': 'public, s-maxage=3600',
      'Cache-Tag': `post-${params.id}, posts, author-${post.authorId}`,
    },
  });
}
```

### Purge by Tag

```bash
curl -X POST "https://api.cloudflare.com/client/v4/zones/YOUR_ZONE_ID/purge_cache" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"tags":["posts"]}'
```

**Use cases:**
- Purge all posts: `{"tags": ["posts"]}`
- Purge specific post: `{"tags": ["post-123"]}`
- Purge author's posts: `{"tags": ["author-456"]}`

### Purge on Deploy (Automated)

```typescript
// scripts/purge-cloudflare-cache.ts
const CLOUDFLARE_ZONE_ID = process.env.CLOUDFLARE_ZONE_ID;
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;

async function purgeCache() {
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/purge_cache`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ purge_everything: true }),
    }
  );

  const result = await response.json();
  console.log('Cache purged:', result);
}

purgeCache();
```

---

## 5. Redis Caching Patterns

### Cache-Aside with TTL Jitter

```typescript
// lib/redis.ts
import { createClient } from 'redis';

const redis = createClient({
  url: process.env.REDIS_URL,
});

redis.connect();

export async function getCachedData<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttlSeconds: number = 3600
): Promise<T> {
  // Check cache first
  const cached = await redis.get(key);

  if (cached) {
    return JSON.parse(cached) as T;
  }

  // Cache miss — fetch from source
  const data = await fetchFn();

  // Add jitter to TTL (prevents cache stampede)
  const jitter = Math.random() * 0.1 * ttlSeconds; // 0-10% jitter
  const ttlWithJitter = Math.floor(ttlSeconds + jitter);

  // Store in cache
  await redis.setEx(key, ttlWithJitter, JSON.stringify(data));

  return data;
}
```

**Why TTL jitter?**
- Prevents synchronized expiration
- 1000 keys expire at same time → 1000 DB queries at once
- Jitter spreads expirations over time → smoother load

### Cache-Aside with API Route

```typescript
// app/api/users/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getCachedData } from '@/lib/redis';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCachedData(
    `user:${params.id}`,
    () => fetchUserFromDatabase(params.id),
    3600 // 1 hour TTL
  );

  return NextResponse.json(user);
}

async function fetchUserFromDatabase(id: string) {
  // Fetch from Postgres, etc.
  return { id, name: 'John Doe' };
}
```

---

## 6. Cache Stampede Prevention

### Probabilistic Early Expiration (XFetch Algorithm)

```typescript
// lib/cache-with-xfetch.ts
export async function getCachedWithXFetch<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttlSeconds: number = 3600
): Promise<T> {
  const cached = await redis.get(key);

  if (cached) {
    const { data, expiresAt } = JSON.parse(cached);
    const now = Date.now();
    const timeToExpire = expiresAt - now;

    // Probabilistic early expiration
    const delta = Math.random() * ttlSeconds * 1000; // Random jitter
    const beta = 1; // Tuning parameter (1 is optimal)

    if (timeToExpire < delta * beta * Math.log(Math.random())) {
      // Recompute early (prevents stampede)
      const freshData = await fetchFn();
      const newExpiresAt = Date.now() + ttlSeconds * 1000;

      await redis.setEx(
        key,
        ttlSeconds,
        JSON.stringify({ data: freshData, expiresAt: newExpiresAt })
      );

      return freshData;
    }

    return data as T;
  }

  // Cache miss
  const data = await fetchFn();
  const expiresAt = Date.now() + ttlSeconds * 1000;

  await redis.setEx(
    key,
    ttlSeconds,
    JSON.stringify({ data, expiresAt })
  );

  return data;
}
```

### Request Coalescing (Singleflight)

```typescript
// lib/singleflight.ts
const inflightRequests = new Map<string, Promise<any>>();

export async function singleflight<T>(
  key: string,
  fn: () => Promise<T>
): Promise<T> {
  // Check if request already in-flight
  if (inflightRequests.has(key)) {
    return inflightRequests.get(key)!;
  }

  // Start new request
  const promise = fn().finally(() => {
    inflightRequests.delete(key);
  });

  inflightRequests.set(key, promise);

  return promise;
}
```

```typescript
// Usage in API route
export async function GET(req: NextRequest) {
  const data = await singleflight('expensive-query', async () => {
    return await expensiveQuery();
  });

  return NextResponse.json(data);
}
```

**How it works:**
- 100 requests arrive simultaneously for same key
- First request starts, others wait
- All 100 requests get same result
- Only 1 DB query executed

---

## Anti-Patterns

### Anti-Pattern 1: No Cache Headers

**❌ WRONG:**
```typescript
export async function GET() {
  const data = await fetchData();
  return NextResponse.json(data);
  // No Cache-Control — browser/CDN don't cache
}
```

**Problem:** Every request hits server. CDN useless. 100x more origin requests.

**✅ CORRECT:**
```typescript
export async function GET() {
  const data = await fetchData();

  return NextResponse.json(data, {
    headers: {
      'Cache-Control': 'public, max-age=60, stale-while-revalidate=3600',
    },
  });
}
```

---

### Anti-Pattern 2: Using `max-age=0` Without Validator

**❌ WRONG:**
```typescript
// HTML response
headers: {
  'Cache-Control': 'max-age=0',
  // No ETag or Last-Modified
}
// Guarantees full download every time
```

**Problem:** Browser makes full request every time. No bandwidth savings. No 304 responses.

**✅ CORRECT:**
```typescript
headers: {
  'Cache-Control': 'public, max-age=0, must-revalidate',
  'ETag': generateETag(content),
}
// Enables 304 Not Modified responses
```

---

### Anti-Pattern 3: Caching User-Specific Data Publicly

**❌ WRONG:**
```typescript
// Returns different data per user
export async function GET() {
  const userId = getCurrentUser();
  const userData = await fetchUserData(userId);

  return NextResponse.json(userData, {
    headers: {
      'Cache-Control': 'public, max-age=3600', // WRONG: public cache for private data
    },
  });
}
```

**Problem:** User A's data cached and served to User B. Privacy violation. GDPR breach.

**✅ CORRECT:**
```typescript
export async function GET() {
  const userId = getCurrentUser();
  const userData = await fetchUserData(userId);

  return NextResponse.json(userData, {
    headers: {
      'Cache-Control': 'private, max-age=300', // private = browser-only cache
      'Vary': 'Cookie', // Cache separate copies per cookie value
    },
  });
}
```

---

### Anti-Pattern 4: Over-Caching (Caching Everything)

**❌ WRONG:**
```typescript
// Cache every API response
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Infinity, // Never refetch
      gcTime: Infinity, // Never evict
    },
  },
});
```

**Problem:** Memory bloat. Stale data forever. Cache invalidation nightmare.

**✅ CORRECT:**
```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute for most data
      gcTime: 5 * 60 * 1000, // 5 minutes in memory
    },
  },
});

// Override for specific queries
useQuery({
  queryKey: ['static-config'],
  queryFn: fetchConfig,
  staleTime: Infinity, // Only cache static data forever
});
```

---

### Anti-Pattern 5: No Cache Stampede Protection

**❌ WRONG:**
```typescript
async function getCachedData(key: string) {
  const cached = await redis.get(key);

  if (!cached) {
    // 1000 concurrent requests all miss cache
    const data = await expensiveQuery(); // 1000 DB queries fire
    await redis.setEx(key, 3600, JSON.stringify(data));
    return data;
  }

  return JSON.parse(cached);
}
```

**Problem:** Cache expires → 1000 simultaneous requests → 1000 DB queries → database crashes.

**✅ CORRECT:** Use request coalescing:
```typescript
async function getCachedData(key: string) {
  const cached = await redis.get(key);

  if (!cached) {
    // Only first request queries DB, others wait
    const data = await singleflight(key, () => expensiveQuery());
    await redis.setEx(key, 3600, JSON.stringify(data));
    return data;
  }

  return JSON.parse(cached);
}
```

---

## Testing Checklist

- [ ] **HTTP cache headers**
  - [ ] Static assets have `max-age=31536000, immutable`
  - [ ] HTML has `stale-while-revalidate`
  - [ ] ETag generated for dynamic content
  - [ ] 304 Not Modified responses work
  - [ ] `s-maxage` set for CDN-specific TTL

- [ ] **TanStack Query**
  - [ ] staleTime configured appropriately (60s default)
  - [ ] gcTime >= staleTime
  - [ ] Cache invalidation triggers on mutations
  - [ ] Prefetching used for instant navigation

- [ ] **Next.js ISR**
  - [ ] revalidate configured for time-based refresh
  - [ ] Tags added for on-demand revalidation
  - [ ] Webhook endpoint secured (signature verification)
  - [ ] revalidateTag() called after CMS updates

- [ ] **CDN**
  - [ ] Cache-Tag headers set for grouped invalidation
  - [ ] Purge API integrated into deploy pipeline
  - [ ] Cache hit ratio >80% for static assets

- [ ] **Redis**
  - [ ] TTL jitter added to prevent synchronized expiration
  - [ ] Cache-aside pattern implemented correctly
  - [ ] Request coalescing prevents stampede

---

## Performance Checklist

- [ ] **Cache hit ratio**
  - [ ] Monitor with CDN analytics (target 80%+ static, 50-70% dynamic)
  - [ ] Low hit ratio → increase TTLs or add more cache tags

- [ ] **Cache size**
  - [ ] Redis memory usage monitored
  - [ ] Eviction policy configured (`allkeys-lru`)
  - [ ] Large responses excluded from cache (>1MB)

- [ ] **Invalidation latency**
  - [ ] Cloudflare purge <150ms globally
  - [ ] On-demand revalidation triggers within 1s

---

## Integration Notes

**Works well with:**
- **data-fetching.md** — TanStack Query provides client-side caching layer
- **performance.md** — Caching is primary performance optimization
- **offline-first.md** — Browser storage extends caching to offline scenarios

**Dependencies:**
- Depends on `data-fetching.md` for TanStack Query patterns
- Depends on `performance.md` for Core Web Vitals impact

---

## References

1. [MDN: HTTP Caching](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Caching)
2. [TanStack Query: Caching](https://tanstack.com/query/latest/docs/framework/react/guides/caching)
3. [Next.js: Caching and Revalidating](https://nextjs.org/docs/app/guides/caching)
4. [Cloudflare: Cache Purge](https://developers.cloudflare.com/cache/how-to/purge-cache/)
5. [Redis: Cache-Aside Pattern](https://redis.io/tutorials/howtos/solutions/microservices/caching/)
6. [RFC 5861: HTTP Cache-Control Extensions for Stale Content](https://datatracker.ietf.org/doc/html/rfc5861)

---

## Version History

- **v1.0** (2025-01-15): Initial caching pattern covering HTTP headers (Cache-Control, ETag, immutable), TanStack Query (staleTime, gcTime, invalidation), Next.js ISR (revalidation, tags), CDN caching (Cloudflare purge, Cache-Tag), Redis patterns (cache-aside, TTL jitter, XFetch), cache stampede prevention (request coalescing, probabilistic early expiration), anti-patterns (over-caching, no validators, cache coherence negligence)
