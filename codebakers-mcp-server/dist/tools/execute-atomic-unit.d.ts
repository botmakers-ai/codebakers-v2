/**
 * codebakers_execute_atomic_unit
 *
 * Atomic Unit Executor - Runs full 8-step build process
 *
 * Steps:
 * 1. Schema (if needed)
 * 2. API Routes
 * 3. Store
 * 4. UI Component
 * 5. States (loading/error/empty/success)
 * 6. Tests (unit + E2E)
 * 7. Mobile responsiveness
 * 8. Gate check
 */
interface AtomicUnitArgs {
    feature_name: string;
    entity: string;
    operations?: string[];
}
export declare function executeAtomicUnit(args: AtomicUnitArgs): Promise<string>;
export {};
//# sourceMappingURL=execute-atomic-unit.d.ts.map