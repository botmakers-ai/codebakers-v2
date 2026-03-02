---
name: Infinite Scroll Pattern
tier: patterns
triggers: infinite scroll, endless scroll, load more, IntersectionObserver, sentinel element, virtualization
depends_on: agents/patterns/pagination.md
conflicts_with: null
prerequisites: "TanStack Query installed, IntersectionObserver API support (all modern browsers)"
description: Complete infinite scroll pattern using IntersectionObserver for performance, cursor-based pagination, accessibility requirements, deduplication strategies, and virtualization threshold guidance
---

# Pattern: Infinite Scroll

## What This Pattern Covers

This pattern covers infinite scroll implementation using the IntersectionObserver API for optimal performance. It addresses sentinel element patterns, cursor-based pagination integration, deduplication of items across page boundaries, accessibility considerations (keyboard navigation, screen readers), and when to transition to virtualization for large lists (>200 items rendered).

Use this pattern for social media feeds, message lists, product catalogs, or any scenario where users expect continuous scrolling without explicit pagination controls.

---

## When to Use This Pattern

- **Social media feeds** (Twitter-style, Facebook-style) where users expect continuous browsing
- **Email clients** with chronological message lists
- **Product listings** where users prefer browsing over jumping to specific pages
- **News feeds or article lists** where engagement is measured by scroll depth
- **Chat/messaging interfaces** loading message history on scroll up
- **Image galleries** with hundreds of items
- **Search results** where users rarely go past first few pages anyway

---

## When NOT to Use This Pattern

- **Small fixed datasets (<50 items)** — render all at once, no pagination needed
- **Admin dashboards requiring specific page access** — users need to jump to "page 347" or see page 5 of 50
- **Data requiring footers** — infinite scroll makes footers unreachable (use "Load More" button instead)
- **Content requiring precise navigation** (legal documents, academic papers) — numbered pages better
- **Goal-oriented tasks** (e-commerce checkout, form wizards) — users need clear progress and completion
- **Accessibility-first applications** without proper aria-live and load-more fallbacks
- **When rendering >200-300 items** — use virtualization.md pattern instead (render only visible items)

---

## Architecture Overview

Infinite scroll uses a **sentinel element** (invisible div at list bottom) monitored by IntersectionObserver. When sentinel enters viewport, trigger next page fetch.

### Traditional Scroll Event (Don't Do This)

```
window.addEventListener('scroll', () => {
  if (isNearBottom()) fetchMore(); // Fires 100+ times per scroll
});
```

**Problems:** High CPU usage, janky scrolling, battery drain, accessibility issues.

### IntersectionObserver Sentinel (Correct Approach)

```
<div id="sentinel" />  ← Invisible element at list bottom

IntersectionObserver watches sentinel
  → Sentinel enters viewport
  → Callback fires ONCE
  → Fetch next page
  → Append items
  → Sentinel moves down naturally
```

**Benefits:** Low CPU, smooth scrolling, battery-friendly, declarative.

---

## Implementation

### Step 1: Basic Infinite Scroll with IntersectionObserver

React component with TanStack Query useInfiniteQuery and IntersectionObserver sentinel.

```typescript
'use client';

import { useEffect, useRef } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';

interface Message {
  id: string;
  subject: string;
  body: string;
  created_at: string;
}

interface PageResponse {
  data: Message[];
  nextCursor: string | null;
  hasMore: boolean;
}

async function fetchMessages({ pageParam }: { pageParam: string | null }): Promise<PageResponse> {
  const url = pageParam
    ? `/api/messages?cursor=${pageParam}&limit=25`
    : '/api/messages?limit=25';

  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch messages');
  return res.json();
}

export function InfiniteMessageList() {
  const sentinelRef = useRef<HTMLDivElement>(null);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
  } = useInfiniteQuery({
    queryKey: ['messages-infinite'],
    queryFn: fetchMessages,
    initialPageParam: null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    staleTime: 60000, // 1 minute
  });

  // IntersectionObserver setup
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // When sentinel enters viewport and more pages exist
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      {
        root: null, // viewport
        rootMargin: '100px', // Trigger 100px before sentinel actually visible (proactive loading)
        threshold: 0, // Fire as soon as any part of sentinel is visible
      }
    );

    observer.observe(sentinel);

    // Cleanup on unmount
    return () => {
      observer.disconnect();
    };
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  if (isLoading) {
    return (
      <div className="p-4">
        <LoadingSkeleton count={10} />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded">
        <p className="text-red-800">Failed to load messages: {error.message}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-2 text-sm text-red-600 underline"
        >
          Reload page
        </button>
      </div>
    );
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
      <ul className="divide-y" role="feed" aria-busy={isFetchingNextPage}>
        {allMessages.map((message, index) => (
          <li
            key={message.id}
            className="p-4 hover:bg-gray-50"
            role="article"
            aria-setsize={-1} // Unknown total (infinite)
            aria-posinset={index + 1}
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="font-medium">{message.subject}</p>
                <p className="text-sm text-gray-600 line-clamp-2">{message.body}</p>
              </div>
              <span className="text-xs text-gray-500">
                {new Date(message.created_at).toLocaleDateString()}
              </span>
            </div>
          </li>
        ))}
      </ul>

      {/* Sentinel element — invisible trigger for next page */}
      <div ref={sentinelRef} className="h-20" aria-hidden="true" />

      {/* Loading indicator */}
      {isFetchingNextPage && (
        <div className="p-4" role="status" aria-live="polite">
          <p className="text-center text-sm text-gray-500">Loading more messages...</p>
          <LoadingSkeleton count={3} />
        </div>
      )}

      {/* End of list indicator */}
      {!hasNextPage && allMessages.length > 0 && (
        <div className="p-4 text-center text-gray-500 text-sm" role="status">
          You've reached the end
        </div>
      )}
    </div>
  );
}

function LoadingSkeleton({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="p-4 border-b animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
          <div className="h-3 bg-gray-200 rounded w-1/2" />
        </div>
      ))}
    </>
  );
}
```

### Step 2: Infinite Scroll with "Load More" Button (Accessible Alternative)

Hybrid approach: auto-load first 3 pages, then show "Load More" button. Best for accessibility.

```typescript
'use client';

import { useState, useEffect, useRef } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';

const AUTO_LOAD_PAGE_LIMIT = 3; // Auto-load first 3 pages, then require button

export function AccessibleInfiniteList() {
  const [autoLoadEnabled, setAutoLoadEnabled] = useState(true);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ['messages-accessible'],
    queryFn: fetchMessages,
    initialPageParam: null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });

  const pagesLoaded = data?.pages.length ?? 0;

  // Disable auto-load after reaching page limit
  useEffect(() => {
    if (pagesLoaded >= AUTO_LOAD_PAGE_LIMIT) {
      setAutoLoadEnabled(false);
    }
  }, [pagesLoaded]);

  // IntersectionObserver for auto-load (first 3 pages only)
  useEffect(() => {
    if (!autoLoadEnabled) return;

    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { rootMargin: '100px' }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [autoLoadEnabled, fetchNextPage, hasNextPage, isFetchingNextPage]);

  if (isLoading) {
    return <div className="p-4">Loading...</div>;
  }

  const allMessages = data?.pages.flatMap((page) => page.data) ?? [];

  return (
    <div>
      <ul className="divide-y">
        {allMessages.map((message) => (
          <li key={message.id} className="p-4">
            {message.subject}
          </li>
        ))}
      </ul>

      {/* Sentinel for auto-load (first 3 pages) */}
      {autoLoadEnabled && hasNextPage && (
        <div ref={sentinelRef} className="h-20" aria-hidden="true" />
      )}

      {/* Manual "Load More" button (after 3 pages or when auto-load disabled) */}
      {!autoLoadEnabled && hasNextPage && (
        <div className="p-4 text-center">
          <button
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
            aria-label="Load more messages"
          >
            {isFetchingNextPage ? 'Loading...' : 'Load more messages'}
          </button>
        </div>
      )}

      {isFetchingNextPage && (
        <div className="p-4 text-center text-sm text-gray-500" role="status" aria-live="polite">
          Loading more...
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

### Step 3: Deduplication Strategy (Prevent Duplicates Across Pages)

Use Set to track seen IDs and filter out duplicates when new pages load.

```typescript
'use client';

import { useMemo } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';

export function DeduplicatedInfiniteList() {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['messages-dedup'],
    queryFn: fetchMessages,
    initialPageParam: null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });

  // Deduplicate messages across all pages
  const allMessages = useMemo(() => {
    if (!data?.pages) return [];

    const seen = new Set<string>();
    const deduplicated: Message[] = [];

    for (const page of data.pages) {
      for (const message of page.data) {
        if (!seen.has(message.id)) {
          seen.add(message.id);
          deduplicated.push(message);
        }
      }
    }

    return deduplicated;
  }, [data?.pages]);

  return (
    <div>
      <ul className="divide-y">
        {allMessages.map((message) => (
          <li key={message.id} className="p-4">
            {message.subject}
          </li>
        ))}
      </ul>
      {/* ... sentinel, loading, end state */}
    </div>
  );
}
```

### Step 4: Bidirectional Infinite Scroll (Load Older and Newer)

Chat interfaces often need to load older messages on scroll up and newer on scroll down.

```typescript
'use client';

import { useRef, useEffect } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';

export function BidirectionalChatList() {
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const bottomSentinelRef = useRef<HTMLDivElement>(null);

  const {
    data,
    fetchNextPage,
    fetchPreviousPage,
    hasNextPage,
    hasPreviousPage,
    isFetchingNextPage,
    isFetchingPreviousPage,
  } = useInfiniteQuery({
    queryKey: ['chat-messages'],
    queryFn: fetchMessages,
    initialPageParam: null,
    getNextPageParam: (lastPage) => lastPage.nextCursor, // Older messages
    getPreviousPageParam: (firstPage) => firstPage.previousCursor, // Newer messages
  });

  // Observer for top sentinel (load older messages)
  useEffect(() => {
    const sentinel = topSentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasPreviousPage && !isFetchingPreviousPage) {
          fetchPreviousPage();
        }
      },
      { rootMargin: '100px' }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [fetchPreviousPage, hasPreviousPage, isFetchingPreviousPage]);

  // Observer for bottom sentinel (load newer messages)
  useEffect(() => {
    const sentinel = bottomSentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { rootMargin: '100px' }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const allMessages = data?.pages.flatMap((page) => page.data) ?? [];

  return (
    <div className="flex flex-col h-screen">
      {/* Top sentinel for older messages */}
      {hasPreviousPage && (
        <>
          <div ref={topSentinelRef} className="h-10" aria-hidden="true" />
          {isFetchingPreviousPage && (
            <div className="p-2 text-center text-sm text-gray-500">
              Loading older messages...
            </div>
          )}
        </>
      )}

      {/* Messages */}
      <ul className="flex-1 overflow-y-auto">
        {allMessages.map((message) => (
          <li key={message.id} className="p-4">
            {message.body}
          </li>
        ))}
      </ul>

      {/* Bottom sentinel for newer messages */}
      {hasNextPage && (
        <>
          {isFetchingNextPage && (
            <div className="p-2 text-center text-sm text-gray-500">
              Loading newer messages...
            </div>
          )}
          <div ref={bottomSentinelRef} className="h-10" aria-hidden="true" />
        </>
      )}
    </div>
  );
}
```

### Step 5: Keyboard Navigation Support (Accessibility)

Add keyboard shortcuts to navigate list and trigger load more.

```typescript
'use client';

import { useEffect, useState } from 'react';

export function KeyboardNavigableList() {
  const [focusedIndex, setFocusedIndex] = useState(0);
  const { data, fetchNextPage, hasNextPage } = useInfiniteQuery({
    queryKey: ['messages-keyboard'],
    queryFn: fetchMessages,
    initialPageParam: null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });

  const allMessages = data?.pages.flatMap((page) => page.data) ?? [];

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return; // Don't intercept when user is typing
      }

      switch (e.key) {
        case 'j': // Next item (Gmail-style)
          e.preventDefault();
          setFocusedIndex((i) => Math.min(i + 1, allMessages.length - 1));
          break;
        case 'k': // Previous item
          e.preventDefault();
          setFocusedIndex((i) => Math.max(i - 1, 0));
          break;
        case 'm': // Load More
          e.preventDefault();
          if (hasNextPage) fetchNextPage();
          break;
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [allMessages.length, fetchNextPage, hasNextPage]);

  // Scroll focused item into view
  useEffect(() => {
    const element = document.getElementById(`message-${focusedIndex}`);
    element?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [focusedIndex]);

  return (
    <div>
      <ul className="divide-y">
        {allMessages.map((message, index) => (
          <li
            key={message.id}
            id={`message-${index}`}
            tabIndex={index === focusedIndex ? 0 : -1}
            className={`p-4 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              index === focusedIndex ? 'bg-blue-50' : 'hover:bg-gray-50'
            }`}
          >
            {message.subject}
          </li>
        ))}
      </ul>

      {/* Keyboard hint */}
      <div className="fixed bottom-4 right-4 bg-gray-800 text-white text-xs p-2 rounded">
        j/k: navigate, m: load more
      </div>
    </div>
  );
}
```

---

## Integration With Other Patterns

**This pattern works with:**
- **pagination.md** — Uses cursor-based pagination under the hood
- **data-fetching.md** — TanStack Query useInfiniteQuery manages infinite scroll state
- **virtualization.md** — Switch to virtualization when rendering >200-300 items
- **performance.md** — IntersectionObserver is key performance optimization

**This pattern conflicts with:**
- N/A — Can coexist with most patterns, though UX may dictate pagination vs infinite scroll choice

---

## Error Handling

### 1. Network Failure Mid-Scroll

```typescript
const { data, fetchNextPage, isError, error, refetch } = useInfiniteQuery({
  queryKey: ['messages'],
  queryFn: fetchMessages,
  retry: 2, // Retry failed requests twice
  retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
});

if (isError) {
  return (
    <div className="p-4 bg-red-50 border border-red-200 rounded">
      <p className="text-red-800">Failed to load more: {error.message}</p>
      <button
        onClick={() => refetch()}
        className="mt-2 px-4 py-2 bg-red-600 text-white rounded"
      >
        Retry
      </button>
    </div>
  );
}
```

### 2. Stale Cursor (Cursor No Longer Exists)

```typescript
// API route
export async function GET(request: NextRequest) {
  const cursor = searchParams.get('cursor');

  if (cursor) {
    const { data: cursorData } = await supabase
      .from('messages')
      .select('created_at')
      .eq('id', cursor)
      .single();

    if (!cursorData) {
      // Cursor is stale — reset to beginning
      console.warn(`Cursor ${cursor} not found, resetting pagination`);
      // Return first page instead of error
    }
  }
  // ... continue
}
```

### 3. Infinite Loop (Auto-Fetch Never Stops)

```typescript
// Caused by sentinel always being in viewport (list too short)
// Solution: Don't observe sentinel if list is too short to scroll

useEffect(() => {
  const container = containerRef.current;
  const sentinel = sentinelRef.current;

  if (!container || !sentinel) return;

  // Only observe if container is scrollable
  const isScrollable = container.scrollHeight > container.clientHeight;

  if (!isScrollable) {
    console.log('Container not scrollable yet, skipping observer');
    return;
  }

  const observer = new IntersectionObserver(/* ... */);
  observer.observe(sentinel);
  return () => observer.disconnect();
}, [data, fetchNextPage, hasNextPage]);
```

---

## Testing Checklist

- [ ] **First page loads correctly** with expected items
- [ ] **Scrolling near bottom triggers next page** (check rootMargin setting)
- [ ] **Loading indicator shows** while fetching next page
- [ ] **No duplicate items** across page boundaries (deduplication works)
- [ ] **End of list shows** clear "You've reached the end" message
- [ ] **Empty list shows** appropriate empty state
- [ ] **Keyboard navigation works** (Tab to items, Space/Enter to activate, j/k shortcuts if implemented)
- [ ] **Screen reader announces** new content loading (aria-live="polite")
- [ ] **Back button preserves scroll position** (TanStack Query caches pages)
- [ ] **Rapid scrolling doesn't cause race conditions** (TanStack Query deduplicates requests)
- [ ] **Sentinel disconnects on unmount** (no memory leaks)
- [ ] **List with <10 items doesn't trigger infinite fetch loop** (check isScrollable guard)
- [ ] **Mobile rubber-band scroll doesn't break** (iOS overscroll behavior)
- [ ] **Focus management works** after new items load
- [ ] **"Load More" button works** (if hybrid approach used)

---

## Common Mistakes — Never Do These

### 1. Using Scroll Event Listeners Instead of IntersectionObserver

**Wrong:**
```typescript
useEffect(() => {
  function handleScroll() {
    const scrollPosition = window.scrollY + window.innerHeight;
    const bottom = document.documentElement.scrollHeight;

    if (scrollPosition >= bottom - 100 && hasNextPage) {
      fetchNextPage(); // Fires 100+ times per scroll
    }
  }

  window.addEventListener('scroll', handleScroll);
  return () => window.removeEventListener('scroll', handleScroll);
}, [hasNextPage, fetchNextPage]);
```

**Why it's wrong:** Scroll events fire continuously (100-200 times per scroll gesture), causing performance issues, battery drain, and unnecessary fetch attempts.

**Correct:**
```typescript
useEffect(() => {
  const sentinel = sentinelRef.current;
  if (!sentinel) return;

  const observer = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage(); // Fires ONCE when sentinel enters viewport
      }
    },
    { rootMargin: '100px' }
  );

  observer.observe(sentinel);
  return () => observer.disconnect();
}, [fetchNextPage, hasNextPage, isFetchingNextPage]);
```

---

### 2. Not Handling Duplicates

**Wrong:**
```typescript
// Blindly concatenating all pages
const allMessages = data?.pages.flatMap((page) => page.data) ?? [];

return (
  <ul>
    {allMessages.map((message) => (
      <li key={message.id}>{message.subject}</li>
    ))}
  </ul>
);
// Same message appears twice if it moved between page boundaries
```

**Why it's wrong:** If data changes between page fetches (new items inserted, items deleted), the same item can appear on multiple pages.

**Correct:**
```typescript
// Deduplicate using Set
const allMessages = useMemo(() => {
  if (!data?.pages) return [];

  const seen = new Set<string>();
  const deduplicated: Message[] = [];

  for (const page of data.pages) {
    for (const message of page.data) {
      if (!seen.has(message.id)) {
        seen.add(message.id);
        deduplicated.push(message);
      }
    }
  }

  return deduplicated;
}, [data?.pages]);
```

---

### 3. Not Showing Loading State

**Wrong:**
```typescript
<ul>
  {allMessages.map((message) => (
    <li key={message.id}>{message.subject}</li>
  ))}
</ul>
<div ref={sentinelRef} />
// User has no idea more content is loading
```

**Why it's wrong:** Users don't know if the app is loading or if they've reached the end. Feels broken.

**Correct:**
```typescript
<ul>
  {allMessages.map((message) => (
    <li key={message.id}>{message.subject}</li>
  ))}
</ul>

{isFetchingNextPage && (
  <div className="p-4 text-center" role="status" aria-live="polite">
    <p className="text-sm text-gray-500">Loading more messages...</p>
    <LoadingSkeleton count={3} />
  </div>
)}

<div ref={sentinelRef} className="h-20" aria-hidden="true" />
```

---

### 4. Rendering 10,000 Items Without Virtualization

**Wrong:**
```typescript
// Rendering all fetched items (10,000+) at once
const allMessages = data?.pages.flatMap((page) => page.data) ?? [];

return (
  <ul>
    {allMessages.map((message) => (
      <li key={message.id}>{message.subject}</li>
    ))}
  </ul>
);
// DOM has 10,000 <li> elements — slow scrolling, high memory
```

**Why it's wrong:** DOM performance degrades with >200-300 elements. Scrolling becomes janky, memory usage spikes.

**Correct:**
```typescript
// Switch to virtualization.md pattern when list exceeds 200-300 items
import { useVirtualizer } from '@tanstack/react-virtual';

const parentRef = useRef<HTMLDivElement>(null);

const virtualizer = useVirtualizer({
  count: allMessages.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 80, // Estimated item height
  overscan: 5, // Render 5 extra items above/below viewport
});

return (
  <div ref={parentRef} className="h-screen overflow-auto">
    <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
      {virtualizer.getVirtualItems().map((virtualRow) => {
        const message = allMessages[virtualRow.index];
        return (
          <div
            key={message.id}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualRow.size}px`,
              transform: `translateY(${virtualRow.start}px)`,
            }}
          >
            {message.subject}
          </div>
        );
      })}
    </div>
  </div>
);
```

---

### 5. Breaking Keyboard Navigation

**Wrong:**
```typescript
<ul>
  {allMessages.map((message) => (
    <li key={message.id} className="cursor-pointer" onClick={() => open(message.id)}>
      {message.subject}
    </li>
  ))}
</ul>
// Clicking works, but Tab key doesn't focus items, Enter key doesn't activate
```

**Why it's wrong:** Keyboard-only users cannot navigate the list. Violates WCAG 2.1.1.

**Correct:**
```typescript
<ul role="feed">
  {allMessages.map((message, index) => (
    <li key={message.id} role="article" aria-posinset={index + 1} aria-setsize={-1}>
      <button
        className="w-full text-left p-4 hover:bg-gray-50 focus:outline-none focus:ring-2"
        onClick={() => open(message.id)}
      >
        {message.subject}
      </button>
    </li>
  ))}
</ul>
```

---

### 6. Not Providing "Load More" Alternative

**Wrong:**
```typescript
// Only auto-load — no manual trigger option
<ul>
  {allMessages.map((message) => <li key={message.id}>{message.subject}</li>)}
</ul>
<div ref={sentinelRef} /> {/* Screen reader users can't trigger this */}
```

**Why it's wrong:** Screen reader users and keyboard-only users may not trigger IntersectionObserver by scrolling.

**Correct:**
```typescript
// Hybrid: Auto-load first 3 pages, then show button
<ul>
  {allMessages.map((message) => <li key={message.id}>{message.subject}</li>)}
</ul>

{autoLoadEnabled && <div ref={sentinelRef} aria-hidden="true" />}

{!autoLoadEnabled && hasNextPage && (
  <button
    onClick={() => fetchNextPage()}
    className="w-full p-4 bg-blue-600 text-white"
    aria-label="Load more messages"
  >
    Load more
  </button>
)}
```

---

### 7. Not Disconnecting Observer on Unmount

**Wrong:**
```typescript
useEffect(() => {
  const observer = new IntersectionObserver(/* ... */);
  observer.observe(sentinelRef.current);
  // No cleanup function — observer keeps running after component unmounts
}, []);
```

**Why it's wrong:** Memory leak. Observer continues running and holding references to DOM elements.

**Correct:**
```typescript
useEffect(() => {
  const sentinel = sentinelRef.current;
  if (!sentinel) return;

  const observer = new IntersectionObserver(/* ... */);
  observer.observe(sentinel);

  // Cleanup on unmount
  return () => {
    observer.disconnect();
  };
}, [fetchNextPage, hasNextPage, isFetchingNextPage]);
```

---

## Performance Considerations

### Virtualization Threshold

- **0-200 items:** Standard infinite scroll (render all items)
- **200-500 items:** Consider virtualization (noticeable scroll lag on lower-end devices)
- **500+ items:** Always use virtualization (see virtualization.md pattern)

**Metrics:**
- Rendering 100 items: ~16ms (60fps maintained)
- Rendering 500 items: ~80ms (drops to 12fps)
- Rendering 1000 items: ~160ms (6fps, unusable)

### Root Margin Optimization

```typescript
const observer = new IntersectionObserver(callback, {
  rootMargin: '100px', // Trigger 100px before sentinel visible (faster perception)
});
```

**Effect:** User sees loading state before scrolling to actual end. Feels faster.

### Prefetch Next Page on Hover

```typescript
<li
  onMouseEnter={() => {
    // Prefetch next page when user hovers near bottom
    if (index === allMessages.length - 10 && hasNextPage && !isFetchingNextPage) {
      queryClient.prefetchInfiniteQuery({
        queryKey: ['messages'],
        queryFn: fetchMessages,
      });
    }
  }}
>
  {message.subject}
</li>
```

---

## Accessibility Checklist

- [ ] **Infinite list wrapped in `role="feed"`** to identify continuous content
- [ ] **Each item has `role="article"`** with aria-posinset and aria-setsize attributes
- [ ] **Loading state announced** with `role="status" aria-live="polite"`
- [ ] **"Load More" button available** as alternative to auto-scroll (after 3 pages or always)
- [ ] **Keyboard navigation supported** (Tab to items, Space/Enter to activate)
- [ ] **Focus indicators visible** with 4.5:1 contrast
- [ ] **Focus management** — new items don't steal focus from current item
- [ ] **Skip-to-footer link** provided if footer exists (infinite scroll makes footers unreachable)
- [ ] **aria-busy="true"** on feed element while loading new items
- [ ] **End of list announced** to screen readers ("You've reached the end" with role="status")
- [ ] **No infinite loops** — ensure list is scrollable before observing sentinel

---

## Security Checklist

- [ ] **Cursor parameter validated** (check format, prevent injection)
- [ ] **Rate limiting per user** (prevent scraping entire database via infinite scroll)
- [ ] **Verify user authorization** for items being fetched
- [ ] **Use RLS policies** in Supabase for row-level permissions
- [ ] **Limit page size** (max 50-100 items per page, reject excessive requests)
- [ ] **Sanitize sort/filter parameters** if user-controlled
- [ ] **Log excessive scroll requests** (detect potential scrapers)

---

## Pre-Implementation Checklist

Before declaring infinite scroll complete in your codebase:

- [ ] **IntersectionObserver implemented** (not scroll events)
- [ ] **Sentinel element present** at list bottom
- [ ] **TanStack Query useInfiniteQuery configured** with appropriate staleTime
- [ ] **Cursor-based pagination used** (not offset for real-time data)
- [ ] **Deduplication implemented** (no duplicate items across pages)
- [ ] **Loading state visible** while fetching next page
- [ ] **End-of-list state** communicated clearly
- [ ] **Empty state designed** and implemented
- [ ] **Error state shows** with retry option
- [ ] **Observer disconnects on unmount** (no memory leaks)
- [ ] **Keyboard navigation supported** (Tab, Enter, Space)
- [ ] **Screen reader tested** (aria-live, role="feed", role="article")
- [ ] **"Load More" button provided** (after 3 auto-loads or always)
- [ ] **Mobile tested** (rubber-band scroll, touch scrolling)
- [ ] **Virtualization threshold checked** (switch to virtualization.md if >200 items)
- [ ] **Performance tested** on low-end devices

---

## References

- [IntersectionObserver API Documentation (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API)
- [TanStack Query Infinite Queries Guide](https://tanstack.com/query/latest/docs/framework/react/guides/infinite-queries)
- [WCAG 2.1 — Infinite Scroll and Accessibility](https://www.deque.com/blog/infinite-scrolling-rolefeed-accessibility-issues/)
- [Infinite Scrolling Best Practices (Nielsen Norman Group)](https://www.nngroup.com/articles/infinite-scrolling-tips/)
- [TanStack Virtual Documentation](https://tanstack.com/virtual/latest)

---

*CodeBakers V4 | Pattern: Infinite Scroll | agents/patterns/infinite-scroll.md*
