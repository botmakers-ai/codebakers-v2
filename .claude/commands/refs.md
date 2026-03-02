# Refs - Process New Reference Files

Process any new files in refs/ folder immediately.

Check refs/ subdirectories for new files (not in .refs-processed manifest):

**refs/prd/** - Requirements, specs, user stories
- Read completely
- Extract requirements, features, constraints
- Cross-reference with FLOWS.md (flag missing flows as P1)
- Update BRAIN.md

**refs/design/** - Mockups, screenshots, designs
- JSX/HTML files (staff mockups): exact contract, binding
- Image/PDF files: extract colors, layout, typography with vision
- Update UI-RESEARCH.md with client-specific design tokens
- Generate DESIGN-CONTRACT.md if staff mockups exist

**refs/api/** - API docs, endpoint specs
- Extract: base URL, auth, endpoints, request/response shapes, rate limits
- Update BRAIN.md integrations
- Update CREDENTIALS-NEEDED.md

**refs/brand/** - Brand guidelines, logos, fonts
- Extract: colors, fonts, logo rules, tone
- OVERRIDES everything in UI-RESEARCH.md
- Update BRAIN.md brand summary

**refs/schema/** - Database schemas, ERDs
- Cross-reference against entities in project-profile.md
- Flag conflicts in BRAIN.md

After processing:
- Append filenames + date to .refs-processed
- git add refs/ .refs-processed
- git commit -m "chore(refs): process [files]"
