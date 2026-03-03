---
description: Verify CodeBakers protocol compliance (detect if protocol is being followed correctly)
---

Run protocol compliance verification to check if CodeBakers is being followed correctly.

**Purpose:** Detect protocol violations, missing memory files, stale dependencies, and enforcement gaps.

**Action:**

1. Run verification script:
   - Windows: `powershell -ExecutionPolicy Bypass -File scripts/verify-protocol-compliance.ps1`
   - Unix/Mac: `bash scripts/verify-protocol-compliance.sh`

2. Check for violations:
   - Missing .codebakers/ directory
   - Missing BRAIN.md, DEPENDENCY-MAP.md, BUILD-LOG.md
   - Stale dependency map (>3 days old)
   - Stale BRAIN.md (>7 days old)
   - TypeScript compilation errors
   - Missing atomic commits
   - .codebakers/ not committed to git

3. Display results:
   - ✓ EXCELLENT: All checks passed
   - ⚠️ GOOD: Some warnings, no critical violations
   - ✗ VIOLATIONS: Critical issues detected

4. If violations found:
   Offer solutions:
   - Run @rebuild (retrofit protocol)
   - Start fresh (build with protocol from day 1)
   - Initialize now (risky - existing code not audited)

**Use cases:**
- Verify protocol is active before starting work
- Check if old project was built with CodeBakers
- Diagnose why builds feel "off" (might be protocol violations)
- Audit existing project for CodeBakers compliance

**Example output:**

```
🍞 CodeBakers: Protocol Compliance Check
========================================

✓ Checking git repository... PASS
✓ Checking .codebakers/ memory system... PASS
✓ Checking BRAIN.md... PASS
✓ Checking DEPENDENCY-MAP.md... WARNING
  └─ DEPENDENCY-MAP.md not updated in 3+ days (may be stale)
  └─ Run: pnpm dep:map
✓ Checking BUILD-LOG.md... PASS
✓ Checking ERROR-LOG.md... PASS
✓ Checking FIX-QUEUE.md... PASS
✓ Checking TypeScript compilation... PASS
✓ Checking recent commits follow atomic pattern... PASS
✓ Checking .codebakers/ in git history... PASS

========================================
⚠ Protocol Compliance: GOOD (with warnings)
Warnings: 1
No critical violations, but some improvements recommended.
```

**Tip:** Run `@verify` at the start of every session to ensure protocol is active.
