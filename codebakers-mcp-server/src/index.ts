#!/usr/bin/env node

/**
 * CodeBakers MCP Server v5.4.0
 *
 * Complete implementation of the CodeBakers Method:
 * - 7-phase development workflow
 * - Comprehensive dependency mapping
 * - Self-aware proactive guidance
 * - Technical enforcement via MCP
 * - OAuth integration (GitHub, Supabase, Vercel)
 * - Context-aware consulting
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// Tool imports
import { getContext } from './tools/get-context.js';
import { initSession } from './tools/init-session.js';
import { generateSpec } from './tools/generate-spec.js';
import { analyzeMockupsDeep } from './tools/analyze-mockups.js';
import { generateSchema } from './tools/generate-schema.js';
import { mapDependencies } from './tools/map-dependencies.js';
import { generateStoreContracts } from './tools/generate-store-contracts.js';
import { checkGate } from './tools/check-gate.js';
import { enforceFeature } from './tools/enforce-feature.js';
import { fixCommit } from './tools/fix-commit.js';
import { checkScope } from './tools/check-scope.js';

// v5.1.0 Tools
import { validateMockups } from './tools/validate-mockups.js';
import { fixMockups } from './tools/fix-mockups.js';
import { verifyMockups } from './tools/verify-mockups.js';
import { runInterview } from './tools/run-interview.js';
import { generateMigration } from './tools/generate-migration.js';
import { generateApiRoute } from './tools/generate-api-route.js';
import { generateStore } from './tools/generate-store.js';
import { generateComponent } from './tools/generate-component.js';
import { generateUnitTests } from './tools/generate-unit-tests.js';
import { generateE2ETests } from './tools/generate-e2e-tests.js';
import { runTests } from './tools/run-tests.js';
import { executeAtomicUnit } from './tools/execute-atomic-unit.js';
import { verifyCompleteness } from './tools/verify-completeness.js';
import { builder } from './tools/builder.js';

// v5.2.0 New Tools - Quality Gates & Production
import { validateAccessibility } from './tools/validate-accessibility.js';
import { optimizePerformance } from './tools/optimize-performance.js';
import { scanSecurity } from './tools/scan-security.js';
import { deployVercel } from './tools/deploy-vercel.js';
import { diagnoseError } from './tools/diagnose-error.js';
import { generateDocs } from './tools/generate-docs.js';
import { generateChatbot } from './tools/generate-chatbot.js';

// v5.3.0 New Tools - OAuth Setup
import { setupGitHub } from './tools/setup-github.js';
import { setupSupabase } from './tools/setup-supabase.js';
import { setupVercel } from './tools/setup-vercel.js';

// v5.4.0 New Tools - Context-Aware Consulting
import { consult } from './tools/consult.js';

const server = new Server(
  {
    name: 'codebakers',
    version: '5.4.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

/**
 * Tool Registry
 * All CodeBakers MCP tools
 */
const tools = {
  // Context & Session Management
  codebakers_get_context: getContext,
  codebakers_init_session: initSession,

  // Phase 0: Spec Generation
  codebakers_generate_spec: generateSpec,

  // Phase 1: Interview
  codebakers_run_interview: runInterview,

  // Phase 2: Mockup Quality
  codebakers_validate_mockups: validateMockups,
  codebakers_fix_mockups: fixMockups,
  codebakers_verify_mockups: verifyMockups,

  // Phase 2: Analysis & Schema
  codebakers_analyze_mockups_deep: analyzeMockupsDeep,
  codebakers_generate_schema: generateSchema,
  codebakers_map_dependencies: mapDependencies,
  codebakers_generate_store_contracts: generateStoreContracts,

  // Phase Verification
  codebakers_check_gate: checkGate,

  // Code Generation
  codebakers_generate_migration: generateMigration,
  codebakers_generate_api_route: generateApiRoute,
  codebakers_generate_store: generateStore,
  codebakers_generate_component: generateComponent,

  // Testing
  codebakers_generate_unit_tests: generateUnitTests,
  codebakers_generate_e2e_tests: generateE2ETests,
  codebakers_run_tests: runTests,

  // Orchestration
  codebakers_execute_atomic_unit: executeAtomicUnit,
  codebakers_verify_completeness: verifyCompleteness,
  codebakers_builder: builder,

  // Feature Building
  codebakers_enforce_feature: enforceFeature,

  // Enforcement
  codebakers_fix_commit: fixCommit,
  codebakers_check_scope: checkScope,

  // v5.2.0: Quality Gates
  codebakers_validate_accessibility: validateAccessibility,
  codebakers_optimize_performance: optimizePerformance,
  codebakers_scan_security: scanSecurity,
  codebakers_deploy_vercel: deployVercel,
  codebakers_diagnose_error: diagnoseError,

  // v5.2.0: Production Features
  codebakers_generate_docs: generateDocs,
  codebakers_generate_chatbot: generateChatbot,

  // v5.3.0: OAuth Setup
  codebakers_setup_github: setupGitHub,
  codebakers_setup_supabase: setupSupabase,
  codebakers_setup_vercel: setupVercel,

  // v5.4.0: Context-Aware Consulting
  codebakers_consult: consult,
};

/**
 * List available tools
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'codebakers_get_context',
        description: 'Auto-detect project state, current phase, and suggest next steps. Runs before every response.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'codebakers_init_session',
        description: 'Initialize AI session with BUILD-STATE.md, PROJECT-SPEC.md, and phase-specific context',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'codebakers_generate_spec',
        description: 'Phase 0: Generate PROJECT-SPEC.md with Gates 0-5 from user description',
        inputSchema: {
          type: 'object',
          properties: {
            description: {
              type: 'string',
              description: 'What the user wants to build',
            },
          },
          required: ['description'],
        },
      },
      {
        name: 'codebakers_analyze_mockups_deep',
        description: 'Phase 2: Deep mockup analysis - extract all data fields, relationships, and interactions',
        inputSchema: {
          type: 'object',
          properties: {
            mockup_folder: {
              type: 'string',
              description: 'Path to mockups folder (default: refs/design/)',
            },
          },
        },
      },
      {
        name: 'codebakers_generate_schema',
        description: 'Phase 2: Generate complete database schema from mockup analysis',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'codebakers_map_dependencies',
        description: 'Phase 2: Map all dependencies - read paths, write paths, cascades, store connections',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'codebakers_generate_store_contracts',
        description: 'Phase 2: Generate store contracts - what each store exposes and depends on',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'codebakers_check_gate',
        description: 'Verify current phase gate requirements are met',
        inputSchema: {
          type: 'object',
          properties: {
            phase: {
              type: 'number',
              description: 'Phase number (0-6)',
            },
          },
          required: ['phase'],
        },
      },
      {
        name: 'codebakers_enforce_feature',
        description: 'Build feature with full atomic unit enforcement',
        inputSchema: {
          type: 'object',
          properties: {
            feature_name: {
              type: 'string',
              description: 'Feature to build',
            },
          },
          required: ['feature_name'],
        },
      },
      {
        name: 'codebakers_fix_commit',
        description: 'Auto-fix git commit violations detected by hooks',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'codebakers_check_scope',
        description: 'Check if requested feature is in PROJECT-SPEC.md scope',
        inputSchema: {
          type: 'object',
          properties: {
            feature_description: {
              type: 'string',
              description: 'Feature user requested',
            },
          },
          required: ['feature_description'],
        },
      },
      // v5.1.0 New Tools
      {
        name: 'codebakers_validate_mockups',
        description: 'Validate mockup quality - detect overlapping content, viewport issues, missing states',
        inputSchema: {
          type: 'object',
          properties: {
            mockup_folder: { type: 'string', description: 'Mockups folder (default: refs/design/)' },
          },
        },
      },
      {
        name: 'codebakers_fix_mockups',
        description: 'Auto-fix mockup quality issues - layout, viewport, generate missing states',
        inputSchema: {
          type: 'object',
          properties: {
            mockup_folder: { type: 'string', description: 'Mockups folder (default: refs/design/)' },
          },
        },
      },
      {
        name: 'codebakers_verify_mockups',
        description: 'Final verification - ensure 100% perfect mockups before analysis',
        inputSchema: {
          type: 'object',
          properties: {
            mockup_folder: { type: 'string', description: 'Mockups folder (default: refs/design/)' },
          },
        },
      },
      {
        name: 'codebakers_run_interview',
        description: 'Automated interview - generate project-profile.md, FLOWS.md, BRAIN.md',
        inputSchema: {
          type: 'object',
          properties: {
            project_description: { type: 'string', description: 'What to build' },
          },
        },
      },
      {
        name: 'codebakers_generate_migration',
        description: 'Generate database migration file (Supabase/PostgreSQL)',
        inputSchema: {
          type: 'object',
          properties: {
            entity: { type: 'string', description: 'Entity name' },
            fields: { type: 'array', description: 'Array of field definitions' },
            add_rls: { type: 'boolean', description: 'Add RLS policies (default: true)' },
          },
          required: ['entity', 'fields'],
        },
      },
      {
        name: 'codebakers_generate_api_route',
        description: 'Generate Next.js API route with Supabase integration',
        inputSchema: {
          type: 'object',
          properties: {
            entity: { type: 'string', description: 'Entity name' },
            operation: { type: 'string', enum: ['list', 'get', 'create', 'update', 'delete'], description: 'CRUD operation' },
          },
          required: ['entity', 'operation'],
        },
      },
      {
        name: 'codebakers_generate_store',
        description: 'Generate Zustand store with dependency updates',
        inputSchema: {
          type: 'object',
          properties: {
            entity: { type: 'string', description: 'Entity name' },
            operations: { type: 'array', description: 'Operations to include' },
            dependencies: { type: 'array', description: 'Dependent stores (from DEPENDENCY-MAP.md)' },
          },
          required: ['entity', 'operations'],
        },
      },
      {
        name: 'codebakers_generate_component',
        description: 'Generate React component with all states (loading/error/empty/success)',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Component name' },
            entity: { type: 'string', description: 'Entity name' },
            type: { type: 'string', enum: ['list', 'detail', 'form'], description: 'Component type' },
          },
          required: ['name', 'entity', 'type'],
        },
      },
      {
        name: 'codebakers_generate_unit_tests',
        description: 'Generate Vitest unit tests',
        inputSchema: {
          type: 'object',
          properties: {
            file_path: { type: 'string', description: 'File to test' },
            test_type: { type: 'string', enum: ['component', 'store', 'api'], description: 'Test type' },
          },
          required: ['file_path', 'test_type'],
        },
      },
      {
        name: 'codebakers_generate_e2e_tests',
        description: 'Generate Playwright E2E tests',
        inputSchema: {
          type: 'object',
          properties: {
            flow_name: { type: 'string', description: 'User flow name' },
            steps: { type: 'array', description: 'Flow steps' },
          },
          required: ['flow_name', 'steps'],
        },
      },
      {
        name: 'codebakers_run_tests',
        description: 'Run Vitest and/or Playwright tests',
        inputSchema: {
          type: 'object',
          properties: {
            test_type: { type: 'string', enum: ['unit', 'e2e', 'all'], description: 'Test type to run' },
            mode: { type: 'string', enum: ['fast', 'full'], description: 'Fast (critical) or full' },
          },
          required: ['test_type'],
        },
      },
      {
        name: 'codebakers_execute_atomic_unit',
        description: 'Execute full 8-step atomic unit build',
        inputSchema: {
          type: 'object',
          properties: {
            feature_name: { type: 'string', description: 'Feature name' },
            entity: { type: 'string', description: 'Main entity' },
            operations: { type: 'array', description: 'CRUD operations' },
          },
          required: ['feature_name', 'entity'],
        },
      },
      {
        name: 'codebakers_verify_completeness',
        description: 'Verify feature completeness (all requirements met)',
        inputSchema: {
          type: 'object',
          properties: {
            feature_name: { type: 'string', description: 'Feature to verify' },
          },
          required: ['feature_name'],
        },
      },
      {
        name: 'codebakers_builder',
        description: 'Build entire application autonomously from FLOWS.md with automatic quality gates',
        inputSchema: {
          type: 'object',
          properties: {
            mode: { type: 'string', enum: ['full', 'remaining'], description: 'Build mode' },
            stop_on_error: { type: 'boolean', description: 'Stop on first error (default: false)' },
            skip_quality_gates: { type: 'boolean', description: 'Skip quality gates (default: false)' },
            skip_deploy: { type: 'boolean', description: 'Skip deployment (default: false)' },
            skip_docs: { type: 'boolean', description: 'Skip documentation (default: false)' },
            skip_chatbot: { type: 'boolean', description: 'Skip AI chatbot (default: false)' },
          },
          required: ['mode'],
        },
      },
      // v5.2.0: Quality Gates
      {
        name: 'codebakers_validate_accessibility',
        description: 'Validate WCAG accessibility compliance - detects missing ARIA labels, low contrast, etc.',
        inputSchema: {
          type: 'object',
          properties: {
            threshold: { type: 'number', description: 'Minimum score 0-100 (default: 90)' },
          },
        },
      },
      {
        name: 'codebakers_optimize_performance',
        description: 'Optimize performance - bundle size, images, code splitting, lazy loading',
        inputSchema: {
          type: 'object',
          properties: {
            auto_fix: { type: 'boolean', description: 'Auto-apply optimizations (default: true)' },
          },
        },
      },
      {
        name: 'codebakers_scan_security',
        description: 'Scan for security vulnerabilities - dependencies, XSS, SQL injection, secrets',
        inputSchema: {
          type: 'object',
          properties: {
            block_on_critical: { type: 'boolean', description: 'Block on critical issues (default: true)' },
          },
        },
      },
      {
        name: 'codebakers_deploy_vercel',
        description: 'Deploy to Vercel - configures project, sets env vars, deploys to production',
        inputSchema: {
          type: 'object',
          properties: {
            production: { type: 'boolean', description: 'Deploy to production (default: true)' },
            env_file: { type: 'string', description: 'Path to .env file (default: .env)' },
          },
        },
      },
      {
        name: 'codebakers_diagnose_error',
        description: 'AI-powered error diagnosis - analyzes errors, provides root cause and fix approaches',
        inputSchema: {
          type: 'object',
          properties: {
            error_message: { type: 'string', description: 'Error message to diagnose' },
            stack_trace: { type: 'string', description: 'Stack trace (optional)' },
            context: { type: 'string', description: 'Additional context (optional)' },
          },
          required: ['error_message'],
        },
      },
      {
        name: 'codebakers_generate_docs',
        description: 'Generate beautiful HTML documentation - quick start, setup, API reference, components',
        inputSchema: {
          type: 'object',
          properties: {
            include_api: { type: 'boolean', description: 'Include API reference (default: true)' },
            include_components: { type: 'boolean', description: 'Include components (default: true)' },
            output_dir: { type: 'string', description: 'Output directory (default: docs/)' },
          },
        },
      },
      {
        name: 'codebakers_generate_chatbot',
        description: 'Generate AI chatbot that knows entire codebase - helps users in-app',
        inputSchema: {
          type: 'object',
          properties: {
            position: { type: 'string', enum: ['bottom-right', 'bottom-left', 'sidebar'], description: 'Position (default: bottom-right)' },
            include_api_knowledge: { type: 'boolean', description: 'Include API docs (default: true)' },
            include_component_knowledge: { type: 'boolean', description: 'Include component structure (default: true)' },
          },
        },
      },
      // v5.3.0: OAuth Setup
      {
        name: 'codebakers_setup_github',
        description: 'Setup GitHub repository with OAuth - create new or link existing repo',
        inputSchema: {
          type: 'object',
          properties: {
            mode: { type: 'string', enum: ['existing', 'create', 'skip'], description: 'Setup mode' },
            repo_name: { type: 'string', description: 'Repository name (for create mode)' },
            repo_url: { type: 'string', description: 'Repository URL (for existing mode)' },
            is_private: { type: 'boolean', description: 'Private repository (default: true)' },
          },
        },
      },
      {
        name: 'codebakers_setup_supabase',
        description: 'Setup Supabase project with OAuth - create new or configure existing',
        inputSchema: {
          type: 'object',
          properties: {
            mode: { type: 'string', enum: ['existing', 'create', 'skip'], description: 'Setup mode' },
            project_name: { type: 'string', description: 'Project name (for create mode)' },
            region: { type: 'string', description: 'Region (default: us-east-1)' },
            supabase_url: { type: 'string', description: 'Project URL (for existing mode)' },
            supabase_anon_key: { type: 'string', description: 'Anon key (for existing mode)' },
            supabase_service_key: { type: 'string', description: 'Service role key (optional)' },
            database_url: { type: 'string', description: 'Database URL (optional)' },
          },
        },
      },
      {
        name: 'codebakers_setup_vercel',
        description: 'Setup Vercel deployment with OAuth - link project for deployment',
        inputSchema: {
          type: 'object',
          properties: {
            mode: { type: 'string', enum: ['link', 'skip'], description: 'Setup mode' },
            project_name: { type: 'string', description: 'Project name (optional)' },
            production_branch: { type: 'string', description: 'Production branch (default: main)' },
          },
        },
      },
      // v5.4.0: Context-Aware Consulting
      {
        name: 'codebakers_consult',
        description: 'Context-aware consulting & guidance - provides intelligent answers based on project state, architecture decisions, dependencies, errors, and tech stack',
        inputSchema: {
          type: 'object',
          properties: {
            question: { type: 'string', description: 'Your question (e.g., "How should I handle user permissions?")' },
            include_code_examples: { type: 'boolean', description: 'Include code examples in answer (default: true)' },
            focus_area: { type: 'string', enum: ['architecture', 'security', 'performance', 'ui', 'data', 'testing', 'deployment'], description: 'Optional focus area' },
          },
          required: ['question'],
        },
      },
    ],
  };
});

/**
 * Handle tool calls
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  const tool = tools[name as keyof typeof tools];

  if (!tool) {
    throw new Error(`Unknown tool: ${name}`);
  }

  try {
    const result = await tool(args || {});

    return {
      content: [
        {
          type: 'text',
          text: typeof result === 'string' ? result : JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: 'text',
          text: `Error in ${name}: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
});

/**
 * Start server
 */
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error('🍞 CodeBakers MCP Server v5.4.0 started');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
