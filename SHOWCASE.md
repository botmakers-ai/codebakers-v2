# CodeBakers Showcase

Apps built with CodeBakers v4.x production framework.

---

## 🏆 Production Apps

### 1. EaseMail (Email Client)

**Domain:** Email
**Built:** 2026-01-15 to 2026-03-01 (47 days)
**Features:** 23
**Tech Stack:** Next.js 14, Supabase, Microsoft Graph API

**Stats:**
- Atomic Units: 23/23 (100% gate passed)
- Error Sniffer Accuracy: 95%
- Build vs. Fix Ratio: 85% build / 15% fix
- Crash Recoveries: 3
- Production Bugs: 4 (11% escape rate)

**Key Patterns Used:**
- MSAL + Graph API integration
- OAuth token management (multi-account)
- Infinite scroll with threading
- SSR-safe imports

**Learnings Applied to v4.4.0:**
- Prisma + Supabase DIRECT_URL detection
- OAuth scope conflict prevention
- Silent error component detection

**Status:** ✅ Production (private)

---

### 2. [Your App Here]

**Domain:** [CRM / Dashboard / etc.]
**Built:** YYYY-MM-DD to YYYY-MM-DD ([N] days)
**Features:** [N]
**Tech Stack:** [Stack]

**Stats:**
- Atomic Units: [N]/[N] ([%] gate passed)
- Error Sniffer Accuracy: [%]
- Build vs. Fix Ratio: [%] build / [%] fix
- Crash Recoveries: [N]
- Production Bugs: [N]

**Key Patterns Used:**
- [Pattern 1]
- [Pattern 2]

**Status:** [Development / Production]

---

## 📊 Aggregate Statistics (1 app)

- **Total Features Built:** 23
- **Total Build Days:** 47
- **Average Build Time:** 2.0 days/feature
- **Error Sniffer Average Accuracy:** 95%
- **Crash Recovery Success Rate:** 100%
- **Build vs. Fix Ratio:** 85% build / 15% fix

---

## 🎯 10-App Challenge Tracker

**Goal:** Build 10 production apps with CodeBakers v4.x to validate the framework

| # | App Type | Domain | Features | Duration | Status |
|---|----------|--------|----------|----------|--------|
| 1 | Email Client | Email | 23 | 47 days | ✅ Complete |
| 2 | CRM | CRM | TBD | TBD | ⏳ Not Started |
| 3 | Analytics Dashboard | Dashboard | TBD | TBD | ⏳ Not Started |
| 4 | E-commerce Store | E-commerce | TBD | TBD | ⏳ Not Started |
| 5 | Social Media Feed | Social | TBD | TBD | ⏳ Not Started |
| 6 | Project Management | Project Mgmt | TBD | TBD | ⏳ Not Started |
| 7 | Healthcare Portal | Healthcare | TBD | TBD | ⏳ Not Started |
| 8 | Education LMS | Education | TBD | TBD | ⏳ Not Started |
| 9 | Real Estate Platform | Real Estate | TBD | TBD | ⏳ Not Started |
| 10 | SaaS Billing System | SaaS | TBD | TBD | ⏳ Not Started |

**Progress:** 1/10 complete (10%)

---

## 📈 Learnings by Build

### Build #1: EaseMail
**Key Lessons:**
1. Prisma + Supabase requires DIRECT_URL (not pooler)
2. OAuth scope mixing causes token cache poisoning
3. SSR-safe imports needed for client-only libraries
4. BUILD-LOG.md updates were forgotten (needed enforcement)

**Applied to Framework:**
- v4.4.0: Added session start Prisma detection
- v4.4.0: Created OAuth token management pattern
- v4.4.0: Created SSR-safe imports pattern
- v4.4.0: Added BUILD-LOG.md commit gate enforcement

---

### Build #2: [Next App]
**Key Lessons:**
- [Lesson 1]
- [Lesson 2]

**Applied to Framework:**
- [Version]: [Improvement]

---

## 🤝 Contributing

Built an app with CodeBakers? Add it to this showcase:

1. Fork this repo
2. Add your app to this file (use template above)
3. Include metrics from `.codebakers/BUILD-METRICS.md`
4. Submit PR

**What to include:**
- App name (can be anonymous if private)
- Domain type
- Build duration and feature count
- Key stats (atomic units, sniffer accuracy, etc.)
- Patterns used
- Learnings that could improve the framework

**Recognition:**
- Listed in SHOWCASE.md
- Credited in framework improvements
- Invited to CodeBakers Expert community (5+ apps)

---

## 🎓 Case Studies

### Case Study: OAuth Multi-Account Pattern

**Problem:** EaseMail needed to support multiple connected Microsoft accounts with separate mail and Teams access.

**Approach:**
- User-scoped token cache: `tokens:{userId}:{accountId}:{resource}`
- Separate tokens for mail vs. Teams (prevents scope conflicts)
- Incremental consent flow (add scopes without re-auth)

**Outcome:**
- Zero token cache poisoning bugs in production
- Account switching works correctly
- Users can add Teams access without reconnecting mail

**Framework Impact:**
- Created `agents/patterns/oauth-token-management.md`
- Added Error Sniffer detection for scope conflicts
- Added to `agents/domains/email.md` as standard pattern

---

## 📝 Template for New Entries

```markdown
### [N]. [App Name]

**Domain:** [Type]
**Built:** YYYY-MM-DD to YYYY-MM-DD ([N] days)
**Features:** [N]
**Tech Stack:** [Stack]

**Stats:**
- Atomic Units: [N]/[N] ([%] gate passed)
- Error Sniffer Accuracy: [%]
- Build vs. Fix Ratio: [%] build / [%] fix
- Crash Recoveries: [N]
- Production Bugs: [N]

**Key Patterns Used:**
- [Pattern 1]
- [Pattern 2]

**Learnings:**
- [Learning 1]
- [Learning 2]

**Status:** [Development / Production / Archived]
```

---

*Updated: 2026-03-05*
*Framework Version: v4.4.0*
