/**
 * codebakers_setup_supabase
 *
 * Supabase Project Setup with OAuth
 *
 * Prompts user:
 * - Have existing Supabase project? → Get credentials → Write to .env
 * - Create new project? → OAuth → Create → Get credentials → Write to .env
 * - Skip? → User will configure manually later
 *
 * For new projects:
 * - Opens browser for Supabase OAuth
 * - Creates project via Supabase Management API
 * - Retrieves database credentials automatically
 * - Writes to .env file
 */
import * as fs from 'fs/promises';
import * as path from 'path';
import { execSync } from 'child_process';
import * as http from 'http';
import * as url from 'url';
const SUPABASE_CLIENT_ID = 'supabase-cli'; // Using CLI OAuth flow
const SUPABASE_AUTH_URL = 'https://api.supabase.com';
export async function setupSupabase(args = {}) {
    const cwd = process.cwd();
    const { mode, project_name, region = 'us-east-1', supabase_url, supabase_anon_key, supabase_service_key, database_url } = args;
    console.error('🍞 CodeBakers: Supabase Setup');
    try {
        // Mode selection
        if (!mode) {
            return `🍞 CodeBakers: Supabase Project Setup\n\n**Choose an option:**\n\n1. **Have existing Supabase project** → \`mode: "existing"\`\n2. **Create new Supabase project** → \`mode: "create"\`\n3. **Skip (configure manually later)** → \`mode: "skip"\`\n\n**Example (Create):**\ncodebakers_setup_supabase({ mode: "create", project_name: "my-app", region: "us-east-1" })\n\n**Example (Existing):**\ncodebakers_setup_supabase({ \n  mode: "existing", \n  supabase_url: "https://xxx.supabase.co",\n  supabase_anon_key: "eyJhbG...",\n  database_url: "postgresql://..."\n})`;
        }
        if (mode === 'skip') {
            return `🍞 CodeBakers: Supabase setup skipped.\n\nYou can configure Supabase manually later or run this tool again.`;
        }
        if (mode === 'existing') {
            if (!supabase_url || !supabase_anon_key) {
                return `🍞 CodeBakers: Missing Credentials\n\nProvide your Supabase project credentials:\n\ncodebakers_setup_supabase({\n  mode: "existing",\n  supabase_url: "https://xxx.supabase.co",\n  supabase_anon_key: "your-anon-key",\n  supabase_service_key: "your-service-role-key" (optional),\n  database_url: "postgresql://..." (optional)\n})\n\n**Find your credentials:**\n1. Go to: https://app.supabase.com/project/_/settings/api\n2. Copy: Project URL, anon key\n3. Database URL: Settings → Database → Connection string (direct)`;
            }
            return await configureExistingProject(cwd, {
                supabase_url,
                supabase_anon_key,
                supabase_service_key,
                database_url
            });
        }
        if (mode === 'create') {
            if (!project_name) {
                return `🍞 CodeBakers: Missing Project Name\n\nProvide a name for your new Supabase project:\n\ncodebakers_setup_supabase({ mode: "create", project_name: "my-app", region: "us-east-1" })\n\n**Available regions:**\n- us-east-1 (North Virginia)\n- us-west-1 (North California)\n- eu-west-1 (Ireland)\n- eu-central-1 (Frankfurt)\n- ap-southeast-1 (Singapore)\n- ap-northeast-1 (Tokyo)`;
            }
            return await createNewProject(cwd, project_name, region);
        }
        return `🍞 CodeBakers: Invalid mode. Use: "existing", "create", or "skip"`;
    }
    catch (error) {
        return `🍞 CodeBakers: Supabase Setup Failed\n\nError: ${error instanceof Error ? error.message : String(error)}`;
    }
}
async function configureExistingProject(cwd, config) {
    try {
        const envPath = path.join(cwd, '.env');
        let envContent = '';
        // Read existing .env
        try {
            envContent = await fs.readFile(envPath, 'utf-8');
        }
        catch {
            // .env doesn't exist - create new
        }
        // Update or add Supabase variables
        envContent = updateEnvVar(envContent, 'NEXT_PUBLIC_SUPABASE_URL', config.supabase_url);
        envContent = updateEnvVar(envContent, 'NEXT_PUBLIC_SUPABASE_ANON_KEY', config.supabase_anon_key);
        if (config.supabase_service_key) {
            envContent = updateEnvVar(envContent, 'SUPABASE_SERVICE_ROLE_KEY', config.supabase_service_key);
        }
        if (config.database_url) {
            envContent = updateEnvVar(envContent, 'DATABASE_URL', config.database_url);
            // Extract project ref for DIRECT_URL (port 5432)
            const directUrl = config.database_url.replace(':6543/', ':5432/');
            envContent = updateEnvVar(envContent, 'DIRECT_URL', directUrl);
        }
        // Write .env
        await fs.writeFile(envPath, envContent, 'utf-8');
        // Ensure .env is in .gitignore
        await ensureGitignore(cwd, '.env');
        return `🍞 CodeBakers: ✅ Supabase Configured\n\n**Project URL:** ${config.supabase_url}\n\n**Environment variables written to .env:**\n- NEXT_PUBLIC_SUPABASE_URL\n- NEXT_PUBLIC_SUPABASE_ANON_KEY${config.supabase_service_key ? '\n- SUPABASE_SERVICE_ROLE_KEY' : ''}${config.database_url ? '\n- DATABASE_URL\n- DIRECT_URL' : ''}\n\n✅ Ready to use Supabase in your app`;
    }
    catch (error) {
        throw new Error(`Failed to configure Supabase: ${error instanceof Error ? error.message : String(error)}`);
    }
}
async function createNewProject(cwd, projectName, region) {
    console.error('\n🔐 Starting Supabase OAuth flow...\n');
    console.error('A browser window will open for Supabase authentication.\n');
    // Start OAuth flow
    const credentials = await startOAuthFlow();
    console.error('\n✅ Authentication successful!\n');
    console.error(`Creating Supabase project: ${projectName} in ${region}...\n`);
    // Create project via Supabase Management API
    const project = await createSupabaseProject(credentials, projectName, region);
    console.error(`✅ Project created: ${project.name}\n`);
    console.error('⏳ Waiting for project to be ready (this may take 1-2 minutes)...\n');
    // Wait for project to be ready
    await waitForProjectReady(credentials, project.id);
    console.error('✅ Project is ready!\n');
    // Get project credentials
    const projectDetails = await getProjectDetails(credentials, project.id);
    console.error('Configuring environment variables...\n');
    // Write to .env
    await configureExistingProject(cwd, {
        supabase_url: projectDetails.api_url,
        supabase_anon_key: projectDetails.anon_key,
        supabase_service_key: projectDetails.service_role_key,
        database_url: `postgresql://postgres:[YOUR-PASSWORD]@${projectDetails.database.host}:6543/postgres?pgbouncer=true`
    });
    // Save credentials for future use
    await saveCredentials(cwd, credentials);
    return `🍞 CodeBakers: ✅ Supabase Project Created\n\n**Project:** ${project.name}\n**Region:** ${region}\n**Dashboard:** https://app.supabase.com/project/${project.id}\n\n✅ Environment variables configured in .env\n\n**Important:** \nYour database password was set during project creation.\nUpdate DATABASE_URL in .env with your password:\n\nDATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@${projectDetails.database.host}:6543/postgres?pgbouncer=true\nDIRECT_URL=postgresql://postgres:[YOUR-PASSWORD]@${projectDetails.database.host}:5432/postgres\n\n**Supabase credentials saved** to .codebakers/credentials.json`;
}
async function startOAuthFlow() {
    return new Promise((resolve, reject) => {
        const server = http.createServer(async (req, res) => {
            const parsedUrl = url.parse(req.url || '', true);
            if (parsedUrl.pathname === '/callback') {
                const code = parsedUrl.query.code;
                if (!code) {
                    res.writeHead(400, { 'Content-Type': 'text/html' });
                    res.end('<h1>Error: No authorization code received</h1>');
                    server.close();
                    reject(new Error('No authorization code received'));
                    return;
                }
                try {
                    // Exchange code for access token
                    const credentials = await exchangeCodeForToken(code);
                    res.writeHead(200, { 'Content-Type': 'text/html' });
                    res.end(`
            <html>
              <head><title>Supabase Authentication</title></head>
              <body style="font-family: system-ui; max-width: 600px; margin: 100px auto; text-align: center;">
                <h1 style="color: #3ECF8E;">✅ Authentication Successful!</h1>
                <p>You can close this window and return to your terminal.</p>
              </body>
            </html>
          `);
                    server.close();
                    resolve(credentials);
                }
                catch (error) {
                    res.writeHead(500, { 'Content-Type': 'text/html' });
                    res.end('<h1>Error: Failed to authenticate</h1>');
                    server.close();
                    reject(error);
                }
            }
        });
        server.listen(3001, () => {
            const authUrl = `https://api.supabase.com/v1/oauth/authorize?client_id=${SUPABASE_CLIENT_ID}&redirect_uri=http://localhost:3001/callback&response_type=code`;
            console.error(`Opening browser to Supabase login...\n`);
            // Open browser
            const open = process.platform === 'win32' ? 'start' : process.platform === 'darwin' ? 'open' : 'xdg-open';
            try {
                execSync(`${open} "${authUrl}"`, { stdio: 'ignore' });
            }
            catch {
                console.error(`\nCouldn't open browser automatically.\nPlease visit: ${authUrl}\n`);
            }
        });
        // Timeout after 5 minutes
        setTimeout(() => {
            server.close();
            reject(new Error('OAuth flow timed out after 5 minutes'));
        }, 5 * 60 * 1000);
    });
}
async function exchangeCodeForToken(code) {
    const response = await fetch(`${SUPABASE_AUTH_URL}/v1/oauth/token`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            grant_type: 'authorization_code',
            code,
            redirect_uri: 'http://localhost:3001/callback'
        })
    });
    const data = await response.json();
    if (data.error) {
        throw new Error(`Supabase OAuth error: ${data.error_description || data.error}`);
    }
    return {
        access_token: data.access_token,
        refresh_token: data.refresh_token
    };
}
async function createSupabaseProject(credentials, name, region) {
    const response = await fetch(`${SUPABASE_AUTH_URL}/v1/projects`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${credentials.access_token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            name,
            organization_id: await getOrganizationId(credentials),
            region,
            plan: 'free'
        })
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(`Failed to create project: ${error.message || response.statusText}`);
    }
    return await response.json();
}
async function getOrganizationId(credentials) {
    const response = await fetch(`${SUPABASE_AUTH_URL}/v1/organizations`, {
        headers: {
            'Authorization': `Bearer ${credentials.access_token}`
        }
    });
    const orgs = await response.json();
    if (orgs.length === 0) {
        throw new Error('No organizations found. Please create one at https://app.supabase.com');
    }
    return orgs[0].id;
}
async function waitForProjectReady(credentials, projectId) {
    const maxAttempts = 60; // 2 minutes
    const delayMs = 2000;
    for (let i = 0; i < maxAttempts; i++) {
        const response = await fetch(`${SUPABASE_AUTH_URL}/v1/projects/${projectId}`, {
            headers: {
                'Authorization': `Bearer ${credentials.access_token}`
            }
        });
        const project = await response.json();
        if (project.status === 'ACTIVE_HEALTHY') {
            return;
        }
        await new Promise(resolve => setTimeout(resolve, delayMs));
    }
    throw new Error('Project creation timed out. Check Supabase dashboard for status.');
}
async function getProjectDetails(credentials, projectId) {
    const response = await fetch(`${SUPABASE_AUTH_URL}/v1/projects/${projectId}`, {
        headers: {
            'Authorization': `Bearer ${credentials.access_token}`
        }
    });
    const project = await response.json();
    // Get API keys
    const keysResponse = await fetch(`${SUPABASE_AUTH_URL}/v1/projects/${projectId}/api-keys`, {
        headers: {
            'Authorization': `Bearer ${credentials.access_token}`
        }
    });
    const keys = await keysResponse.json();
    const anonKey = keys.find(k => k.name === 'anon')?.api_key;
    const serviceKey = keys.find(k => k.name === 'service_role')?.api_key;
    return {
        id: project.id,
        name: project.name,
        region: project.region,
        database: {
            host: project.database.host,
            port: project.database.port
        },
        api_url: `https://${project.ref}.supabase.co`,
        anon_key: anonKey,
        service_role_key: serviceKey
    };
}
function updateEnvVar(envContent, key, value) {
    const regex = new RegExp(`^${key}=.*$`, 'm');
    const newLine = `${key}=${value}`;
    if (regex.test(envContent)) {
        return envContent.replace(regex, newLine);
    }
    else {
        return envContent + (envContent.endsWith('\n') ? '' : '\n') + newLine + '\n';
    }
}
async function ensureGitignore(cwd, entry) {
    const gitignorePath = path.join(cwd, '.gitignore');
    try {
        let gitignore = await fs.readFile(gitignorePath, 'utf-8');
        if (!gitignore.includes(entry)) {
            gitignore += `\n${entry}\n`;
            await fs.writeFile(gitignorePath, gitignore, 'utf-8');
        }
    }
    catch {
        // .gitignore doesn't exist - create it
        await fs.writeFile(gitignorePath, `${entry}\n`, 'utf-8');
    }
}
async function saveCredentials(cwd, credentials) {
    const credsDir = path.join(cwd, '.codebakers');
    const credsFile = path.join(credsDir, 'credentials.json');
    await fs.mkdir(credsDir, { recursive: true });
    let existing = {};
    try {
        const content = await fs.readFile(credsFile, 'utf-8');
        existing = JSON.parse(content);
    }
    catch {
        // File doesn't exist yet
    }
    existing.supabase = {
        access_token: credentials.access_token,
        refresh_token: credentials.refresh_token,
        created_at: new Date().toISOString()
    };
    await fs.writeFile(credsFile, JSON.stringify(existing, null, 2), 'utf-8');
    // Add to .gitignore
    await ensureGitignore(cwd, '.codebakers/credentials.json');
}
//# sourceMappingURL=setup-supabase.js.map