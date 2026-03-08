/**
 * codebakers_setup_vercel
 *
 * Vercel Project Setup with OAuth
 *
 * Prompts user:
 * - Have existing Vercel project? → Link it
 * - Create/Link new project? → OAuth → Link → Configure
 * - Skip? → User will configure manually later
 *
 * For new projects:
 * - Opens browser for Vercel OAuth
 * - Links project to Vercel
 * - Configures deployment settings
 */
import * as fs from 'fs/promises';
import * as path from 'path';
import { execSync } from 'child_process';
import * as http from 'http';
import * as url from 'url';
const VERCEL_AUTH_URL = 'https://vercel.com/oauth/authorize';
const VERCEL_API_URL = 'https://api.vercel.com';
export async function setupVercel(args = {}) {
    const cwd = process.cwd();
    const { mode, project_name, production_branch = 'main' } = args;
    console.error('🍞 CodeBakers: Vercel Setup');
    try {
        // Check if Vercel CLI is installed
        const hasVercelCli = await checkVercelCli();
        // Mode selection
        if (!mode) {
            return `🍞 CodeBakers: Vercel Project Setup\n\n**Choose an option:**\n\n1. **Link Vercel project** → \`mode: "link"\`\n2. **Skip (configure manually later)** → \`mode: "skip"\`\n\n**Example:**\ncodebakers_setup_vercel({ mode: "link", project_name: "my-app", production_branch: "main" })\n\n${!hasVercelCli ? '\n⚠️ **Vercel CLI not detected.**\n\nInstall it first:\n```bash\npnpm add -g vercel\n```\n\nOr use NPX:\n```bash\nnpx vercel link\n```' : ''}`;
        }
        if (mode === 'skip') {
            return `🍞 CodeBakers: Vercel setup skipped.\n\nYou can configure Vercel manually later:\n\n\`\`\`bash\npnpm add -g vercel\nvercel link\n\`\`\``;
        }
        if (mode === 'link') {
            if (!hasVercelCli) {
                return `🍞 CodeBakers: ❌ Vercel CLI Not Found\n\nInstall Vercel CLI first:\n\n\`\`\`bash\npnpm add -g vercel\n\`\`\`\n\nOr use NPX:\n\`\`\`bash\nnpx vercel link\n\`\`\`\n\nThen run this tool again.`;
            }
            return await linkProject(cwd, project_name, production_branch);
        }
        return `🍞 CodeBakers: Invalid mode. Use: "link" or "skip"`;
    }
    catch (error) {
        return `🍞 CodeBakers: Vercel Setup Failed\n\nError: ${error instanceof Error ? error.message : String(error)}`;
    }
}
async function checkVercelCli() {
    try {
        execSync('vercel --version', { stdio: 'ignore' });
        return true;
    }
    catch {
        return false;
    }
}
async function linkProject(cwd, projectName, productionBranch) {
    try {
        console.error('\n🔗 Linking Vercel project...\n');
        console.error('This will open Vercel authentication in your browser.\n');
        // Check if already linked
        const vercelDir = path.join(cwd, '.vercel');
        let alreadyLinked = false;
        try {
            await fs.access(vercelDir);
            alreadyLinked = true;
        }
        catch {
            // Not linked yet
        }
        if (alreadyLinked) {
            const projectFile = path.join(vercelDir, 'project.json');
            try {
                const projectData = JSON.parse(await fs.readFile(projectFile, 'utf-8'));
                return `🍞 CodeBakers: ✅ Already Linked to Vercel\n\n**Project ID:** ${projectData.projectId}\n**Org ID:** ${projectData.orgId}\n\nTo re-link:\n1. Delete \`.vercel/\` directory\n2. Run this tool again\n\nTo deploy:\n\`\`\`bash\nvercel --prod\n\`\`\``;
            }
            catch {
                // Project file corrupted - continue with linking
            }
        }
        // Run vercel link
        console.error('Running: vercel link\n');
        try {
            const output = execSync('vercel link --yes', {
                cwd,
                encoding: 'utf-8',
                stdio: 'inherit'
            });
            // Read linked project details
            const projectFile = path.join(vercelDir, 'project.json');
            const projectData = JSON.parse(await fs.readFile(projectFile, 'utf-8'));
            // Get project name from Vercel
            const projectInfo = await getProjectInfo(projectData.projectId, projectData.orgId);
            return `🍞 CodeBakers: ✅ Vercel Project Linked\n\n**Project:** ${projectInfo.name}\n**Project ID:** ${projectData.projectId}\n**Dashboard:** https://vercel.com/${projectData.orgId}/${projectInfo.name}\n\n**Deploy to production:**\n\`\`\`bash\nvercel --prod\n\`\`\`\n\n**Or use CodeBakers:**\n\`\`\`\ncodebakers_deploy_vercel({ production: true })\n\`\`\``;
        }
        catch (error) {
            throw new Error(`Failed to link Vercel project: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    catch (error) {
        throw new Error(`Vercel link failed: ${error instanceof Error ? error.message : String(error)}`);
    }
}
async function getProjectInfo(projectId, teamId) {
    try {
        // Try to read Vercel auth token
        const authToken = await getVercelAuthToken();
        if (!authToken) {
            // Can't get project info without token - return basic info
            return {
                name: projectId,
                id: projectId
            };
        }
        const url = teamId
            ? `${VERCEL_API_URL}/v9/projects/${projectId}?teamId=${teamId}`
            : `${VERCEL_API_URL}/v9/projects/${projectId}`;
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        if (!response.ok) {
            // Can't fetch - return basic info
            return {
                name: projectId,
                id: projectId
            };
        }
        return await response.json();
    }
    catch {
        // Fallback
        return {
            name: projectId,
            id: projectId
        };
    }
}
async function getVercelAuthToken() {
    try {
        // Try to read from Vercel CLI config
        const homeDir = process.env.HOME || process.env.USERPROFILE;
        if (!homeDir)
            return null;
        const configPath = path.join(homeDir, '.vercel', 'auth.json');
        const configData = JSON.parse(await fs.readFile(configPath, 'utf-8'));
        return configData.token || null;
    }
    catch {
        return null;
    }
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
              <head><title>Vercel Authentication</title></head>
              <body style="font-family: system-ui; max-width: 600px; margin: 100px auto; text-align: center;">
                <h1 style="color: #000;">✅ Authentication Successful!</h1>
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
        server.listen(3002, () => {
            const authUrl = `${VERCEL_AUTH_URL}?client_id=vercel-cli&redirect_uri=http://localhost:3002/callback&response_type=code`;
            console.error(`Opening browser to Vercel login...\n`);
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
    const response = await fetch(`${VERCEL_API_URL}/v2/oauth/access_token`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
            client_id: 'vercel-cli',
            code,
            redirect_uri: 'http://localhost:3002/callback'
        })
    });
    const data = await response.json();
    if (data.error) {
        throw new Error(`Vercel OAuth error: ${data.error_description || data.error}`);
    }
    return {
        access_token: data.access_token,
        team_id: data.team_id
    };
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
    existing.vercel = {
        access_token: credentials.access_token,
        team_id: credentials.team_id,
        created_at: new Date().toISOString()
    };
    await fs.writeFile(credsFile, JSON.stringify(existing, null, 2), 'utf-8');
    // Add to .gitignore
    const gitignorePath = path.join(cwd, '.gitignore');
    try {
        let gitignore = await fs.readFile(gitignorePath, 'utf-8');
        if (!gitignore.includes('.codebakers/credentials.json')) {
            gitignore += '\n.codebakers/credentials.json\n';
            await fs.writeFile(gitignorePath, gitignore, 'utf-8');
        }
    }
    catch {
        // .gitignore doesn't exist - create it
        await fs.writeFile(gitignorePath, '.codebakers/credentials.json\n', 'utf-8');
    }
}
//# sourceMappingURL=setup-vercel.js.map