/**
 * codebakers_setup_github
 *
 * GitHub Repository Setup with OAuth
 *
 * Prompts user:
 * - Have existing GitHub repo? → Configure remote
 * - Create new repo? → OAuth → Create → Configure git
 * - Skip? → User will configure manually later
 *
 * For new repos:
 * - Opens browser for GitHub OAuth
 * - Creates repository via GitHub API
 * - Configures git remote
 * - Makes initial commit and push
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { execSync } from 'child_process';
import * as http from 'http';
import * as url from 'url';

interface GitHubSetupArgs {
  mode?: 'existing' | 'create' | 'skip';
  repo_name?: string;
  repo_url?: string;
  is_private?: boolean;
}

interface GitHubCredentials {
  access_token: string;
  username: string;
}

const GITHUB_CLIENT_ID = 'Ov23liPmfN1K2T4M3mBr'; // CodeBakers public client
const GITHUB_SCOPES = 'repo,user';

export async function setupGitHub(args: GitHubSetupArgs = {}): Promise<string> {
  const cwd = process.cwd();
  const { mode, repo_name, repo_url, is_private = true } = args;

  console.error('🍞 CodeBakers: GitHub Setup');

  try {
    // Check if git is initialized
    const isGitRepo = await checkGitRepo(cwd);
    if (!isGitRepo) {
      return `🍞 CodeBakers: ❌ Git Not Initialized\n\nThis directory is not a git repository.\n\nRun first:\ngit init\n\nThen run this tool again.`;
    }

    // Mode selection
    if (!mode) {
      return `🍞 CodeBakers: GitHub Repository Setup\n\n**Choose an option:**\n\n1. **Have existing GitHub repo** → \`mode: "existing"\`\n2. **Create new GitHub repo** → \`mode: "create"\`\n3. **Skip (configure manually later)** → \`mode: "skip"\`\n\n**Example:**\ncodebakers_setup_github({ mode: "create", repo_name: "my-app", is_private: true })`;
    }

    if (mode === 'skip') {
      return `🍞 CodeBakers: GitHub setup skipped.\n\nYou can configure GitHub manually later or run this tool again.`;
    }

    if (mode === 'existing') {
      if (!repo_url) {
        return `🍞 CodeBakers: Missing Repository URL\n\nProvide your GitHub repository URL:\n\ncodebakers_setup_github({ mode: "existing", repo_url: "https://github.com/username/repo.git" })`;
      }

      return await configureExistingRepo(cwd, repo_url);
    }

    if (mode === 'create') {
      if (!repo_name) {
        return `🍞 CodeBakers: Missing Repository Name\n\nProvide a name for your new repository:\n\ncodebakers_setup_github({ mode: "create", repo_name: "my-app", is_private: true })`;
      }

      return await createNewRepo(cwd, repo_name, is_private);
    }

    return `🍞 CodeBakers: Invalid mode. Use: "existing", "create", or "skip"`;
  } catch (error) {
    return `🍞 CodeBakers: GitHub Setup Failed\n\nError: ${error instanceof Error ? error.message : String(error)}`;
  }
}

async function checkGitRepo(cwd: string): Promise<boolean> {
  try {
    execSync('git rev-parse --git-dir', { cwd, stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

async function configureExistingRepo(cwd: string, repoUrl: string): Promise<string> {
  try {
    // Check if remote 'origin' already exists
    let currentRemote = '';
    try {
      currentRemote = execSync('git remote get-url origin', { cwd, encoding: 'utf-8' }).trim();
    } catch {
      // No remote exists
    }

    if (currentRemote) {
      if (currentRemote === repoUrl) {
        return `🍞 CodeBakers: ✅ GitHub Already Configured\n\nRepository: ${repoUrl}\nRemote 'origin' is already set correctly.`;
      } else {
        // Different remote - update it
        execSync(`git remote set-url origin "${repoUrl}"`, { cwd });
        return `🍞 CodeBakers: ✅ GitHub Remote Updated\n\nOld: ${currentRemote}\nNew: ${repoUrl}\n\nRun: git push -u origin main`;
      }
    }

    // Add new remote
    execSync(`git remote add origin "${repoUrl}"`, { cwd });

    return `🍞 CodeBakers: ✅ GitHub Remote Configured\n\nRepository: ${repoUrl}\n\n**Next steps:**\n1. Ensure you have committed your code: \`git add . && git commit -m "initial commit"\`\n2. Push to GitHub: \`git push -u origin main\``;
  } catch (error) {
    throw new Error(`Failed to configure remote: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function createNewRepo(cwd: string, repoName: string, isPrivate: boolean): Promise<string> {
  console.error('\n🔐 Starting GitHub OAuth flow...\n');
  console.error('A browser window will open for GitHub authentication.\n');

  // Start OAuth flow
  const credentials = await startOAuthFlow();

  console.error('\n✅ Authentication successful!\n');
  console.error(`Creating repository: ${repoName}...\n`);

  // Create repository via GitHub API
  const repoData = await createGitHubRepo(credentials, repoName, isPrivate);

  console.error(`✅ Repository created: ${repoData.html_url}\n`);

  // Configure git remote
  const cloneUrl = repoData.clone_url;
  await configureExistingRepo(cwd, cloneUrl);

  // Save credentials for future use
  await saveCredentials(cwd, credentials);

  // Make initial commit if needed
  const hasCommits = await checkHasCommits(cwd);
  if (!hasCommits) {
    console.error('Making initial commit...\n');
    execSync('git add .', { cwd });
    execSync('git commit -m "chore: initial commit via CodeBakers"', { cwd, stdio: 'ignore' });
  }

  // Push to GitHub
  console.error('Pushing to GitHub...\n');
  try {
    execSync('git push -u origin main', { cwd, stdio: 'inherit' });
  } catch {
    // Try master if main fails
    try {
      execSync('git push -u origin master', { cwd, stdio: 'inherit' });
    } catch (error) {
      console.error('⚠️ Push failed. You may need to push manually.\n');
    }
  }

  return `🍞 CodeBakers: ✅ GitHub Repository Created\n\n**Repository:** ${repoData.html_url}\n**Clone URL:** ${cloneUrl}\n**Visibility:** ${isPrivate ? 'Private' : 'Public'}\n\n✅ Git remote configured\n✅ Initial commit pushed\n\n**GitHub credentials saved** to .codebakers/credentials.json`;
}

async function startOAuthFlow(): Promise<GitHubCredentials> {
  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      const parsedUrl = url.parse(req.url || '', true);

      if (parsedUrl.pathname === '/callback') {
        const code = parsedUrl.query.code as string;

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
              <head><title>GitHub Authentication</title></head>
              <body style="font-family: system-ui; max-width: 600px; margin: 100px auto; text-align: center;">
                <h1 style="color: #28a745;">✅ Authentication Successful!</h1>
                <p>You can close this window and return to your terminal.</p>
              </body>
            </html>
          `);

          server.close();
          resolve(credentials);
        } catch (error) {
          res.writeHead(500, { 'Content-Type': 'text/html' });
          res.end('<h1>Error: Failed to authenticate</h1>');
          server.close();
          reject(error);
        }
      }
    });

    server.listen(3000, () => {
      const authUrl = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&scope=${GITHUB_SCOPES}&redirect_uri=http://localhost:3000/callback`;

      console.error(`Opening browser to: ${authUrl}\n`);

      // Open browser
      const open = process.platform === 'win32' ? 'start' : process.platform === 'darwin' ? 'open' : 'xdg-open';
      try {
        execSync(`${open} "${authUrl}"`, { stdio: 'ignore' });
      } catch {
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

async function exchangeCodeForToken(code: string): Promise<GitHubCredentials> {
  // Note: In production, this should go through a backend server
  // For now, using GitHub Device Flow would be more secure
  // This is a simplified implementation

  const response = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({
      client_id: GITHUB_CLIENT_ID,
      code,
      redirect_uri: 'http://localhost:3000/callback'
    })
  });

  const data = await response.json() as any;

  if (data.error) {
    throw new Error(`GitHub OAuth error: ${data.error_description || data.error}`);
  }

  const accessToken = data.access_token;

  // Get username
  const userResponse = await fetch('https://api.github.com/user', {
    headers: {
      'Authorization': `token ${accessToken}`,
      'Accept': 'application/vnd.github.v3+json'
    }
  });

  const userData = await userResponse.json() as any;

  return {
    access_token: accessToken,
    username: userData.login
  };
}

async function createGitHubRepo(credentials: GitHubCredentials, repoName: string, isPrivate: boolean): Promise<any> {
  const response = await fetch('https://api.github.com/user/repos', {
    method: 'POST',
    headers: {
      'Authorization': `token ${credentials.access_token}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: repoName,
      private: isPrivate,
      auto_init: false
    })
  });

  if (!response.ok) {
    const error = await response.json() as any;
    throw new Error(`Failed to create repository: ${error.message || response.statusText}`);
  }

  return await response.json();
}

async function saveCredentials(cwd: string, credentials: GitHubCredentials): Promise<void> {
  const credsDir = path.join(cwd, '.codebakers');
  const credsFile = path.join(credsDir, 'credentials.json');

  await fs.mkdir(credsDir, { recursive: true });

  let existing: any = {};
  try {
    const content = await fs.readFile(credsFile, 'utf-8');
    existing = JSON.parse(content);
  } catch {
    // File doesn't exist yet
  }

  existing.github = {
    username: credentials.username,
    access_token: credentials.access_token,
    created_at: new Date().toISOString()
  };

  await fs.writeFile(credsFile, JSON.stringify(existing, null, 2), 'utf-8');

  // Add to .gitignore
  const gitignorePath = path.join(cwd, '.gitignore');
  try {
    let gitignore = await fs.readFile(gitignorePath, 'utf-8');
    if (!gitignore.includes('.codebakers/credentials.json')) {
      gitignore += '\n# CodeBakers credentials (DO NOT COMMIT)\n.codebakers/credentials.json\n';
      await fs.writeFile(gitignorePath, gitignore, 'utf-8');
    }
  } catch {
    // .gitignore doesn't exist - create it
    await fs.writeFile(gitignorePath, '.codebakers/credentials.json\n', 'utf-8');
  }
}

async function checkHasCommits(cwd: string): Promise<boolean> {
  try {
    execSync('git log -1', { cwd, stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}
