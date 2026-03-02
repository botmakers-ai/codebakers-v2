---
name: Data Fetching Pattern
tier: patterns
triggers: data fetching, TanStack Query, useQuery, queryKey, staleTime, gcTime, cacheTime, invalidate, prefetch, dependent queries
depends_on: null
conflicts_with: null
prerequisites: "TanStack Query v5 installed (@tanstack/react-query)"
description: Complete TanStack Query data fetching pattern covering QueryClientProvider setup, query key conventions, staleTime vs gcTime, dependent queries, parallel queries, prefetching, invalidation strategies, and error boundaries
---

# Pattern: Data Fetching

## What This Pattern Covers

This pattern covers data fetching with TanStack Query (React Query) v5, including QueryClientProvider setup, query key conventions (array format, uniqueness), staleTime vs gcTime configuration, background refetch strategies, dependent queries with `enabled`, parallel queries with `useQueries`, prefetch on hover, invalidation after mutations, error boundaries, and loading/error state handling.

Use this pattern as the foundation for all client-side data fetching in Next.js applications.

---

## When to Use This Pattern

- **All client-side data fetching** (API calls, database queries via API routes)
- **Caching frequently accessed data** (user profiles, settings, dashboards)
- **Real-time data that refreshes** (notifications, live feeds, dashboards)
- **Paginated or infinite scroll lists** (see pagination.md and infinite-scroll.md)
- **Optimistic updates** (see optimistic-updates.md for mutation patterns)
- **Prefetching user actions** (hover over link to prefetch detail page)
- **Managing loading and error states** across entire application

---

## When NOT to Use This Pattern

- **Server Components in Next.js App Router** — fetch directly in Server Components (no client library needed)
- **Static data at build time** — use Next.js generateStaticParams or getStaticProps (Pages Router)
- **One-time fetches without caching** — use plain fetch() in useEffect (if you truly don't need caching)
- **WebSocket streams** — use useEffect with WebSocket, though TanStack Query can cache results
- **File uploads** — use fetch() or FormData directly (see file-upload.md pattern)

---

## Architecture Overview

TanStack Query manages a client-side cache of server data with automatic background refetching, deduplication, and state management.

### Core Concepts

**1. Query Keys** — Unique identifiers for cached data
```
['users'] — all users
['users', userId] — specific user
['users', userId, 'posts'] — user's posts
```

**2. staleTime** — How long data stays "fresh" (no refetch)
```
staleTime: 0 — immediately stale (default) — refetch on mount, focus, reconnect
staleTime: 60000 — fresh for 60s — no refetch during this window
```

**3. gcTime** (formerly cacheTime) — How long inactive data stays in cache
```
gcTime: 300000 — cached for 5 minutes after last observer unmounts (default)
```

**4. Background Refetch** — Automatic refetch on window focus, reconnect, interval
```
refetchOnWindowFocus: true — refetch when user returns to tab (default)
refetchOnReconnect: true — refetch when network reconnects (default)
refetchInterval: false — no polling (default)
```

---

## Implementation

### Step 1: QueryClientProvider Setup

Wrap your Next.js app with QueryClientProvider (App Router or Pages Router).

```typescript
// app/providers.tsx (App Router)
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  // Create QueryClient in component state (not outside) to avoid sharing across requests
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Global defaults for all queries
            staleTime: 60000, // 60 seconds — adjust based on your data freshness needs
            gcTime: 300000, // 5 minutes (default)
            refetchOnWindowFocus: true, // Refetch on tab focus (good for real-time-ish data)
            refetchOnReconnect: true, // Refetch on network reconnect
            retry: 2, // Retry failed requests 2 times before giving up
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
          },
          mutations: {
            retry: 0, // Don't retry mutations by default
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* Show DevTools in development */}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}
```

```typescript
// app/layout.tsx
import { Providers } from './providers';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

### Step 2: Basic Query with Loading and Error States

Fetch data with useQuery, handle loading and error states.

```typescript
'use client';

import { useQuery } from '@tanstack/react-query';

interface User {
  id: string;
  name: string;
  email: string;
}

async function fetchUser(userId: string): Promise<User> {
  const res = await fetch(`/api/users/${userId}`);
  if (!res.ok) throw new Error('Failed to fetch user');
  return res.json();
}

export function UserProfile({ userId }: { userId: string }) {
  const {
    data: user,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['user', userId], // MUST be array, MUST include all variables
    queryFn: () => fetchUser(userId),
    staleTime: 60000, // Fresh for 60 seconds
    // gcTime: 300000, // Keep in cache for 5 minutes after unmount (default)
  });

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="h-8 bg-gray-200 rounded w-1/2 mb-2 animate-pulse" />
        <div className="h-4 bg-gray-200 rounded w-1/3 animate-pulse" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded">
        <p className="text-red-800">Failed to load user: {error.message}</p>
        <button
          onClick={() => refetch()}
          className="mt-2 text-sm text-red-600 underline"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold">{user.name}</h2>
      <p className="text-gray-600">{user.email}</p>
    </div>
  );
}
```

### Step 3: Query Key Conventions (Array Format, Variables, Order)

Query keys must follow strict conventions for proper caching and deduplication.

```typescript
'use client';

import { useQuery } from '@tanstack/react-query';

// ✅ CORRECT: Array format with all variables
useQuery({
  queryKey: ['posts'], // All posts
  queryFn: fetchAllPosts,
});

useQuery({
  queryKey: ['posts', postId], // Specific post
  queryFn: () => fetchPost(postId),
});

useQuery({
  queryKey: ['posts', { status: 'published', sort: 'date' }], // Posts with filters
  queryFn: () => fetchPosts({ status: 'published', sort: 'date' }),
});

// Order matters! These are DIFFERENT queries:
useQuery({
  queryKey: ['posts', 'published', 'newest'], // Query A
  queryFn: () => fetchPosts('published', 'newest'),
});

useQuery({
  queryKey: ['posts', 'newest', 'published'], // Query B (different from A!)
  queryFn: () => fetchPosts('newest', 'published'),
});

// Include ALL variables used in queryFn
function PostList({ userId, status }: { userId: string; status: string }) {
  const { data } = useQuery({
    queryKey: ['posts', userId, status], // Both variables in key
    queryFn: () => fetchPostsByUserAndStatus(userId, status),
  });

  return <div>{/* ... */}</div>;
}

// ❌ WRONG: Missing userId from key
useQuery({
  queryKey: ['posts', status], // WRONG — userId missing
  queryFn: () => fetchPostsByUserAndStatus(userId, status),
  // Problem: Different userIds will share cache because key doesn't include userId
});
```

### Step 4: Dependent Queries (Fetch B After A Completes)

Use `enabled` option to wait for prerequisite data before fetching.

```typescript
'use client';

import { useQuery } from '@tanstack/react-query';

interface User {
  id: string;
  organizationId: string;
}

interface Organization {
  id: string;
  name: string;
}

export function UserOrganization({ userId }: { userId: string }) {
  // Query 1: Fetch user
  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => fetchUser(userId),
  });

  // Query 2: Fetch organization (depends on user.organizationId)
  const { data: organization, isLoading: orgLoading } = useQuery({
    queryKey: ['organization', user?.organizationId],
    queryFn: () => fetchOrganization(user!.organizationId),
    enabled: !!user?.organizationId, // Only run when organizationId exists
    // This prevents: "Cannot read property 'organizationId' of undefined"
  });

  if (userLoading) return <div>Loading user...</div>;
  if (!user) return <div>User not found</div>;

  if (orgLoading) return <div>Loading organization...</div>;
  if (!organization) return <div>Organization not found</div>;

  return (
    <div>
      <h2>{user.name}</h2>
      <p>Organization: {organization.name}</p>
    </div>
  );
}
```

**Performance Note:** Dependent queries create a request waterfall (serial, not parallel). If possible, fetch both in parallel with a single API call.

### Step 5: Parallel Queries (Fetch Multiple at Once)

Use `useQueries` to fetch multiple queries in parallel with dynamic count.

```typescript
'use client';

import { useQueries } from '@tanstack/react-query';

interface User {
  id: string;
  name: string;
}

async function fetchUser(userId: string): Promise<User> {
  const res = await fetch(`/api/users/${userId}`);
  if (!res.ok) throw new Error('Failed to fetch user');
  return res.json();
}

export function MultiUserDisplay({ userIds }: { userIds: string[] }) {
  // Fetch all users in parallel
  const userQueries = useQueries({
    queries: userIds.map((userId) => ({
      queryKey: ['user', userId],
      queryFn: () => fetchUser(userId),
      staleTime: 60000,
    })),
  });

  // Check if all queries are loading
  const isLoading = userQueries.some((query) => query.isLoading);

  // Check if any query has error
  const hasError = userQueries.some((query) => query.isError);

  // Extract data from all queries
  const users = userQueries.map((query) => query.data).filter((user): user is User => !!user);

  if (isLoading) {
    return <div>Loading users...</div>;
  }

  if (hasError) {
    return (
      <div className="text-red-600">
        Failed to load some users
      </div>
    );
  }

  return (
    <ul>
      {users.map((user) => (
        <li key={user.id}>{user.name}</li>
      ))}
    </ul>
  );
}
```

### Step 6: Prefetch on Hover (Instant Navigation)

Prefetch data when user hovers link to make navigation feel instant.

```typescript
'use client';

import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';

interface Post {
  id: string;
  title: string;
}

async function fetchPost(postId: string): Promise<Post> {
  const res = await fetch(`/api/posts/${postId}`);
  if (!res.ok) throw new Error('Failed to fetch post');
  return res.json();
}

export function PostLink({ post }: { post: { id: string; title: string } }) {
  const queryClient = useQueryClient();

  function handleMouseEnter() {
    // Prefetch post data on hover
    queryClient.prefetchQuery({
      queryKey: ['post', post.id],
      queryFn: () => fetchPost(post.id),
      staleTime: 60000,
    });
  }

  return (
    <Link
      href={`/posts/${post.id}`}
      onMouseEnter={handleMouseEnter}
      onFocus={handleMouseEnter} // Also prefetch on keyboard focus
      className="text-blue-600 hover:underline"
    >
      {post.title}
    </Link>
  );
}

// On the destination page, data is already cached:
export function PostDetail({ postId }: { postId: string }) {
  const { data: post } = useQuery({
    queryKey: ['post', postId],
    queryFn: () => fetchPost(postId),
    staleTime: 60000,
  });

  // If user hovered link, data loads instantly from cache!
  // Otherwise, fetches on mount as usual.

  return <div>{post?.title}</div>;
}
```

### Step 7: Invalidate Queries After Mutation

After creating/updating/deleting data, invalidate related queries to trigger refetch.

```typescript
'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

async function createPost(data: { title: string; content: string }): Promise<Post> {
  const res = await fetch('/api/posts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create post');
  return res.json();
}

export function CreatePostForm() {
  const queryClient = useQueryClient();

  const createPostMutation = useMutation({
    mutationFn: createPost,

    onSuccess: (newPost) => {
      // Invalidate all queries that start with ['posts']
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      // This triggers refetch for:
      // - ['posts'] (all posts list)
      // - ['posts', userId] (user's posts)
      // - ['posts', { status: 'published' }] (filtered posts)

      // Optionally, set the new post in cache immediately:
      queryClient.setQueryData(['post', newPost.id], newPost);
    },

    onError: (error) => {
      console.error('Failed to create post:', error);
    },
  });

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createPostMutation.mutate({
      title: formData.get('title') as string,
      content: formData.get('content') as string,
    });
  }

  return (
    <form onSubmit={handleSubmit}>
      <input name="title" placeholder="Title" required />
      <textarea name="content" placeholder="Content" required />
      <button type="submit" disabled={createPostMutation.isPending}>
        {createPostMutation.isPending ? 'Creating...' : 'Create Post'}
      </button>
    </form>
  );
}
```

### Step 8: Error Boundaries for Query Errors

Use React Error Boundary with TanStack Query's QueryErrorResetBoundary.

```typescript
// components/error-boundary.tsx
'use client';

import { Component, ReactNode } from 'react';
import { QueryErrorResetBoundary } from '@tanstack/react-query';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundaryInner extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 bg-red-50 border border-red-200 rounded">
          <h2 className="text-red-800 font-bold">Something went wrong</h2>
          <p className="text-red-600 text-sm mt-1">{this.state.error?.message}</p>
        </div>
      );
    }

    return this.props.children;
  }
}

export function ErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundaryInner key={reset}>{children}</ErrorBoundaryInner>
      )}
    </QueryErrorResetBoundary>
  );
}
```

```typescript
// app/some-page.tsx
import { ErrorBoundary } from '@/components/error-boundary';

export default function Page() {
  return (
    <ErrorBoundary>
      <UserProfile userId="123" />
    </ErrorBoundary>
  );
}
```

---

## Integration With Other Patterns

**This pattern works with:**
- **pagination.md** — useQuery or useInfiniteQuery for paginated lists
- **infinite-scroll.md** — useInfiniteQuery for infinite scroll
- **optimistic-updates.md** — useMutation with onMutate for instant feedback
- **performance.md** — Prefetching, caching, and staleTime optimization reduce network requests

**This pattern conflicts with:**
- N/A — TanStack Query is the foundation for most other client-side patterns

---

## Error Handling

### 1. Network Failure with Retry

```typescript
const { data, error, isError, refetch } = useQuery({
  queryKey: ['user', userId],
  queryFn: fetchUser,
  retry: 3, // Retry 3 times on failure
  retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
});

if (isError) {
  return (
    <div className="p-4 bg-red-50 border border-red-200">
      <p className="text-red-800">Error: {error.message}</p>
      <button onClick={() => refetch()} className="mt-2 text-sm text-red-600 underline">
        Retry
      </button>
    </div>
  );
}
```

### 2. Conditional Error Handling (Ignore 404, Show Others)

```typescript
const { data, error, isError } = useQuery({
  queryKey: ['user', userId],
  queryFn: async () => {
    const res = await fetch(`/api/users/${userId}`);
    if (res.status === 404) {
      return null; // Return null instead of throwing — not an error
    }
    if (!res.ok) {
      throw new Error(`Failed to fetch user: ${res.statusText}`);
    }
    return res.json();
  },
});

if (data === null) {
  return <div>User not found</div>; // Gracefully handle 404
}

if (isError) {
  return <div className="text-red-600">Error: {error.message}</div>; // Show other errors
}
```

### 3. Global Error Handler

```typescript
// app/providers.tsx
const [queryClient] = useState(
  () =>
    new QueryClient({
      defaultOptions: {
        queries: {
          onError: (error) => {
            // Global error handler for all queries
            console.error('Query error:', error);

            // Could send to error tracking service
            // Sentry.captureException(error);
          },
        },
      },
    })
);
```

---

## Testing Checklist

- [ ] **Query key includes all variables** used in queryFn
- [ ] **Query key order consistent** across application
- [ ] **Loading state shows** while data fetches
- [ ] **Error state shows** with retry option
- [ ] **staleTime set appropriately** (0 for real-time, 60000+ for static data)
- [ ] **gcTime >= staleTime** (best practice — keep cached data available while stale)
- [ ] **Dependent queries use enabled** to prevent premature execution
- [ ] **Parallel queries use useQueries** when fetching dynamic count
- [ ] **Prefetch on hover works** (check DevTools Network tab)
- [ ] **Invalidation triggers refetch** after mutations
- [ ] **Duplicate requests prevented** (TanStack Query deduplicates automatically)
- [ ] **DevTools show cache state** correctly in development
- [ ] **Error boundary catches query errors** (if using throwOnError: true)

---

## Common Mistakes — Never Do These

### 1. Duplicate Query Keys (Cache Collision)

**Wrong:**
```typescript
// Component A
useQuery({
  queryKey: ['user'], // Missing userId — all users share same cache!
  queryFn: () => fetchUser(userId),
});

// Component B with different userId
useQuery({
  queryKey: ['user'], // Same key — wrong user data returned from cache!
  queryFn: () => fetchUser(differentUserId),
});
```

**Why it's wrong:** Both components share the same cache entry. Component B gets Component A's user data.

**Correct:**
```typescript
// Component A
useQuery({
  queryKey: ['user', userId], // Unique per user
  queryFn: () => fetchUser(userId),
});

// Component B
useQuery({
  queryKey: ['user', differentUserId], // Different key, different cache
  queryFn: () => fetchUser(differentUserId),
});
```

---

### 2. Not Setting staleTime (Refetch on Every Mount)

**Wrong:**
```typescript
useQuery({
  queryKey: ['user', userId],
  queryFn: fetchUser,
  // No staleTime — defaults to 0 (immediately stale)
});

// User navigates to profile page, back to list, back to profile
// Each navigation = new fetch request, even though data hasn't changed
```

**Why it's wrong:** staleTime: 0 (default) means data is immediately stale. Every mount triggers refetch, wasting network requests and showing loading spinners unnecessarily.

**Correct:**
```typescript
useQuery({
  queryKey: ['user', userId],
  queryFn: fetchUser,
  staleTime: 60000, // Fresh for 60 seconds — no refetch during this window
});

// User navigates back and forth — data loaded from cache instantly (no loading spinner)
// After 60 seconds, background refetch happens to sync with server
```

---

### 3. Invalidating Everything After One Mutation

**Wrong:**
```typescript
const createPostMutation = useMutation({
  mutationFn: createPost,

  onSuccess: () => {
    // Invalidate ALL queries in the cache
    queryClient.invalidateQueries(); // NO FILTER — refetches everything!
  },
});

// Creates one post → refetches users, settings, notifications, everything
```

**Why it's wrong:** Invalidates unrelated queries, causing unnecessary network requests and loading states.

**Correct:**
```typescript
const createPostMutation = useMutation({
  mutationFn: createPost,

  onSuccess: () => {
    // Invalidate only queries starting with ['posts']
    queryClient.invalidateQueries({ queryKey: ['posts'] });
    // Only refetches: ['posts'], ['posts', userId], ['posts', { status: 'published' }]
    // Leaves unrelated queries alone: ['users'], ['settings'], etc.
  },
});
```

---

### 4. Not Handling Loading/Error States

**Wrong:**
```typescript
function UserProfile({ userId }: { userId: string }) {
  const { data: user } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => fetchUser(userId),
  });

  // No loading or error checks — user is undefined while loading!
  return <div>{user.name}</div>; // TypeError: Cannot read property 'name' of undefined
}
```

**Why it's wrong:** `data` is undefined while loading and on error. Accessing `user.name` throws error.

**Correct:**
```typescript
function UserProfile({ userId }: { userId: string }) {
  const { data: user, isLoading, isError, error } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => fetchUser(userId),
  });

  if (isLoading) return <div>Loading...</div>;
  if (isError) return <div>Error: {error.message}</div>;
  if (!user) return <div>User not found</div>;

  return <div>{user.name}</div>; // Safe — user is defined
}
```

---

### 5. Fetching in useEffect Instead of useQuery

**Wrong:**
```typescript
function UserProfile({ userId }: { userId: string }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchUser(userId)
      .then((data) => {
        setUser(data);
        setLoading(false);
      })
      .catch((error) => {
        console.error(error);
        setLoading(false);
      });
  }, [userId]);

  // No caching, no deduplication, no background refetch, no retry logic
  if (loading) return <div>Loading...</div>;
  return <div>{user?.name}</div>;
}
```

**Why it's wrong:** Manual state management loses all TanStack Query benefits: caching, deduplication, background refetch, retry, stale-while-revalidate, DevTools.

**Correct:**
```typescript
function UserProfile({ userId }: { userId: string }) {
  const { data: user, isLoading } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => fetchUser(userId),
    staleTime: 60000,
  });

  // Automatic caching, deduplication, background refetch, retry, DevTools
  if (isLoading) return <div>Loading...</div>;
  return <div>{user?.name}</div>;
}
```

---

## Performance Considerations

### staleTime Configuration

```typescript
// Real-time data (frequently changing)
staleTime: 0 // Always refetch on mount, focus, reconnect (default)

// Semi-static data (changes occasionally)
staleTime: 60000 // 60 seconds — good for user profiles, settings

// Static data (rarely changes)
staleTime: 300000 // 5 minutes — good for reference data, configuration

// Effectively static
staleTime: Infinity // Never mark as stale — only refetch on explicit invalidation
```

### gcTime Best Practice

```typescript
// Keep gcTime >= staleTime
staleTime: 60000, // Fresh for 60 seconds
gcTime: 300000, // Cached for 5 minutes after unmount (default)

// Why? Stale data is still useful! Serve from cache instantly, refetch in background.
```

### Prefetch Threshold

```typescript
// Prefetch when user is 75% scrolled down the page
useEffect(() => {
  const handleScroll = () => {
    const scrollPercentage =
      (window.scrollY + window.innerHeight) / document.documentElement.scrollHeight;

    if (scrollPercentage > 0.75 && hasNextPage) {
      queryClient.prefetchQuery({
        queryKey: ['posts', page + 1],
        queryFn: () => fetchPosts(page + 1),
      });
    }
  };

  window.addEventListener('scroll', handleScroll);
  return () => window.removeEventListener('scroll', handleScroll);
}, [page, hasNextPage]);
```

---

## Accessibility Checklist

- [ ] **Loading state communicated** to screen readers (aria-live="polite" or role="status")
- [ ] **Error messages descriptive** and include retry option
- [ ] **Loading spinners have aria-label** describing what's loading
- [ ] **Focus management** — don't move focus during background refetch
- [ ] **Skeleton loaders** match final content structure (avoid layout shift)

---

## Security Checklist

- [ ] **Server validates all requests** — never trust client-provided query params
- [ ] **Verify user authorization** on server before returning data
- [ ] **Use RLS policies** in Supabase to enforce row-level permissions
- [ ] **Rate limiting enforced** on API routes
- [ ] **Sensitive data never cached** in queryClient (or use private queryKey)
- [ ] **HTTPS used** for all API requests (no HTTP)

---

## Pre-Implementation Checklist

Before declaring TanStack Query setup complete in your codebase:

- [ ] **QueryClientProvider configured** in app layout/providers
- [ ] **DevTools installed** for development (@tanstack/react-query-devtools)
- [ ] **Global defaults set** (staleTime, gcTime, retry) in QueryClient
- [ ] **Query key conventions documented** (array format, include all variables)
- [ ] **Error boundaries set up** for query errors (if using throwOnError)
- [ ] **All queries handle loading/error states**
- [ ] **All mutations invalidate related queries**
- [ ] **Prefetching implemented** for common user paths (hover, scroll)
- [ ] **staleTime tuned** for different data types (real-time vs static)
- [ ] **useQueries used** for parallel fetches (not multiple useQuery calls)
- [ ] **Dependent queries use enabled** to prevent premature execution

---

## References

- [TanStack Query v5 Documentation](https://tanstack.com/query/latest/docs/framework/react/overview)
- [Query Keys Guide](https://tanstack.com/query/v5/docs/framework/react/guides/query-keys)
- [staleTime vs gcTime Explanation](https://tanstack.com/query/v5/docs/react/guides/caching)
- [Prefetching Guide](https://tanstack.com/query/latest/docs/framework/react/guides/prefetching)
- [Dependent Queries Guide](https://tanstack.com/query/latest/docs/framework/react/guides/dependent-queries)

---

*CodeBakers V4 | Pattern: Data Fetching | agents/patterns/data-fetching.md*
