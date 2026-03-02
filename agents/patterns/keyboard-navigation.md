---
triggers:
  - "keyboard navigation"
  - "keyboard accessibility"
  - "focus management"
  - "tab order"
  - "focus trap"
  - "skip link"
  - "keyboard shortcut"
  - "roving tabindex"
  - "aria keyboard"
  - "modal keyboard"
  - "accessible menu"

depends_on:
  - forms.md (accessible forms with keyboard nav)

prerequisites:
  - Next.js App Router
  - React 18+
  - TypeScript
  - Understanding of WCAG 2.2 keyboard requirements
  - Familiarity with ARIA practices

description: |
  Production-ready keyboard navigation covering: WCAG 2.2 requirements (2.1.1, 2.4.11-13), tab order,
  focus management (visible indicators, focus restoration), skip links, roving tabindex pattern,
  focus trapping in modals, keyboard shortcuts (avoiding screen reader conflicts), accessible component
  patterns (tabs, menus, dropdowns, accordion), and comprehensive testing.
---

# Keyboard Navigation Pattern

## Research Foundation

**Searches performed:**
1. WCAG 2.2 keyboard navigation requirements focus management 2024
2. Roving tabindex pattern ARIA keyboard navigation React 2024
3. Focus trap modal dialog keyboard accessibility React 2024
4. Skip navigation links accessibility WCAG best practices 2024
5. Keyboard shortcuts web app accessibility conflicts screen readers 2024

**Key findings:**
- **WCAG 2.2 released October 5, 2023** — adds 9 new success criteria, 3 related to focus management
- **4,605 ADA lawsuits filed in 2024** — courts increasingly cite WCAG 2.2 as standard
- **2.4.11 (Focus Not Obscured - Minimum) is Level AA** — focus must not be entirely hidden behind sticky headers, modals
- **2.4.13 (Focus Appearance) is Level AAA** — focus indicators must be at least 2px thick with 3:1 contrast
- **Roving tabindex reduces tab stops** — only 1 item in group has `tabindex="0"`, arrow keys navigate rest
- **Focus trap libraries simplify modals** — `focus-trap-react` is standard React solution
- **Skip links must be first focusable element** — positioned before navigation, inside `<header>` or `<main>` landmark
- **Keyboard shortcuts conflict with screen readers** — avoid `accesskey`, use modifier keys (Ctrl/Alt) if implementing
- **2024 WebAIM survey** — lack of keyboard accessibility remains #1 problem (unchanged for 14 years)

---

## WCAG 2.2 Keyboard Requirements

### Success Criterion 2.1.1: Keyboard (Level A)

**Requirement:** All functionality must be operable through keyboard alone.

**What it means:**
- Every interactive element (links, buttons, forms, custom widgets) must be reachable and usable with only keyboard
- Primary keys: Tab, Shift+Tab, Enter, Space, Arrow keys, Escape

**✅ Compliant:**
```typescript
// All interactive elements are semantic HTML (automatically keyboard-accessible)
<button onClick={handleClick}>Click Me</button>
<a href="/about">About</a>
<input type="text" />
<select><option>Option 1</option></select>
```

**❌ Non-compliant:**
```typescript
// div with onClick is not keyboard-accessible
<div onClick={handleClick}>Click Me</div>
// Requires mouse hover to access content
<div onMouseOver={() => setShowMenu(true)}>Menu</div>
```

---

### Success Criterion 2.4.11: Focus Not Obscured (Minimum) — Level AA

**Requirement:** When an element receives keyboard focus, it must not be **entirely** hidden behind sticky headers, modals, or other content.

**What it means:**
- At least part of the focused element must be visible
- Common culprit: sticky headers covering focused elements at top of viewport

**✅ Solution: Scroll with offset**

```typescript
// utils/scroll.ts
export function scrollToElement(element: HTMLElement) {
  const headerHeight = 80; // Height of sticky header
  const elementPosition = element.getBoundingClientRect().top + window.scrollY;
  const offsetPosition = elementPosition - headerHeight - 20; // 20px padding

  window.scrollTo({
    top: offsetPosition,
    behavior: 'smooth',
  });
}
```

```typescript
// components/Modal.tsx
'use client';

import { useEffect, useRef } from 'react';

export function Modal({ isOpen, children }: { isOpen: boolean; children: React.ReactNode }) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && modalRef.current) {
      // Ensure modal is fully visible when opened
      modalRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center', // Center in viewport (not obscured by header/footer)
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div ref={modalRef} className="fixed inset-0 z-50 flex items-center justify-center">
      {children}
    </div>
  );
}
```

---

### Success Criterion 2.4.13: Focus Appearance (Level AAA)

**Requirement:** Focus indicators must meet specific size and contrast requirements:
- **At least 2 CSS pixels thick**
- **3:1 contrast ratio** against adjacent colors

**✅ Compliant Focus Styles:**

```css
/* Global focus styles */
:focus-visible {
  outline: 3px solid #0066cc;
  outline-offset: 2px;
}

/* Remove default outline for mouse users, keep for keyboard */
:focus:not(:focus-visible) {
  outline: none;
}

/* Button focus with sufficient thickness and contrast */
button:focus-visible {
  outline: 3px solid #0066cc; /* Blue with 3:1 contrast against white background */
  outline-offset: 2px;
}

/* Link focus */
a:focus-visible {
  outline: 3px solid #0066cc;
  outline-offset: 2px;
  text-decoration: underline;
  text-decoration-thickness: 3px;
}

/* Input focus */
input:focus-visible,
textarea:focus-visible,
select:focus-visible {
  outline: 3px solid #0066cc;
  outline-offset: 0;
  border-color: #0066cc; /* Also change border for additional visual cue */
}
```

**Tailwind CSS approach:**

```typescript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        focus: '#0066cc', // 3:1 contrast against white
      },
    },
  },
  plugins: [
    function ({ addBase }) {
      addBase({
        ':focus-visible': {
          outline: '3px solid #0066cc',
          outlineOffset: '2px',
        },
        ':focus:not(:focus-visible)': {
          outline: 'none',
        },
      });
    },
  ],
};
```

---

## Tab Order and tabindex

### Tab Order Rules

1. **Natural tab order:** Semantic HTML automatically has correct tab order (top-to-bottom, left-to-right)
2. **Positive tabindex:** Never use `tabindex="1"`, `tabindex="2"`, etc. — ruins natural order
3. **tabindex="0":** Makes element focusable in natural order
4. **tabindex="-1":** Makes element programmatically focusable (not via Tab key)

### When to Use tabindex

```typescript
// ✅ CORRECT: tabindex="0" on custom interactive element
<div
  role="button"
  tabIndex={0}
  onClick={handleClick}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  }}
>
  Custom Button
</div>

// ✅ CORRECT: tabindex="-1" on heading for programmatic focus (skip link target)
<h1 id="main-content" tabIndex={-1}>
  Main Content
</h1>

// ❌ WRONG: Positive tabindex ruins natural tab order
<button tabIndex={1}>First</button>
<button tabIndex={2}>Second</button>
<button tabIndex={3}>Third</button>

// ❌ WRONG: tabindex on non-interactive elements
<div tabIndex={0}>This is just text</div>
```

---

## Skip Links

**Purpose:** Allow keyboard users to bypass repeated navigation and jump directly to main content.

**WCAG 2.4.1 (Level A):** Mechanism to bypass blocks of repeated content.

### Implementation

```typescript
// components/SkipLink.tsx
export function SkipLink() {
  return (
    <a
      href="#main-content"
      className="skip-link"
    >
      Skip to main content
    </a>
  );
}
```

```css
/* Skip link: hidden until focused */
.skip-link {
  position: absolute;
  top: -40px;
  left: 0;
  background: #0066cc;
  color: white;
  padding: 8px 16px;
  text-decoration: none;
  z-index: 100;
  transition: top 0.2s;
}

.skip-link:focus {
  top: 0;
}
```

```typescript
// app/layout.tsx
import { SkipLink } from '@/components/SkipLink';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SkipLink />
        <header>
          <nav>{/* Navigation links */}</nav>
        </header>
        <main id="main-content" tabIndex={-1}>
          {children}
        </main>
      </body>
    </html>
  );
}
```

**Key points:**
- Skip link must be **first focusable element** on page
- Target element needs `tabIndex={-1}` for focus to work in all browsers
- Link must be **visible when focused** (not `display: none`)

---

## Focus Trapping in Modals

**Rule:** When modal opens, focus must be trapped inside. Tab/Shift+Tab should cycle through only modal elements.

### Using focus-trap-react

```bash
pnpm add --save-exact focus-trap-react
```

```typescript
// components/Modal.tsx
'use client';

import { useEffect, useRef } from 'react';
import FocusTrap from 'focus-trap-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // Focus close button when modal opens
    if (isOpen && closeButtonRef.current) {
      closeButtonRef.current.focus();
    }

    // Close on Escape key
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <FocusTrap
        focusTrapOptions={{
          initialFocus: () => closeButtonRef.current!,
          allowOutsideClick: true,
        }}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
        >
          <div className="flex items-start justify-between">
            <h2 id="modal-title" className="text-xl font-semibold">
              {title}
            </h2>
            <button
              ref={closeButtonRef}
              onClick={onClose}
              aria-label="Close dialog"
              className="rounded p-1 hover:bg-gray-100"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="mt-4">{children}</div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="rounded bg-gray-200 px-4 py-2 hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                // Handle confirm action
                onClose();
              }}
              className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              Confirm
            </button>
          </div>
        </div>
      </FocusTrap>
    </div>
  );
}
```

**Keyboard behavior:**
- **Tab/Shift+Tab:** Cycles through modal elements only
- **Escape:** Closes modal
- **Enter/Space on buttons:** Triggers button action

---

## Roving Tabindex Pattern

**Use case:** Complex widgets (toolbars, tab lists, tree views, grids) where Tab key should move **out** of widget, not between items. Arrow keys navigate **within** widget.

**Pattern:**
- Only **one** element has `tabindex="0"` (currently active)
- All other elements have `tabindex="-1"` (programmatically focusable)
- Arrow keys move focus and update `tabindex` values

### Example: Tab Component

```typescript
// components/Tabs.tsx
'use client';

import { useState, useRef, useEffect, KeyboardEvent } from 'react';

interface Tab {
  id: string;
  label: string;
  content: React.ReactNode;
}

interface TabsProps {
  tabs: Tab[];
  defaultTab?: string;
}

export function Tabs({ tabs, defaultTab }: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0].id);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  function handleKeyDown(e: KeyboardEvent<HTMLButtonElement>, index: number) {
    let newIndex = index;

    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        e.preventDefault();
        newIndex = (index + 1) % tabs.length; // Wrap to first
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        e.preventDefault();
        newIndex = (index - 1 + tabs.length) % tabs.length; // Wrap to last
        break;
      case 'Home':
        e.preventDefault();
        newIndex = 0;
        break;
      case 'End':
        e.preventDefault();
        newIndex = tabs.length - 1;
        break;
      default:
        return;
    }

    tabRefs.current[newIndex]?.focus();
    setActiveTab(tabs[newIndex].id);
  }

  return (
    <div>
      {/* Tab list */}
      <div role="tablist" aria-label="Content sections" className="flex border-b">
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            ref={(el) => (tabRefs.current[index] = el)}
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`panel-${tab.id}`}
            id={`tab-${tab.id}`}
            tabIndex={activeTab === tab.id ? 0 : -1} // Roving tabindex
            onClick={() => setActiveTab(tab.id)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className={`px-4 py-2 ${
              activeTab === tab.id
                ? 'border-b-2 border-blue-600 font-semibold'
                : 'text-gray-600'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab panels */}
      {tabs.map((tab) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`panel-${tab.id}`}
          aria-labelledby={`tab-${tab.id}`}
          hidden={activeTab !== tab.id}
          tabIndex={0}
          className="p-4"
        >
          {tab.content}
        </div>
      ))}
    </div>
  );
}
```

**Usage:**
```typescript
<Tabs
  tabs={[
    { id: 'overview', label: 'Overview', content: <div>Overview content</div> },
    { id: 'details', label: 'Details', content: <div>Details content</div> },
    { id: 'settings', label: 'Settings', content: <div>Settings content</div> },
  ]}
/>
```

**Keyboard behavior:**
- **Tab:** Focus tab list, then Tab again to move out
- **Arrow Left/Right:** Navigate between tabs
- **Home/End:** Jump to first/last tab
- **Enter/Space:** Activate tab (handled by onClick)

---

## Keyboard Shortcuts

**⚠️ WARNING:** Keyboard shortcuts conflict with screen readers. Avoid unless building complex web app.

### Safe Patterns

1. **Use modifier keys** (Ctrl, Alt, Shift) to avoid conflicts
2. **Avoid `accesskey`** — conflicts with screen readers, browsers, OS
3. **Provide list of shortcuts** in accessible location
4. **Allow users to disable shortcuts**

### Example: Safe Keyboard Shortcuts

```typescript
// hooks/useKeyboardShortcuts.ts
import { useEffect } from 'react';

interface Shortcut {
  key: string;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  action: () => void;
  description: string;
}

export function useKeyboardShortcuts(shortcuts: Shortcut[], enabled = true) {
  useEffect(() => {
    if (!enabled) return;

    function handleKeyDown(e: KeyboardEvent) {
      shortcuts.forEach((shortcut) => {
        const ctrlMatch = shortcut.ctrl ? e.ctrlKey || e.metaKey : !e.ctrlKey && !e.metaKey;
        const altMatch = shortcut.alt ? e.altKey : !e.altKey;
        const shiftMatch = shortcut.shift ? e.shiftKey : !e.shiftKey;

        if (
          e.key.toLowerCase() === shortcut.key.toLowerCase() &&
          ctrlMatch &&
          altMatch &&
          shiftMatch
        ) {
          e.preventDefault();
          shortcut.action();
        }
      });
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts, enabled]);
}
```

```typescript
// components/Editor.tsx
'use client';

import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useState } from 'react';

export function Editor() {
  const [content, setContent] = useState('');
  const [showShortcuts, setShowShortcuts] = useState(false);

  const shortcuts = [
    {
      key: 's',
      ctrl: true,
      action: () => console.log('Save triggered'),
      description: 'Save document',
    },
    {
      key: 'b',
      ctrl: true,
      action: () => console.log('Bold triggered'),
      description: 'Bold text',
    },
    {
      key: '/',
      ctrl: true,
      action: () => setShowShortcuts(true),
      description: 'Show keyboard shortcuts',
    },
  ];

  useKeyboardShortcuts(shortcuts);

  return (
    <div>
      <div className="mb-4">
        <button
          onClick={() => setShowShortcuts(true)}
          className="text-sm text-gray-600 underline"
        >
          Keyboard Shortcuts (Ctrl+/)
        </button>
      </div>

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="h-64 w-full rounded border border-gray-300 p-4"
        placeholder="Start typing..."
      />

      {/* Shortcuts modal */}
      {showShortcuts && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div
            role="dialog"
            aria-labelledby="shortcuts-title"
            aria-modal="true"
            className="max-w-md rounded-lg bg-white p-6"
          >
            <h2 id="shortcuts-title" className="text-xl font-semibold">
              Keyboard Shortcuts
            </h2>
            <ul className="mt-4 space-y-2">
              {shortcuts.map((shortcut, i) => (
                <li key={i} className="flex justify-between">
                  <span>{shortcut.description}</span>
                  <kbd className="rounded bg-gray-200 px-2 py-1 font-mono text-sm">
                    {shortcut.ctrl && 'Ctrl+'}
                    {shortcut.alt && 'Alt+'}
                    {shortcut.shift && 'Shift+'}
                    {shortcut.key.toUpperCase()}
                  </kbd>
                </li>
              ))}
            </ul>
            <button
              onClick={() => setShowShortcuts(false)}
              className="mt-6 w-full rounded bg-blue-600 px-4 py-2 text-white"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

**Safe shortcuts:**
- **Ctrl+S:** Save
- **Ctrl+B:** Bold
- **Ctrl+I:** Italic
- **Ctrl+Z:** Undo
- **Ctrl+/:** Show shortcuts help

**Avoid (conflicts with screen readers):**
- Single letters without modifiers (s, b, i, etc.)
- Arrow keys alone (screen readers use for navigation)
- Alt+letter (conflicts with Windows menu accelerators)

---

## Accessible Dropdown Menu

```typescript
// components/DropdownMenu.tsx
'use client';

import { useState, useRef, useEffect, KeyboardEvent } from 'react';

export function DropdownMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const menuItems = [
    { id: 'edit', label: 'Edit' },
    { id: 'duplicate', label: 'Duplicate' },
    { id: 'delete', label: 'Delete' },
  ];

  function handleButtonKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    switch (e.key) {
      case 'ArrowDown':
      case 'ArrowUp':
        e.preventDefault();
        setIsOpen(true);
        setFocusedIndex(0);
        break;
      case 'Escape':
        setIsOpen(false);
        break;
    }
  }

  function handleMenuKeyDown(e: KeyboardEvent<HTMLButtonElement>, index: number) {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        const nextIndex = (index + 1) % menuItems.length;
        setFocusedIndex(nextIndex);
        itemRefs.current[nextIndex]?.focus();
        break;
      case 'ArrowUp':
        e.preventDefault();
        const prevIndex = (index - 1 + menuItems.length) % menuItems.length;
        setFocusedIndex(prevIndex);
        itemRefs.current[prevIndex]?.focus();
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        buttonRef.current?.focus();
        break;
      case 'Tab':
        // Allow Tab to close menu and move to next element
        setIsOpen(false);
        break;
    }
  }

  useEffect(() => {
    if (isOpen) {
      itemRefs.current[focusedIndex]?.focus();
    }
  }, [isOpen, focusedIndex]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (buttonRef.current && !buttonRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block">
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleButtonKeyDown}
        aria-haspopup="true"
        aria-expanded={isOpen}
        className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
      >
        Actions
      </button>

      {isOpen && (
        <div
          role="menu"
          className="absolute left-0 mt-2 w-48 rounded-lg bg-white shadow-lg"
        >
          {menuItems.map((item, index) => (
            <button
              key={item.id}
              ref={(el) => (itemRefs.current[index] = el)}
              role="menuitem"
              tabIndex={-1} // Focus managed programmatically
              onClick={() => {
                console.log(`${item.label} clicked`);
                setIsOpen(false);
                buttonRef.current?.focus();
              }}
              onKeyDown={(e) => handleMenuKeyDown(e, index)}
              className="block w-full px-4 py-2 text-left hover:bg-gray-100"
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

**Keyboard behavior:**
- **Arrow Down/Up on button:** Opens menu, focuses first item
- **Arrow Down/Up in menu:** Navigates items
- **Enter/Space:** Activates item, closes menu
- **Escape:** Closes menu, returns focus to button
- **Tab:** Closes menu, moves to next focusable element

---

## Anti-Patterns

### Anti-Pattern 1: Using divs for Buttons

**❌ WRONG:**
```typescript
<div onClick={handleClick}>Click Me</div>
```

**Problem:** Not keyboard-accessible. Requires mouse.

**✅ CORRECT:**
```typescript
<button onClick={handleClick}>Click Me</button>
```

If you must use `<div>` (not recommended):
```typescript
<div
  role="button"
  tabIndex={0}
  onClick={handleClick}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  }}
>
  Click Me
</div>
```

---

### Anti-Pattern 2: Modal Without Focus Trap

**❌ WRONG:**
```typescript
{isOpen && (
  <div className="modal">
    <h2>Modal Title</h2>
    <button onClick={onClose}>Close</button>
  </div>
)}
```

**Problem:** Tab key can focus elements **behind** modal (confusing, inaccessible).

**✅ CORRECT:**
Use `focus-trap-react` (see Modal example above).

---

### Anti-Pattern 3: No Visible Focus Indicator

**❌ WRONG:**
```css
*:focus {
  outline: none; /* Removes focus indicator for all elements */
}
```

**Problem:** Keyboard users can't see where they are.

**✅ CORRECT:**
```css
:focus-visible {
  outline: 3px solid #0066cc;
  outline-offset: 2px;
}

/* Remove outline for mouse clicks, keep for keyboard */
:focus:not(:focus-visible) {
  outline: none;
}
```

---

### Anti-Pattern 4: Positive tabindex

**❌ WRONG:**
```typescript
<button tabIndex={3}>Third</button>
<button tabIndex={1}>First</button>
<button tabIndex={2}>Second</button>
```

**Problem:** Breaks natural tab order. Very confusing for keyboard users.

**✅ CORRECT:**
```typescript
{/* Natural tab order (top to bottom in DOM) */}
<button>First</button>
<button>Second</button>
<button>Third</button>
```

---

### Anti-Pattern 5: Menu Requires Mouse Hover

**❌ WRONG:**
```typescript
<div onMouseEnter={() => setShowMenu(true)}>
  Menu
</div>
```

**Problem:** Keyboard users can't open menu.

**✅ CORRECT:**
```typescript
<button
  onClick={() => setShowMenu(!showMenu)}
  onKeyDown={(e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      setShowMenu(true);
    }
  }}
  aria-haspopup="true"
  aria-expanded={showMenu}
>
  Menu
</button>
```

---

## Testing Checklist

- [ ] **Unplug mouse and navigate with keyboard only**
  - [ ] All interactive elements reachable with Tab
  - [ ] Tab order logical (top-to-bottom, left-to-right)
  - [ ] Enter/Space activates buttons/links
  - [ ] Arrow keys work in custom widgets (tabs, dropdowns, etc.)

- [ ] **Focus indicators visible**
  - [ ] All focused elements have visible outline
  - [ ] Focus indicator meets 3:1 contrast ratio
  - [ ] Focus not obscured by sticky headers/footers

- [ ] **Skip links work**
  - [ ] Skip link is first focusable element
  - [ ] Pressing Enter on skip link moves focus to main content
  - [ ] Skip link visible when focused

- [ ] **Modals trap focus**
  - [ ] Tab cycles through modal elements only
  - [ ] Escape closes modal
  - [ ] Focus returns to trigger element after close

- [ ] **Menus/dropdowns keyboard-accessible**
  - [ ] Arrow keys open and navigate
  - [ ] Enter/Space selects item
  - [ ] Escape closes and returns focus

- [ ] **No keyboard traps**
  - [ ] User can always Tab out of any component
  - [ ] No infinite Tab loops

---

## Accessibility Checklist

- [ ] **WCAG 2.1.1 (Keyboard) - Level A**
  - [ ] All functionality operable via keyboard
  - [ ] No mouse-only interactions

- [ ] **WCAG 2.1.2 (No Keyboard Trap) - Level A**
  - [ ] User can navigate away from any component
  - [ ] Modals have Escape key to close

- [ ] **WCAG 2.4.1 (Bypass Blocks) - Level A**
  - [ ] Skip link provided
  - [ ] Skip link is first focusable element

- [ ] **WCAG 2.4.3 (Focus Order) - Level A**
  - [ ] Tab order is logical
  - [ ] No positive tabindex values

- [ ] **WCAG 2.4.7 (Focus Visible) - Level AA**
  - [ ] Focus indicator always visible
  - [ ] `:focus-visible` used to distinguish keyboard from mouse

- [ ] **WCAG 2.4.11 (Focus Not Obscured - Minimum) - Level AA**
  - [ ] Focused elements not entirely hidden
  - [ ] Sticky headers don't obscure focus

- [ ] **WCAG 2.4.13 (Focus Appearance) - Level AAA**
  - [ ] Focus indicator at least 2px thick
  - [ ] 3:1 contrast ratio

---

## Performance Checklist

- [ ] **Focus management doesn't cause jank**
  - [ ] Smooth scrolling when focusing elements
  - [ ] No layout shift when focus indicators appear

- [ ] **Keyboard shortcuts debounced**
  - [ ] Rapid key presses don't trigger multiple actions

---

## Security Checklist

- [ ] **No security bypass via keyboard**
  - [ ] Keyboard navigation respects same permissions as mouse
  - [ ] Hidden elements with `display: none` not accessible via Tab

- [ ] **Keyboard shortcuts don't expose sensitive data**
  - [ ] No shortcuts that reveal passwords/tokens

---

## Integration Notes

**Works well with:**
- **forms.md** — Accessible forms with keyboard navigation
- All interactive patterns (modals, menus, tabs, etc.)

**Potential conflicts:**
- **Keyboard shortcuts** can conflict with screen readers — use modifier keys

**Dependencies:**
- Foundational pattern — all other patterns depend on keyboard accessibility

---

## References

1. [WCAG 2.2 Specification](https://www.w3.org/TR/WCAG22/)
2. [WAI-ARIA Authoring Practices Guide (APG)](https://www.w3.org/WAI/ARIA/apg/)
3. [WebAIM Keyboard Accessibility](https://webaim.org/techniques/keyboard/)
4. [focus-trap-react Documentation](https://github.com/focus-trap/focus-trap-react)
5. [W3C Skip Navigation Links](https://www.w3.org/TR/UNDERSTANDING-WCAG20/navigation-mechanisms-skip.html)
6. [Roving Tabindex Pattern](https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/)
7. [2024 WebAIM Screen Reader Survey](https://webaim.org/projects/screenreadersurvey10/)
8. [MDN: Keyboard-navigable JavaScript Widgets](https://developer.mozilla.org/en-US/docs/Web/Accessibility/Guides/Keyboard-navigable_JavaScript_widgets)

---

## Version History

- **v1.0** (2024-01-15): Initial keyboard navigation pattern covering WCAG 2.2 requirements, tab order, focus management, skip links, roving tabindex, focus trapping, keyboard shortcuts, accessible components
