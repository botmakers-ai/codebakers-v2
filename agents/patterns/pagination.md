---
name: Pagination Pattern
tier: patterns
triggers: pagination, page navigation, load more, cursor pagination, offset pagination, Graph API pagination
depends_on: null
conflicts_with: null
prerequisites: "TanStack Query installed, API route returning paginated data"
description: Complete pagination pattern for Next.js apps covering cursor-based and offset-based approaches, Graph API integration, accessibility, and performance optimization
---

# Pattern: Pagination

## What This Pattern Covers

This pattern covers pagination implementation for Next.js applications using both cursor-based and offset-based approaches. It addresses API integration (especially Microsoft Graph API), TanStack Query patterns, accessibility requirements (WCAG AA), performance optimization with database indexes, and security considerations for user-controlled parameters.

Use this pattern when displaying lists of data that exceed reasonable rendering limits (50+ items) or when working with APIs that enforce pagination.

---

## When to Use This Pattern

- Displaying paginated lists with 50+ items from a database or API
- Loading data from Microsoft Graph API (which requires cursor-based pagination with $skipToken)
- Implementing "Load More" buttons or traditional page number navigation
- Search results where users paginate through findings
- Admin dashboards with table views of records
- E-commerce product listings with numbered pages
- Any list where fetching all items at once would be slow or expensive

---

## When NOT to Use This Pattern

- **Small fixed datasets (<20 items)** — render all at once, use client-side filtering/sorting
- **Real-time feeds requiring newest-first** — use WebSocket push or polling, not pagination
- **CSV/Excel export** — use server-side streaming, not paginated fetches
- **Infinite scroll on fast-changing data** — use infinite-scroll.md pattern instead
- **Data that users need to see all at once** (e.g., shopping cart items, form selections)

---

## Architecture Overview

Pagination has two fundamental approaches, each suited to different use cases:

### Offset-Based Pagination (Page Numbers)

```
Request: GET /api/users?page=2&limit=20
Response: { data: [...], page: 2, totalPages: 50, totalCount: 1000 }

Database query: SELECT * FROM users ORDER BY created_at DESC LIMIT 20 OFFSET 20
```

**Best for:** Admin dashboards, search results, small-to-medium datasets (<10,000 records), scenarios where users need to jump to specific pages.

**Performance:** Degrades exponentially as offset increases (OFFSET 10000 reads and discards 10,000 rows).

### Cursor-Based Pagination (Pointers)

```
Request: GET /api/messages?cursor=msg_abc123&limit=20
Response: { data: [...], nextCursor: "msg_xyz789", hasMore: true }

Database query: SELECT * FROM messages WHERE id > 'msg_abc123' ORDER BY id DESC LIMIT 20
```

**Best for:** Large datasets, real-time feeds (social media, email, chat), infinite scroll, any API where data changes frequently.

**Performance:** O(1) time complexity regardless of page depth. Cursors track specific records, not positions.

---

## Implementation

### Step 1: Offset-Based Pagination — API Route

Next.js API route with offset pagination for admin dashboard or search results.

```typescript
// app/api/users/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = createClient();
  const searchParams = request.nextUrl.searchParams;

  // Parse and validate pagination parameters
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
  const offset = (page - 1) * limit;

  // Validate sort parameter (prevent SQL injection)
  const allowedSortFields = ['created_at', 'name', 'email'] as const;
  const sort = searchParams.get('sort') || 'created_at';
  if (!allowedSortFields.includes(sort as any)) {
    return NextResponse.json({ error: 'Invalid sort field' }, { status: 400 });
  }

  // Fetch paginated data with count
  const { data, error, count } = await supabase
    .from('users')
    .select('*', { count: 'exact' })
    .order(sort, { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const totalPages = Math.ceil((count || 0) / limit);

  return NextResponse.json({
    data,
    page,
    limit,
    totalCount: count,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  });
}
```

### Step 2: Offset-Based Pagination — Client Component

React component with TanStack Query for numbered page navigation.

```typescript
'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

interface User {
  id: string;
  name: string;
  email: string;
  created_at: string;
}

interface PaginatedResponse {
  data: User[];
  page: number;
  totalPages: number;
  totalCount: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

async function fetchUsers(page: number, limit: number): Promise<PaginatedResponse> {
  const res = await fetch(`/api/users?page=${page}&limit=${limit}`);
  if (!res.ok) throw new Error('Failed to fetch users');
  return res.json();
}

export function UserTable() {
  const [page, setPage] = useState(1);
  const limit = 20;

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['users', page, limit],
    queryFn: () => fetchUsers(page, limit),
    placeholderData: (previousData) => previousData, // Keep old data while fetching
    staleTime: 30000, // Consider data fresh for 30 seconds
  });

  if (isLoading && !data) {
    return <div className="p-4">Loading users...</div>;
  }

  if (isError) {
    return <div className="p-4 text-red-600">Error: {error.message}</div>;
  }

  if (!data || data.data.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        <p>No users found.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Table */}
      <table className="w-full">
        <thead>
          <tr className="border-b">
            <th className="p-2 text-left">Name</th>
            <th className="p-2 text-left">Email</th>
            <th className="p-2 text-left">Created</th>
          </tr>
        </thead>
        <tbody>
          {data.data.map((user) => (
            <tr key={user.id} className="border-b">
              <td className="p-2">{user.name}</td>
              <td className="p-2">{user.email}</td>
              <td className="p-2">{new Date(user.created_at).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Pagination Controls */}
      <nav
        aria-label="Pagination"
        className="flex items-center justify-between px-4 py-3 sm:px-6"
      >
        <div className="flex-1 flex justify-between sm:hidden">
          {/* Mobile: Previous/Next only */}
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={!data.hasPreviousPage}
            className="relative inline-flex items-center px-4 py-2 border text-sm font-medium rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={!data.hasNextPage}
            className="ml-3 relative inline-flex items-center px-4 py-2 border text-sm font-medium rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>

        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-700">
              Showing{' '}
              <span className="font-medium">{(page - 1) * limit + 1}</span> to{' '}
              <span className="font-medium">
                {Math.min(page * limit, data.totalCount)}
              </span>{' '}
              of <span className="font-medium">{data.totalCount}</span> results
            </p>
          </div>

          {/* Desktop: Page numbers */}
          <div>
            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={!data.hasPreviousPage}
                aria-label="Previous page"
                className="relative inline-flex items-center px-2 py-2 rounded-l-md border text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ← Previous
              </button>

              {/* Page numbers with ellipsis logic */}
              {renderPageNumbers(page, data.totalPages, setPage)}

              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={!data.hasNextPage}
                aria-label="Next page"
                className="relative inline-flex items-center px-2 py-2 rounded-r-md border text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next →
              </button>
            </nav>
          </div>
        </div>
      </nav>
    </div>
  );
}

// Helper function to render page numbers with ellipsis
function renderPageNumbers(
  currentPage: number,
  totalPages: number,
  onPageChange: (page: number) => void
) {
  const pages: (number | 'ellipsis')[] = [];
  const showEllipsis = totalPages > 7;

  if (!showEllipsis) {
    // Show all pages if <= 7
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i);
    }
  } else {
    // Always show first page
    pages.push(1);

    if (currentPage <= 3) {
      // Near start: 1 2 3 4 ... 10
      pages.push(2, 3, 4, 'ellipsis', totalPages);
    } else if (currentPage >= totalPages - 2) {
      // Near end: 1 ... 7 8 9 10
      pages.push('ellipsis', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
    } else {
      // Middle: 1 ... 4 5 6 ... 10
      pages.push('ellipsis', currentPage - 1, currentPage, currentPage + 1, 'ellipsis', totalPages);
    }
  }

  return pages.map((page, index) => {
    if (page === 'ellipsis') {
      return (
        <span key={`ellipsis-${index}`} className="relative inline-flex items-center px-4 py-2 border text-sm font-medium">
          ...
        </span>
      );
    }

    const isCurrent = page === currentPage;
    return (
      <button
        key={page}
        onClick={() => onPageChange(page)}
        aria-label={isCurrent ? `Current page, page ${page}` : `Go to page ${page}`}
        aria-current={isCurrent ? 'page' : undefined}
        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
          isCurrent
            ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
        }`}
      >
        {page}
      </button>
    );
  });
}
```

### Step 3: Cursor-Based Pagination — API Route

Next.js API route for cursor-based pagination (e.g., email messages, social feed).

```typescript
// app/api/messages/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = createClient();
  const searchParams = request.nextUrl.searchParams;

  const cursor = searchParams.get('cursor'); // ID of last item from previous page
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '25', 10)));

  // Build query
  let query = supabase
    .from('messages')
    .select('id, subject, from, created_at')
    .order('created_at', { ascending: false })
    .limit(limit + 1); // Fetch one extra to check if there are more

  // If cursor provided, fetch items after that cursor
  if (cursor) {
    // Get the created_at timestamp for the cursor
    const { data: cursorData } = await supabase
      .from('messages')
      .select('created_at')
      .eq('id', cursor)
      .single();

    if (cursorData) {
      // Fetch messages created before the cursor's timestamp
      query = query.lt('created_at', cursorData.created_at);
    }
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Check if there are more items
  const hasMore = data.length > limit;
  const items = hasMore ? data.slice(0, limit) : data;
  const nextCursor = hasMore && items.length > 0 ? items[items.length - 1].id : null;

  return NextResponse.json({
    data: items,
    nextCursor,
    hasMore,
  });
}
```

### Step 4: Cursor-Based Pagination — Client Component with "Load More"

React component with TanStack Query useInfiniteQuery for cursor-based pagination.

```typescript
'use client';

import { useInfiniteQuery } from '@tanstack/react-query';

interface Message {
  id: string;
  subject: string;
  from: string;
  created_at: string;
}

interface CursorResponse {
  data: Message[];
  nextCursor: string | null;
  hasMore: boolean;
}

async function fetchMessages({ pageParam }: { pageParam: string | null }): Promise<CursorResponse> {
  const url = pageParam
    ? `/api/messages?cursor=${pageParam}&limit=25`
    : '/api/messages?limit=25';

  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch messages');
  return res.json();
}

export function MessageList() {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
  } = useInfiniteQuery({
    queryKey: ['messages'],
    queryFn: fetchMessages,
    initialPageParam: null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    staleTime: 60000, // 1 minute
  });

  if (isLoading) {
    return <div className="p-4">Loading messages...</div>;
  }

  if (isError) {
    return <div className="p-4 text-red-600">Error: {error.message}</div>;
  }

  const allMessages = data?.pages.flatMap((page) => page.data) ?? [];

  if (allMessages.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        <p>No messages yet.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Message list */}
      <ul className="divide-y">
        {allMessages.map((message) => (
          <li key={message.id} className="p-4 hover:bg-gray-50">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-medium">{message.subject}</p>
                <p className="text-sm text-gray-600">From: {message.from}</p>
              </div>
              <span className="text-xs text-gray-500">
                {new Date(message.created_at).toLocaleDateString()}
              </span>
            </div>
          </li>
        ))}
      </ul>

      {/* Load more button */}
      {hasNextPage && (
        <div className="p-4 text-center">
          <button
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isFetchingNextPage ? 'Loading more...' : 'Load more messages'}
          </button>
        </div>
      )}

      {!hasNextPage && allMessages.length > 0 && (
        <div className="p-4 text-center text-gray-500 text-sm">
          You've reached the end
        </div>
      )}
    </div>
  );
}
```

### Step 5: Microsoft Graph API Pagination with $skipToken

Special handling for Microsoft Graph API which uses opaque $skipToken in @odata.nextLink.

```typescript
'use client';

import { useInfiniteQuery } from '@tanstack/react-query';

interface GraphMessage {
  id: string;
  subject: string;
  from: { emailAddress: { address: string } };
  receivedDateTime: string;
}

interface GraphResponse {
  value: GraphMessage[];
  '@odata.nextLink'?: string;
}

async function fetchGraphMessages({ pageParam }: { pageParam: string | null }): Promise<GraphResponse> {
  // Use the full @odata.nextLink URL if provided, otherwise use base URL
  const url = pageParam || '/api/microsoft/messages';

  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch messages from Graph API');
  return res.json();
}

export function GraphMessageList() {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ['graph-messages'],
    queryFn: fetchGraphMessages,
    initialPageParam: null,
    getNextPageParam: (lastPage) => lastPage['@odata.nextLink'] || null,
    staleTime: 30000,
  });

  // ... rendering logic similar to MessageList above
}
```

```typescript
// app/api/microsoft/messages/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getValidToken } from '@/lib/microsoft/token';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const nextLink = searchParams.get('nextLink');

  // Get valid access token
  const { token, error: tokenError } = await getValidToken('user-id-here');
  if (tokenError) {
    return NextResponse.json({ error: tokenError }, { status: 401 });
  }

  // Use nextLink if provided (it contains $skipToken), otherwise construct base URL
  const url = nextLink
    ? nextLink
    : 'https://graph.microsoft.com/v1.0/me/messages?$select=id,subject,from,receivedDateTime&$orderby=receivedDateTime DESC&$top=25';

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const error = await res.text();
    return NextResponse.json({ error }, { status: res.status });
  }

  const data: GraphResponse = await res.json();

  // IMPORTANT: Return the entire @odata.nextLink URL as-is
  // Never try to extract or parse the $skipToken
  return NextResponse.json({
    value: data.value,
    '@odata.nextLink': data['@odata.nextLink'],
  });
}
```

---

## Integration With Other Patterns

**This pattern works with:**
- **infinite-scroll.md** — Use cursor-based pagination with IntersectionObserver for automatic "Load More"
- **data-fetching.md** — TanStack Query provides the caching layer for pagination
- **performance.md** — Database indexes on cursor fields are critical for cursor pagination performance
- **security.md** — Validate and whitelist sort/filter parameters to prevent SQL injection

**This pattern conflicts with:**
- N/A — Pagination is compatible with most other patterns

---

## Error Handling

### 1. API Fetch Failure

```typescript
const { data, isError, error } = useQuery({
  queryKey: ['users', page],
  queryFn: () => fetchUsers(page),
  retry: 2, // Retry failed requests twice
  retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
});

if (isError) {
  return (
    <div className="p-4 bg-red-50 border border-red-200 rounded">
      <p className="text-red-800">Failed to load data: {error.message}</p>
      <button
        onClick={() => queryClient.invalidateQueries({ queryKey: ['users', page] })}
        className="mt-2 text-sm text-red-600 underline"
      >
        Try again
      </button>
    </div>
  );
}
```

### 2. Invalid Page Parameter

```typescript
// API route
const page = parseInt(searchParams.get('page') || '1', 10);

if (isNaN(page) || page < 1) {
  return NextResponse.json(
    { error: 'Invalid page parameter. Must be a positive integer.' },
    { status: 400 }
  );
}
```

### 3. Cursor Not Found (Stale Cursor)

```typescript
// API route for cursor pagination
if (cursor) {
  const { data: cursorData } = await supabase
    .from('messages')
    .select('created_at')
    .eq('id', cursor)
    .single();

  if (!cursorData) {
    // Cursor is stale or invalid — start from beginning
    // Don't error, just ignore cursor and return first page
    console.warn(`Cursor ${cursor} not found, returning first page`);
  } else {
    query = query.lt('created_at', cursorData.created_at);
  }
}
```

### 4. Empty Page (No Results)

```typescript
if (!data || data.data.length === 0) {
  return (
    <div className="p-8 text-center">
      <svg className="mx-auto h-12 w-12 text-gray-400" /* ... */ />
      <h3 className="mt-2 text-sm font-medium text-gray-900">No results found</h3>
      {page > 1 && (
        <button
          onClick={() => setPage(1)}
          className="mt-2 text-sm text-blue-600 underline"
        >
          Go to first page
        </button>
      )}
    </div>
  );
}
```

---

## Testing Checklist

- [ ] **First page loads correctly** with expected number of items
- [ ] **Next page button is disabled** on last page
- [ ] **Previous page button is disabled** on first page
- [ ] **Page numbers highlight current page** with aria-current="page"
- [ ] **Empty state displays correctly** when no results
- [ ] **Cursor pagination handles duplicate items correctly** (no duplicates across pages)
- [ ] **Offset pagination handles new data insertion** (acknowledge that items may shift between pages)
- [ ] **Loading state shows** while fetching next page (placeholderData keeps old data visible)
- [ ] **Error state shows** with retry option
- [ ] **Keyboard navigation works** (Tab to buttons, Enter/Space to activate)
- [ ] **Screen reader announces** current page and total pages
- [ ] **Back button preserves page state** (TanStack Query caches pages)
- [ ] **Deep links work** (e.g., /users?page=5 loads page 5)
- [ ] **Invalid page parameters handled gracefully** (page=-1, page=abc, page=99999)
- [ ] **Concurrent requests cancelled** (TanStack Query prevents race conditions)

---

## Common Mistakes — Never Do These

### 1. Using Offset Pagination for Real-Time Data

**Wrong:**
```typescript
// Email messages with OFFSET — causes duplicates/skips when new emails arrive
const { data } = await supabase
  .from('messages')
  .select('*')
  .order('created_at', { ascending: false })
  .range(offset, offset + limit - 1);
```

**Why it's wrong:** If a new email arrives while user is on page 2, the offset shifts all rows. Items from page 1 now appear on page 2 (duplicates), or items skip pages entirely.

**Correct:**
```typescript
// Use cursor-based pagination for real-time data
const { data } = await supabase
  .from('messages')
  .select('*')
  .order('created_at', { ascending: false })
  .lt('created_at', cursorTimestamp) // After cursor, not offset
  .limit(limit);
```

---

### 2. Not Handling End-of-List State

**Wrong:**
```typescript
<button onClick={() => setPage(page + 1)}>
  Next Page
</button>
```

**Why it's wrong:** Button is active even on last page, causes empty results and poor UX.

**Correct:**
```typescript
<button
  onClick={() => setPage(page + 1)}
  disabled={!data.hasNextPage}
  className="disabled:opacity-50 disabled:cursor-not-allowed"
>
  Next Page
</button>

{!data.hasNextPage && data.data.length > 0 && (
  <p className="text-sm text-gray-500">You've reached the end</p>
)}
```

---

### 3. Re-Fetching Entire List on Navigation

**Wrong:**
```typescript
function UserList() {
  const [page, setPage] = useState(1);
  const [allUsers, setAllUsers] = useState<User[]>([]);

  useEffect(() => {
    // Re-fetches and rebuilds entire list on every page change
    fetchUsers(page).then((newUsers) => {
      setAllUsers((prev) => [...prev, ...newUsers]);
    });
  }, [page]);

  return <div>{allUsers.map(/* ... */)}</div>;
}
```

**Why it's wrong:** TanStack Query already caches pages. Manual state management duplicates effort and breaks back button behavior.

**Correct:**
```typescript
function UserList() {
  const [page, setPage] = useState(1);

  // TanStack Query caches each page automatically
  const { data } = useQuery({
    queryKey: ['users', page],
    queryFn: () => fetchUsers(page),
    placeholderData: (prev) => prev, // Keep old data while fetching
  });

  return <div>{data?.users.map(/* ... */)}</div>;
}
```

---

### 4. Not Prefetching Next Page

**Wrong:**
```typescript
// User clicks "Next" — waits for fetch to start and complete (slow UX)
<button onClick={() => setPage(page + 1)}>Next Page</button>
```

**Why it's wrong:** User sees loading spinner every time they click next. Feels slow even with fast API.

**Correct:**
```typescript
import { useQueryClient } from '@tanstack/react-query';

function UserList() {
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ['users', page],
    queryFn: () => fetchUsers(page),
  });

  // Prefetch next page on current page render
  useEffect(() => {
    if (data?.hasNextPage) {
      queryClient.prefetchQuery({
        queryKey: ['users', page + 1],
        queryFn: () => fetchUsers(page + 1),
      });
    }
  }, [page, data?.hasNextPage, queryClient]);

  return (
    <div>
      {/* User clicks — data already cached, instant render */}
      <button onClick={() => setPage(page + 1)} disabled={!data?.hasNextPage}>
        Next Page
      </button>
    </div>
  );
}
```

---

### 5. Losing Scroll Position on Back Navigation

**Wrong:**
```typescript
// User scrolls to bottom of page 3, clicks item, clicks back — resets to top of page 1
function UserList() {
  const [page, setPage] = useState(1); // Resets on unmount

  return <div>{/* ... */}</div>;
}
```

**Why it's wrong:** Breaks expected browser behavior. User loses their place.

**Correct:**
```typescript
// Use URL search params instead of useState — preserved in browser history
'use client';
import { useSearchParams, useRouter } from 'next/navigation';

function UserList() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const page = parseInt(searchParams.get('page') || '1', 10);

  function setPage(newPage: number) {
    router.push(`/users?page=${newPage}`);
  }

  const { data } = useQuery({
    queryKey: ['users', page],
    queryFn: () => fetchUsers(page),
  });

  return (
    <div>
      {/* Back button restores page from URL */}
      <button onClick={() => setPage(page + 1)}>Next</button>
    </div>
  );
}
```

---

### 6. Trusting Client-Provided Sort Parameters (Security)

**Wrong:**
```typescript
// API route — SQL injection vulnerability
export async function GET(request: NextRequest) {
  const sort = request.nextUrl.searchParams.get('sort') || 'created_at';

  // User can pass: ?sort=id;DROP TABLE users;--
  const { data } = await supabase
    .from('users')
    .select('*')
    .order(sort, { ascending: false }); // VULNERABLE

  return NextResponse.json({ data });
}
```

**Why it's wrong:** Supabase protects against this specific case, but trusting client input is an anti-pattern. User can cause errors or unexpected behavior.

**Correct:**
```typescript
// API route — whitelist allowed sort fields
export async function GET(request: NextRequest) {
  const allowedSortFields = ['created_at', 'name', 'email'] as const;
  const sort = request.nextUrl.searchParams.get('sort') || 'created_at';

  // Validate against whitelist
  if (!allowedSortFields.includes(sort as any)) {
    return NextResponse.json(
      { error: 'Invalid sort field' },
      { status: 400 }
    );
  }

  const { data } = await supabase
    .from('users')
    .select('*')
    .order(sort, { ascending: false }); // SAFE

  return NextResponse.json({ data });
}
```

---

### 7. Extracting $skipToken from Microsoft Graph @odata.nextLink

**Wrong:**
```typescript
// Trying to extract and use $skipToken manually
const nextLink = data['@odata.nextLink'];
const skipToken = new URL(nextLink).searchParams.get('$skiptoken');

// Use skipToken in next request — BREAKS
const url = `https://graph.microsoft.com/v1.0/me/messages?$skiptoken=${skipToken}`;
```

**Why it's wrong:** $skipToken is an opaque, Base64-encoded string that may include other query parameters. Extracting it breaks pagination.

**Correct:**
```typescript
// Use the entire @odata.nextLink URL as-is
const nextLink = data['@odata.nextLink'];

// Next request uses full URL
const response = await fetch(nextLink, {
  headers: { Authorization: `Bearer ${token}` },
});
```

---

## Performance Considerations

### Database Indexes for Cursor Pagination

```sql
-- Cursor pagination queries filter by timestamp and sort
-- Create composite index on (created_at, id) for optimal performance
CREATE INDEX idx_messages_cursor ON messages(created_at DESC, id);

-- Without index: Full table scan (slow)
-- With index: O(1) lookup regardless of position (fast)
```

**Metrics:**
- Offset pagination at page 1000: ~500ms (reads and discards 20,000 rows)
- Cursor pagination at any depth: ~10-20ms (index seeks directly to position)

### Offset Pagination Performance Threshold

- **Under 10,000 total records:** Offset pagination is acceptable (< 100ms for page 100)
- **Over 10,000 total records:** Switch to cursor pagination or hybrid approach
- **Real-time data:** Always use cursor pagination regardless of size

### Prefetching Strategy

```typescript
// Prefetch next page when user reaches 75% scroll depth
useEffect(() => {
  const handleScroll = () => {
    const scrollPercentage =
      (window.scrollY + window.innerHeight) / document.documentElement.scrollHeight;

    if (scrollPercentage > 0.75 && data?.hasNextPage && !isFetchingNextPage) {
      queryClient.prefetchQuery({
        queryKey: ['users', page + 1],
        queryFn: () => fetchUsers(page + 1),
      });
    }
  };

  window.addEventListener('scroll', handleScroll);
  return () => window.removeEventListener('scroll', handleScroll);
}, [page, data?.hasNextPage, isFetchingNextPage]);
```

---

## Accessibility Checklist

- [ ] **Navigation wrapped in `<nav aria-label="Pagination">`** to identify region
- [ ] **Current page has `aria-current="page"`** and is not a link
- [ ] **All buttons have `aria-label`** describing their action ("Go to page 3", "Next page")
- [ ] **Keyboard navigation works** — Tab to focus buttons, Enter/Space to activate
- [ ] **Focus indicators visible** with 4.5:1 contrast ratio minimum
- [ ] **Disabled buttons have `disabled` attribute** (not just visual styling)
- [ ] **Screen reader text announces** current page and total pages: "Page 3 of 50"
- [ ] **Previous/Next buttons have descriptive text** ("Previous page", not just "←")
- [ ] **Page numbers are actual `<button>` elements** or `<a>` tags, not `<div>` with onClick
- [ ] **Color is not the only indicator** of current page (use border, bold text, etc.)
- [ ] **Loading state announced** to screen readers (aria-live region)

---

## Security Checklist

- [ ] **Validate page and limit parameters** (reject negative, non-numeric, or excessive values)
- [ ] **Whitelist allowed sort fields** — never pass user input directly to ORDER BY
- [ ] **Whitelist allowed filter fields** — prevent SQL injection via WHERE clauses
- [ ] **Rate limit pagination endpoints** — prevent scraping entire database
- [ ] **Verify user authorization** — ensure user can access the data being paginated
- [ ] **Use RLS policies** in Supabase to enforce row-level permissions
- [ ] **Sanitize cursor values** if cursor is user-provided (ideally, cursor is opaque server-generated ID)
- [ ] **Prevent cursor tampering** — validate cursor exists before using it in query
- [ ] **Log excessive pagination requests** — detect potential scrapers or attackers
- [ ] **Use parameterized queries** — never concatenate user input into SQL strings

---

## Pre-Implementation Checklist

Before declaring pagination complete in your codebase:

- [ ] **Choose offset vs cursor** based on data size and real-time requirements
- [ ] **Database indexes created** on sort and filter columns
- [ ] **API route validates all user inputs** (page, limit, sort, filter)
- [ ] **TanStack Query configured** with appropriate staleTime and gcTime
- [ ] **Prefetching implemented** for next page
- [ ] **Loading states handled** (skeleton, spinner, or placeholderData)
- [ ] **Error states handled** with retry option
- [ ] **Empty state designed** and implemented
- [ ] **End-of-list state** communicated to user
- [ ] **Accessibility tested** with keyboard and screen reader
- [ ] **Back button works** (page state in URL or cached by TanStack Query)
- [ ] **Mobile layout tested** (Previous/Next buttons visible and tappable)
- [ ] **Performance tested** with large datasets (>10,000 records)
- [ ] **Cursor pagination tested** for duplicate/skip issues with concurrent data changes
- [ ] **Microsoft Graph pagination tested** with $skipToken (if applicable)

---

## References

- [Microsoft Graph API Paging Documentation](https://learn.microsoft.com/en-us/graph/paging)
- [TanStack Query Infinite Queries Guide](https://tanstack.com/query/latest/docs/framework/react/guides/infinite-queries)
- [TanStack Query Paginated Queries Guide](https://tanstack.com/query/latest/docs/framework/react/guides/paginated-queries)
- [WCAG 2.1 Pagination Accessibility](https://www.w3.org/WAI/WCAG21/Understanding/)
- [Cursor vs Offset Pagination Performance Analysis](https://www.pingcap.com/article/limit-offset-pagination-vs-cursor-pagination-in-mysql/)

---

*CodeBakers V4 | Pattern: Pagination | agents/patterns/pagination.md*
