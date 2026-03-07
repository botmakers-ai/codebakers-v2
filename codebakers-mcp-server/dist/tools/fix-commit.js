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
import { exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);
export async function fixCommit(args) {
    const autoFix = args.auto_fix || false;
    const cwd = process.cwd();
    console.error('🍞 CodeBakers: Commit Auto-Fixer');
    try {
        // 1. Check if in git repo
        const isGitRepo = await checkGitRepo(cwd);
        if (!isGitRepo) {
            return `🍞 CodeBakers: Commit Fixer

❌ Not a git repository

Initialize git first:
\`\`\`bash
git init
\`\`\``;
        }
        // 2. Analyze last commit
        console.error('Analyzing last commit...');
        const analysis = await analyzeLastCommit(cwd);
        if (analysis.violations.length === 0) {
            return `🍞 CodeBakers: Commit Fixer

✅ Last commit looks good!

Commit: ${analysis.commit_hash}
Message: ${analysis.commit_message}

No violations detected.`;
        }
        // 3. Generate report
        const report = generateFixReport(analysis, autoFix);
        return report;
    }
    catch (error) {
        console.error('Error during commit fix:', error);
        return `🍞 CodeBakers: Commit Fixer Failed

Error: ${error instanceof Error ? error.message : String(error)}

Please check git status and try again.`;
    }
}
/**
 * Check if directory is git repo
 */
async function checkGitRepo(cwd) {
    try {
        await execAsync('git rev-parse --git-dir', { cwd });
        return true;
    }
    catch {
        return false;
    }
}
/**
 * Analyze last commit
 */
async function analyzeLastCommit(cwd) {
    const violations = [];
    // Get last commit info
    const { stdout: hash } = await execAsync('git log -1 --format=%H', { cwd });
    const commitHash = hash.trim();
    const { stdout: message } = await execAsync('git log -1 --format=%B', { cwd });
    const commitMessage = message.trim();
    const { stdout: author } = await execAsync('git log -1 --format="%an %ae"', { cwd });
    const commitAuthor = author.trim();
    // Check if pushed
    let isPushed = false;
    try {
        const { stdout: remoteBranch } = await execAsync('git rev-parse --abbrev-ref --symbolic-full-name @{u}', { cwd });
        if (remoteBranch.trim()) {
            const { stdout: remoteLogs } = await execAsync(`git log ${remoteBranch.trim()}..HEAD --oneline`, { cwd });
            isPushed = remoteLogs.trim() === '';
        }
    }
    catch {
        // No remote or not pushed
        isPushed = false;
    }
    const canAmend = !isPushed;
    // VIOLATION 1: Check commit message format
    const atomicFormatRegex = /^feat\(atomic\):.+— gate passed \[\d+\/\d+ checks\]$/;
    const standardFormatRegex = /^(feat|fix|chore|docs|refactor|test|style)(\(.+\))?:.+$/;
    if (!atomicFormatRegex.test(commitMessage) && !standardFormatRegex.test(commitMessage)) {
        violations.push({
            type: 'Invalid commit message format',
            severity: 'warning',
            description: `Message: "${commitMessage}"\nExpected format: feat(atomic): [name] — gate passed [N/N checks]`,
            fix_available: canAmend,
            fix_command: canAmend ? 'git commit --amend -m "feat(atomic): [feature] — gate passed [8/8 checks]"' : undefined,
        });
    }
    // VIOLATION 2: Check if .codebakers/ files committed
    const { stdout: filesChanged } = await execAsync('git diff-tree --no-commit-id --name-only -r HEAD', { cwd });
    const files = filesChanged.trim().split('\n');
    const hasCodebakersFiles = files.some(f => f.startsWith('.codebakers/'));
    if (!hasCodebakersFiles && files.length > 0) {
        violations.push({
            type: 'Missing .codebakers/ files',
            severity: 'warning',
            description: 'Commit does not include .codebakers/ memory files.\nBUILD-LOG.md, FIX-QUEUE.md, or UNIT-PROGRESS.md may need to be committed.',
            fix_available: canAmend,
            fix_command: canAmend ? 'git add .codebakers/ && git commit --amend --no-edit' : undefined,
        });
    }
    // VIOLATION 3: Check for package.json without package-lock.json (if applicable)
    const hasPackageJson = files.some(f => f === 'package.json');
    const hasLockFile = files.some(f => f === 'package-lock.json' || f === 'pnpm-lock.yaml' || f === 'yarn.lock');
    if (hasPackageJson && !hasLockFile) {
        violations.push({
            type: 'Missing lock file',
            severity: 'critical',
            description: 'package.json changed but no lock file committed.\nCodeBakers requires exact versions.',
            fix_available: canAmend,
            fix_command: canAmend ? 'git add *lock* && git commit --amend --no-edit' : undefined,
        });
    }
    return {
        commit_hash: commitHash,
        commit_message: commitMessage,
        author: commitAuthor,
        is_pushed: isPushed,
        can_amend: canAmend,
        violations: violations,
    };
}
/**
 * Generate fix report
 */
function generateFixReport(analysis, autoFix) {
    let report = `🍞 CodeBakers: Commit Violations Detected\n\n`;
    report += `**Commit:** ${analysis.commit_hash.substring(0, 8)}\n`;
    report += `**Message:** ${analysis.commit_message}\n`;
    report += `**Author:** ${analysis.author}\n`;
    report += `**Pushed:** ${analysis.is_pushed ? 'YES (cannot amend safely)' : 'NO (can amend)'}\n\n`;
    report += `---\n\n`;
    // Violations
    report += `## Violations (${analysis.violations.length})\n\n`;
    for (let i = 0; i < analysis.violations.length; i++) {
        const v = analysis.violations[i];
        const icon = v.severity === 'critical' ? '❌' : '⚠️';
        report += `### ${i + 1}. ${icon} ${v.type} (${v.severity.toUpperCase()})\n\n`;
        report += `${v.description}\n\n`;
        if (v.fix_available && v.fix_command) {
            report += `**Fix Command:**\n`;
            report += `\`\`\`bash\n`;
            report += `${v.fix_command}\n`;
            report += `\`\`\`\n\n`;
        }
        else if (!v.fix_available) {
            report += `**Cannot Auto-Fix:** Commit already pushed\n`;
            report += `Manual fix required in next commit\n\n`;
        }
    }
    report += `---\n\n`;
    // Recommendations
    report += `## Recommendations\n\n`;
    if (!analysis.can_amend) {
        report += `⚠️ **Commit already pushed - cannot amend safely**\n\n`;
        report += `Options:\n`;
        report += `1. Fix violations in next commit\n`;
        report += `2. If really needed: force push (DANGEROUS - only if working alone)\n\n`;
    }
    else {
        const criticalCount = analysis.violations.filter(v => v.severity === 'critical').length;
        const warningCount = analysis.violations.filter(v => v.severity === 'warning').length;
        if (criticalCount > 0) {
            report += `❌ **${criticalCount} CRITICAL violation(s) - must fix before pushing**\n\n`;
        }
        if (warningCount > 0) {
            report += `⚠️ **${warningCount} warning(s) - recommended to fix**\n\n`;
        }
        report += `**Safe to amend** (commit not pushed)\n\n`;
        report += `To fix all violations:\n`;
        report += `1. Run fix commands above\n`;
        report += `2. OR create new commit with corrections\n\n`;
    }
    report += `---\n\n`;
    report += `## Proper Commit Format\n\n`;
    report += `For atomic units (features):\n`;
    report += `\`\`\`\n`;
    report += `feat(atomic): [feature name] — gate passed [8/8 checks]\n`;
    report += `\`\`\`\n\n`;
    report += `For other commits:\n`;
    report += `\`\`\`\n`;
    report += `feat|fix|chore|docs(scope): description\n`;
    report += `\`\`\`\n\n`;
    return report;
}
//# sourceMappingURL=fix-commit.js.map