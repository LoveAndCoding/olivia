#!/bin/bash
# Install git hooks from scripts/hooks/ into .git/hooks/
# Run from repo root: bash scripts/install-hooks.sh
# Worktrees share hooks with the main repo, so one install covers all agents.

set -e

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)"
if [ -z "$REPO_ROOT" ]; then
  echo "ERROR: Not in a git repository."
  exit 1
fi

HOOKS_SRC="$REPO_ROOT/scripts/hooks"
HOOKS_DST="$(git rev-parse --git-common-dir)/hooks"

if [ ! -d "$HOOKS_SRC" ]; then
  echo "ERROR: $HOOKS_SRC not found."
  exit 1
fi

for hook in "$HOOKS_SRC"/*; do
  hook_name=$(basename "$hook")
  cp "$hook" "$HOOKS_DST/$hook_name"
  chmod +x "$HOOKS_DST/$hook_name"
  echo "Installed $hook_name"
done

echo "Done. Hooks installed to $HOOKS_DST"
