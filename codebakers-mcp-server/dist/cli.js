#!/usr/bin/env node
/**
 * CodeBakers MCP Server CLI
 *
 * Simple CLI for installing and managing CodeBakers MCP Server
 * Usage: npx @codebakers/mcp-server install
 */
import * as fs from 'fs/promises';
import * as path from 'path';
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
        case 'version':
            console.log('CodeBakers MCP Server v5.1.0');
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
  npx @codebakers/mcp-server <command>

COMMANDS:
  install      Install CodeBakers MCP Server to Claude Desktop
  uninstall    Remove CodeBakers MCP Server from Claude Desktop
  status       Check current installation status
  version      Show version
  help         Show this help

EXAMPLES:
  npx @codebakers/mcp-server install
  npx @codebakers/mcp-server status

WHAT IT DOES:
  - Locates Claude Desktop config file
  - Adds CodeBakers MCP Server configuration
  - Provides path to MCP server executable
  - No manual JSON editing required

AFTER INSTALLATION:
  1. Restart Claude Desktop
  2. CodeBakers tools will appear automatically
  3. Run: codebakers_get_context to verify
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
        let config = {};
        try {
            const existing = await fs.readFile(configPath, 'utf-8');
            config = JSON.parse(existing);
        }
        catch {
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
            const answer = await new Promise((resolve) => {
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
            command: 'node',
            args: [serverPath]
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
    }
    catch (error) {
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
    }
    catch (error) {
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
        }
        else {
            console.log('✗ CodeBakers MCP Server: NOT INSTALLED\n');
            console.log('Run "npx @codebakers/mcp-server install" to install');
        }
    }
    catch (error) {
        console.error('❌ Status check failed:', error instanceof Error ? error.message : String(error));
    }
}
async function findClaudeDesktopConfig() {
    const platform = process.platform;
    let configPath;
    if (platform === 'win32') {
        const appData = process.env.APPDATA;
        if (!appData)
            return null;
        configPath = path.join(appData, 'Claude', 'claude_desktop_config.json');
    }
    else if (platform === 'darwin') {
        const home = process.env.HOME;
        if (!home)
            return null;
        configPath = path.join(home, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json');
    }
    else {
        // Linux
        const home = process.env.HOME;
        if (!home)
            return null;
        configPath = path.join(home, '.config', 'Claude', 'claude_desktop_config.json');
    }
    try {
        await fs.access(configPath);
        return configPath;
    }
    catch {
        // Try to create the directory
        try {
            await fs.mkdir(path.dirname(configPath), { recursive: true });
            return configPath;
        }
        catch {
            return null;
        }
    }
}
function getServerPath() {
    // When installed via NPM, __dirname is the dist folder
    // The index.js file is in the same folder
    return path.join(__dirname, 'index.js');
}
main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
});
//# sourceMappingURL=cli.js.map