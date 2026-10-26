import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as risk from './risk-tier.mjs';

const root = path.join(import.meta.dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const rules = risk.parseRiskTiers(read('risk-tiers'));
const section = (text) => `## Risk tier\n${text}\n`;
const t = (paths, tier) => assert.equal(risk.tierForPaths(paths, rules), tier);
const bad = (run, pattern) => assert.throws(run, pattern);
const see = (body) => risk.assess(['README.md'], rules, body);

test('tiers, renames, body, and the workflow', () => {
  t(['src/content/blog/post.mdx'], 'low');
  t(['Package.json'], 'high');
  t(['src/pages/index.astro'], 'medium');
  t(['src/pages/rss.xml.ts'], 'high');
  t(['.GitHub/workflows/x.yml'], 'high');
  t(['src/layouts/Layout.astro'], 'high');
  t(['README.md', 'src/lib/blog.ts'], 'high');
  t(['src/content/blog/my..post.mdx'], 'low');
  t(risk.pathsFromNameStatus(''), 'medium');
  const lowText =
    'low **/AGENTS.md\nlow .github/**\nlow scripts/risk-tier.mjs\n';
  const low = risk.parseRiskTiers(lowText);
  const forced = ['AGENTS.md', 'scripts/risk-tier.mjs'];
  assert.equal(risk.tierForPaths(forced, low), 'high');
  assert.equal(risk.tierForPaths(['.GitHub/workflows/x.yml'], low), 'high');
  const seen = risk.assess(['README.md'], rules, section('- [x] high'));
  assert.deepEqual(seen, { computed: 'low', claimed: 'high' });
  bad(
    () => risk.assess(['package.json'], rules, section('- [x] low')),
    /lower/,
  );
  bad(() => see(section('Risk tier: high')), /parsed/);
  bad(() => see(section('- [x] low\n- [x] high')), /parsed/);
  bad(() => see(section('- [x] low-priority')), /parsed/);
  bad(() => see('## Other\n- [x] high\n'), /parsed/);
  bad(() => risk.tierForPaths(['a/../b'], rules), /Unsafe/);
  bad(() => risk.tierForPaths(['a\\b'], rules), /Unsafe/);
  bad(() => risk.parseRiskTiers(''), /unreadable/);
  bad(() => risk.parseRiskTiers('nope\n'), /risk-tiers:1/);
  bad(() => risk.loadRiskTiers(path.join(root, 'missing-tiers')), /unreadable/);
  bad(() => risk.changedPaths('nope', 'nope'), /SHAs/);
  const renamed = 'R100\told\tnew\nC50\ta\tb\nA\t"c d"\n';
  const names = risk.pathsFromNameStatus(renamed);
  assert.deepEqual(names, ['old', 'new', 'a', 'b', 'c d']);
  const text = `${read('scripts/risk-tier.mjs')}\n${read('.github/workflows/risk-tier.yml')}`;
  assert.match(text, /'diff', '--name-status', '-M'/);
  assert.match(text, /'fetch', '--no-tags', 'origin'/);
  assert.match(text, /base\}\.\.\.\$\{head/);
  assert.match(text, /base\.sha/);
  assert.match(text, /npm ci/);
  assert.match(text, /persist-credentials:\s*false/);
  assert.doesNotMatch(text, /pulls\/|\/labels|secrets\./);
});
