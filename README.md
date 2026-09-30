# Claude isolation test

This repository is reserved for the Claude Code forward-test of the `onesimplesite-web-designer` skill.

The test uses `--no-session-persistence`: it does not resume, inspect, or save a Claude conversation. It passes the sibling skill directory explicitly, so the test exercises the exact version in this workspace rather than relying on global skill discovery. Claude is allowed to write only inside this isolated repository during the test.

## Run

Authenticate Claude Code first, then run from this directory:

```bash
./run-claude-test.sh
```

The detailed brief is in `BRIEF.md`. The runner is safe to rerun after a partial attempt and records Claude's output in the ignored `CLAUDE_RUN.log` file for diagnosis. After generation, the result must be built, rendered at mobile and desktop widths, audited, and iterated before it counts as a successful skill test.
