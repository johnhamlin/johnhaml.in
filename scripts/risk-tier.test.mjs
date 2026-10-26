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
  checkedTiers,
  globSource,
  isLabelWriteDenied,
  loadRiskTiers,
  matchGlob,
  moduleRelativePath,
  parseNameStatusZ,
  parseRiskTiers,
  planLabelUpdates,
  pullRequestFromEvent,
  repoRoot,
  reportTierResult,
  riskTiersPath,
  tierForBaseCopy,
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
  assert.match(workflow, /fetch-depth:\s*0/);
  assert.match(workflow, /git cat-file -e/);
  assert.match(workflow, /node "\$BASE_DIR\/scripts\/risk-tier\.mjs"/);
  assert.match(workflow, /Fail closed as high/);
  assert.match(workflow, /END_BOOTSTRAP/);
  assert.doesNotMatch(workflow, /node scripts\/risk-tier\.mjs/);
  assert.doesNotMatch(workflow, /git fetch/);
  const script = labelStepScript(workflow);
  assert.equal(script.includes('${{'), false);
  const syntax = spawnSync('bash', ['-n'], { input: script, encoding: 'utf8' });
  assert.equal(syntax.status, 0, syntax.stderr);
  for (const line of workflow.split('\n')) {
    if (!line.includes('${{')) continue;
    assert.match(line, /^\s+(?:group|GITHUB_TOKEN|BASE_SHA|HEAD_SHA):/);
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
  assert.match(review, /base commit/);
  assert.match(review, /no script yet/);
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

function runBootstrap(body, onRequest) {
  const workflow = fs.readFileSync(path.join(root, '.github/workflows/risk-tier.yml'), 'utf8');
  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const urlPath = decodeURIComponent((req.url ?? '').split('?')[0]);
      const result = onRequest({ method: req.method ?? 'GET', urlPath, raw: Buffer.concat(chunks).toString('utf8') });
      res.writeHead(result.status, { 'content-type': 'application/json' });
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
          },
        }),
      );
      fs.writeFileSync(scriptPath, bootstrapSource(workflow));
      const child = spawn(process.execPath, [scriptPath], {
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
  const deleted = parseNameStatusZ('D\0src/lib/blog.ts\0D\0src/content/blog/my post.mdx\0');
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
  assert.deepEqual(parseNameStatusZ(`D\0${newlinePath}\0`), [newlinePath]);
  assert.equal(tierForPaths([newlinePath], rules), 'low');
});

test('a pull request that edits the check script still computes high', () => {
  const baseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'risk-tier-base-'));
  const missingDir = fs.mkdtempSync(path.join(os.tmpdir(), 'risk-tier-missing-'));
  try {
    fs.mkdirSync(path.join(baseDir, 'scripts'));
    fs.copyFileSync(
      fileURLToPath(new URL('./risk-tier.mjs', import.meta.url)),
      path.join(baseDir, 'scripts/risk-tier.mjs'),
    );
    fs.writeFileSync(path.join(baseDir, 'risk-tiers'), 'low **\nlow scripts/risk-tier.mjs\n');
    const edited = spawnSync(
      process.execPath,
      [path.join(baseDir, 'scripts/risk-tier.mjs'), '--paths', 'scripts/risk-tier.mjs,src/content/blog/hello.mdx'],
      { encoding: 'utf8', timeout: 15000, env: { PATH: process.env.PATH ?? '' } },
    );
    assert.equal(edited.status, 0, edited.stderr);
    assert.match(edited.stdout, /high\tscripts\/risk-tier\.mjs/);
    assert.match(edited.stdout, /Computed risk tier: high/);
    const posts = spawnSync(
      process.execPath,
      [path.join(baseDir, 'scripts/risk-tier.mjs'), '--paths', 'src/content/blog/hello.mdx'],
      { encoding: 'utf8', timeout: 15000, env: { PATH: process.env.PATH ?? '' } },
    );
    assert.equal(posts.status, 0, posts.stderr);
    assert.match(posts.stdout, /Computed risk tier: low/);
    assert.equal(
      tierForBaseCopy(['scripts/risk-tier.mjs', 'src/content/blog/hello.mdx'], baseDir),
      'high',
    );
    assert.equal(tierForBaseCopy(['src/content/blog/hello.mdx'], missingDir), 'high');
  } finally {
    fs.rmSync(baseDir, { recursive: true, force: true });
    fs.rmSync(missingDir, { recursive: true, force: true });
  }
});

test('a 403 on the label write still checks the body', async () => {
  const denied = new Error('GitHub API 403 for POST /repos/o/r/issues/1/labels: {}');
  assert.equal(isLabelWriteDenied(denied), true);
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

test('a missing base script fails closed and still checks the body', async () => {
  const calls = [];
  function okHandler(request) {
    calls.push(`${request.method} ${request.urlPath}`);
    if (request.method === 'GET' && request.urlPath === '/repos/o/r/labels/risk:high') {
      return { status: 404, body: '' };
    }
    if (request.method === 'POST' && request.urlPath === '/repos/o/r/labels') {
      return { status: 201, body: '{"name":"risk:high"}' };
    }
    if (request.method === 'GET' && request.urlPath === '/repos/o/r/issues/6/labels') {
      return { status: 200, body: '[]' };
    }
    if (request.method === 'POST' && request.urlPath === '/repos/o/r/issues/6/labels') {
      return { status: 200, body: '[{"name":"risk:high"}]' };
    }
    return { status: 500, body: 'unexpected' };
  }

  const high = await runBootstrap('- [x] high — config\n', okHandler);
  assert.equal(high.status, 0, high.stderr);
  assert.match(high.stdout, /Fail closed as high/);
  assert.match(high.stdout, /Label: risk:high/);
  assert.match(high.stdout, /PR body check passed \(checked high, computed high\)/);
  assert.ok(calls.includes('POST /repos/o/r/issues/6/labels'));

  calls.length = 0;
  const low = await runBootstrap('- [x] low — posts\n', okHandler);
  assert.equal(low.status, 1);
  assert.match(low.stderr, /checked tier low is lower than computed tier high/);
  assert.ok(calls.includes('POST /repos/o/r/issues/6/labels'));

  const denied = await runBootstrap('- [x] high — config\n', () => ({
    status: 403,
    body: '{"message":"Resource not accessible by integration"}',
  }));
  assert.equal(denied.status, 0, denied.stderr);
  assert.match(denied.stderr, /Risk label write was denied \(403\)\. Continuing with the body check\./);
  assert.match(denied.stdout, /PR body check passed \(checked high, computed high\)/);

  const prefix = await runBootstrap('- [x] low-priority\n', okHandler);
  assert.equal(prefix.status, 1);
  assert.match(prefix.stderr, /no tier is checked/);
});
