/**
 * codebakers_run_tests
 *
 * Test Orchestrator - Runs Vitest and Playwright tests
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface TestArgs {
  test_type: 'unit' | 'e2e' | 'all';
  mode?: 'fast' | 'full';
}

export async function runTests(args: TestArgs): Promise<string> {
  const { test_type, mode = 'full' } = args;

  console.error('🍞 CodeBakers: Running Tests');

  let results = '';

  try {
    if (test_type === 'unit' || test_type === 'all') {
      console.error('Running unit tests (Vitest)...');
      const { stdout } = await execAsync('vitest run', { cwd: process.cwd() });
      results += `## Unit Tests (Vitest)\n\n${stdout}\n\n`;
    }

    if (test_type === 'e2e' || test_type === 'all') {
      console.error('Running E2E tests (Playwright)...');
      const { stdout } = await execAsync('playwright test', { cwd: process.cwd() });
      results += `## E2E Tests (Playwright)\n\n${stdout}\n\n`;
    }

    return `🍞 CodeBakers: Test Results\n\n${results}\n✅ All tests passed`;
  } catch (error) {
    return `🍞 CodeBakers: Tests Failed\n\n${results}\n\n❌ Error: ${error instanceof Error ? error.message : String(error)}`;
  }
}
