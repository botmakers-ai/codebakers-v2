#!/bin/bash
# CodeBakers V4 — Install git hooks
# Run once per project: bash scripts/setup-hooks.sh
# Installs hooks from .github/hooks/ into .git/hooks/

HOOKS_SOURCE=".github/hooks"
HOOKS_DEST=".git/hooks"

if [ ! -d "$HOOKS_DEST" ]; then
  echo "✗ Not a git repository. Run: git init first."
  exit 1
fi

if [ ! -d "$HOOKS_SOURCE" ]; then
  echo "✗ No hooks found in $HOOKS_SOURCE"
  exit 1
fi

for hook in "$HOOKS_SOURCE"/*; do
  name=$(basename "$hook")
  dest="$HOOKS_DEST/$name"
  cp "$hook" "$dest"
  chmod +x "$dest"
  echo "✓ Installed: $name"
done

echo ""
echo "🍞 CodeBakers: Git hooks installed."
echo "   refs/ changes will now trigger reminders to run @refs in Claude Code."
