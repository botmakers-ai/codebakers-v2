---
triggers:
  - "virtualize list"
  - "virtual scrolling"
  - "large list performance"
  - "render 1000 items"
  - "TanStack Virtual"
  - "react-window"
  - "virtual grid"
  - "lazy render"
  - "viewport rendering"

depends_on:
  - infinite-scroll.md (infinite scroll + virtualization)
  - performance.md (when to optimize)

prerequisites:
  - Next.js App Router
  - React 18+
  - TypeScript
  - TanStack Virtual
  - Understanding of DOM performance

description: |
  Production-ready virtualization covering: TanStack Virtual implementation, when to virtualize (200+ items),
  fixed-size and variable-size lists, virtual grids, accessibility considerations (role="feed"), infinite
  scroll + virtualization, performance benchmarks, and testing strategies.
---

# Virtualization Pattern

## Research Foundation

**Searches performed:**
1. TanStack Virtual React virtualization library best practices 2024
2. When to virtualize lists performance threshold 200 items React 2024
3. Virtual scrolling accessibility screen readers ARIA 2024
4. react-window vs react-virtual vs TanStack Virtual comparison 2024
5. Variable size virtualization dynamic height React 2024

**Key findings:**
- **TanStack Virtual is most popular in 2024** — 8.2M weekly downloads vs 4.2M for react-window
- **Virtualize at 200-300+ items** — rendering thousands of DOM nodes causes 2-3 second UI freeze
- **Before virtualization: 5,000 rows = 2-3s freeze** — after: <100ms first render
- **DOM size limits:** Max 1,500 nodes, 32 depth, 60 children per parent (recommended)
- **TanStack Virtual handles 1M cells smoothly** — more responsive than react-window on low-end devices
- **Accessibility is problematic** — role="feed" helps screen readers but leaves keyboard-only users behind
- **Variable-size virtualization supported** — TanStack Virtual, React Virtuoso auto-measure heights
- **React.memo items essential** — virtualized items mount/unmount frequently

---

## When to Virtualize

### Performance Thresholds

| List Size | Recommendation | Reasoning |
|-----------|----------------|-----------|
| <100 items | **Don't virtualize** | Overhead not worth it |
| 100-200 items | **Monitor performance** | May be needed on slow devices |
| 200-300+ items | **Virtualize** | Noticeable performance degradation |
| 1,000+ items | **Virtualize always** | UI freeze without virtualization |

### Real-World Performance Impact

**Without virtualization (5,000 rows):**
- Initial render: 2-3 seconds (UI frozen)
- Scrolling: Janky, dropped frames
- DOM nodes: 5,000+ (exceeds recommendations)

**With virtualization (5,000 rows):**
- Initial render: <100ms
- Scrolling: Smooth 60fps
- DOM nodes: ~10-20 (only visible items)

---

## 1. Basic Virtualization with TanStack Virtual

### Setup

```bash
pnpm add --save-exact @tanstack/react-virtual
```

### Fixed-Size List

```typescript
// components/VirtualizedList.tsx
'use client';

import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef } from 'react';

interface Item {
  id: string;
  name: string;
  description: string;
}

interface VirtualizedListProps {
  items: Item[];
}

export function VirtualizedList({ items }: VirtualizedListProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80, // Fixed height per item (in pixels)
    overscan: 5, // Render 5 extra items above/below viewport
  });

  return (
    <div
      ref={parentRef}
      className="h-[600px] overflow-auto border border-gray-300 rounded"
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const item = items[virtualItem.index];

          return (
            <div
              key={item.id}
              data-index={virtualItem.index}
              ref={virtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualItem.size}px`,
                transform: `translateY(${virtualItem.start}px)`,
              }}
              className="border-b border-gray-200 p-4"
            >
              <h3 className="font-semibold">{item.name}</h3>
              <p className="text-sm text-gray-600">{item.description}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

**Key concepts:**
- **count:** Total number of items in list
- **estimateSize:** Height estimate for each item (pixels)
- **overscan:** Extra items rendered outside viewport (prevents blank flashes during fast scrolling)
- **getTotalSize():** Total height of all items (for scroll bar sizing)
- **getVirtualItems():** Only visible + overscanned items (10-20 instead of 5,000)

---

### Variable-Size List (Dynamic Heights)

```typescript
// components/VariableSizeList.tsx
'use client';

import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef } from 'react';

interface Message {
  id: string;
  author: string;
  content: string;
  timestamp: string;
}

export function VariableSizeList({ messages }: { messages: Message[] }) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 100, // Initial estimate
    measureElement:
      typeof window !== 'undefined' && navigator.userAgent.indexOf('Firefox') === -1
        ? (element) => element?.getBoundingClientRect().height
        : undefined,
    overscan: 3,
  });

  return (
    <div
      ref={parentRef}
      className="h-[600px] overflow-auto border border-gray-300 rounded bg-white"
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const message = messages[virtualItem.index];

          return (
            <div
              key={message.id}
              data-index={virtualItem.index}
              ref={virtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualItem.start}px)`,
              }}
              className="border-b border-gray-200 p-4"
            >
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
                  {message.author[0]}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{message.author}</span>
                    <span className="text-xs text-gray-500">{message.timestamp}</span>
                  </div>
                  <p className="mt-1 text-gray-700 whitespace-pre-wrap">{message.content}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

**How variable-size works:**
1. **estimateSize:** Initial guess for height (used before measurement)
2. **measureElement:** Measures actual height after render
3. **TanStack Virtual adjusts scroll position** based on actual measurements
4. Firefox excluded from measurement due to browser-specific issues

---

## 2. Virtual Grid (2D Virtualization)

```typescript
// components/VirtualGrid.tsx
'use client';

import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef } from 'react';

interface Photo {
  id: string;
  url: string;
  title: string;
}

export function VirtualGrid({ photos }: { photos: Photo[] }) {
  const parentRef = useRef<HTMLDivElement>(null);

  const COLUMN_COUNT = 4;
  const rowCount = Math.ceil(photos.length / COLUMN_COUNT);

  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 250, // Row height
    overscan: 2,
  });

  return (
    <div
      ref={parentRef}
      className="h-[600px] overflow-auto border border-gray-300 rounded"
    >
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const startIndex = virtualRow.index * COLUMN_COUNT;
          const rowPhotos = photos.slice(startIndex, startIndex + COLUMN_COUNT);

          return (
            <div
              key={virtualRow.key}
              data-index={virtualRow.index}
              ref={rowVirtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
              className="grid grid-cols-4 gap-4 p-4"
            >
              {rowPhotos.map((photo) => (
                <div
                  key={photo.id}
                  className="aspect-square rounded-lg overflow-hidden bg-gray-200"
                >
                  <img
                    src={photo.url}
                    alt={photo.title}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                  <p className="mt-2 text-sm truncate">{photo.title}</p>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

**Key points:**
- **Row-based virtualization:** Virtualizes rows, not individual items
- **COLUMN_COUNT:** Fixed columns per row
- **grid-cols-4:** Tailwind CSS grid layout
- Each row contains 4 photos

---

## 3. Infinite Scroll + Virtualization

Combine infinite loading with virtualization for massive datasets.

```typescript
// components/InfiniteVirtualList.tsx
'use client';

import { useVirtualizer } from '@tanstack/react-virtual';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useRef, useEffect } from 'react';

async function fetchPosts({ pageParam = 0 }) {
  const res = await fetch(`/api/posts?cursor=${pageParam}&limit=50`);
  return res.json();
}

export function InfiniteVirtualList() {
  const parentRef = useRef<HTMLDivElement>(null);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['posts'],
    queryFn: fetchPosts,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: 0,
  });

  const allRows = data ? data.pages.flatMap((page) => page.data) : [];

  const virtualizer = useVirtualizer({
    count: hasNextPage ? allRows.length + 1 : allRows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80,
    overscan: 5,
  });

  const virtualItems = virtualizer.getVirtualItems();

  useEffect(() => {
    const lastItem = virtualItems[virtualItems.length - 1];

    if (!lastItem) return;

    // Trigger fetch when scrolling near bottom
    if (
      lastItem.index >= allRows.length - 1 &&
      hasNextPage &&
      !isFetchingNextPage
    ) {
      fetchNextPage();
    }
  }, [
    hasNextPage,
    fetchNextPage,
    allRows.length,
    isFetchingNextPage,
    virtualItems,
  ]);

  return (
    <div
      ref={parentRef}
      className="h-[600px] overflow-auto border border-gray-300 rounded"
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualItems.map((virtualItem) => {
          const isLoaderRow = virtualItem.index > allRows.length - 1;
          const post = allRows[virtualItem.index];

          return (
            <div
              key={virtualItem.key}
              data-index={virtualItem.index}
              ref={virtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualItem.size}px`,
                transform: `translateY(${virtualItem.start}px)`,
              }}
              className="border-b border-gray-200 p-4"
            >
              {isLoaderRow ? (
                hasNextPage ? (
                  <div className="text-center text-gray-500">Loading more...</div>
                ) : (
                  <div className="text-center text-gray-500">No more items</div>
                )
              ) : (
                <div>
                  <h3 className="font-semibold">{post.title}</h3>
                  <p className="text-sm text-gray-600">{post.excerpt}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

**How it works:**
1. **TanStack Query** handles infinite loading
2. **TanStack Virtual** virtualizes the combined list
3. **useEffect** triggers `fetchNextPage()` when scrolling near bottom
4. Loader row added at end while fetching

---

## 4. Accessibility Considerations

### The Problem

Virtual scrolling is **not fully accessible**:
- **Keyboard-only users:** Can't access content (Tab skips virtualized items)
- **Screen readers:** Only work with `role="feed"` (complex to implement)
- **Speech recognition:** Can't access virtualized items by voice commands

### Solution: role="feed" (Limited)

```typescript
// components/AccessibleVirtualList.tsx
'use client';

import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef } from 'react';

export function AccessibleVirtualList({ articles }: { articles: Article[] }) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: articles.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 200,
    overscan: 3,
  });

  return (
    <div
      ref={parentRef}
      role="feed"
      aria-busy={false}
      aria-label="Article feed"
      className="h-[600px] overflow-auto"
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const article = articles[virtualItem.index];

          return (
            <article
              key={article.id}
              data-index={virtualItem.index}
              ref={virtualizer.measureElement}
              role="article"
              aria-posinset={virtualItem.index + 1}
              aria-setsize={articles.length}
              tabIndex={0}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualItem.start}px)`,
              }}
              className="border-b p-4 focus:outline focus:outline-2 focus:outline-blue-600"
            >
              <h2 className="text-lg font-semibold">{article.title}</h2>
              <p className="mt-2 text-gray-700">{article.summary}</p>
              <a href={`/articles/${article.id}`} className="mt-2 inline-block text-blue-600">
                Read more
              </a>
            </article>
          );
        })}
      </div>
    </div>
  );
}
```

**ARIA attributes:**
- **role="feed":** Identifies scrollable list of articles
- **role="article":** Each item is an article
- **aria-posinset / aria-setsize:** Position in list (e.g., "Item 5 of 100")
- **tabIndex={0}:** Makes each article focusable

**Limitations:**
- Only helps screen reader users in browse mode
- Keyboard-only users still can't Tab through items
- Speech recognition users can't access content

**Better alternative for accessibility: Pagination** (see pagination.md)

---

## 5. Optimized Item Component

```typescript
// components/VirtualListItem.tsx
import { memo } from 'react';

interface VirtualListItemProps {
  item: {
    id: string;
    title: string;
    description: string;
  };
  style: React.CSSProperties;
  measureElement?: (el: HTMLDivElement | null) => void;
}

// ✅ CORRECT: Memoized to prevent unnecessary re-renders
export const VirtualListItem = memo(function VirtualListItem({
  item,
  style,
  measureElement,
}: VirtualListItemProps) {
  return (
    <div
      ref={measureElement}
      style={style}
      className="border-b border-gray-200 p-4"
    >
      <h3 className="font-semibold">{item.title}</h3>
      <p className="text-sm text-gray-600">{item.description}</p>
    </div>
  );
});
```

**Why memo is critical:**
- Virtualized items mount/unmount frequently
- Parent re-renders on every scroll
- Memo prevents unnecessary re-renders of visible items

---

## Anti-Patterns

### Anti-Pattern 1: Virtualizing Small Lists

**❌ WRONG:**
```typescript
// Only 50 items — virtualization overhead not worth it
<VirtualizedList items={fiftyItems} />
```

**Problem:** Virtualization adds complexity and overhead. Not worth it for <100 items.

**✅ CORRECT:**
```typescript
// Simple map for small lists
<div>
  {fiftyItems.map((item) => (
    <div key={item.id}>{item.name}</div>
  ))}
</div>
```

---

### Anti-Pattern 2: No Overscan

**❌ WRONG:**
```typescript
const virtualizer = useVirtualizer({
  count: items.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 80,
  overscan: 0, // No overscan — blank flashes during fast scrolling
});
```

**Problem:** Fast scrolling shows blank white space before items render.

**✅ CORRECT:**
```typescript
const virtualizer = useVirtualizer({
  count: items.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 80,
  overscan: 5, // Render 5 extra items above/below viewport
});
```

---

### Anti-Pattern 3: Not Memoizing Items

**❌ WRONG:**
```typescript
{virtualizer.getVirtualItems().map((virtualItem) => {
  const item = items[virtualItem.index];

  // Inline component re-renders on every scroll
  return (
    <div key={item.id} style={{ ... }}>
      <ExpensiveComponent data={item} />
    </div>
  );
})}
```

**Problem:** Item component re-renders on every scroll (even if props haven't changed).

**✅ CORRECT:**
```typescript
// Separate memoized component
const MemoizedItem = memo(({ item, style }) => (
  <div style={style}>
    <ExpensiveComponent data={item} />
  </div>
));

{virtualizer.getVirtualItems().map((virtualItem) => {
  const item = items[virtualItem.index];
  return <MemoizedItem key={item.id} item={item} style={{ ... }} />;
})}
```

---

### Anti-Pattern 4: Inaccurate Size Estimates

**❌ WRONG:**
```typescript
const virtualizer = useVirtualizer({
  count: items.length,
  estimateSize: () => 50, // Estimate way off (actual: 200px)
});
```

**Problem:** Scroll position jumps, scroll bar inaccurate, poor UX.

**✅ CORRECT:**
```typescript
const virtualizer = useVirtualizer({
  count: items.length,
  estimateSize: () => 180, // Close estimate (actual: 160-220px)
});
```

**Tip:** Measure a few items, calculate average, use as estimate.

---

### Anti-Pattern 5: Storing Critical State in Item Components

**❌ WRONG:**
```typescript
function VirtualListItem({ item }) {
  const [isExpanded, setIsExpanded] = useState(false); // Lost when item unmounts!

  return (
    <div>
      <h3>{item.title}</h3>
      {isExpanded && <p>{item.details}</p>}
      <button onClick={() => setIsExpanded(!isExpanded)}>Toggle</button>
    </div>
  );
}
```

**Problem:** When user scrolls away, item unmounts. State is lost. When scrolling back, item is collapsed again.

**✅ CORRECT:**
```typescript
// Store expanded state outside component (by ID)
const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

function VirtualListItem({ item }) {
  const isExpanded = expandedIds.has(item.id);

  function toggleExpand() {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(item.id)) {
        next.delete(item.id);
      } else {
        next.add(item.id);
      }
      return next;
    });
  }

  return (
    <div>
      <h3>{item.title}</h3>
      {isExpanded && <p>{item.details}</p>}
      <button onClick={toggleExpand}>Toggle</button>
    </div>
  );
}
```

---

## Implementation Examples

### Example 1: Email Inbox (Variable Heights)

```typescript
// components/EmailInbox.tsx
'use client';

import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef } from 'react';

interface Email {
  id: string;
  from: string;
  subject: string;
  preview: string;
  timestamp: string;
  isRead: boolean;
}

export function EmailInbox({ emails }: { emails: Email[] }) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: emails.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 90,
    overscan: 5,
  });

  return (
    <div
      ref={parentRef}
      className="h-[calc(100vh-200px)] overflow-auto border border-gray-300 rounded"
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const email = emails[virtualItem.index];

          return (
            <div
              key={email.id}
              data-index={virtualItem.index}
              ref={virtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualItem.start}px)`,
              }}
              className={`border-b border-gray-200 p-4 hover:bg-gray-50 cursor-pointer ${
                !email.isRead ? 'bg-blue-50' : ''
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`font-semibold truncate ${!email.isRead ? 'text-blue-600' : ''}`}>
                      {email.from}
                    </span>
                    <span className="text-xs text-gray-500">{email.timestamp}</span>
                  </div>
                  <h3 className={`mt-1 truncate ${!email.isRead ? 'font-semibold' : ''}`}>
                    {email.subject}
                  </h3>
                  <p className="mt-1 text-sm text-gray-600 line-clamp-2">{email.preview}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

---

### Example 2: Product Grid (2D Virtualization)

```typescript
// components/ProductGrid.tsx
'use client';

import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef } from 'react';
import Image from 'next/image';

interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
}

export function ProductGrid({ products }: { products: Product[] }) {
  const parentRef = useRef<HTMLDivElement>(null);

  const COLUMNS = 4;
  const rowCount = Math.ceil(products.length / COLUMNS);

  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 300,
    overscan: 2,
  });

  return (
    <div
      ref={parentRef}
      className="h-[600px] overflow-auto"
    >
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          position: 'relative',
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const startIdx = virtualRow.index * COLUMNS;
          const rowProducts = products.slice(startIdx, startIdx + COLUMNS);

          return (
            <div
              key={virtualRow.key}
              data-index={virtualRow.index}
              ref={rowVirtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`,
              }}
              className="grid grid-cols-4 gap-4 p-4"
            >
              {rowProducts.map((product) => (
                <div key={product.id} className="border rounded-lg p-4">
                  <div className="aspect-square relative bg-gray-100 rounded">
                    <Image
                      src={product.image}
                      alt={product.name}
                      fill
                      className="object-cover rounded"
                    />
                  </div>
                  <h3 className="mt-2 font-semibold truncate">{product.name}</h3>
                  <p className="text-lg font-bold">${product.price}</p>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

---

## Testing Checklist

- [ ] **Performance measured**
  - [ ] Before virtualization: >200ms initial render
  - [ ] After virtualization: <100ms initial render
  - [ ] Smooth 60fps scrolling
  - [ ] Chrome DevTools Performance tab shows improvement

- [ ] **Scroll behavior correct**
  - [ ] No blank white space during normal scrolling
  - [ ] Overscan prevents flashes during fast scrolling
  - [ ] Scroll bar size accurate (matches total content height)

- [ ] **Dynamic height items measured correctly**
  - [ ] No scroll position jumps
  - [ ] Items with different heights render correctly

- [ ] **State persists across scroll**
  - [ ] Expanded/collapsed state maintained
  - [ ] Selected items remain selected
  - [ ] Form input values preserved (if stored by ID)

- [ ] **Infinite scroll works**
  - [ ] New pages load when scrolling near bottom
  - [ ] No duplicate items
  - [ ] Loading indicator shows while fetching

---

## Accessibility Checklist

- [ ] **Consider pagination instead** (more accessible)
  - [ ] Virtualization is not fully accessible
  - [ ] Pagination supports keyboard, screen readers, speech recognition

- [ ] **If virtualization required:**
  - [ ] role="feed" on container
  - [ ] role="article" on items
  - [ ] aria-posinset and aria-setsize on items
  - [ ] Each item has tabIndex={0}
  - [ ] Focus indicators visible

- [ ] **Document accessibility limitations**
  - [ ] Warn users that keyboard navigation is limited
  - [ ] Provide search/filter as alternative to scrolling

---

## Performance Checklist

- [ ] **Only virtualize when needed**
  - [ ] >200 items before considering virtualization
  - [ ] Measured performance issue before adding complexity

- [ ] **Overscan configured**
  - [ ] overscan: 3-5 for vertical lists
  - [ ] overscan: 1-2 for grids (more items per row)

- [ ] **Items memoized**
  - [ ] Item component wrapped in React.memo
  - [ ] Props stable (no inline objects/functions)

- [ ] **Size estimates accurate**
  - [ ] Estimate within 20% of actual size
  - [ ] Measured sample of items to calculate average

- [ ] **State management optimized**
  - [ ] Critical state stored by ID outside components
  - [ ] Avoid useState inside virtualized items

---

## Security Checklist

- [ ] **No XSS in virtualized content**
  - [ ] User-generated content sanitized (DOMPurify)
  - [ ] No dangerouslySetInnerHTML without sanitization

- [ ] **Infinite scroll rate-limited**
  - [ ] API endpoints rate-limited
  - [ ] Prevent abuse (rapid scrolling triggering thousands of requests)

---

## Integration Notes

**Works well with:**
- **infinite-scroll.md** — Combine infinite loading with virtualization
- **performance.md** — Part of performance optimization strategy
- **pagination.md** — Alternative that's more accessible

**Potential conflicts:**
- **keyboard-navigation.md** — Virtualization limits keyboard accessibility
- **forms.md** — Don't virtualize forms (state management issues)

**Dependencies:**
- Depends on `infinite-scroll.md` for infinite + virtualization pattern
- Depends on `performance.md` for when to optimize

---

## References

1. [TanStack Virtual Documentation](https://tanstack.com/virtual/latest)
2. [react-window Documentation](https://react-window.vercel.app/)
3. [Patterns.dev: Virtual Lists](https://www.patterns.dev/vanilla/virtual-lists/)
4. [web.dev: Virtualize Large Lists](https://web.dev/articles/virtualize-long-lists-react-window)
5. [MDN: ARIA feed role](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles/feed_role)
6. [DigitalA11Y: Infinite Scroll Accessibility](https://www.digitala11y.com/infinite-scroll-accessibility-is-it-any-good/)
7. [TanStack Virtual vs React Window Comparison](https://mashuktamim.medium.com/react-virtualization-showdown-tanstack-virtualizer-vs-react-window-for-sticky-table-grids-69b738b36a83)

---

## Version History

- **v1.0** (2024-01-15): Initial virtualization pattern covering TanStack Virtual, fixed/variable-size lists, virtual grids, infinite scroll integration, accessibility considerations, performance optimization
