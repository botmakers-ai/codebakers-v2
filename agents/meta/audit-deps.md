---
name: Audit Dependencies
tier: meta
description: Dependency conflict library for the Audit Agent. Contains known incompatible package combinations, cascade failure patterns, and detection commands. Referenced by audit-agent.md during dependency analysis phase.
---

# Audit Dependency Conflict Library

## How to Use

During a codebase audit, cross-reference every package in `package.json` against this library. Any match is a finding — include it in the AUDIT-REPORT.md dependency conflicts table with severity and cascade effect.

---

## 🔴 CRITICAL Conflicts
(These combinations directly cause production failures)

### NextAuth + Supabase Data Layer
```bash
grep -rn "next-auth\|getServerSession" package.json src/ --include="*.ts"
grep -rn "@supabase/supabase-js" package.json
```
**Conflict:** NextAuth generates its own JWT. Supabase RLS expects a Supabase JWT. Two different auth systems fight each other.
**Cascade:**
1. NextAuth handles login → issues NextAuth JWT
2. Supabase createClient() sees wrong JWT → RLS blocks all queries
3. Queries return empty/null silently
4. React re-renders trying to get data → infinite loop
5. Hydration mismatch on top of infinite loop
6. App completely unusable in production (works in dev because RLS may be loose)
**Fix:** Remove next-auth entirely. Use Supabase Auth end to end.

---

### Clerk + Supabase Data Layer
```bash
grep -rn "@clerk/nextjs\|@clerk/clerk-react" package.json
grep -rn "@supabase/supabase-js" package.json
```
**Conflict:** Same as NextAuth — Clerk JWT ≠ Supabase JWT. RLS destroyed.
**Cascade:** Identical to NextAuth pattern above.
**Fix:** Remove Clerk. Use Supabase Auth.

---

### Firebase Auth + Supabase Data Layer
```bash
grep -rn "firebase/auth\|firebase-admin" package.json
grep -rn "@supabase/supabase-js" package.json
```
**Conflict:** Firebase JWT ≠ Supabase JWT. RLS destroyed.
**Cascade:** Identical pattern. Silent query failures → infinite loops.
**Fix:** Remove Firebase Auth. Use Supabase Auth.

---

### Zustand Persist + Next.js SSR
```bash
grep -rn "zustand" package.json
grep -rn "persist(" src/ --include="*.ts" --include="*.tsx"
```
**Conflict:** `persist()` middleware saves state to localStorage. SSR server has no localStorage. Server renders without persisted state, client rehydrates with different state.
**Cascade:**
1. Server renders component with empty/default state
2. Client rehydrates with localStorage state (different)
3. React detects mismatch → hydration error
4. Can cause infinite re-render loops
5. Random UI flickering on every page load
**Fix:** Remove persist middleware. Use Supabase for persistence instead.

---

### Redux Persist + Next.js SSR
```bash
grep -rn "redux-persist" package.json
```
**Conflict:** Same as Zustand persist — localStorage writes cause hydration mismatch.
**Cascade:** Identical pattern.
**Fix:** Remove redux-persist. Server-side state management only.

---

### Styled-Components + Next.js (without SSR config)
```bash
grep -rn "styled-components" package.json
grep -rn "ServerStyleSheet\|createGlobalStyle" src/ --include="*.tsx" --include="*.ts"
```
**Conflict:** Styled-components generates class names dynamically. Server and client generate different class names.
**Cascade:** Hydration warnings, visual flicker, CSS not applying on first load.
**Fix:** Add `babel-plugin-styled-components` with SSR config, or switch to Tailwind.

---

### React-Beautiful-DnD + React 18
```bash
grep -rn "react-beautiful-dnd" package.json
grep -rn '"react":' package.json | grep -E '"1[89]\.|"2[0-9]\.'
```
**Conflict:** react-beautiful-dnd is not compatible with React 18 StrictMode. Abandoned package.
**Cascade:** DnD completely broken in React 18 StrictMode. Random drag failures.
**Fix:** Replace with `@dnd-kit/core` (actively maintained, React 18 compatible).

---

### Next.js + Express Custom Server
```bash
grep -rn "express" package.json
grep -rn "server\.js\|server\.ts\|createServer" src/ --include="*.ts" --include="*.js"
cat next.config.js 2>/dev/null | grep "server"
```
**Conflict:** Custom Express server bypasses Next.js optimizations. Breaks Vercel deployment entirely.
**Cascade:** App runs locally, completely fails on Vercel. No edge functions, no ISR, no automatic optimization.
**Fix:** Remove Express custom server. Use Next.js API routes and middleware.

---

### Prisma + Supabase (without connection pooling)
```bash
grep -rn "prisma\|@prisma/client" package.json
grep -rn "@supabase/supabase-js" package.json
```
**Conflict:** Not a hard conflict but Prisma direct connections + Supabase serverless = connection pool exhaustion.
**Cascade:** Works fine locally (few connections), fails in production under load (too many connections).
**Fix:** Use Supabase connection pooler (port 6543) not direct connection (port 5432) in DATABASE_URL.

---

## 🟡 WARNING Conflicts
(These cause bugs and performance issues but may not kill the app outright)

### Multiple CSS-in-JS Libraries
```bash
grep -rn "styled-components\|@emotion\|@stitches\|vanilla-extract" package.json | wc -l
```
**Conflict:** Multiple CSS-in-JS systems fighting for style priority.
**Effect:** Unpredictable styling, specificity wars, increased bundle size.
**Fix:** Pick one. Tailwind preferred in CodeBakers.

---

### Moment.js (any version)
```bash
grep -rn '"moment"' package.json
```
**Conflict:** Not a conflict but a problem — Moment.js is 67KB, deprecated, and causes large bundle sizes.
**Effect:** Slow initial load, poor Lighthouse scores.
**Fix:** Replace with `date-fns` or `dayjs` (both under 5KB).

---

### Multiple State Management Libraries
```bash
grep -rn "zustand\|jotai\|recoil\|redux\|mobx" package.json | wc -l
```
**Conflict:** Multiple state managers = competing sources of truth.
**Effect:** Unpredictable state, difficult debugging, unnecessary complexity.
**Fix:** Pick one. Zustand preferred in CodeBakers.

---

### React Query + SWR Together
```bash
grep -rn "@tanstack/react-query\|react-query" package.json
grep -rn "swr" package.json
```
**Conflict:** Two data fetching libraries doing the same job.
**Effect:** Double caching, inconsistent invalidation, unnecessary bundle size.
**Fix:** Pick one. React Query preferred.

---

### Axios + Native Fetch (mixed)
```bash
grep -rn '"axios"' package.json
grep -rn "fetch(" src/ --include="*.ts" --include="*.tsx" | wc -l
grep -rn "axios\." src/ --include="*.ts" --include="*.tsx" | wc -l
```
**Conflict:** Not a hard conflict but inconsistent HTTP strategy.
**Effect:** Different error handling patterns, harder to maintain.
**Fix:** Use native fetch (Next.js extends it). Remove axios.

---

### Old UI Libraries Not Updated for React 18
```bash
grep -rn "react-modal\|react-datepicker\|react-select" package.json
```
**Conflict:** Many popular UI libraries have React 18 compatibility issues.
**Effect:** Console warnings, potential hydration issues, broken SSR.
**Fix:** Check each library's GitHub for React 18 support. Replace abandoned ones.

---

### Node Version Mismatch
```bash
cat .nvmrc 2>/dev/null || cat .node-version 2>/dev/null || echo "No Node version pinned"
cat package.json | grep '"node"'
node --version
```
**Conflict:** No pinned Node version = different behavior on dev vs Vercel.
**Effect:** Works locally on Node 18, Vercel defaults to Node 16 or 20 — subtle breakage.
**Fix:** Add `.nvmrc` with exact Node version. Set Node version in Vercel settings.

---

### Unpinned Dependencies
```bash
grep -E '"\^|"~' package.json | wc -l
```
**Conflict:** `^` and `~` allow automatic minor/patch updates.
**Effect:** Works today, breaks in 3 months when a dependency silently updates.
**Fix:** `pnpm add --save-exact` always. Remove all `^` and `~`.

---

## Microsoft OAuth Specific

### Specific Tenant ID (not 'common')
```bash
grep -rn "tenant:" src/ --include="*.ts" | grep -v "common"
grep -rn "login.microsoftonline.com" src/ --include="*.ts" | grep -v "common"
```
**Conflict:** Specific Azure AD tenant ID only accepts users from that one tenant.
**Effect:** Works perfectly for your own Microsoft account in dev. AADSTS50020 error for any other Microsoft account in production.
**Fix:** Use `/common` endpoint. Set `tenant: 'common'` in OAuth config.

---

## How to Report Dependency Conflicts

For each conflict found, add to AUDIT-REPORT.md:

```markdown
| [package A] | [package B] | 🔴/🟡 | [cascade effect in one sentence] |
```

If the conflict is in the CRITICAL section → it goes in Critical Failures with full cascade analysis.
If it's in WARNING → it goes in Pattern Violations.
