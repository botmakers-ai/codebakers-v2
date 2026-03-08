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
export async function start(args) {
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
            // Brand new user, first time
            return `🍞 **Hey! Welcome to CodeBakers, powered by BotMakers.**

I'm your professional coding partner, ready to help you build amazing things!

Here's what makes this different - **you can talk to me like a regular person.** No commands to memorize, no complex setup, just natural conversation.

**I can help you in three ways:**

✨ **Build it FOR you** - Describe your idea, and I'll take it from concept to deployed app (usually ~30 minutes)

🤝 **Build it WITH you** - We'll work together step-by-step. You make the decisions, I handle the technical heavy lifting.

📚 **Teach you while we build** - Want to learn? I'll explain what I'm doing and why, so you understand the whole process.

**The best part?** You don't need to know how to code. Just tell me what you want to create, and I'll guide you from there.

---

**So... what do you want to build today?**

(Just describe it in your own words - like "a recipe app" or "a task manager for my team" - and I'll take care of the rest!)

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
- Upload designs from Figma or other design tools
- Draw them by hand and take photos
- Create wireframes and upload them

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
        }
        else if (!specExists) {
            // .codebakers exists but no spec - returning user starting fresh project
            return `🍞 **Welcome back to CodeBakers!**

I see you're starting a new project. Exciting!

**Quick reminder:** You can talk to me like a regular person. Just describe what you want to build, and I'll handle everything - from planning to deployment.

---

**What's your idea for this project?**

(Describe it in your own words - like "an expense tracker for freelancers" or "a booking system for salons")

I'll research your idea, plan out all the features, and we'll get building!`;
        }
        else if (specExists && !mockupsExist) {
            // Have spec, need mockups - user paused after planning
            const specContent = await fs.readFile(specPath, 'utf-8');
            const projectName = specContent.match(/# (.+)/)?.[1] || 'Your Project';
            return `🍞 **Welcome back!** You're building: **${projectName}**

Great news - your spec is all done! I've mapped out all the features and know exactly what needs to be built.

**Next up:** I need to see what you want it to look like. The designs help me figure out the perfect database structure and how everything connects.

**Three easy options:**

🎨 **Upload designs** - Got Figma mockups or wireframes? Just drag them into the \`refs/design/\` folder

📱 **Use screenshots** - Already have a similar app in mind? Screenshot it as reference and upload

📝 **Sketch it out** - Even hand-drawn sketches work! Take a photo and upload it

---

**What works best for you?**`;
        }
        else if (mockupsExist && !buildStateExists) {
            // Have spec + mockups, ready to build - everything is set!
            return `🍞 **Perfect! You're all set to build.**

I've got:
✅ Your complete project spec
✅ Your design mockups

**Here's what happens next:**

I'm going to analyze your designs and build your entire app. This usually takes 15-30 minutes depending on complexity.

I'll:
- Extract the database structure from your mockups
- Build all the features
- Add authentication & security
- Create tests
- Make it mobile-friendly

**And I'll keep you updated the whole time** so you can see the progress!

---

**Ready to go?** Just say "start building" (or really, anything - I know what to do! 😊)`;
        }
        else {
            // Existing project with build state - returning user continuing work
            const buildState = await fs.readFile(buildStatePath, 'utf-8');
            // Parse current phase
            const phaseMatch = buildState.match(/Current Phase: (\d+)/);
            const currentPhase = phaseMatch ? parseInt(phaseMatch[1]) : 0;
            // Parse completed features
            const completedMatch = buildState.match(/Features Complete: (\d+)\/(\d+)/);
            const completed = completedMatch ? parseInt(completedMatch[1]) : 0;
            const total = completedMatch ? parseInt(completedMatch[2]) : 0;
            // Parse project name
            const specContent = specExists ? await fs.readFile(specPath, 'utf-8') : '';
            const projectName = specContent.match(/# (.+)/)?.[1] || 'Your App';
            // Create friendly progress message
            let progressMsg = '';
            if (completed === total && total > 0) {
                progressMsg = `🎉 All ${total} features are complete!`;
            }
            else if (completed > 0) {
                progressMsg = `You've built ${completed} out of ${total} features - great progress!`;
            }
            else {
                progressMsg = `Ready to start building your ${total} features!`;
            }
            return `🍞 **Welcome back!** Let's continue working on **${projectName}**.

${progressMsg}

---

**What would you like to do?**

**Keep building?** I'll pick up right where we left off and continue with the next features.

**Add something new?** Tell me what you want to add and I'll update the plan and build it.

**Ready to deploy?** If everything's done, I can get your app live in a few minutes.

**Review what's done?** I can show you what we've built and what's left.

---

**Just tell me - I'm here to help however you need!** 😊`;
        }
    }
    catch (error) {
        console.error('Error in codebakers_start:', error);
        return `🍞 CodeBakers: Error starting interactive session

Error: ${error instanceof Error ? error.message : String(error)}

**Fallback: Let's start anyway!**

What do you want to build? Describe your idea in 1-2 sentences.`;
    }
}
//# sourceMappingURL=start.js.map