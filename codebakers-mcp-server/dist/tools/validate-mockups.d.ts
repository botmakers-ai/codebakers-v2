/**
 * codebakers_validate_mockups
 *
 * Mockup Quality Validation
 *
 * Detects ALL quality issues in mockups BEFORE analysis:
 * - Overlapping content
 * - Out of viewport elements
 * - Missing mobile mockups
 * - Missing states (loading/error/empty)
 * - Design token inconsistencies
 * - Spacing inconsistencies
 * - Accessibility issues (contrast, alt text)
 *
 * Purpose: Garbage mockups in = garbage app out
 * Ensures database schema derived from PERFECT mockups
 */
export declare function validateMockups(args: {
    mockup_folder?: string;
}): Promise<string>;
//# sourceMappingURL=validate-mockups.d.ts.map