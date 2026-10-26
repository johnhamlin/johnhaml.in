# PR review

## Purpose and bar

Approve when the change clearly improves code health. Don't hold out for perfection.

## Severity

Blocking findings must be fixed before approval. Prefix non-blocking findings with `Nit:`.

## What to check

Design, functionality, complexity, tests, naming, and docs.

## Risk tiers by path

Pick the tier from the paths in the diff. Scale the review to blast radius and how easy a rollback is. Content and docs revert with one commit. Config and dependencies ship to every page on Cloudflare Pages.

### High

- `astro.config.mjs`, including redirects set there.
- CI and Cloudflare Pages deploy config. None is committed. Adding `.github/workflows/`, `public/_headers`, or `public/_redirects` is high.
- Dependency upgrades in `package.json` and `package-lock.json`.
- Anything that could leak drafts or env: `src/lib/blog.ts`, `src/content.config.ts`, `src/pages/rss.xml.ts`, `src/layouts/Layout.astro` (`PUBLIC_GA_ID`), `src/env.d.ts`, `.env`, and `.env.*`.

### Medium

- `src/components/`
- `src/layouts/`
- `src/styles/` (`globals.css`, `blog.css`, `safe-area.css`)
- Routing in `src/pages/` (`index.astro`, `blog/`, `rss.xml.ts`)

A `src/pages/` change that ships drafts is high.

### Low

- Posts in `src/content/blog/`
- Copy in `src/content/text/`
- Docs: `README.md`, `CLAUDE.md`, `REVIEW.md`, `.github/pull_request_template.md`

## Repo-specific gotchas

Cloudflare Pages builds on Node 22.16.0.

Commands in `package.json`:

- `npm run build` runs `astro build`.
- `npm run astro check` runs `astro check`. `@astrojs/check` is not a dependency.
- There is no `lint` script. `npm run lint` fails with a missing script. `.eslintrc.json` extends `next/core-web-vitals`, and `eslint` is not installed.

`draft: true` posts in `src/content/blog/` appear in `npm run dev` and are left out of `npm run build`, including RSS and the sitemap. This repo is public. Do not ship a draft, and do not commit `.env` files or tokens. `PUBLIC_GA_ID` is optional.

There is no test script. `src/pages/index.astro` already fails `astro check` on `render()` for the `text` collection. Treat that as new only when the diff touches it.

The canonical site in `astro.config.mjs` is `https://johnhamlin.com`.

## Don't flag

Formatting, generated files (`dist/`, files under `.astro/`), lockfile churn, and prose style in posts.

## Review rules come from main only

Apply `REVIEW.md` from `main`. A copy on the PR branch does not change the bar until it is merged.

## Cross-model loop

Claude Code and Codex review. Each finding is fixed or closed with a one-line reason. The cap is 3 rounds.

## Sources

- https://google.github.io/eng-practices/review/reviewer/standard.html
- https://google.github.io/eng-practices/review/reviewer/looking-for.html
- https://sre.google/sre-book/introduction/
- https://code.claude.com/docs/en/code-review
