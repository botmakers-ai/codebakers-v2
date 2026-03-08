/**
 * codebakers_get_context
 *
 * Auto-detect project state and suggest next steps
 * This runs before EVERY user interaction to make CodeBakers self-aware
 */

import { promises as fs } from 'fs';
import * as path from 'path';

interface ProjectContext {
  current_phase: string;
  phase_number: number;
  progress_percent: number;
  next_steps: NextStep[];
  blockers: Blocker[];
  suggestions: Suggestion[];
  project_name?: string;
  project_type?: string;
}

interface NextStep {
  description: string;
  command?: string;
  estimated_time?: string;
}

interface Blocker {
  type: string;
  description: string;
  solutions: string[];
}

interface Suggestion {
  type: string;
  message: string;
  action: string;
  command?: string;
}

export async function getContext(args: any): Promise<ProjectContext> {
  const cwd = process.cwd();

  // 1. DETECT PROJECT STATE
  const state = await detectProjectState(cwd);

  // 2. DETERMINE CURRENT PHASE
  const phase = await determineCurrentPhase(state);

  // 3. CALCULATE PROGRESS
  const progress = calculateProgress(phase, state);

  // 4. DETERMINE NEXT STEPS
  const nextSteps = await determineNextSteps(phase, state);

  // 5. DETECT BLOCKERS
  const blockers = await detectBlockers(state);

  // 6. GENERATE SUGGESTIONS
  const suggestions = generateSuggestions(phase, state, blockers);

  return {
    current_phase: phase.name,
    phase_number: phase.number,
    progress_percent: progress,
    next_steps: nextSteps,
    blockers: blockers,
    suggestions: suggestions,
    project_name: state.projectName,
    project_type: state.projectType,
  };
}

async function detectProjectState(cwd: string) {
  const state: any = {
    hasCodabakersFolder: await exists(path.join(cwd, '.codebakers')),
    hasBuildState: await exists(path.join(cwd, '.codebakers/BUILD-STATE.md')),
    hasProjectSpec: await exists(path.join(cwd, '.codebakers/PROJECT-SPEC.md')),
    hasRefsFolder: await exists(path.join(cwd, 'refs')),
    hasMockups: await exists(path.join(cwd, 'refs/design')) && (await hasFiles(path.join(cwd, 'refs/design'))),
    hasSchema: await exists(path.join(cwd, 'supabase/migrations')) || await exists(path.join(cwd, '.codebakers/SCHEMA.sql')),
    hasDependencyMap: await exists(path.join(cwd, '.codebakers/DEPENDENCY-MAP.md')),
    hasStoreContracts: await exists(path.join(cwd, '.codebakers/STORE-CONTRACTS.md')),
    hasCode: await exists(path.join(cwd, 'app')) || await exists(path.join(cwd, 'src')),
    hasPackageJson: await exists(path.join(cwd, 'package.json')),
    hasGit: await exists(path.join(cwd, '.git')),
    projectName: await getProjectName(cwd),
    projectType: await getProjectType(cwd),
  };

  // Load BUILD-STATE if it exists
  if (state.hasBuildState) {
    try {
      const buildStateContent = await fs.readFile(path.join(cwd, '.codebakers/BUILD-STATE.md'), 'utf-8');
      state.buildState = parseBuildState(buildStateContent);
    } catch (error) {
      // BUILD-STATE exists but couldn't read it
    }
  }

  return state;
}

async function determineCurrentPhase(state: any) {
  // If BUILD-STATE exists, read phase from there
  if (state.buildState?.current_phase !== undefined) {
    return {
      number: state.buildState.current_phase,
      name: getPhaseName(state.buildState.current_phase),
    };
  }

  // Otherwise, infer from file existence
  if (!state.hasCodabakersFolder) {
    return { number: -1, name: 'PRE_INIT' };
  }

  if (!state.hasProjectSpec) {
    return { number: 0, name: 'PHASE_0_SPEC' };
  }

  if (!state.hasMockups) {
    return { number: 1, name: 'PHASE_1_MOCKUPS' };
  }

  if (!state.hasSchema || !state.hasDependencyMap) {
    return { number: 2, name: 'PHASE_2_SCHEMA' };
  }

  if (!state.hasCode) {
    return { number: 3, name: 'PHASE_3_FOUNDATION' };
  }

  // If has code, check BUILD-STATE for Phase 4/5/6
  return { number: 4, name: 'PHASE_4_FEATURES' };
}

function getPhaseName(phaseNumber: number): string {
  const phases = [
    'PHASE_0_SPEC',
    'PHASE_1_MOCKUPS',
    'PHASE_2_SCHEMA',
    'PHASE_3_FOUNDATION',
    'PHASE_4_FEATURES',
    'PHASE_5_TESTING',
    'PHASE_6_DEPLOYMENT',
  ];
  return phases[phaseNumber] || 'UNKNOWN';
}

function calculateProgress(phase: any, state: any): number {
  // Simple progress calculation based on phase milestones
  const phaseProgress: Record<string, number> = {
    PRE_INIT: 0,
    PHASE_0_SPEC: 10,
    PHASE_1_MOCKUPS: 25,
    PHASE_2_SCHEMA: 40,
    PHASE_3_FOUNDATION: 55,
    PHASE_4_FEATURES: 70,
    PHASE_5_TESTING: 85,
    PHASE_6_DEPLOYMENT: 95,
  };

  return phaseProgress[phase.name] || 0;
}

async function determineNextSteps(phase: any, state: any): Promise<NextStep[]> {
  const steps: NextStep[] = [];

  switch (phase.name) {
    case 'PRE_INIT':
      steps.push({
        description: 'Initialize CodeBakers project structure',
        command: 'codebakers_init_session',
        estimated_time: '1 minute',
      });
      steps.push({
        description: 'Start Phase 0: Generate project specification',
        command: 'codebakers_generate_spec',
        estimated_time: '5-10 minutes',
      });
      break;

    case 'PHASE_0_SPEC':
      steps.push({
        description: 'Complete PROJECT-SPEC.md (Gates 0-5)',
        command: 'codebakers_generate_spec',
        estimated_time: '5-10 minutes',
      });
      break;

    case 'PHASE_1_MOCKUPS':
      if (!state.hasMockups) {
        steps.push({
          description: 'Upload your mockups to refs/design/ (screenshots, wireframes, or Figma exports)',
          estimated_time: '15-30 minutes',
        });
      } else {
        steps.push({
          description: 'Review mockups and proceed to Phase 2',
          command: 'codebakers_check_gate 1',
        });
      }
      break;

    case 'PHASE_2_SCHEMA':
      if (!state.hasDependencyMap) {
        steps.push({
          description: 'Analyze mockups and generate schema',
          command: 'codebakers_analyze_mockups_deep',
          estimated_time: '10-15 minutes',
        });
      } else {
        steps.push({
          description: 'Verify Phase 2 gate and proceed to Phase 3',
          command: 'codebakers_check_gate 2',
        });
      }
      break;

    case 'PHASE_3_FOUNDATION':
      steps.push({
        description: 'Build project scaffold, auth, and routing',
        estimated_time: '20-30 minutes',
      });
      break;

    case 'PHASE_4_FEATURES':
      steps.push({
        description: 'Build features from PROJECT-SPEC.md',
        command: 'codebakers_enforce_feature',
        estimated_time: 'Varies by feature',
      });
      break;

    case 'PHASE_5_TESTING':
      steps.push({
        description: 'Run comprehensive testing suite',
        estimated_time: '30-60 minutes',
      });
      break;

    case 'PHASE_6_DEPLOYMENT':
      steps.push({
        description: 'Deploy to production and generate runbook',
        estimated_time: '15-30 minutes',
      });
      break;
  }

  return steps;
}

async function detectBlockers(state: any): Promise<Blocker[]> {
  const blockers: Blocker[] = [];

  // No git repository
  if (!state.hasGit) {
    blockers.push({
      type: 'CRITICAL',
      description: 'No git repository detected. CodeBakers requires git for memory and crash recovery.',
      solutions: [
        'Run: git init',
        'Create initial commit: git add . && git commit -m "initial commit"',
      ],
    });
  }

  // Mockups expected but missing
  if (state.hasProjectSpec && !state.hasMockups && state.buildState?.current_phase === 1) {
    blockers.push({
      type: 'BLOCKED',
      description: 'Phase 1 (Mockups) in progress but no mockups found in refs/design/',
      solutions: [
        'Upload your mockups to refs/design/ (screenshots, wireframes, Figma exports, or hand-drawn sketches)',
        'Create mockups in your design tool, then upload them',
        'Skip mockups (not recommended - violates Method principle P2)',
      ],
    });
  }

  // Schema expected but missing
  if (state.hasMockups && !state.hasSchema && state.buildState?.current_phase === 2) {
    blockers.push({
      type: 'BLOCKED',
      description: 'Phase 2 (Schema) in progress but schema not generated',
      solutions: [
        'Run: codebakers_analyze_mockups_deep',
        'Then: codebakers_generate_schema',
      ],
    });
  }

  return blockers;
}

function generateSuggestions(phase: any, state: any, blockers: Blocker[]): Suggestion[] {
  const suggestions: Suggestion[] = [];

  // If blockers exist, suggest fixes first
  if (blockers.length > 0) {
    suggestions.push({
      type: 'blocker',
      message: `${blockers.length} blocker(s) detected. Fix these first before proceeding.`,
      action: 'Show blockers',
    });
    return suggestions; // Don't suggest next steps if blocked
  }

  // Phase-specific suggestions
  switch (phase.name) {
    case 'PRE_INIT':
      suggestions.push({
        type: 'get_started',
        message: 'New project detected. Let me guide you through the CodeBakers Method (7 phases).',
        action: 'Start Phase 0',
        command: 'codebakers_init_session',
      });
      break;

    case 'PHASE_0_SPEC':
      if (state.hasProjectSpec) {
        suggestions.push({
          type: 'next_phase',
          message: 'PROJECT-SPEC.md complete. Ready to start Phase 1 (Mockups)?',
          action: 'Proceed to Phase 1',
        });
      }
      break;

    case 'PHASE_1_MOCKUPS':
      if (state.hasMockups) {
        suggestions.push({
          type: 'next_phase',
          message: 'Mockups ready. Run deep analysis to generate schema?',
          action: 'Start Phase 2',
          command: 'codebakers_analyze_mockups_deep',
        });
      }
      break;

    case 'PHASE_2_SCHEMA':
      if (state.hasSchema && state.hasDependencyMap) {
        suggestions.push({
          type: 'next_phase',
          message: 'Schema and dependencies mapped. Ready to build foundation?',
          action: 'Start Phase 3',
        });
      }
      break;

    case 'PHASE_4_FEATURES':
      suggestions.push({
        type: 'feature_build',
        message: 'Ready to build features. Use // [feature name] for full enforcement.',
        action: 'Build next feature',
      });
      break;
  }

  return suggestions;
}

// Helper functions

async function exists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function hasFiles(dirPath: string): Promise<boolean> {
  try {
    const files = await fs.readdir(dirPath);
    return files.length > 0;
  } catch {
    return false;
  }
}

async function getProjectName(cwd: string): Promise<string | undefined> {
  try {
    const packageJsonPath = path.join(cwd, 'package.json');
    if (await exists(packageJsonPath)) {
      const content = await fs.readFile(packageJsonPath, 'utf-8');
      const pkg = JSON.parse(content);
      return pkg.name;
    }

    // Try BUILD-STATE
    const buildStatePath = path.join(cwd, '.codebakers/BUILD-STATE.md');
    if (await exists(buildStatePath)) {
      const content = await fs.readFile(buildStatePath, 'utf-8');
      const match = content.match(/Project:\s*(.+)/);
      if (match) return match[1].trim();
    }
  } catch {
    // Ignore errors
  }

  return undefined;
}

async function getProjectType(cwd: string): Promise<string | undefined> {
  try {
    const buildStatePath = path.join(cwd, '.codebakers/BUILD-STATE.md');
    if (await exists(buildStatePath)) {
      const content = await fs.readFile(buildStatePath, 'utf-8');
      const match = content.match(/Type:\s*(.+)/);
      if (match) return match[1].trim();
    }

    const specPath = path.join(cwd, '.codebakers/PROJECT-SPEC.md');
    if (await exists(specPath)) {
      const content = await fs.readFile(specPath, 'utf-8');
      const match = content.match(/Type:\s*(.+)/);
      if (match) return match[1].trim();
    }
  } catch {
    // Ignore errors
  }

  return undefined;
}

function parseBuildState(content: string): any {
  // Simple parser for BUILD-STATE.md
  const state: any = {};

  const phaseMatch = content.match(/Current Phase:\s*(\d+)/i);
  if (phaseMatch) {
    state.current_phase = parseInt(phaseMatch[1]);
  }

  const progressMatch = content.match(/Progress:\s*(\d+)%/i);
  if (progressMatch) {
    state.progress = parseInt(progressMatch[1]);
  }

  return state;
}
