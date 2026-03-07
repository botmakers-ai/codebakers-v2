/**
 * codebakers_generate_spec
 *
 * Phase 0: Generate PROJECT-SPEC.md with Gates 0-5
 *
 * Gates:
 * - Gate 0: Identity (Product name, mission, target user, value proposition)
 * - Gate 1: Entities (All data objects the system must track)
 * - Gate 2: State Changes (Every action that mutates data)
 * - Gate 3: Permissions (Who can do what, role matrix)
 * - Gate 4: Dependencies (External services, APIs, automation flows)
 * - Gate 5: Integrations (Third-party connections, webhooks, data sync)
 */

import * as fs from 'fs/promises';
import * as path from 'path';

interface Gate0 {
  product_name: string;
  mission: string;
  target_user: string;
  value_proposition: string;
}

interface Gate1Entity {
  name: string;
  description: string;
  core_fields: string[];
}

interface Gate2StateChange {
  action: string;
  affects_entity: string;
  mutation_type: 'create' | 'update' | 'delete';
  description: string;
}

interface Gate3Permission {
  role: string;
  can_create: string[];
  can_read: string[];
  can_update: string[];
  can_delete: string[];
}

interface Gate4Dependency {
  service: string;
  purpose: string;
  required: boolean;
  api_or_library: string;
}

interface Gate5Integration {
  name: string;
  type: 'webhook' | 'api' | 'oauth' | 'sync';
  purpose: string;
  data_flow: 'inbound' | 'outbound' | 'bidirectional';
}

export async function generateSpec(args: { description?: string; project_name?: string }): Promise<string> {
  const { description, project_name } = args;

  if (!description) {
    return `🍞 CodeBakers: Phase 0 - Spec Generation

Please provide a description of what you want to build.

Example:
{
  "description": "Email client for Microsoft 365 with inbox, compose, and search",
  "project_name": "EmailFlow"
}

Then I'll generate a complete PROJECT-SPEC.md with Gates 0-5.`;
  }

  const cwd = process.cwd();

  console.error('🍞 CodeBakers: Phase 0 — Spec Generation');
  console.error(`Generating spec for: ${description}`);

  try {
    // 1. INFER PROJECT DETAILS FROM DESCRIPTION
    const gate0 = inferGate0(description, project_name);
    const gate1 = inferGate1(description, gate0);
    const gate2 = inferGate2(gate1);
    const gate3 = inferGate3(gate1);
    const gate4 = inferGate4(description);
    const gate5 = inferGate5(description);

    console.error(`Gate 0: ${gate0.product_name}`);
    console.error(`Gate 1: ${gate1.length} entities identified`);
    console.error(`Gate 2: ${gate2.length} state changes mapped`);
    console.error(`Gate 3: ${gate3.length} roles defined`);
    console.error(`Gate 4: ${gate4.length} dependencies identified`);
    console.error(`Gate 5: ${gate5.length} integrations mapped`);

    // 2. GENERATE PROJECT-SPEC.md
    const specContent = generateSpecDocument(gate0, gate1, gate2, gate3, gate4, gate5);
    const specPath = path.join(cwd, '.codebakers', 'PROJECT-SPEC.md');

    // Ensure .codebakers folder exists
    await fs.mkdir(path.join(cwd, '.codebakers'), { recursive: true });
    await fs.writeFile(specPath, specContent, 'utf-8');

    console.error(`✓ Spec written: ${specPath}`);

    // 3. GENERATE BUILD-STATE.md (initialize project state)
    const buildStateContent = generateBuildState(gate0);
    const buildStatePath = path.join(cwd, '.codebakers', 'BUILD-STATE.md');
    await fs.writeFile(buildStatePath, buildStateContent, 'utf-8');

    console.error(`✓ Build state initialized: ${buildStatePath}`);

    const summary = generateSpecSummary(gate0, gate1, gate2, gate3, gate4, gate5);

    return `🍞 CodeBakers: Phase 0 - Spec Generation Complete

${summary}

📄 Spec written to: .codebakers/PROJECT-SPEC.md
📄 Build state initialized: .codebakers/BUILD-STATE.md

Specification includes:
✓ Gate 0: Identity (product name, mission, target user, value prop)
✓ Gate 1: ${gate1.length} entities identified
✓ Gate 2: ${gate2.length} state changes mapped
✓ Gate 3: ${gate3.length} roles with permissions
✓ Gate 4: ${gate4.length} external dependencies
✓ Gate 5: ${gate5.length} integrations

Next steps:
1. Review PROJECT-SPEC.md to verify all requirements
2. Add/modify entities, permissions, or integrations as needed
3. When ready, proceed to Phase 1: UI Mockup & Design
4. Use: codebakers_init_session to resume project`;
  } catch (error) {
    console.error('Error during spec generation:', error);
    return `🍞 CodeBakers: Phase 0 - Spec Generation Failed

Error: ${error instanceof Error ? error.message : String(error)}

Please check:
- Description is clear and specific
- Project directory exists and is writable
- File permissions allow writing

If issue persists, log to ERROR-LOG.md and request human assistance.`;
  }
}

/**
 * Infer Gate 0 from description
 */
function inferGate0(description: string, projectName?: string): Gate0 {
  // Extract key information from description
  const lowerDesc = description.toLowerCase();

  let product = projectName || 'New Project';
  let mission = description;
  let targetUser = 'General users';
  let valueProp = 'Solves user needs efficiently';

  // Infer product type from keywords
  if (lowerDesc.includes('email')) {
    product = projectName || 'EmailApp';
    mission = `Email client application: ${description}`;
    targetUser = 'Business professionals managing email';
    valueProp = 'Streamlined email management with productivity features';
  } else if (lowerDesc.includes('crm') || lowerDesc.includes('sales')) {
    product = projectName || 'CRMPro';
    mission = `CRM/Sales platform: ${description}`;
    targetUser = 'Sales teams and customer success managers';
    valueProp = 'Complete customer relationship management and sales tracking';
  } else if (lowerDesc.includes('dashboard') || lowerDesc.includes('analytics')) {
    product = projectName || 'DashboardApp';
    mission = `Analytics dashboard: ${description}`;
    targetUser = 'Business users analyzing data';
    valueProp = 'Data visualization and insights at a glance';
  } else if (lowerDesc.includes('ecommerce') || lowerDesc.includes('store')) {
    product = projectName || 'StoreApp';
    mission = `E-commerce platform: ${description}`;
    targetUser = 'Online shoppers and store owners';
    valueProp = 'Seamless online shopping experience';
  }

  return {
    product_name: product,
    mission: mission,
    target_user: targetUser,
    value_proposition: valueProp,
  };
}

/**
 * Infer Gate 1 entities from description
 */
function inferGate1(description: string, gate0: Gate0): Gate1Entity[] {
  const entities: Gate1Entity[] = [];
  const lowerDesc = description.toLowerCase();

  // Always include User entity
  entities.push({
    name: 'User',
    description: 'System user account',
    core_fields: ['id', 'email', 'name', 'created_at'],
  });

  // Infer entities based on description keywords
  if (lowerDesc.includes('email') || lowerDesc.includes('message')) {
    entities.push({
      name: 'Message',
      description: 'Email message',
      core_fields: ['id', 'from', 'to', 'subject', 'body', 'sent_at', 'user_id'],
    });
    entities.push({
      name: 'Folder',
      description: 'Email folder (inbox, sent, drafts, etc.)',
      core_fields: ['id', 'name', 'user_id'],
    });
  }

  if (lowerDesc.includes('crm') || lowerDesc.includes('contact') || lowerDesc.includes('customer')) {
    entities.push({
      name: 'Contact',
      description: 'Customer contact',
      core_fields: ['id', 'name', 'email', 'phone', 'company', 'user_id'],
    });
    entities.push({
      name: 'Deal',
      description: 'Sales opportunity',
      core_fields: ['id', 'title', 'value', 'stage', 'contact_id', 'user_id'],
    });
  }

  if (lowerDesc.includes('task') || lowerDesc.includes('todo')) {
    entities.push({
      name: 'Task',
      description: 'User task or todo item',
      core_fields: ['id', 'title', 'description', 'status', 'due_date', 'user_id'],
    });
  }

  if (lowerDesc.includes('post') || lowerDesc.includes('article') || lowerDesc.includes('blog')) {
    entities.push({
      name: 'Post',
      description: 'Content post or article',
      core_fields: ['id', 'title', 'content', 'status', 'published_at', 'user_id'],
    });
  }

  if (lowerDesc.includes('product') || lowerDesc.includes('ecommerce') || lowerDesc.includes('store')) {
    entities.push({
      name: 'Product',
      description: 'Store product',
      core_fields: ['id', 'name', 'description', 'price', 'stock', 'user_id'],
    });
    entities.push({
      name: 'Order',
      description: 'Customer order',
      core_fields: ['id', 'total', 'status', 'user_id', 'created_at'],
    });
  }

  return entities;
}

/**
 * Infer Gate 2 state changes from entities
 */
function inferGate2(entities: Gate1Entity[]): Gate2StateChange[] {
  const stateChanges: Gate2StateChange[] = [];

  for (const entity of entities) {
    // Create
    stateChanges.push({
      action: `create${entity.name}`,
      affects_entity: entity.name,
      mutation_type: 'create',
      description: `Create new ${entity.name.toLowerCase()}`,
    });

    // Update
    stateChanges.push({
      action: `update${entity.name}`,
      affects_entity: entity.name,
      mutation_type: 'update',
      description: `Update existing ${entity.name.toLowerCase()}`,
    });

    // Delete
    stateChanges.push({
      action: `delete${entity.name}`,
      affects_entity: entity.name,
      mutation_type: 'delete',
      description: `Delete ${entity.name.toLowerCase()}`,
    });
  }

  return stateChanges;
}

/**
 * Infer Gate 3 permissions
 */
function inferGate3(entities: Gate1Entity[]): Gate3Permission[] {
  const entityNames = entities.map(e => e.name);

  const permissions: Gate3Permission[] = [
    {
      role: 'Owner',
      can_create: entityNames,
      can_read: entityNames,
      can_update: entityNames,
      can_delete: entityNames,
    },
    {
      role: 'Member',
      can_create: entityNames.filter(e => e !== 'User'),
      can_read: entityNames,
      can_update: entityNames.filter(e => e !== 'User'),
      can_delete: [],
    },
    {
      role: 'Viewer',
      can_create: [],
      can_read: entityNames,
      can_update: [],
      can_delete: [],
    },
  ];

  return permissions;
}

/**
 * Infer Gate 4 dependencies
 */
function inferGate4(description: string): Gate4Dependency[] {
  const dependencies: Gate4Dependency[] = [];
  const lowerDesc = description.toLowerCase();

  // Always include base stack
  dependencies.push({
    service: 'Supabase',
    purpose: 'Database + Auth + Storage',
    required: true,
    api_or_library: '@supabase/supabase-js',
  });

  dependencies.push({
    service: 'Next.js',
    purpose: 'React framework',
    required: true,
    api_or_library: 'next',
  });

  dependencies.push({
    service: 'Vercel',
    purpose: 'Deployment platform',
    required: true,
    api_or_library: 'N/A (hosting)',
  });

  // Infer additional dependencies
  if (lowerDesc.includes('email')) {
    dependencies.push({
      service: 'Microsoft Graph API',
      purpose: 'Email integration',
      required: true,
      api_or_library: '@microsoft/microsoft-graph-client',
    });
  }

  if (lowerDesc.includes('payment') || lowerDesc.includes('stripe')) {
    dependencies.push({
      service: 'Stripe',
      purpose: 'Payment processing',
      required: true,
      api_or_library: 'stripe',
    });
  }

  return dependencies;
}

/**
 * Infer Gate 5 integrations
 */
function inferGate5(description: string): Gate5Integration[] {
  const integrations: Gate5Integration[] = [];
  const lowerDesc = description.toLowerCase();

  if (lowerDesc.includes('email')) {
    integrations.push({
      name: 'Microsoft 365 Email Sync',
      type: 'oauth',
      purpose: 'Sync user emails from Microsoft 365',
      data_flow: 'bidirectional',
    });
  }

  if (lowerDesc.includes('calendar')) {
    integrations.push({
      name: 'Calendar Sync',
      type: 'api',
      purpose: 'Sync calendar events',
      data_flow: 'bidirectional',
    });
  }

  return integrations;
}

/**
 * Generate PROJECT-SPEC.md document
 */
function generateSpecDocument(
  gate0: Gate0,
  gate1: Gate1Entity[],
  gate2: Gate2StateChange[],
  gate3: Gate3Permission[],
  gate4: Gate4Dependency[],
  gate5: Gate5Integration[]
): string {
  let doc = `# Project Specification\n\n`;
  doc += `**Generated:** ${new Date().toISOString()}\n`;
  doc += `**Phase:** 0 - Specification\n`;
  doc += `**Status:** Draft (ready for review)\n\n`;
  doc += `---\n\n`;

  // Gate 0
  doc += `## Gate 0: Identity\n\n`;
  doc += `### Product Name\n${gate0.product_name}\n\n`;
  doc += `### Mission\n${gate0.mission}\n\n`;
  doc += `### Target User\n${gate0.target_user}\n\n`;
  doc += `### Value Proposition\n${gate0.value_proposition}\n\n`;
  doc += `---\n\n`;

  // Gate 1
  doc += `## Gate 1: Entities\n\n`;
  doc += `All data objects the system must track:\n\n`;
  for (const entity of gate1) {
    doc += `### ${entity.name}\n\n`;
    doc += `${entity.description}\n\n`;
    doc += `**Core Fields:**\n`;
    for (const field of entity.core_fields) {
      doc += `- ${field}\n`;
    }
    doc += `\n`;
  }
  doc += `---\n\n`;

  // Gate 2
  doc += `## Gate 2: State Changes\n\n`;
  doc += `Every action that mutates data:\n\n`;
  doc += `| Action | Affects Entity | Type | Description |\n`;
  doc += `|--------|----------------|------|-------------|\n`;
  for (const change of gate2) {
    doc += `| ${change.action} | ${change.affects_entity} | ${change.mutation_type} | ${change.description} |\n`;
  }
  doc += `\n---\n\n`;

  // Gate 3
  doc += `## Gate 3: Permissions\n\n`;
  doc += `Role-based access control:\n\n`;
  for (const perm of gate3) {
    doc += `### ${perm.role}\n\n`;
    doc += `- **Can Create:** ${perm.can_create.join(', ') || 'None'}\n`;
    doc += `- **Can Read:** ${perm.can_read.join(', ') || 'None'}\n`;
    doc += `- **Can Update:** ${perm.can_update.join(', ') || 'None'}\n`;
    doc += `- **Can Delete:** ${perm.can_delete.join(', ') || 'None'}\n\n`;
  }
  doc += `---\n\n`;

  // Gate 4
  doc += `## Gate 4: Dependencies\n\n`;
  doc += `External services and libraries:\n\n`;
  doc += `| Service | Purpose | Required | API/Library |\n`;
  doc += `|---------|---------|----------|-------------|\n`;
  for (const dep of gate4) {
    doc += `| ${dep.service} | ${dep.purpose} | ${dep.required ? 'Yes' : 'No'} | ${dep.api_or_library} |\n`;
  }
  doc += `\n---\n\n`;

  // Gate 5
  if (gate5.length > 0) {
    doc += `## Gate 5: Integrations\n\n`;
    doc += `Third-party integrations:\n\n`;
    doc += `| Integration | Type | Purpose | Data Flow |\n`;
    doc += `|-------------|------|---------|-----------||\n`;
    for (const integration of gate5) {
      doc += `| ${integration.name} | ${integration.type} | ${integration.purpose} | ${integration.data_flow} |\n`;
    }
    doc += `\n---\n\n`;
  }

  doc += `## Verification\n\n`;
  doc += `- [ ] All Gates 0-5 complete\n`;
  doc += `- [ ] All entities identified\n`;
  doc += `- [ ] All state changes mapped\n`;
  doc += `- [ ] All permissions defined\n`;
  doc += `- [ ] All dependencies identified\n`;
  doc += `- [ ] Human reviewed and approved\n\n`;

  return doc;
}

/**
 * Generate BUILD-STATE.md
 */
function generateBuildState(gate0: Gate0): string {
  let doc = `# Build State\n\n`;
  doc += `**Project:** ${gate0.product_name}\n`;
  doc += `**Current Phase:** 0 - Specification\n`;
  doc += `**Current Task:** Review and approve PROJECT-SPEC.md\n`;
  doc += `**Last Updated:** ${new Date().toISOString()}\n\n`;
  doc += `## Phase Progress\n\n`;
  doc += `- [x] Phase 0: Specification (current)\n`;
  doc += `- [ ] Phase 1: UI Mockup & Design\n`;
  doc += `- [ ] Phase 2: Mock Analysis & Schema\n`;
  doc += `- [ ] Phase 3: Foundation Build\n`;
  doc += `- [ ] Phase 4: Feature Build\n`;
  doc += `- [ ] Phase 5: Testing & Verification\n`;
  doc += `- [ ] Phase 6: Deployment & Ops\n\n`;
  doc += `## Next Steps\n\n`;
  doc += `1. Review PROJECT-SPEC.md\n`;
  doc += `2. Make any necessary adjustments\n`;
  doc += `3. Proceed to Phase 1 when ready\n\n`;

  return doc;
}

/**
 * Generate summary
 */
function generateSpecSummary(
  gate0: Gate0,
  gate1: Gate1Entity[],
  gate2: Gate2StateChange[],
  gate3: Gate3Permission[],
  gate4: Gate4Dependency[],
  gate5: Gate5Integration[]
): string {
  let summary = `Project: ${gate0.product_name}\n`;
  summary += `✓ ${gate1.length} entities identified\n`;
  summary += `✓ ${gate2.length} state changes mapped\n`;
  summary += `✓ ${gate3.length} roles with permissions\n`;
  summary += `✓ ${gate4.length} external dependencies\n`;
  if (gate5.length > 0) {
    summary += `✓ ${gate5.length} integrations configured\n`;
  }

  return summary;
}
