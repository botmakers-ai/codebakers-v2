# Guided - Toggle Guided Mode

Control Guided Mode settings for contextual teaching and capability announcements.

## Usage

`@guided [on|off|verbose|minimal|status]`

## Commands

**@guided on** - Enable guided mode
- Shows contextual teaching moments
- Announces relevant capabilities when keywords detected
- Explains methodology while working
- Each announcement fires once per project (prevents fatigue)

**@guided off** - Disable guided mode
- No teaching moments
- No capability announcements
- Faster, quieter output
- Just builds without explanation

**@guided verbose** - Enable verbose mode
- Shows all teaching moments
- Announces capabilities every time (not just once)
- Maximum learning, more output
- Useful for training or deep learning sessions

**@guided minimal** - Minimal announcements
- Only critical capability announcements
- No teaching moments during work
- Pattern announcements only (webhooks, real-time, etc.)

**@guided status** - Show current settings
- Display: GUIDED_MODE value from BRAIN.md
- Display: ANNOUNCEMENTS_SHOWN list
- Display: How many announcements remaining

## Implementation

Updates BRAIN.md field: `GUIDED_MODE: [enabled|disabled|verbose|minimal]`

Reads/displays: `ANNOUNCEMENTS_SHOWN: [list]`

Changes take effect immediately for current session.
