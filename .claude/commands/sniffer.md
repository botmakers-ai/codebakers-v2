---
description: Run Error Sniffer to detect and prevent known error patterns before writing code
---

Load and execute agents/meta/error-sniffer.md

**Context:** Current task or feature being implemented

**Action:**
1. Scan .codebakers/ERROR-LOG.md for known patterns
2. Identify patterns applicable to current task
3. Display warnings with confidence levels (HIGH → MEDIUM → LOW)
4. Allow user to: Apply fixes / Proceed anyway / Show details / Ignore pattern
5. Inject preventions into implementation plan
6. Log applied preventions to BUILD-LOG.md

**Sub-commands:**
- `@sniffer` — Run on current task
- `@sniffer report` — Show full ERROR-LOG analysis + pattern database
- `@sniffer ignore [pattern]` — Add pattern to .codebakers/ERROR-SNIFFER-IGNORES.md
- `@sniffer confidence` — Show accuracy stats from .codebakers/ERROR-SNIFFER-FEEDBACK.md
- `@sniffer reset` — Clear feedback, restart learning from scratch

**Purpose:** Shift from reactive (fix errors after they happen) to proactive (prevent known errors before they occur)
