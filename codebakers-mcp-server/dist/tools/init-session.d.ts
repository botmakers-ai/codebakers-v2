/**
 * codebakers_init_session
 *
 * Session Initialization Protocol (from CodeBakers Method)
 * Loads BUILD-STATE.md, PROJECT-SPEC.md, and phase-specific context
 * MUST run at the start of every AI session
 */
interface SessionContext {
    initialized: true;
    project_name: string;
    current_phase: number;
    phase_name: string;
    current_task: string;
    build_state: any;
    project_spec: any;
    phase_artifacts: string[];
    verification_gate: string[];
    next_action: string;
}
export declare function initSession(args: any): Promise<SessionContext>;
export {};
//# sourceMappingURL=init-session.d.ts.map