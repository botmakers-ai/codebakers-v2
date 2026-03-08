/**
 * codebakers_consult
 *
 * Context-Aware Consulting & Guidance
 *
 * Provides intelligent consulting based on full project context:
 * - Current project state (BRAIN.md)
 * - Architecture decisions (ASSUMPTIONS.md)
 * - Dependencies (DEPENDENCY-MAP.md)
 * - Past errors and learnings (ERROR-LOG.md)
 * - User flows (FLOWS.md)
 * - Tech stack (Supabase + Next.js)
 * - Domain context (project-profile.md)
 *
 * Unlike generic AI responses, this tool provides answers specific to:
 * - Your project's current state
 * - Your existing architecture
 * - Patterns that have worked (or failed) in your project
 * - Your tech stack constraints
 */
interface ConsultArgs {
    question: string;
    include_code_examples?: boolean;
    focus_area?: 'architecture' | 'security' | 'performance' | 'ui' | 'data' | 'testing' | 'deployment';
}
export declare function consult(args: ConsultArgs): Promise<string>;
export {};
//# sourceMappingURL=consult.d.ts.map