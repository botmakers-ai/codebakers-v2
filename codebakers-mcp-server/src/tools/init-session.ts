/**
 * codebakers_init_session
 *
 * Session Initialization Protocol (from CodeBakers Method)
 * Loads BUILD-STATE.md, PROJECT-SPEC.md, and phase-specific context
 * MUST run at the start of every AI session
 */

import { promises as fs } from 'fs';
import * as path from 'path';

interface SessionContext {
  initialized: true;
  project_name: string;
  current_phase: number;
  phase_name: string;
  current_task: string;
  build_state: any;
  project_spec: any;
  phase_artifacts: string[];
  verification_gate: string[];
  next_action: string;
}

export async function initSession(args: any): Promise<SessionContext> {
  const cwd = process.cwd();

  console.error('🍞 CodeBakers: Initializing session...');

  // 1. Load BUILD-STATE.md (establishes current project context)
  const buildState = await loadBuildState(cwd);

  // 2. Load PROJECT-SPEC.md (confirms scope boundaries)
  const projectSpec = await loadProjectSpec(cwd);

  // 3. Load phase-specific artifacts
  const phaseArtifacts = await loadPhaseArtifacts(cwd, buildState.current_phase);

  // 4. Confirm current phase and task
  const currentTask = buildState.current_task || determineCurrentTask(buildState);

  // 5. Confirm verification gate requirements
  const verificationGate = getVerificationGate(buildState.current_phase);

  // 6. Determine next action
  const nextAction = determineNextAction(buildState, projectSpec);

  console.error(`✓ Session initialized`);
  console.error(`  Project: ${buildState.project_name}`);
  console.error(`  Phase: ${buildState.current_phase} (${getPhaseName(buildState.current_phase)})`);
  console.error(`  Task: ${currentTask}`);

  return {
    initialized: true,
    project_name: buildState.project_name,
    current_phase: buildState.current_phase,
    phase_name: getPhaseName(buildState.current_phase),
    current_task: currentTask,
    build_state: buildState,
    project_spec: projectSpec,
    phase_artifacts: phaseArtifacts,
    verification_gate: verificationGate,
    next_action: nextAction,
  };
}

async function loadBuildState(cwd: string): Promise<any> {
  const buildStatePath = path.join(cwd, '.codebakers/BUILD-STATE.md');

  try {
    const content = await fs.readFile(buildStatePath, 'utf-8');
    return parseBuildState(content);
  } catch (error) {
    // BUILD-STATE doesn't exist - new project
    // Initialize with defaults
    return {
      project_name: 'New Project',
      current_phase: 0,
      current_task: 'Generate PROJECT-SPEC.md',
      created_at: new Date().toISOString(),
      last_updated: new Date().toISOString(),
    };
  }
}

async function loadProjectSpec(cwd: string): Promise<any> {
  const specPath = path.join(cwd, '.codebakers/PROJECT-SPEC.md');

  try {
    const content = await fs.readFile(specPath, 'utf-8');
    return parseProjectSpec(content);
  } catch (error) {
    // PROJECT-SPEC doesn't exist yet
    return null;
  }
}

async function loadPhaseArtifacts(cwd: string, phase: number): Promise<string[]> {
  const artifacts: string[] = [];

  const phaseArtifactPaths: Record<number, string[]> = {
    0: ['.codebakers/PROJECT-SPEC.md', '.codebakers/COMPETITIVE-ANALYSIS.md'],
    1: ['refs/design/', '.codebakers/DESIGN-SYSTEM.md'],
    2: [
      '.codebakers/MOCK-ANALYSIS.md',
      '.codebakers/SCHEMA.sql',
      '.codebakers/DEPENDENCY-MAP.md',
      '.codebakers/STORE-CONTRACTS.md',
    ],
    3: ['app/', 'lib/', 'components/'],
    4: ['app/', 'lib/', 'components/'],
    5: ['.codebakers/TEST-REPORT.md'],
    6: ['.codebakers/RUNBOOK.md'],
  };

  const paths = phaseArtifactPaths[phase] || [];

  for (const artifactPath of paths) {
    const fullPath = path.join(cwd, artifactPath);
    try {
      await fs.access(fullPath);
      artifacts.push(artifactPath);
    } catch {
      // Artifact doesn't exist yet
    }
  }

  return artifacts;
}

function determineCurrentTask(buildState: any): string {
  const phase = buildState.current_phase;

  const defaultTasks: Record<number, string> = {
    0: 'Generate PROJECT-SPEC.md (Gates 0-5)',
    1: 'Design UI mockups for all screens',
    2: 'Analyze mockups and generate schema',
    3: 'Build project foundation and authentication',
    4: 'Build features from PROJECT-SPEC.md',
    5: 'Run comprehensive testing suite',
    6: 'Deploy to production',
  };

  return defaultTasks[phase] || 'Unknown task';
}

function getVerificationGate(phase: number): string[] {
  const gates: Record<number, string[]> = {
    0: [
      'PROJECT-SPEC.md complete through all 6 gates',
      'Feature list atomically decomposed',
      'All external dependencies identified',
      'Human reviewed and approved spec',
    ],
    1: [
      'Every screen in spec has mockup',
      'All interactive states represented',
      'Design system tokens documented',
      'Human reviewed and approved all screens',
    ],
    2: [
      'Every mockup field has database column',
      'All entity relationships captured',
      'Dependency map complete',
      'Schema reviewed for normalization and security',
    ],
    3: [
      'Application runs without errors',
      'All routes resolve',
      'Auth flows work end-to-end',
      'Database migrations run cleanly',
      'Design system components render correctly',
    ],
    4: [
      'Every feature in spec implemented',
      'Every screen matches mockup',
      'All forms validate correctly',
      'All data operations work',
      'No console errors or TypeScript violations',
    ],
    5: [
      'All automated tests pass',
      'Lighthouse score >90',
      'No critical security vulnerabilities',
      'WCAG AA compliance met',
      'Zero known blocking bugs',
    ],
    6: [
      'Application live and accessible',
      'CI/CD pipeline runs successfully',
      'Monitoring alerts firing correctly',
      'Backup and restore tested',
      'Runbook complete',
    ],
  };

  return gates[phase] || [];
}

function determineNextAction(buildState: any, projectSpec: any): string {
  const phase = buildState.current_phase;

  if (!projectSpec && phase === 0) {
    return 'Run: codebakers_generate_spec (provide project description)';
  }

  if (projectSpec && phase === 0) {
    return 'Review PROJECT-SPEC.md and proceed to Phase 1 (Mockups)';
  }

  if (phase === 1) {
    return 'Design mockups or upload to refs/design/';
  }

  if (phase === 2) {
    return 'Run: codebakers_analyze_mockups_deep';
  }

  return 'Continue with current phase tasks';
}

function getPhaseName(phase: number): string {
  const names = [
    'Domain Research & Spec',
    'UI Mockup & Design',
    'Mock Analysis & Schema',
    'Foundation Build',
    'Feature Build',
    'Testing & Verification',
    'Deployment & Ops',
  ];

  return names[phase] || 'Unknown Phase';
}

function parseBuildState(content: string): any {
  const state: any = {
    project_name: 'Unknown',
    current_phase: 0,
    current_task: '',
    created_at: new Date().toISOString(),
    last_updated: new Date().toISOString(),
  };

  // Extract fields from BUILD-STATE.md
  const projectMatch = content.match(/Project:\s*(.+)/);
  if (projectMatch) state.project_name = projectMatch[1].trim();

  const phaseMatch = content.match(/Current Phase:\s*(\d+)/);
  if (phaseMatch) state.current_phase = parseInt(phaseMatch[1]);

  const taskMatch = content.match(/Current Task:\s*(.+)/);
  if (taskMatch) state.current_task = taskMatch[1].trim();

  const createdMatch = content.match(/Created:\s*(.+)/);
  if (createdMatch) state.created_at = createdMatch[1].trim();

  const updatedMatch = content.match(/Last Updated:\s*(.+)/);
  if (updatedMatch) state.last_updated = updatedMatch[1].trim();

  return state;
}

function parseProjectSpec(content: string): any {
  // Simple parser for PROJECT-SPEC.md
  const spec: any = {
    gates: {},
    features: [],
  };

  // Extract features
  const featuresSection = content.match(/## Features(.+?)(?=##|$)/s);
  if (featuresSection) {
    const featureLines = featuresSection[1].match(/- .+/g) || [];
    spec.features = featureLines.map((line) => line.replace(/^- /, '').trim());
  }

  return spec;
}
