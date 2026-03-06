#!/usr/bin/env ts-node
/**
 * CodeBakers Protocol Verification Script
 *
 * Runs automated checks to ensure CodeBakers protocol compliance.
 * Used in:
 * - Pre-commit git hooks
 * - Pre-build verification
 * - Manual @verify command
 *
 * Exit codes:
 * 0 = All checks passed (or warnings only)
 * 1 = Critical violations detected (blocks commit/build)
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

interface CheckResult {
  name: string;
  status: 'pass' | 'warn' | 'fail';
  message: string;
  severity: 'critical' | 'warning' | 'info';
  fix?: string; // Suggested fix command or instructions
}

const results: CheckResult[] = [];

// Utility: Run shell command and return output
function runCommand(cmd: string): string {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
  } catch (error: any) {
    return error.stdout || error.stderr || '';
  }
}

// Utility: Check if file exists
function fileExists(filePath: string): boolean {
  return fs.existsSync(filePath);
}

// Utility: Get file age in days
function getFileAgeDays(filePath: string): number {
  if (!fileExists(filePath)) return Infinity;
  const stats = fs.statSync(filePath);
  const ageMs = Date.now() - stats.mtimeMs;
  return ageMs / (1000 * 60 * 60 * 24);
}

// Utility: Read file content
function readFile(filePath: string): string {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch {
    return '';
  }
}

// ============================================================================
// CHECK 1: Git Repository Exists
// ============================================================================
function checkGitRepository(): void {
  const gitDir = runCommand('git rev-parse --git-dir 2>&1');

  if (gitDir.includes('not a git repository')) {
    results.push({
      name: 'Git Repository',
      status: 'fail',
      message: 'Not a git repository',
      severity: 'critical',
      fix: 'Run: git init',
    });
  } else {
    results.push({
      name: 'Git Repository',
      status: 'pass',
      message: 'Git repository initialized',
      severity: 'info',
    });
  }
}

// ============================================================================
// CHECK 2: .codebakers/ Directory Exists
// ============================================================================
function checkCodebakersDirectory(): void {
  if (!fileExists('.codebakers')) {
    results.push({
      name: '.codebakers/ Directory',
      status: 'fail',
      message: 'Missing .codebakers/ directory',
      severity: 'critical',
      fix: 'Run: mkdir .codebakers && @interview to initialize',
    });
  } else {
    results.push({
      name: '.codebakers/ Directory',
      status: 'pass',
      message: '.codebakers/ directory present',
      severity: 'info',
    });
  }
}

// ============================================================================
// CHECK 3: BRAIN.md Exists and Recent
// ============================================================================
function checkBrainFile(): void {
  const brainPath = '.codebakers/BRAIN.md';

  if (!fileExists(brainPath)) {
    results.push({
      name: 'BRAIN.md',
      status: 'fail',
      message: 'Missing BRAIN.md (project state file)',
      severity: 'critical',
      fix: 'Run: @interview to create BRAIN.md',
    });
    return;
  }

  const ageDays = getFileAgeDays(brainPath);

  if (ageDays > 7) {
    results.push({
      name: 'BRAIN.md',
      status: 'warn',
      message: `BRAIN.md is ${Math.floor(ageDays)} days old (stale)`,
      severity: 'warning',
      fix: 'Update BRAIN.md with current project state',
    });
  } else {
    results.push({
      name: 'BRAIN.md',
      status: 'pass',
      message: `BRAIN.md present (updated ${Math.floor(ageDays)} days ago)`,
      severity: 'info',
    });
  }
}

// ============================================================================
// CHECK 4: DEPENDENCY-MAP.md Exists and Recent
// ============================================================================
function checkDependencyMap(): void {
  const depMapPath = '.codebakers/DEPENDENCY-MAP.md';

  if (!fileExists(depMapPath)) {
    results.push({
      name: 'DEPENDENCY-MAP.md',
      status: 'warn',
      message: 'Missing DEPENDENCY-MAP.md (dependency tracking)',
      severity: 'warning',
      fix: 'Run: pnpm dep:map to generate',
    });
    return;
  }

  const ageDays = getFileAgeDays(depMapPath);

  if (ageDays > 3) {
    results.push({
      name: 'DEPENDENCY-MAP.md',
      status: 'warn',
      message: `DEPENDENCY-MAP.md is ${Math.floor(ageDays)} days old (regenerate recommended)`,
      severity: 'warning',
      fix: 'Run: pnpm dep:map',
    });
  } else {
    results.push({
      name: 'DEPENDENCY-MAP.md',
      status: 'pass',
      message: `DEPENDENCY-MAP.md recent (${Math.floor(ageDays)} days old)`,
      severity: 'info',
    });
  }
}

// ============================================================================
// CHECK 5: BUILD-LOG.md Exists
// ============================================================================
function checkBuildLog(): void {
  const buildLogPath = '.codebakers/BUILD-LOG.md';

  if (!fileExists(buildLogPath)) {
    results.push({
      name: 'BUILD-LOG.md',
      status: 'warn',
      message: 'Missing BUILD-LOG.md (build history)',
      severity: 'warning',
      fix: 'Create: .codebakers/BUILD-LOG.md',
    });
  } else {
    results.push({
      name: 'BUILD-LOG.md',
      status: 'pass',
      message: 'BUILD-LOG.md present',
      severity: 'info',
    });
  }
}

// ============================================================================
// CHECK 6: ERROR-LOG.md Exists (or empty project)
// ============================================================================
function checkErrorLog(): void {
  const errorLogPath = '.codebakers/ERROR-LOG.md';
  const hasGitHistory = runCommand('git log --oneline 2>&1');

  // If project has git history but no ERROR-LOG.md, that's a warning
  if (!fileExists(errorLogPath) && !hasGitHistory.includes('does not have any commits')) {
    results.push({
      name: 'ERROR-LOG.md',
      status: 'warn',
      message: 'Missing ERROR-LOG.md (error learning)',
      severity: 'warning',
      fix: 'Create: .codebakers/ERROR-LOG.md',
    });
  } else {
    results.push({
      name: 'ERROR-LOG.md',
      status: 'pass',
      message: fileExists(errorLogPath) ? 'ERROR-LOG.md present' : 'ERROR-LOG.md not needed (new project)',
      severity: 'info',
    });
  }
}

// ============================================================================
// CHECK 7: FIX-QUEUE.md Exists
// ============================================================================
function checkFixQueue(): void {
  const fixQueuePath = '.codebakers/FIX-QUEUE.md';

  if (!fileExists(fixQueuePath)) {
    results.push({
      name: 'FIX-QUEUE.md',
      status: 'warn',
      message: 'Missing FIX-QUEUE.md (task queue)',
      severity: 'warning',
      fix: 'Create: .codebakers/FIX-QUEUE.md',
    });
  } else {
    results.push({
      name: 'FIX-QUEUE.md',
      status: 'pass',
      message: 'FIX-QUEUE.md present',
      severity: 'info',
    });
  }
}

// ============================================================================
// CHECK 8: TypeScript Compiles (if TypeScript project)
// ============================================================================
function checkTypeScript(): void {
  // Check if this is a TypeScript project
  if (!fileExists('tsconfig.json') && !fileExists('package.json')) {
    results.push({
      name: 'TypeScript',
      status: 'pass',
      message: 'Not a TypeScript project (skipped)',
      severity: 'info',
    });
    return;
  }

  const packageJson = readFile('package.json');
  if (!packageJson.includes('typescript')) {
    results.push({
      name: 'TypeScript',
      status: 'pass',
      message: 'TypeScript not installed (skipped)',
      severity: 'info',
    });
    return;
  }

  // Run tsc --noEmit
  const tscOutput = runCommand('npx tsc --noEmit 2>&1');

  if (tscOutput.includes('error TS')) {
    const errorCount = (tscOutput.match(/error TS/g) || []).length;
    results.push({
      name: 'TypeScript',
      status: 'fail',
      message: `${errorCount} TypeScript errors detected`,
      severity: 'critical',
      fix: 'Fix TypeScript errors before committing',
    });
  } else {
    results.push({
      name: 'TypeScript',
      status: 'pass',
      message: 'TypeScript compiles without errors',
      severity: 'info',
    });
  }
}

// ============================================================================
// CHECK 9: Recent Commits Follow Atomic Pattern
// ============================================================================
function checkAtomicCommits(): void {
  const recentCommits = runCommand('git log --oneline -10 2>&1');

  if (recentCommits.includes('does not have any commits')) {
    results.push({
      name: 'Atomic Commits',
      status: 'pass',
      message: 'No commits yet (new project)',
      severity: 'info',
    });
    return;
  }

  const commits = recentCommits.split('\n').filter(Boolean);
  const atomicCommits = commits.filter(c => c.includes('feat(atomic):') || c.includes('wip('));

  if (commits.length > 5 && atomicCommits.length === 0) {
    results.push({
      name: 'Atomic Commits',
      status: 'warn',
      message: 'No atomic commit pattern detected in last 10 commits',
      severity: 'warning',
      fix: 'Use: feat(atomic): [feature] — gate passed [N/N checks]',
    });
  } else {
    results.push({
      name: 'Atomic Commits',
      status: 'pass',
      message: `${atomicCommits.length}/${commits.length} commits follow atomic pattern`,
      severity: 'info',
    });
  }
}

// ============================================================================
// CHECK 10: .codebakers/ Committed to Git
// ============================================================================
function checkCodebakersCommitted(): void {
  const gitStatus = runCommand('git status --porcelain .codebakers/ 2>&1');

  if (gitStatus.includes('not a git repository')) {
    // Already caught in CHECK 1
    return;
  }

  const uncommittedFiles = gitStatus.split('\n').filter(Boolean);

  if (uncommittedFiles.length > 0) {
    results.push({
      name: '.codebakers/ Committed',
      status: 'warn',
      message: `${uncommittedFiles.length} uncommitted changes in .codebakers/`,
      severity: 'warning',
      fix: 'Commit .codebakers/ files after each session',
    });
  } else {
    results.push({
      name: '.codebakers/ Committed',
      status: 'pass',
      message: '.codebakers/ files committed to git',
      severity: 'info',
    });
  }
}

// ============================================================================
// Run All Checks
// ============================================================================
function runAllChecks(): void {
  console.log(`${colors.cyan}🍞 CodeBakers: Protocol Verification${colors.reset}\n`);

  checkGitRepository();
  checkCodebakersDirectory();
  checkBrainFile();
  checkDependencyMap();
  checkBuildLog();
  checkErrorLog();
  checkFixQueue();
  checkTypeScript();
  checkAtomicCommits();
  checkCodebakersCommitted();
}

// ============================================================================
// Display Results
// ============================================================================
function displayResults(): void {
  const passed = results.filter(r => r.status === 'pass').length;
  const warnings = results.filter(r => r.status === 'warn').length;
  const failures = results.filter(r => r.status === 'fail').length;

  console.log('━'.repeat(60));

  // Show all results
  results.forEach(result => {
    let icon = '';
    let color = colors.reset;

    if (result.status === 'pass') {
      icon = '✓';
      color = colors.green;
    } else if (result.status === 'warn') {
      icon = '⚠';
      color = colors.yellow;
    } else {
      icon = '✗';
      color = colors.red;
    }

    console.log(`${color}${icon} ${result.name}${colors.reset}`);
    console.log(`  ${colors.gray}${result.message}${colors.reset}`);

    if (result.fix) {
      console.log(`  ${colors.blue}→ ${result.fix}${colors.reset}`);
    }
    console.log('');
  });

  console.log('━'.repeat(60));
  console.log(`\nResults: ${colors.green}${passed} passed${colors.reset}, ${colors.yellow}${warnings} warnings${colors.reset}, ${colors.red}${failures} failed${colors.reset}`);

  // Final verdict
  if (failures > 0) {
    console.log(`\n${colors.red}❌ VIOLATIONS DETECTED${colors.reset}`);
    console.log('Fix critical violations before committing or building.');
    process.exit(1);
  } else if (warnings > 0) {
    console.log(`\n${colors.yellow}⚠️  WARNINGS (non-blocking)${colors.reset}`);
    console.log('Protocol compliance could be improved.');
    process.exit(0);
  } else {
    console.log(`\n${colors.green}✅ EXCELLENT${colors.reset}`);
    console.log('All protocol checks passed.');
    process.exit(0);
  }
}

// ============================================================================
// Main
// ============================================================================
runAllChecks();
displayResults();
