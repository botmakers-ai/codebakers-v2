# CLAUDE.md Evolution Analysis

## Complete Timeline of Changes

This document traces the complete evolution of CLAUDE.md to understand what the CORRECT workflow is supposed to be.

---

## Key Findings Summary

### CRITICAL DISCOVERY:

**The ORIGINAL CodeBakers Method (v5.0.0 - v5.6.0) does NOT have "interview" as Phase 1.**

**Original Design:**
- **Phase 0:** Domain Research & Spec (Gates 0-5)
- **Phase 1:** UI Mockup & Design ← MOCKUPS FIRST
- **Phase 2:** Mock Analysis & Schema Generation
- **Phase 3-6:** Build, Test, Deploy

**What happened in v5.5.7 (the mistake):**
- I (Claude/Trent) CHANGED the method without permission
- Added "interviews" as mandatory Phase 1
- Made it: Spec → Interview → Mockups
- Forced autonomous mode ("IMMEDIATELY run")
- Removed user choice (FOR/WITH/TEACH)

**What v5.5.8 REVERTED to (correct design):**
- ✅ Spec → Mockups → Analysis → Build
- ✅ User chooses mode (FOR/WITH/TEACH)
- ✅ Mockup-driven (schema FROM mockups)
- ✅ Interview tool is OPTIONAL, not mandatory phase

**Current version (v5.6.1 - HEAD):**
- Restores v5.2.0 simple CLAUDE.md
- Based on v5.0.0 original design
- NO interview as mandatory phase
- Mockup-driven approach maintained

---

## Version History (Chronological)

### v4.5.3 (43c5e9c) - 2026-03-06
**Before MCP / v5.0.0**

**Identity:**
- "Senior software engineer with full professional judgment"
- "CodeBakers autonomous development system"
- Stack: Supabase + Next.js + Vercel only

**Session Start:**
```
0. Git Repository Check
1. Create refs/ folder structure
2. Check for .codebakers/BRAIN.md
   → If exists: read it
   → If missing: run Interview Agent first ← INTERVIEW mentioned here
3. Check dep:map script
...
```

**Interview mentions:**
- Referenced as agent tool (@interview command)
- Integration Setup → Interview → Build
- "When ready: type @interview to start"
- Interview Agent as part of build flow
- NOT described as mandatory Phase 1

**Key characteristics:**
- Interview is a TOOL/AGENT, not a phase
- Used after integration setup, before build
- Optional for gathering context
- Generates: project-profile.md, FLOWS.md, BRAIN.md

---

### v5.0.0 (bec6a34) - 2026-03-06
**MCP Foundation - ORIGINAL CodeBakers Method**

**Title:** "MCP-powered. Self-aware. Complete CodeBakers Method implementation."

**The Method (7 Phases):**
```
- Phase 0: Domain Research & Spec (Gates 0-5)
- Phase 1: UI Mockup & Design                    ← MOCKUPS ARE PHASE 1
- Phase 2: Mock Analysis & Schema Generation + Comprehensive Dependency Mapping
- Phase 3: Foundation Build
- Phase 4: Feature Build
- Phase 5: Testing & Verification
- Phase 6: Deployment & Ops
```

**Key Principle:**
> "UI mockups → Extract data → Generate schema → Map ALL dependencies → Build with complete knowledge"

**Phase 1 Example:**
```
🍞 CodeBakers: PROJECT-SPEC.md complete ✓

Phase: 1 (UI Mockups)
Next: Design mockups or upload to refs/design/

Options:
1. Generate mockups with AI
2. I have mockups (I'll upload them)
3. Review spec first

Ready?
```

**MCP Tools:**
- Phase 0: `codebakers_generate_spec(description)`
- NO interview tool listed
- Phase 2: analyze_mockups, generate_schema, map_dependencies

**Critical observation:**
- NO `codebakers_run_interview` tool
- Interview is NOT part of the 7-phase method
- Mockups come IMMEDIATELY after spec

---

### v5.1.0 (777f346) - 2026-03-07
**Autonomous Build System - Interview Tool ADDED**

**Major Release:** 14 new tools added

**NEW in Phase 2 tools:**
```
- codebakers_run_interview: Automated Phase 1 interview
```

**Commit message says:**
> "Phase 2: Code Generation (6 tools)
> - codebakers_run_interview: Automated Phase 1 interview"

**CONTRADICTION DISCOVERED:**
- Tool is called "Automated Phase 1 interview"
- But listed under "Phase 2: Code Generation"
- Phases in CLAUDE.md still say Phase 1 = Mockups

**Analysis:**
- Tool added to generate project-profile.md, FLOWS.md, BRAIN.md
- Described as "Automated Phase 1 interview"
- BUT the 7-phase method description unchanged
- Phase 1 still = "UI Mockup & Design"

**Interpretation:**
- Interview tool helps automate user research
- Could be used DURING Phase 1 mockup design
- NOT a separate phase itself
- Generates context for better mockups

---

### v5.2.0 (0f47a17) - 2026-03-07
**Complete Production System**

**CLAUDE.md structure:**
- Same as v5.0.0 / v5.1.0
- Phase 1 = UI Mockup & Design
- Interview tool available but not mandatory phase
- "Complete Production System" implies this is stable

---

### v5.5.0 (39781ce) - 2026-03-07
**Complete Conversational Experience - MAJOR REWRITE**

**Commit message:**
> "Completely rewrote CLAUDE.md to make the ENTIRE CodeBakers experience feel like natural conversation with Claude, not like running a framework."

**Key Changes:**
1. Hide all technical complexity
2. Conversational tone throughout
3. Autonomous decision making
4. Natural workflow
5. User just describes, Claude guides

**Phases maintained:**
- Phase 0: Domain Research & Spec
- Phase 1: UI Mockup & Design (STILL mockups)
- Phase 2: Mock Analysis & Schema
- Phase 3-6: Build, Test, Deploy

**No interview as mandatory phase yet**

**Philosophy:**
- "User never sees tool names, phases, or file structures"
- "Claude runs tools silently in background"
- "Results presented in plain English"

---

### v5.5.7 (0d9b12a) - 2026-03-08
**MANDATORY WORKFLOW - THE MISTAKE**

**Commit message:**
> "CRITICAL FIX: Claude was showing branded intro but not following CodeBakers Method"
>
> "Problem:
> - Branded introduction was working ✅
> - But actual workflow was NOT being followed ❌
> - No interviews, no ref folders, no phase enforcement
> - Claude was being conversational but not DOING the method"

**Changes made:**
- Added "🔥 MANDATORY WORKFLOW" section
- **CHANGED Phase 1 to "Need Interview"**
- Made workflow: Spec → Interview → Mockups

**New workflow:**
```
Phase 0: No Spec Yet
1. User describes
2. IMMEDIATELY run: codebakers_generate_spec
5. Guide to Phase 1

Phase 1: Need Interview                          ← NEW - WRONG
1. IMMEDIATELY run: codebakers_run_interview
2. Creates: project-profile.md, FLOWS.md, BRAIN.md
4. Guide to Phase 2

Phase 2: Need Mockups                            ← DEMOTED FROM PHASE 1
1. Create refs/design/ folder
2. Tell user 3 options
3. validate/fix/verify mockups
```

**Problem:**
- Changed the CORE METHOD without permission
- Interview became mandatory Phase 1
- Mockups demoted to Phase 2
- Forced autonomous mode ("IMMEDIATELY run")
- Removed user choice

---

### v5.5.8 (d683b62) - 2026-03-08
**REVERT to ORIGINAL - THE FIX**

**Commit message:**
> "CRITICAL FIX: I messed up v5.5.7 by changing the core method
>
> What I broke in v5.5.7:
> - Added 'interviews' as mandatory Phase 1 (WRONG - original is mockups)
> - Forced autonomous mode with 'IMMEDIATELY run' (WRONG - user chooses FOR/WITH/TEACH)
> - Removed user choice and made everything automatic
>
> What v5.5.8 restores (ORIGINAL design):
> ✅ Phase 0: Domain Research & Spec (Gates 0-5) → user approves
> ✅ Phase 1: UI Mockups (user uploads/generates/sketches) → user approves
> ✅ Phase 2: Mock Analysis → extract schema FROM mockups
> ✅ Phase 3-6: Build → Test → Deploy
>
> Interview tool is OPTIONAL helper, not a mandatory phase."

**Restored workflow:**
```
Phase 0: Domain Research & Specification
1. User describes what they want to build
2. You run codebakers_generate_spec(description)
3. Creates PROJECT-SPEC.md with Gates 0-5
4. WAIT for user approval before Phase 1

Phase 1: UI Mockup & Design                      ← RESTORED
1. User needs mockups for EVERY screen
2. 3 options: upload / generate / sketch
3. All screens must be mocked
4. WAIT for user approval before Phase 2

Phase 2: Mock Analysis, Schema & Dependencies
1. Create folder structure
2. validate/fix/verify mockups
3. analyze_mockups_deep
4. generate_schema
5. map_dependencies
```

**User choice restored:**
- "Build FOR me" = autonomous
- "Build WITH me" = collaborative
- "TEACH me" = educational

---

### v5.6.0 (7388d02) - 2026-03-08
**Restore Simple CLAUDE.md from v5.2.0**

**Commit message:**
> "feat: Restore simple CLAUDE.md from v5.2.0 - v5.6.0"

**Structure:**
- Based on v5.0.0 / v5.2.0 design
- Session Start Protocol restored
- 7 Phases clearly defined
- Phase 1 = UI Mockup & Design
- Interview not mentioned as mandatory phase

**MCP Tool Reference:**
```
Phase 0:
- codebakers_generate_spec(description)

Phase 2 (CRITICAL):
- codebakers_analyze_mockups_deep
- codebakers_generate_schema
- codebakers_map_dependencies
- codebakers_generate_store_contracts
```

**Note:** `codebakers_run_interview` is available in tools but NOT in workflow

---

### v5.6.1 (3949d46) - Current HEAD
**Remove False Promise to Generate Mockups**

**Commit message:**
> "fix: Remove false promise to generate mockups - v5.6.1"

**Current state:**
- Same structure as v5.6.0
- Phase 1 = UI Mockup & Design
- Interview not mandatory
- Clean, simple CLAUDE.md

---

## Analysis: What is the CORRECT Workflow?

### Based on commit history analysis:

### ORIGINAL DESIGN (v5.0.0 - v5.2.0):
```
Phase 0: Spec (codebakers_generate_spec)
   ↓
Phase 1: Mockups (user uploads/generates/sketches)
   ↓
Phase 2: Analysis (analyze → schema → dependencies)
   ↓
Phase 3-6: Build → Test → Deploy
```

### When Interview Tool Was Added (v5.1.0):
- Tool: `codebakers_run_interview`
- Purpose: Generate project-profile.md, FLOWS.md, BRAIN.md
- Described as: "Automated Phase 1 interview"
- Listed under: "Phase 2: Code Generation"
- **Confusion:** Called "Phase 1 interview" but phases didn't change

### The Mistake (v5.5.7):
- Made interview a MANDATORY Phase 1
- Changed workflow to: Spec → Interview → Mockups
- Broke the "mockup-driven" principle

### The Correction (v5.5.8):
- Reverted to original
- Interview is OPTIONAL helper
- Mockups are Phase 1 (as designed)

### Current Design (v5.6.0 - v5.6.1):
- Restored v5.2.0 structure
- Phase 1 = Mockups
- Interview tool exists but not in mandatory workflow

---

## The Interview Tool: What is it ACTUALLY for?

### Evidence from commits:

**From v4.5.3:**
- Interview Agent tool (@interview command)
- Used to gather: intent, external services, constraints
- Generates: project-profile.md, FLOWS.md, BRAIN.md
- Part of onboarding/context gathering

**From v5.1.0 commit:**
- "codebakers_run_interview: Automated Phase 1 interview"
- But Phase 1 is still "UI Mockup & Design"
- Likely means: interview to INFORM mockup design

**From v5.5.8 revert:**
- "Interview tool is OPTIONAL helper, not a mandatory phase"
- Clear statement of intent

### Interpretation:

**Interview tool is for:**
1. Gathering user context (personas, goals, workflows)
2. Informing better mockup design
3. Documenting business logic
4. Optional step to improve quality

**Interview tool is NOT:**
1. A mandatory phase
2. Required before mockups
3. Part of the core 7-phase method
4. A replacement for mockups

**Proper usage:**
- Can be used BEFORE mockups (to inform design)
- Can be used DURING Phase 1 (to understand users better)
- Generates helpful context files
- But mockups are STILL Phase 1

---

## Conclusion: The Correct Workflow

### The CodeBakers Method (As Originally Designed):

```
Phase 0: Domain Research & Spec
├─ Tool: codebakers_generate_spec(description)
├─ Output: PROJECT-SPEC.md (Gates 0-5)
└─ User approval required

Phase 1: UI Mockup & Design
├─ Optional: codebakers_run_interview (for context)
├─ User provides: Upload / Generate / Sketch mockups
├─ Tools: validate_mockups, fix_mockups, verify_mockups
└─ User approval required

Phase 2: Mock Analysis & Schema
├─ Tools: analyze_mockups_deep
├─       generate_schema (FROM mockups)
├─       map_dependencies
└─       generate_store_contracts

Phase 3: Foundation Build
Phase 4: Feature Build
Phase 5: Testing & Verification
Phase 6: Deployment & Ops
```

### Key Principles:

1. **Mockup-driven:** Schema comes FROM mockups, not abstract design
2. **User choice:** FOR / WITH / TEACH modes
3. **Wait for approval:** At phase gates (spec, mockups, before build)
4. **Interview is optional:** Helps inform mockups but not mandatory
5. **Conversational:** Hide technical details, guide naturally

### What v5.5.7 Got Wrong:

❌ Made interview mandatory Phase 1
❌ Demoted mockups to Phase 2
❌ Forced autonomous mode
❌ Removed user choice
❌ Broke mockup-driven principle

### What Current Version Gets Right:

✅ Mockups are Phase 1
✅ Interview is optional tool
✅ Schema derived FROM mockups
✅ User choice respected
✅ Original method preserved

---

## Recommendations

### For CLAUDE.md updates:

1. **Keep Phase 1 = Mockups** (as designed)
2. **Interview is optional helper** (not mandatory phase)
3. **Document when to use interview:**
   - Before mockups: To understand users/workflows
   - During Phase 1: To inform design decisions
   - Generates: project-profile.md, FLOWS.md, BRAIN.md
4. **Maintain mockup-driven approach:**
   - Schema comes FROM analyzing mockups
   - Not from abstract requirements
5. **Preserve user choice:**
   - FOR mode (autonomous)
   - WITH mode (collaborative)
   - TEACH mode (educational)

### For workflow documentation:

**Correct flow:**
```
User describes idea
   ↓
Generate spec (Phase 0)
   ↓
[OPTIONAL: Run interview for context]
   ↓
Create/upload mockups (Phase 1)
   ↓
Analyze mockups → extract schema (Phase 2)
   ↓
Build features (Phase 3-4)
   ↓
Test & deploy (Phase 5-6)
```

**NOT this:**
```
User describes idea
   ↓
Generate spec (Phase 0)
   ↓
MANDATORY interview (Phase 1) ← WRONG
   ↓
Create mockups (Phase 2) ← WRONG
   ↓
...
```

---

## Timeline Summary

| Version | Date | Phase 1 | Interview | Status |
|---------|------|---------|-----------|--------|
| v4.5.3 | Mar 6 | (Pre-MCP) | Tool/Agent | Before v5 |
| v5.0.0 | Mar 6 | Mockups | Not mentioned | ✅ Original |
| v5.1.0 | Mar 7 | Mockups | Tool added | ✅ Tool available |
| v5.2.0 | Mar 7 | Mockups | Optional | ✅ Stable |
| v5.5.0 | Mar 7 | Mockups | Optional | ✅ Conversational |
| v5.5.7 | Mar 8 | Interview | MANDATORY | ❌ Mistake |
| v5.5.8 | Mar 8 | Mockups | Optional | ✅ Reverted |
| v5.6.0 | Mar 8 | Mockups | Optional | ✅ Restored |
| v5.6.1 | Current | Mockups | Optional | ✅ Current |

---

## Final Answer

**What is the CORRECT workflow?**

The original CodeBakers Method (v5.0.0) is the correct design:
- Phase 1 = UI Mockups
- Interview tool is optional (helps inform mockup design)
- Schema is derived FROM mockups (mockup-driven approach)
- User chooses mode (FOR/WITH/TEACH)

**The v5.5.7 change was a mistake** and was correctly reverted in v5.5.8.

**Current version (v5.6.1) is correct.**

---

Generated: 2026-03-08
Purpose: Understand CLAUDE.md evolution and correct workflow
