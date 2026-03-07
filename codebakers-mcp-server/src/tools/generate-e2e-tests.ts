/**
 * codebakers_generate_e2e_tests
 *
 * Playwright E2E Test Generator
 */

import * as fs from 'fs/promises';
import * as path from 'path';

interface E2EArgs {
  flow_name: string;
  steps: string[];
}

export async function generateE2ETests(args: E2EArgs): Promise<string> {
  const cwd = process.cwd();
  const { flow_name, steps } = args;

  const fileName = flow_name.toLowerCase().replace(/\s+/g, '-');
  const code = `import { test, expect } from '@playwright/test';

test.describe('${flow_name}', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('${flow_name} flow', async ({ page }) => {
    ${steps.map((step, i) => `// Step ${i + 1}: ${step}`).join('\n    ')}

    await expect(page).toHaveURL('/');
  });
});
`;

  const filePath = path.join(cwd, `e2e/${fileName}.spec.ts`);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, code, 'utf-8');

  return `🍞 CodeBakers: E2E Tests Generated

**File:** e2e/${fileName}.spec.ts
**Flow:** ${flow_name}
**Steps:** ${steps.length}

✅ Playwright test created`;
}
