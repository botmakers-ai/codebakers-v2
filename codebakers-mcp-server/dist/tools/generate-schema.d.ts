/**
 * codebakers_generate_schema
 *
 * Phase 2B: Schema Generation
 * Generates complete database schema from mockup analysis
 *
 * Based on CodeBakers Method Phase 2B requirements:
 * - All tables with full column definitions (name, type, nullable, default, constraints)
 * - All foreign key relationships and join tables
 * - All indexes required for the query patterns revealed by mockups
 * - All enum types and value sets
 * - Row-level security policies where applicable
 * - Seed data requirements for development
 */
export declare function generateSchema(args: {
    analysis_file?: string;
}): Promise<string>;
//# sourceMappingURL=generate-schema.d.ts.map