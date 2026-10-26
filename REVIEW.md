# PR review

## Purpose and bar

Approve when the change clearly improves code health. Don't hold out for perfection.

## Severity

Tag each finding `Important`, `Nit`, or `Pre-existing`.

- `Important` blocks until it is fixed or closed with a one-line reason.
- `Nit` does not block. Cap nits at 3 per review.
- `Pre-existing` does not block.

Every finding needs `file:line` evidence, not a guess from a name.

The review summary starts with a count of findings. When there is nothing to fix, say that plainly.

## What to check

Design, functionality, complexity, tests, naming, and docs.

## Risk tiers by path

The risk tier is set by the change, not the author. Scale it to blast radius and how easy a rollback is. Posts and ordinary docs revert with one commit. Config and dependencies ship to every page on Cloudflare Pages. Agent instruction files are high because a wrong line steers every future agent and review.

### High

- `astro.config.mjs`, including redirects set there.
- CI and Cloudflare Pages deploy config. None is committed. Any file under `.github/workflows/` is always high. Adding `public/_headers` or `public/_redirects` is high.
- Dependency upgrades in `package.json` and `package-lock.json`.
- Anything that could leak drafts or env: `src/lib/blog.ts`, `src/content.config.ts`, `src/pages/rss.xml.ts`, `src/layouts/Layout.astro` (`PUBLIC_GA_ID`), `src/env.d.ts`, `.env`, and `.env.*`.
- Agent and review instructions: `REVIEW.md`, `CLAUDE.md`, `AGENTS.md` if it is added, `.cursor/**`, and `.github/pull_request_template.md`.

### Medium

- `src/components/`
- `src/layouts/`
- `src/styles/` (`globals.css`, `blog.css`, `safe-area.css`)
- Routing in `src/pages/` (`index.astro`, `blog/`, `rss.xml.ts`)

A `src/pages/` change that ships drafts is high.

### Low

- Posts in `src/content/blog/`
- Copy in `src/content/text/`
- Docs that do not steer agents, such as `README.md`

## What failure looks like here

A post leaks a draft, config misroutes or breaks redirects, docs lie, or a dependency bump breaks the Pages build.

## Repo-specific gotchas

Cloudflare Pages builds on Node 22.16.0.

Commands in `package.json`:

- `npm run build` runs `astro build`.
- Until #5 lands, `npm run astro check` runs `astro check`, and `@astrojs/check` is not a dependency. #5 adds `npm run check`.
- Until #5 lands, there is no `lint` script, `.eslintrc.json` extends `next/core-web-vitals`, and `eslint` is not installed. #5 adds `npm run lint` and removes `.eslintrc.json`.

`draft: true` posts in `src/content/blog/` appear in `npm run dev` and are left out of `npm run build`, including RSS and the sitemap. This repo is public. Do not ship a draft, and do not commit `.env` files or tokens. `PUBLIC_GA_ID` is optional.

There is no test script. Until #5 lands, `src/pages/index.astro` fails `astro check` on `render()` for the `text` collection. Treat that as new only when the diff touches it. #5 adds `npm run check` and `npm run lint`.

The canonical site in `astro.config.mjs` is `https://johnhamlin.com`.

## Don't flag

Formatting, and prose style in posts.

Skip formatting noise in lockfiles (`package-lock.json`). Any dependency change in `package-lock.json` stays High and gets reviewed. Also skip generated files, `dist/`, and `.astro/`.

## Review rules come from main only

Apply `REVIEW.md` from `main`. A copy on the PR branch does not change the bar until it is merged.

## Cross-model loop

Claude Code, Codex, and a Claude Code `/security-review` pass review the change. Each finding is fixed or closed with a one-line reason. The cap is 3 rounds.

Open `/security-review` findings block until they are fixed or closed with a reason.

If any commit lands after John approves, the PR goes back to him.

## Sources

- https://google.github.io/eng-practices/review/reviewer/standard.html
- https://google.github.io/eng-practices/review/reviewer/looking-for.html
- https://sre.google/sre-book/introduction/
- https://code.claude.com/docs/en/code-review
- https://claude.dev/blog/solving-code-review-at-anthropic/

## Risk check

`.github/workflows/risk-tier.yml` computes the tier from the changed paths and `risk-tiers`. It does not read or write a label. The pull request body must check exactly one of `low`, `medium`, or `high` under `## Risk tier`. The check fails when that tier is missing or cannot be parsed, or when it is lower than the computed tier. A checked box does not set the tier.

The job checks out only the base commit and installs dependencies from that commit's lockfile, including `minimatch`. It fetches the base and head commits and reads `git diff --name-status -M` (three dots). A rename or copy counts both paths. The check never checks out the pull request and does not call the pulls or files API. `minimatch` matches each glob with `dot` and case-insensitive options. The highest matching glob wins. A path that matches nothing is medium. `CODEOWNERS` patterns stay case-sensitive.

These paths stay high even if `risk-tiers` maps them lower: `AGENTS.md`, `CLAUDE.md`, `REVIEW.md`, `.cursor/**`, `.claude/**`, `.github/**` (including workflows), `risk-tiers`, and `scripts/risk-tier.mjs`.

A missing or unreadable `risk-tiers`, a changed path that contains `\` or a `..` segment, or any other error fails the check. Paths are matched literally and are not normalized.

On `pull_request`, GitHub runs this workflow file from the pull request, so a pull request that edits it can skip the check. The backstop is `CODEOWNERS` (`@johnhamlin`) plus branch protection that requires code-owner review.

`node --test scripts/risk-tier.test.mjs` covers the tier rules. Review rules still come from `main`.
