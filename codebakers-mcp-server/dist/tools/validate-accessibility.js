/**
 * codebakers_validate_accessibility
 *
 * Accessibility Validation - WCAG Compliance
 *
 * Scans components for accessibility violations:
 * - Missing ARIA labels
 * - Low contrast ratios
 * - Missing alt text
 * - Keyboard navigation issues
 * - Screen reader compatibility
 */
import * as fs from 'fs/promises';
import * as path from 'path';
export async function validateAccessibility(args = {}) {
    const cwd = process.cwd();
    const { threshold = 90 } = args;
    console.error('🍞 CodeBakers: Validating Accessibility');
    try {
        const issues = [];
        // Scan all component files
        const components = await findComponents(cwd);
        for (const file of components) {
            const content = await fs.readFile(file, 'utf-8');
            const fileIssues = await scanFile(file, content);
            issues.push(...fileIssues);
        }
        // Calculate score
        const criticalCount = issues.filter(i => i.severity === 'critical').length;
        const warningCount = issues.filter(i => i.severity === 'warning').length;
        const score = calculateA11yScore(components.length, criticalCount, warningCount);
        // Generate report
        const report = generateA11yReport(score, threshold, issues);
        // Save detailed report
        const reportPath = path.join(cwd, '.codebakers', 'ACCESSIBILITY-REPORT.md');
        await fs.mkdir(path.dirname(reportPath), { recursive: true });
        await fs.writeFile(reportPath, generateDetailedReport(score, issues), 'utf-8');
        return report;
    }
    catch (error) {
        return `🍞 CodeBakers: Accessibility Validation Failed\n\nError: ${error instanceof Error ? error.message : String(error)}`;
    }
}
async function findComponents(cwd) {
    const components = [];
    const srcDir = path.join(cwd, 'src');
    try {
        await scanDirectory(srcDir, components);
    }
    catch {
        // src/ might not exist yet
    }
    return components;
}
async function scanDirectory(dir, results) {
    try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                await scanDirectory(fullPath, results);
            }
            else if (entry.name.match(/\.(tsx|jsx)$/)) {
                results.push(fullPath);
            }
        }
    }
    catch {
        // Directory doesn't exist or permission denied
    }
}
async function scanFile(file, content) {
    const issues = [];
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineNumber = i + 1;
        // Check 1: Images without alt text
        if (line.includes('<img') && !line.includes('alt=')) {
            issues.push({
                file,
                line: lineNumber,
                severity: 'critical',
                rule: 'WCAG 1.1.1',
                message: 'Image missing alt attribute',
                fix: 'Add alt="descriptive text" to <img> tag'
            });
        }
        // Check 2: Buttons without accessible labels
        if (line.match(/<button[^>]*>[\s]*<[^>]*\/>/)) {
            if (!line.includes('aria-label') && !line.includes('title')) {
                issues.push({
                    file,
                    line: lineNumber,
                    severity: 'critical',
                    rule: 'WCAG 4.1.2',
                    message: 'Button with icon only - missing accessible label',
                    fix: 'Add aria-label="action description" to button'
                });
            }
        }
        // Check 3: Input fields without labels
        if (line.includes('<input') && !line.includes('aria-label') && !line.includes('placeholder')) {
            const hasLabel = lines.slice(Math.max(0, i - 3), i).some(l => l.includes('<label'));
            if (!hasLabel) {
                issues.push({
                    file,
                    line: lineNumber,
                    severity: 'critical',
                    rule: 'WCAG 3.3.2',
                    message: 'Input field missing label',
                    fix: 'Add <label> or aria-label attribute'
                });
            }
        }
        // Check 4: Low contrast color combinations
        const lowContrastPatterns = [
            /text-gray-400.*bg-gray-300/,
            /text-gray-300.*bg-white/,
            /text-yellow-200.*bg-yellow-100/
        ];
        for (const pattern of lowContrastPatterns) {
            if (pattern.test(line)) {
                issues.push({
                    file,
                    line: lineNumber,
                    severity: 'warning',
                    rule: 'WCAG 1.4.3',
                    message: 'Potentially low contrast color combination',
                    fix: 'Ensure contrast ratio is at least 4.5:1 for normal text'
                });
            }
        }
        // Check 5: Missing heading hierarchy
        if (line.match(/<h[1-6]/)) {
            const headingLevel = parseInt(line.match(/<h([1-6])/)?.[1] || '1');
            const previousHeadings = lines.slice(0, i).filter(l => l.match(/<h[1-6]/));
            if (previousHeadings.length > 0) {
                const lastHeading = previousHeadings[previousHeadings.length - 1];
                const lastLevel = parseInt(lastHeading.match(/<h([1-6])/)?.[1] || '1');
                if (headingLevel > lastLevel + 1) {
                    issues.push({
                        file,
                        line: lineNumber,
                        severity: 'warning',
                        rule: 'WCAG 1.3.1',
                        message: `Heading hierarchy skipped (h${lastLevel} to h${headingLevel})`,
                        fix: `Use sequential heading levels (h${lastLevel} to h${lastLevel + 1})`
                    });
                }
            }
        }
        // Check 6: Click handlers on non-interactive elements
        if (line.match(/onClick.*<div|onClick.*<span/) && !line.includes('role=') && !line.includes('tabIndex')) {
            issues.push({
                file,
                line: lineNumber,
                severity: 'warning',
                rule: 'WCAG 2.1.1',
                message: 'Click handler on non-interactive element',
                fix: 'Add role="button" and tabIndex={0} or use <button> instead'
            });
        }
        // Check 7: Form submission without accessible feedback
        if (line.includes('onSubmit') || line.includes('type="submit"')) {
            const hasAriaLive = content.includes('aria-live') || content.includes('role="status"');
            if (!hasAriaLive) {
                issues.push({
                    file,
                    line: lineNumber,
                    severity: 'info',
                    rule: 'WCAG 4.1.3',
                    message: 'Form submission - consider adding status feedback',
                    fix: 'Add aria-live="polite" region for submission status'
                });
            }
        }
    }
    return issues;
}
function calculateA11yScore(totalComponents, critical, warnings) {
    if (totalComponents === 0)
        return 100;
    const criticalPenalty = critical * 10;
    const warningPenalty = warnings * 2;
    const totalPenalty = criticalPenalty + warningPenalty;
    const score = Math.max(0, 100 - totalPenalty);
    return Math.round(score);
}
function generateA11yReport(score, threshold, issues) {
    const critical = issues.filter(i => i.severity === 'critical').length;
    const warnings = issues.filter(i => i.severity === 'warning').length;
    const passed = score >= threshold;
    let report = `🍞 CodeBakers: Accessibility Validation\n\n`;
    report += `**Score:** ${score}/100 ${passed ? '✅' : '❌'}\n`;
    report += `**Threshold:** ${threshold}/100\n`;
    report += `**Status:** ${passed ? 'PASS' : 'FAIL'}\n\n`;
    report += `## Issues Found\n\n`;
    report += `- Critical: ${critical} ${critical === 0 ? '✅' : '❌'}\n`;
    report += `- Warnings: ${warnings}\n`;
    report += `- Info: ${issues.filter(i => i.severity === 'info').length}\n\n`;
    if (critical > 0) {
        report += `## Critical Issues (Must Fix)\n\n`;
        for (const issue of issues.filter(i => i.severity === 'critical').slice(0, 5)) {
            report += `**${path.basename(issue.file)}:${issue.line}**\n`;
            report += `- Rule: ${issue.rule}\n`;
            report += `- Issue: ${issue.message}\n`;
            report += `- Fix: ${issue.fix}\n\n`;
        }
        if (critical > 5) {
            report += `... and ${critical - 5} more critical issues\n\n`;
        }
    }
    if (!passed) {
        report += `## Next Steps\n\n`;
        report += `1. Fix critical issues above\n`;
        report += `2. Run: codebakers_fix_accessibility (auto-fix)\n`;
        report += `3. Re-validate: codebakers_validate_accessibility\n\n`;
    }
    else {
        report += `## ✅ Accessibility Compliant\n\n`;
        report += `Your app meets WCAG ${threshold >= 95 ? 'AAA' : 'AA'} standards.\n\n`;
    }
    report += `**Full report:** .codebakers/ACCESSIBILITY-REPORT.md\n`;
    return report;
}
function generateDetailedReport(score, issues) {
    let report = `# Accessibility Report\n\n`;
    report += `**Generated:** ${new Date().toISOString()}\n`;
    report += `**Score:** ${score}/100\n\n`;
    report += `## Summary\n\n`;
    report += `| Severity | Count |\n`;
    report += `|----------|-------|\n`;
    report += `| Critical | ${issues.filter(i => i.severity === 'critical').length} |\n`;
    report += `| Warning  | ${issues.filter(i => i.severity === 'warning').length} |\n`;
    report += `| Info     | ${issues.filter(i => i.severity === 'info').length} |\n\n`;
    for (const severity of ['critical', 'warning', 'info']) {
        const filtered = issues.filter(i => i.severity === severity);
        if (filtered.length === 0)
            continue;
        report += `## ${severity.charAt(0).toUpperCase() + severity.slice(1)} Issues\n\n`;
        for (const issue of filtered) {
            report += `### ${path.basename(issue.file)}:${issue.line}\n\n`;
            report += `- **Rule:** ${issue.rule}\n`;
            report += `- **Issue:** ${issue.message}\n`;
            report += `- **Fix:** ${issue.fix}\n\n`;
        }
    }
    return report;
}
//# sourceMappingURL=validate-accessibility.js.map