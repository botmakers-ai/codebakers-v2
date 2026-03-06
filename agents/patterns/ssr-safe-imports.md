# Pattern: SSR-Safe Imports
# CodeBakers V4 | agents/patterns/ssr-safe-imports.md

---

## The Problem

**"ReferenceError: window is not defined" in Next.js Server-Side Rendering:**

```
ReferenceError: window is not defined
  at node_modules/some-library/index.js:5:12

ReferenceError: document is not defined
  at node_modules/chart-library/dom.js:15:8

ReferenceError: localStorage is not defined
  at lib/storage.ts:3:20
```

**What causes this:**

1. Next.js renders pages on the server first (Node.js environment)
2. Node.js has no `window`, `document`, `localStorage`, or browser APIs
3. Library or code tries to access these during import/execution
4. Server crashes or page fails to render

**Common offending libraries:**
- Chart libraries (Chart.js, D3, Recharts accessing window for measurements)
- Rich text editors (Quill, TinyMCE, Draft.js)
- Animation libraries (GSAP, Lottie)
- Browser storage wrappers
- Libraries that detect viewport size
- Any library using `window.addEventListener` at top level

---

## The Solution

**Three approaches depending on when the library accesses browser APIs:**

### Approach 1: Dynamic Import with `next/dynamic` (Most Common)

**Use when:** Library accesses browser APIs during import or initialization

```typescript
// ❌ WRONG - crashes on server
import Chart from 'some-chart-library'

export default function Dashboard() {
  return <Chart data={data} />
}
```

```typescript
// ✅ CORRECT - only imports on client
import dynamic from 'next/dynamic'

const Chart = dynamic(() => import('some-chart-library'), {
  ssr: false,  // Don't render on server
  loading: () => <div>Loading chart...</div>  // Optional loading state
})

export default function Dashboard() {
  return <Chart data={data} />
}
```

**With named exports:**
```typescript
// Library exports: export const RichTextEditor = ...

const RichTextEditor = dynamic(
  () => import('some-editor').then(mod => mod.RichTextEditor),
  { ssr: false }
)
```

---

### Approach 2: Conditional Execution with `typeof window` Check

**Use when:** Your own code accesses browser APIs, not external library

```typescript
// ❌ WRONG - crashes on server
const theme = localStorage.getItem('theme')

export default function ThemeProvider() {
  // ...
}
```

```typescript
// ✅ CORRECT - only runs on client
'use client'  // Required for hooks in Next.js App Router

export default function ThemeProvider() {
  const [theme, setTheme] = useState<string | null>(null)

  useEffect(() => {
    // This only runs on client (useEffect never runs on server)
    const savedTheme = localStorage.getItem('theme')
    setTheme(savedTheme)
  }, [])

  // ...
}
```

**For non-hook code:**
```typescript
// Top-level code that needs browser APIs
const isBrowser = typeof window !== 'undefined'
const theme = isBrowser ? localStorage.getItem('theme') : null
```

---

### Approach 3: Client Component Boundary

**Use when:** Entire component tree needs client-side APIs

```typescript
// ❌ WRONG - mixing server and client
export default function Dashboard() {
  // This is a Server Component by default in App Router
  const handleClick = () => {
    window.analytics.track('click')  // ❌ Crashes - window undefined
  }

  return <button onClick={handleClick}>Track</button>
}
```

```typescript
// ✅ CORRECT - mark as client component
'use client'

export default function Dashboard() {
  const handleClick = () => {
    window.analytics.track('click')  // ✅ Safe - only runs on client
  }

  return <button onClick={handleClick}>Track</button>
}
```

---

## Decision Tree: Which Approach to Use?

```
Does the code access window/document/localStorage?
  ↓
NO → No special handling needed
  ↓
YES → Is it an external library?
  ↓
  YES → Does the library provide a React component?
    ↓
    YES → Use dynamic import (Approach 1)
    ↓
    NO → Import the library inside useEffect (Approach 2)
  ↓
  NO (it's your code) → Is it just a few browser API calls?
    ↓
    YES → Use typeof window check or useEffect (Approach 2)
    ↓
    NO (complex client logic) → Mark component as 'use client' (Approach 3)
```

---

## Common Patterns and Examples

### Pattern: Chart Library
```typescript
// File: components/sales-chart.tsx
'use client'

import dynamic from 'next/dynamic'

// Lazy load chart library (only on client)
const Chart = dynamic(() => import('react-chartjs-2').then(mod => mod.Line), {
  ssr: false,
  loading: () => <div className="h-64 bg-gray-100 animate-pulse rounded" />
})

export function SalesChart({ data }: { data: ChartData }) {
  return (
    <div className="w-full h-64">
      <Chart data={data} options={chartOptions} />
    </div>
  )
}
```

### Pattern: Rich Text Editor
```typescript
// File: components/editor.tsx
'use client'

import dynamic from 'next/dynamic'
import { useState } from 'react'

const ReactQuill = dynamic(() => import('react-quill'), {
  ssr: false,
  loading: () => <div className="h-48 border rounded animate-pulse bg-gray-50" />
})

export function Editor({ onChange }: { onChange: (content: string) => void }) {
  const [value, setValue] = useState('')

  return (
    <ReactQuill
      value={value}
      onChange={(content) => {
        setValue(content)
        onChange(content)
      }}
    />
  )
}
```

### Pattern: localStorage with SSR Fallback
```typescript
// File: lib/storage.ts

export function getStoredValue<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') {
    return fallback  // Server: return default
  }

  try {
    const item = localStorage.getItem(key)
    return item ? JSON.parse(item) : fallback
  } catch (error) {
    console.error(`Error reading localStorage key "${key}":`, error)
    return fallback
  }
}

export function setStoredValue<T>(key: string, value: T): void {
  if (typeof window === 'undefined') {
    return  // Server: no-op
  }

  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (error) {
    console.error(`Error setting localStorage key "${key}":`, error)
  }
}
```

### Pattern: Browser-Only Utility Hook
```typescript
// File: hooks/use-media-query.ts
'use client'

import { useState, useEffect } from 'react'

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    // Only runs on client
    const media = window.matchMedia(query)
    setMatches(media.matches)

    const listener = (e: MediaQueryListEvent) => setMatches(e.matches)
    media.addEventListener('change', listener)

    return () => media.removeEventListener('change', listener)
  }, [query])

  return matches
}
```

---

## Integration with Error Sniffer

Add to Error Sniffer detection (category: Build Errors):

```typescript
// Pattern signature:
"ReferenceError: window is not defined"
"ReferenceError: document is not defined"
"ReferenceError: localStorage is not defined"

// Auto-trigger warning when:
- Importing library known to access browser APIs
- Using window/document/localStorage outside useEffect
- Creating component without 'use client' directive when using browser APIs

// Confidence: HIGH (this always fails in Next.js SSR)
```

---

## When to Use This Pattern

**Auto-apply when:**
- Error contains "window is not defined" or "document is not defined"
- Installing chart library, editor library, or animation library
- Creating component that uses localStorage/sessionStorage
- Creating component that uses window.addEventListener

**During code review:**
- Check all external library imports in components
- Verify browser API usage is wrapped in useEffect or typeof check
- Confirm 'use client' directive present when needed

---

## Why This Works

**Next.js Rendering Flow:**

1. **Server (Node.js):**
   - Renders initial HTML
   - No window/document/browser APIs available
   - Dynamic imports with `ssr: false` skip rendering
   - `typeof window === 'undefined'` returns true

2. **Client (Browser):**
   - Hydrates React components
   - Browser APIs available
   - Dynamic imports load and render
   - `typeof window === 'undefined'` returns false

**Trade-offs:**

✅ **Pros:**
- Prevents server crashes
- Page still renders (with loading state)
- Works with any library

❌ **Cons:**
- Component not in initial HTML (SEO impact if content-critical)
- Flash of loading state
- Slight delay before component appears

**When SSR matters:** If the component contains important content for SEO, consider server-compatible alternatives instead of client-only libraries.

---

## Troubleshooting

**Issue: Component still crashes on server**

1. Check if library accesses browser APIs in multiple places
2. Verify `ssr: false` is set in dynamic import
3. Ensure parent component isn't forcing SSR
4. Check for top-level code executing before useEffect

**Issue: Component flashes/jumps on load**

1. Add proper loading state dimensions to match final component
2. Consider skeleton UI instead of generic "Loading..."
3. Use Suspense boundary for smoother transitions

**Issue: TypeScript errors with dynamic import**

```typescript
// If getting type errors, specify component type
import type { ComponentType } from 'react'

const Chart: ComponentType<ChartProps> = dynamic(
  () => import('some-chart-library'),
  { ssr: false }
)
```

---

## CodeBakers Integration

**Auto-log to ASSUMPTIONS.md:**

```markdown
## [Date] SSR-Safe Import Applied

Decision: Used dynamic import for [library name]

Context: Library accesses window/document during initialization, causes "window is not defined" error in Next.js SSR.

Approach: Dynamic import with ssr: false + loading skeleton

Reasoning:
- Library requires browser APIs not available on server
- Dynamic import prevents server crash
- Loading state preserves layout shift prevention
- Trade-off: Component not in initial HTML (acceptable for this use case)

Alternatives considered:
- Server-compatible alternative library (none found with same features)
- Conditional rendering with typeof window check (insufficient - library imports before check)
- Full client component (too broad - only this component needs client APIs)

Reversibility: Easy - remove dynamic import if library adds SSR support
```

---

*CodeBakers V4 | Pattern: SSR-Safe Imports | agents/patterns/ssr-safe-imports.md*
