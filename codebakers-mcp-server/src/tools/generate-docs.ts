/**
 * codebakers_generate_docs
 *
 * Documentation Generator - Beautiful HTML Docs
 *
 * Generates complete documentation:
 * - Quick start guide
 * - API reference
 * - Component documentation
 * - Architecture overview
 * - Setup instructions
 * - Beautiful HTML output with navigation
 */

import * as fs from 'fs/promises';
import * as path from 'path';

interface DocsArgs {
  include_api?: boolean; // Include API reference (default: true)
  include_components?: boolean; // Include component docs (default: true)
  output_dir?: string; // Output directory (default: docs/)
}

export async function generateDocs(args: DocsArgs = {}): Promise<string> {
  const cwd = process.cwd();
  const { include_api = true, include_components = true, output_dir = 'docs' } = args;

  console.error('🍞 CodeBakers: Generating Documentation');

  try {
    const outputPath = path.join(cwd, output_dir);
    await fs.mkdir(outputPath, { recursive: true });

    const sections: string[] = [];

    // Section 1: Quick Start Guide
    console.error('[1/5] Generating quick start guide...');
    const quickStart = await generateQuickStart(cwd);
    await writeDocFile(outputPath, 'quick-start.html', quickStart);
    sections.push('Quick Start');

    // Section 2: Setup Instructions
    console.error('[2/5] Generating setup instructions...');
    const setup = await generateSetupGuide(cwd);
    await writeDocFile(outputPath, 'setup.html', setup);
    sections.push('Setup');

    // Section 3: Architecture Overview
    console.error('[3/5] Generating architecture overview...');
    const architecture = await generateArchitecture(cwd);
    await writeDocFile(outputPath, 'architecture.html', architecture);
    sections.push('Architecture');

    // Section 4: API Reference
    if (include_api) {
      console.error('[4/5] Generating API reference...');
      const api = await generateAPIReference(cwd);
      await writeDocFile(outputPath, 'api-reference.html', api);
      sections.push('API Reference');
    }

    // Section 5: Component Docs
    if (include_components) {
      console.error('[5/5] Generating component documentation...');
      const components = await generateComponentDocs(cwd);
      await writeDocFile(outputPath, 'components.html', components);
      sections.push('Components');
    }

    // Generate index page
    const index = generateIndexPage(sections);
    await writeDocFile(outputPath, 'index.html', index);

    // Copy CSS
    await writeCSSFile(outputPath);

    return generateDocsReport(outputPath, sections);
  } catch (error) {
    return `🍞 CodeBakers: Documentation Generation Failed\n\nError: ${error instanceof Error ? error.message : String(error)}`;
  }
}

async function generateQuickStart(cwd: string): Promise<string> {
  // Read project-profile.md if exists
  let projectName = 'Your App';
  let projectType = '';

  try {
    const profilePath = path.join(cwd, 'project-profile.md');
    const profile = await fs.readFile(profilePath, 'utf-8');

    const nameMatch = profile.match(/name:\s*(.+)/i);
    if (nameMatch) projectName = nameMatch[1].trim();

    const typeMatch = profile.match(/type:\s*(.+)/i);
    if (typeMatch) projectType = typeMatch[1].trim();
  } catch {
    // project-profile.md doesn't exist
  }

  const content = `
<h1>Quick Start Guide</h1>

<h2>Get Started in 5 Minutes</h2>

<h3>1. Clone and Install</h3>
<pre><code class="language-bash">git clone [repository-url]
cd ${projectName.toLowerCase().replace(/\s+/g, '-')}
pnpm install</code></pre>

<h3>2. Setup Environment</h3>
<pre><code class="language-bash"># Copy environment template
cp .env.example .env

# Add your credentials (see Setup guide for details)
# Required: SUPABASE_URL, SUPABASE_ANON_KEY
</code></pre>

<h3>3. Run Development Server</h3>
<pre><code class="language-bash">pnpm dev</code></pre>

<p>Open <a href="http://localhost:3000">http://localhost:3000</a> in your browser.</p>

<h3>4. Run Tests</h3>
<pre><code class="language-bash"># Unit tests
pnpm test

# E2E tests
pnpm test:e2e</code></pre>

<h3>5. Build for Production</h3>
<pre><code class="language-bash">pnpm build
pnpm start</code></pre>

<h2>What's Next?</h2>

<ul>
  <li><a href="setup.html">Complete Setup Guide</a> - Environment variables and credentials</li>
  <li><a href="architecture.html">Architecture Overview</a> - How the app works</li>
  <li><a href="api-reference.html">API Reference</a> - Backend endpoints</li>
  <li><a href="components.html">Components</a> - UI component library</li>
</ul>

<div class="callout callout-success">
  <h4>🎉 You're Ready!</h4>
  <p>Your app is now running. Start exploring the codebase or jump into development.</p>
</div>
  `;

  return wrapInTemplate('Quick Start', content);
}

async function generateSetupGuide(cwd: string): Promise<string> {
  // Read CREDENTIALS-NEEDED.md if exists
  let credentials = 'No external credentials required.';

  try {
    const credsPath = path.join(cwd, '.codebakers', 'CREDENTIALS-NEEDED.md');
    credentials = await fs.readFile(credsPath, 'utf-8');
  } catch {
    // CREDENTIALS-NEEDED.md doesn't exist
  }

  const content = `
<h1>Setup Guide</h1>

<h2>Prerequisites</h2>

<ul>
  <li>Node.js 18+ (<code>node --version</code>)</li>
  <li>pnpm (<code>npm install -g pnpm</code>)</li>
  <li>Git</li>
  <li>Supabase account (free tier works)</li>
</ul>

<h2>Installation Steps</h2>

<h3>Step 1: Install Dependencies</h3>
<pre><code class="language-bash">pnpm install</code></pre>

<h3>Step 2: Setup Supabase</h3>

<ol>
  <li>Create project at <a href="https://supabase.com/dashboard">supabase.com/dashboard</a></li>
  <li>Copy <strong>Project URL</strong> and <strong>anon key</strong> from Settings → API</li>
  <li>Run migrations: <code>pnpm supabase:migrate</code></li>
</ol>

<h3>Step 3: Environment Variables</h3>

<pre><code class="language-bash"># .env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
</code></pre>

<h2>External Services</h2>

<div class="credentials-section">
${credentials.includes('No external') ? '<p>No external credentials required.</p>' : `<pre>${credentials}</pre>`}
</div>

<h2>Verification</h2>

<p>Verify everything works:</p>

<pre><code class="language-bash"># Type check
pnpm type-check

# Run tests
pnpm test

# Start dev server
pnpm dev</code></pre>

<div class="callout callout-info">
  <h4>Need Help?</h4>
  <p>Check <a href="https://github.com/your-repo/issues">GitHub Issues</a> or the main documentation.</p>
</div>
  `;

  return wrapInTemplate('Setup Guide', content);
}

async function generateArchitecture(cwd: string): Promise<string> {
  // Read BRAIN.md if exists
  let brainContent = '';

  try {
    const brainPath = path.join(cwd, '.codebakers', 'BRAIN.md');
    brainContent = await fs.readFile(brainPath, 'utf-8');
  } catch {
    // BRAIN.md doesn't exist
  }

  const content = `
<h1>Architecture Overview</h1>

<h2>Tech Stack</h2>

<table>
  <tr>
    <th>Layer</th>
    <th>Technology</th>
    <th>Purpose</th>
  </tr>
  <tr>
    <td>Frontend</td>
    <td>Next.js 14 (App Router)</td>
    <td>React framework with SSR/SSG</td>
  </tr>
  <tr>
    <td>Backend</td>
    <td>Next.js API Routes</td>
    <td>Server-side endpoints</td>
  </tr>
  <tr>
    <td>Database</td>
    <td>Supabase (PostgreSQL)</td>
    <td>Data persistence + Auth</td>
  </tr>
  <tr>
    <td>State</td>
    <td>Zustand</td>
    <td>Client-side state management</td>
  </tr>
  <tr>
    <td>Styling</td>
    <td>Tailwind CSS</td>
    <td>Utility-first CSS</td>
  </tr>
  <tr>
    <td>Testing</td>
    <td>Vitest + Playwright</td>
    <td>Unit + E2E tests</td>
  </tr>
</table>

<h2>Folder Structure</h2>

<pre><code>src/
├── app/                 # Next.js App Router
│   ├── (routes)/        # Page routes
│   ├── api/             # API endpoints
│   └── layout.tsx       # Root layout
├── components/          # React components
│   ├── ui/              # UI primitives
│   └── features/        # Feature components
├── stores/              # Zustand stores
├── lib/                 # Utilities and helpers
└── types/               # TypeScript types

supabase/
└── migrations/          # Database migrations

tests/
├── unit/                # Vitest unit tests
└── e2e/                 # Playwright E2E tests
</code></pre>

<h2>Data Flow</h2>

<ol>
  <li><strong>User Action</strong> → Component event handler</li>
  <li><strong>Store Method</strong> → Calls API route</li>
  <li><strong>API Route</strong> → Validates auth, queries Supabase</li>
  <li><strong>Database</strong> → Returns data</li>
  <li><strong>Store Update</strong> → Updates state + dependent stores</li>
  <li><strong>React Re-render</strong> → UI reflects new state</li>
</ol>

<h2>Key Principles</h2>

<ul>
  <li><strong>Security First:</strong> All queries filter by <code>user_id</code></li>
  <li><strong>Type Safety:</strong> TypeScript strict mode everywhere</li>
  <li><strong>Dependency Awareness:</strong> Mutations update all affected stores</li>
  <li><strong>Error Handling:</strong> All components have loading/error/empty/success states</li>
  <li><strong>Testing:</strong> Every feature has unit + E2E tests</li>
</ul>

${brainContent ? `<h2>Project Context</h2><pre>${brainContent.slice(0, 1000)}</pre>` : ''}
  `;

  return wrapInTemplate('Architecture', content);
}

async function generateAPIReference(cwd: string): Promise<string> {
  const apiRoutes = await findAPIRoutes(cwd);

  let routesList = '';

  if (apiRoutes.length === 0) {
    routesList = '<p>No API routes found.</p>';
  } else {
    for (const route of apiRoutes) {
      routesList += `
<div class="api-route">
  <h3>${route.method} ${route.path}</h3>
  <p><strong>File:</strong> <code>${route.file}</code></p>
  <p><strong>Description:</strong> ${route.description}</p>
</div>
      `;
    }
  }

  const content = `
<h1>API Reference</h1>

<h2>API Endpoints</h2>

${routesList}

<h2>Authentication</h2>

<p>All API routes require authentication via Supabase session:</p>

<pre><code class="language-typescript">const supabase = createServerClient();
const { data: { user }, error } = await supabase.auth.getUser();

if (!user) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}</code></pre>

<h2>Error Responses</h2>

<table>
  <tr>
    <th>Status</th>
    <th>Meaning</th>
  </tr>
  <tr>
    <td>200</td>
    <td>Success</td>
  </tr>
  <tr>
    <td>400</td>
    <td>Bad Request (validation error)</td>
  </tr>
  <tr>
    <td>401</td>
    <td>Unauthorized (not logged in)</td>
  </tr>
  <tr>
    <td>403</td>
    <td>Forbidden (no permission)</td>
  </tr>
  <tr>
    <td>404</td>
    <td>Not Found</td>
  </tr>
  <tr>
    <td>500</td>
    <td>Internal Server Error</td>
  </tr>
</table>
  `;

  return wrapInTemplate('API Reference', content);
}

async function findAPIRoutes(cwd: string): Promise<Array<{ method: string; path: string; file: string; description: string }>> {
  const routes: Array<{ method: string; path: string; file: string; description: string }> = [];
  const apiDir = path.join(cwd, 'src', 'app', 'api');

  try {
    await scanAPIDirectory(apiDir, '', routes);
  } catch {
    // API directory doesn't exist
  }

  return routes;
}

async function scanAPIDirectory(dir: string, routePath: string, routes: Array<{ method: string; path: string; file: string; description: string }>): Promise<void> {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        const newPath = entry.name.startsWith('[') && entry.name.endsWith(']')
          ? `${routePath}/{${entry.name.slice(1, -1)}}`
          : `${routePath}/${entry.name}`;
        await scanAPIDirectory(fullPath, newPath, routes);
      } else if (entry.name === 'route.ts' || entry.name === 'route.js') {
        const content = await fs.readFile(fullPath, 'utf-8');

        // Detect methods
        const methods = [];
        if (content.includes('export async function GET')) methods.push('GET');
        if (content.includes('export async function POST')) methods.push('POST');
        if (content.includes('export async function PUT')) methods.push('PUT');
        if (content.includes('export async function PATCH')) methods.push('PATCH');
        if (content.includes('export async function DELETE')) methods.push('DELETE');

        for (const method of methods) {
          routes.push({
            method,
            path: `/api${routePath}`,
            file: fullPath,
            description: `${method} operation for ${routePath.split('/').pop() || 'resource'}`
          });
        }
      }
    }
  } catch {
    // Directory doesn't exist
  }
}

async function generateComponentDocs(cwd: string): Promise<string> {
  const components = await findComponents(cwd);

  let componentsList = '';

  if (components.length === 0) {
    componentsList = '<p>No components found.</p>';
  } else {
    for (const component of components) {
      componentsList += `
<div class="component-doc">
  <h3>${component.name}</h3>
  <p><strong>File:</strong> <code>${component.file}</code></p>
  <p><strong>Props:</strong> ${component.props.join(', ') || 'None'}</p>
</div>
      `;
    }
  }

  const content = `
<h1>Component Documentation</h1>

<h2>UI Components</h2>

${componentsList}

<h2>Component Structure</h2>

<p>All components follow the same pattern:</p>

<pre><code class="language-typescript">// States
if (loading) return &lt;SkeletonLoader /&gt;;
if (error) return &lt;ErrorMessage error={error} /&gt;;
if (data.length === 0) return &lt;EmptyState /&gt;;
return &lt;SuccessView data={data} /&gt;;
</code></pre>
  `;

  return wrapInTemplate('Components', content);
}

async function findComponents(cwd: string): Promise<Array<{ name: string; file: string; props: string[] }>> {
  const components: Array<{ name: string; file: string; props: string[] }> = [];
  const componentsDir = path.join(cwd, 'src', 'components');

  try {
    const files = await fs.readdir(componentsDir);

    for (const file of files) {
      if (file.endsWith('.tsx') || file.endsWith('.jsx')) {
        const filePath = path.join(componentsDir, file);
        const content = await fs.readFile(filePath, 'utf-8');

        // Extract component name
        const match = content.match(/export\s+(?:default\s+)?function\s+(\w+)/);
        const name = match ? match[1] : file.replace(/\.(tsx|jsx)$/, '');

        // Extract props (simple detection)
        const propsMatch = content.match(/interface\s+\w+Props\s*{([^}]+)}/);
        const props = propsMatch
          ? propsMatch[1].split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('//')).map(l => l.split(':')[0].trim())
          : [];

        components.push({ name, file, props });
      }
    }
  } catch {
    // Components directory doesn't exist
  }

  return components;
}

function generateIndexPage(sections: string[]): string {
  const sectionLinks = sections.map(s => {
    const filename = s.toLowerCase().replace(/\s+/g, '-') + '.html';
    return `<li><a href="${filename}">${s}</a></li>`;
  }).join('\n');

  const content = `
<h1>📚 Documentation</h1>

<p>Welcome to the complete documentation for this application.</p>

<h2>Sections</h2>

<ul class="nav-list">
${sectionLinks}
</ul>

<div class="callout callout-success">
  <h4>🚀 New to the project?</h4>
  <p>Start with the <a href="quick-start.html">Quick Start Guide</a></p>
</div>
  `;

  return wrapInTemplate('Documentation', content);
}

function wrapInTemplate(title: string, content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - Documentation</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <nav class="sidebar">
    <h2>📚 Docs</h2>
    <ul>
      <li><a href="index.html">Home</a></li>
      <li><a href="quick-start.html">Quick Start</a></li>
      <li><a href="setup.html">Setup</a></li>
      <li><a href="architecture.html">Architecture</a></li>
      <li><a href="api-reference.html">API Reference</a></li>
      <li><a href="components.html">Components</a></li>
    </ul>
  </nav>
  <main class="content">
    ${content}
    <footer>
      <p>Generated by CodeBakers v5.2.0 • ${new Date().toLocaleDateString()}</p>
    </footer>
  </main>
</body>
</html>`;
}

async function writeDocFile(outputPath: string, filename: string, content: string): Promise<void> {
  const filePath = path.join(outputPath, filename);
  await fs.writeFile(filePath, content, 'utf-8');
}

async function writeCSSFile(outputPath: string): Promise<void> {
  const css = `
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  line-height: 1.6;
  color: #333;
  display: flex;
  min-height: 100vh;
}

.sidebar {
  width: 250px;
  background: #2c3e50;
  color: white;
  padding: 2rem 1.5rem;
  position: fixed;
  height: 100vh;
  overflow-y: auto;
}

.sidebar h2 {
  margin-bottom: 1.5rem;
  font-size: 1.5rem;
}

.sidebar ul {
  list-style: none;
}

.sidebar li {
  margin-bottom: 0.5rem;
}

.sidebar a {
  color: #ecf0f1;
  text-decoration: none;
  display: block;
  padding: 0.5rem;
  border-radius: 4px;
  transition: background 0.2s;
}

.sidebar a:hover {
  background: #34495e;
}

.content {
  margin-left: 250px;
  padding: 3rem;
  flex: 1;
  max-width: 900px;
}

h1 {
  font-size: 2.5rem;
  margin-bottom: 1.5rem;
  color: #2c3e50;
  border-bottom: 3px solid #3498db;
  padding-bottom: 0.5rem;
}

h2 {
  font-size: 2rem;
  margin: 2rem 0 1rem;
  color: #34495e;
}

h3 {
  font-size: 1.5rem;
  margin: 1.5rem 0 1rem;
  color: #555;
}

h4 {
  font-size: 1.2rem;
  margin: 1rem 0 0.5rem;
}

p {
  margin-bottom: 1rem;
}

a {
  color: #3498db;
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}

pre {
  background: #f5f5f5;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 1rem;
  overflow-x: auto;
  margin: 1rem 0;
  font-size: 0.9rem;
}

code {
  background: #f5f5f5;
  padding: 0.2rem 0.4rem;
  border-radius: 3px;
  font-family: 'Courier New', monospace;
  font-size: 0.9em;
}

pre code {
  background: none;
  padding: 0;
}

table {
  width: 100%;
  border-collapse: collapse;
  margin: 1.5rem 0;
}

th, td {
  padding: 0.75rem;
  text-align: left;
  border-bottom: 1px solid #ddd;
}

th {
  background: #f5f5f5;
  font-weight: 600;
}

ul, ol {
  margin: 1rem 0 1rem 2rem;
}

li {
  margin-bottom: 0.5rem;
}

.nav-list {
  list-style: none;
  margin: 1rem 0;
}

.nav-list li {
  margin-bottom: 1rem;
}

.nav-list a {
  display: block;
  padding: 1rem;
  background: #f5f5f5;
  border-left: 4px solid #3498db;
  border-radius: 4px;
  transition: all 0.2s;
}

.nav-list a:hover {
  background: #e8f4f8;
  transform: translateX(5px);
  text-decoration: none;
}

.callout {
  padding: 1rem 1.5rem;
  border-radius: 4px;
  margin: 1.5rem 0;
  border-left: 4px solid;
}

.callout-success {
  background: #d4edda;
  border-color: #28a745;
  color: #155724;
}

.callout-info {
  background: #d1ecf1;
  border-color: #17a2b8;
  color: #0c5460;
}

.api-route, .component-doc {
  background: #f9f9f9;
  padding: 1.5rem;
  border-radius: 4px;
  margin-bottom: 1.5rem;
  border-left: 4px solid #3498db;
}

footer {
  margin-top: 4rem;
  padding-top: 2rem;
  border-top: 1px solid #ddd;
  color: #777;
  font-size: 0.9rem;
}

@media (max-width: 768px) {
  .sidebar {
    width: 100%;
    position: static;
    height: auto;
  }

  .content {
    margin-left: 0;
    padding: 1.5rem;
  }
}
  `;

  await fs.writeFile(path.join(outputPath, 'styles.css'), css, 'utf-8');
}

function generateDocsReport(outputPath: string, sections: string[]): string {
  let report = `🍞 CodeBakers: Documentation Generated\n\n`;
  report += `✅ **Output:** ${outputPath}/\n\n`;

  report += `## Generated Pages\n\n`;
  report += `- index.html (Home)\n`;
  for (const section of sections) {
    report += `- ${section.toLowerCase().replace(/\s+/g, '-')}.html\n`;
  }
  report += `\n`;

  report += `## View Documentation\n\n`;
  report += `Open in browser:\n`;
  report += `\`\`\`\n`;
  report += `open ${outputPath}/index.html\n`;
  report += `\`\`\`\n\n`;

  report += `Or serve with:\n`;
  report += `\`\`\`\n`;
  report += `cd ${outputPath}\n`;
  report += `python -m http.server 8000\n`;
  report += `\`\`\`\n\n`;

  report += `Then visit: http://localhost:8000\n\n`;

  report += `📚 Beautiful, navigable documentation ready!\n`;

  return report;
}
