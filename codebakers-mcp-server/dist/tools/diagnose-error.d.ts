/**
 * codebakers_diagnose_error
 *
 * AI-Powered Error Diagnosis
 *
 * Analyzes errors and provides:
 * - Root cause analysis
 * - Affected files
 * - Multiple fix approaches
 * - Confidence scores
 * - Related patterns from ERROR-LOG.md
 */
interface DiagnoseArgs {
    error_message: string;
    stack_trace?: string;
    context?: string;
}
export declare function diagnoseError(args: DiagnoseArgs): Promise<string>;
export {};
//# sourceMappingURL=diagnose-error.d.ts.map