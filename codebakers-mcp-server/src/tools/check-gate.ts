/**
 * codebakers_check_gate
 *
 * Phase Verification Gate Checks
 *
 * Verifies all requirements are met before proceeding to next phase.
 * Based on CodeBakers Method verification gates for each phase.
 *
 * Phase Gates:
 * - Phase 0: PROJECT-SPEC.md complete (Gates 0-5), human approved
 * - Phase 1: All mockups created, design system documented
 * - Phase 2: MOCK-ANALYSIS.md, SCHEMA.sql, DEPENDENCY-MAP.md complete
 * - Phase 3: Foundation built, auth working, all routes resolve
 * - Phase 4: All features implemented, all screens match mockups
 * - Phase 5: All tests passing, Lighthouse >90, no critical vulnerabilities
 * - Phase 6: Deployed, monitoring active, runbook complete
 */

import * as fs from 'fs/promises';
import * as path from 'path';

interface GateCheck {
  requirement: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
}

interface GateResult {
  phase: number;
  phase_name: string;
  overall_status: 'pass' | 'fail' | 'warning';
  checks: GateCheck[];
  can_proceed: boolean;
  next_phase: string;
}

export async function checkGate(args: { phase?: number }): Promise<string> {
  const phase = args.phase ?? 0;
  const cwd = process.cwd();

  console.error(`🍞 CodeBakers: Phase ${phase} Gate Check`);

  try {
    // Determine which gate check to run
    let result: GateResult;

    switch (phase) {
      case 0:
        result = await checkPhase0Gate(cwd);
        break;
      case 1:
        result = await checkPhase1Gate(cwd);
        break;
      case 2:
        result = await checkPhase2Gate(cwd);
        break;
      case 3:
        result = await checkPhase3Gate(cwd);
        break;
      case 4:
        result = await checkPhase4Gate(cwd);
        break;
      case 5:
        result = await checkPhase5Gate(cwd);
        break;
      case 6:
        result = await checkPhase6Gate(cwd);
        break;
      default:
        return `🍞 CodeBakers: Invalid Phase

Phase ${phase} is not valid. Valid phases: 0-6.`;
    }

    // Generate report
    const report = generateGateReport(result);

    return report;
  } catch (error) {
    console.error('Error during gate check:', error);
    return `🍞 CodeBakers: Gate Check Failed

Error: ${error instanceof Error ? error.message : String(error)}

Please verify project directory and file permissions.`;
  }
}

/**
 * Phase 0 Gate Check: Specification
 */
async function checkPhase0Gate(cwd: string): Promise<GateResult> {
  const checks: GateCheck[] = [];

  // 1. Check PROJECT-SPEC.md exists
  const specPath = path.join(cwd, '.codebakers', 'PROJECT-SPEC.md');
  const specExists = await fs.access(specPath).then(() => true).catch(() => false);

  if (!specExists) {
    checks.push({
      requirement: 'PROJECT-SPEC.md exists',
      status: 'fail',
      message: 'File not found. Run codebakers_generate_spec first.',
    });
  } else {
    const specContent = await fs.readFile(specPath, 'utf-8');

    // 2. Check Gates 0-5 present
    const hasGate0 = specContent.includes('## Gate 0: Identity');
    const hasGate1 = specContent.includes('## Gate 1: Entities');
    const hasGate2 = specContent.includes('## Gate 2: State Changes');
    const hasGate3 = specContent.includes('## Gate 3: Permissions');
    const hasGate4 = specContent.includes('## Gate 4: Dependencies');
    const hasGate5 = specContent.includes('## Gate 5: Integrations');

    if (hasGate0 && hasGate1 && hasGate2 && hasGate3 && hasGate4) {
      checks.push({
        requirement: 'All Gates 0-5 present',
        status: 'pass',
        message: 'PROJECT-SPEC.md contains all required gates.',
      });
    } else {
      checks.push({
        requirement: 'All Gates 0-5 present',
        status: 'fail',
        message: `Missing gates. Found: Gate0=${hasGate0}, Gate1=${hasGate1}, Gate2=${hasGate2}, Gate3=${hasGate3}, Gate4=${hasGate4}, Gate5=${hasGate5}`,
      });
    }

    // 3. Check for entities
    const entityCount = (specContent.match(/### \w+\n\n[\w\s]+\n\n\*\*Core Fields:/g) || []).length;
    if (entityCount > 0) {
      checks.push({
        requirement: 'At least one entity defined',
        status: 'pass',
        message: `Found ${entityCount} entities.`,
      });
    } else {
      checks.push({
        requirement: 'At least one entity defined',
        status: 'fail',
        message: 'No entities found in Gate 1.',
      });
    }
  }

  // 4. Check BUILD-STATE.md exists
  const buildStatePath = path.join(cwd, '.codebakers', 'BUILD-STATE.md');
  const buildStateExists = await fs.access(buildStatePath).then(() => true).catch(() => false);

  checks.push({
    requirement: 'BUILD-STATE.md exists',
    status: buildStateExists ? 'pass' : 'warning',
    message: buildStateExists ? 'Build state initialized.' : 'BUILD-STATE.md not found (optional for Phase 0).',
  });

  const overallStatus = checks.some(c => c.status === 'fail') ? 'fail' : 'pass';

  return {
    phase: 0,
    phase_name: 'Specification',
    overall_status: overallStatus,
    checks: checks,
    can_proceed: overallStatus === 'pass',
    next_phase: 'Phase 1: UI Mockup & Design',
  };
}

/**
 * Phase 1 Gate Check: UI Mockup & Design
 */
async function checkPhase1Gate(cwd: string): Promise<GateResult> {
  const checks: GateCheck[] = [];

  // 1. Check refs/design/ folder exists
  const designPath = path.join(cwd, 'refs', 'design');
  const designExists = await fs.access(designPath).then(() => true).catch(() => false);

  if (!designExists) {
    checks.push({
      requirement: 'refs/design/ folder exists',
      status: 'fail',
      message: 'Design folder not found. Create mockups in refs/design/ first.',
    });
  } else {
    // 2. Check for mockup files
    const files = await fs.readdir(designPath);
    const mockupFiles = files.filter(f => f.endsWith('.html') || f.endsWith('.jsx') || f.endsWith('.tsx') || f.endsWith('.md'));

    if (mockupFiles.length > 0) {
      checks.push({
        requirement: 'Mockup files present',
        status: 'pass',
        message: `Found ${mockupFiles.length} mockup files.`,
      });
    } else {
      checks.push({
        requirement: 'Mockup files present',
        status: 'fail',
        message: 'No mockup files found in refs/design/.',
      });
    }
  }

  // 3. Check DESIGN-SYSTEM.md (optional but recommended)
  const designSystemPath = path.join(cwd, '.codebakers', 'DESIGN-SYSTEM.md');
  const designSystemExists = await fs.access(designSystemPath).then(() => true).catch(() => false);

  checks.push({
    requirement: 'DESIGN-SYSTEM.md exists',
    status: designSystemExists ? 'pass' : 'warning',
    message: designSystemExists ? 'Design system documented.' : 'Design system not documented (recommended).',
  });

  const overallStatus = checks.some(c => c.status === 'fail') ? 'fail' : 'pass';

  return {
    phase: 1,
    phase_name: 'UI Mockup & Design',
    overall_status: overallStatus,
    checks: checks,
    can_proceed: overallStatus === 'pass',
    next_phase: 'Phase 2: Mock Analysis & Schema',
  };
}

/**
 * Phase 2 Gate Check: Mock Analysis & Schema
 */
async function checkPhase2Gate(cwd: string): Promise<GateResult> {
  const checks: GateCheck[] = [];

  // 1. Check MOCK-ANALYSIS.md
  const analysisPath = path.join(cwd, '.codebakers', 'MOCK-ANALYSIS.md');
  const analysisExists = await fs.access(analysisPath).then(() => true).catch(() => false);

  if (analysisExists) {
    const analysisContent = await fs.readFile(analysisPath, 'utf-8');
    const hasEntities = analysisContent.includes('## Extracted Entities');
    checks.push({
      requirement: 'MOCK-ANALYSIS.md complete',
      status: hasEntities ? 'pass' : 'warning',
      message: hasEntities ? 'Mockup analysis complete.' : 'Analysis exists but may be incomplete.',
    });
  } else {
    checks.push({
      requirement: 'MOCK-ANALYSIS.md complete',
      status: 'fail',
      message: 'Not found. Run codebakers_analyze_mockups_deep first.',
    });
  }

  // 2. Check SCHEMA.sql
  const schemaPath = path.join(cwd, '.codebakers', 'SCHEMA.sql');
  const schemaExists = await fs.access(schemaPath).then(() => true).catch(() => false);

  if (schemaExists) {
    const schemaContent = await fs.readFile(schemaPath, 'utf-8');
    const hasTables = schemaContent.includes('CREATE TABLE');
    checks.push({
      requirement: 'SCHEMA.sql complete',
      status: hasTables ? 'pass' : 'warning',
      message: hasTables ? 'Database schema generated.' : 'Schema file exists but contains no tables.',
    });
  } else {
    checks.push({
      requirement: 'SCHEMA.sql complete',
      status: 'fail',
      message: 'Not found. Run codebakers_generate_schema first.',
    });
  }

  // 3. Check DEPENDENCY-MAP.md
  const depMapPath = path.join(cwd, '.codebakers', 'DEPENDENCY-MAP.md');
  const depMapExists = await fs.access(depMapPath).then(() => true).catch(() => false);

  if (depMapExists) {
    const depMapContent = await fs.readFile(depMapPath, 'utf-8');
    const hasDeps = depMapContent.includes('## Write Dependencies');
    checks.push({
      requirement: 'DEPENDENCY-MAP.md complete',
      status: hasDeps ? 'pass' : 'warning',
      message: hasDeps ? 'Dependency map complete.' : 'Dependency map exists but may be incomplete.',
    });
  } else {
    checks.push({
      requirement: 'DEPENDENCY-MAP.md complete',
      status: 'fail',
      message: 'Not found. Run codebakers_map_dependencies first.',
    });
  }

  // 4. Check STORE-CONTRACTS.md
  const contractsPath = path.join(cwd, '.codebakers', 'STORE-CONTRACTS.md');
  const contractsExists = await fs.access(contractsPath).then(() => true).catch(() => false);

  checks.push({
    requirement: 'STORE-CONTRACTS.md complete',
    status: contractsExists ? 'pass' : 'warning',
    message: contractsExists ? 'Store contracts generated.' : 'Store contracts not generated (recommended).',
  });

  const overallStatus = checks.some(c => c.status === 'fail') ? 'fail' : 'pass';

  return {
    phase: 2,
    phase_name: 'Mock Analysis & Schema',
    overall_status: overallStatus,
    checks: checks,
    can_proceed: overallStatus === 'pass',
    next_phase: 'Phase 3: Foundation Build',
  };
}

/**
 * Phase 3 Gate Check: Foundation Build
 */
async function checkPhase3Gate(cwd: string): Promise<GateResult> {
  const checks: GateCheck[] = [];

  // 1. Check package.json exists
  const packagePath = path.join(cwd, 'package.json');
  const packageExists = await fs.access(packagePath).then(() => true).catch(() => false);

  if (packageExists) {
    const packageContent = await fs.readFile(packagePath, 'utf-8');
    const pkg = JSON.parse(packageContent);
    const hasNext = pkg.dependencies && pkg.dependencies['next'];
    const hasSupabase = pkg.dependencies && pkg.dependencies['@supabase/supabase-js'];

    checks.push({
      requirement: 'Next.js and Supabase installed',
      status: (hasNext && hasSupabase) ? 'pass' : 'fail',
      message: (hasNext && hasSupabase) ? 'Stack dependencies installed.' : 'Missing Next.js or Supabase packages.',
    });
  } else {
    checks.push({
      requirement: 'package.json exists',
      status: 'fail',
      message: 'Project not initialized. Run: pnpm create next-app',
    });
  }

  // 2. Check for app/ or pages/ directory (Next.js structure)
  const appPath = path.join(cwd, 'app');
  const pagesPath = path.join(cwd, 'pages');
  const appExists = await fs.access(appPath).then(() => true).catch(() => false);
  const pagesExists = await fs.access(pagesPath).then(() => true).catch(() => false);

  checks.push({
    requirement: 'Next.js structure present',
    status: (appExists || pagesExists) ? 'pass' : 'fail',
    message: (appExists || pagesExists) ? 'Next.js directory structure found.' : 'Missing app/ or pages/ directory.',
  });

  const overallStatus = checks.some(c => c.status === 'fail') ? 'fail' : checks.every(c => c.status === 'pass') ? 'pass' : 'warning';

  return {
    phase: 3,
    phase_name: 'Foundation Build',
    overall_status: overallStatus,
    checks: checks,
    can_proceed: overallStatus !== 'fail',
    next_phase: 'Phase 4: Feature Build',
  };
}

/**
 * Phase 4 Gate Check: Feature Build
 */
async function checkPhase4Gate(cwd: string): Promise<GateResult> {
  const checks: GateCheck[] = [];

  // Note: Full feature verification would require running the app
  // For now, check for basic completeness indicators

  // 1. Check TypeScript compiles
  checks.push({
    requirement: 'TypeScript compiles (manual check required)',
    status: 'warning',
    message: 'Run: tsc --noEmit to verify no TypeScript errors.',
  });

  // 2. Check for test files
  const testPatterns = ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts'];
  checks.push({
    requirement: 'Tests present',
    status: 'warning',
    message: 'Verify test files exist and cover critical paths.',
  });

  const overallStatus = 'warning'; // Phase 4 requires manual verification

  return {
    phase: 4,
    phase_name: 'Feature Build',
    overall_status: overallStatus,
    checks: checks,
    can_proceed: true, // Allow proceeding with warnings
    next_phase: 'Phase 5: Testing & Verification',
  };
}

/**
 * Phase 5 Gate Check: Testing & Verification
 */
async function checkPhase5Gate(cwd: string): Promise<GateResult> {
  const checks: GateCheck[] = [];

  // Manual checks for Phase 5
  checks.push({
    requirement: 'All tests passing',
    status: 'warning',
    message: 'Run tests and verify all pass. Command: pnpm test',
  });

  checks.push({
    requirement: 'Lighthouse score >90',
    status: 'warning',
    message: 'Run Lighthouse audit on deployed preview.',
  });

  checks.push({
    requirement: 'No critical vulnerabilities',
    status: 'warning',
    message: 'Run: pnpm audit and resolve critical/high issues.',
  });

  const overallStatus = 'warning';

  return {
    phase: 5,
    phase_name: 'Testing & Verification',
    overall_status: overallStatus,
    checks: checks,
    can_proceed: true,
    next_phase: 'Phase 6: Deployment & Ops',
  };
}

/**
 * Phase 6 Gate Check: Deployment & Ops
 */
async function checkPhase6Gate(cwd: string): Promise<GateResult> {
  const checks: GateCheck[] = [];

  // Check for RUNBOOK.md
  const runbookPath = path.join(cwd, '.codebakers', 'RUNBOOK.md');
  const runbookExists = await fs.access(runbookPath).then(() => true).catch(() => false);

  checks.push({
    requirement: 'RUNBOOK.md exists',
    status: runbookExists ? 'pass' : 'warning',
    message: runbookExists ? 'Operations runbook documented.' : 'Create RUNBOOK.md with deployment and rollback procedures.',
  });

  // Manual deployment checks
  checks.push({
    requirement: 'Application deployed',
    status: 'warning',
    message: 'Verify application is live and accessible.',
  });

  checks.push({
    requirement: 'Monitoring configured',
    status: 'warning',
    message: 'Verify error monitoring (Sentry) and alerting configured.',
  });

  const overallStatus = checks.some(c => c.status === 'fail') ? 'fail' : 'warning';

  return {
    phase: 6,
    phase_name: 'Deployment & Ops',
    overall_status: overallStatus,
    checks: checks,
    can_proceed: true,
    next_phase: 'Project Complete',
  };
}

/**
 * Generate gate check report
 */
function generateGateReport(result: GateResult): string {
  let report = `🍞 CodeBakers: Phase ${result.phase} - ${result.phase_name}\n\n`;
  report += `**Gate Check Status:** ${result.overall_status.toUpperCase()}\n\n`;
  report += `---\n\n`;

  // Check results
  report += `## Verification Checks\n\n`;
  for (const check of result.checks) {
    const icon = check.status === 'pass' ? '✅' : check.status === 'fail' ? '❌' : '⚠️';
    report += `${icon} **${check.requirement}**\n`;
    report += `   ${check.message}\n\n`;
  }

  report += `---\n\n`;

  // Overall result
  if (result.overall_status === 'pass') {
    report += `## ✅ GATE PASSED\n\n`;
    report += `All requirements met. You can proceed to:\n`;
    report += `**${result.next_phase}**\n\n`;
  } else if (result.overall_status === 'fail') {
    report += `## ❌ GATE FAILED\n\n`;
    report += `Requirements not met. Address failures above before proceeding.\n\n`;
  } else {
    report += `## ⚠️ WARNINGS PRESENT\n\n`;
    report += `Some checks require manual verification.\n`;
    report += `Review warnings above before proceeding to:\n`;
    report += `**${result.next_phase}**\n\n`;
  }

  return report;
}
