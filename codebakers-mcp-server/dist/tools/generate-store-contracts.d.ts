/**
 * codebakers_generate_store_contracts
 *
 * Phase 2D: Store Contract Generation
 * Generates TypeScript interfaces for all stores
 *
 * Purpose:
 * - Type-safe store definitions before building
 * - Contract for what each store must implement
 * - Maps from schema + dependency map to TypeScript interfaces
 * - Ensures consistency between database and client state
 */
export declare function generateStoreContracts(args: {
    schema_file?: string;
    dependency_map_file?: string;
}): Promise<string>;
//# sourceMappingURL=generate-store-contracts.d.ts.map