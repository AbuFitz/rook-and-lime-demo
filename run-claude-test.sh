#!/usr/bin/env bash
set -euo pipefail

npx -y @anthropic-ai/claude-code \
  -p 'Read BRIEF.md, invoke /onesimplesite-web-designer, and complete the entire website in this repository. Do not stop at a plan or mockup.' \
  --effort high \
  --permission-mode bypassPermissions \
  --no-session-persistence \
  --output-format text
