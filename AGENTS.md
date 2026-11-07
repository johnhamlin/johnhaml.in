# Agent notes

## Risk check

`.github/workflows/risk-tier.yml` computes the pull request tier from the changed paths and `risk-tiers`. It does not read or write a GitHub label.

The job checks out only the base commit, installs from that commit's lockfile, and reads `git diff --name-status -M` after fetching the base and head commits. A rename counts both paths. Globs use `minimatch` and are case-insensitive. `CODEOWNERS` patterns stay case-sensitive.

`AGENTS.md`, `CLAUDE.md`, `REVIEW.md`, `.cursor/**`, `.claude/**`, and `.github/**` are always high, including workflow files. `risk-tiers` and `scripts/risk-tier.mjs` are always high too. A path that matches nothing is medium. The highest changed path wins.

The pull request body must check exactly one of `low`, `medium`, or `high` under `## Risk tier`, and that tier must be at least the computed tier. The check fails when the tier is missing or cannot be parsed, when `risk-tiers` is missing or invalid, when a changed path contains `\` or a `..` segment, or on any other error.

The job uses read-only `contents` permission. Do not add label or pulls API calls to the check.

`node --test scripts/risk-tier.test.mjs` runs the tests.
