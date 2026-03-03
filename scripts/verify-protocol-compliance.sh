#!/bin/bash
# CodeBakers Protocol Compliance Verification
# Run this to check if CodeBakers protocol is being followed correctly

set -e

echo "🍞 CodeBakers: Protocol Compliance Check"
echo "========================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

VIOLATIONS=0
WARNINGS=0

# Check 1: Git repository exists
echo -n "✓ Checking git repository... "
if git rev-parse --git-dir > /dev/null 2>&1; then
  echo -e "${GREEN}PASS${NC}"
else
  echo -e "${RED}FAIL${NC}"
  echo "  └─ Git repository required (see: CLAUDE.md session start)"
  VIOLATIONS=$((VIOLATIONS + 1))
fi

# Check 2: .codebakers/ directory exists
echo -n "✓ Checking .codebakers/ memory system... "
if [ -d ".codebakers" ]; then
  echo -e "${GREEN}PASS${NC}"
else
  echo -e "${RED}FAIL${NC}"
  echo "  └─ .codebakers/ directory missing (protocol not initialized)"
  VIOLATIONS=$((VIOLATIONS + 1))
fi

# Check 3: BRAIN.md exists and is recent
echo -n "✓ Checking BRAIN.md... "
if [ -f ".codebakers/BRAIN.md" ]; then
  # Check if updated in last 7 days
  if [ "$(find .codebakers/BRAIN.md -mtime -7 2>/dev/null)" ]; then
    echo -e "${GREEN}PASS${NC}"
  else
    echo -e "${YELLOW}WARNING${NC}"
    echo "  └─ BRAIN.md not updated in 7+ days (may be stale)"
    WARNINGS=$((WARNINGS + 1))
  fi
else
  echo -e "${RED}FAIL${NC}"
  echo "  └─ BRAIN.md missing (project context not tracked)"
  VIOLATIONS=$((VIOLATIONS + 1))
fi

# Check 4: DEPENDENCY-MAP.md exists and is recent
echo -n "✓ Checking DEPENDENCY-MAP.md... "
if [ -f ".codebakers/DEPENDENCY-MAP.md" ]; then
  # Check if updated in last 3 days (should be regenerated frequently)
  if [ "$(find .codebakers/DEPENDENCY-MAP.md -mtime -3 2>/dev/null)" ]; then
    echo -e "${GREEN}PASS${NC}"
  else
    echo -e "${YELLOW}WARNING${NC}"
    echo "  └─ DEPENDENCY-MAP.md not updated in 3+ days (may be stale)"
    echo "  └─ Run: pnpm dep:map"
    WARNINGS=$((WARNINGS + 1))
  fi
else
  echo -e "${RED}FAIL${NC}"
  echo "  └─ DEPENDENCY-MAP.md missing (dependencies not tracked)"
  VIOLATIONS=$((VIOLATIONS + 1))
fi

# Check 5: BUILD-LOG.md exists
echo -n "✓ Checking BUILD-LOG.md... "
if [ -f ".codebakers/BUILD-LOG.md" ]; then
  echo -e "${GREEN}PASS${NC}"
else
  echo -e "${RED}FAIL${NC}"
  echo "  └─ BUILD-LOG.md missing (actions not logged)"
  VIOLATIONS=$((VIOLATIONS + 1))
fi

# Check 6: ERROR-LOG.md exists (or empty project)
echo -n "✓ Checking ERROR-LOG.md... "
if [ -f ".codebakers/ERROR-LOG.md" ]; then
  echo -e "${GREEN}PASS${NC}"
elif [ ! -d "src" ] && [ ! -d "app" ]; then
  echo -e "${GREEN}PASS${NC} (new project)"
else
  echo -e "${YELLOW}WARNING${NC}"
  echo "  └─ ERROR-LOG.md missing (no error learning tracked)"
  WARNINGS=$((WARNINGS + 1))
fi

# Check 7: FIX-QUEUE.md exists
echo -n "✓ Checking FIX-QUEUE.md... "
if [ -f ".codebakers/FIX-QUEUE.md" ]; then
  echo -e "${GREEN}PASS${NC}"
else
  echo -e "${YELLOW}WARNING${NC}"
  echo "  └─ FIX-QUEUE.md missing (no task queue)"
  WARNINGS=$((WARNINGS + 1))
fi

# Check 8: TypeScript compiles (if TypeScript project)
if [ -f "tsconfig.json" ]; then
  echo -n "✓ Checking TypeScript compilation... "
  if npx tsc --noEmit 2>/dev/null; then
    echo -e "${GREEN}PASS${NC}"
  else
    echo -e "${RED}FAIL${NC}"
    echo "  └─ TypeScript errors present (code should not be committed with errors)"
    VIOLATIONS=$((VIOLATIONS + 1))
  fi
fi

# Check 9: Recent commits follow atomic pattern
echo -n "✓ Checking recent commits follow atomic pattern... "
RECENT_COMMITS=$(git log --oneline --grep="feat(atomic):" -5 2>/dev/null | wc -l)
TOTAL_RECENT=$(git log --oneline -5 2>/dev/null | wc -l)

if [ "$TOTAL_RECENT" -eq 0 ]; then
  echo -e "${GREEN}PASS${NC} (no commits yet)"
elif [ "$RECENT_COMMITS" -gt 0 ]; then
  echo -e "${GREEN}PASS${NC}"
else
  echo -e "${YELLOW}WARNING${NC}"
  echo "  └─ No 'feat(atomic):' commits in last 5 (atomic units not being committed)"
  WARNINGS=$((WARNINGS + 1))
fi

# Check 10: .codebakers/ committed to git
echo -n "✓ Checking .codebakers/ in git history... "
if git ls-files .codebakers/ 2>/dev/null | grep -q .; then
  echo -e "${GREEN}PASS${NC}"
else
  echo -e "${RED}FAIL${NC}"
  echo "  └─ .codebakers/ not committed (memory not persisted)"
  VIOLATIONS=$((VIOLATIONS + 1))
fi

# Summary
echo ""
echo "========================================"
if [ $VIOLATIONS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
  echo -e "${GREEN}✓ Protocol Compliance: EXCELLENT${NC}"
  echo "All checks passed. CodeBakers protocol is being followed correctly."
  exit 0
elif [ $VIOLATIONS -eq 0 ]; then
  echo -e "${YELLOW}⚠ Protocol Compliance: GOOD (with warnings)${NC}"
  echo "Warnings: $WARNINGS"
  echo "No critical violations, but some improvements recommended."
  exit 0
else
  echo -e "${RED}✗ Protocol Compliance: VIOLATIONS DETECTED${NC}"
  echo "Violations: $VIOLATIONS"
  echo "Warnings: $WARNINGS"
  echo ""
  echo "CRITICAL: CodeBakers protocol is NOT being followed."
  echo "This project may have bugs due to missing dependency tracking,"
  echo "no error learning, or incomplete memory system."
  echo ""
  echo "To fix: Run @rebuild or start following protocol from now on."
  exit 1
fi
