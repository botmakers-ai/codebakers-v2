/**
 * codebakers_generate_migration
 *
 * Database Migration Generator
 *
 * Generates Supabase/PostgreSQL migration files from entity definitions.
 * Includes: tables, columns, foreign keys, indexes, RLS policies
 */
interface MigrationArgs {
    entity: string;
    fields: {
        name: string;
        type: string;
        required?: boolean;
        references?: string;
    }[];
    add_rls?: boolean;
}
export declare function generateMigration(args: MigrationArgs): Promise<string>;
export {};
//# sourceMappingURL=generate-migration.d.ts.map