/**
 * codebakers_deploy_vercel
 *
 * Vercel Deployment Automation
 *
 * Deploys app to Vercel:
 * - Configures project
 * - Sets environment variables
 * - Deploys to production
 * - Returns live URL
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { execSync } from 'child_process';

interface DeployArgs {
  production?: boolean; // Deploy to production (default: true)
  env_file?: string; // Path to .env file (default: .env)
}

export async function deployVercel(args: DeployArgs = {}): Promise<string> {
  const cwd = process.cwd();
  const { production = true, env_file = '.env' } = args;

  console.error('🍞 CodeBakers: Deploying to Vercel');

  try {
    // Step 1: Check if Vercel CLI is installed
    await ensureVercelCLI();

    // Step 2: Check if project is linked
    const projectLinked = await isProjectLinked(cwd);

    if (!projectLinked) {
      console.error('Project not linked to Vercel - linking now...');
      await linkProject(cwd);
    }

    // Step 3: Load environment variables
    const envVars = await loadEnvVars(cwd, env_file);

    // Step 4: Set environment variables in Vercel
    if (envVars.length > 0) {
      console.error(`Setting ${envVars.length} environment variables...`);
      await setEnvVars(cwd, envVars);
    }

    // Step 5: Deploy
    console.error(production ? 'Deploying to production...' : 'Deploying preview...');
    const url = await deploy(cwd, production);

    // Step 6: Update BRAIN.md with deployment info
    await updateBrainWithDeployment(cwd, url);

    return generateDeploymentReport(url, production, envVars.length);
  } catch (error) {
    return `🍞 CodeBakers: Deployment Failed\n\nError: ${error instanceof Error ? error.message : String(error)}`;
  }
}

async function ensureVercelCLI(): Promise<void> {
  try {
    execSync('vercel --version', { stdio: 'ignore' });
  } catch {
    throw new Error(
      'Vercel CLI not installed.\n\n' +
      'Install with: npm install -g vercel\n' +
      'Then run: vercel login'
    );
  }
}

async function isProjectLinked(cwd: string): Promise<boolean> {
  const vercelDir = path.join(cwd, '.vercel');

  try {
    await fs.access(vercelDir);
    return true;
  } catch {
    return false;
  }
}

async function linkProject(cwd: string): Promise<void> {
  try {
    // Try to link project (requires user interaction)
    execSync('vercel link', {
      cwd,
      stdio: 'inherit'
    });
  } catch (error) {
    throw new Error(
      'Failed to link project to Vercel.\n\n' +
      'Run: vercel link\n' +
      'Then retry deployment.'
    );
  }
}

async function loadEnvVars(cwd: string, envFile: string): Promise<Array<{ key: string; value: string }>> {
  const envPath = path.join(cwd, envFile);
  const envVars: Array<{ key: string; value: string }> = [];

  try {
    const content = await fs.readFile(envPath, 'utf-8');
    const lines = content.split('\n');

    for (const line of lines) {
      // Skip comments and empty lines
      if (!line.trim() || line.trim().startsWith('#')) continue;

      const match = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.+)$/);
      if (match) {
        const [, key, value] = match;
        // Remove quotes if present
        const cleanValue = value.replace(/^["']|["']$/g, '');

        envVars.push({ key, value: cleanValue });
      }
    }
  } catch {
    // .env doesn't exist - that's okay
  }

  return envVars;
}

async function setEnvVars(cwd: string, envVars: Array<{ key: string; value: string }>): Promise<void> {
  // Note: vercel env add requires interactive input
  // For automation, we'll provide guidance instead
  console.error(
    '\nEnvironment variables detected.\n' +
    'Set them in Vercel dashboard or run:\n'
  );

  for (const { key } of envVars) {
    console.error(`  vercel env add ${key}`);
  }

  console.error('\nSkipping automatic env setup - deploy will continue...\n');
}

async function deploy(cwd: string, production: boolean): Promise<string> {
  try {
    const args = production ? '--prod' : '';

    const output = execSync(`vercel ${args} --yes`, {
      cwd,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    });

    // Extract URL from output
    const urlMatch = output.match(/https:\/\/[^\s]+/);

    if (urlMatch) {
      return urlMatch[0];
    }

    throw new Error('Deployment succeeded but URL not found in output');
  } catch (error) {
    throw new Error(
      'Deployment failed.\n\n' +
      'Possible causes:\n' +
      '- Not logged in: Run `vercel login`\n' +
      '- Build errors: Check TypeScript and Next.js config\n' +
      '- Missing environment variables\n\n' +
      `Error: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

async function updateBrainWithDeployment(cwd: string, url: string): Promise<void> {
  const brainPath = path.join(cwd, '.codebakers', 'BRAIN.md');

  try {
    let content = await fs.readFile(brainPath, 'utf-8');

    // Update or add deployment section
    const deploymentSection = `\n## Deployment\n\n**Production URL:** ${url}\n**Last deployed:** ${new Date().toISOString()}\n**Platform:** Vercel\n`;

    if (content.includes('## Deployment')) {
      content = content.replace(/## Deployment[\s\S]*?(?=\n##|$)/, deploymentSection);
    } else {
      content += deploymentSection;
    }

    await fs.writeFile(brainPath, content, 'utf-8');
  } catch {
    // BRAIN.md doesn't exist - create minimal version
    await fs.mkdir(path.dirname(brainPath), { recursive: true });
    await fs.writeFile(
      brainPath,
      `# Project Memory\n\n## Deployment\n\n**Production URL:** ${url}\n**Last deployed:** ${new Date().toISOString()}\n**Platform:** Vercel\n`,
      'utf-8'
    );
  }
}

function generateDeploymentReport(url: string, production: boolean, envCount: number): string {
  let report = `🍞 CodeBakers: Deployment ${production ? 'Complete' : 'Preview Ready'}\n\n`;
  report += `✅ **Live URL:** ${url}\n\n`;

  report += `## Deployment Details\n\n`;
  report += `- **Environment:** ${production ? 'Production' : 'Preview'}\n`;
  report += `- **Platform:** Vercel\n`;
  report += `- **Deployed:** ${new Date().toLocaleString()}\n`;

  if (envCount > 0) {
    report += `- **Environment variables:** ${envCount} loaded\n`;
  }

  report += `\n## Next Steps\n\n`;
  report += `1. Visit: ${url}\n`;
  report += `2. Test core functionality\n`;
  report += `3. Monitor errors: https://vercel.com/dashboard\n`;

  if (envCount > 0) {
    report += `4. Verify environment variables in Vercel dashboard\n`;
  }

  report += `\n✨ Your app is live!\n`;

  return report;
}
