/**
 * codebakers_fix_mockups
 *
 * Mockup Auto-Fixer
 *
 * Auto-fixes quality issues detected by validate_mockups:
 * - Overlapping content (adjust positioning)
 * - Out of viewport elements (reposition)
 * - Missing mobile mockups (auto-generate from desktop)
 * - Missing states (generate loading/error/empty)
 * - Color inconsistencies (standardize with CSS variables)
 * - Spacing inconsistencies (round to 8px grid)
 *
 * Cannot auto-fix (flags for manual review):
 * - Poor contrast (design decision)
 * - Complex layout conflicts
 */
export declare function fixMockups(args: {
    mockup_folder?: string;
}): Promise<string>;
//# sourceMappingURL=fix-mockups.d.ts.map