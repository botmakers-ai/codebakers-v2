# CodeBakers MCP Server - Installation Guide

## One-Command Installation

The easiest way to install CodeBakers MCP Server:

```bash
npx @codebakers/mcp-server install
```

That's it! This command will:
- ✓ Locate your Claude Desktop config file automatically
- ✓ Add CodeBakers MCP Server configuration
- ✓ Set the correct path to the server
- ✓ No manual JSON editing required

**After installation:**
1. Restart Claude Desktop
2. CodeBakers tools will be available automatically
3. Verify: Run `codebakers_get_context` in Claude Desktop

---

## Other Commands

### Check Installation Status
```bash
npx @codebakers/mcp-server status
```

Shows whether CodeBakers is installed and displays the current configuration.

### Uninstall
```bash
npx @codebakers/mcp-server uninstall
```

Removes CodeBakers MCP Server from Claude Desktop config.

### Version
```bash
npx @codebakers/mcp-server version
```

Shows the current version of CodeBakers MCP Server.

### Help
```bash
npx @codebakers/mcp-server help
```

Displays all available commands.

---

## Manual Installation (Advanced)

If you prefer to configure manually:

### 1. Install the package
```bash
npm install -g @codebakers/mcp-server
```

### 2. Find your Claude Desktop config file

**Windows:**
```
%APPDATA%\Claude\claude_desktop_config.json
```

**macOS:**
```
~/Library/Application Support/Claude/claude_desktop_config.json
```

**Linux:**
```
~/.config/Claude/claude_desktop_config.json
```

### 3. Add CodeBakers configuration

Open the config file and add:

```json
{
  "mcpServers": {
    "codebakers": {
      "command": "node",
      "args": ["/path/to/codebakers-mcp-server/dist/index.js"]
    }
  }
}
```

Replace `/path/to/codebakers-mcp-server/dist/index.js` with the actual path.

### 4. Restart Claude Desktop

---

## Development Installation (Contributors)

If you're contributing to CodeBakers:

### 1. Clone the repository
```bash
git clone https://github.com/botmakers-ai/codebakers-v2.git
cd codebakers-v2/codebakers-mcp-server
```

### 2. Install dependencies
```bash
npm install
```

### 3. Build
```bash
npm run build
```

### 4. Link locally (optional)
```bash
npm link
```

### 5. Add to Claude Desktop config

Get the absolute path to `dist/index.js`:
```bash
# Windows
cd
# macOS/Linux
pwd
```

Add to Claude Desktop config:
```json
{
  "mcpServers": {
    "codebakers": {
      "command": "node",
      "args": ["C:/dev/1 - CodeBakers v2/codebakers-mcp-server/dist/index.js"]
    }
  }
}
```

### 6. Restart Claude Desktop

---

## Troubleshooting

### Command not found: codebakers
You're using the wrong command. Use:
```bash
npx @codebakers/mcp-server install
```

NOT:
```bash
codebakers install  # ❌ Wrong
```

### Claude Desktop config not found
The installer will create the config directory automatically. If it fails:

1. Ensure Claude Desktop is installed
2. Run Claude Desktop at least once
3. Try manual installation

### Tools not appearing in Claude Desktop
1. Verify installation: `npx @codebakers/mcp-server status`
2. Restart Claude Desktop completely (quit and relaunch)
3. Check Claude Desktop logs for MCP connection errors
4. Ensure Node.js v18+ is installed: `node --version`

### Permission errors
On macOS/Linux, you might need to make the CLI executable:
```bash
chmod +x node_modules/@codebakers/mcp-server/dist/cli.js
```

---

## Verification

After installation, open Claude Desktop and run:

```
codebakers_get_context
```

You should see:
```
🍞 CodeBakers: [project information]
```

If you see this, installation was successful!

---

## Next Steps

Once installed:

1. **New Project:** Run `codebakers_run_interview` to start
2. **Existing Project:** Run `codebakers_get_context` to load state
3. **Read Documentation:** Check `V5.1.0-AUTONOMOUS-BUILD-COMPLETE.md` for full feature list

---

## Support

**Issues:** https://github.com/botmakers-ai/codebakers-v2/issues

**Documentation:** See main repository README

**License:** MIT
