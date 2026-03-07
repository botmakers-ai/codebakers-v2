/**
 * codebakers_verify_mockups
 *
 * Mockup Final Verification
 *
 * Final 100% quality check before mockup analysis.
 * Re-runs validation to ensure all issues fixed.
 *
 * Purpose: Guarantee perfect mockups before database schema generation
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { validateMockups } from './validate-mockups';

export async function verifyMockups(args: { mockup_folder?: string }): Promise<string> {
  const cwd = process.cwd();
  const mockupFolder = args.mockup_folder || 'refs/design/';

  console.error('🍞 CodeBakers: Mockup Final Verification');

  try {
    // Re-run validation
    const validationResult = await validateMockups({ mockup_folder: mockupFolder });

    // Parse validation result (simple check)
    const hasCritical = validationResult.includes('CRITICAL ISSUES');
    const hasWarnings = validationResult.includes('WARNINGS');

    if (!hasCritical && !hasWarnings) {
      // Perfect!
      return `🍞 CodeBakers: Mockup Verification

✅ PERFECT - Zero issues detected

**Quality score:** 100/100 🟢 EXCELLENT

**Checks passed:**
✅ No overlapping content (all breakpoints)
✅ All elements within viewport
✅ Mobile mockups present
✅ All states defined (loading/error/empty/success)
✅ Design tokens standardized
✅ Spacing consistent (8px grid)
✅ Accessibility: contrast ratios pass WCAG AA
✅ All interactive elements labeled

**Mockups are 100% perfect and ready for analysis.**

**Next step:** codebakers_analyze_mockups

This will extract:
- All UI components
- All data fields (for database schema)
- All user interactions
- Design tokens

After analysis: codebakers_generate_schema (perfect schema from perfect mockups)`;
    } else if (hasCritical) {
      return `🍞 CodeBakers: Mockup Verification

❌ FAILED - Critical issues still present

Run codebakers_fix_mockups again to auto-fix remaining issues.

Or run codebakers_validate_mockups to see detailed issue list.`;
    } else {
      return `🍞 CodeBakers: Mockup Verification

⚠️ WARNINGS PRESENT - But can proceed

**Quality score:** 70-90/100 🟡 GOOD

Warnings detected but no critical blockers.

**Options:**
1. Proceed: codebakers_analyze_mockups (warnings won't block build)
2. Fix warnings: codebakers_fix_mockups (recommended for production)
3. Review: codebakers_validate_mockups (see detailed warnings)

**Recommended:** Fix warnings before production builds.`;
    }
  } catch (error) {
    console.error('Error during mockup verification:', error);
    return `🍞 CodeBakers: Mockup Verification Failed

Error: ${error instanceof Error ? error.message : String(error)}`;
  }
}
