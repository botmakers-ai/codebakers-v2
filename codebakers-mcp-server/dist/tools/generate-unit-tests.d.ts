/**
 * codebakers_generate_unit_tests
 *
 * Vitest Unit Test Generator
 *
 * Generates unit tests for components, stores, and API routes
 */
interface TestArgs {
    file_path: string;
    test_type: 'component' | 'store' | 'api';
}
export declare function generateUnitTests(args: TestArgs): Promise<string>;
export {};
//# sourceMappingURL=generate-unit-tests.d.ts.map