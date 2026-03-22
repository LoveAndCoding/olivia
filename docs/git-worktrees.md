# Git Worktree Process

Multiple agents share the same Olivia repository. To prevent branch conflicts, dirty working trees, and lost work, each engineering agent operates in its own **git worktree**.

## Directory Layout

```
/home/ubuntu/paperclip/olivia/                          # Main repo — stays on `main`. No agent works here directly.
/home/ubuntu/paperclip/olivia-worktrees/tech-lead/       # Tech Lead worktree
/home/ubuntu/paperclip/olivia-worktrees/founding-engineer/ # Founding Engineer worktree
/home/ubuntu/paperclip/olivia-worktrees/senior-engineer/  # Senior Engineer worktree
/home/ubuntu/paperclip/olivia-worktrees/qa-engineer/      # QA Engineer worktree
```

All worktrees share the same `.git` object store and refs. Fetches in any worktree are visible to all others.

## Rules

1. **Never work in the main repo.** The main repo at `/home/ubuntu/paperclip/olivia` stays on `main` and serves as the shared reference. Agent `cwd` configs point to their worktree.

2. **Always use feature branches.** Two worktrees cannot be on the same branch. Since the main repo holds `main`, worktrees must always be on a feature branch or detached HEAD.

3. **One branch per worktree at a time.** This is a git constraint. If you need to switch tasks, commit or stash your current work first.

4. **Sync before branching.** Before starting new work:
   ```bash
   git fetch origin
   git fetch upstream
   git checkout -b feat/oli-XXX-description origin/main
   ```

5. **Clean up after merge.** When a PR is merged and you're done with the branch:
   ```bash
   git checkout --detach origin/main
   git branch -d feat/oli-XXX-description
   ```

6. **Never checkout `main` in a worktree.** The main repo owns that branch. Use `--detach origin/main` when you need a clean state.

## Workflow

### Starting a new task
```bash
git fetch origin && git fetch upstream
git checkout -b feat/oli-XXX-description origin/main
# ... do work, commit, push ...
git push -u origin feat/oli-XXX-description
```

### Opening a PR
```bash
gh pr create --base main --head feat/oli-XXX-description --title "feat(OLI-XXX): description"
```

### After PR is merged
```bash
git fetch origin
git checkout --detach origin/main
git branch -d feat/oli-XXX-description
```

### If you need to switch to a different task mid-work
```bash
git stash push -m "WIP on OLI-XXX"
git checkout -b feat/oli-YYY-other-task origin/main
# ... do other work ...
# When returning:
git checkout feat/oli-XXX-description
git stash pop
```

## Troubleshooting

**"fatal: 'main' is already checked out"**
You tried to checkout `main` in a worktree. Use `git checkout --detach origin/main` instead.

**"fatal: '<branch>' is already checked out at '<path>'"**
Another worktree is on that branch. Either the other agent needs to finish and detach, or you need a different branch name.

**Stale worktree after rebase/force-push**
```bash
git fetch origin
git reset --hard origin/<your-branch>
```

## Adding a New Agent Worktree

```bash
cd /home/ubuntu/paperclip/olivia
git worktree add --detach /home/ubuntu/paperclip/olivia-worktrees/<agent-urlKey> main
cd /home/ubuntu/paperclip/olivia-worktrees/<agent-urlKey>
npm install --ignore-scripts
```

Then update the agent's `adapterConfig.cwd` to point to the new worktree path.
