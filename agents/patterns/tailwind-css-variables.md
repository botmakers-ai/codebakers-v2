# Pattern: Tailwind CSS Custom Properties
# CodeBakers V4 | agents/patterns/tailwind-css-variables.md

---

## The Problem

**Build fails with "class does not exist" error for Tailwind classes that should work:**

```
Syntax error: The `border-border` class does not exist.
If `border-border` is a custom class, make sure it is defined within a `@layer` directive.
```

**Other common variations:**
```
The `ring-ring` class does not exist
The `background-background` class does not exist
The `foreground-foreground` class does not exist
The `text-muted-foreground` class does not exist
```

**What causes this:**

1. You're using shadcn/ui or similar component library
2. Components use Tailwind classes like `border-border`, `ring-ring`, etc.
3. These classes reference CSS custom properties: `--border`, `--ring`, etc.
4. **But your tailwind.config.ts doesn't know about these CSS variables**
5. Build fails because Tailwind can't generate the class

**This is a configuration mismatch, not a Tailwind bug.**

---

## The Solution

### Step 1: Define CSS Variables in globals.css

Add this to `app/globals.css` inside `@layer base`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* Light mode */
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 222.2 47.4% 11.2%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 222.2 84% 4.9%;
    --radius: 0.5rem;
  }

  .dark {
    /* Dark mode */
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;
    --popover: 222.2 84% 4.9%;
    --popover-foreground: 210 40% 98%;
    --primary: 210 40% 98%;
    --primary-foreground: 222.2 47.4% 11.2%;
    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;
    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 212.7 26.8% 83.9%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}
```

**CRITICAL:** These CSS variables use HSL format WITHOUT `hsl()` wrapper:
- ✅ Correct: `--background: 0 0% 100%;`
- ❌ Wrong: `--background: hsl(0, 0%, 100%);`

### Step 2: Configure Tailwind to Use CSS Variables

Update `tailwind.config.ts`:

```typescript
import type { Config } from "tailwindcss"

const config = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config

export default config
```

**Key parts:**

```typescript
colors: {
  border: "hsl(var(--border))",  // ← Maps to CSS variable
  ring: "hsl(var(--ring))",      // ← Now border-border works
  background: "hsl(var(--background))",
  foreground: "hsl(var(--foreground))",
  // ...
}
```

### Step 3: Verify Build Works

```bash
pnpm build
# OR
npm run build
```

Should compile without errors now.

---

## When to Use This Pattern

**Always apply when:**
- Using shadcn/ui components
- Using any component library with custom design tokens
- You see "class does not exist" errors for border-*, ring-*, background-*, etc.
- Setting up a new Next.js project with custom theming

**Triggers:**
- `npx shadcn-ui@latest init` was run
- Components use classes like `border-border`, `ring-ring`
- Build fails with "class does not exist"
- Interview mentions "shadcn/ui" or "custom design system"

---

## Common Mistakes

### ❌ Mistake 1: CSS Variables Use hsl() Wrapper

```css
/* WRONG */
:root {
  --background: hsl(0, 0%, 100%);  /* ❌ Don't use hsl() */
}
```

```css
/* CORRECT */
:root {
  --background: 0 0% 100%;  /* ✅ Raw HSL values */
}
```

**Why:** Tailwind config wraps them with `hsl(var(--background))`, so variables should be raw values.

### ❌ Mistake 2: CSS Variables Outside @layer base

```css
/* WRONG */
@tailwind base;

:root {
  --background: 0 0% 100%;  /* ❌ Not in @layer base */
}

@tailwind components;
```

```css
/* CORRECT */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;  /* ✅ Inside @layer base */
  }
}
```

### ❌ Mistake 3: Missing tailwindcss-animate Plugin

```typescript
// WRONG
export default {
  plugins: [],  // ❌ Missing tailwindcss-animate
}
```

```typescript
// CORRECT
export default {
  plugins: [require("tailwindcss-animate")],  // ✅ Required for shadcn/ui
}
```

Install if missing:
```bash
pnpm add -D tailwindcss-animate
```

---

## Error Sniffer Detection

**Pattern signature:**
```
error.includes("class does not exist") &&
error.includes("border-") || error.includes("ring-") || error.includes("background-")
```

**Root cause:**
```
Missing Tailwind CSS variable configuration for custom design tokens
```

**Prevention (Error Sniffer warns BEFORE adding shadcn/ui):**

```
🍞 CodeBakers: ⚠️ Error Sniffer — shadcn/ui setup detected

HIGH CONFIDENCE warning:
This pattern has caused build failures 100% of the time.

What happens without proper setup:
→ Build fails with "border-border class does not exist"
→ All shadcn/ui components broken
→ 30+ minutes of debugging Tailwind config

How to prevent:
✓ Add CSS variables to globals.css (pattern: tailwind-css-variables.md)
✓ Configure tailwind.config.ts to use CSS variables
✓ Install tailwindcss-animate plugin

Apply prevention automatically?
[Yes — set up now / Show me the pattern / I'll do it manually]
```

**When to trigger:**
- User runs: `npx shadcn-ui@latest init`
- User runs: `npx shadcn-ui@latest add [component]`
- Interview mentions: "shadcn/ui" or "custom design system"
- Build fails with "class does not exist" for border-*, ring-*, etc.

---

## CodeBakers Integration

### During Interview

```markdown
User mentions: "I want to use shadcn/ui"

Conductor:
→ Load agents/patterns/tailwind-css-variables.md
→ Add to CREDENTIALS-NEEDED.md:
  "Configure Tailwind CSS variables (required for shadcn/ui)"
→ Add to FIX-QUEUE.md (P0):
  "[ ] Set up Tailwind CSS variables (globals.css + tailwind.config.ts)"
→ Apply before ANY shadcn/ui component is added
```

### During Build (Error Sniffer)

```markdown
User: "Add shadcn/ui button component"

Error Sniffer:
→ Scan ERROR-LOG.md for "border-border" or similar
→ If found: HIGH confidence warning
→ If not found but shadcn detected: MEDIUM confidence warning
→ Offer to apply prevention automatically
→ Apply both globals.css and tailwind.config.ts changes together
```

### After Error Occurs

```markdown
Build error: "border-border class does not exist"

Error Investigator:
→ Classify: Build error (Tailwind CSS configuration)
→ Root cause: Missing CSS variable setup
→ Apply comprehensive fix (globals.css + tailwind.config.ts + plugin)
→ Log to ERROR-LOG.md with pattern signature
→ Next time: Error Sniffer prevents this BEFORE it happens
```

---

## Complete Setup Checklist

When setting up Tailwind CSS with custom variables:

```markdown
- [ ] CSS variables defined in globals.css inside @layer base
- [ ] CSS variables use raw HSL values (not hsl() wrapper)
- [ ] tailwind.config.ts maps colors to CSS variables with hsl(var(--name))
- [ ] tailwindcss-animate plugin installed and added to config
- [ ] Build passes: pnpm build (no "class does not exist" errors)
- [ ] Dark mode works (if using .dark class)
```

---

## Example: Complete Working Setup

**File: `app/globals.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --border: 214.3 31.8% 91.4%;
    --ring: 222.2 84% 4.9%;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --border: 217.2 32.6% 17.5%;
    --ring: 212.7 26.8% 83.9%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}
```

**File: `tailwind.config.ts`**

```typescript
import type { Config } from "tailwindcss"

const config = {
  darkMode: ["class"],
  content: ["./app/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config

export default config
```

**Result:**
- ✅ `border-border` works
- ✅ `ring-ring` works
- ✅ `bg-background` works
- ✅ `text-foreground` works
- ✅ Dark mode works with `.dark` class

---

## Troubleshooting

**Still getting "class does not exist" after setup?**

1. **Restart dev server** (Tailwind config changes require restart)
   ```bash
   # Stop server (Ctrl+C)
   pnpm dev
   ```

2. **Clear Next.js cache**
   ```bash
   rm -rf .next
   pnpm dev
   ```

3. **Verify CSS variable format**
   - Check globals.css uses raw HSL: `0 0% 100%` (not `hsl(0, 0%, 100%)`)
   - Check tailwind.config uses wrapper: `hsl(var(--background))`

4. **Check content paths in tailwind.config.ts**
   ```typescript
   content: [
     './app/**/*.{ts,tsx}',  // Make sure this matches your structure
   ]
   ```

5. **Verify plugin is installed**
   ```bash
   pnpm list tailwindcss-animate
   # If missing: pnpm add -D tailwindcss-animate
   ```

---

*CodeBakers V4 | Pattern: Tailwind CSS Custom Properties | agents/patterns/tailwind-css-variables.md*
