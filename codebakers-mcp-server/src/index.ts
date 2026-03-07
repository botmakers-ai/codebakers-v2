#!/usr/bin/env node

/**
 * CodeBakers MCP Server v5.0.0
 *
 * Complete implementation of the CodeBakers Method:
 * - 7-phase development workflow
 * - Comprehensive dependency mapping
 * - Self-aware proactive guidance
 * - Technical enforcement via MCP
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

const server = new Server(
  {
    name: 'codebakers',
    version: '5.0.0',
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

  // Phase 2: Analysis & Schema
  codebakers_analyze_mockups_deep: analyzeMockupsDeep,
  codebakers_generate_schema: generateSchema,
  codebakers_map_dependencies: mapDependencies,
  codebakers_generate_store_contracts: generateStoreContracts,

  // Phase Verification
  codebakers_check_gate: checkGate,

  // Feature Building
  codebakers_enforce_feature: enforceFeature,

  // Enforcement
  codebakers_fix_commit: fixCommit,
  codebakers_check_scope: checkScope,
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

  console.error('🍞 CodeBakers MCP Server v5.0.0 started');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
