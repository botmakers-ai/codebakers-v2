/**
 * codebakers_setup_vercel
 *
 * Vercel Project Setup with OAuth
 *
 * Prompts user:
 * - Have existing Vercel project? → Link it
 * - Create/Link new project? → OAuth → Link → Configure
 * - Skip? → User will configure manually later
 *
 * For new projects:
 * - Opens browser for Vercel OAuth
 * - Links project to Vercel
 * - Configures deployment settings
 */
interface VercelSetupArgs {
    mode?: 'link' | 'skip';
    project_name?: string;
    production_branch?: string;
}
export declare function setupVercel(args?: VercelSetupArgs): Promise<string>;
export {};
//# sourceMappingURL=setup-vercel.d.ts.map