import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import {
  ALWAYS_HIGH_GLOBS,
  CHECK_SCRIPT,
  TIERS_FILE,
  applyLabelPlan,
  applyRiskLabel,
  assessBody,
  checkedTiers,
  globSource,
  loadRiskTiers,
  matchGlob,
  moduleRelativePath,
  parseNameStatusZ,
  parseRiskTiers,
  planLabelUpdates,
  pullRequestFromEvent,
  repoRoot,
  riskTiersPath,
  tierForPath,
  tierForPaths,
} from './risk-tier.mjs';

const root = repoRoot();
const rules = loadRiskTiers();

const REVIEW_RULES = [
  ['high', 'astro.config.mjs'],
  ['high', '.github/workflows/**'],
  ['high', 'public/_headers'],
  ['high', 'public/_redirects'],
  ['high', 'package.json'],
  ['high', 'package-lock.json'],
  ['high', 'src/lib/blog.ts'],
  ['high', 'src/content.config.ts'],
  ['high', 'src/pages/rss.xml.ts'],
  ['high', 'src/layouts/Layout.astro'],
  ['high', 'src/env.d.ts'],
  ['high', '.env'],
  ['high', '.env.*'],
  ['high', 'REVIEW.md'],
  ['high', 'CLAUDE.md'],
  ['high', 'AGENTS.md'],
  ['high', '.cursor/**'],
  ['high', '.github/pull_request_template.md'],
  ['medium', 'src/components/**'],
  ['medium', 'src/layouts/**'],
  ['medium', 'src/styles/**'],
  ['medium', 'src/pages/**'],
  ['low', 'src/content/blog/**'],
  ['low', 'src/content/text/**'],
  ['low', 'README.md'],
];

const EXTRA_HIGH = new Set([
  '**/.env',
  '**/.env.*',
  '.claude/**',
  '.github/**',
  'risk-tiers',
  'scripts/risk-tier.mjs',
]);

const LOW_ON_HIGH_BODY = [
  '## Risk tier',
  '- [x] low — posts, copy, and docs',
  '- [ ] medium — components, layouts, styles, and routing (`src/pages`)',
  '- [ ] high — config',
].join('\n');

function exampleForGlob(glob) {
  if (glob === '**/.env') return 'nested/.env';
  if (glob === '**/.env.*') return 'nested/.env.local';
  if (glob.endsWith('/**')) return `${glob.slice(0, -3)}/example`;
  if (glob.endsWith('.*')) return `${glob.slice(0, -1)}local`;
  return glob;
}

function codeownersMatches(pattern, filePath) {
  const normalized = filePath.replace(/\\/g, '/').replace(/^\.\//, '').replace(/^\//, '');
  const directory = pattern.endsWith('/');
  let body = directory ? pattern.slice(0, -1) : pattern;
  let anchored = false;
  if (body.startsWith('/')) {
    anchored = true;
    body = body.slice(1);
  } else if (body.includes('/')) {
    anchored = true;
  }
  const inner = globSource(body);
  const source = anchored
    ? `^${inner}${directory ? '(?:/.*)?' : ''}$`
    : `(?:^|.*/)${inner}${directory ? '(?:/.*)?' : ''}$`;
  return new RegExp(source).test(normalized);
}

function parseCodeowners(text) {
  const entries = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const parts = line.replace(/\s+#.*$/, '').split(/\s+/);
    entries.push({ pattern: parts[0], owners: parts.slice(1) });
  }
  return entries;
}

function ownersFor(text, filePath) {
  let owners = null;
  for (const entry of parseCodeowners(text)) {
    if (codeownersMatches(entry.pattern, filePath)) owners = entry.owners;
  }
  return owners;
}

test('risk-tiers file maps the REVIEW.md path tiers', () => {
  const actual = rules.map((rule) => [rule.tier, rule.glob]);
  for (const expected of REVIEW_RULES) {
    assert.deepEqual(
      actual.find((rule) => rule[0] === expected[0] && rule[1] === expected[1]),
      expected,
    );
  }
  for (const [tier, glob] of actual) {
    const listed = REVIEW_RULES.some((rule) => rule[0] === tier && rule[1] === glob);
    assert.equal(listed || (tier === 'high' && EXTRA_HIGH.has(glob)), true, glob);
  }
  assert.equal(tierForPath('astro.config.mjs', rules), 'high');
  assert.equal(tierForPath('package.json', rules), 'high');
  assert.equal(tierForPath('package-lock.json', rules), 'high');
  assert.equal(tierForPath('src/lib/blog.ts', rules), 'high');
  assert.equal(tierForPath('src/content.config.ts', rules), 'high');
  assert.equal(tierForPath('src/pages/rss.xml.ts', rules), 'high');
  assert.equal(tierForPath('src/pages/index.astro', rules), 'medium');
  assert.equal(tierForPath('src/layouts/Layout.astro', rules), 'high');
  assert.equal(tierForPath('src/layouts/BlogLayout.astro', rules), 'medium');
  assert.equal(tierForPath('src/env.d.ts', rules), 'high');
  assert.equal(tierForPath('.env', rules), 'high');
  assert.equal(tierForPath('.env.local', rules), 'high');
  assert.equal(tierForPath('nested/.env.local', rules), 'high');
  assert.equal(tierForPath('public/_headers', rules), 'high');
  assert.equal(tierForPath('public/_redirects', rules), 'high');
  assert.equal(tierForPath('.github/workflows/ci.yml', rules), 'high');
  assert.equal(tierForPath('src/components/react/Header.tsx', rules), 'medium');
  assert.equal(tierForPath('src/styles/globals.css', rules), 'medium');
  assert.equal(tierForPath('src/styles/blog.css', rules), 'medium');
  assert.equal(tierForPath('README.md', rules), 'low');
  assert.equal(tierForPath('src/types/global.d.ts', rules), 'medium');
  assert.equal(path.relative(root, riskTiersPath()), TIERS_FILE);
});

test('always-high paths override a lower mapping', () => {
  const lowered = parseRiskTiers('low **\n');
  const examples = [
    'AGENTS.md',
    'CLAUDE.md',
    'REVIEW.md',
    '.cursor/rules/example.mdc',
    '.claude/settings.json',
    '.github/pull_request_template.md',
    '.github/workflows/risk-tier.yml',
    '.github/CODEOWNERS',
    'risk-tiers',
    'scripts/risk-tier.mjs',
  ];
  for (const glob of ALWAYS_HIGH_GLOBS) {
    assert.equal(tierForPath(exampleForGlob(glob), lowered), 'high', glob);
  }
  for (const filePath of examples) {
    assert.equal(tierForPath(filePath, lowered), 'high', filePath);
  }
  assert.equal(tierForPath('src/data/projects.ts', lowered), 'low');
  assert.equal(moduleRelativePath(), CHECK_SCRIPT);
  assert.equal(ALWAYS_HIGH_GLOBS.includes(moduleRelativePath()), true);
  assert.equal(ALWAYS_HIGH_GLOBS.includes(TIERS_FILE), true);
});

test('a REVIEW.md-only change is high', () => {
  assert.equal(tierForPaths(['REVIEW.md'], rules), 'high');
});

test('an unmatched path is medium', () => {
  assert.equal(tierForPaths(['src/data/projects.ts'], rules), 'medium');
  assert.equal(tierForPath('src/hooks/useTheme.ts', rules), 'medium');
  assert.equal(tierForPath('src/content/blog-extra.md', rules), 'medium');
  assert.equal(tierForPaths([], rules), 'medium');
});

test('a post or copy-only change is low', () => {
  assert.equal(tierForPaths(['src/content/blog/hello-world.mdx'], rules), 'low');
  assert.equal(tierForPaths(['src/content/text/about.mdx'], rules), 'low');
  assert.equal(
    tierForPaths(['src/content/blog/nested/note.mdx', 'src/content/text/intro.mdx'], rules),
    'low',
  );
  assert.equal(matchGlob('src/content/blog/**', 'src/content/blog/nested/note.mdx'), true);
  assert.equal(matchGlob('src/content/text/**', 'src/content/text/about.mdx'), true);
  assert.equal(matchGlob('src/content/blog/**', 'src/content/text/about.mdx'), false);
});

test('a body claiming low on a high change fails', () => {
  const result = assessBody(LOW_ON_HIGH_BODY, 'high');
  assert.equal(result.ok, false);
  assert.equal(result.claimed, 'low');
  assert.match(result.reason, /checked tier low is lower than computed tier high/);
  const child = spawnSync(
    process.execPath,
    [
      fileURLToPath(new URL('./risk-tier.mjs', import.meta.url)),
      '--paths',
      'REVIEW.md',
      '--body',
      LOW_ON_HIGH_BODY,
    ],
    { encoding: 'utf8' },
  );
  assert.equal(child.status, 1);
  assert.match(child.stdout, /Label: risk:high/);
  assert.match(child.stderr, /checked tier low is lower than computed tier high/);
});

test('a body with no tier checked fails', () => {
  const body = [
    '- [ ] low — posts, copy, and docs',
    '- [ ] medium — components',
    '- [ ] high — config',
    'Risk tier: high',
  ].join('\n');
  const result = assessBody(body, 'low');
  assert.equal(result.ok, false);
  assert.equal(result.claimed, null);
  assert.match(result.reason, /no tier is checked/);
  assert.deepEqual(checkedTiers(''), []);
  assert.deepEqual(checkedTiers(null), []);
});

test('a checked tier at or above the computed tier passes', () => {
  const body = '- [ ] low — posts\n- [ ] medium — components\n- [x] high — config\n';
  assert.equal(assessBody(body, 'high').ok, true);
  assert.equal(assessBody(body, 'medium').ok, true);
  assert.equal(assessBody(body, 'low').claimed, 'high');
  const both = '- [x] low — posts\n- [x] high — config\n';
  assert.equal(assessBody(both, 'high').ok, true);
  assert.equal(assessBody(both, 'high').claimed, 'high');
  const mediumOnHigh = '- [x] medium — components\n';
  assert.equal(assessBody(mediumOnHigh, 'high').ok, false);
});

test('mixed files take the max tier', () => {
  assert.equal(
    tierForPaths(
      ['src/content/blog/hello-world.mdx', 'src/content/text/about.mdx', 'README.md'],
      rules,
    ),
    'low',
  );
  assert.equal(
    tierForPaths(['src/content/blog/hello-world.mdx', 'src/components/react/Header.tsx'], rules),
    'medium',
  );
  assert.equal(
    tierForPaths(['src/content/text/about.mdx', 'src/pages/index.astro', 'REVIEW.md'], rules),
    'high',
  );
  assert.equal(
    tierForPaths(['src/content/blog/hello-world.mdx', 'astro.config.mjs'], rules),
    'high',
  );
});

test('stale labels are replaced', async () => {
  const state = ['risk:low', 'risk:medium', 'documentation'];
  const removed = [];
  const added = [];
  const result = await applyRiskLabel({
    tier: 'high',
    listLabels: async () => [...state],
    addLabels: async (labels) => {
      added.push(...labels);
      state.push(...labels);
    },
    removeLabel: async (label) => {
      removed.push(label);
      const index = state.indexOf(label);
      if (index !== -1) state.splice(index, 1);
    },
  });
  assert.deepEqual(result.plan.remove, ['risk:low', 'risk:medium']);
  assert.deepEqual(result.plan.add, ['risk:high']);
  assert.deepEqual(removed, ['risk:low', 'risk:medium']);
  assert.deepEqual(added, ['risk:high']);
  assert.deepEqual(
    result.labels.filter((label) => label.startsWith('risk:')),
    ['risk:high'],
  );
  assert.ok(result.labels.includes('documentation'));
  assert.deepEqual(applyLabelPlan(['risk:low', 'risk:medium', 'documentation'], result.plan), [
    'documentation',
    'risk:high',
  ]);

  const keep = ['risk:high', 'risk:low'];
  const kept = planLabelUpdates(keep, 'high');
  assert.deepEqual(kept.remove, ['risk:low']);
  assert.deepEqual(kept.add, []);
  assert.deepEqual(applyLabelPlan(keep, kept), ['risk:high']);
});

test('a label sync that leaves two risk labels fails', async () => {
  await assert.rejects(
    () =>
      applyRiskLabel({
        tier: 'high',
        listLabels: async () => ['risk:low', 'risk:high'],
        addLabels: async () => {},
        removeLabel: async () => {},
      }),
    /Expected exactly one label risk:high/,
  );
});

test('renames count both paths toward the tier', () => {
  const files = parseNameStatusZ(
    'R100\0README.md\0docs/README.md\0M\0src/content/blog/hello-world.mdx\0',
  );
  assert.deepEqual(files, [
    'README.md',
    'docs/README.md',
    'src/content/blog/hello-world.mdx',
  ]);
  assert.equal(tierForPaths(files, rules), 'medium');
});

test('CODEOWNERS lists @johnhamlin on every high path', () => {
  const text = fs.readFileSync(path.join(root, '.github/CODEOWNERS'), 'utf8');
  const highGlobs = [
    ...rules.filter((rule) => rule.tier === 'high').map((rule) => rule.glob),
    ...ALWAYS_HIGH_GLOBS,
  ];
  for (const glob of highGlobs) {
    const filePath = exampleForGlob(glob);
    assert.equal(tierForPath(filePath, rules), 'high', filePath);
    const owners = ownersFor(text, filePath);
    assert.ok(owners, `missing CODEOWNERS owner for ${glob} (${filePath})`);
    assert.equal(owners.includes('@johnhamlin'), true, filePath);
  }
  for (const filePath of [
    'src/content/blog/hello-world.mdx',
    'src/content/text/about.mdx',
    'README.md',
    'src/components/react/Header.tsx',
    'src/layouts/BlogLayout.astro',
    'src/styles/globals.css',
    'src/pages/index.astro',
    'src/data/projects.ts',
  ]) {
    assert.equal(ownersFor(text, filePath), null, filePath);
  }
});

test('the workflow pins actions and uses least privilege', () => {
  const workflow = fs.readFileSync(path.join(root, '.github/workflows/risk-tier.yml'), 'utf8');
  assert.match(workflow, /types:\s*\[opened,\s*synchronize,\s*reopened,\s*edited\]/);
  assert.equal(workflow.includes('pull_request_target'), false);
  assert.doesNotMatch(workflow, /^on:\s*\n(?:.*\n)*?push:/m);
  const permissions = workflow.match(/permissions:\n((?:[ \t]+.+\n)+)/);
  assert.ok(permissions);
  const keys = [...permissions[1].matchAll(/^ +([a-z-]+):/gm)].map((match) => match[1]);
  assert.deepEqual(keys, ['contents', 'pull-requests']);
  assert.match(permissions[1], /contents:\s*read/);
  assert.match(permissions[1], /pull-requests:\s*write/);
  assert.doesNotMatch(workflow, /contents:\s*write/);
  const uses = [...workflow.matchAll(/uses:\s*(\S+)/g)].map((match) => match[1]);
  assert.deepEqual(uses, [
    'actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1',
    'actions/setup-node@949feb2413d6458794dcd2491c4babbbce0c15c1',
  ]);
  for (const use of uses) {
    assert.match(use, /@[0-9a-f]{40}$/);
  }
  assert.match(workflow, /node-version:\s*"22\.16\.0"/);
  assert.match(workflow, /node --test scripts\/risk-tier\.test\.mjs/);
  assert.match(workflow, /node scripts\/risk-tier\.mjs/);
  assert.deepEqual(
    [...workflow.matchAll(/secrets\.([A-Z0-9_]+)/g)].map((match) => match[1]),
    ['GITHUB_TOKEN'],
  );
});

test('REVIEW.md and the PR template make the risk label the source of truth', () => {
  const review = fs.readFileSync(path.join(root, 'REVIEW.md'), 'utf8');
  const template = fs.readFileSync(path.join(root, '.github/pull_request_template.md'), 'utf8');
  for (const heading of [
    '## Purpose and bar',
    '## Risk tiers by path',
    '### High',
    '### Medium',
    '### Low',
    '## Review rules come from main only',
    '## Sources',
    '## Risk label',
  ]) {
    assert.equal(review.includes(heading), true, heading);
  }
  assert.equal(review.indexOf('## Risk label') > review.indexOf('## Sources'), true);
  assert.match(review, /`risk:low`, `risk:medium`, or `risk:high` label is the source of truth/);
  assert.match(template, /The risk:\* label is the source of truth/);
  assert.match(template, /- \[ \] low —/);
  assert.match(template, /- \[ \] medium —/);
  assert.match(template, /- \[ \] high —/);
});

test('a bad risk-tiers line fails closed', () => {
  assert.throws(() => parseRiskTiers('sometimes *.js\n'), /risk-tiers:1/);
});

test('pull request events expose the compared shas and body', () => {
  const sha = 'a'.repeat(40);
  const parsed = pullRequestFromEvent({
    pull_request: { number: 7, body: null, base: { sha }, head: { sha } },
  });
  assert.equal(parsed.number, 7);
  assert.equal(parsed.body, '');
  assert.equal(parsed.baseSha, sha);
  assert.throws(() => pullRequestFromEvent({}), /pull_request payload/);
  assert.throws(
    () => pullRequestFromEvent({ pull_request: { number: 1, base: { sha: 'nope' }, head: { sha } } }),
    /base SHA/,
  );
});
