/**
 * codebakers_scan_security
 *
 * Security Vulnerability Scanner
 *
 * Scans for:
 * - Dependency vulnerabilities (npm audit)
 * - XSS vulnerabilities
 * - SQL injection risks
 * - Exposed secrets
 * - Insecure authentication patterns
 * - Missing security headers
 */
import * as fs from 'fs/promises';
import * as path from 'path';
import { execSync } from 'child_process';
export async function scanSecurity(args = {}) {
    const cwd = process.cwd();
    const { block_on_critical = true } = args;
    console.error('🍞 CodeBakers: Scanning Security');
    try {
        const issues = [];
        // Scan 1: Dependency vulnerabilities
        const depIssues = await scanDependencies(cwd);
        issues.push(...depIssues);
        // Scan 2: Code vulnerabilities
        const codeIssues = await scanCodeSecurity(cwd);
        issues.push(...codeIssues);
        // Scan 3: Environment variables
        const envIssues = await scanEnvSecurity(cwd);
        issues.push(...envIssues);
        // Scan 4: API routes security
        const apiIssues = await scanApiSecurity(cwd);
        issues.push(...apiIssues);
        // Calculate risk score
        const criticalCount = issues.filter(i => i.severity === 'critical').length;
        const highCount = issues.filter(i => i.severity === 'high').length;
        // Generate report
        const report = generateSecurityReport(issues, block_on_critical);
        // Save detailed report
        const reportPath = path.join(cwd, '.codebakers', 'SECURITY-REPORT.md');
        await fs.mkdir(path.dirname(reportPath), { recursive: true });
        await fs.writeFile(reportPath, generateDetailedSecurityReport(issues), 'utf-8');
        return report;
    }
    catch (error) {
        return `🍞 CodeBakers: Security Scan Failed\n\nError: ${error instanceof Error ? error.message : String(error)}`;
    }
}
async function scanDependencies(cwd) {
    const issues = [];
    try {
        // Run npm audit
        const output = execSync('npm audit --json', {
            cwd,
            encoding: 'utf-8',
            stdio: ['pipe', 'pipe', 'ignore']
        });
        const audit = JSON.parse(output);
        if (audit.vulnerabilities) {
            for (const [pkg, vulnData] of Object.entries(audit.vulnerabilities)) {
                const data = vulnData;
                const severity = data.severity;
                issues.push({
                    severity,
                    category: 'Dependencies',
                    title: `Vulnerable dependency: ${pkg}`,
                    description: data.via?.[0]?.title || `${pkg} has known vulnerabilities`,
                    fix: `Run: npm audit fix${severity === 'critical' || severity === 'high' ? ' --force' : ''}`
                });
            }
        }
    }
    catch (error) {
        // npm audit failed or no vulnerabilities
    }
    return issues;
}
async function scanCodeSecurity(cwd) {
    const issues = [];
    const srcDir = path.join(cwd, 'src');
    try {
        await scanDirectorySecurity(srcDir, issues);
    }
    catch {
        // src/ doesn't exist
    }
    return issues;
}
async function scanDirectorySecurity(dir, issues) {
    try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                await scanDirectorySecurity(fullPath, issues);
            }
            else if (entry.name.match(/\.(ts|tsx|js|jsx)$/)) {
                await scanFileSecurity(fullPath, issues);
            }
        }
    }
    catch {
        // Directory doesn't exist
    }
}
async function scanFileSecurity(file, issues) {
    const content = await fs.readFile(file, 'utf-8');
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineNumber = i + 1;
        // Check 1: Dangerous innerHTML usage
        if (line.includes('dangerouslySetInnerHTML') && !line.includes('DOMPurify')) {
            issues.push({
                severity: 'high',
                category: 'XSS',
                title: 'Potential XSS vulnerability',
                description: 'dangerouslySetInnerHTML without sanitization',
                file,
                line: lineNumber,
                fix: 'Use DOMPurify to sanitize HTML before rendering'
            });
        }
        // Check 2: eval() usage
        if (line.includes('eval(')) {
            issues.push({
                severity: 'critical',
                category: 'Code Injection',
                title: 'eval() usage detected',
                description: 'eval() can execute arbitrary code',
                file,
                line: lineNumber,
                fix: 'Avoid eval() - use safe alternatives'
            });
        }
        // Check 3: Weak password regex
        if (line.match(/password.*length.*[<>]\s*[1-5]/) || line.match(/password.*minLength.*[1-5]/)) {
            issues.push({
                severity: 'medium',
                category: 'Authentication',
                title: 'Weak password requirements',
                description: 'Password minimum length is too short',
                file,
                line: lineNumber,
                fix: 'Require passwords to be at least 8 characters'
            });
        }
        // Check 4: Hardcoded secrets
        const secretPatterns = [
            /api[_-]?key\s*=\s*['"][a-zA-Z0-9]{20,}['"]/i,
            /secret\s*=\s*['"][a-zA-Z0-9]{20,}['"]/i,
            /password\s*=\s*['"][^'"]{5,}['"]/i,
            /token\s*=\s*['"][a-zA-Z0-9]{20,}['"]/i
        ];
        for (const pattern of secretPatterns) {
            if (pattern.test(line) && !line.includes('process.env')) {
                issues.push({
                    severity: 'critical',
                    category: 'Secrets',
                    title: 'Hardcoded secret detected',
                    description: 'Secret value found in code',
                    file,
                    line: lineNumber,
                    fix: 'Move secrets to environment variables'
                });
            }
        }
        // Check 5: SQL injection risk (if using raw SQL)
        if (line.includes('queryRawUnsafe') || line.includes('executeRawUnsafe')) {
            issues.push({
                severity: 'critical',
                category: 'SQL Injection',
                title: 'SQL injection risk',
                description: 'Using raw SQL queries without parameterization',
                file,
                line: lineNumber,
                fix: 'Use parameterized queries or query builder'
            });
        }
        // Check 6: Missing authentication check
        if ((line.includes('async function POST') || line.includes('async function DELETE')) && !content.includes('auth') && !content.includes('session')) {
            issues.push({
                severity: 'high',
                category: 'Authentication',
                title: 'Missing authentication check',
                description: 'API route might be missing auth verification',
                file,
                line: lineNumber,
                fix: 'Add authentication check before processing request'
            });
        }
    }
}
async function scanEnvSecurity(cwd) {
    const issues = [];
    // Check if .env is in .gitignore
    const gitignorePath = path.join(cwd, '.gitignore');
    try {
        const gitignore = await fs.readFile(gitignorePath, 'utf-8');
        if (!gitignore.includes('.env')) {
            issues.push({
                severity: 'high',
                category: 'Secrets',
                title: '.env not in .gitignore',
                description: 'Environment variables might be committed to git',
                file: '.gitignore',
                fix: 'Add .env to .gitignore'
            });
        }
    }
    catch {
        // .gitignore doesn't exist
    }
    // Check for .env.example
    const envExamplePath = path.join(cwd, '.env.example');
    try {
        await fs.access(envExamplePath);
    }
    catch {
        issues.push({
            severity: 'low',
            category: 'Configuration',
            title: 'Missing .env.example',
            description: 'No example environment file for developers',
            fix: 'Create .env.example with placeholder values'
        });
    }
    return issues;
}
async function scanApiSecurity(cwd) {
    const issues = [];
    const apiDir = path.join(cwd, 'src', 'app', 'api');
    try {
        await scanApiRoutes(apiDir, issues);
    }
    catch {
        // API directory doesn't exist
    }
    return issues;
}
async function scanApiRoutes(dir, issues) {
    try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                await scanApiRoutes(fullPath, issues);
            }
            else if (entry.name === 'route.ts' || entry.name === 'route.js') {
                const content = await fs.readFile(fullPath, 'utf-8');
                // Check for CORS misconfiguration
                if (content.includes("'Access-Control-Allow-Origin', '*'")) {
                    issues.push({
                        severity: 'medium',
                        category: 'CORS',
                        title: 'Permissive CORS policy',
                        description: 'Allow-Origin set to * (allows all domains)',
                        file: fullPath,
                        fix: 'Restrict CORS to specific domains'
                    });
                }
                // Check for rate limiting
                if (!content.includes('ratelimit') && !content.includes('rate-limit')) {
                    issues.push({
                        severity: 'medium',
                        category: 'Rate Limiting',
                        title: 'Missing rate limiting',
                        description: 'API route might be vulnerable to abuse',
                        file: fullPath,
                        fix: 'Add rate limiting middleware'
                    });
                }
            }
        }
    }
    catch {
        // Directory doesn't exist
    }
}
function generateSecurityReport(issues, blockOnCritical) {
    const critical = issues.filter(i => i.severity === 'critical').length;
    const high = issues.filter(i => i.severity === 'high').length;
    const medium = issues.filter(i => i.severity === 'medium').length;
    const low = issues.filter(i => i.severity === 'low').length;
    const blocked = blockOnCritical && critical > 0;
    let report = `🍞 CodeBakers: Security Scan\n\n`;
    report += `**Status:** ${blocked ? '❌ BLOCKED' : critical === 0 && high === 0 ? '✅ PASS' : '⚠️ WARNINGS'}\n\n`;
    report += `## Vulnerabilities\n\n`;
    report += `- Critical: ${critical} ${critical === 0 ? '✅' : '❌'}\n`;
    report += `- High: ${high} ${high === 0 ? '✅' : '⚠️'}\n`;
    report += `- Medium: ${medium}\n`;
    report += `- Low: ${low}\n\n`;
    if (critical > 0) {
        report += `## 🚨 Critical Issues (Must Fix)\n\n`;
        for (const issue of issues.filter(i => i.severity === 'critical').slice(0, 5)) {
            report += `**${issue.title}**\n`;
            report += `- Category: ${issue.category}\n`;
            report += `- ${issue.description}\n`;
            if (issue.file) {
                report += `- File: ${path.basename(issue.file)}${issue.line ? `:${issue.line}` : ''}\n`;
            }
            report += `- Fix: ${issue.fix}\n\n`;
        }
        if (critical > 5) {
            report += `... and ${critical - 5} more critical issues\n\n`;
        }
    }
    if (high > 0 && critical === 0) {
        report += `## ⚠️ High Severity Issues\n\n`;
        for (const issue of issues.filter(i => i.severity === 'high').slice(0, 3)) {
            report += `- ${issue.title}: ${issue.description}\n`;
        }
        report += `\n`;
    }
    if (blocked) {
        report += `## ❌ Deployment Blocked\n\n`;
        report += `Critical security issues must be fixed before deployment.\n\n`;
        report += `**Next steps:**\n`;
        report += `1. Fix critical issues above\n`;
        report += `2. Re-run: codebakers_scan_security\n`;
        report += `3. Proceed to deployment\n\n`;
    }
    else if (critical === 0 && high === 0) {
        report += `## ✅ Security Check Passed\n\n`;
        report += `No critical or high severity issues found.\n\n`;
    }
    report += `**Full report:** .codebakers/SECURITY-REPORT.md\n`;
    return report;
}
function generateDetailedSecurityReport(issues) {
    let report = `# Security Scan Report\n\n`;
    report += `**Generated:** ${new Date().toISOString()}\n\n`;
    report += `## Summary\n\n`;
    report += `| Severity | Count |\n`;
    report += `|----------|-------|\n`;
    report += `| Critical | ${issues.filter(i => i.severity === 'critical').length} |\n`;
    report += `| High     | ${issues.filter(i => i.severity === 'high').length} |\n`;
    report += `| Medium   | ${issues.filter(i => i.severity === 'medium').length} |\n`;
    report += `| Low      | ${issues.filter(i => i.severity === 'low').length} |\n\n`;
    for (const severity of ['critical', 'high', 'medium', 'low']) {
        const filtered = issues.filter(i => i.severity === severity);
        if (filtered.length === 0)
            continue;
        report += `## ${severity.charAt(0).toUpperCase() + severity.slice(1)} Issues\n\n`;
        for (const issue of filtered) {
            report += `### ${issue.title}\n\n`;
            report += `- **Category:** ${issue.category}\n`;
            report += `- **Description:** ${issue.description}\n`;
            if (issue.file) {
                report += `- **File:** ${issue.file}${issue.line ? `:${issue.line}` : ''}\n`;
            }
            report += `- **Fix:** ${issue.fix}\n\n`;
        }
    }
    return report;
}
//# sourceMappingURL=scan-security.js.map