/**
 * codebakers_setup_supabase
 *
 * Supabase Project Setup with OAuth
 *
 * Prompts user:
 * - Have existing Supabase project? → Get credentials → Write to .env
 * - Create new project? → OAuth → Create → Get credentials → Write to .env
 * - Skip? → User will configure manually later
 *
 * For new projects:
 * - Opens browser for Supabase OAuth
 * - Creates project via Supabase Management API
 * - Retrieves database credentials automatically
 * - Writes to .env file
 */
interface SupabaseSetupArgs {
    mode?: 'existing' | 'create' | 'skip';
    project_name?: string;
    region?: string;
    supabase_url?: string;
    supabase_anon_key?: string;
    supabase_service_key?: string;
    database_url?: string;
}
export declare function setupSupabase(args?: SupabaseSetupArgs): Promise<string>;
export {};
//# sourceMappingURL=setup-supabase.d.ts.map