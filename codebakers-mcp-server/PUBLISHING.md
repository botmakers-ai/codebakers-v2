# Publishing CodeBakers MCP Server to NPM

## What Gets Published

**Package:** `codebakers-mcp-server/` folder
**Package Name on NPM:** `@codebakers/mcp-server`
**What's Included:**
- `dist/` - Compiled JavaScript (MCP server + CLI)
- `package.json` - Package metadata
- `README.md` - Main documentation
- `INSTALL.md` - Installation guide
- `LICENSE` - MIT license

**What's Excluded:**
- `src/` - TypeScript source (not needed by users)
- `node_modules/` - Dependencies (NPM installs fresh)
- Development files (`.git/`, `tsconfig.json`, etc.)

---

## Prerequisites

### 1. NPM Account
**Create account:** https://www.npmjs.com/signup

**Login to NPM:**
```bash
npm login
```

Enter your:
- Username
- Password
- Email

**Verify login:**
```bash
npm whoami
# Should show your username
```

---

### 2. Organization Setup (For Scoped Packages)

**Package name:** `@codebakers/mcp-server` (scoped under `@codebakers`)

**Option A: Use existing organization**
If you already own `@codebakers` org on NPM - skip to publishing.

**Option B: Create organization**
1. Go to: https://www.npmjs.com/org/create
2. Organization name: `codebakers`
3. Choose plan: Free (for public packages)
4. Create organization

**Option C: Change to unscoped name**
If `codebakers` org isn't available, use unscoped:
```json
{
  "name": "codebakers-mcp-server"  // Instead of @codebakers/mcp-server
}
```

Then install command becomes:
```bash
npx codebakers-mcp-server install
```

---

## Publishing Steps

### Step 1: Final Build

```bash
cd codebakers-mcp-server
npm run build
```

**Verify compiled:**
```bash
ls dist/
# Should see: index.js, cli.js, tools/, and .d.ts files
```

---

### Step 2: Test Package Locally (Recommended)

**Dry run (see what would be published):**
```bash
npm pack --dry-run
```

**Create test tarball:**
```bash
npm pack
```

This creates: `codebakers-mcp-server-5.1.0.tgz`

**Test install locally:**
```bash
npm install -g ./codebakers-mcp-server-5.1.0.tgz
npx @codebakers/mcp-server help
# Should show CLI help
```

**Cleanup test:**
```bash
npm uninstall -g @codebakers/mcp-server
rm codebakers-mcp-server-5.1.0.tgz
```

---

### Step 3: Publish to NPM

**First-time publish:**
```bash
npm publish --access public
```

**Why `--access public`?**
Scoped packages (`@codebakers/...`) default to private. This flag makes it public (free).

**Expected output:**
```
+ @codebakers/mcp-server@5.1.0
```

**Verify on NPM:**
https://www.npmjs.com/package/@codebakers/mcp-server

---

### Step 4: Test Installation (Post-Publish)

**From anywhere:**
```bash
npx @codebakers/mcp-server install
```

Should:
- Download package from NPM
- Run installation wizard
- Configure Claude Desktop

**Verify it works:**
```bash
npx @codebakers/mcp-server status
npx @codebakers/mcp-server help
```

---

## After Publishing

### Users Can Now Install With:

```bash
npx @codebakers/mcp-server install
```

**No repository cloning needed. Works from anywhere globally.**

---

## Updating the Package (Later)

### Step 1: Make Changes

Edit code in `src/`, then rebuild:
```bash
npm run build
```

### Step 2: Bump Version

**Patch (bug fixes):** 5.1.0 → 5.1.1
```bash
npm version patch
```

**Minor (new features):** 5.1.0 → 5.2.0
```bash
npm version minor
```

**Major (breaking changes):** 5.1.0 → 6.0.0
```bash
npm version major
```

This updates `package.json` and creates a git tag.

### Step 3: Publish Update

```bash
npm publish --access public
```

### Step 4: Push Git Tags

```bash
git push origin main --tags
```

**Users get updates automatically** (npx always fetches latest)

---

## Troubleshooting

### "Package name already exists"

**If `@codebakers/mcp-server` is taken:**

Option 1: Use different scoped name
```json
{
  "name": "@your-username/codebakers-mcp"
}
```

Option 2: Use unscoped name
```json
{
  "name": "codebakers-mcp-server"
}
```

Check availability:
```bash
npm view @codebakers/mcp-server
# If shows 404: name is available
# If shows package details: name is taken
```

---

### "You must verify your email"

NPM requires verified email before publishing.

1. Check email for verification link
2. Click link
3. Retry `npm publish`

---

### "You do not have permission"

You're not logged in or don't own the organization.

**Fix:**
```bash
npm login
npm whoami  # Verify logged in
```

If scoped package: Ensure you own `@codebakers` org.

---

### "Need two-factor authentication"

NPM may require 2FA for publishing.

**Enable 2FA:**
1. https://www.npmjs.com/settings/your-username/tfa
2. Follow setup
3. Retry publish (enter OTP when prompted)

---

## Package Stats

After publishing, you can track:
- **Downloads:** https://www.npmjs.com/package/@codebakers/mcp-server
- **Install stats:** https://npmtrends.com/@codebakers/mcp-server
- **GitHub stars:** Link package to GitHub repo in package.json

---

## Linking GitHub to NPM Package

Add to `package.json`:
```json
{
  "repository": {
    "type": "git",
    "url": "https://github.com/botmakers-ai/codebakers-v2.git",
    "directory": "codebakers-mcp-server"
  },
  "bugs": {
    "url": "https://github.com/botmakers-ai/codebakers-v2/issues"
  },
  "homepage": "https://github.com/botmakers-ai/codebakers-v2#readme"
}
```

Then republish with version bump.

---

## Summary

**To publish NOW:**

```bash
cd codebakers-mcp-server
npm run build
npm login
npm publish --access public
```

**Users install with:**
```bash
npx @codebakers/mcp-server install
```

**To update later:**
```bash
npm version patch  # or minor/major
npm publish --access public
git push origin main --tags
```

---

**That's it! Your package is live on NPM.**
