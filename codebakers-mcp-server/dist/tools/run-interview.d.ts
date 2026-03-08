/**
 * codebakers_run_interview
 *
 * Optional Interview Tool (runs before or during mockup creation)
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
 * Purpose: Gather user context to inform better mockup design decisions
 * When to use: After spec generation, before creating mockups
 * Output: Project artifacts that help inform Phase 1 (mockup design)
 */
export declare function runInterview(args: {
    project_description?: string;
}): Promise<string>;
//# sourceMappingURL=run-interview.d.ts.map