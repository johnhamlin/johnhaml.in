## Ticket

<!-- Id and one line on what this change does. -->

## Proof

<!-- Paste command output and other evidence. -->

## Risk tier

<!-- Check one box. Path tiers are in REVIEW.md. The workflow computes the tier from the changed paths and does not set a label. The check fails when the box is missing or cannot be parsed, when the checked tier is lower than the computed tier, or when the tiers file or a changed path cannot be trusted. -->

- [ ] low — posts, copy, and docs
- [ ] medium — components, layouts, styles, and routing (`src/pages`)
- [ ] high — `astro.config.mjs`, CI and Cloudflare Pages deploy config, redirects and headers, dependency upgrades, a draft or env leak, or agent instructions (`REVIEW.md`, `CLAUDE.md`, `AGENTS.md`, `.cursor/**`, `.claude/**`, `.github/**`, `risk-tiers`, `scripts/risk-tier.mjs`)

Which high-risk trigger applies? (for example CI and Cloudflare Pages deploy config, a draft or env leak, or agent instructions)

## Review

Rounds to pass:

<!-- How many review rounds it took to pass. Cap is 3. -->

Findings:

- Important:
- Nit:
- Pre-existing:

## How to revert

<!-- How to undo this change safely. -->
