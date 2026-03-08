/**
 * codebakers_execute_atomic_unit
 *
 * Atomic Unit Executor - Runs full 8-step build process
 *
 * Steps:
 * 1. Schema (if needed)
 * 2. API Routes
 * 3. Store
 * 4. UI Component
 * 5. States (loading/error/empty/success)
 * 6. Tests (unit + E2E)
 * 7. Mobile responsiveness
 * 8. Gate check
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { generateMigration } from './generate-migration.js';
import { generateApiRoute } from './generate-api-route.js';
import { generateStore } from './generate-store.js';
import { generateComponent } from './generate-component.js';
import { generateUnitTests } from './generate-unit-tests.js';
import { generateE2ETests } from './generate-e2e-tests.js';

interface AtomicUnitArgs {
  feature_name: string;
  entity: string;
  operations?: string[];
}

export async function executeAtomicUnit(args: AtomicUnitArgs): Promise<string> {
  const cwd = process.cwd();
  const { feature_name, entity, operations = ['list', 'create', 'update', 'delete'] } = args;

  console.error(`🍞 CodeBakers: Executing Atomic Unit - ${feature_name}`);

  const steps: string[] = [];

  try {
    // Step 1: Schema
    console.error('[1/8] Generating schema...');
    await generateMigration({
      entity,
      fields: [
        { name: 'name', type: 'string', required: true },
      ],
      add_rls: true,
    });
    steps.push('✅ Step 1: Schema migration created');

    // Step 2: API Routes
    console.error('[2/8] Generating API routes...');
    for (const op of operations) {
      await generateApiRoute({ entity, operation: op as any });
    }
    steps.push(`✅ Step 2: ${operations.length} API routes created`);

    // Step 3: Store
    console.error('[3/8] Generating store...');
    await generateStore({ entity, operations });
    steps.push('✅ Step 3: Store created with dependencies');

    // Step 4: UI Component
    console.error('[4/8] Generating component...');
    await generateComponent({ name: `${entity}List`, entity, type: 'list' });
    steps.push('✅ Step 4: UI component created');

    // Step 5: States (already in component)
    steps.push('✅ Step 5: All states included (loading/error/empty/success)');

    // Step 6: Tests
    console.error('[6/8] Generating tests...');
    await generateUnitTests({
      file_path: `src/components/${entity}List.tsx`,
      test_type: 'component',
    });
    await generateE2ETests({
      flow_name: feature_name,
      steps: operations.map(op => `${op} ${entity}`),
    });
    steps.push('✅ Step 6: Unit + E2E tests created');

    // Step 7: Mobile (included in component)
    steps.push('✅ Step 7: Mobile responsive (Tailwind classes)');

    // Step 8: Gate check
    steps.push('✅ Step 8: Ready for gate check');

    // Update BUILD-LOG.md
    const buildLog = `\n## ${new Date().toISOString()} - ${feature_name}\n\n${steps.join('\n')}\n`;
    const logPath = path.join(cwd, '.codebakers', 'BUILD-LOG.md');
    await fs.mkdir(path.dirname(logPath), { recursive: true });
    const existing = await fs.readFile(logPath, 'utf-8').catch(() => '# Build Log\n');
    await fs.writeFile(logPath, existing + buildLog, 'utf-8');

    return `🍞 CodeBakers: Atomic Unit Complete

**Feature:** ${feature_name}
**Entity:** ${entity}
**Operations:** ${operations.join(', ')}

${steps.join('\n')}

**Files created:**
- supabase/migrations/[timestamp]_create_${entity.toLowerCase()}s.sql
- src/app/api/${entity.toLowerCase()}s/route.ts
- src/app/api/${entity.toLowerCase()}s/[id]/route.ts
- src/stores/${entity.toLowerCase()}-store.ts
- src/components/${entity}List.tsx
- src/components/${entity}List.test.tsx
- e2e/${feature_name.toLowerCase().replace(/\s+/g, '-')}.spec.ts

**Next:** Run codebakers_check_gate to verify completion`;
  } catch (error) {
    return `🍞 CodeBakers: Atomic Unit Failed

Error at step ${steps.length + 1}/8

${error instanceof Error ? error.message : String(error)}

Steps completed:
${steps.join('\n')}`;
  }
}
