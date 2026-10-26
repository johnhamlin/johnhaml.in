import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
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
  FILE_LIST_CAP,
  assessFileList,
  checkedTiers,
  globSource,
  isLabelWriteDenied,
  isUnsafeChangedPath,
  loadRiskTiers,
  filesFromPullEntries,
  matchGlob,
  moduleRelativePath,
  parseRiskTiers,
  planLabelUpdates,
  pullRequestFromEvent,
  repoRoot,
  reportTierResult,
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
  ['high', '**/REVIEW.md'],
  ['high', '**/CLAUDE.md'],
  ['high', '**/AGENTS.md'],
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
  if (glob.startsWith('**/')) return `src/content/blog/${glob.slice(3)}`;
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
  assert.equal(tierForPath('AGENTS.md', rules), 'high');
  assert.equal(tierForPath('src/content/blog/AGENTS.md', rules), 'high');
  assert.equal(tierForPath('src/content/blog/CLAUDE.md', rules), 'high');
  assert.equal(tierForPath('docs/REVIEW.md', rules), 'high');
  assert.equal(tierForPath('src/content/blog/hello-world.mdx', rules), 'low');
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
  const files = filesFromPullEntries([
    { status: 'renamed', previous_filename: 'README.md', filename: 'docs/README.md' },
    { status: 'modified', filename: 'src/content/blog/hello-world.mdx' },
  ]);
  assert.deepEqual(files, [
    'README.md',
    'docs/README.md',
    'src/content/blog/hello-world.mdx',
  ]);
  assert.equal(tierForPaths(files, rules), 'medium');
  assert.throws(() => filesFromPullEntries(null), /not an array/);
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
  assert.equal(text.includes('/.github/workflows/'), false);
  for (const filePath of ['AGENTS.md', 'src/content/blog/AGENTS.md', 'CLAUDE.md', 'docs/REVIEW.md']) {
    assert.equal(ownersFor(text, filePath)?.includes('@johnhamlin'), true, filePath);
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
  assert.doesNotMatch(workflow, /contents:\s*write/);
  const top = workflow.slice(0, workflow.indexOf('\njobs:\n'));
  assert.match(top, /permissions:\n  contents: read\n/);
  assert.doesNotMatch(top, /pull-requests/);
  const tests = jobBlock(workflow, 'test');
  const label = jobBlock(workflow, 'risk-tier');
  assert.match(tests, /permissions:\n {6}contents: read\n/);
  assert.doesNotMatch(tests, /pull-requests|secrets\./);
  assert.match(tests, /node --test scripts\/risk-tier\.test\.mjs/);
  assert.match(label, /permissions:\n {6}contents: read\n {6}pull-requests: write\n/);
  assert.doesNotMatch(label, /node --test/);
  assert.doesNotMatch(label, /setup-node|\bnpm\b|\byarn\b|\bpnpm\b/);
  assert.match(label, /ref:\s*\$\{\{\s*github\.event\.pull_request\.base\.sha\s*\}\}/);
  assert.doesNotMatch(label, /head\.sha|github\.sha/);
  assert.equal([...label.matchAll(/actions\/checkout@/g)].length, 1);
  assert.match(label, /node scripts\/risk-tier\.mjs/);
  const checkoutPins = [
    ...workflow.matchAll(/uses:\s*(actions\/checkout@[0-9a-f]{40})/g),
  ].map((match) => match[1]);
  const nodePins = [
    ...workflow.matchAll(/uses:\s*(actions\/setup-node@[0-9a-f]{40})/g),
  ].map((match) => match[1]);
  assert.deepEqual(checkoutPins, [
    'actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1',
    'actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1',
  ]);
  assert.deepEqual(nodePins, ['actions/setup-node@949feb2413d6458794dcd2491c4babbbce0c15c1']);
  assert.match(tests, /setup-node@949feb2413d6458794dcd2491c4babbbce0c15c1/);
  assert.equal(
    [...workflow.matchAll(/persist-credentials:\s*false/g)].length,
    checkoutPins.length,
  );
  assert.match(tests, /node-version:\s*"22\.16\.0"/);
  assert.match(label, /fetch-depth:\s*1/);
  assert.match(label, /Fail closed as high/);
  assert.match(label, /pulls\/\$\{number\}\/files\?per_page=100/);
  assert.match(label, /previous_filename/);
  assert.match(label, /END_BOOTSTRAP/);
  assert.match(label, /changed_files/);
  assert.match(label, /stops at 3000/);
  assert.match(label, /could not be re-read/);
  assert.match(label, /lower than computed tier/);
  assert.match(label, /left no risk label/);
  assert.match(label, /unknown risk label/);
  assert.match(label, /after a successful write/);
  assert.match(label, /name === 'risk:high'\) continue/);
  assert.match(label, /cancel-in-progress:\s*false/);
  assert.doesNotMatch(label, /cancel-in-progress:\s*true/);
  assert.match(tests, /cancel-in-progress:\s*true/);
  assert.match(label, /runs-on: ubuntu-slim/);
  assert.match(tests, /runs-on: ubuntu-latest/);
  assert.doesNotMatch(label, /ubuntu-latest/);
  assert.match(label, /node --version/);
  assert.match(label, /3000-file page cap/);
  assert.match(label, /not normalized/);
  assert.match(label, /Base risk-tiers is invalid/);
  assert.doesNotMatch(top, /cancel-in-progress/);
  assert.doesNotMatch(workflow, /git fetch|git diff|git show|git cat-file/);
  const script = labelStepScript(workflow);
  assert.equal(script.includes('node --test'), false);
  assert.equal(script.includes('${{'), false);
  assert.doesNotMatch(script, /\bgit\b/);
  const syntax = spawnSync('bash', ['-n'], { input: script, encoding: 'utf8' });
  assert.equal(syntax.status, 0, syntax.stderr);
  for (const line of workflow.split('\n')) {
    if (!line.includes('${{')) continue;
    assert.match(line, /^\s+(?:group|GITHUB_TOKEN|ref):/);
  }
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
  assert.match(review, /only the base commit/);
  assert.match(review, /files API/);
  assert.match(review, /no script or no `risk-tiers` yet/);
  assert.match(review, /pull request's own workflow file/);
  assert.match(review, /edits the workflow can skip this check/);
  assert.match(review, /CODEOWNERS/);
  assert.match(review, /@johnhamlin/);
  assert.match(review, /branch protection that requires code-owner review/);
  assert.match(review, /lowercases each changed path once/);
  assert.match(review, /CODEOWNERS` patterns are case-sensitive/);
  assert.match(review, /3000-file cap/);
  assert.match(review, /backslash or a `\.\.` segment/);
  assert.match(review, /risk-tiers` is invalid/);
  assert.match(review, /lower than the computed tier/);
  assert.match(review, /more than one risk label remains/);
  assert.match(review, /leaves no risk label/);
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

function writeCommand(dir, name) {
  const file = path.join(dir, name);
  fs.writeFileSync(file, `#!/bin/sh\necho ${name}-executed >> "$RISK_TIER_COMMAND_LOG"\n`);
  fs.chmodSync(file, 0o755);
}

function jobBlock(workflow, id) {
  const marker = `\n  ${id}:\n`;
  const start = workflow.indexOf(marker);
  assert.notEqual(start, -1, id);
  const rest = workflow.slice(start + 1);
  const next = rest.slice(1).search(/\n {2}[a-z0-9-]+:\n/);
  return next === -1 ? rest : rest.slice(0, next + 1);
}

function labelStepScript(workflow) {
  const marker = '        run: |\n';
  const start = workflow.indexOf(marker);
  assert.notEqual(start, -1);
  const lines = [];
  for (const line of workflow.slice(start + marker.length).split('\n')) {
    if (line !== '' && !line.startsWith('          ')) break;
    lines.push(line.slice(10));
  }
  return `${lines.join('\n')}\n`;
}

function bootstrapSource(workflow) {
  const match = workflow.match(/<<'END_BOOTSTRAP'\n([\s\S]*?)\n[ \t]*END_BOOTSTRAP\n/);
  assert.ok(match);
  const lines = match[1].split('\n');
  const widths = lines.filter((line) => line.trim()).map((line) => line.match(/^ */)?.[0].length ?? 0);
  const indent = Math.min(...widths);
  return `${lines.map((line) => line.slice(indent)).join('\n')}\n`;
}

function runBootstrap(body, onRequest, changedFiles = 1, prepare) {
  const workflow = fs.readFileSync(path.join(root, '.github/workflows/risk-tier.yml'), 'utf8');
  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const rawUrl = req.url ?? '';
      const urlPath = decodeURIComponent(rawUrl.split('?')[0]);
      const result = onRequest({
        method: req.method ?? 'GET',
        urlPath,
        rawUrl,
        raw: Buffer.concat(chunks).toString('utf8'),
      });
      res.writeHead(result.status, {
        'content-type': 'application/json',
        ...(result.headers ?? {}),
      });
      res.end(result.body ?? '');
    });
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        reject(new Error('test server has no port'));
        return;
      }
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'risk-bootstrap-'));
      const eventPath = path.join(dir, 'event.json');
      const scriptPath = path.join(dir, 'bootstrap.mjs');
      fs.writeFileSync(
        eventPath,
        JSON.stringify({
          pull_request: {
            number: 6,
            body,
            base: { sha: 'a'.repeat(40) },
            head: { sha: 'b'.repeat(40) },
            changed_files: changedFiles,
          },
        }),
      );
      fs.writeFileSync(scriptPath, bootstrapSource(workflow));
      if (prepare) prepare(dir);
      const child = spawn(process.execPath, [scriptPath], {
        cwd: dir,
        env: {
          PATH: process.env.PATH ?? '',
          GITHUB_TOKEN: 'test-token',
          GITHUB_REPOSITORY: 'o/r',
          GITHUB_API_URL: `http://127.0.0.1:${address.port}`,
          GITHUB_EVENT_PATH: eventPath,
        },
      });
      let stdout = '';
      let stderr = '';
      child.stdout.on('data', (chunk) => {
        stdout += chunk;
      });
      child.stderr.on('data', (chunk) => {
        stderr += chunk;
      });
      const timer = setTimeout(() => child.kill(), 15000);
      child.on('error', (error) => {
        clearTimeout(timer);
        reject(error);
      });
      child.on('close', (status) => {
        clearTimeout(timer);
        server.close(() => {
          fs.rmSync(dir, { recursive: true, force: true });
          resolve({ status, stdout, stderr });
        });
      });
    });
  });
}

function runLabelStep({ script, repo, runnerTemp, body, onRequest, pathEnv, extraEnv, changedFiles }) {
  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const rawUrl = req.url ?? '';
      const urlPath = decodeURIComponent(rawUrl.split('?')[0]);
      const result = onRequest({
        method: req.method ?? 'GET',
        urlPath,
        rawUrl,
        raw: Buffer.concat(chunks).toString('utf8'),
      });
      res.writeHead(result.status, {
        'content-type': 'application/json',
        ...(result.headers ?? {}),
      });
      res.end(result.body ?? '');
    });
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        reject(new Error('test server has no port'));
        return;
      }
      const eventPath = path.join(runnerTemp, 'event.json');
      fs.writeFileSync(
        eventPath,
        JSON.stringify({
          pull_request: {
            number: 6,
            body,
            base: { sha: 'a'.repeat(40) },
            head: { sha: 'b'.repeat(40) },
            changed_files: changedFiles,
          },
        }),
      );
      const child = spawn('bash', ['-s'], {
        cwd: repo,
        env: {
          PATH: pathEnv ?? process.env.PATH ?? '',
          ...extraEnv,
          GITHUB_WORKSPACE: repo,
          RUNNER_TEMP: runnerTemp,
          GITHUB_TOKEN: 'test-token',
          GITHUB_REPOSITORY: 'o/r',
          GITHUB_API_URL: `http://127.0.0.1:${address.port}`,
          GITHUB_EVENT_PATH: eventPath,
        },
      });
      child.stdin.end(script);
      let stdout = '';
      let stderr = '';
      child.stdout.on('data', (chunk) => {
        stdout += chunk;
      });
      child.stderr.on('data', (chunk) => {
        stderr += chunk;
      });
      const timer = setTimeout(() => child.kill(), 15000);
      child.on('error', (error) => {
        clearTimeout(timer);
        reject(error);
      });
      child.on('close', (status) => {
        clearTimeout(timer);
        server.close(() => resolve({ status, stdout, stderr }));
      });
    });
  });
}

test('a checked tier word does not match a longer token', () => {
  assert.deepEqual(checkedTiers('- [x] low-priority'), []);
  assert.deepEqual(checkedTiers('- [x] lowest'), []);
  assert.deepEqual(checkedTiers('- [x] high-risk'), []);
  assert.deepEqual(checkedTiers('- [x] low'), ['low']);
  assert.deepEqual(checkedTiers('- [x] high — config'), ['high']);
  assert.deepEqual(checkedTiers('- [x] medium.'), ['medium']);
});

test('risk-tiers globs may contain spaces', () => {
  const spaced = parseRiskTiers('low src/content/blog/my post.mdx\n');
  assert.equal(spaced[0].glob, 'src/content/blog/my post.mdx');
  assert.equal(tierForPath('src/content/blog/my post.mdx', spaced, []), 'low');
  assert.equal(tierForPath('src/content/blog/my post.mdx', rules), 'low');
});

test('deletes, spaces, dotfiles, and newline paths keep their tier', () => {
  const deleted = filesFromPullEntries([
    { status: 'removed', filename: 'src/lib/blog.ts' },
    { status: 'removed', filename: 'src/content/blog/my post.mdx' },
  ]);
  assert.deepEqual(deleted, ['src/content/blog/my post.mdx', 'src/lib/blog.ts']);
  assert.equal(tierForPaths(deleted, rules), 'high');
  assert.equal(tierForPaths(['src/content/blog/my post.mdx'], rules), 'low');
  for (const filePath of ['.env', '.github/CODEOWNERS', '.cursor/rules/a.mdc', '.claude/settings.json']) {
    assert.equal(tierForPath(filePath, rules), 'high', filePath);
  }
  const newlinePath = 'src/content/blog/hello\nworld.mdx';
  assert.equal(matchGlob('src/content/blog/**', newlinePath), true);
  assert.equal(matchGlob('**', newlinePath), true);
  assert.equal(matchGlob('src/content/text/*', 'src/content/text/hello/world.mdx'), false);
  assert.deepEqual(filesFromPullEntries([{ status: 'removed', filename: newlinePath }]), [newlinePath]);
  assert.equal(tierForPaths([newlinePath], rules), 'low');
});

function labelApi(issueLabels, filesFor) {
  return (request) => {
    if (request.method === 'GET' && request.urlPath.startsWith('/repos/o/r/pulls/6/files')) {
      return filesFor(request);
    }
    if (request.method === 'GET' && request.urlPath === '/repos/o/r/labels/risk:high') {
      return { status: 404, body: '' };
    }
    if (request.method === 'POST' && request.urlPath === '/repos/o/r/labels') {
      return { status: 201, body: '{"name":"risk:high"}' };
    }
    if (request.method === 'GET' && request.urlPath === '/repos/o/r/issues/6/labels') {
      return { status: 200, body: JSON.stringify(issueLabels.map((name) => ({ name }))) };
    }
    if (request.method === 'POST' && request.urlPath === '/repos/o/r/issues/6/labels') {
      issueLabels.push('risk:high');
      return { status: 200, body: '[{"name":"risk:high"}]' };
    }
    return { status: 500, body: `unexpected ${request.method} ${request.urlPath}` };
  };
}

test('a missing risk-tiers file fails closed as high', async () => {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'risk-tier-missing-tiers-'));
  const runnerTemp = fs.mkdtempSync(path.join(os.tmpdir(), 'risk-tier-runner-'));
  const workflow = fs.readFileSync(path.join(root, '.github/workflows/risk-tier.yml'), 'utf8');
  try {
    fs.mkdirSync(path.join(repo, 'scripts'));
    fs.writeFileSync(path.join(repo, 'scripts/risk-tier.mjs'), "console.log('ran-base-script');\n");
    const labeled = await runLabelStep({
      script: labelStepScript(workflow),
      repo,
      runnerTemp,
      changedFiles: 1,
      body: '- [x] high — config\n',
      onRequest: labelApi([], () => ({
        status: 200,
        body: JSON.stringify([
          { status: 'renamed', filename: 'docs/REVIEW.md', previous_filename: 'REVIEW.md' },
        ]),
      })),
    });
    assert.equal(labeled.status, 0, `${labeled.stderr}\n${labeled.stdout}`);
    assert.match(labeled.stdout, /missing scripts\/risk-tier\.mjs or risk-tiers\. Fail closed as high/);
    assert.match(labeled.stdout, /high\tREVIEW\.md/);
    assert.match(labeled.stdout, /high\tdocs\/REVIEW\.md/);
    assert.match(labeled.stdout, /Label: risk:high/);
    assert.doesNotMatch(labeled.stdout, /ran-base-script/);
  } finally {
    fs.rmSync(repo, { recursive: true, force: true });
    fs.rmSync(runnerTemp, { recursive: true, force: true });
  }
});

test('a malicious yarnrc in the pull request is never executed', async () => {
  const workflow = fs.readFileSync(path.join(root, '.github/workflows/risk-tier.yml'), 'utf8');
  const label = jobBlock(workflow, 'risk-tier');
  assert.doesNotMatch(label, /setup-node|\bnpm\b|\byarn\b|\bpnpm\b/);
  assert.match(label, /github\.event\.pull_request\.base\.sha/);
  assert.doesNotMatch(label, /head\.sha|github\.sha/);
  assert.equal([...label.matchAll(/actions\/checkout@/g)].length, 1);
  assert.doesNotMatch(labelStepScript(workflow), /\bgit\b/);

  const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'risk-tier-base-only-'));
  const runnerTemp = fs.mkdtempSync(path.join(os.tmpdir(), 'risk-tier-runner-'));
  const bin = path.join(runnerTemp, 'bin');
  const commandLog = path.join(runnerTemp, 'commands.log');
  const yarnrc = 'yarn-path "./.yarn/releases/evil.cjs"\n';
  try {
    fs.mkdirSync(path.join(repo, 'scripts'));
    fs.copyFileSync(fileURLToPath(new URL('./risk-tier.mjs', import.meta.url)), path.join(repo, 'scripts/risk-tier.mjs'));
    fs.copyFileSync(path.join(root, 'risk-tiers'), path.join(repo, 'risk-tiers'));
    fs.mkdirSync(bin);
    writeCommand(bin, 'yarn');
    writeCommand(bin, 'npm');
    const issueLabels = [];
    const labeled = await runLabelStep({
      script: labelStepScript(workflow),
      repo,
      runnerTemp,
      changedFiles: 2,
      body: '- [x] high — config\n',
      pathEnv: `${bin}:${process.env.PATH ?? ''}`,
      extraEnv: { RISK_TIER_COMMAND_LOG: commandLog },
      onRequest: labelApi(issueLabels, (request) => {
        if ((request.rawUrl ?? '').includes('page=2')) {
          return {
            status: 200,
            body: JSON.stringify([
              {
                status: 'renamed',
                filename: 'src/lib/blog-next.ts',
                previous_filename: 'src/lib/blog.ts',
              },
            ]),
          };
        }
        return {
          status: 200,
          body: JSON.stringify([{ status: 'added', filename: '.yarnrc', patch: yarnrc }]),
          headers: {
            link: '</repos/o/r/pulls/6/files?per_page=100&page=2>; rel="next"',
          },
        };
      }),
    });
    assert.equal(labeled.status, 0, `${labeled.stderr}\n${labeled.stdout}`);
    assert.match(labeled.stdout, /medium\t\.yarnrc/);
    assert.match(labeled.stdout, /high\tsrc\/lib\/blog\.ts/);
    assert.match(labeled.stdout, /medium\tsrc\/lib\/blog-next\.ts/);
    assert.match(labeled.stdout, /Computed risk tier: high/);
    assert.match(labeled.stdout, /Label: risk:high/);
    assert.equal(fs.existsSync(path.join(repo, '.yarnrc')), false);
    assert.equal(fs.existsSync(commandLog), false);
    assert.doesNotMatch(labeled.stdout, /yarn-executed|npm-executed/);
    assert.equal(yarnrc.includes('yarn-path'), true);
  } finally {
    fs.rmSync(repo, { recursive: true, force: true });
    fs.rmSync(runnerTemp, { recursive: true, force: true });
  }
});

test('a 403 on the label write still checks the body', async () => {
  const denied = new Error('GitHub API 403 for POST /repos/o/r/issues/1/labels: {}');
  assert.equal(isLabelWriteDenied(denied), true);
  assert.equal(isLabelWriteDenied(new Error('GitHub API 403 for PUT /repos/o/r/issues/1/labels: {}')), true);
  assert.equal(isLabelWriteDenied(new Error('GitHub API 403 for DELETE /repos/o/r/issues/1/labels/risk:low: {}')), true);
  assert.equal(isLabelWriteDenied(new Error('GitHub API 403 for GET /repos/o/r/issues/1/labels: {}')), false);
  assert.equal(isLabelWriteDenied(new Error('GitHub API 500 for GET /x: {}')), false);
  const warnings = [];
  const before = process.exitCode;
  const passed = await reportTierResult({
    tier: 'low',
    body: '- [x] low — posts',
    applyLabels: async () => {
      throw denied;
    },
    warn: (message) => warnings.push(message),
  });
  assert.equal(passed.ok, true);
  assert.match(warnings.join('\n'), /403/);
  const failed = await reportTierResult({
    tier: 'high',
    body: '- [x] low — posts',
    applyLabels: async () => {
      throw denied;
    },
    warn: () => {},
  });
  assert.equal(failed.ok, false);
  assert.match(failed.reason, /lower than computed tier high/);
  await assert.rejects(
    () =>
      reportTierResult({
        tier: 'low',
        body: '- [x] low — posts',
        applyLabels: async () => {
          throw new Error('GitHub API 500 for GET /x: {}');
        },
        warn: () => {},
      }),
    /GitHub API 500/,
  );
  assert.equal(process.exitCode, before);
});

function rememberIssueLabels(initial = []) {
  const names = [...initial];
  return {
    names,
    respond(request) {
      const { method, urlPath } = request;
      if (method === 'GET' && urlPath === '/repos/o/r/issues/6/labels') {
        return { status: 200, body: JSON.stringify(names.map((name) => ({ name }))) };
      }
      if (method === 'POST' && urlPath === '/repos/o/r/issues/6/labels') {
        if (!names.includes('risk:high')) names.push('risk:high');
        return { status: 200, body: '[{"name":"risk:high"}]' };
      }
      if (method === 'DELETE' && urlPath.startsWith('/repos/o/r/issues/6/labels/')) {
        const name = decodeURIComponent(urlPath.slice(urlPath.lastIndexOf('/') + 1));
        const index = names.indexOf(name);
        if (index >= 0) names.splice(index, 1);
        return { status: 204, body: '' };
      }
      return null;
    },
  };
}

function trackingOkHandler() {
  const calls = [];
  const issues = rememberIssueLabels();
  function handler(request) {
    calls.push(`${request.method} ${request.urlPath}`);
    const issue = issues.respond(request);
    if (issue) return issue;
    if (request.method === 'GET' && request.urlPath === '/repos/o/r/labels/risk:high') {
      return { status: 404, body: '' };
    }
    if (request.method === 'POST' && request.urlPath === '/repos/o/r/labels') {
      return { status: 201, body: '{"name":"risk:high"}' };
    }
    if (request.method === 'GET' && request.urlPath.startsWith('/repos/o/r/pulls/6/files')) {
      return {
        status: 200,
        body: JSON.stringify([
          { status: 'renamed', filename: 'docs/AGENTS.md', previous_filename: 'AGENTS.md' },
        ]),
      };
    }
    return { status: 500, body: 'unexpected' };
  }
  return { calls, handler, names: issues.names };
}

test('a missing base script fails closed and still checks the body', async () => {
  const highRun = trackingOkHandler();
  const high = await runBootstrap('- [x] high — config\n', highRun.handler);
  assert.equal(high.status, 0, high.stderr);
  assert.match(high.stdout, /Fail closed as high/);
  assert.match(high.stdout, /high\tAGENTS\.md/);
  assert.match(high.stdout, /high\tdocs\/AGENTS\.md/);
  assert.match(high.stdout, /Label: risk:high/);
  assert.match(high.stdout, /Risk labels now: risk:high/);
  assert.match(high.stdout, /PR body check passed \(checked high, computed high\)/);
  assert.ok(highRun.calls.includes('POST /repos/o/r/issues/6/labels'));
  assert.deepEqual(highRun.names, ['risk:high']);

  const lowRun = trackingOkHandler();
  const low = await runBootstrap('- [x] low — posts\n', lowRun.handler);
  assert.equal(low.status, 1);
  assert.match(low.stderr, /checked tier low is lower than computed tier high/);
  assert.ok(lowRun.calls.includes('POST /repos/o/r/issues/6/labels'));

  const denied = await runBootstrap('- [x] high — config\n', (request) => {
    if (request.method === 'GET' && request.urlPath.startsWith('/repos/o/r/pulls/6/files')) {
      return { status: 200, body: JSON.stringify([{ filename: 'README.md' }]) };
    }
    if (request.method === 'GET' && request.urlPath === '/repos/o/r/labels/risk:high') {
      return { status: 200, body: '{"name":"risk:high"}' };
    }
    if (request.method === 'GET' && request.urlPath === '/repos/o/r/issues/6/labels') {
      return { status: 200, body: '[]' };
    }
    if (request.method === 'POST' || request.method === 'DELETE' || request.method === 'PUT') {
      return { status: 403, body: '{"message":"Resource not accessible by integration"}' };
    }
    return { status: 500, body: `unexpected ${request.method} ${request.urlPath}` };
  });
  assert.equal(denied.status, 0, denied.stderr);
  assert.match(denied.stderr, /Risk label write was denied \(403\)\. Continuing with the body check\./);
  assert.match(denied.stdout, /PR body check passed \(checked high, computed high\)/);

  const prefix = await runBootstrap('- [x] low-priority\n', trackingOkHandler().handler);
  assert.equal(prefix.status, 1);
  assert.match(prefix.stderr, /no tier is checked/);
});

test('a pull file list shorter than changed_files fails closed as high', async () => {
  const capped = assessFileList(3000, 3001);
  assert.equal(capped.complete, false);
  assert.match(capped.reason, /returned 3000 files, fewer than pull_request\.changed_files \(3001\)/);
  assert.match(capped.reason, /stops at 3000/);
  assert.match(capped.reason, /Fail closed as high/);
  assert.equal(assessFileList(1, 1).complete, true);
  assert.equal(assessFileList(2, 1).complete, true);
  const missing = assessFileList(0, null);
  assert.equal(missing.complete, false);
  assert.match(missing.reason, /changed_files \(missing\)/);

  const renamed = [
    {
      status: 'renamed',
      filename: 'src/content/blog/next.mdx',
      previous_filename: 'src/content/blog/old.mdx',
    },
  ];
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'risk-tier-truncated-'));
  const runnerTemp = fs.mkdtempSync(path.join(os.tmpdir(), 'risk-tier-runner-'));
  const workflow = fs.readFileSync(path.join(root, '.github/workflows/risk-tier.yml'), 'utf8');
  try {
    fs.mkdirSync(path.join(repo, 'scripts'));
    fs.copyFileSync(fileURLToPath(new URL('./risk-tier.mjs', import.meta.url)), path.join(repo, 'scripts/risk-tier.mjs'));
    fs.copyFileSync(path.join(root, 'risk-tiers'), path.join(repo, 'risk-tiers'));
    const labeled = await runLabelStep({
      script: labelStepScript(workflow),
      repo,
      runnerTemp,
      changedFiles: 2,
      body: '- [x] high — config\n',
      onRequest: labelApi([], () => ({ status: 200, body: JSON.stringify(renamed) })),
    });
    assert.equal(labeled.status, 0, `${labeled.stderr}\n${labeled.stdout}`);
    assert.match(labeled.stdout, /returned 1 files, fewer than pull_request\.changed_files \(2\)/);
    assert.match(labeled.stdout, /stops at 3000/);
    assert.match(labeled.stdout, /Fail closed as high/);
    assert.match(labeled.stdout, /high\tsrc\/content\/blog\/next\.mdx/);
    assert.match(labeled.stdout, /high\tsrc\/content\/blog\/old\.mdx/);
    assert.doesNotMatch(labeled.stdout, /^low\t/m);
    assert.match(labeled.stdout, /Computed risk tier: high/);
    assert.match(labeled.stdout, /Label: risk:high/);
  } finally {
    fs.rmSync(repo, { recursive: true, force: true });
    fs.rmSync(runnerTemp, { recursive: true, force: true });
  }

  const bootIssues = rememberIssueLabels();
  const boot = await runBootstrap(
    '- [x] high — config\n',
    (request) => {
      const issue = bootIssues.respond(request);
      if (issue) return issue;
      if (request.method === 'GET' && request.urlPath.startsWith('/repos/o/r/pulls/6/files')) {
        return { status: 200, body: JSON.stringify(renamed) };
      }
      if (request.method === 'GET' && request.urlPath === '/repos/o/r/labels/risk:high') {
        return { status: 200, body: '{"name":"risk:high"}' };
      }
      return { status: 500, body: `unexpected ${request.method} ${request.urlPath}` };
    },
    2,
  );
  assert.equal(boot.status, 0, `${boot.stderr}\n${boot.stdout}`);
  assert.match(boot.stdout, /returned 1 files, fewer than pull_request\.changed_files \(2\)/);
  assert.match(boot.stdout, /stops at 3000/);
  assert.match(boot.stdout, /high\tsrc\/content\/blog\/old\.mdx/);
  assert.doesNotMatch(boot.stdout, /^low\t/m);
  assert.match(boot.stdout, /Label: risk:high/);
});

test('a 403 after a partial label write does not leave two risk labels', async () => {
  const cleaned = ['risk:low'];
  let cleanedRemoves = 0;
  const warnings = [];
  const cleanedResult = await reportTierResult({
    tier: 'high',
    body: '- [x] high — config',
    warn: (message) => warnings.push(message),
    applyLabels: () =>
      applyRiskLabel({
        tier: 'high',
        listLabels: async () => [...cleaned],
        addLabels: async (labels) => {
          for (const label of labels) {
            if (!cleaned.includes(label)) cleaned.push(label);
          }
        },
        removeLabel: async (label) => {
          cleanedRemoves += 1;
          if (cleanedRemoves === 1) {
            throw new Error('GitHub API 403 for DELETE /repos/o/r/issues/6/labels/risk:low: {}');
          }
          const index = cleaned.indexOf(label);
          if (index >= 0) cleaned.splice(index, 1);
        },
      }),
  });
  assert.equal(cleanedResult.ok, true);
  assert.deepEqual(warnings, []);
  assert.deepEqual(cleaned, ['risk:high']);
  assert.equal(cleanedRemoves, 2);

  const stuck = ['risk:low'];
  const stuckRemoved = [];
  const stuckWarnings = [];
  await assert.rejects(
    () =>
      reportTierResult({
        tier: 'high',
        body: '- [x] high — config',
        warn: (message) => stuckWarnings.push(message),
        applyLabels: () =>
          applyRiskLabel({
            tier: 'high',
            listLabels: async () => [...stuck],
            addLabels: async (labels) => {
              for (const label of labels) {
                if (!stuck.includes(label)) stuck.push(label);
              }
            },
            removeLabel: async (label) => {
              stuckRemoved.push(label);
              throw new Error('GitHub API 403 for DELETE /repos/o/r/issues/6/labels/risk:low: {}');
            },
          }),
      }),
    /conflicting labels: risk:low, risk:high/,
  );
  assert.deepEqual(stuckWarnings, []);
  assert.deepEqual(stuck, ['risk:low', 'risk:high']);
  assert.equal(stuckRemoved.includes('risk:high'), false);

  const stale = ['risk:low'];
  const staleRemoved = [];
  await assert.rejects(
    () =>
      reportTierResult({
        tier: 'high',
        body: '- [x] high — config',
        warn: () => {
          throw new Error('a stale lower label must fail the check');
        },
        applyLabels: () =>
          applyRiskLabel({
            tier: 'high',
            listLabels: async () => [...stale],
            addLabels: async () => {
              throw new Error('GitHub API 403 for POST /repos/o/r/issues/6/labels: {}');
            },
            removeLabel: async (label) => {
              staleRemoved.push(label);
              throw new Error('GitHub API 403 for DELETE /repos/o/r/issues/6/labels/risk:low: {}');
            },
          }),
      }),
    /left risk:low, lower than computed tier high/,
  );
  assert.deepEqual(stale, ['risk:low']);
  assert.deepEqual(staleRemoved, ['risk:low']);

  const unreadWarnings = [];
  let unreadLists = 0;
  await assert.rejects(
    () =>
      reportTierResult({
        tier: 'high',
        body: '- [x] high — config',
        warn: (message) => unreadWarnings.push(message),
        applyLabels: () =>
          applyRiskLabel({
            tier: 'high',
            listLabels: async () => {
              unreadLists += 1;
              if (unreadLists === 1) return [];
              throw new Error('GitHub API 403 for GET /repos/o/r/issues/6/labels: {}');
            },
            addLabels: async () => {
              throw new Error('GitHub API 403 for POST /repos/o/r/issues/6/labels: {}');
            },
            removeLabel: async () => {
              throw new Error('should not remove');
            },
          }),
      }),
    /could not be re-read/,
  );
  assert.deepEqual(unreadWarnings, []);

  const emptyWarnings = [];
  const emptyResult = await reportTierResult({
    tier: 'high',
    body: '- [x] high — config',
    warn: (message) => emptyWarnings.push(message),
    applyLabels: () =>
      applyRiskLabel({
        tier: 'high',
        listLabels: async () => [],
        addLabels: async () => {
          throw new Error('GitHub API 403 for POST /repos/o/r/issues/6/labels: {}');
        },
        removeLabel: async () => {
          throw new Error('should not remove');
        },
      }),
  });
  assert.equal(emptyResult.ok, true);
  assert.match(emptyWarnings.join('\n'), /Continuing with the body check/);

  const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'risk-tier-partial-'));
  const runnerTemp = fs.mkdtempSync(path.join(os.tmpdir(), 'risk-tier-runner-'));
  const workflow = fs.readFileSync(path.join(root, '.github/workflows/risk-tier.yml'), 'utf8');
  const names = ['risk:low'];
  let deletes = 0;
  try {
    fs.mkdirSync(path.join(repo, 'scripts'));
    fs.copyFileSync(fileURLToPath(new URL('./risk-tier.mjs', import.meta.url)), path.join(repo, 'scripts/risk-tier.mjs'));
    fs.copyFileSync(path.join(root, 'risk-tiers'), path.join(repo, 'risk-tiers'));
    const labeled = await runLabelStep({
      script: labelStepScript(workflow),
      repo,
      runnerTemp,
      changedFiles: 1,
      body: '- [x] high — config\n',
      onRequest: (request) => {
        const { method, urlPath } = request;
        if (method === 'GET' && urlPath.startsWith('/repos/o/r/pulls/6/files')) {
          return { status: 200, body: JSON.stringify([{ filename: 'package.json' }]) };
        }
        if (method === 'GET' && urlPath === '/repos/o/r/labels/risk:high') {
          return { status: 200, body: '{"name":"risk:high"}' };
        }
        if (method === 'GET' && urlPath === '/repos/o/r/issues/6/labels') {
          return { status: 200, body: JSON.stringify(names.map((name) => ({ name }))) };
        }
        if (method === 'POST' && urlPath === '/repos/o/r/issues/6/labels') {
          return { status: 403, body: '{"message":"Resource not accessible by integration"}' };
        }
        if (method === 'DELETE' && urlPath === '/repos/o/r/issues/6/labels/risk:low') {
          deletes += 1;
          return { status: 403, body: '{"message":"Resource not accessible by integration"}' };
        }
        return { status: 500, body: `unexpected ${method} ${urlPath}` };
      },
    });
    assert.equal(labeled.status, 1, `${labeled.stderr}\n${labeled.stdout}`);
    assert.match(labeled.stderr, /left risk:low, lower than computed tier high/);
    assert.match(labeled.stdout, /high\tpackage\.json/);
    assert.match(labeled.stdout, /Label: risk:high/);
    assert.doesNotMatch(`${labeled.stdout}\n${labeled.stderr}`, /PR body check passed|Continuing with the body check/);
    assert.ok(deletes >= 1);
    assert.deepEqual(names, ['risk:low']);
  } finally {
    fs.rmSync(repo, { recursive: true, force: true });
    fs.rmSync(runnerTemp, { recursive: true, force: true });
  }

  const bootNames = ['risk:low'];
  let bootDeletes = 0;
  const boot = await runBootstrap('- [x] high — config\n', (request) => {
    const { method, urlPath } = request;
    if (method === 'GET' && urlPath.startsWith('/repos/o/r/pulls/6/files')) {
      return { status: 200, body: JSON.stringify([{ filename: 'README.md' }]) };
    }
    if (method === 'GET' && urlPath === '/repos/o/r/labels/risk:high') {
      return { status: 200, body: '{"name":"risk:high"}' };
    }
    if (method === 'GET' && urlPath === '/repos/o/r/issues/6/labels') {
      return { status: 200, body: JSON.stringify(bootNames.map((name) => ({ name }))) };
    }
    if (method === 'POST' && urlPath === '/repos/o/r/issues/6/labels') {
      return { status: 403, body: '{"message":"Resource not accessible by integration"}' };
    }
    if (method === 'DELETE' && urlPath === '/repos/o/r/issues/6/labels/risk:low') {
      bootDeletes += 1;
      return { status: 403, body: '{"message":"Resource not accessible by integration"}' };
    }
    if (method === 'DELETE' && urlPath === '/repos/o/r/issues/6/labels/risk:high') {
      return { status: 500, body: 'must not delete the desired label' };
    }
    return { status: 500, body: `unexpected ${method} ${urlPath}` };
  });
  assert.equal(boot.status, 1, `${boot.stderr}\n${boot.stdout}`);
  assert.match(boot.stderr, /left risk:low, lower than computed tier high/);
  assert.match(boot.stdout, /Label: risk:high/);
  assert.doesNotMatch(`${boot.stdout}\n${boot.stderr}`, /PR body check passed|Continuing with the body check/);
  assert.ok(bootDeletes >= 1);
  assert.deepEqual(bootNames, ['risk:low']);
});

test('changed paths are matched literally', () => {
  const traversal = 'src/content/blog/../blog/post.mdx';
  const windowsPath = 'src\\content\\blog\\post.mdx';
  assert.equal(isUnsafeChangedPath(traversal), true);
  assert.equal(isUnsafeChangedPath(windowsPath), true);
  assert.equal(isUnsafeChangedPath('src/content/blog/my..post.mdx'), false);
  assert.equal(tierForPath(traversal, rules), 'high');
  assert.equal(tierForPath(windowsPath, rules), 'high');
  assert.equal(tierForPath('src/content/blog/my..post.mdx', rules), 'low');
  assert.equal(tierForPath('src/content/blog/post.mdx', rules), 'low');
  assert.equal(tierForPath('./src/content/blog/post.mdx', rules), 'medium');
  assert.equal(tierForPath('agents.md', rules), 'high');
  assert.equal(tierForPath('src/content/blog/Agents.md', rules), 'high');
  assert.equal(tierForPath('docs/review.md', rules), 'high');
  assert.equal(tierForPath('src/content/blog/CLAUDE.MD', rules), 'high');
  assert.equal(tierForPath('src/content/blog/not-AGENTS.md', rules), 'low');
  assert.equal(tierForPath('.Claude/x', rules), 'high');
  assert.equal(tierForPath('.claude/x', rules), tierForPath('.Claude/x', rules));
  assert.equal(tierForPath('.CURSOR/x', rules), 'high');
  assert.equal(tierForPath('.cursor/x', rules), tierForPath('.CURSOR/x', rules));
  assert.equal(tierForPath('.GitHub/workflows/x.yml', rules), 'high');
  assert.equal(tierForPath('.github/workflows/x.yml', rules), tierForPath('.GitHub/workflows/x.yml', rules));
  assert.equal(tierForPath('Package.json', rules), 'high');
  assert.equal(tierForPath('package.json', rules), tierForPath('Package.json', rules));
  assert.equal(
    tierForPath('SRC/COMPONENTS/Header.tsx', rules),
    tierForPath('src/components/Header.tsx', rules),
  );
  assert.equal(tierForPath('SRC/CONTENT/BLOG/post.mdx', rules), 'low');
  assert.equal(assessFileList(FILE_LIST_CAP, FILE_LIST_CAP).complete, false);
  assert.match(assessFileList(FILE_LIST_CAP, FILE_LIST_CAP).reason, /3000-file page cap/);
  assert.doesNotMatch(assessFileList(FILE_LIST_CAP, FILE_LIST_CAP).reason, /fewer than/);
  assert.equal(assessFileList(FILE_LIST_CAP - 1, FILE_LIST_CAP - 1).complete, true);
});

test('an unsafe path, a full page cap, or invalid tiers still label high', async () => {
  const workflow = fs.readFileSync(path.join(root, '.github/workflows/risk-tier.yml'), 'utf8');
  const script = labelStepScript(workflow);
  const traversal = 'src/content/blog/../blog/post.mdx';
  const windowsPath = 'src\\content\\blog\\post.mdx';

  async function withRepo(tiersBody, run) {
    const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'risk-tier-literal-'));
    const runnerTemp = fs.mkdtempSync(path.join(os.tmpdir(), 'risk-tier-runner-'));
    try {
      fs.mkdirSync(path.join(repo, 'scripts'));
      fs.copyFileSync(
        fileURLToPath(new URL('./risk-tier.mjs', import.meta.url)),
        path.join(repo, 'scripts/risk-tier.mjs'),
      );
      fs.writeFileSync(path.join(repo, 'risk-tiers'), tiersBody);
      return await run(repo, runnerTemp);
    } finally {
      fs.rmSync(repo, { recursive: true, force: true });
      fs.rmSync(runnerTemp, { recursive: true, force: true });
    }
  }

  const unsafeLabels = [];
  const unsafe = await withRepo(fs.readFileSync(path.join(root, 'risk-tiers'), 'utf8'), (repo, runnerTemp) =>
    runLabelStep({
      script,
      repo,
      runnerTemp,
      changedFiles: 2,
      body: '- [x] high — config\n',
      onRequest: labelApi(unsafeLabels, () => ({
        status: 200,
        body: JSON.stringify([
          { filename: traversal },
          { filename: windowsPath },
        ]),
      })),
    }),
  );
  assert.equal(unsafe.status, 0, `${unsafe.stderr}\n${unsafe.stdout}`);
  assert.match(unsafe.stdout, /not normalized/);
  assert.match(unsafe.stdout, /Fail closed as high/);
  assert.match(unsafe.stdout, /high\tsrc\/content\/blog\/\.\.\/blog\/post\.mdx/);
  assert.match(unsafe.stdout, /high\tsrc\\content\\blog\\post\.mdx/);
  assert.doesNotMatch(unsafe.stdout, /^low\t/m);
  assert.match(unsafe.stdout, /Label: risk:high/);
  assert.deepEqual(unsafeLabels, ['risk:high']);

  const cappedLabels = [];
  const many = Array.from({ length: FILE_LIST_CAP }, (_, index) => ({
    filename: `src/content/blog/p${index}.mdx`,
  }));
  const capped = await withRepo(fs.readFileSync(path.join(root, 'risk-tiers'), 'utf8'), (repo, runnerTemp) =>
    runLabelStep({
      script,
      repo,
      runnerTemp,
      changedFiles: FILE_LIST_CAP,
      body: '- [x] high — config\n',
      onRequest: labelApi(cappedLabels, () => ({ status: 200, body: JSON.stringify(many) })),
    }),
  );
  assert.equal(capped.status, 0, `${capped.stderr}\n${capped.stdout}`);
  assert.match(capped.stdout, /3000-file page cap \(3000 files\)/);
  assert.doesNotMatch(capped.stdout, /fewer than/);
  assert.doesNotMatch(capped.stdout, /^low\t/m);
  assert.match(capped.stdout, /Label: risk:high/);
  assert.deepEqual(cappedLabels, ['risk:high']);

  const invalidLabels = [];
  const invalid = await withRepo('nope\n', (repo, runnerTemp) =>
    runLabelStep({
      script,
      repo,
      runnerTemp,
      changedFiles: 1,
      body: '- [x] low — posts\n',
      onRequest: labelApi(invalidLabels, () => ({
        status: 200,
        body: JSON.stringify([{ filename: 'src/content/blog/post.mdx' }]),
      })),
    }),
  );
  assert.equal(invalid.status, 1, `${invalid.stderr}\n${invalid.stdout}`);
  assert.match(invalid.stdout, /Base risk-tiers is invalid \(risk-tiers:1: expected "<tier> <glob>"\)/);
  assert.match(invalid.stdout, /Label: risk:high/);
  assert.match(invalid.stderr, /checked tier low is lower than computed tier high/);
  assert.doesNotMatch(`${invalid.stdout}\n${invalid.stderr}`, /Continuing with the body check/);
  assert.doesNotMatch(invalid.stdout, /^low\t/m);
  assert.deepEqual(invalidLabels, ['risk:high']);

  const oddIssues = rememberIssueLabels();
  const odd = await runBootstrap(
    '- [x] high — config\n',
    (request) => {
      const issue = oddIssues.respond(request);
      if (issue) return issue;
      if (request.method === 'GET' && request.urlPath.startsWith('/repos/o/r/pulls/6/files')) {
        return { status: 200, body: JSON.stringify([{ filename: 'src/content/blog/agents.md' }]) };
      }
      if (request.method === 'GET' && request.urlPath === '/repos/o/r/labels/risk:high') {
        return { status: 200, body: '{"name":"risk:high"}' };
      }
      return { status: 500, body: `unexpected ${request.method} ${request.urlPath}` };
    },
  );
  assert.equal(odd.status, 0, `${odd.stderr}\n${odd.stdout}`);
  assert.match(odd.stdout, /high\tsrc\/content\/blog\/agents\.md/);
  assert.match(odd.stdout, /Label: risk:high/);

  const unsafeIssues = rememberIssueLabels();
  const bootUnsafe = await runBootstrap(
    '- [x] high — config\n',
    (request) => {
      const issue = unsafeIssues.respond(request);
      if (issue) return issue;
      if (request.method === 'GET' && request.urlPath.startsWith('/repos/o/r/pulls/6/files')) {
        return { status: 200, body: JSON.stringify([{ filename: traversal }]) };
      }
      if (request.method === 'GET' && request.urlPath === '/repos/o/r/labels/risk:high') {
        return { status: 200, body: '{"name":"risk:high"}' };
      }
      return { status: 500, body: `unexpected ${request.method} ${request.urlPath}` };
    },
  );
  assert.equal(bootUnsafe.status, 0, `${bootUnsafe.stderr}\n${bootUnsafe.stdout}`);
  assert.match(bootUnsafe.stdout, /not normalized/);
  assert.match(bootUnsafe.stdout, /high\tsrc\/content\/blog\/\.\.\/blog\/post\.mdx/);
  assert.doesNotMatch(bootUnsafe.stdout, /high\tsrc\/content\/blog\/post\.mdx/);

  const invalidIssues = rememberIssueLabels();
  const bootInvalid = await runBootstrap(
    '- [x] low — posts\n',
    (request) => {
      const issue = invalidIssues.respond(request);
      if (issue) return issue;
      if (request.method === 'GET' && request.urlPath.startsWith('/repos/o/r/pulls/6/files')) {
        return { status: 200, body: JSON.stringify([{ filename: 'README.md' }]) };
      }
      if (request.method === 'GET' && request.urlPath === '/repos/o/r/labels/risk:high') {
        return { status: 200, body: '{"name":"risk:high"}' };
      }
      return { status: 500, body: `unexpected ${request.method} ${request.urlPath}` };
    },
    1,
    (dir) => {
      fs.writeFileSync(path.join(dir, 'risk-tiers'), 'nope\n');
    },
  );
  assert.equal(bootInvalid.status, 1, `${bootInvalid.stderr}\n${bootInvalid.stdout}`);
  assert.match(bootInvalid.stdout, /Base risk-tiers is invalid \(risk-tiers:1: expected "<tier> <glob>"\)/);
  assert.match(bootInvalid.stdout, /Label: risk:high/);
  assert.match(bootInvalid.stderr, /checked tier low is lower than computed tier high/);

  const capIssues = rememberIssueLabels();
  const bootCap = await runBootstrap(
    '- [x] high — config\n',
    (request) => {
      const issue = capIssues.respond(request);
      if (issue) return issue;
      if (request.method === 'GET' && request.urlPath.startsWith('/repos/o/r/pulls/6/files')) {
        return { status: 200, body: JSON.stringify(many) };
      }
      if (request.method === 'GET' && request.urlPath === '/repos/o/r/labels/risk:high') {
        return { status: 200, body: '{"name":"risk:high"}' };
      }
      return { status: 500, body: `unexpected ${request.method} ${request.urlPath}` };
    },
    FILE_LIST_CAP,
  );
  assert.equal(bootCap.status, 0, `${bootCap.stderr}\n${bootCap.stdout}`);
  assert.match(bootCap.stdout, /3000-file page cap \(3000 files\)/);
  assert.match(bootCap.stdout, /Label: risk:high/);
  assert.doesNotMatch(bootCap.stdout, /^low\t/m);
});

function bootstrapIssueLabels(onIssueLabels) {
  return (request) => {
    if (request.method === 'GET' && request.urlPath.startsWith('/repos/o/r/pulls/6/files')) {
      return { status: 200, body: JSON.stringify([{ filename: 'README.md' }]) };
    }
    if (request.method === 'GET' && request.urlPath === '/repos/o/r/labels/risk:high') {
      return { status: 200, body: '{"name":"risk:high"}' };
    }
    const issue = onIssueLabels(request);
    if (issue) return issue;
    return { status: 500, body: `unexpected ${request.method} ${request.urlPath}` };
  };
}

test('a 403 on the re-read after a successful label write fails the check', async () => {
  let reads = 0;
  const warnings = [];
  await assert.rejects(
    () =>
      reportTierResult({
        tier: 'high',
        body: '- [x] high — config',
        warn: (message) => warnings.push(message),
        applyLabels: () =>
          applyRiskLabel({
            tier: 'high',
            listLabels: async () => {
              reads += 1;
              if (reads === 1) return [];
              throw new Error('GitHub API 403 for GET /repos/o/r/issues/6/labels: {}');
            },
            addLabels: async () => {},
            removeLabel: async () => {
              throw new Error('should not remove');
            },
          }),
      }),
    /could not be re-read/,
  );
  assert.equal(reads, 2);
  assert.deepEqual(warnings, []);
});

test('a bootstrap re-read 403 after a successful add fails the check', async () => {
  let reads = 0;
  const result = await runBootstrap(
    '- [x] high — config\n',
    bootstrapIssueLabels((request) => {
      if (request.method === 'GET' && request.urlPath === '/repos/o/r/issues/6/labels') {
        reads += 1;
        if (reads === 1) return { status: 200, body: '[]' };
        return { status: 403, body: '{"message":"Resource not accessible by integration"}' };
      }
      if (request.method === 'POST' && request.urlPath === '/repos/o/r/issues/6/labels') {
        return { status: 200, body: '[{"name":"risk:high"}]' };
      }
      return null;
    }),
  );
  assert.equal(result.status, 1, `${result.stderr}\n${result.stdout}`);
  assert.match(result.stderr, /could not be re-read/);
  assert.doesNotMatch(`${result.stdout}\n${result.stderr}`, /PR body check passed|Continuing with the body check/);
  assert.equal(reads, 2);
});

test('a bootstrap re-read that shows a lower risk label fails the check', async () => {
  let reads = 0;
  const result = await runBootstrap(
    '- [x] high — config\n',
    bootstrapIssueLabels((request) => {
      if (request.method === 'GET' && request.urlPath === '/repos/o/r/issues/6/labels') {
        reads += 1;
        if (reads === 1) return { status: 200, body: '[]' };
        return { status: 200, body: '[{"name":"risk:low"}]' };
      }
      if (request.method === 'POST' && request.urlPath === '/repos/o/r/issues/6/labels') {
        return { status: 200, body: '[{"name":"risk:high"}]' };
      }
      return null;
    }),
  );
  assert.equal(result.status, 1, `${result.stderr}\n${result.stdout}`);
  assert.match(result.stderr, /left risk:low, lower than computed tier high/);
  assert.doesNotMatch(result.stderr, /403/);
  assert.doesNotMatch(`${result.stdout}\n${result.stderr}`, /PR body check passed|Continuing with the body check/);
  assert.equal(reads, 2);
});

test('a bootstrap re-read that shows two risk labels after a delete fails the check', async () => {
  let reads = 0;
  let deletes = 0;
  const names = ['risk:low', 'risk:high'];
  const result = await runBootstrap(
    '- [x] high — config\n',
    bootstrapIssueLabels((request) => {
      if (request.method === 'GET' && request.urlPath === '/repos/o/r/issues/6/labels') {
        reads += 1;
        const shown = deletes === 0 ? names : [...names, 'risk:medium'];
        return { status: 200, body: JSON.stringify(shown.map((name) => ({ name }))) };
      }
      if (request.method === 'DELETE' && request.urlPath === '/repos/o/r/issues/6/labels/risk:low') {
        deletes += 1;
        const index = names.indexOf('risk:low');
        if (index >= 0) names.splice(index, 1);
        return { status: 204, body: '' };
      }
      if (request.method === 'DELETE' && request.urlPath === '/repos/o/r/issues/6/labels/risk:high') {
        return { status: 500, body: 'must not delete the desired label' };
      }
      return null;
    }),
  );
  assert.equal(result.status, 1, `${result.stderr}\n${result.stdout}`);
  assert.match(result.stderr, /conflicting labels: risk:high, risk:medium/);
  assert.doesNotMatch(result.stderr, /403|risk:low/);
  assert.doesNotMatch(`${result.stdout}\n${result.stderr}`, /PR body check passed|Continuing with the body check/);
  assert.equal(deletes, 1);
  assert.deepEqual(names, ['risk:high']);
  assert.equal(reads, 2);
});

test('a successful write whose re-read shows no risk label fails the check', async () => {
  let reads = 0;
  const warnings = [];
  await assert.rejects(
    () =>
      reportTierResult({
        tier: 'high',
        body: '- [x] high — config',
        warn: (message) => warnings.push(message),
        applyLabels: () =>
          applyRiskLabel({
            tier: 'high',
            listLabels: async () => {
              reads += 1;
              if (reads === 1) return [];
              return ['documentation'];
            },
            addLabels: async () => {},
            removeLabel: async () => {
              throw new Error('should not remove');
            },
          }),
      }),
    /Expected exactly one label risk:high, found none/,
  );
  assert.equal(reads, 2);
  assert.deepEqual(warnings, []);
});

test('a bootstrap re-read that shows no risk label after a successful write fails the check', async () => {
  let reads = 0;
  let posts = 0;
  const result = await runBootstrap(
    '- [x] high — config\n',
    bootstrapIssueLabels((request) => {
      if (request.method === 'GET' && request.urlPath === '/repos/o/r/issues/6/labels') {
        reads += 1;
        return { status: 200, body: '[]' };
      }
      if (request.method === 'POST' && request.urlPath === '/repos/o/r/issues/6/labels') {
        posts += 1;
        return { status: 200, body: '[{"name":"risk:high"}]' };
      }
      return null;
    }),
  );
  assert.equal(result.status, 1, `${result.stderr}\n${result.stdout}`);
  assert.match(result.stderr, /left no risk label/);
  assert.doesNotMatch(result.stderr, /403/);
  assert.doesNotMatch(`${result.stdout}\n${result.stderr}`, /PR body check passed|Continuing with the body check/);
  assert.equal(posts, 1);
  assert.equal(reads, 2);
});

test('an unknown risk label fails the check', async () => {
  const warnings = [];
  await assert.rejects(
    () =>
      reportTierResult({
        tier: 'high',
        body: '- [x] high — config',
        warn: (message) => warnings.push(message),
        applyLabels: () =>
          applyRiskLabel({
            tier: 'high',
            listLabels: async () => ['risk:high', 'risk:foo'],
            addLabels: async () => {
              throw new Error('should not add');
            },
            removeLabel: async () => {
              throw new Error('should not remove');
            },
          }),
      }),
    /Unknown risk label: risk:foo/,
  );
  assert.deepEqual(warnings, []);
});

test('a bootstrap re-read that shows an unknown risk label fails the check', async () => {
  const result = await runBootstrap(
    '- [x] high — config\n',
    bootstrapIssueLabels((request) => {
      if (request.method === 'GET' && request.urlPath === '/repos/o/r/issues/6/labels') {
        return { status: 200, body: '[{"name":"risk:high"},{"name":"risk:foo"}]' };
      }
      return null;
    }),
  );
  assert.equal(result.status, 1, `${result.stderr}\n${result.stdout}`);
  assert.match(result.stderr, /unknown risk label: risk:foo/);
  assert.doesNotMatch(result.stderr, /403/);
  assert.doesNotMatch(`${result.stdout}\n${result.stderr}`, /PR body check passed|Continuing with the body check/);
});

test('a recovery write that succeeds followed by a re-read 403 fails the check', async () => {
  let reads = 0;
  let removes = 0;
  const warnings = [];
  await assert.rejects(
    () =>
      reportTierResult({
        tier: 'high',
        body: '- [x] high — config',
        warn: (message) => warnings.push(message),
        applyLabels: () =>
          applyRiskLabel({
            tier: 'high',
            listLabels: async () => {
              reads += 1;
              if (reads < 3) return ['risk:low'];
              throw new Error('GitHub API 403 for GET /repos/o/r/issues/6/labels: {}');
            },
            addLabels: async () => {
              throw new Error('GitHub API 403 for POST /repos/o/r/issues/6/labels: {}');
            },
            removeLabel: async () => {
              removes += 1;
            },
          }),
      }),
    /could not be re-read after a successful write/,
  );
  assert.equal(removes, 1);
  assert.equal(reads, 3);
  assert.deepEqual(warnings, []);
});

test('a bootstrap recovery delete that succeeds followed by a re-read 403 fails the check', async () => {
  let reads = 0;
  let deletes = 0;
  const result = await runBootstrap(
    '- [x] high — config\n',
    bootstrapIssueLabels((request) => {
      if (request.method === 'GET' && request.urlPath === '/repos/o/r/issues/6/labels') {
        reads += 1;
        if (reads < 3) return { status: 200, body: '[{"name":"risk:low"}]' };
        return { status: 403, body: '{"message":"Resource not accessible by integration"}' };
      }
      if (request.method === 'POST' && request.urlPath === '/repos/o/r/issues/6/labels') {
        return { status: 403, body: '{"message":"Resource not accessible by integration"}' };
      }
      if (request.method === 'DELETE' && request.urlPath === '/repos/o/r/issues/6/labels/risk:low') {
        deletes += 1;
        return { status: 204, body: '' };
      }
      return null;
    }),
  );
  assert.equal(result.status, 1, `${result.stderr}\n${result.stdout}`);
  assert.match(result.stderr, /could not be re-read after a successful write/);
  assert.doesNotMatch(`${result.stdout}\n${result.stderr}`, /PR body check passed|Continuing with the body check/);
  assert.equal(deletes, 1);
  assert.equal(reads, 3);
});

const READ_DENIED = '{"message":"Resource not accessible by integration"}';

function filesPackage() {
  return { status: 200, body: JSON.stringify([{ filename: 'package.json' }]) };
}

async function runRealLabelScript(onRequest) {
  const workflow = fs.readFileSync(path.join(root, '.github/workflows/risk-tier.yml'), 'utf8');
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'risk-tier-read-denied-'));
  const runnerTemp = fs.mkdtempSync(path.join(os.tmpdir(), 'risk-tier-runner-'));
  try {
    fs.mkdirSync(path.join(repo, 'scripts'));
    fs.copyFileSync(
      fileURLToPath(new URL('./risk-tier.mjs', import.meta.url)),
      path.join(repo, 'scripts/risk-tier.mjs'),
    );
    fs.copyFileSync(path.join(root, 'risk-tiers'), path.join(repo, 'risk-tiers'));
    return await runLabelStep({
      script: labelStepScript(workflow),
      repo,
      runnerTemp,
      changedFiles: 1,
      body: '- [x] high — config\n',
      onRequest,
    });
  } finally {
    fs.rmSync(repo, { recursive: true, force: true });
    fs.rmSync(runnerTemp, { recursive: true, force: true });
  }
}

function assertReadDeniedFailed(result, writes) {
  assert.equal(result.status, 1, `${result.stderr}\n${result.stdout}`);
  assert.doesNotMatch(`${result.stdout}\n${result.stderr}`, /PR body check passed|Continuing with the body check/);
  assert.deepEqual(writes, []);
}

test('a 403 on the label list GET fails when nothing is written', async () => {
  const writes = [];
  const result = await runRealLabelScript((request) => {
    const { method, urlPath } = request;
    if (method === 'POST' || method === 'PUT' || method === 'DELETE') {
      writes.push(`${method} ${urlPath}`);
      return { status: 500, body: 'must not write' };
    }
    if (method === 'GET' && urlPath.startsWith('/repos/o/r/pulls/6/files')) return filesPackage();
    if (method === 'GET' && urlPath === '/repos/o/r/issues/6/labels') {
      return { status: 403, body: READ_DENIED };
    }
    return { status: 500, body: `unexpected ${method} ${urlPath}` };
  });
  assertReadDeniedFailed(result, writes);
  assert.match(result.stderr, /GitHub API 403 for GET \/repos\/o\/r\/issues\/6\/labels/);
});

test('a bootstrap 403 on the label list GET fails when nothing is written', async () => {
  const writes = [];
  let lists = 0;
  const result = await runBootstrap('- [x] high — config\n', (request) => {
    const { method, urlPath } = request;
    if (method === 'POST' || method === 'PUT' || method === 'DELETE') {
      writes.push(`${method} ${urlPath}`);
      return { status: 500, body: 'must not write' };
    }
    if (method === 'GET' && urlPath.startsWith('/repos/o/r/pulls/6/files')) return filesPackage();
    if (method === 'GET' && urlPath === '/repos/o/r/labels/risk:high') {
      return { status: 200, body: '{"name":"risk:high"}' };
    }
    if (method === 'GET' && urlPath === '/repos/o/r/issues/6/labels') {
      lists += 1;
      return { status: 403, body: READ_DENIED };
    }
    return { status: 500, body: `unexpected ${method} ${urlPath}` };
  });
  assertReadDeniedFailed(result, writes);
  assert.equal(lists, 1);
  assert.match(result.stderr, /Risk label list could not be read \(403\)\. Fail closed\./);
});

test('a 403 on the label-exists GET fails when the re-read shows no risk label', async () => {
  const writes = [];
  let exists = 0;
  let lists = 0;
  const result = await runRealLabelScript((request) => {
    const { method, urlPath } = request;
    if (method === 'POST' || method === 'PUT' || method === 'DELETE') {
      writes.push(`${method} ${urlPath}`);
      return { status: 500, body: 'must not write' };
    }
    if (method === 'GET' && urlPath.startsWith('/repos/o/r/pulls/6/files')) return filesPackage();
    if (method === 'GET' && urlPath === '/repos/o/r/issues/6/labels') {
      lists += 1;
      return { status: 200, body: '[]' };
    }
    if (method === 'GET' && urlPath === '/repos/o/r/labels/risk:high') {
      exists += 1;
      return { status: 403, body: READ_DENIED };
    }
    return { status: 500, body: `unexpected ${method} ${urlPath}` };
  });
  assertReadDeniedFailed(result, writes);
  assert.equal(exists, 1);
  assert.ok(lists >= 1);
  assert.match(result.stderr, /GitHub API 403 for GET \/repos\/o\/r\/labels\/risk%3Ahigh/);
});

test('a bootstrap 403 on the label-exists GET fails when the re-read shows no risk label', async () => {
  const writes = [];
  let exists = 0;
  let lists = 0;
  const result = await runBootstrap('- [x] high — config\n', (request) => {
    const { method, urlPath } = request;
    if (method === 'POST' || method === 'PUT' || method === 'DELETE') {
      writes.push(`${method} ${urlPath}`);
      return { status: 500, body: 'must not write' };
    }
    if (method === 'GET' && urlPath.startsWith('/repos/o/r/pulls/6/files')) return filesPackage();
    if (method === 'GET' && urlPath === '/repos/o/r/labels/risk:high') {
      exists += 1;
      return { status: 403, body: READ_DENIED };
    }
    if (method === 'GET' && urlPath === '/repos/o/r/issues/6/labels') {
      lists += 1;
      return { status: 200, body: '[]' };
    }
    return { status: 500, body: `unexpected ${method} ${urlPath}` };
  });
  assertReadDeniedFailed(result, writes);
  assert.equal(exists, 1);
  assert.equal(lists, 1);
  assert.match(result.stderr, /left no risk label/);
  assert.doesNotMatch(result.stderr, /write was denied/);
});
