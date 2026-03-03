# Pattern: Browser Extension Hydration Warnings
# CodeBakers V4 | agents/patterns/browser-extensions.md

---

## The Problem

**React hydration mismatch warnings in Next.js caused by browser extensions:**

```
Warning: Extra attributes from the server: cz-shortcut-listen
Warning: Extra attributes from the server: data-new-gr-c-s-check-loaded
Warning: Extra attributes from the server: data-lastpass-icon-root
```

**What causes this:**

1. Server renders clean HTML: `<body>...</body>`
2. Browser extension injects attribute: `<body cz-shortcut-listen="true">...</body>`
3. React hydration sees mismatch (server HTML ≠ client DOM)
4. Warning appears in console

**Common offending extensions:**
- ColorZilla (`cz-shortcut-listen`)
- Grammarly (`data-new-gr-c-s-check-loaded`, `data-gr-ext-installed`)
- LastPass (`data-lastpass-icon-root`)
- Honey (`data-honey-extension-installed`)
- React DevTools (`__REACT_DEVTOOLS_*`)
- Any extension that modifies DOM on page load

**This is NOT a bug in your code.** Browser extensions inject attributes into the DOM, causing React to detect a mismatch during hydration.

---

## The Solution

**Suppress these specific warnings in development only.**

Add this to `app/layout.tsx` (or root layout):

```typescript
// Suppress browser extension hydration warnings (development only)
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  const originalError = console.error
  console.error = (...args) => {
    // Ignore browser extension hydration warnings
    if (
      typeof args[0] === 'string' &&
      (
        args[0].includes('Extra attributes from the server') ||
        args[0].includes('Hydration failed because') && (
          args[0].includes('cz-shortcut-listen') ||
          args[0].includes('data-new-gr-c-s-check-loaded') ||
          args[0].includes('data-gr-ext-installed') ||
          args[0].includes('data-lastpass-icon-root') ||
          args[0].includes('data-honey-extension')
        )
      )
    ) {
      return // Suppress - not a real error
    }

    // All other errors pass through
    originalError.apply(console, args)
  }
}
```

**Alternative approach (more targeted):**

Only suppress if the warning mentions known extension attributes:

```typescript
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  const knownExtensionAttributes = [
    'cz-shortcut-listen',              // ColorZilla
    'data-new-gr-c-s-check-loaded',    // Grammarly
    'data-gr-ext-installed',           // Grammarly
    'data-lastpass-icon-root',         // LastPass
    'data-honey-extension-installed',  // Honey
    'data-1p-extension-installed',     // 1Password
    'data-bitwarden-watching'          // Bitwarden
  ]

  const originalError = console.error
  console.error = (...args) => {
    if (typeof args[0] === 'string' && args[0].includes('Extra attributes from the server')) {
      // Check if any known extension attribute is mentioned
      const isExtensionWarning = knownExtensionAttributes.some(attr =>
        args[0].includes(attr)
      )

      if (isExtensionWarning) {
        return // Suppress browser extension warning
      }
    }

    originalError.apply(console, args)
  }
}
```

---

## When to Use This Pattern

**Always include in Next.js projects** during initial setup.

Triggers:
- Creating new Next.js App Router project
- Setting up root layout (app/layout.tsx)
- User reports hydration mismatch warnings

**Where to add:**
- `app/layout.tsx` (client-side code inside component)
- Or create `lib/suppress-extension-warnings.ts` and import in layout

---

## Why It's Safe

**This suppression is safe because:**

1. **Development only** - Never runs in production
2. **Specific warnings only** - Only suppresses known extension attributes
3. **Real errors still show** - All other console.error calls pass through unchanged
4. **Doesn't affect functionality** - Extensions still work, warnings just hidden

**Real hydration errors (your bugs) will still appear:**
- Missing/extra elements
- Text content mismatches
- Attribute mismatches from your code

---

## Example Implementation

**File: `app/layout.tsx`**

```typescript
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Your App',
  description: 'Your app description',
}

// Suppress browser extension hydration warnings (development only)
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  const knownExtensionAttributes = [
    'cz-shortcut-listen',
    'data-new-gr-c-s-check-loaded',
    'data-gr-ext-installed',
    'data-lastpass-icon-root',
    'data-honey-extension-installed',
  ]

  const originalError = console.error
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Extra attributes from the server')
    ) {
      const isExtensionWarning = knownExtensionAttributes.some(attr =>
        args[0].includes(attr)
      )
      if (isExtensionWarning) return
    }
    originalError.apply(console, args)
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
```

---

## Troubleshooting

**If warnings still appear:**

1. **Check the attribute name** in the warning
2. **Add it to `knownExtensionAttributes` array**
3. **Verify it's actually a browser extension** (not your code)

**How to verify it's an extension:**

1. Open dev tools → Elements tab
2. Inspect `<body>` tag
3. Look for attributes you didn't add
4. Google the attribute name (e.g., "cz-shortcut-listen")
5. Confirm it's from a browser extension

**To permanently fix (user action):**
- Disable the extension when developing
- Or use incognito mode (extensions disabled by default)
- Or suppress the warning (this pattern)

---

## CodeBakers Integration

**When to include automatically:**

- New Next.js project setup
- Creating `app/layout.tsx`
- First time user reports hydration warning

**Log to ASSUMPTIONS.md:**

```markdown
## [Date] Browser Extension Warnings Suppressed

Decision: Added browser extension hydration warning suppression to app/layout.tsx

Context: Next.js React hydration detects mismatches when browser extensions (ColorZilla, Grammarly, LastPass, etc.) inject DOM attributes during page load.

Reasoning:
- These warnings are noise (not real bugs in our code)
- Extensions are beyond our control
- Suppressing these specific warnings improves DX
- Real hydration errors still appear
- Development-only code (never runs in production)

Alternatives considered:
- Ask users to disable extensions (bad DX)
- Ignore warnings (clutters console)
- Fix server-side to match (impossible - can't predict extensions)

Reversibility: Easy - delete the suppression code
```

---

*CodeBakers V4 | Pattern: Browser Extension Hydration Warnings | agents/patterns/browser-extensions.md*
