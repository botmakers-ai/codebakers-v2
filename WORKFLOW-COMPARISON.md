# CodeBakers Workflow Comparison

## The Question

What is Phase 1 in the CodeBakers Method?
- Interview?
- Mockups?

## The Answer

**Phase 1 = Mockups** (as originally designed)

Interview is an OPTIONAL tool, not a mandatory phase.

---

## Visual Comparison

### ✅ CORRECT Workflow (Original Design - v5.0.0 to Current)

```
┌─────────────────────────────────────────────────────────────┐
│ Phase 0: Domain Research & Spec                             │
│ ├─ User describes idea                                      │
│ ├─ Run: codebakers_generate_spec(description)              │
│ ├─ Output: PROJECT-SPEC.md (Gates 0-5)                     │
│ └─ User approval required                                   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Phase 1: UI Mockup & Design                                 │
│ ├─ [OPTIONAL] Run: codebakers_run_interview                │
│ │  └─ Generates context to inform mockup design            │
│ ├─ User provides mockups (upload / generate / sketch)      │
│ ├─ Tools: validate_mockups, fix_mockups, verify_mockups   │
│ └─ User approval required                                   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Phase 2: Mock Analysis & Schema Generation                  │
│ ├─ Run: codebakers_analyze_mockups_deep                    │
│ ├─ Extract ALL data FROM mockups                           │
│ ├─ Run: codebakers_generate_schema                         │
│ ├─ Schema derived FROM mockup analysis                     │
│ ├─ Run: codebakers_map_dependencies                        │
│ └─ Run: codebakers_generate_store_contracts                │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Phase 3-6: Build, Test, Deploy                              │
└─────────────────────────────────────────────────────────────┘
```

**Key Principle:** "UI mockups → Extract data → Generate schema"

---

### ❌ INCORRECT Workflow (v5.5.7 Mistake - Reverted)

```
┌─────────────────────────────────────────────────────────────┐
│ Phase 0: Domain Research & Spec                             │
│ └─ Run: codebakers_generate_spec(description)              │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Phase 1: Interview (MANDATORY)                    ← WRONG   │
│ ├─ IMMEDIATELY run: codebakers_run_interview                │
│ ├─ Creates: project-profile.md, FLOWS.md, BRAIN.md         │
│ └─ Guide to Phase 2                                         │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Phase 2: Mockups (demoted from Phase 1)          ← WRONG   │
│ ├─ Create refs/design/ folder                              │
│ ├─ User provides mockups                                   │
│ └─ validate/fix/verify mockups                             │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Phase 3: Mock Analysis (now Phase 3?)            ← WRONG   │
│ ├─ analyze_mockups_deep                                    │
│ └─ generate_schema                                          │
└─────────────────────────────────────────────────────────────┘
```

**Problem:** Interview became mandatory, mockups demoted, broke mockup-driven principle

---

## Interview Tool: Purpose & Usage

### What It Does

```
codebakers_run_interview(description)
```

**Generates:**
- `project-profile.md` - User personas, goals, target audience
- `FLOWS.md` - User workflows and journeys
- `BRAIN.md` - Business logic and rules

**Purpose:**
- Gather user context
- Understand workflows
- Document business logic
- Inform better mockup design

### When to Use It

**✅ Good use cases:**
- Before creating mockups (to understand users better)
- During Phase 1 (to inform design decisions)
- When user wants deep user research
- Complex workflows need documentation

**❌ NOT for:**
- Replacing mockups as Phase 1
- Mandatory step before mockups
- Generating schema (that comes FROM mockups)

### Example Flow

```
User: "I want to build a healthcare appointment booking system"

You:
1. Run codebakers_generate_spec("healthcare appointment booking")
2. Show spec, get approval
3. User approves spec

You:
"Great! Now I need to understand your users better before designing.
Let me run a quick interview to map out patient/doctor workflows..."

4. [OPTIONAL] Run codebakers_run_interview(description)
5. Generates: patient personas, booking flows, scheduling logic

You:
"Perfect! I now understand:
- 3 user types: Patients, Doctors, Admins
- 4 main workflows: Book → Confirm → Remind → Complete
- Business rules: Max 2 reschedules, 24hr cancellation

Now I'll design the mockups with these workflows in mind..."

6. Create mockups based on interview insights
7. Proceed to Phase 2: analyze mockups → generate schema
```

---

## Timeline: When Did Interview Become Mandatory?

| Version | Date | What Happened | Phase 1 |
|---------|------|---------------|---------|
| v4.5.3 | Mar 6 | Pre-MCP. Interview was @command tool | N/A |
| v5.0.0 | Mar 6 | MCP Foundation. Original method defined | Mockups |
| v5.1.0 | Mar 7 | Interview tool added to MCP | Mockups |
| v5.2.0 | Mar 7 | Stable production system | Mockups |
| v5.5.0 | Mar 7 | Conversational rewrite | Mockups |
| **v5.5.7** | **Mar 8** | **MISTAKE: Made interview Phase 1** | **Interview** ❌ |
| v5.5.8 | Mar 8 | REVERT: Restored original method | Mockups ✅ |
| v5.6.0 | Mar 8 | Restored v5.2.0 simple structure | Mockups ✅ |
| v5.6.1 | Current | Fixed mockup generation promise | Mockups ✅ |

**v5.5.7 was the ONLY version where interview was Phase 1.**

**It was a mistake and was reverted 10 minutes later.**

---

## What v5.5.8 Commit Message Said

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

---

## Conclusion

### The CORRECT CodeBakers Method:

```
Phase 0: Spec
   ↓
Phase 1: Mockups (interview optional here to inform design)
   ↓
Phase 2: Analysis (extract schema FROM mockups)
   ↓
Phase 3-6: Build, Test, Deploy
```

### Key Principles Maintained:

1. **Mockup-driven:** Schema comes FROM mockups, not abstract requirements
2. **Interview is optional:** Helps inform mockup design, not mandatory
3. **User choice:** FOR / WITH / TEACH modes
4. **Wait for approval:** At phase gates (spec, mockups, before build)
5. **Conversational:** Hide technical details, guide naturally

### Current Status:

✅ v5.6.1 (current) implements the CORRECT workflow
✅ Phase 1 = Mockups (as designed)
✅ Interview is optional tool (as designed)
✅ Mockup-driven approach maintained

---

**Generated:** 2026-03-08
**Purpose:** Clarify Phase 1 definition
**Answer:** Phase 1 = Mockups (interview is optional)
