/**
 * codebakers_validate_accessibility
 *
 * Accessibility Validation - WCAG Compliance
 *
 * Scans components for accessibility violations:
 * - Missing ARIA labels
 * - Low contrast ratios
 * - Missing alt text
 * - Keyboard navigation issues
 * - Screen reader compatibility
 */
interface A11yArgs {
    threshold?: number;
}
export declare function validateAccessibility(args?: A11yArgs): Promise<string>;
export {};
//# sourceMappingURL=validate-accessibility.d.ts.map