/**
 * codebakers_fix_commit
 *
 * Git Commit Auto-Fixer
 *
 * Detects and fixes common git commit violations:
 * - Wrong commit message format
 * - Missing .codebakers/ files in commit
 * - TypeScript errors in code
 * - Missing BUILD-LOG.md updates
 *
 * Safe amend rules:
 * - Only amend if NOT pushed
 * - Only amend if author is current user
 * - Never amend other developers' commits
 *
 * Based on CodeBakers Method commit format:
 * feat(atomic): [name] — gate passed [N/N checks]
 */
export declare function fixCommit(args: {
    auto_fix?: boolean;
}): Promise<string>;
//# sourceMappingURL=fix-commit.d.ts.map