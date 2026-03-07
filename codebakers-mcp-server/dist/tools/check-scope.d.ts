/**
 * codebakers_check_scope
 *
 * Scope Verification
 *
 * Verifies that a feature request is defined in PROJECT-SPEC.md.
 * Prevents scope creep by enforcing spec boundaries.
 *
 * Rules:
 * - Feature must be in Gate 1 (Entities) or Gate 2 (State Changes)
 * - If not found, must either:
 *   1. Add to spec (formal amendment)
 *   2. Descope (remove from request)
 *   3. Flag for future iteration
 * - Never silently expand scope
 *
 * Based on CodeBakers Method Principle #7: Fixed Appetite, Not Open Scope
 */
export declare function checkScope(args: {
    feature_description?: string;
}): Promise<string>;
//# sourceMappingURL=check-scope.d.ts.map