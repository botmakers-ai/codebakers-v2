/**
 * codebakers_consult
 *
 * Context-Aware Consulting & Guidance
 *
 * Provides intelligent consulting based on full project context:
 * - Current project state (BRAIN.md)
 * - Architecture decisions (ASSUMPTIONS.md)
 * - Dependencies (DEPENDENCY-MAP.md)
 * - Past errors and learnings (ERROR-LOG.md)
 * - User flows (FLOWS.md)
 * - Tech stack (Supabase + Next.js)
 * - Domain context (project-profile.md)
 *
 * Unlike generic AI responses, this tool provides answers specific to:
 * - Your project's current state
 * - Your existing architecture
 * - Patterns that have worked (or failed) in your project
 * - Your tech stack constraints
 */

import * as fs from 'fs/promises';
import * as path from 'path';

interface ConsultArgs {
  question: string;
  include_code_examples?: boolean; // Include code examples in answer (default: true)
  focus_area?: 'architecture' | 'security' | 'performance' | 'ui' | 'data' | 'testing' | 'deployment'; // Optional focus
}

interface ProjectContext {
  brain?: string;
  assumptions?: string;
  dependencies?: string;
  errors?: string;
  flows?: string;
  profile?: string;
  buildLog?: string;
  hasSupabase: boolean;
  hasNextJs: boolean;
  hasPrisma: boolean;
  domain?: string;
  entities: string[];
  recentDecisions: string[];
  recentErrors: string[];
}

export async function consult(args: ConsultArgs): Promise<string> {
  const cwd = process.cwd();
  const { question, include_code_examples = true, focus_area } = args;

  console.error('🍞 CodeBakers: Context-Aware Consulting');

  try {
    if (!question || question.trim().length === 0) {
      return `🍞 CodeBakers: Consulting Mode\n\n**Ask me anything about your project:**\n\ncodebakers_consult({ question: "How should I handle user permissions?" })\ncodebakers_consult({ question: "What's the best way to implement search?" })\ncodebakers_consult({ question: "Explain this error: [paste error]" })\n\n**I'll provide context-aware answers based on:**\n- Your current project state\n- Your tech stack (Supabase + Next.js)\n- Your architecture decisions\n- Patterns from your ERROR-LOG.md\n- Your existing entities and flows`;
    }

    // Load full project context
    console.error('Loading project context...\n');
    const context = await loadProjectContext(cwd);

    // Analyze question and context
    const guidance = await generateGuidance(question, context, include_code_examples, focus_area);

    return guidance;
  } catch (error) {
    return `🍞 CodeBakers: Consulting Failed\n\nError: ${error instanceof Error ? error.message : String(error)}`;
  }
}

async function loadProjectContext(cwd: string): Promise<ProjectContext> {
  const context: ProjectContext = {
    entities: [],
    recentDecisions: [],
    recentErrors: [],
    hasSupabase: false,
    hasNextJs: false,
    hasPrisma: false
  };

  const codebakersDir = path.join(cwd, '.codebakers');

  // Load BRAIN.md
  try {
    const brainPath = path.join(codebakersDir, 'BRAIN.md');
    context.brain = await fs.readFile(brainPath, 'utf-8');
  } catch {
    // BRAIN.md doesn't exist
  }

  // Load ASSUMPTIONS.md
  try {
    const assumptionsPath = path.join(codebakersDir, 'ASSUMPTIONS.md');
    context.assumptions = await fs.readFile(assumptionsPath, 'utf-8');

    // Extract recent decisions (last 10)
    const decisions = context.assumptions.split('\n').filter(line => line.startsWith('## '));
    context.recentDecisions = decisions.slice(-10);
  } catch {
    // ASSUMPTIONS.md doesn't exist
  }

  // Load DEPENDENCY-MAP.md
  try {
    const depMapPath = path.join(codebakersDir, 'DEPENDENCY-MAP.md');
    context.dependencies = await fs.readFile(depMapPath, 'utf-8');
  } catch {
    // DEPENDENCY-MAP.md doesn't exist
  }

  // Load ERROR-LOG.md
  try {
    const errorLogPath = path.join(codebakersDir, 'ERROR-LOG.md');
    context.errors = await fs.readFile(errorLogPath, 'utf-8');

    // Extract recent errors (last 10)
    const errorEntries = context.errors.split('\n## ').slice(-10);
    context.recentErrors = errorEntries;
  } catch {
    // ERROR-LOG.md doesn't exist
  }

  // Load FLOWS.md
  try {
    const flowsPath = path.join(cwd, 'FLOWS.md');
    context.flows = await fs.readFile(flowsPath, 'utf-8');
  } catch {
    // FLOWS.md doesn't exist
  }

  // Load project-profile.md
  try {
    const profilePath = path.join(cwd, 'project-profile.md');
    context.profile = await fs.readFile(profilePath, 'utf-8');

    // Extract domain
    const domainMatch = context.profile.match(/domain:\s*(\w+)/i);
    if (domainMatch) {
      context.domain = domainMatch[1];
    }
  } catch {
    // project-profile.md doesn't exist
  }

  // Load BUILD-LOG.md (last 50 lines)
  try {
    const buildLogPath = path.join(codebakersDir, 'BUILD-LOG.md');
    const fullLog = await fs.readFile(buildLogPath, 'utf-8');
    const lines = fullLog.split('\n');
    context.buildLog = lines.slice(-50).join('\n');
  } catch {
    // BUILD-LOG.md doesn't exist
  }

  // Detect tech stack
  try {
    const packageJsonPath = path.join(cwd, 'package.json');
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));

    const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };
    context.hasSupabase = !!allDeps['@supabase/supabase-js'];
    context.hasNextJs = !!allDeps['next'];
    context.hasPrisma = !!allDeps['@prisma/client'];
  } catch {
    // package.json doesn't exist or can't be parsed
  }

  // Extract entities from BRAIN or FLOWS
  if (context.brain) {
    const entityMatches = context.brain.matchAll(/entity:\s*(\w+)/gi);
    for (const match of entityMatches) {
      if (!context.entities.includes(match[1])) {
        context.entities.push(match[1]);
      }
    }
  }

  return context;
}

async function generateGuidance(
  question: string,
  context: ProjectContext,
  includeExamples: boolean,
  focusArea?: string
): Promise<string> {
  let response = `🍞 CodeBakers: Consulting\n\n**Your Question:**\n${question}\n\n---\n\n`;

  // Context summary
  const contextItems: string[] = [];
  if (context.domain) contextItems.push(`Domain: ${context.domain}`);
  if (context.hasSupabase) contextItems.push('Stack: Supabase + Next.js');
  if (context.hasPrisma) contextItems.push('ORM: Prisma');
  if (context.entities.length > 0) contextItems.push(`Entities: ${context.entities.join(', ')}`);

  if (contextItems.length > 0) {
    response += `**Project Context:**\n${contextItems.map(item => `- ${item}`).join('\n')}\n\n---\n\n`;
  }

  // Analyze question type and provide relevant guidance
  const questionLower = question.toLowerCase();

  // Pattern matching for common question types
  if (questionLower.includes('permission') || questionLower.includes('auth') || questionLower.includes('security')) {
    response += await getSecurityGuidance(question, context, includeExamples);
  } else if (questionLower.includes('search') || questionLower.includes('filter') || questionLower.includes('query')) {
    response += await getSearchGuidance(question, context, includeExamples);
  } else if (questionLower.includes('real-time') || questionLower.includes('websocket') || questionLower.includes('live')) {
    response += await getRealtimeGuidance(question, context, includeExamples);
  } else if (questionLower.includes('performance') || questionLower.includes('slow') || questionLower.includes('optimize')) {
    response += await getPerformanceGuidance(question, context, includeExamples);
  } else if (questionLower.includes('error') || questionLower.includes('bug') || questionLower.includes('issue')) {
    response += await getErrorGuidance(question, context, includeExamples);
  } else if (questionLower.includes('deploy') || questionLower.includes('production') || questionLower.includes('vercel')) {
    response += await getDeploymentGuidance(question, context, includeExamples);
  } else if (questionLower.includes('test') || questionLower.includes('testing')) {
    response += await getTestingGuidance(question, context, includeExamples);
  } else if (questionLower.includes('ui') || questionLower.includes('component') || questionLower.includes('design')) {
    response += await getUIGuidance(question, context, includeExamples);
  } else {
    // General architectural guidance
    response += await getGeneralGuidance(question, context, includeExamples);
  }

  // Add relevant context from project
  if (context.recentDecisions.length > 0 && !questionLower.includes('error')) {
    response += `\n\n**Related Decisions in Your Project:**\n`;
    context.recentDecisions.slice(0, 3).forEach(decision => {
      response += `- ${decision.replace('## ', '')}\n`;
    });
  }

  if (context.recentErrors.length > 0 && questionLower.includes('error')) {
    response += `\n\n**Recent Errors in Your Project:**\n`;
    context.recentErrors.slice(0, 3).forEach(error => {
      const firstLine = error.split('\n')[0];
      response += `- ${firstLine}\n`;
    });
  }

  return response;
}

async function getSecurityGuidance(question: string, context: ProjectContext, includeExamples: boolean): Promise<string> {
  let guidance = `## 🔒 Security & Permissions Guidance\n\n`;

  if (context.hasSupabase) {
    guidance += `**Recommended Approach for Supabase:**\n\n`;
    guidance += `1. **Row Level Security (RLS)** - Database-level enforcement\n`;
    guidance += `   - Enable RLS on all tables\n`;
    guidance += `   - Policy: Users can only access their own data\n`;
    guidance += `   - Filter: \`auth.uid() = user_id\`\n\n`;

    guidance += `2. **API Route Protection**\n`;
    guidance += `   - Every mutation filters by BOTH \`id\` AND \`user_id\`\n`;
    guidance += `   - Never trust client-provided \`user_id\`\n`;
    guidance += `   - Get user from session: \`const { data: { session } } = await supabase.auth.getSession()\`\n\n`;

    if (includeExamples) {
      guidance += `**Example RLS Policy:**\n\`\`\`sql\nCREATE POLICY "Users can access own data"\n  ON your_table\n  FOR ALL\n  USING (auth.uid() = user_id);\n\`\`\`\n\n`;

      guidance += `**Example API Route (Secure):**\n\`\`\`typescript\n// pages/api/items/[id].ts\nexport default async function handler(req: Request) {\n  const { data: { session } } = await supabase.auth.getSession();\n  if (!session) return new Response('Unauthorized', { status: 401 });\n\n  const userId = session.user.id;\n\n  // CRITICAL: Filter by BOTH id AND user_id\n  const { data } = await supabase\n    .from('items')\n    .update({ name: req.body.name })\n    .eq('id', req.params.id)\n    .eq('user_id', userId)  // ← Prevents accessing other users' data\n    .select()\n    .maybeSingle();\n\n  return new Response(JSON.stringify(data));\n}\n\`\`\`\n\n`;
    }
  } else {
    guidance += `**General Security Best Practices:**\n`;
    guidance += `- Validate user identity on server-side (never trust client)\n`;
    guidance += `- Use session-based auth or JWT tokens\n`;
    guidance += `- Filter all queries by authenticated user ID\n`;
    guidance += `- Implement role-based access control (RBAC) if needed\n\n`;
  }

  return guidance;
}

async function getSearchGuidance(question: string, context: ProjectContext, includeExamples: boolean): Promise<string> {
  let guidance = `## 🔍 Search & Filtering Guidance\n\n`;

  if (context.hasSupabase) {
    guidance += `**Recommended Approach for Supabase:**\n\n`;
    guidance += `1. **Full-Text Search** - Built-in PostgreSQL\n`;
    guidance += `   - Use \`.textSearch()\` for natural language queries\n`;
    guidance += `   - Create GIN index for performance\n`;
    guidance += `   - Supports ranking and highlighting\n\n`;

    guidance += `2. **Pattern Matching** - For simple searches\n`;
    guidance += `   - Use \`.ilike()\` for case-insensitive partial match\n`;
    guidance += `   - Example: \`.ilike('name', '%query%')\`\n\n`;

    if (includeExamples) {
      guidance += `**Example Full-Text Search:**\n\`\`\`typescript\nconst { data } = await supabase\n  .from('posts')\n  .select('*')\n  .textSearch('content', query, {\n    type: 'websearch',\n    config: 'english'\n  })\n  .eq('user_id', userId);\n\`\`\`\n\n`;

      guidance += `**Example Pattern Search:**\n\`\`\`typescript\nconst { data } = await supabase\n  .from('users')\n  .select('*')\n  .ilike('name', \`%\${searchQuery}%\`)\n  .limit(20);\n\`\`\`\n\n`;
    }
  }

  guidance += `**Performance Tips:**\n`;
  guidance += `- Add database indexes on searchable columns\n`;
  guidance += `- Limit results (pagination)\n`;
  guidance += `- Debounce search input (300-500ms)\n`;
  guidance += `- Cache common queries\n\n`;

  return guidance;
}

async function getRealtimeGuidance(question: string, context: ProjectContext, includeExamples: boolean): Promise<string> {
  let guidance = `## ⚡ Real-Time Updates Guidance\n\n`;

  if (context.hasSupabase) {
    guidance += `**Supabase Realtime (Recommended):**\n\n`;
    guidance += `1. **Subscribe to table changes**\n`;
    guidance += `   - Listen for INSERT, UPDATE, DELETE events\n`;
    guidance += `   - Automatic WebSocket connection\n`;
    guidance += `   - Filter by user_id for security\n\n`;

    if (includeExamples) {
      guidance += `**Example Realtime Subscription:**\n\`\`\`typescript\n// In Zustand store or component\nconst channel = supabase\n  .channel('messages')\n  .on('postgres_changes', {\n    event: 'INSERT',\n    schema: 'public',\n    table: 'messages',\n    filter: \`user_id=eq.\${userId}\`\n  }, (payload) => {\n    // Add new message to state\n    setMessages(prev => [...prev, payload.new]);\n  })\n  .subscribe();\n\n// Cleanup\nreturn () => { channel.unsubscribe(); };\n\`\`\`\n\n`;
    }

    guidance += `**Alternative: Polling (Simpler)**\n`;
    guidance += `- Fetch data every N seconds\n`;
    guidance += `- Use SWR or React Query for caching\n`;
    guidance += `- Good for less critical updates\n\n`;
  } else {
    guidance += `**General Approaches:**\n`;
    guidance += `1. WebSockets (Socket.io, native WebSocket)\n`;
    guidance += `2. Server-Sent Events (SSE)\n`;
    guidance += `3. Polling (simplest, works everywhere)\n`;
    guidance += `4. Long polling (if WebSockets blocked)\n\n`;
  }

  return guidance;
}

async function getPerformanceGuidance(question: string, context: ProjectContext, includeExamples: boolean): Promise<string> {
  let guidance = `## ⚡ Performance Optimization Guidance\n\n`;

  guidance += `**Quick Wins:**\n\n`;
  guidance += `1. **Database Indexes** - Add to frequently queried columns\n`;
  guidance += `2. **Pagination** - Limit results (don't fetch 10,000 rows)\n`;
  guidance += `3. **Image Optimization** - Use Next.js Image component\n`;
  guidance += `4. **Code Splitting** - Dynamic imports for large components\n`;
  guidance += `5. **Caching** - SWR, React Query, or HTTP cache headers\n\n`;

  if (context.hasNextJs) {
    guidance += `**Next.js Specific:**\n`;
    guidance += `- Use \`next/image\` for automatic optimization\n`;
    guidance += `- Enable \`swcMinify: true\` in next.config.js\n`;
    guidance += `- Use dynamic imports: \`const Heavy = dynamic(() => import('./Heavy'))\`\n`;
    guidance += `- Implement Incremental Static Regeneration (ISR) where possible\n\n`;
  }

  if (context.hasSupabase) {
    guidance += `**Supabase Query Optimization:**\n`;
    guidance += `- Select only needed columns: \`.select('id, name')\` not \`.select('*')\`\n`;
    guidance += `- Use \`.limit()\` and \`.range()\` for pagination\n`;
    guidance += `- Add indexes on foreign keys and filter columns\n`;
    guidance += `- Use \`.maybeSingle()\` instead of \`.limit(1)\` + array access\n\n`;
  }

  return guidance;
}

async function getErrorGuidance(question: string, context: ProjectContext, includeExamples: boolean): Promise<string> {
  let guidance = `## 🐛 Error Diagnosis & Debugging\n\n`;

  // Check if similar errors exist in ERROR-LOG.md
  if (context.errors && context.recentErrors.length > 0) {
    guidance += `**I found similar errors in your ERROR-LOG.md:**\n\n`;

    // Try to match question to known errors
    const questionWords = question.toLowerCase().split(' ');
    const matchedErrors = context.recentErrors.filter(error => {
      const errorLower = error.toLowerCase();
      return questionWords.some(word => word.length > 4 && errorLower.includes(word));
    });

    if (matchedErrors.length > 0) {
      guidance += matchedErrors.slice(0, 2).map(error => `\`\`\`\n${error}\n\`\`\`\n`).join('\n');
    }
  }

  guidance += `**Common Next.js + Supabase Errors:**\n\n`;
  guidance += `1. **"window is not defined"** - Accessing browser APIs during SSR\n`;
  guidance += `   - Fix: Use dynamic imports with \`ssr: false\`\n\n`;

  guidance += `2. **".maybeSingle() returned null"** - Query found no results\n`;
  guidance += `   - Fix: Handle null case explicitly\n\n`;

  guidance += `3. **"Row Level Security policy violation"** - User lacks permission\n`;
  guidance += `   - Fix: Check RLS policies and user_id filtering\n\n`;

  guidance += `4. **"Authentication required"** - No session found\n`;
  guidance += `   - Fix: Redirect to login or refresh session\n\n`;

  return guidance;
}

async function getDeploymentGuidance(question: string, context: ProjectContext, includeExamples: boolean): Promise<string> {
  let guidance = `## 🚀 Deployment Guidance\n\n`;

  guidance += `**Vercel Deployment (Recommended for Next.js):**\n\n`;
  guidance += `1. **Environment Variables**\n`;
  guidance += `   - Add all .env variables to Vercel dashboard\n`;
  guidance += `   - Include: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY\n`;
  guidance += `   - Never commit .env to git\n\n`;

  guidance += `2. **Build Settings**\n`;
  guidance += `   - Framework: Next.js (auto-detected)\n`;
  guidance += `   - Build command: \`next build\`\n`;
  guidance += `   - Output directory: \`.next\`\n\n`;

  guidance += `3. **Database Migrations**\n`;
  guidance += `   - Run migrations on Supabase dashboard\n`;
  guidance += `   - OR use Supabase CLI in CI/CD\n\n`;

  guidance += `**Pre-Deployment Checklist:**\n`;
  guidance += `- ✅ Run: \`codebakers_scan_security\` (check for vulnerabilities)\n`;
  guidance += `- ✅ Run: \`codebakers_validate_accessibility\` (WCAG compliance)\n`;
  guidance += `- ✅ Run: \`codebakers_optimize_performance\` (bundle size, images)\n`;
  guidance += `- ✅ Test build locally: \`npm run build && npm start\`\n`;
  guidance += `- ✅ All tests passing: \`codebakers_run_tests({ test_type: "all" })\`\n\n`;

  guidance += `**Quick Deploy:**\n\`\`\`\ncodebakers_deploy_vercel({ production: true })\n\`\`\`\n\n`;

  return guidance;
}

async function getTestingGuidance(question: string, context: ProjectContext, includeExamples: boolean): Promise<string> {
  let guidance = `## 🧪 Testing Guidance\n\n`;

  guidance += `**CodeBakers Testing Tools:**\n\n`;
  guidance += `1. **Unit Tests (Vitest)**\n`;
  guidance += `   - Test components, stores, utilities\n`;
  guidance += `   - Run: \`codebakers_generate_unit_tests({ file_path: "...", test_type: "component" })\`\n\n`;

  guidance += `2. **E2E Tests (Playwright)**\n`;
  guidance += `   - Test complete user flows\n`;
  guidance += `   - Run: \`codebakers_generate_e2e_tests({ flow_name: "...", steps: [...] })\`\n\n`;

  guidance += `3. **Run Tests**\n`;
  guidance += `   - Unit only: \`codebakers_run_tests({ test_type: "unit" })\`\n`;
  guidance += `   - E2E only: \`codebakers_run_tests({ test_type: "e2e" })\`\n`;
  guidance += `   - All tests: \`codebakers_run_tests({ test_type: "all" })\`\n\n`;

  guidance += `**Testing Best Practices:**\n`;
  guidance += `- Test user flows, not implementation details\n`;
  guidance += `- Mock external APIs (Supabase, Stripe, etc.)\n`;
  guidance += `- Test all 4 states: loading, error, empty, success\n`;
  guidance += `- Run E2E against built app (not dev server)\n\n`;

  return guidance;
}

async function getUIGuidance(question: string, context: ProjectContext, includeExamples: boolean): Promise<string> {
  let guidance = `## 🎨 UI & Component Guidance\n\n`;

  guidance += `**CodeBakers Component Generation:**\n\n`;
  guidance += `\`\`\`\ncodebakers_generate_component({\n  name: "UserList",\n  entity: "users",\n  type: "list"  // or "detail" or "form"\n})\n\`\`\`\n\n`;

  guidance += `**All Generated Components Include:**\n`;
  guidance += `- ✅ Loading state (skeleton or spinner)\n`;
  guidance += `- ✅ Error state (with retry button)\n`;
  guidance += `- ✅ Empty state (with action button)\n`;
  guidance += `- ✅ Success state (with data)\n`;
  guidance += `- ✅ Responsive design (mobile-first)\n`;
  guidance += `- ✅ TypeScript types\n\n`;

  if (context.domain) {
    guidance += `**Domain-Specific Patterns (${context.domain}):**\n`;
    guidance += `Your project uses domain context which auto-applies UX patterns.\n`;
    guidance += `Check: \`agents/domains/${context.domain}.md\` for conventions.\n\n`;
  }

  guidance += `**UI Best Practices:**\n`;
  guidance += `- Use Tailwind CSS for styling\n`;
  guidance += `- Implement skeleton loaders (better UX than spinners)\n`;
  guidance += `- Show inline errors (not toast notifications)\n`;
  guidance += `- Confirm destructive actions (delete, etc.)\n`;
  guidance += `- Test on mobile (not just desktop)\n\n`;

  return guidance;
}

async function getGeneralGuidance(question: string, context: ProjectContext, includeExamples: boolean): Promise<string> {
  let guidance = `## 💡 Guidance\n\n`;

  guidance += `Based on your project:\n\n`;

  if (context.entities.length > 0) {
    guidance += `**Your Entities:** ${context.entities.join(', ')}\n\n`;
  }

  if (context.flows) {
    const flowCount = (context.flows.match(/##\s+/g) || []).length;
    guidance += `**Your Flows:** ${flowCount} user flows defined\n\n`;
  }

  guidance += `**Available CodeBakers Tools:**\n\n`;
  guidance += `- \`codebakers_builder({ mode: "full" })\` - Build entire app autonomously\n`;
  guidance += `- \`codebakers_generate_component({ ... })\` - Generate React component\n`;
  guidance += `- \`codebakers_generate_api_route({ ... })\` - Generate API route\n`;
  guidance += `- \`codebakers_generate_store({ ... })\` - Generate Zustand store\n`;
  guidance += `- \`codebakers_scan_security({})\` - Security scan\n`;
  guidance += `- \`codebakers_validate_accessibility({})\` - Accessibility check\n`;
  guidance += `- \`codebakers_deploy_vercel({ production: true })\` - Deploy to Vercel\n\n`;

  guidance += `**For more specific guidance, ask about:**\n`;
  guidance += `- Security & permissions\n`;
  guidance += `- Search & filtering\n`;
  guidance += `- Real-time updates\n`;
  guidance += `- Performance optimization\n`;
  guidance += `- Error debugging\n`;
  guidance += `- Testing strategy\n`;
  guidance += `- Deployment process\n`;

  return guidance;
}
