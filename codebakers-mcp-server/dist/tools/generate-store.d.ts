/**
 * codebakers_generate_store
 *
 * Zustand Store Generator
 *
 * Generates stores with DEPENDENCY-MAP.md integration.
 * Ensures all mutations update ALL affected stores.
 */
interface StoreArgs {
    entity: string;
    operations: string[];
    dependencies?: string[];
}
export declare function generateStore(args: StoreArgs): Promise<string>;
export {};
//# sourceMappingURL=generate-store.d.ts.map