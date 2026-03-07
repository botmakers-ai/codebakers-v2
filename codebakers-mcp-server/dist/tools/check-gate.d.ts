/**
 * codebakers_check_gate
 *
 * Phase Verification Gate Checks
 *
 * Verifies all requirements are met before proceeding to next phase.
 * Based on CodeBakers Method verification gates for each phase.
 *
 * Phase Gates:
 * - Phase 0: PROJECT-SPEC.md complete (Gates 0-5), human approved
 * - Phase 1: All mockups created, design system documented
 * - Phase 2: MOCK-ANALYSIS.md, SCHEMA.sql, DEPENDENCY-MAP.md complete
 * - Phase 3: Foundation built, auth working, all routes resolve
 * - Phase 4: All features implemented, all screens match mockups
 * - Phase 5: All tests passing, Lighthouse >90, no critical vulnerabilities
 * - Phase 6: Deployed, monitoring active, runbook complete
 */
export declare function checkGate(args: {
    phase?: number;
}): Promise<string>;
//# sourceMappingURL=check-gate.d.ts.map