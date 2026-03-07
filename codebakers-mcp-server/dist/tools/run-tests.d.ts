/**
 * codebakers_run_tests
 *
 * Test Orchestrator - Runs Vitest and Playwright tests
 */
interface TestArgs {
    test_type: 'unit' | 'e2e' | 'all';
    mode?: 'fast' | 'full';
}
export declare function runTests(args: TestArgs): Promise<string>;
export {};
//# sourceMappingURL=run-tests.d.ts.map