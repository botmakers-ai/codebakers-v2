/**
 * codebakers_deploy_vercel
 *
 * Vercel Deployment Automation
 *
 * Deploys app to Vercel:
 * - Configures project
 * - Sets environment variables
 * - Deploys to production
 * - Returns live URL
 */
interface DeployArgs {
    production?: boolean;
    env_file?: string;
}
export declare function deployVercel(args?: DeployArgs): Promise<string>;
export {};
//# sourceMappingURL=deploy-vercel.d.ts.map