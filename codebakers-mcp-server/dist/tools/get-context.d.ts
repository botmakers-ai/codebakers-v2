/**
 * codebakers_get_context
 *
 * Auto-detect project state and suggest next steps
 * This runs before EVERY user interaction to make CodeBakers self-aware
 */
interface ProjectContext {
    current_phase: string;
    phase_number: number;
    progress_percent: number;
    next_steps: NextStep[];
    blockers: Blocker[];
    suggestions: Suggestion[];
    project_name?: string;
    project_type?: string;
}
interface NextStep {
    description: string;
    command?: string;
    estimated_time?: string;
}
interface Blocker {
    type: string;
    description: string;
    solutions: string[];
}
interface Suggestion {
    type: string;
    message: string;
    action: string;
    command?: string;
}
export declare function getContext(args: any): Promise<ProjectContext>;
export {};
//# sourceMappingURL=get-context.d.ts.map