/**
 * codebakers_diagnose_error
 *
 * AI-Powered Error Diagnosis
 *
 * Analyzes errors and provides:
 * - Root cause analysis
 * - Affected files
 * - Multiple fix approaches
 * - Confidence scores
 * - Related patterns from ERROR-LOG.md
 */
import * as fs from 'fs/promises';
import * as path from 'path';
export async function diagnoseError(args) {
    const cwd = process.cwd();
    const { error_message, stack_trace, context } = args;
    console.error('🍞 CodeBakers: Diagnosing Error');
    try {
        // Step 1: Check ERROR-LOG.md for similar errors
        const relatedErrors = await findRelatedErrors(cwd, error_message);
        // Step 2: Analyze stack trace to find affected files
        const affectedFiles = extractAffectedFiles(stack_trace || '');
        // Step 3: Determine root cause
        const rootCause = analyzeRootCause(error_message, stack_trace || '', context);
        // Step 4: Generate fix approaches
        const fixApproaches = generateFixApproaches(error_message, rootCause, affectedFiles);
        // Step 5: Generate diagnosis report
        const diagnosis = {
            root_cause: rootCause.cause,
            confidence: rootCause.confidence,
            affected_files: affectedFiles,
            fix_approaches: fixApproaches,
            related_errors: relatedErrors
        };
        // Step 6: Log to ERROR-LOG.md
        await logError(cwd, error_message, stack_trace || '', diagnosis);
        return generateDiagnosisReport(diagnosis, error_message);
    }
    catch (error) {
        return `🍞 CodeBakers: Error Diagnosis Failed\n\nError: ${error instanceof Error ? error.message : String(error)}`;
    }
}
async function findRelatedErrors(cwd, errorMessage) {
    const errorLogPath = path.join(cwd, '.codebakers', 'ERROR-LOG.md');
    const related = [];
    try {
        const content = await fs.readFile(errorLogPath, 'utf-8');
        const entries = content.split('## Error:').slice(1);
        // Extract key terms from current error
        const keyTerms = extractKeyTerms(errorMessage);
        for (const entry of entries) {
            // Check if entry contains any key terms
            for (const term of keyTerms) {
                if (entry.toLowerCase().includes(term.toLowerCase())) {
                    const title = entry.split('\n')[0].trim();
                    if (!related.includes(title)) {
                        related.push(title);
                    }
                    break;
                }
            }
        }
    }
    catch {
        // ERROR-LOG.md doesn't exist
    }
    return related.slice(0, 3); // Top 3 related errors
}
function extractKeyTerms(error) {
    const terms = [];
    // Extract error type (e.g., "TypeError", "ReferenceError")
    const typeMatch = error.match(/([A-Z][a-z]+Error)/);
    if (typeMatch) {
        terms.push(typeMatch[1]);
    }
    // Extract quoted identifiers (e.g., 'undefined', "null")
    const quotedMatches = error.matchAll(/['"]([a-zA-Z_$][a-zA-Z0-9_$]*)['"]/g);
    for (const match of quotedMatches) {
        terms.push(match[1]);
    }
    // Extract file extensions
    if (error.includes('.tsx'))
        terms.push('tsx');
    if (error.includes('.ts'))
        terms.push('typescript');
    if (error.includes('.jsx'))
        terms.push('jsx');
    return terms;
}
function extractAffectedFiles(stackTrace) {
    const files = [];
    const lines = stackTrace.split('\n');
    for (const line of lines) {
        // Match file paths in stack trace
        const match = line.match(/(?:at|in)\s+(?:.*?\s+)?\(?([^\s()]+\.(?:tsx?|jsx?|mjs)):(\d+)/);
        if (match) {
            const file = match[1];
            if (!files.includes(file)) {
                files.push(file);
            }
        }
    }
    return files.slice(0, 5); // Top 5 affected files
}
function analyzeRootCause(error, stackTrace, context) {
    // Pattern matching for common error types
    // TypeScript errors
    if (error.includes('Property') && error.includes('does not exist on type')) {
        return {
            cause: 'Attempting to access a property that TypeScript doesn\'t recognize on the type',
            confidence: 'high'
        };
    }
    if (error.includes('Cannot read property') || error.includes('Cannot read properties of undefined')) {
        return {
            cause: 'Accessing a property on undefined or null value (data not loaded or wrong type)',
            confidence: 'high'
        };
    }
    if (error.includes('window is not defined') || error.includes('document is not defined')) {
        return {
            cause: 'Server-side rendering (SSR) code trying to access browser-only APIs',
            confidence: 'high'
        };
    }
    if (error.includes('Hydration') || error.includes('Text content does not match')) {
        return {
            cause: 'Server-rendered HTML doesn\'t match client-rendered output (hydration mismatch)',
            confidence: 'high'
        };
    }
    if (error.includes('.maybeSingle() expected 0 or 1 rows')) {
        return {
            cause: 'Database query returned multiple rows when expecting single row',
            confidence: 'high'
        };
    }
    if (error.includes('Class') && error.includes('not found')) {
        return {
            cause: 'Tailwind CSS class not defined (missing from tailwind.config or not compiled)',
            confidence: 'high'
        };
    }
    if (error.includes('Module not found') || error.includes('Cannot find module')) {
        return {
            cause: 'Import path incorrect or dependency not installed',
            confidence: 'high'
        };
    }
    if (error.includes('401') || error.includes('Unauthorized')) {
        return {
            cause: 'Authentication failure (user not logged in or token expired)',
            confidence: 'high'
        };
    }
    if (error.includes('403') || error.includes('Forbidden')) {
        return {
            cause: 'Authorization failure (user lacks permission for this resource)',
            confidence: 'high'
        };
    }
    if (error.includes('404') || error.includes('Not Found')) {
        return {
            cause: 'Resource not found (wrong URL, deleted record, or route not defined)',
            confidence: 'high'
        };
    }
    if (error.includes('500') || error.includes('Internal Server Error')) {
        return {
            cause: 'Server-side error (check API route, database connection, or server logs)',
            confidence: 'medium'
        };
    }
    // Generic analysis
    if (stackTrace.length > 0) {
        return {
            cause: 'Runtime error during execution (check stack trace for file location)',
            confidence: 'medium'
        };
    }
    return {
        cause: 'Unknown error - manual investigation needed',
        confidence: 'low'
    };
}
function generateFixApproaches(error, rootCause, affectedFiles) {
    const approaches = [];
    // Generate approaches based on error type
    if (rootCause.cause.includes('undefined or null')) {
        approaches.push({
            approach: 'Add null check',
            steps: [
                'Identify the variable being accessed',
                'Add optional chaining: `obj?.property` instead of `obj.property`',
                'Or add explicit check: `if (obj) { ... }`',
                'Consider why value is undefined (data not loaded, wrong type, etc.)'
            ],
            confidence: 90,
            risk: 'low'
        });
        approaches.push({
            approach: 'Ensure data is loaded first',
            steps: [
                'Check if data is being fetched asynchronously',
                'Add loading state check before accessing data',
                'Use conditional rendering: `{data && <Component data={data} />}`'
            ],
            confidence: 85,
            risk: 'low'
        });
    }
    if (rootCause.cause.includes('SSR')) {
        approaches.push({
            approach: 'Use client-side only',
            steps: [
                'Add "use client" directive at top of file',
                'Or use dynamic import with { ssr: false }',
                'Or check if window exists: `if (typeof window !== "undefined")`'
            ],
            confidence: 95,
            risk: 'low'
        });
        approaches.push({
            approach: 'Use useEffect for browser APIs',
            steps: [
                'Move browser API calls into useEffect hook',
                'useEffect only runs on client side',
                'Store result in state if needed'
            ],
            confidence: 90,
            risk: 'low'
        });
    }
    if (rootCause.cause.includes('Hydration')) {
        approaches.push({
            approach: 'Fix server/client mismatch',
            steps: [
                'Ensure server and client render the same HTML',
                'Avoid random values, timestamps, or client-only data during SSR',
                'Use suppressHydrationWarning if intentional mismatch',
                'Check for browser extensions injecting HTML'
            ],
            confidence: 80,
            risk: 'medium'
        });
    }
    if (rootCause.cause.includes('TypeScript')) {
        approaches.push({
            approach: 'Fix type definition',
            steps: [
                'Add property to type/interface definition',
                'Or use type assertion if you know type is correct',
                'Or check if property name is spelled correctly'
            ],
            confidence: 95,
            risk: 'low'
        });
    }
    if (rootCause.cause.includes('Module not found')) {
        approaches.push({
            approach: 'Install missing dependency',
            steps: [
                'Check import path is correct',
                'If external package: Run `pnpm add [package-name]`',
                'If local file: Check file exists and path is correct',
                'Restart dev server after installing'
            ],
            confidence: 95,
            risk: 'low'
        });
    }
    if (rootCause.cause.includes('Tailwind')) {
        approaches.push({
            approach: 'Define CSS variable',
            steps: [
                'Check if using custom color (e.g., "border-border")',
                'Add to globals.css: `--border: ...`',
                'Add to tailwind.config.ts: extend theme with CSS variables',
                'See: agents/patterns/tailwind-css-variables.md'
            ],
            confidence: 90,
            risk: 'low'
        });
    }
    if (approaches.length === 0) {
        // Generic approach
        approaches.push({
            approach: 'Investigate affected files',
            steps: affectedFiles.length > 0
                ? affectedFiles.map(f => `Check file: ${f}`)
                : ['Review stack trace for file locations', 'Add console.log to trace execution'],
            confidence: 50,
            risk: 'medium'
        });
    }
    return approaches;
}
async function logError(cwd, error, stackTrace, diagnosis) {
    const errorLogPath = path.join(cwd, '.codebakers', 'ERROR-LOG.md');
    const entry = `\n## Error: ${error.split('\n')[0].slice(0, 100)}\n\n`;
    const details = `**Date:** ${new Date().toISOString()}\n`;
    const cause = `**Root Cause:** ${diagnosis.root_cause}\n`;
    const fixes = `**Fix Approaches:** ${diagnosis.fix_approaches.length}\n`;
    const fullEntry = entry + details + cause + fixes + '\n---\n';
    try {
        const existing = await fs.readFile(errorLogPath, 'utf-8');
        await fs.writeFile(errorLogPath, existing + fullEntry, 'utf-8');
    }
    catch {
        // ERROR-LOG.md doesn't exist
        await fs.mkdir(path.dirname(errorLogPath), { recursive: true });
        await fs.writeFile(errorLogPath, `# Error Log\n\n${fullEntry}`, 'utf-8');
    }
}
function generateDiagnosisReport(diagnosis, error) {
    let report = `🍞 CodeBakers: Error Diagnosis\n\n`;
    report += `**Error:** ${error.split('\n')[0]}\n\n`;
    report += `## Root Cause\n\n`;
    report += `${diagnosis.root_cause}\n\n`;
    report += `**Confidence:** ${diagnosis.confidence === 'high' ? '✅ High' : diagnosis.confidence === 'medium' ? '⚠️ Medium' : '❓ Low'}\n\n`;
    if (diagnosis.affected_files.length > 0) {
        report += `## Affected Files\n\n`;
        for (const file of diagnosis.affected_files) {
            report += `- ${file}\n`;
        }
        report += `\n`;
    }
    if (diagnosis.related_errors.length > 0) {
        report += `## Related Past Errors\n\n`;
        for (const related of diagnosis.related_errors) {
            report += `- ${related}\n`;
        }
        report += `\nCheck .codebakers/ERROR-LOG.md for solutions.\n\n`;
    }
    report += `## Fix Approaches (${diagnosis.fix_approaches.length})\n\n`;
    for (let i = 0; i < diagnosis.fix_approaches.length; i++) {
        const approach = diagnosis.fix_approaches[i];
        report += `### Approach ${i + 1}: ${approach.approach}\n\n`;
        report += `**Confidence:** ${approach.confidence}%\n`;
        report += `**Risk:** ${approach.risk}\n\n`;
        report += `**Steps:**\n`;
        for (const step of approach.steps) {
            report += `${i + 1}. ${step}\n`;
        }
        report += `\n`;
    }
    report += `**Logged to:** .codebakers/ERROR-LOG.md\n`;
    return report;
}
//# sourceMappingURL=diagnose-error.js.map