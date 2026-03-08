/**
 * codebakers_setup_github
 *
 * GitHub Repository Setup with OAuth
 *
 * Prompts user:
 * - Have existing GitHub repo? → Configure remote
 * - Create new repo? → OAuth → Create → Configure git
 * - Skip? → User will configure manually later
 *
 * For new repos:
 * - Opens browser for GitHub OAuth
 * - Creates repository via GitHub API
 * - Configures git remote
 * - Makes initial commit and push
 */
interface GitHubSetupArgs {
    mode?: 'existing' | 'create' | 'skip';
    repo_name?: string;
    repo_url?: string;
    is_private?: boolean;
}
export declare function setupGitHub(args?: GitHubSetupArgs): Promise<string>;
export {};
//# sourceMappingURL=setup-github.d.ts.map