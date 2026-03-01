---
name: Audit Checklist
tier: meta
description: Master checklist for the Audit Agent. 70 checks across 8 categories. Every check includes the bash command to run and the judgment criteria. Referenced by audit-agent.md during Phase 3.
---

# Master Audit Checklist

## How to Use

Run every check. Record: command output, judgment (🔴 fail / 🟡 warn / 🟢 pass), and evidence. All findings feed into AUDIT-REPORT.md.

---

## Category 1 — Authentication (11 checks)

```bash
# 1. What auth system is installed?
grep -rn "next-auth\|clerk\|auth0\|firebase/auth\|passport" package.json src/ --include="*.ts"
# 🔴 if anything other than @supabase/supabase-js handles auth

# 2. Is Supabase Auth used correctly?
grep -rn "supabase.auth.getUser\|supabase.auth.signIn" src/ --include="*.ts" | wc -l
# 🔴 if count is 0 and app has auth

# 3. Admin client in user-facing routes?
grep -rn "createAdminClient\|service_role" src/app/api/ --include="*.ts"
# 🔴 if found in routes that serve regular users

# 4. RLS enabled on all tables?
grep -rn "enable row level security" supabase/migrations/ 2>/dev/null
grep -rn "create table" supabase/migrations/ 2>/dev/null | wc -l
# 🔴 if table count > RLS enable count

# 5. Auth middleware protecting routes?
cat middleware.ts 2>/dev/null || echo "NO MIDDLEWARE"
# 🔴 if no middleware and app has protected routes

# 6. Auth check in every API route?
for f in $(find src/app/api -name "*.ts" 2>/dev/null); do
  if ! grep -q "getUser\|requireAuth\|createClient" "$f"; then
    echo "NO AUTH: $f"
  fi
done
# 🔴 for each route missing auth

# 7. Microsoft OAuth tenant config?
grep -rn "tenant:" src/ --include="*.ts" | grep -v "common"
# 🔴 if specific tenant ID found

# 8. Tokens in localStorage?
grep -rn "localStorage.*token\|sessionStorage.*token" src/ --include="*.ts" --include="*.tsx"
# 🔴 if found

# 9. Hardcoded credentials?
grep -rn "password.*=.*['\"][^'\"]\|secret.*=.*['\"][^'\"]" src/ --include="*.ts"
# 🔴 if found

# 10. Rate limiting on auth routes?
grep -rn "rateLimit\|rate_limit\|rateLimiter" src/app/api/auth/ --include="*.ts" 2>/dev/null
# 🟡 if not found

# 11. Generic error messages on login?
grep -rn "user not found\|wrong password\|incorrect password" src/ --include="*.ts" --include="*.tsx"
# 🟡 if specific error messages exposed
```

---

## Category 2 — RLS & Data Security (8 checks)

```bash
# 12. RLS policies exist for authenticated role?
grep -rn "for authenticated\|using (auth.uid\|using (auth.role" supabase/migrations/ 2>/dev/null
# 🔴 if tables exist but no policies

# 13. Data isolation between users/orgs?
grep -rn "\.from(" src/ --include="*.ts" -A 2 | grep -v "user_id\|org_id\|eq(\|filter"
# 🔴 if queries return all rows without user filter

# 14. RLS tested as regular user (not admin)?
grep -rn "createClient\b" src/ --include="*.ts" | wc -l
grep -rn "createAdminClient" src/ --include="*.ts" | wc -l
# 🟡 if admin client count >> regular client count

# 15. Sensitive data exposed in API responses?
grep -rn "password\|secret\|token\|private_key" src/app/api/ --include="*.ts" -A 5
# 🔴 if sensitive fields returned in responses

# 16. Input validation on all API routes?
grep -rn "zod\|yup\|joi\|z\.object\|z\.string" src/app/api/ --include="*.ts" | wc -l
# 🔴 if routes exist without validation

# 17. CORS configured correctly?
grep -rn "Access-Control-Allow-Origin\|cors(" src/ --include="*.ts"
# 🟡 if missing or set to wildcard

# 18. SQL injection risk?
grep -rn "\.rpc(\|\.query(" src/ --include="*.ts" -A 2
# 🟡 check for string concatenation in queries

# 19. Exposed service role key?
grep -rn "SUPABASE_SERVICE_ROLE\|service_role" src/ --include="*.ts" --include="*.tsx"
# 🔴 if found in client-side code (*.tsx)
```

---

## Category 3 — Hydration & SSR (9 checks)

```bash
# 20. Zustand persist middleware?
grep -rn "persist(" src/ --include="*.ts" --include="*.tsx"
# 🔴 if found in Next.js app

# 21. localStorage in render (not in useEffect)?
grep -rn "localStorage\|sessionStorage" src/ --include="*.tsx"
# 🔴 if outside useEffect

# 22. window/document in render?
grep -rn "window\.\|document\." src/ --include="*.tsx" | grep -v "useEffect\|typeof window"
# 🔴 if found outside useEffect

# 23. Math.random or Date in render?
grep -rn "Math\.random\|new Date()\|Date\.now()" src/ --include="*.tsx"
# 🔴 if in render function

# 24. Missing 'use client' on interactive components?
grep -rn "useState\|useEffect\|useRef\|onClick" src/ --include="*.tsx" | grep -v "'use client'" | wc -l
# 🔴 if count > 0

# 25. suppressHydrationWarning used?
grep -rn "suppressHydrationWarning" src/ --include="*.tsx"
# 🟡 band-aid — real fix needed

# 26. Third-party components needing ssr:false?
grep -rn "from 'react-select\|framer-motion\|recharts\|react-hot-toast\|react-beautiful-dnd'" src/ --include="*.tsx"
# 🟡 check each for SSR compatibility

# 27. Production build passes?
pnpm build 2>&1 | tail -5
# 🔴 if build fails

# 28. TypeScript strict mode?
cat tsconfig.json | grep -E "strict|noImplicitAny"
# 🟡 if strict: false
```

---

## Category 4 — Dependencies (8 checks)

```bash
# 29. Known conflict combinations? (see audit-deps.md)
cat package.json | grep -E "next-auth|clerk|firebase|zustand|redux-persist|styled-components|react-beautiful-dnd|moment|express"
# Cross-reference each against audit-deps.md

# 30. Unpinned versions?
grep -cE '"\^|"~' package.json
# 🟡 if count > 0 (🔴 if > 10)

# 31. Abandoned packages?
# Check for packages with no updates in 2+ years
cat package.json | grep -E "react-beautiful-dnd|moment|request|node-fetch"
# 🟡 flag each for manual check

# 32. Node version pinned?
cat .nvmrc 2>/dev/null || cat .node-version 2>/dev/null || echo "MISSING"
# 🟡 if missing

# 33. Security vulnerabilities?
pnpm audit 2>/dev/null | tail -10
# 🔴 if critical vulnerabilities found

# 34. Duplicate functionality packages?
# Multiple HTTP clients, multiple state managers, multiple date libraries
cat package.json | grep -E "axios|node-fetch|got|superagent" | wc -l
cat package.json | grep -E "zustand|redux|jotai|recoil|mobx" | wc -l
cat package.json | grep -E "moment|date-fns|dayjs|luxon" | wc -l
# 🟡 if count > 1 for any category

# 35. Dev dependencies in production?
cat package.json | grep -E "devDependencies" -A 30 | grep -E "lodash|axios|express"
# 🟡 if utility packages in devDependencies that are used in production

# 36. Package manager consistency?
ls package-lock.json yarn.lock pnpm-lock.yaml 2>/dev/null
# 🟡 if multiple lock files exist
```

---

## Category 5 — TypeScript Quality (7 checks)

```bash
# 37. TypeScript compilation errors?
pnpm tsc --noEmit 2>&1 | grep "error TS" | wc -l
# 🔴 if count > 0

# 38. 'any' type usage?
grep -rn "\bany\b" src/ --include="*.ts" --include="*.tsx" | wc -l
# 🔴 if > 20, 🟡 if 1-20

# 39. Non-null assertions?
grep -rn "!\." src/ --include="*.ts" --include="*.tsx" | wc -l
# 🟡 if > 10

# 40. Strict mode enabled?
cat tsconfig.json | grep '"strict"'
# 🟡 if false or missing

# 41. Return types on functions?
grep -rn "export.*function\|export const.*=.*=>" src/ --include="*.ts" | grep -v ":" | wc -l
# 🟡 if many functions without return types

# 42. Type imports used correctly?
grep -rn "import type" src/ --include="*.ts" --include="*.tsx" | wc -l
# 🟢 informational

# 43. Enums vs const objects?
grep -rn "^enum " src/ --include="*.ts" | wc -l
# 🟡 prefer const objects over enums
```

---

## Category 6 — Testing (6 checks)

```bash
# 44. Test infrastructure exists?
ls vitest.config.ts playwright.config.ts jest.config.ts 2>/dev/null
# 🔴 if none found

# 45. How many test files?
find src -name "*.test.ts" -o -name "*.test.tsx" -o -name "*.spec.ts" 2>/dev/null | wc -l
# 🔴 if 0

# 46. Tests actually pass?
pnpm test --run 2>&1 | tail -5
# 🔴 if failures

# 47. CI runs tests?
cat .github/workflows/*.yml 2>/dev/null | grep -E "test\|vitest\|playwright"
# 🟡 if no CI test step

# 48. Critical paths tested?
grep -rn "auth\|login\|signup\|payment\|checkout" src/ --include="*.test.ts" --include="*.spec.ts" | wc -l
# 🟡 if 0

# 49. E2E tests exist?
find . -name "*.spec.ts" -path "*/e2e/*" 2>/dev/null | wc -l
# 🟡 if 0
```

---

## Category 7 — Performance (8 checks)

```bash
# 50. Bundle size?
pnpm build 2>&1 | grep "First Load JS"
# 🔴 if > 300KB, 🟡 if 150-300KB

# 51. N+1 queries?
grep -rn "\.map.*await\|for.*await.*supabase\|forEach.*await" src/ --include="*.ts"
# 🔴 if found

# 52. Images using next/image?
grep -rn "<img " src/ --include="*.tsx" | wc -l
# 🟡 if count > 0 (should use next/image)

# 53. No pagination on lists?
grep -rn "\.select\(\)" src/ --include="*.ts" | grep -v "limit\|range\|page" | wc -l
# 🟡 if queries return all rows without pagination

# 54. Loading states exist?
grep -rn "isLoading\|isPending\|Skeleton\|loading" src/components/ --include="*.tsx" | wc -l
# 🟡 if very low count relative to component count

# 55. Error states exist?
grep -rn "isError\|error\b\|ErrorBoundary" src/components/ --include="*.tsx" | wc -l
# 🟡 if very low count

# 56. Caching strategy?
grep -rn "cache\|revalidate\|stale-while-revalidate" src/ --include="*.ts" | wc -l
# 🟡 if 0

# 57. Console logs in production?
grep -rn "console\.log\|console\.error\|console\.warn" src/ --include="*.ts" --include="*.tsx" | wc -l
# 🟡 if > 5
```

---

## Category 8 — Product Completeness (13 checks)

```bash
# 58. Error pages exist?
ls src/app/not-found.tsx src/app/error.tsx src/app/global-error.tsx 2>/dev/null
# 🟡 if any missing

# 59. Empty states handled?
grep -rn "\.length === 0\|\.length == 0\|items\.length\b" src/ --include="*.tsx" -A 3 | grep -i "empty\|no.*found\|nothing" | wc -l
# 🟡 if very low

# 60. Mobile responsive?
grep -rn "sm:\|md:\|lg:\|responsive\|mobile" src/ --include="*.tsx" | wc -l
# 🟡 if very low

# 61. Accessibility basics?
grep -rn "aria-\|role=\|alt=" src/ --include="*.tsx" | wc -l
# 🟡 if very low

# 62. SEO meta tags?
grep -rn "metadata\|<title\|<meta" src/ --include="*.tsx" | wc -l
# 🟡 if 0

# 63. Environment variables documented?
ls .env.example 2>/dev/null || echo "MISSING"
# 🔴 if missing

# 64. README exists?
ls README.md 2>/dev/null || echo "MISSING"
# 🟡 if missing

# 65. Dead routes (pages with no navigation to them)?
find src/app -name "page.tsx" 2>/dev/null | wc -l
grep -rn "href=\|Link\b\|router\.push\|router\.replace" src/ --include="*.tsx" | wc -l
# 🟡 flag for manual review if routes >> links

# 66. Dead API routes (routes with no callers)?
find src/app/api -name "route.ts" 2>/dev/null | wc -l
grep -rn "fetch.*api/\|useSWR.*api/\|useQuery.*api/" src/ --include="*.tsx" --include="*.ts" | wc -l
# 🟡 flag for manual review

# 67. Onboarding flow exists?
grep -rn "onboard\|welcome\|getting.*started\|first.*time" src/ --include="*.tsx" --include="*.ts" | wc -l
# 🟡 if 0 and app has user accounts

# 68. Email notifications configured?
grep -rn "resend\|sendgrid\|nodemailer\|ses" src/ package.json --include="*.ts" | wc -l
# 🟡 if 0 and app has user accounts

# 69. Monitoring/error tracking?
grep -rn "sentry\|@sentry\|datadog\|logrocket" src/ package.json --include="*.ts" | wc -l
# 🟡 if 0

# 70. Data export capability?
grep -rn "export\|download\|csv\|pdf" src/ --include="*.tsx" --include="*.ts" | grep -v "^.*export.*function\|^.*export.*const\|^.*export.*type\|^.*export.*interface\|^.*export.*default" | wc -l
# 🟡 informational
```

---

## Scoring Guide

**🔴 CRITICAL** — app cannot work correctly in production
**🟡 WARNING** — app has issues that hurt quality, reliability, or maintainability
**🟢 PASS** — check passed, no action needed

**Overall score:**
- Any 🔴 → Overall 🔴 Critical
- No 🔴, any 🟡 → Overall 🟡 Needs Work
- All 🟢 → Overall 🟢 Solid
