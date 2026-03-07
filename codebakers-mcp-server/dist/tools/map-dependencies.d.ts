/**
 * codebakers_map_dependencies
 *
 * Phase 2C: Comprehensive Dependency Mapping
 * Maps ALL dependencies BEFORE any code is written
 *
 * USER'S CRITICAL ENHANCEMENT:
 * "Best possible dependency mapping from moment 1"
 * "Make sure all connections are there from moment 1"
 *
 * This prevents the #1 cause of bugs:
 * Mutations that update the database but leave UI stale
 *
 * Maps:
 * 1. Read dependencies (component → stores → database queries)
 * 2. Write dependencies (mutation → store updates → cascade effects)
 * 3. Store-to-store connections (when X changes, Y must also update)
 * 4. Cascade effects (database triggers, computed values, related entities)
 * 5. Query patterns (filters, sorts, search - what indexes needed)
 */
export declare function mapDependencies(args: {
    schema_file?: string;
    analysis_file?: string;
}): Promise<string>;
//# sourceMappingURL=map-dependencies.d.ts.map