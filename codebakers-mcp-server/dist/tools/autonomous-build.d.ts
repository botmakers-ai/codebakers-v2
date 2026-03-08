/**
 * codebakers_autonomous_build
 *
 * Full Autonomous Build Orchestrator
 *
 * Builds entire application from FLOWS.md with zero human intervention.
 * Executes all features sequentially with full atomic unit protocol.
 */
interface BuildArgs {
    mode: 'full' | 'remaining';
    stop_on_error?: boolean;
    skip_quality_gates?: boolean;
    skip_deploy?: boolean;
    skip_docs?: boolean;
    skip_chatbot?: boolean;
}
export declare function autonomousBuild(args: BuildArgs): Promise<string>;
export {};
//# sourceMappingURL=autonomous-build.d.ts.map