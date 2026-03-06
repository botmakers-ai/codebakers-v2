#!/usr/bin/env ts-node
/**
 * CodeBakers Git Hooks Installer
 *
 * Installs pre-commit hook that runs protocol verification before every commit.
 * This ensures CodeBakers protocol compliance is technically enforced, not just instructed.
 *
 * Usage:
 *   ts-node scripts/install-git-hooks.ts
 *
 * Installs:
 *   .git/hooks/pre-commit → runs scripts/codebakers-verify.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

function log(message: string, color: string = colors.reset): void {
  console.log(`${color}${message}${colors.reset}`);
}

function checkGitRepository(): boolean {
  try {
    execSync('git rev-parse --git-dir', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function getGitHooksPath(): string {
  try {
    const gitDir = execSync('git rev-parse --git-dir', { encoding: 'utf8' }).trim();
    return path.join(gitDir, 'hooks');
  } catch {
    return '.git/hooks';
  }
}

function installPreCommitHook(): void {
  const hooksPath = getGitHooksPath();
  const preCommitPath = path.join(hooksPath, 'pre-commit');

  // Ensure hooks directory exists
  if (!fs.existsSync(hooksPath)) {
    fs.mkdirSync(hooksPath, { recursive: true });
  }

  // Check if pre-commit hook already exists
  if (fs.existsSync(preCommitPath)) {
    const existingHook = fs.readFileSync(preCommitPath, 'utf-8');

    if (existingHook.includes('codebakers-verify')) {
      log('✓ CodeBakers pre-commit hook already installed', colors.green);
      return;
    }

    // Backup existing hook
    const backupPath = `${preCommitPath}.backup-${Date.now()}`;
    fs.writeFileSync(backupPath, existingHook);
    log(`⚠ Existing pre-commit hook backed up to: ${path.basename(backupPath)}`, colors.yellow);
  }

  // Determine platform-specific script
  const isWindows = process.platform === 'win32';

  let hookContent: string;

  if (isWindows) {
    // Windows: PowerShell script
    hookContent = `#!/bin/sh
# CodeBakers Pre-Commit Hook (Windows)
# Auto-installed by scripts/install-git-hooks.ts

echo "🍞 CodeBakers: Running protocol verification..."

# Run verification script
npx ts-node scripts/codebakers-verify.ts

# Exit with verification script's exit code
exit $?
`;
  } else {
    // Unix/Mac: Bash script
    hookContent = `#!/bin/bash
# CodeBakers Pre-Commit Hook (Unix/Mac)
# Auto-installed by scripts/install-git-hooks.ts

echo "🍞 CodeBakers: Running protocol verification..."

# Run verification script
npx ts-node scripts/codebakers-verify.ts

# Exit with verification script's exit code
exit $?
`;
  }

  // Write hook file
  fs.writeFileSync(preCommitPath, hookContent);

  // Make executable (Unix/Mac only)
  if (!isWindows) {
    try {
      fs.chmodSync(preCommitPath, '755');
    } catch (error) {
      log(`⚠ Could not make hook executable: ${error}`, colors.yellow);
    }
  }

  log('✓ Pre-commit hook installed successfully', colors.green);
}

function installPrePushHook(): void {
  const hooksPath = getGitHooksPath();
  const prePushPath = path.join(hooksPath, 'pre-push');

  // Ensure hooks directory exists
  if (!fs.existsSync(hooksPath)) {
    fs.mkdirSync(hooksPath, { recursive: true });
  }

  // Check if pre-push hook already exists
  if (fs.existsSync(prePushPath)) {
    const existingHook = fs.readFileSync(prePushPath, 'utf-8');

    if (existingHook.includes('codebakers')) {
      log('✓ CodeBakers pre-push hook already installed', colors.green);
      return;
    }
  }

  const isWindows = process.platform === 'win32';

  let hookContent: string;

  if (isWindows) {
    hookContent = `#!/bin/sh
# CodeBakers Pre-Push Hook (Windows)
# Auto-installed by scripts/install-git-hooks.ts

echo "🍞 CodeBakers: Verifying .codebakers/ is committed..."

# Check if .codebakers/ has uncommitted changes
if [ -n "$(git status --porcelain .codebakers/)" ]; then
  echo "❌ Error: .codebakers/ has uncommitted changes"
  echo "Commit .codebakers/ files before pushing"
  exit 1
fi

echo "✓ .codebakers/ is committed"
exit 0
`;
  } else {
    hookContent = `#!/bin/bash
# CodeBakers Pre-Push Hook (Unix/Mac)
# Auto-installed by scripts/install-git-hooks.ts

echo "🍞 CodeBakers: Verifying .codebakers/ is committed..."

# Check if .codebakers/ has uncommitted changes
if [ -n "$(git status --porcelain .codebakers/)" ]; then
  echo "❌ Error: .codebakers/ has uncommitted changes"
  echo "Commit .codebakers/ files before pushing"
  exit 1
fi

echo "✓ .codebakers/ is committed"
exit 0
`;
  }

  // Write hook file
  fs.writeFileSync(prePushPath, hookContent);

  // Make executable (Unix/Mac only)
  if (!isWindows) {
    try {
      fs.chmodSync(prePushPath, '755');
    } catch (error) {
      log(`⚠ Could not make hook executable: ${error}`, colors.yellow);
    }
  }

  log('✓ Pre-push hook installed successfully', colors.green);
}

function testHook(): void {
  log('\n🧪 Testing pre-commit hook...', colors.cyan);

  try {
    execSync('npx ts-node scripts/codebakers-verify.ts', { stdio: 'inherit' });
    log('\n✓ Hook test passed', colors.green);
  } catch (error) {
    log('\n⚠ Hook test found violations (this is OK if project is new)', colors.yellow);
  }
}

function displayInstructions(): void {
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', colors.gray);
  log('📋 Git Hooks Installed', colors.cyan);
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', colors.gray);

  log('\n✓ pre-commit hook → runs protocol verification before every commit');
  log('✓ pre-push hook → ensures .codebakers/ is committed before push');

  log('\n📌 What This Means:', colors.cyan);
  log('  • Cannot commit if TypeScript has errors');
  log('  • Cannot commit if .codebakers/ files are missing');
  log('  • Cannot push if .codebakers/ changes are uncommitted');

  log('\n🔧 To Bypass (Emergency Only):', colors.yellow);
  log('  git commit --no-verify -m "message"');
  log('  (Not recommended - violates CodeBakers protocol)');

  log('\n🗑  To Uninstall:', colors.gray);
  log('  rm .git/hooks/pre-commit');
  log('  rm .git/hooks/pre-push');

  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', colors.gray);
}

// ============================================================================
// Main
// ============================================================================
function main(): void {
  log('🍞 CodeBakers: Installing Git Hooks\n', colors.cyan);

  // Check if git repository
  if (!checkGitRepository()) {
    log('❌ Not a git repository', colors.red);
    log('Run: git init', colors.gray);
    process.exit(1);
  }

  // Install hooks
  installPreCommitHook();
  installPrePushHook();

  // Test hook
  testHook();

  // Show instructions
  displayInstructions();
}

main();
