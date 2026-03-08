#!/usr/bin/env node

/**
 * CodeBakers MCP Server CLI
 *
 * Simple CLI for installing and managing CodeBakers MCP Server
 * Usage: npx @codebakers/mcp-server install
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main() {
  const command = process.argv[2];

  if (!command || command === 'help' || command === '--help' || command === '-h') {
    showHelp();
    return;
  }

  switch (command) {
    case 'install':
      await install();
      break;
    case 'uninstall':
      await uninstall();
      break;
    case 'status':
      await showStatus();
      break;
    case 'init':
      await init();
      break;
    case 'version':
      console.log('CodeBakers MCP Server v5.6.1');
      break;
    default:
      console.error(`Unknown command: ${command}`);
      console.error('Run "codebakers help" for usage');
      process.exit(1);
  }
}

function showHelp() {
  console.log(`
🍞 CodeBakers MCP Server CLI

USAGE:
  npx @codebakers/mcp <command>

COMMANDS:
  install      Install CodeBakers MCP Server to Claude Desktop (one-time setup)
  init         Copy CLAUDE.md to current directory (run in each project)
  uninstall    Remove CodeBakers MCP Server from Claude Desktop
  status       Check current installation status
  version      Show version
  help         Show this help

EXAMPLES:
  npx @codebakers/mcp install      # One-time: Configure Claude Desktop
  npx @codebakers/mcp init         # Per-project: Enable CodeBakers experience
  npx @codebakers/mcp status       # Check installation

QUICK START:
  1. npx @codebakers/mcp install   (configure Claude Desktop)
  2. Restart Claude Desktop
  3. cd your-project
  4. npx @codebakers/mcp init      (enable CodeBakers in this project)
  5. Open project in Claude Desktop and start chatting!

WHAT EACH COMMAND DOES:
  install  - Configures Claude Desktop to use CodeBakers MCP tools
  init     - Copies CLAUDE.md to your project for the full conversational experience
  status   - Shows if CodeBakers is installed and configured
`);
}

async function install() {
  console.log('🍞 CodeBakers MCP Server - Installation\n');

  try {
    // 1. Locate Claude Desktop config
    const configPath = await findClaudeDesktopConfig();

    if (!configPath) {
      console.error('❌ Could not find Claude Desktop config file\n');
      console.error('Expected locations:');
      console.error('  Windows: %APPDATA%\\Claude\\claude_desktop_config.json');
      console.error('  macOS: ~/Library/Application Support/Claude/claude_desktop_config.json');
      console.error('  Linux: ~/.config/Claude/claude_desktop_config.json\n');
      console.error('Please ensure Claude Desktop is installed.');
      process.exit(1);
    }

    console.log(`✓ Found Claude Desktop config: ${configPath}\n`);

    // 2. Get MCP server path
    const serverPath = getServerPath();
    console.log(`✓ MCP Server location: ${serverPath}\n`);

    // 3. Read existing config
    let config: any = {};
    try {
      const existing = await fs.readFile(configPath, 'utf-8');
      config = JSON.parse(existing);
    } catch {
      // File doesn't exist or is invalid - create new
      config = {};
    }

    // 4. Add CodeBakers MCP Server
    config.mcpServers = config.mcpServers || {};

    if (config.mcpServers.codebakers) {
      console.log('⚠️  CodeBakers MCP Server already installed\n');
      console.log('Current configuration:');
      console.log(JSON.stringify(config.mcpServers.codebakers, null, 2));
      console.log('\nOverwrite? (y/N)');

      // Simple stdin read for confirmation
      const readline = await import('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      const answer = await new Promise<string>((resolve) => {
        rl.question('', (answer) => {
          rl.close();
          resolve(answer.toLowerCase());
        });
      });

      if (answer !== 'y' && answer !== 'yes') {
        console.log('Installation cancelled.');
        return;
      }
    }

    config.mcpServers.codebakers = {
      command: 'npx',
      args: ['-y', '-p', '@codebakers/mcp@latest', 'codebakers-mcp-server']
    };

    // 5. Write updated config
    await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');

    console.log('✅ Installation complete!\n');
    console.log('NEXT STEPS:');
    console.log('  1. Restart Claude Desktop');
    console.log('  2. Open a conversation');
    console.log('  3. CodeBakers tools will be available automatically\n');
    console.log('VERIFY:');
    console.log('  Run: codebakers_get_context');
    console.log('  Should return project context information\n');

  } catch (error) {
    console.error('❌ Installation failed:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

async function uninstall() {
  console.log('🍞 CodeBakers MCP Server - Uninstallation\n');

  try {
    const configPath = await findClaudeDesktopConfig();

    if (!configPath) {
      console.log('⚠️  No Claude Desktop config found - nothing to uninstall');
      return;
    }

    const content = await fs.readFile(configPath, 'utf-8');
    const config = JSON.parse(content);

    if (!config.mcpServers?.codebakers) {
      console.log('⚠️  CodeBakers MCP Server not installed');
      return;
    }

    delete config.mcpServers.codebakers;

    await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');

    console.log('✅ CodeBakers MCP Server removed\n');
    console.log('Restart Claude Desktop to apply changes.');

  } catch (error) {
    console.error('❌ Uninstallation failed:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

async function showStatus() {
  console.log('🍞 CodeBakers MCP Server - Status\n');

  try {
    const configPath = await findClaudeDesktopConfig();

    if (!configPath) {
      console.log('❌ Claude Desktop config not found');
      return;
    }

    console.log(`✓ Claude Desktop config: ${configPath}`);

    const content = await fs.readFile(configPath, 'utf-8');
    const config = JSON.parse(content);

    if (config.mcpServers?.codebakers) {
      console.log('✓ CodeBakers MCP Server: INSTALLED\n');
      console.log('Configuration:');
      console.log(JSON.stringify(config.mcpServers.codebakers, null, 2));
    } else {
      console.log('✗ CodeBakers MCP Server: NOT INSTALLED\n');
      console.log('Run "npx @codebakers/mcp-server install" to install');
    }

  } catch (error) {
    console.error('❌ Status check failed:', error instanceof Error ? error.message : String(error));
  }
}

async function init() {
  console.log('🍞 CodeBakers - Project Initialization\n');

  try {
    const cwd = process.cwd();
    const targetPath = path.join(cwd, 'CLAUDE.md');

    // Check if CLAUDE.md already exists
    try {
      await fs.access(targetPath);
      console.log('⚠️  CLAUDE.md already exists in this directory\n');

      // Ask if they want to overwrite
      const readline = await import('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      const answer = await new Promise<string>((resolve) => {
        rl.question('Overwrite? (y/N) ', (answer) => {
          rl.close();
          resolve(answer.toLowerCase());
        });
      });

      if (answer !== 'y' && answer !== 'yes') {
        console.log('Initialization cancelled.');
        return;
      }
    } catch {
      // File doesn't exist, continue
    }

    // Get the source CLAUDE.md from the NPM package
    // When installed via NPM, __dirname is the dist folder
    // CLAUDE.md is in the package root (one level up from dist)
    const sourcePath = path.join(__dirname, '..', 'CLAUDE.md');

    // Check if source exists
    try {
      await fs.access(sourcePath);
    } catch {
      console.error('❌ CLAUDE.md not found in package\n');
      console.error('This might be an older version of @codebakers/mcp');
      console.error('Try: npm install -g @codebakers/mcp@latest');
      process.exit(1);
    }

    // Copy CLAUDE.md
    await fs.copyFile(sourcePath, targetPath);

    console.log('✅ CLAUDE.md copied to current directory\n');
    console.log('📁 Location:', targetPath);
    console.log('\n✨ Your project is now CodeBakers-enabled!\n');
    console.log('NEXT STEPS:');
    console.log('  1. Open this folder in Claude Desktop');
    console.log('  2. Go to the Chat tab');
    console.log('  3. Type "hi" or just press Enter');
    console.log('  4. You\'ll see the CodeBakers welcome message!\n');
    console.log('💡 TIP: Claude Desktop will now use CodeBakers conversational');
    console.log('   style when working in this directory.\n');

  } catch (error) {
    console.error('❌ Initialization failed:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

async function findClaudeDesktopConfig(): Promise<string | null> {
  const platform = process.platform;
  let configPath: string;

  if (platform === 'win32') {
    const appData = process.env.APPDATA;
    if (!appData) return null;
    configPath = path.join(appData, 'Claude', 'claude_desktop_config.json');
  } else if (platform === 'darwin') {
    const home = process.env.HOME;
    if (!home) return null;
    configPath = path.join(home, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json');
  } else {
    // Linux
    const home = process.env.HOME;
    if (!home) return null;
    configPath = path.join(home, '.config', 'Claude', 'claude_desktop_config.json');
  }

  try {
    await fs.access(configPath);
    return configPath;
  } catch {
    // Try to create the directory
    try {
      await fs.mkdir(path.dirname(configPath), { recursive: true });
      return configPath;
    } catch {
      return null;
    }
  }
}

function getServerPath(): string {
  // When installed via NPM, __dirname is the dist folder
  // The index.js file is in the same folder
  return path.join(__dirname, 'index.js');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
