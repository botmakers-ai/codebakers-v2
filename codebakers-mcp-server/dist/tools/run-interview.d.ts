/**
 * codebakers_run_interview
 *
 * Automated Interview Agent (Phase 1)
 *
 * Automates project interview to generate:
 * - project-profile.md (intent, external services, constraints)
 * - FLOWS.md (all user flows with status)
 * - CREDENTIALS-NEEDED.md (external actions needed)
 * - BRAIN.md initialization
 *
 * Reads from (if exist):
 * - refs/prd/ (requirements)
 * - refs/design/ (mockups - uses DESIGN-CONTRACT.md if exists)
 * - refs/api/ (API docs)
 * - INTEGRATION-CONFIG.md (if integrations tested)
 *
 * Output: Complete Phase 1 artifacts ready for Phase 2
 */
export declare function runInterview(args: {
    project_description?: string;
}): Promise<string>;
//# sourceMappingURL=run-interview.d.ts.map