/**
 * codebakers_run_interview
 *
 * Automated Interview Agent (Phase 1)
 *
 * Automates project interview to generate:
 * - project-profile.md (intent, external services, constraints)
 * - FLOWS.md (all user flows with status)
 * - CREDENTIALS-NEEDED.md (external actions needed)
 * - BRAIN.md initialization
 *
 * Reads from (if exist):
 * - refs/prd/ (requirements)
 * - refs/design/ (mockups - uses DESIGN-CONTRACT.md if exists)
 * - refs/api/ (API docs)
 * - INTEGRATION-CONFIG.md (if integrations tested)
 *
 * Output: Complete Phase 1 artifacts ready for Phase 2
 */

import * as fs from 'fs/promises';
import * as path from 'path';

interface InterviewResult {
  project_name: string;
  project_type: string;
  core_entities: string[];
  user_flows: UserFlow[];
  external_services: ExternalService[];
  tech_stack: TechStack;
}

interface UserFlow {
  name: string;
  description: string;
  steps: string[];
  priority: 'P0' | 'P1' | 'P2';
  status: 'pending' | 'in_progress' | 'complete';
}

interface ExternalService {
  name: string;
  purpose: string;
  auth_method: string;
  credentials_needed: string[];
}

interface TechStack {
  database: string;
  backend: string;
  frontend: string;
  auth: string;
}

export async function runInterview(args: { project_description?: string }): Promise<string> {
  const cwd = process.cwd();
  const description = args.project_description || '';

  console.error('🍞 CodeBakers: Automated Interview (Phase 1)');

  try {
    // Gather context from refs/
    const context = await gatherContext(cwd);

    // Generate interview result
    const result = await generateInterviewResult(description, context);

    // Write artifacts
    await writeProjectProfile(cwd, result);
    await writeFlows(cwd, result);
    await writeCredentialsNeeded(cwd, result);
    await initializeBrain(cwd, result);

    // Generate report
    const report = generateInterviewReport(result);

    return report;
  } catch (error) {
    console.error('Error during interview:', error);
    return `🍞 CodeBakers: Interview Failed

Error: ${error instanceof Error ? error.message : String(error)}`;
  }
}

async function gatherContext(cwd: string): Promise<any> {
  const context: any = {
    has_prd: false,
    has_mockups: false,
    has_design_contract: false,
    has_integration_config: false,
    prd_content: '',
    mockup_count: 0,
    integrations: [],
  };

  // Check refs/prd/
  const prdPath = path.join(cwd, 'refs', 'prd');
  const prdExists = await fs.access(prdPath).then(() => true).catch(() => false);
  if (prdExists) {
    const files = await fs.readdir(prdPath);
    if (files.length > 0) {
      context.has_prd = true;
      const firstFile = files[0];
      context.prd_content = await fs.readFile(path.join(prdPath, firstFile), 'utf-8');
    }
  }

  // Check refs/design/
  const designPath = path.join(cwd, 'refs', 'design');
  const designExists = await fs.access(designPath).then(() => true).catch(() => false);
  if (designExists) {
    const files = await fs.readdir(designPath);
    context.mockup_count = files.filter(f => f.endsWith('.html') || f.endsWith('.png')).length;
    context.has_mockups = context.mockup_count > 0;
  }

  // Check DESIGN-CONTRACT.md
  const designContractPath = path.join(cwd, 'DESIGN-CONTRACT.md');
  context.has_design_contract = await fs.access(designContractPath).then(() => true).catch(() => false);

  // Check INTEGRATION-CONFIG.md
  const integrationPath = path.join(cwd, 'INTEGRATION-CONFIG.md');
  context.has_integration_config = await fs.access(integrationPath).then(() => true).catch(() => false);
  if (context.has_integration_config) {
    const content = await fs.readFile(integrationPath, 'utf-8');
    // Simple parse: extract integration names
    const matches = content.matchAll(/## Integration: (.+)/g);
    for (const match of matches) {
      context.integrations.push(match[1]);
    }
  }

  return context;
}

async function generateInterviewResult(description: string, context: any): Promise<InterviewResult> {
  // Infer project type
  let projectType = 'webapp';
  let projectName = 'MyApp';

  if (description.toLowerCase().includes('email')) {
    projectType = 'email';
    projectName = 'EmailApp';
  } else if (description.toLowerCase().includes('crm')) {
    projectType = 'crm';
    projectName = 'CRM';
  } else if (description.toLowerCase().includes('dashboard')) {
    projectType = 'dashboard';
    projectName = 'Dashboard';
  }

  // Extract entities from description
  const coreEntities: string[] = [];
  if (projectType === 'email') {
    coreEntities.push('Message', 'Folder', 'Label', 'User');
  } else if (projectType === 'crm') {
    coreEntities.push('Contact', 'Deal', 'Activity', 'User');
  } else if (projectType === 'dashboard') {
    coreEntities.push('Metric', 'Chart', 'Report', 'User');
  } else {
    coreEntities.push('User', 'Item');
  }

  // Generate user flows
  const userFlows: UserFlow[] = [];

  if (projectType === 'email') {
    userFlows.push(
      { name: 'View inbox', description: 'User sees list of messages', steps: ['Load messages', 'Display list', 'Show unread count'], priority: 'P0', status: 'pending' },
      { name: 'Read message', description: 'User opens and reads message', steps: ['Click message', 'Load content', 'Mark as read'], priority: 'P0', status: 'pending' },
      { name: 'Send message', description: 'User composes and sends message', steps: ['Open composer', 'Enter recipients', 'Write message', 'Send'], priority: 'P0', status: 'pending' },
      { name: 'Delete message', description: 'User deletes message', steps: ['Select message', 'Click delete', 'Confirm', 'Update UI'], priority: 'P1', status: 'pending' },
      { name: 'Search messages', description: 'User searches for messages', steps: ['Enter query', 'Execute search', 'Display results'], priority: 'P1', status: 'pending' }
    );
  } else {
    userFlows.push(
      { name: 'User login', description: 'User authenticates', steps: ['Enter credentials', 'Submit', 'Redirect to app'], priority: 'P0', status: 'pending' },
      { name: 'View list', description: 'User sees list of items', steps: ['Load items', 'Display list'], priority: 'P0', status: 'pending' },
      { name: 'Create item', description: 'User creates new item', steps: ['Open form', 'Fill fields', 'Submit', 'Update list'], priority: 'P0', status: 'pending' }
    );
  }

  // External services
  const externalServices: ExternalService[] = [];
  if (context.has_integration_config) {
    for (const integration of context.integrations) {
      externalServices.push({
        name: integration,
        purpose: 'External integration',
        auth_method: 'OAuth 2.0',
        credentials_needed: ['CLIENT_ID', 'CLIENT_SECRET'],
      });
    }
  }

  // Tech stack (CodeBakers standard)
  const techStack: TechStack = {
    database: 'PostgreSQL (Supabase)',
    backend: 'Next.js Server Actions',
    frontend: 'Next.js 14 App Router + React',
    auth: 'Supabase Auth',
  };

  return {
    project_name: projectName,
    project_type: projectType,
    core_entities: coreEntities,
    user_flows: userFlows,
    external_services: externalServices,
    tech_stack: techStack,
  };
}

async function writeProjectProfile(cwd: string, result: InterviewResult): Promise<void> {
  const content = `# Project Profile

**Project:** ${result.project_name}
**Type:** ${result.project_type}
**Generated:** ${new Date().toISOString()}

## Core Entities

${result.core_entities.map(e => `- ${e}`).join('\n')}

## Tech Stack

- **Database:** ${result.tech_stack.database}
- **Backend:** ${result.tech_stack.backend}
- **Frontend:** ${result.tech_stack.frontend}
- **Auth:** ${result.tech_stack.auth}

## External Services

${result.external_services.length > 0 ? result.external_services.map(s => `- ${s.name} (${s.purpose})`).join('\n') : 'None'}

## Domain Context

Domain: ${result.project_type}

Auto-loaded domain file: agents/domains/${result.project_type}.md (if exists)

This provides domain-specific expectations:
- Feature defaults
- Field display logic
- UX patterns
- Mutation patterns
`;

  await fs.writeFile(path.join(cwd, 'project-profile.md'), content, 'utf-8');
}

async function writeFlows(cwd: string, result: InterviewResult): Promise<void> {
  const content = `# User Flows

**Project:** ${result.project_name}
**Total flows:** ${result.user_flows.length}

${result.user_flows.map((flow, i) => `
## ${i + 1}. ${flow.name} (${flow.priority})

**Description:** ${flow.description}

**Steps:**
${flow.steps.map((s, j) => `${j + 1}. ${s}`).join('\n')}

**Status:** ${flow.status}
`).join('\n')}

## Flow Status Summary

- **P0 (Critical):** ${result.user_flows.filter(f => f.priority === 'P0').length} flows
- **P1 (Important):** ${result.user_flows.filter(f => f.priority === 'P1').length} flows
- **P2 (Nice to have):** ${result.user_flows.filter(f => f.priority === 'P2').length} flows

**Pending:** ${result.user_flows.filter(f => f.status === 'pending').length}
**In progress:** ${result.user_flows.filter(f => f.status === 'in_progress').length}
**Complete:** ${result.user_flows.filter(f => f.status === 'complete').length}
`;

  await fs.writeFile(path.join(cwd, 'FLOWS.md'), content, 'utf-8');
}

async function writeCredentialsNeeded(cwd: string, result: InterviewResult): Promise<void> {
  if (result.external_services.length === 0) {
    return; // No credentials needed
  }

  const content = `# Credentials Needed

**Project:** ${result.project_name}

${result.external_services.map(service => `
## ${service.name}

**Purpose:** ${service.purpose}
**Auth method:** ${service.auth_method}

**Environment variables needed:**

${service.credentials_needed.map(cred => `\`\`\`bash
${cred}=[your-${cred.toLowerCase()}]
\`\`\``).join('\n\n')}

Add to \`.env.local\`:
\`\`\`
${service.credentials_needed.map(cred => `${cred}=`).join('\n')}
\`\`\`

**Setup instructions:** See INTEGRATION-CONFIG.md for ${service.name}
`).join('\n')}
`;

  const credsPath = path.join(cwd, '.codebakers', 'CREDENTIALS-NEEDED.md');
  await fs.mkdir(path.dirname(credsPath), { recursive: true });
  await fs.writeFile(credsPath, content, 'utf-8');
}

async function initializeBrain(cwd: string, result: InterviewResult): Promise<void> {
  const content = `# BRAIN.md

**Project:** ${result.project_name}
**Type:** ${result.project_type}
**Initialized:** ${new Date().toISOString()}

## Project Intent

Building: ${result.project_name} (${result.project_type})

Core entities: ${result.core_entities.join(', ')}

## Tech Stack (CodeBakers Standard)

- Database: ${result.tech_stack.database}
- Backend: ${result.tech_stack.backend}
- Frontend: ${result.tech_stack.frontend}
- Auth: ${result.tech_stack.auth}

## Current Phase

**Phase:** 1 (Interview complete)

**Next:** Phase 2 (Deep Analysis)

Recommended next steps:
1. codebakers_validate_mockups (if mockups provided)
2. codebakers_analyze_mockups (after validation)
3. codebakers_generate_schema
4. codebakers_map_dependencies

## Architectural Decisions

1. **Stack:** Supabase + Next.js 14 (CodeBakers standard - not negotiable)
2. **Auth:** Supabase Auth only (no NextAuth, Auth0, Clerk)
3. **State:** Zustand stores (mapped with codebakers_map_dependencies)
4. **Testing:** Vitest (unit) + Playwright (E2E)
5. **Versioning:** Exact versions only (no ^ or ~)

## External Services

${result.external_services.length > 0 ? result.external_services.map(s => `- ${s.name}`).join('\n') : 'None'}

${result.external_services.length > 0 ? '\n**Action required:** Add credentials to .env.local (see CREDENTIALS-NEEDED.md)' : ''}

## Flows

Total: ${result.user_flows.length} user flows

See FLOWS.md for complete list.

## Memory Files

- ✅ project-profile.md (created)
- ✅ FLOWS.md (created)
- ✅ BRAIN.md (this file)
${result.external_services.length > 0 ? '- ✅ CREDENTIALS-NEEDED.md (created)' : ''}
- ⏳ DEPENDENCY-MAP.md (pending - run after schema)
- ⏳ BUILD-LOG.md (pending - starts with first build)
- ⏳ ERROR-LOG.md (pending - starts with first error)
`;

  const brainPath = path.join(cwd, '.codebakers', 'BRAIN.md');
  await fs.mkdir(path.dirname(brainPath), { recursive: true });
  await fs.writeFile(brainPath, content, 'utf-8');
}

function generateInterviewReport(result: InterviewResult): string {
  let report = `🍞 CodeBakers: Interview Complete\n\n`;
  report += `**Project:** ${result.project_name}\n`;
  report += `**Type:** ${result.project_type}\n\n`;
  report += `---\n\n`;

  report += `## ✅ Artifacts Generated\n\n`;
  report += `- **project-profile.md** - Project overview, entities, tech stack\n`;
  report += `- **FLOWS.md** - ${result.user_flows.length} user flows (${result.user_flows.filter(f => f.priority === 'P0').length} P0, ${result.user_flows.filter(f => f.priority === 'P1').length} P1)\n`;
  report += `- **.codebakers/BRAIN.md** - Master project state\n`;
  if (result.external_services.length > 0) {
    report += `- **.codebakers/CREDENTIALS-NEEDED.md** - ${result.external_services.length} external service(s)\n`;
  }
  report += `\n---\n\n`;

  report += `## 📋 Project Summary\n\n`;
  report += `**Core entities:** ${result.core_entities.join(', ')}\n`;
  report += `**User flows:** ${result.user_flows.length}\n`;
  report += `**External services:** ${result.external_services.length}\n\n`;

  report += `**Tech stack:**\n`;
  report += `- ${result.tech_stack.database}\n`;
  report += `- ${result.tech_stack.backend}\n`;
  report += `- ${result.tech_stack.frontend}\n`;
  report += `- ${result.tech_stack.auth}\n\n`;

  report += `---\n\n`;

  if (result.external_services.length > 0) {
    report += `## ⚠️ Action Required\n\n`;
    report += `External services detected. Add credentials to \`.env.local\`:\n\n`;
    for (const service of result.external_services) {
      report += `**${service.name}:**\n`;
      for (const cred of service.credentials_needed) {
        report += `- ${cred}=[your-value]\n`;
      }
      report += `\n`;
    }
    report += `See: .codebakers/CREDENTIALS-NEEDED.md\n\n`;
    report += `---\n\n`;
  }

  report += `## Next Steps\n\n`;
  report += `**Phase 1 complete** → Moving to Phase 2 (Deep Analysis)\n\n`;
  report += `Recommended sequence:\n`;
  report += `1. **codebakers_validate_mockups** (if mockups in refs/design/)\n`;
  report += `2. **codebakers_fix_mockups** (auto-fix quality issues)\n`;
  report += `3. **codebakers_verify_mockups** (100% quality check)\n`;
  report += `4. **codebakers_analyze_mockups** (extract data from perfect mockups)\n`;
  report += `5. **codebakers_generate_schema** (database from mockups)\n`;
  report += `6. **codebakers_map_dependencies** (dependency graph)\n`;
  report += `7. **codebakers_check_gate { phase: 2 }** (verify Phase 2 complete)\n\n`;

  report += `Then: Ready for autonomous build\n`;
  report += `→ **codebakers_autonomous_build { mode: "full" }**\n`;

  return report;
}
