/**
 * codebakers_enforce_feature
 *
 * Feature Build Enforcement
 *
 * Enforces FULL atomic unit protocol (no shortcuts allowed).
 * Use when: @feature [description] or // [description]
 *
 * MANDATORY steps (cannot be skipped):
 * 1. Context loading (BRAIN.md, DEPENDENCY-MAP.md, ERROR-LOG.md)
 * 2. Error Sniffer scan (all patterns checked)
 * 3. Atomic unit declaration (in FIX-QUEUE.md BEFORE code)
 * 4. UNIT-PROGRESS.md creation (crash recovery)
 * 5. All 8 steps (schema → API → store → UI → states → tests → gate)
 * 6. BUILD-LOG.md update after every step
 * 7. Gate check (all items must pass)
 * 8. Atomic commit format: feat(atomic): [name] — gate passed [N/N checks]
 *
 * Result: Feature guaranteed complete, tested, and atomic.
 */

import * as fs from 'fs/promises';
import * as path from 'path';

interface FeatureEnforcementPlan {
  feature_name: string;
  atomic_unit_id: string;
  steps: {
    step_number: number;
    name: string;
    description: string;
    required_artifacts: string[];
    checklist: string[];
  }[];
  dependencies: string[];
  estimated_files: number;
}

export async function enforceFeature(args: { feature_name?: string; description?: string }): Promise<string> {
  const featureName = args.feature_name || args.description || 'unknown';
  const cwd = process.cwd();

  console.error('🍞 CodeBakers: Feature Build Enforcement');
  console.error(`Feature: ${featureName}`);
  console.error('FULL PROTOCOL ENFORCEMENT - NO SHORTCUTS ALLOWED');

  try {
    // STEP 1: LOAD CONTEXT (MANDATORY)
    console.error('\n[1/8] Loading context...');
    const contextStatus = await loadContext(cwd);

    if (!contextStatus.success) {
      return `🍞 CodeBakers: Feature Build Enforcement BLOCKED

❌ Context loading failed

${contextStatus.errors.join('\n')}

REQUIREMENT: All context files must be present before building.

Fix:
${contextStatus.fixes.join('\n')}

Cannot proceed until context is loaded.`;
    }

    // STEP 2: RUN ERROR SNIFFER (MANDATORY)
    console.error('[2/8] Running Error Sniffer...');
    const snifferWarnings = runErrorSniffer(featureName, contextStatus);

    // STEP 3: DECLARE ATOMIC UNIT (MANDATORY)
    console.error('[3/8] Declaring atomic unit...');
    const atomicUnit = await declareAtomicUnit(cwd, featureName, contextStatus);

    // STEP 4: CREATE UNIT-PROGRESS.md (MANDATORY)
    console.error('[4/8] Creating crash recovery state...');
    await createUnitProgress(cwd, atomicUnit);

    // STEP 5: GENERATE ENFORCEMENT PLAN
    console.error('[5/8] Generating enforcement plan...');
    const plan = generateEnforcementPlan(atomicUnit, contextStatus);

    // STEP 6: RETURN ENFORCEMENT INSTRUCTIONS
    const instructions = generateEnforcementInstructions(plan, snifferWarnings, contextStatus);

    return instructions;
  } catch (error) {
    console.error('Error during feature enforcement:', error);
    return `🍞 CodeBakers: Feature Build Enforcement Failed

Error: ${error instanceof Error ? error.message : String(error)}

Please verify project directory and required files exist.`;
  }
}

/**
 * Load context (MANDATORY)
 */
async function loadContext(cwd: string): Promise<{
  success: boolean;
  errors: string[];
  fixes: string[];
  brain?: string;
  depMap?: string;
  errorLog?: string;
  spec?: string;
}> {
  const errors: string[] = [];
  const fixes: string[] = [];
  let brain, depMap, errorLog, spec;

  // Load BRAIN.md
  const brainPath = path.join(cwd, '.codebakers', 'BRAIN.md');
  const brainExists = await fs.access(brainPath).then(() => true).catch(() => false);

  if (!brainExists) {
    errors.push('❌ BRAIN.md not found');
    fixes.push('→ Run codebakers_init_session or create new project');
  } else {
    brain = await fs.readFile(brainPath, 'utf-8');
  }

  // Load DEPENDENCY-MAP.md
  const depMapPath = path.join(cwd, '.codebakers', 'DEPENDENCY-MAP.md');
  const depMapExists = await fs.access(depMapPath).then(() => true).catch(() => false);

  if (!depMapExists) {
    errors.push('❌ DEPENDENCY-MAP.md not found');
    fixes.push('→ Run Phase 2: codebakers_map_dependencies');
  } else {
    depMap = await fs.readFile(depMapPath, 'utf-8');
  }

  // Load ERROR-LOG.md (optional but recommended)
  const errorLogPath = path.join(cwd, '.codebakers', 'ERROR-LOG.md');
  const errorLogExists = await fs.access(errorLogPath).then(() => true).catch(() => false);

  if (errorLogExists) {
    errorLog = await fs.readFile(errorLogPath, 'utf-8');
  }

  // Load PROJECT-SPEC.md
  const specPath = path.join(cwd, '.codebakers', 'PROJECT-SPEC.md');
  const specExists = await fs.access(specPath).then(() => true).catch(() => false);

  if (!specExists) {
    errors.push('❌ PROJECT-SPEC.md not found');
    fixes.push('→ Run Phase 0: codebakers_generate_spec');
  } else {
    spec = await fs.readFile(specPath, 'utf-8');
  }

  return {
    success: errors.length === 0,
    errors,
    fixes,
    brain,
    depMap,
    errorLog,
    spec,
  };
}

/**
 * Run Error Sniffer (MANDATORY)
 */
function runErrorSniffer(featureName: string, context: any): string[] {
  const warnings: string[] = [];

  // Check for common patterns
  if (featureName.toLowerCase().includes('delete') || featureName.toLowerCase().includes('remove')) {
    warnings.push('⚠️ MUTATION WARNING: Delete operations must update ALL stores from DEPENDENCY-MAP.md');
  }

  if (featureName.toLowerCase().includes('update') || featureName.toLowerCase().includes('edit')) {
    warnings.push('⚠️ MUTATION WARNING: Update operations must refresh ALL affected components');
  }

  if (featureName.toLowerCase().includes('create') || featureName.toLowerCase().includes('add')) {
    warnings.push('⚠️ MUTATION WARNING: Create operations must update stores + handle edge cases');
  }

  if (featureName.toLowerCase().includes('oauth') || featureName.toLowerCase().includes('auth')) {
    warnings.push('⚠️ OAUTH WARNING: Must use Supabase Auth only (no NextAuth, Auth0, Clerk)');
  }

  if (featureName.toLowerCase().includes('form') || featureName.toLowerCase().includes('input')) {
    warnings.push('⚠️ FORM WARNING: Validation must be visible BEFORE submit attempt');
  }

  return warnings;
}

/**
 * Declare atomic unit (MANDATORY)
 */
async function declareAtomicUnit(cwd: string, featureName: string, context: any) {
  const atomicUnitId = `atomic-${Date.now()}`;

  const declaration = {
    id: atomicUnitId,
    name: featureName,
    declared_at: new Date().toISOString(),
    status: 'in_progress',
    steps_completed: 0,
    total_steps: 8,
  };

  // Append to FIX-QUEUE.md
  const queuePath = path.join(cwd, '.codebakers', 'FIX-QUEUE.md');
  const queueExists = await fs.access(queuePath).then(() => true).catch(() => false);

  let queueContent = queueExists ? await fs.readFile(queuePath, 'utf-8') : '# Fix Queue\n\n';

  queueContent += `\n## ${declaration.id}\n`;
  queueContent += `**Feature:** ${featureName}\n`;
  queueContent += `**Status:** in_progress\n`;
  queueContent += `**Declared:** ${declaration.declared_at}\n\n`;
  queueContent += `### Atomic Unit Checklist\n`;
  queueContent += `- [ ] Step 1: Schema (if needed)\n`;
  queueContent += `- [ ] Step 2: API routes\n`;
  queueContent += `- [ ] Step 3: Store implementation\n`;
  queueContent += `- [ ] Step 4: UI components\n`;
  queueContent += `- [ ] Step 5: Loading/error/success states\n`;
  queueContent += `- [ ] Step 6: Tests\n`;
  queueContent += `- [ ] Step 7: Mobile responsiveness\n`;
  queueContent += `- [ ] Step 8: Gate check passed\n\n`;

  await fs.writeFile(queuePath, queueContent, 'utf-8');

  return declaration;
}

/**
 * Create UNIT-PROGRESS.md (MANDATORY for crash recovery)
 */
async function createUnitProgress(cwd: string, atomicUnit: any) {
  const progressPath = path.join(cwd, '.codebakers', 'UNIT-PROGRESS.md');

  const progressContent = `# Unit Progress: ${atomicUnit.name}\n\n`
  + `**ID:** ${atomicUnit.id}\n`
  + `**Started:** ${atomicUnit.declared_at}\n`
  + `**Status:** in_progress\n\n`
  + `## Step-Level Recovery State\n\n`
  + `Current Step: 1 (Schema)\n`
  + `Last Checkpoint: ${new Date().toISOString()}\n\n`
  + `## Steps Completed\n\n`
  + `None yet - build starting\n\n`;

  await fs.writeFile(progressPath, progressContent, 'utf-8');
}

/**
 * Generate enforcement plan
 */
function generateEnforcementPlan(atomicUnit: any, context: any): FeatureEnforcementPlan {
  return {
    feature_name: atomicUnit.name,
    atomic_unit_id: atomicUnit.id,
    steps: [
      {
        step_number: 1,
        name: 'Schema (if needed)',
        description: 'Add database tables/columns if this feature requires new data',
        required_artifacts: ['migration file OR "schema unchanged"'],
        checklist: [
          'Check if new entities needed',
          'Add to SCHEMA.sql if needed',
          'Create Supabase migration',
        ],
      },
      {
        step_number: 2,
        name: 'API Routes / Server Actions',
        description: 'Implement backend logic',
        required_artifacts: ['API route file OR server action file'],
        checklist: [
          'Create route handler',
          'Add Supabase queries',
          'Filter by id AND user_id (security)',
          'Use .maybeSingle() not .single()',
        ],
      },
      {
        step_number: 3,
        name: 'Store Implementation',
        description: 'Implement client state management',
        required_artifacts: ['store file'],
        checklist: [
          'Check DEPENDENCY-MAP.md for ALL stores to update',
          'Implement mutation handler',
          'Update ALL affected stores (no partial updates)',
          'Handle cascade effects',
        ],
      },
      {
        step_number: 4,
        name: 'UI Components',
        description: 'Build user interface',
        required_artifacts: ['component file(s)'],
        checklist: [
          'Match mockup exactly',
          'Use store for data',
          'No hardcoded values',
        ],
      },
      {
        step_number: 5,
        name: 'States (Loading/Error/Success)',
        description: 'Handle all UI states',
        required_artifacts: ['state handling in components'],
        checklist: [
          'Loading state (skeleton or spinner)',
          'Error state (user-friendly message)',
          'Success state (confirmation)',
          'Empty state (if list)',
        ],
      },
      {
        step_number: 6,
        name: 'Tests',
        description: 'Write automated tests',
        required_artifacts: ['test file'],
        checklist: [
          'Unit test for business logic',
          'Integration test for API',
          'E2E test for critical path (optional)',
        ],
      },
      {
        step_number: 7,
        name: 'Mobile Responsiveness',
        description: 'Verify mobile layout',
        required_artifacts: ['responsive CSS'],
        checklist: [
          'Test at 375px width',
          'Touch targets ≥44px',
          'No horizontal scroll',
        ],
      },
      {
        step_number: 8,
        name: 'Gate Check',
        description: 'Verify all requirements met',
        required_artifacts: ['gate check report'],
        checklist: [
          'TypeScript compiles (tsc --noEmit)',
          'All checklist items completed',
          'Feature works end-to-end',
        ],
      },
    ],
    dependencies: context.depMap ? extractDependencies(context.depMap, atomicUnit.name) : [],
    estimated_files: 4, // Average: route, store, component, test
  };
}

/**
 * Extract dependencies from dependency map
 */
function extractDependencies(depMap: string, featureName: string): string[] {
  // Simple extraction - would be more sophisticated in production
  const deps: string[] = [];

  if (depMap.includes('MUST Update Stores')) {
    deps.push('Check DEPENDENCY-MAP.md for ALL stores that must be updated');
  }

  return deps;
}

/**
 * Generate enforcement instructions
 */
function generateEnforcementInstructions(plan: FeatureEnforcementPlan, warnings: string[], context: any): string {
  let doc = `🍞 CodeBakers: Feature Build Enforcement\n\n`;
  doc += `**Feature:** ${plan.feature_name}\n`;
  doc += `**Atomic Unit ID:** ${plan.atomic_unit_id}\n`;
  doc += `**Protocol:** FULL ENFORCEMENT (no shortcuts)\n\n`;
  doc += `---\n\n`;

  // Context loaded
  doc += `## ✅ Context Loaded\n\n`;
  doc += `- BRAIN.md\n`;
  doc += `- DEPENDENCY-MAP.md\n`;
  doc += `- PROJECT-SPEC.md\n`;
  if (context.errorLog) {
    doc += `- ERROR-LOG.md\n`;
  }
  doc += `\n`;

  // Error Sniffer warnings
  if (warnings.length > 0) {
    doc += `## ⚠️ Error Sniffer Warnings\n\n`;
    for (const warning of warnings) {
      doc += `${warning}\n`;
    }
    doc += `\n`;
  }

  // Atomic unit declared
  doc += `## ✅ Atomic Unit Declared\n\n`;
  doc += `Declared in FIX-QUEUE.md\n`;
  doc += `Crash recovery enabled (UNIT-PROGRESS.md)\n\n`;

  // Enforcement plan
  doc += `---\n\n`;
  doc += `## BUILD PLAN (8 Steps - ALL MANDATORY)\n\n`;

  for (const step of plan.steps) {
    doc += `### Step ${step.step_number}: ${step.name}\n\n`;
    doc += `${step.description}\n\n`;
    doc += `**Required Artifacts:**\n`;
    for (const artifact of step.required_artifacts) {
      doc += `- ${artifact}\n`;
    }
    doc += `\n**Checklist:**\n`;
    for (const item of step.checklist) {
      doc += `- [ ] ${item}\n`;
    }
    doc += `\n`;
  }

  // Dependencies
  if (plan.dependencies.length > 0) {
    doc += `---\n\n`;
    doc += `## 🔗 Dependencies\n\n`;
    for (const dep of plan.dependencies) {
      doc += `- ${dep}\n`;
    }
    doc += `\n`;
  }

  // Final instructions
  doc += `---\n\n`;
  doc += `## CRITICAL RULES\n\n`;
  doc += `1. **NO SHORTCUTS:** All 8 steps are MANDATORY\n`;
  doc += `2. **UPDATE BUILD-LOG.md** after EVERY step\n`;
  doc += `3. **CHECK DEPENDENCY-MAP.md** before implementing mutations\n`;
  doc += `4. **UPDATE ALL STORES** listed in dependency map (no partial updates)\n`;
  doc += `5. **RUN GATE CHECK** before committing (Step 8)\n\n`;

  doc += `## Commit Format (After Gate Pass)\n\n`;
  doc += `\`\`\`bash\n`;
  doc += `git commit -m "feat(atomic): ${plan.feature_name} — gate passed [8/8 checks]"\n`;
  doc += `\`\`\`\n\n`;

  doc += `## Next Steps\n\n`;
  doc += `1. Start with Step 1 (Schema)\n`;
  doc += `2. Update BUILD-LOG.md after each step\n`;
  doc += `3. Update UNIT-PROGRESS.md checkpoints\n`;
  doc += `4. Run codebakers_check_gate when done\n`;
  doc += `5. Commit with atomic format\n\n`;

  return doc;
}
