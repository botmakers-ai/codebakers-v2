---
triggers:
  - "slow page load"
  - "large bundle size"
  - "poor Web Vitals"
  - "slow rendering"
  - "optimize performance"
  - "reduce bundle"
  - "improve LCP"
  - "improve INP"
  - "reduce CLS"
  - "code splitting"
  - "lazy loading"
  - "image optimization"

depends_on:
  - data-fetching.md (for understanding query optimization)

prerequisites:
  - Next.js App Router
  - React 18+
  - TypeScript
  - Understanding of browser rendering pipeline
  - Familiarity with Chrome DevTools Performance tab

description: |
  Production-ready performance optimization covering: code splitting (route + component level),
  Core Web Vitals (LCP, INP, CLS), React optimization (memo, useMemo, useCallback),
  debounce vs throttle, next/image, next/font, bundle analysis, Server Components vs Client Components,
  and streaming SSR with Suspense.
---

# Performance Pattern

## Research Foundation

**Searches performed:**
1. Next.js 15 code splitting dynamic imports React.lazy 2024
2. Core Web Vitals LCP FID INP CLS thresholds 2024 optimization
3. React.memo useMemo useCallback when to use performance 2024
4. debounce vs throttle JavaScript performance when to use
5. next/image optimization placeholder blur sizes performance 2024
6. next/font Google fonts local fonts performance optimization 2024
7. Next.js bundle analyzer webpack bundle analysis reduce size 2024
8. Next.js 15 Server Components vs Client Components performance when to use
9. React Suspense streaming SSR Next.js 15 performance optimization

**Key findings:**
- **INP replaced FID in March 2024** as the Core Web Vitals responsiveness metric
- 43% of websites fail INP threshold (<200ms), making it the most commonly failed metric
- Only 59% of mobile pages achieve good LCP (<2.5s), making it the hardest to pass
- Next.js automatically optimizes images (40-70% compression via Sharp, 25-35% via format conversion)
- Code splitting reduces bundle size by ~30% on average
- Apps implementing chunking see 25% improvement in Time to Interactive (TTI)
- Server Components send zero JavaScript to client, drastically reducing bundle size
- Streaming SSR can reduce TTFB from 450ms to 45ms and LCP from 1.2s to 380ms
- Too many Suspense boundaries create "popcorn effect" — one boundary per independent data dependency
- React Compiler (future) will auto-apply memo to all components

---

## Core Web Vitals Thresholds (2024)

These are **Google ranking factors** (10-15% of ranking signals). At least **75% of page visits** must meet "Good" thresholds (75th percentile of real user data).

| Metric | Good | Needs Improvement | Poor |
|--------|------|-------------------|------|
| **LCP** (Largest Contentful Paint) | <2.5s | 2.5s - 4s | >4s |
| **INP** (Interaction to Next Paint) | <200ms | 200ms - 500ms | >500ms |
| **CLS** (Cumulative Layout Shift) | <0.1 | 0.1 - 0.25 | >0.25 |

**What they measure:**
- **LCP:** Time until largest visible content renders (image, video, block-level text)
- **INP:** Captures **every** interaction throughout full page lifecycle, reports worst interaction at 75th percentile (replaced FID in March 2024)
- **CLS:** Visual stability — amount of unexpected layout shift during page load

---

## 1. Code Splitting

### Route-Level Splitting (Automatic in Next.js)

Next.js App Router automatically code-splits by route. Each page gets its own bundle.

**Example: App Router structure**
```typescript
// app/layout.tsx — Shared across all routes
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

// app/page.tsx — Home page bundle
export default function HomePage() {
  return <h1>Home</h1>;
}

// app/dashboard/page.tsx — Dashboard page bundle (separate from home)
export default function DashboardPage() {
  return <h1>Dashboard</h1>;
}
```

**Result:** When user visits `/`, they don't download `/dashboard` code. Automatic 🎉

---

### Component-Level Splitting (Manual with `next/dynamic`)

Use `next/dynamic` to lazy-load heavy components that are:
- Below the fold
- In modals/drawers (not shown on initial render)
- Conditionally rendered based on user action
- Third-party libraries (chart libraries, rich text editors, video players)

**Example: Lazy-load modal component**
```typescript
// components/DeleteAccountModal.tsx
'use client';
import { useState } from 'react';
import dynamic from 'next/dynamic';

// ✅ CORRECT: Lazy-load modal component (only loads when opened)
const DeleteConfirmDialog = dynamic(() => import('./DeleteConfirmDialog'), {
  loading: () => <div className="spinner" />,
  ssr: false, // Don't render on server if it uses browser-only APIs
});

export function DeleteAccountButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button onClick={() => setIsOpen(true)}>Delete Account</button>
      {isOpen && <DeleteConfirmDialog onClose={() => setIsOpen(false)} />}
    </>
  );
}
```

**Example: Lazy-load chart library**
```typescript
// app/analytics/page.tsx
import dynamic from 'next/dynamic';

// ✅ CORRECT: Recharts is 150KB+ — lazy-load it
const Chart = dynamic(() => import('@/components/RevenueChart'), {
  loading: () => <div>Loading chart...</div>,
  ssr: false, // Charts often need window/document
});

export default function AnalyticsPage() {
  return (
    <div>
      <h1>Analytics Dashboard</h1>
      <Chart />
    </div>
  );
}
```

**Import syntax for named exports:**
```typescript
// ✅ CORRECT: Import named export
const ContactForm = dynamic(
  () => import('@/components/forms').then((mod) => mod.ContactForm)
);
```

**When NOT to lazy-load:**
- Above-the-fold content (delays LCP)
- Critical UI needed for initial interaction
- Small components (<10KB)

---

## 2. next/image Optimization

Next.js `<Image>` component automatically:
- Compresses images via Sharp (40-70% reduction)
- Converts to WebP/AVIF (25-35% additional reduction)
- Generates responsive sizes
- Lazy-loads by default (below fold images)
- Prevents CLS with automatic width/height

**Combined optimizations cut payloads by 60-80%** compared to original upload.

### Basic Usage

```typescript
// ❌ WRONG: Using <img> tag
<img src="/hero.jpg" alt="Hero" />

// ✅ CORRECT: Using next/image with explicit dimensions
import Image from 'next/image';

<Image
  src="/hero.jpg"
  alt="Hero image"
  width={1200}
  height={600}
  priority // For LCP image (above fold)
/>
```

### Responsive Images with `sizes`

The `sizes` prop tells the browser which image size to load based on viewport.

```typescript
// ✅ CORRECT: Responsive image with sizes
<Image
  src="/banner.jpg"
  alt="Banner"
  fill
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
  className="object-cover"
/>
```

**How `sizes` works:**
- `(max-width: 768px) 100vw` — On mobile, image is full viewport width
- `(max-width: 1200px) 50vw` — On tablet, image is 50% of viewport
- `33vw` — On desktop, image is 33% of viewport

Browser uses this to request appropriately sized image from Next.js image optimizer.

### Placeholder Blur (Improves Perceived Performance)

```typescript
// ✅ CORRECT: Local image with automatic blur placeholder
import heroImg from '@/public/hero.jpg';

<Image
  src={heroImg}
  alt="Hero"
  placeholder="blur" // Next.js generates blur data automatically for local images
  priority
/>
```

**For remote images, provide manual blurDataURL:**
```typescript
// ✅ CORRECT: Remote image with base64 blur placeholder
<Image
  src="https://example.com/hero.jpg"
  alt="Hero"
  width={1200}
  height={600}
  placeholder="blur"
  blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
/>
```

**Tip:** Keep blurDataURL small (<1KB) — large placeholders hurt performance.

### Priority for LCP Images

```typescript
// ✅ CORRECT: Mark hero/banner as priority (loads immediately, not lazy)
<Image
  src="/hero.jpg"
  alt="Hero"
  width={1200}
  height={600}
  priority // Disables lazy loading, preloads image
  fetchPriority="high" // Browser priority hint
/>
```

**Rule:** Add `priority` to the largest image above the fold (likely your LCP element).

---

## 3. next/font Optimization

`next/font` automatically:
- Downloads font files at build time
- Self-hosts fonts (no external requests to Google)
- Eliminates layout shift via CSS `size-adjust`
- Preloads fonts

**Zero layout shift + zero external requests = better FCP, LCP, and privacy.**

### Google Fonts

```typescript
// app/layout.tsx
import { Inter, Roboto_Mono } from 'next/font/google';

// ✅ CORRECT: Variable font (best performance + flexibility)
const inter = Inter({
  subsets: ['latin'],
  display: 'swap', // Shows fallback font until custom font loads
  variable: '--font-inter',
});

// ✅ CORRECT: Monospace font for code
const robotoMono = Roboto_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-roboto-mono',
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${robotoMono.variable}`}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
```

**CSS (Tailwind config):**
```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)'],
        mono: ['var(--font-roboto-mono)'],
      },
    },
  },
};
```

### Local Custom Fonts

```typescript
// app/layout.tsx
import localFont from 'next/font/local';

// ✅ CORRECT: Load local font from public or app directory
const myFont = localFont({
  src: [
    {
      path: '../public/fonts/MyFont-Regular.woff2',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../public/fonts/MyFont-Bold.woff2',
      weight: '700',
      style: 'normal',
    },
  ],
  display: 'swap',
  variable: '--font-my-font',
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={myFont.variable}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
```

**Font subsetting for performance:**
```typescript
// ✅ CORRECT: Subset font to only include Latin characters
const inter = Inter({
  subsets: ['latin'], // Reduces file size by excluding unused character sets
  display: 'swap',
});
```

---

## 4. Server Components vs Client Components

### Performance Differences

| Aspect | Server Components | Client Components |
|--------|-------------------|-------------------|
| JavaScript sent to browser | **Zero** | **All component code** |
| Initial load speed | **Faster** | Slower (needs hydration) |
| Data fetching | Directly access DB/API | Requires API route |
| Interactivity | None | Full (state, events, effects) |
| Default in Next.js 15 | ✅ Yes | Use `'use client'` |

**Server Components drastically reduce bundle size** because they render on server and send HTML only.

### When to Use Each

**Use Server Components (default) for:**
- Static content (blogs, docs, marketing pages)
- Data-heavy pages (dashboards, analytics) — fetch data on server
- SEO-critical pages
- Layouts, navigation, footers
- Anything that doesn't need interactivity

**Use Client Components for:**
- Forms, modals, dropdowns (interactivity)
- State management (`useState`, `useReducer`)
- Event handlers (`onClick`, `onChange`, `onSubmit`)
- Effects (`useEffect`, `useLayoutEffect`)
- Browser-only APIs (`window`, `localStorage`, `navigator`)
- Third-party libraries that require client-side JavaScript

### Example: Mixing Server + Client Components

```typescript
// app/posts/page.tsx (Server Component — default)
import { createClient } from '@/lib/supabase/server';
import { PostList } from '@/components/PostList';

export default async function PostsPage() {
  const supabase = await createClient();

  // ✅ CORRECT: Fetch data directly on server (no API route needed)
  const { data: posts } = await supabase
    .from('posts')
    .select('*')
    .order('created_at', { ascending: false });

  return (
    <div>
      <h1>Blog Posts</h1>
      <PostList posts={posts} />
    </div>
  );
}
```

```typescript
// components/PostList.tsx (Client Component — needs interactivity)
'use client';
import { useState } from 'react';

export function PostList({ posts }: { posts: any[] }) {
  const [filter, setFilter] = useState('all');

  // ✅ CORRECT: Client component for filtering logic
  const filtered = posts.filter((p) => filter === 'all' || p.category === filter);

  return (
    <div>
      <select value={filter} onChange={(e) => setFilter(e.target.value)}>
        <option value="all">All</option>
        <option value="tech">Tech</option>
        <option value="design">Design</option>
      </select>
      <ul>
        {filtered.map((post) => (
          <li key={post.id}>{post.title}</li>
        ))}
      </ul>
    </div>
  );
}
```

**Best practice:** Push `'use client'` to leaf-level components. Keep layouts and containers as Server Components.

---

## 5. React Optimization (memo, useMemo, useCallback)

**Don't optimize prematurely.** Profile first, optimize what's actually slow.

### React.memo (Memoize Components)

Prevents re-render if props haven't changed.

```typescript
// ❌ WRONG: Wrapping every component in memo
const Header = React.memo(() => <header>Header</header>);
const Footer = React.memo(() => <footer>Footer</footer>);
const Button = React.memo(({ label }) => <button>{label}</button>);

// ✅ CORRECT: Only memoize expensive components that re-render often with same props
const HeavyChart = React.memo(({ data }: { data: number[] }) => {
  // Expensive chart rendering logic (e.g., D3, Canvas)
  return <canvas>{/* ... */}</canvas>;
});
```

**When to use React.memo:**
- Component re-renders often with **identical props**
- Rendering is **expensive** (complex calculations, large lists, Canvas/D3)
- Profiler shows significant time spent re-rendering this component

**When NOT to use React.memo:**
- Fast, simple components
- Props change frequently (memo overhead > benefit)
- Component doesn't re-render often

### useMemo (Memoize Values)

Caches result of expensive calculation.

```typescript
// ❌ WRONG: useMemo for cheap operations
function ProductList({ products }) {
  const count = useMemo(() => products.length, [products]); // Pointless — .length is O(1)
  return <div>Count: {count}</div>;
}

// ✅ CORRECT: useMemo for expensive calculations
function Dashboard({ transactions }) {
  const analytics = useMemo(() => {
    // Expensive: iterates 10,000+ items, aggregates by month, calculates trends
    return calculateAnalytics(transactions); // Takes 50-100ms
  }, [transactions]);

  return <AnalyticsChart data={analytics} />;
}
```

**When to use useMemo:**
- Calculation takes >10ms (check DevTools Profiler)
- Calculation runs on every render
- Result is used in child component (prevents unnecessary re-renders)

### useCallback (Memoize Functions)

Caches function reference (useful for passing to memoized children).

```typescript
// ❌ WRONG: useCallback without React.memo child
function Parent() {
  // Pointless — Child isn't memoized, so it re-renders anyway
  const handleClick = useCallback(() => console.log('clicked'), []);
  return <Child onClick={handleClick} />;
}

// ✅ CORRECT: useCallback with React.memo child
const MemoizedChild = React.memo(({ onClick }) => {
  console.log('Child rendered');
  return <button onClick={onClick}>Click</button>;
});

function Parent() {
  const [count, setCount] = useState(0);

  // Function reference stays same across renders → MemoizedChild doesn't re-render
  const handleClick = useCallback(() => {
    console.log('clicked');
  }, []);

  return (
    <div>
      <button onClick={() => setCount(count + 1)}>Increment {count}</button>
      <MemoizedChild onClick={handleClick} />
    </div>
  );
}
```

**When to use useCallback:**
- Passing function to **memoized child component**
- Function is used as **dependency in useEffect**
- Function reference matters (e.g., compared with `===`)

---

## 6. Debounce vs Throttle

Both limit how often a function executes. Different strategies.

### Debounce

**Waits for pause in events before executing.** Resets timer on every event.

**Use for:**
- Search input (wait for user to stop typing)
- Resize handlers (wait for user to finish resizing)
- Form validation (wait for user to finish editing field)

```typescript
// utils/debounce.ts
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;

  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}
```

**Example: Search input**
```typescript
'use client';
import { useState, useCallback } from 'react';
import { debounce } from '@/utils/debounce';

export function SearchInput() {
  const [query, setQuery] = useState('');

  // ✅ CORRECT: Debounce search — only fires 300ms after user stops typing
  const debouncedSearch = useCallback(
    debounce(async (value: string) => {
      if (value.length > 2) {
        const results = await fetch(`/api/search?q=${value}`).then((r) => r.json());
        console.log(results);
      }
    }, 300),
    []
  );

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setQuery(value);
    debouncedSearch(value);
  }

  return <input type="text" value={query} onChange={handleChange} />;
}
```

### Throttle

**Executes at most once per interval**, regardless of how many events fire.

**Use for:**
- Scroll handlers (check position every 200ms)
- Mouse move trackers
- Infinite scroll sentinel checks
- Window resize handlers (when you need periodic updates during resize)

```typescript
// utils/throttle.ts
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let lastCall = 0;

  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      func(...args);
    }
  };
}
```

**Example: Scroll position tracker**
```typescript
'use client';
import { useEffect, useState } from 'react';
import { throttle } from '@/utils/throttle';

export function ScrollProgress() {
  const [scrollPercent, setScrollPercent] = useState(0);

  useEffect(() => {
    // ✅ CORRECT: Throttle scroll handler — updates at most once per 100ms
    const handleScroll = throttle(() => {
      const scrolled = window.scrollY;
      const total = document.documentElement.scrollHeight - window.innerHeight;
      const percent = (scrolled / total) * 100;
      setScrollPercent(percent);
    }, 100);

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="fixed top-0 left-0 h-1 bg-blue-500" style={{ width: `${scrollPercent}%` }} />
  );
}
```

### Comparison

| Technique | Timing | Use Case |
|-----------|--------|----------|
| **Debounce** | Waits for pause | Search input, form validation, resize end |
| **Throttle** | Executes at intervals | Scroll handlers, mouse move, infinite scroll |

**Visual:**
- Debounce: User types "hello" → waits 300ms after "o" → executes once
- Throttle: User scrolls for 2s → executes every 100ms = 20 times

---

## 7. Streaming SSR with Suspense

Streaming sends HTML in chunks as soon as components are ready, rather than waiting for entire page to render.

**Performance benefits:**
- Reduces TTFB (Time to First Byte) — browser gets initial HTML faster
- Reduces LCP — critical content renders while slow data is still loading
- Prevents long data requests from blocking page render

**Real-world impact:** TTFB can drop from 450ms to 45ms, LCP from 1.2s to 380ms.

### How It Works

Next.js 15 enables streaming by default with App Router. Wrap slow components in `<Suspense>` with a fallback.

```typescript
// app/dashboard/page.tsx
import { Suspense } from 'react';
import { RecentOrders } from '@/components/RecentOrders';
import { UserProfile } from '@/components/UserProfile';

export default function DashboardPage() {
  return (
    <div>
      <h1>Dashboard</h1>

      {/* ✅ CORRECT: Fast component renders immediately */}
      <UserProfile />

      {/* ✅ CORRECT: Slow component wrapped in Suspense (doesn't block page) */}
      <Suspense fallback={<div className="h-64 bg-gray-100 animate-pulse" />}>
        <RecentOrders />
      </Suspense>
    </div>
  );
}
```

```typescript
// components/RecentOrders.tsx (Server Component)
import { createClient } from '@/lib/supabase/server';

export async function RecentOrders() {
  const supabase = await createClient();

  // Slow query (joins multiple tables, aggregates data)
  const { data: orders } = await supabase
    .from('orders')
    .select('*, items(*), customers(*)')
    .order('created_at', { ascending: false })
    .limit(10);

  return (
    <div>
      <h2>Recent Orders</h2>
      <ul>
        {orders?.map((order) => (
          <li key={order.id}>{order.id}</li>
        ))}
      </ul>
    </div>
  );
}
```

### Suspense Boundary Strategy

**Rule:** One Suspense boundary per independent data dependency, grouped by visual section.

**❌ Too few boundaries:**
```typescript
// Entire page wrapped in one Suspense — blocks everything on slowest data source
<Suspense fallback={<div>Loading...</div>}>
  <UserProfile />       {/* Fast: 50ms */}
  <RecentOrders />      {/* Slow: 800ms */}
  <AnalyticsChart />    {/* Slow: 1200ms */}
</Suspense>
```
Page waits 1200ms before showing anything. Defeats purpose of streaming.

**❌ Too many boundaries:**
```typescript
// Every tiny component wrapped — creates "popcorn effect"
<Suspense fallback={<div>Loading 1...</div>}>
  <UserName />
</Suspense>
<Suspense fallback={<div>Loading 2...</div>}>
  <UserEmail />
</Suspense>
<Suspense fallback={<div>Loading 3...</div>}>
  <UserAvatar />
</Suspense>
```
Page erupts with dozens of skeleton-to-content transitions in rapid succession.

**✅ Correct: One boundary per independent data source**
```typescript
// Each section gets its own boundary
<div>
  <Suspense fallback={<ProfileSkeleton />}>
    <UserProfile />  {/* Fetches user data */}
  </Suspense>

  <Suspense fallback={<OrdersSkeleton />}>
    <RecentOrders />  {/* Fetches orders data */}
  </Suspense>

  <Suspense fallback={<ChartSkeleton />}>
    <AnalyticsChart />  {/* Fetches analytics data */}
  </Suspense>
</div>
```

**Dimension-matched skeletons** (prevents CLS):
```typescript
// ✅ CORRECT: Skeleton matches final content dimensions
<Suspense fallback={<div className="h-64 w-full bg-gray-100 rounded animate-pulse" />}>
  <RecentOrders /> {/* Final content is also h-64 */}
</Suspense>
```

---

## 8. Bundle Analysis

Regularly analyze your bundle to catch bloat before it ships.

### Setup @next/bundle-analyzer

```bash
pnpm add --save-exact @next/bundle-analyzer
```

```javascript
// next.config.js
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

module.exports = withBundleAnalyzer({
  // Your existing Next.js config
});
```

**Run analysis:**
```bash
ANALYZE=true pnpm build
```

Opens three HTML files in browser:
- `client.html` — Browser bundle (most important)
- `nodejs.html` — Server bundle
- `edge.html` — Edge runtime bundle

### Interpreting Results

**Target bundle sizes:**
- **Initial bundle:** <250KB gzipped (fast on 3G)
- **Total bundle:** <1MB gzipped (good UX)

**Look for:**
- Large dependencies (>100KB) — can they be lazy-loaded?
- Duplicate packages (same library bundled twice)
- Unused code (tree-shaking not working)

### Common Issues & Fixes

**Issue: Icon library bloat**
```typescript
// ❌ WRONG: Imports entire library (500KB+)
import { FaUser, FaHome, FaBell } from 'react-icons/fa';

// ✅ CORRECT: Use optimizePackageImports in next.config.js
// next.config.js
module.exports = {
  experimental: {
    optimizePackageImports: ['react-icons'], // Only bundles used icons
  },
};
```

**Issue: Moment.js bloat (entire library is 300KB+)**
```typescript
// ❌ WRONG: moment.js is huge and includes all locales
import moment from 'moment';

// ✅ CORRECT: Use date-fns (tree-shakeable, only bundle what you use)
import { format, parseISO } from 'date-fns';

const formatted = format(parseISO('2024-01-15'), 'MMM d, yyyy');
```

**Issue: Lodash bloat**
```typescript
// ❌ WRONG: Imports entire lodash library
import _ from 'lodash';
const unique = _.uniq(array);

// ✅ CORRECT: Import only what you need
import uniq from 'lodash/uniq';
const unique = uniq(array);

// ✅ EVEN BETTER: Use native JavaScript
const unique = [...new Set(array)];
```

---

## Anti-Patterns

### Anti-Pattern 1: Using `<img>` instead of `<Image>`

**❌ WRONG:**
```typescript
<img src="/hero.jpg" alt="Hero" style={{ width: '100%' }} />
```

**Problems:**
- No automatic optimization (sends full-size 5MB image)
- No lazy loading
- No responsive sizes
- Causes CLS (layout shift)
- No WebP/AVIF conversion

**✅ CORRECT:**
```typescript
import Image from 'next/image';

<Image
  src="/hero.jpg"
  alt="Hero"
  width={1200}
  height={600}
  priority // Above fold
  sizes="(max-width: 768px) 100vw, 1200px"
/>
```

**Benefits:** 60-80% smaller file size, no CLS, lazy loading for below-fold images.

---

### Anti-Pattern 2: Not code-splitting heavy components

**❌ WRONG:**
```typescript
// app/page.tsx
import RichTextEditor from '@/components/RichTextEditor'; // 200KB+ library

export default function HomePage() {
  return (
    <div>
      <h1>Home</h1>
      <RichTextEditor /> {/* Bundled in initial page load */}
    </div>
  );
}
```

**Problem:** Initial page load includes 200KB editor, even if user never uses it.

**✅ CORRECT:**
```typescript
// app/page.tsx
import dynamic from 'next/dynamic';

const RichTextEditor = dynamic(() => import('@/components/RichTextEditor'), {
  loading: () => <div>Loading editor...</div>,
  ssr: false,
});

export default function HomePage() {
  const [showEditor, setShowEditor] = useState(false);

  return (
    <div>
      <h1>Home</h1>
      <button onClick={() => setShowEditor(true)}>Open Editor</button>
      {showEditor && <RichTextEditor />}
    </div>
  );
}
```

**Benefits:** Initial page load is 200KB lighter. Editor loads only when user clicks button.

---

### Anti-Pattern 3: Overusing React.memo without measuring

**❌ WRONG:**
```typescript
// Wrapping every component in memo "just in case"
const Header = React.memo(() => <header>Header</header>);
const Footer = React.memo(() => <footer>Footer</footer>);
const Button = React.memo(({ label }) => <button>{label}</button>);
const Text = React.memo(({ children }) => <p>{children}</p>);
```

**Problems:**
- Adds overhead (memo does shallow comparison on every render)
- Increases code complexity
- Can hurt performance if component re-renders often anyway

**✅ CORRECT:**
```typescript
// Only memoize components that:
// 1. Re-render often with same props
// 2. Have expensive rendering logic
// 3. Show measurable improvement in React DevTools Profiler

const ExpensiveChart = React.memo(({ data }: { data: number[] }) => {
  // Heavy D3/Canvas rendering
  return <canvas>{/* ... */}</canvas>;
});

// Don't memoize simple components
function Header() {
  return <header>Header</header>;
}
```

**Rule:** Profile first with React DevTools Profiler. Only optimize what's actually slow.

---

### Anti-Pattern 4: Inline anonymous functions in render

**❌ WRONG:**
```typescript
function TodoList({ todos }: { todos: Todo[] }) {
  return (
    <ul>
      {todos.map((todo) => (
        // New function created on every render
        <TodoItem key={todo.id} todo={todo} onDelete={() => deleteTodo(todo.id)} />
      ))}
    </ul>
  );
}
```

**Problem:** If `TodoItem` is memoized, it re-renders anyway because `onDelete` is a new function reference every time.

**✅ CORRECT:**
```typescript
const TodoItem = React.memo(({ todo, onDelete }: { todo: Todo; onDelete: () => void }) => {
  console.log('Rendering TodoItem', todo.id);
  return (
    <li>
      {todo.title}
      <button onClick={onDelete}>Delete</button>
    </li>
  );
});

function TodoList({ todos }: { todos: Todo[] }) {
  const handleDelete = useCallback((id: string) => {
    deleteTodo(id);
  }, []);

  return (
    <ul>
      {todos.map((todo) => (
        <TodoItem key={todo.id} todo={todo} onDelete={() => handleDelete(todo.id)} />
      ))}
    </ul>
  );
}
```

**Even better:** Pass `todo.id` directly and memoize function at list level:
```typescript
function TodoList({ todos }: { todos: Todo[] }) {
  return (
    <ul>
      {todos.map((todo) => (
        <TodoItem key={todo.id} todo={todo} onDelete={deleteTodo} />
      ))}
    </ul>
  );
}

const TodoItem = React.memo(({ todo, onDelete }: { todo: Todo; onDelete: (id: string) => void }) => {
  return (
    <li>
      {todo.title}
      <button onClick={() => onDelete(todo.id)}>Delete</button>
    </li>
  );
});
```

---

### Anti-Pattern 5: Using Client Component when Server Component would work

**❌ WRONG:**
```typescript
// app/posts/page.tsx
'use client';
import { useEffect, useState } from 'react';

export default function PostsPage() {
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    // Client-side data fetching
    fetch('/api/posts')
      .then((r) => r.json())
      .then(setPosts);
  }, []);

  return (
    <div>
      <h1>Posts</h1>
      <ul>
        {posts.map((post) => (
          <li key={post.id}>{post.title}</li>
        ))}
      </ul>
    </div>
  );
}
```

**Problems:**
- Sends React + fetching code to browser (larger bundle)
- Requires hydration (slower initial load)
- Requires API route (`/api/posts`) as middleman
- Shows loading state on every navigation

**✅ CORRECT:**
```typescript
// app/posts/page.tsx (Server Component — default)
import { createClient } from '@/lib/supabase/server';

export default async function PostsPage() {
  const supabase = await createClient();

  // Server-side data fetching — zero JavaScript to browser
  const { data: posts } = await supabase
    .from('posts')
    .select('*')
    .order('created_at', { ascending: false });

  return (
    <div>
      <h1>Posts</h1>
      <ul>
        {posts?.map((post) => (
          <li key={post.id}>{post.title}</li>
        ))}
      </ul>
    </div>
  );
}
```

**Benefits:**
- Zero JavaScript to browser (faster initial load)
- No API route needed (direct DB access)
- Instant render (data fetched before page sent)
- Better SEO (content in initial HTML)

---

## Implementation Examples

### Example 1: Optimized Image Gallery

```typescript
// app/gallery/page.tsx
import Image from 'next/image';
import { createClient } from '@/lib/supabase/server';

export default async function GalleryPage() {
  const supabase = await createClient();
  const { data: images } = await supabase.from('images').select('*');

  return (
    <div className="grid grid-cols-3 gap-4">
      {images?.map((img, index) => (
        <div key={img.id} className="relative aspect-square">
          <Image
            src={img.url}
            alt={img.caption}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover rounded"
            priority={index < 3} // First 3 images are priority (above fold)
            placeholder="blur"
            blurDataURL={img.blur_data_url}
          />
        </div>
      ))}
    </div>
  );
}
```

---

### Example 2: Code-Split Modal with Heavy Library

```typescript
// components/MapModal.tsx
'use client';
import { useState } from 'react';
import dynamic from 'next/dynamic';

// Lazy-load Mapbox library (500KB+)
const MapView = dynamic(() => import('./MapView'), {
  loading: () => <div className="h-96 bg-gray-100 animate-pulse">Loading map...</div>,
  ssr: false, // Mapbox uses window/navigator
});

export function MapModal() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button onClick={() => setIsOpen(true)}>View Map</button>
      {isOpen && (
        <dialog open className="fixed inset-0 z-50">
          <MapView />
          <button onClick={() => setIsOpen(false)}>Close</button>
        </dialog>
      )}
    </>
  );
}
```

---

### Example 3: Debounced Search with Loading State

```typescript
// components/SearchBar.tsx
'use client';
import { useState, useCallback } from 'react';
import { debounce } from '@/utils/debounce';

export function SearchBar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const debouncedSearch = useCallback(
    debounce(async (value: string) => {
      if (value.length < 3) {
        setResults([]);
        return;
      }

      setIsLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(value)}`);
        const data = await res.json();
        setResults(data);
      } catch (error) {
        console.error('Search failed:', error);
      } finally {
        setIsLoading(false);
      }
    }, 300),
    []
  );

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setQuery(value);
    debouncedSearch(value);
  }

  return (
    <div>
      <input
        type="text"
        value={query}
        onChange={handleChange}
        placeholder="Search..."
        className="px-4 py-2 border rounded"
      />
      {isLoading && <div className="text-sm text-gray-500">Searching...</div>}
      <ul>
        {results.map((result: any) => (
          <li key={result.id}>{result.name}</li>
        ))}
      </ul>
    </div>
  );
}
```

---

### Example 4: Streaming Dashboard with Suspense

```typescript
// app/dashboard/page.tsx
import { Suspense } from 'react';
import { UserHeader } from '@/components/UserHeader';
import { RecentActivity } from '@/components/RecentActivity';
import { AnalyticsChart } from '@/components/AnalyticsChart';

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      {/* Fast component: renders immediately */}
      <UserHeader />

      <div className="grid grid-cols-2 gap-8">
        {/* Slow component 1: independent data source */}
        <Suspense fallback={<ActivitySkeleton />}>
          <RecentActivity />
        </Suspense>

        {/* Slow component 2: independent data source */}
        <Suspense fallback={<ChartSkeleton />}>
          <AnalyticsChart />
        </Suspense>
      </div>
    </div>
  );
}

function ActivitySkeleton() {
  return <div className="h-64 bg-gray-100 rounded animate-pulse" />;
}

function ChartSkeleton() {
  return <div className="h-64 bg-gray-100 rounded animate-pulse" />;
}
```

---

### Example 5: Bundle Optimization Config

```javascript
// next.config.js
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

module.exports = withBundleAnalyzer({
  experimental: {
    // Only load used modules from large packages
    optimizePackageImports: [
      'react-icons',
      'lucide-react',
      '@heroicons/react',
      'date-fns',
    ],
  },

  // Reduce bundle size by removing unused code
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },

  images: {
    formats: ['image/avif', 'image/webp'], // Modern formats (smaller)
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
});
```

---

## Testing Checklist

- [ ] **Core Web Vitals pass "Good" thresholds**
  - [ ] LCP <2.5s (test with Lighthouse, PageSpeed Insights)
  - [ ] INP <200ms (test real interactions with Chrome DevTools)
  - [ ] CLS <0.1 (no layout shift during load)

- [ ] **Bundle size under targets**
  - [ ] Initial bundle <250KB gzipped
  - [ ] Total bundle <1MB gzipped
  - [ ] No duplicate dependencies in bundle analyzer

- [ ] **Images optimized**
  - [ ] All images use `<Image>` component (no `<img>`)
  - [ ] LCP image has `priority` prop
  - [ ] Responsive images have `sizes` prop
  - [ ] Below-fold images lazy-load automatically

- [ ] **Code splitting works**
  - [ ] Heavy components lazy-load with `next/dynamic`
  - [ ] Modal/drawer components only load when opened
  - [ ] Third-party libraries (charts, editors) code-split

- [ ] **Fonts optimized**
  - [ ] Using `next/font` (no external Google Fonts links)
  - [ ] Variable fonts used where possible
  - [ ] No FOUT (flash of unstyled text) or FOIT (flash of invisible text)

- [ ] **Server/Client Components correct**
  - [ ] Static content uses Server Components
  - [ ] Interactive components marked with `'use client'`
  - [ ] Data fetching happens on server when possible

- [ ] **Streaming works**
  - [ ] Slow components wrapped in `<Suspense>`
  - [ ] Skeletons match final content dimensions (no CLS)
  - [ ] One boundary per independent data source

- [ ] **React optimization appropriate**
  - [ ] React.memo only on expensive, frequently re-rendering components
  - [ ] useMemo only for calculations >10ms
  - [ ] useCallback only when passing to memoized children

---

## Accessibility Checklist

- [ ] **Loading states visible**
  - [ ] Skeletons have `aria-busy="true"` and `aria-live="polite"`
  - [ ] Loading spinners have accessible labels

- [ ] **Images have alt text**
  - [ ] All `<Image>` components have descriptive `alt` prop
  - [ ] Decorative images have `alt=""` (empty string)

- [ ] **Suspense fallbacks are accessible**
  - [ ] Skeletons don't cause focus loss
  - [ ] Screen readers announce when content loads

- [ ] **Keyboard navigation works**
  - [ ] Lazy-loaded modals can be dismissed with Escape
  - [ ] Focus trapped in modals
  - [ ] Focus restored when modal closes

---

## Performance Checklist

- [ ] **Measure before optimizing**
  - [ ] React DevTools Profiler identifies slow components
  - [ ] Chrome DevTools Performance tab shows bottlenecks
  - [ ] Lighthouse report shows opportunities

- [ ] **Code splitting implemented**
  - [ ] Route-level splitting (automatic in App Router)
  - [ ] Component-level splitting for heavy components (>50KB)
  - [ ] Third-party libraries lazy-loaded

- [ ] **Images optimized**
  - [ ] Using next/image (not <img>)
  - [ ] Priority set for LCP image
  - [ ] Sizes prop for responsive images
  - [ ] Placeholder blur for better perceived performance

- [ ] **Fonts optimized**
  - [ ] Using next/font (self-hosted, zero layout shift)
  - [ ] Variable fonts used
  - [ ] Font subsetting for smaller file size

- [ ] **Debounce/throttle for frequent events**
  - [ ] Search inputs debounced (300ms)
  - [ ] Scroll handlers throttled (100-200ms)
  - [ ] Resize handlers debounced or throttled

- [ ] **Server Components default, Client Components only when needed**
  - [ ] Static content uses Server Components
  - [ ] Interactive components marked with 'use client'
  - [ ] Data fetching on server when possible

- [ ] **Streaming for slow data**
  - [ ] Slow components wrapped in Suspense
  - [ ] One boundary per independent data source
  - [ ] Skeletons match content dimensions

- [ ] **Bundle analyzed regularly**
  - [ ] Run `ANALYZE=true pnpm build` before major releases
  - [ ] No unexpected large dependencies
  - [ ] Tree-shaking working (no unused code in bundle)

---

## Security Checklist

- [ ] **No sensitive data in client bundles**
  - [ ] API keys, secrets, tokens only in Server Components or API routes
  - [ ] Environment variables prefixed with `NEXT_PUBLIC_` only if truly public

- [ ] **Images from trusted sources**
  - [ ] Remote images configured in `next.config.js` `images.remotePatterns`
  - [ ] User-uploaded images sanitized and validated

- [ ] **Code splitting doesn't expose routes**
  - [ ] Dynamic imports don't leak admin/internal route names
  - [ ] Middleware protects routes before code-split bundles load

---

## Integration Notes

**Works well with:**
- **data-fetching.md** — TanStack Query caching + code splitting = fast, optimized data loading
- **infinite-scroll.md** — Throttle scroll handlers, virtualize >200 items
- **pagination.md** — Prefetch next page on hover for instant navigation
- **optimistic-updates.md** — useMemo to prevent expensive calculations on every optimistic update

**Potential conflicts:**
- **None** — Performance is orthogonal to all other patterns. Always applicable.

**Dependencies:**
- Uses TanStack Query from `data-fetching.md` for prefetch examples
- Complements all patterns (performance is always relevant)

---

## References

1. [Next.js Dynamic Imports](https://nextjs.org/docs/pages/guides/lazy-loading)
2. [Core Web Vitals (web.dev)](https://web.dev/articles/vitals)
3. [Core Web Vitals 2026 Guide](https://www.digitalapplied.com/blog/core-web-vitals-2026-inp-lcp-cls-optimization-guide)
4. [React.memo Documentation](https://react.dev/reference/react/memo)
5. [Kent C. Dodds: When to useMemo and useCallback](https://kentcdodds.com/blog/usememo-and-usecallback)
6. [next/image Documentation](https://nextjs.org/docs/app/api-reference/components/image)
7. [next/font Documentation](https://nextjs.org/docs/app/getting-started/fonts)
8. [Next.js Bundle Analyzer](https://nextjs.org/docs/app/guides/package-bundling)
9. [Server Components vs Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components)
10. [React Suspense Streaming Guide](https://www.freecodecamp.org/news/the-nextjs-15-streaming-handbook/)
11. [Debounce vs Throttle](https://kettanaito.com/blog/debounce-vs-throttle)

---

## Version History

- **v1.0** (2024-01-15): Initial performance pattern with Core Web Vitals, code splitting, image optimization, React optimization, Server/Client Components, streaming SSR
