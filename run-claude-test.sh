#!/usr/bin/env bash
set -euo pipefail

repo_dir="$(cd "$(dirname "$0")" && pwd)"
skill_dir="$(cd "$repo_dir/../onesimplesite-web-designer" && pwd)"

cd "$repo_dir"

npx -y @anthropic-ai/claude-code \
  -p "This is an isolated forward-test. First inspect the current repository because a previous attempt may have left a partial scaffold. Read BRIEF.md and then read $skill_dir/SKILL.md plus every reference that it routes to for an Immersive website. Apply that skill faithfully. Complete the entire production-ready website in this repository: create or repair every required source file, build it, run a production preview, inspect mobile and desktop renders, and fix visible or runtime problems. Do not stop at a plan, scaffold, or status report. Do not access, resume, or modify any other Claude session." \
  --add-dir "$skill_dir" \
  --effort high \
  --permission-mode bypassPermissions \
  --no-session-persistence \
  --output-format text \
  2>&1 | tee CLAUDE_RUN.log
