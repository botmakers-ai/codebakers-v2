/**
 * codebakers_start
 *
 * Interactive Onboarding & Session Start
 *
 * Kicks off an interactive CodeBakers session with step-by-step guidance.
 * Use this when starting a new project or resuming an existing one.
 *
 * Purpose: Make CodeBakers approachable and guide users through the process
 */

import * as fs from 'fs/promises';
import * as path from 'path';

export async function start(args: {}): Promise<string> {
  const cwd = process.cwd();

  console.error('🍞 CodeBakers: Interactive Session Start');

  try {
    // Check if .codebakers exists
    const codebakersDir = path.join(cwd, '.codebakers');
    const codebakersExists = await fs.access(codebakersDir).then(() => true).catch(() => false);

    // Check for PROJECT-SPEC.md
    const specPath = path.join(codebakersDir, 'PROJECT-SPEC.md');
    const specExists = codebakersExists && await fs.access(specPath).then(() => true).catch(() => false);

    // Check for BUILD-STATE.md
    const buildStatePath = path.join(codebakersDir, 'BUILD-STATE.md');
    const buildStateExists = codebakersExists && await fs.access(buildStatePath).then(() => true).catch(() => false);

    // Check for mockups
    const mockupDir = path.join(cwd, 'refs', 'design');
    const mockupsExist = await fs.access(mockupDir)
      .then(async () => {
        const files = await fs.readdir(mockupDir);
        return files.some(f => f.match(/\.(png|jpg|jpeg|svg|figma)$/i));
      })
      .catch(() => false);

    // Determine current state and provide interactive guidance
    if (!codebakersExists) {
      // Brand new project
      return `🍞 **Welcome to CodeBakers!**

I'm your AI development partner. Together, we'll build your application from idea to deployed product in 30 minutes.

**Here's how this works:**

**Step 1: Tell me what you want to build** 🎯
Just describe your idea in plain English. Examples:
- "A task manager for remote teams"
- "An expense tracker for freelancers"
- "A CRM for small businesses"

**Step 2: I'll create a complete specification** 📋
I'll research your domain and generate a detailed PROJECT-SPEC.md with:
- All features broken down
- Database schema
- User flows
- Tech stack decisions

**Step 3: Design mockups** 🎨
You can either:
- Upload designs from Figma
- Have me generate mockups
- Draw them and I'll analyze

**Step 4: I build everything automatically** 🚀
I'll generate:
- Database migrations
- API routes (with security)
- React components (all 4 states: loading/error/empty/success)
- Tests (unit + E2E)
- Documentation

**Step 5: Deploy to production** ☁️
One command and your app is live on Vercel with Supabase backend.

---

**Let's get started!**

**What do you want to build?** (Just describe it in 1-2 sentences)

_I'll take it from there and guide you through each step._`;

    } else if (!specExists) {
      // .codebakers exists but no spec
      return `🍞 **CodeBakers Session**

I see you've started a project, but there's no specification yet.

**Let's create your PROJECT-SPEC.md:**

**What does this app do?** (Describe your idea in 1-2 sentences)

Examples:
- "Helps freelancers track time and generate invoices"
- "Lets teams collaborate on documents in real-time"
- "Manages inventory for small retail stores"

Once you tell me, I'll:
1. Research the domain
2. Identify all necessary features
3. Design the database schema
4. Create a complete specification

**Your idea:**`;

    } else if (specExists && !mockupsExist) {
      // Have spec, need mockups
      const specContent = await fs.readFile(specPath, 'utf-8');
      const projectName = specContent.match(/# (.+)/)?.[1] || 'Your Project';

      return `🍞 **CodeBakers Session: ${projectName}**

✅ **PROJECT-SPEC.md complete!**

**Next Step: UI Mockups** 🎨

I need to see what your app looks like before I can build it. This ensures:
- Database schema matches your UI exactly
- No missing features
- No unused tables
- Perfect dependency mapping

**You have 3 options:**

**Option 1: Upload designs** (Recommended if you have them)
- Export from Figma as PNG/SVG
- Place in \`refs/design/\` folder
- I'll validate quality automatically

**Option 2: Generate with AI**
- Tell me: "Generate mockups for [feature]"
- I'll create professional designs
- You can refine as needed

**Option 3: Hand-drawn sketches**
- Take photos of sketches
- Place in \`refs/design/\`
- I'll analyze and understand them

---

**Which option works best for you?**

_(Or if you already have mockups, let me know and I'll validate them)_`;

    } else if (mockupsExist && !buildStateExists) {
      // Have spec + mockups, ready to analyze
      return `🍞 **CodeBakers Session**

✅ **PROJECT-SPEC.md complete!**
✅ **Mockups detected in refs/design/**

**Next Step: Mockup Analysis & Build** 🔍

Before I start building, I need to:

**1. Validate mockup quality** (30 seconds)
- Check all UI states are covered (loading/error/empty/success)
- Verify mobile mockups exist
- Ensure design consistency

**2. Deep analysis** (2 minutes)
- Extract all components
- Identify all data fields
- Map relationships and dependencies
- Generate database schema

**3. Build everything** (15-30 minutes)
- Complete vertical slices for each feature
- All tests included
- Production-ready code

---

**Ready to start?**

**Type one of these:**
1. **"Validate mockups"** - I'll check quality first
2. **"Start building"** - Skip validation, analyze and build
3. **"Show me the spec"** - Review PROJECT-SPEC.md first

**What would you like to do?**`;

    } else {
      // Existing project with build state
      const buildState = await fs.readFile(buildStatePath, 'utf-8');

      // Parse current phase
      const phaseMatch = buildState.match(/Current Phase: (\d+)/);
      const currentPhase = phaseMatch ? parseInt(phaseMatch[1]) : 0;

      // Parse completed features
      const completedMatch = buildState.match(/Features Complete: (\d+)\/(\d+)/);
      const completed = completedMatch ? parseInt(completedMatch[1]) : 0;
      const total = completedMatch ? parseInt(completedMatch[2]) : 0;

      const phaseNames = [
        'Spec Generation',
        'UI Mockups',
        'Analysis & Schema',
        'Foundation Build',
        'Feature Build',
        'Testing & Quality',
        'Deployment'
      ];

      return `🍞 **CodeBakers Session: Resuming**

**Current Progress:**

Phase: ${currentPhase}/6 - ${phaseNames[currentPhase] || 'Unknown'}
Features Complete: ${completed}/${total}

---

**What would you like to do?**

**Option 1: Continue building** 🚀
- Resume where we left off
- Build remaining features
- Complete current phase

**Option 2: Review progress** 📊
- Show BUILD-STATE.md
- List completed features
- Show what's left

**Option 3: Add new features** ✨
- Expand scope (I'll update spec)
- Generate new mockups
- Build additional functionality

**Option 4: Deploy** ☁️
- Run final tests
- Security audit
- Deploy to production

**Option 5: Start fresh** 🔄
- Keep existing code
- Start new feature branch
- Clean build state

---

**Just tell me what you want to do, and I'll guide you!**`;
    }

  } catch (error) {
    console.error('Error in codebakers_start:', error);
    return `🍞 CodeBakers: Error starting interactive session

Error: ${error instanceof Error ? error.message : String(error)}

**Fallback: Let's start anyway!**

What do you want to build? Describe your idea in 1-2 sentences.`;
  }
}
