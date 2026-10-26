import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { minimatch } from 'minimatch';

const ALWAYS_HIGH =
  '**/AGENTS.md **/CLAUDE.md **/REVIEW.md .cursor/** .claude/** .github/** risk-tiers scripts/risk-tier.mjs'.split(
    ' ',
  );
const RANK = { low: 0, medium: 1, high: 2 };
const GLOB = { dot: true, nocase: true };
const SHA = /^[0-9a-f]{40}$/i;
const BOX =
  /^[ \t]*(?:[-*]|\d+[.)])[ \t]+\[([ xX])\][ \t]+(low|medium|high)(?![\w-])/gim;
const BAD_TIERS = 'risk-tiers is missing or unreadable';
const BAD_BODY = 'PR body tier is missing or cannot be parsed';
const BAD_DIFF = 'git diff output is unreadable';
const BAD_SHA = 'pull request SHAs are missing';
const fail = (message) => {
  throw new Error(message);
};
function isUnsafe(filePath) {
  if (typeof filePath !== 'string' || filePath.includes('\\')) return true;
  return filePath.split('/').includes('..');
}
const above = (tier, other) => tier === null || RANK[other] > RANK[tier];
export function parseRiskTiers(text) {
  if (typeof text !== 'string' || !text.trim()) fail(BAD_TIERS);
  const rules = [];
  text.split(/\r?\n/).forEach((raw, index) => {
    const line = raw.trim();
    if (!line || line.startsWith('#')) return;
    const match = line.match(/^(low|medium|high)\s+(.+)$/);
    if (!match?.[2]?.trim())
      fail(`risk-tiers:${index + 1}: expected "<tier> <glob>"`);
    rules.push({ tier: match[1], glob: match[2].trim() });
  });
  if (rules.length === 0) fail(BAD_TIERS);
  return rules;
}
export function loadRiskTiers(filePath) {
  try {
    return parseRiskTiers(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message.startsWith('risk-tiers:')) throw error;
    fail(BAD_TIERS);
  }
}
export function claimedTier(body) {
  if (typeof body !== 'string') fail(BAD_BODY);
  const start = body.search(/^## Risk tier[ \t]*$/m);
  if (start < 0) fail(BAD_BODY);
  const lineEnd = body.indexOf('\n', start);
  const after = lineEnd < 0 ? '' : body.slice(lineEnd + 1);
  const next = after.search(/^## /m);
  const section = next < 0 ? after : after.slice(0, next);
  const found = [];
  for (const match of section.matchAll(BOX)) {
    if (match[1].toLowerCase() === 'x') found.push(match[2].toLowerCase());
  }
  if (found.length !== 1) fail(BAD_BODY);
  return found[0];
}
function pathField(value) {
  if (!value) fail(BAD_DIFF);
  if (!value.startsWith('"')) return value;
  const parsed = JSON.parse(value);
  if (typeof parsed !== 'string' || !parsed) fail(BAD_DIFF);
  return parsed;
}
export function pathsFromNameStatus(text) {
  if (typeof text !== 'string') fail(BAD_DIFF);
  const paths = [];
  for (const raw of text.split(/\r?\n/)) {
    if (!raw) continue;
    const [status, left, right] = raw.split('\t');
    paths.push(pathField(left));
    if (/^[RC]/.test(status ?? '')) paths.push(pathField(right));
  }
  return paths;
}
export function tierForPaths(filePaths, rules) {
  if (!Array.isArray(filePaths) || !Array.isArray(rules))
    fail('changed paths are unreadable');
  let best = null;
  for (const filePath of filePaths) {
    if (isUnsafe(filePath)) fail(`Unsafe path: ${filePath}`);
    const forced = ALWAYS_HIGH.some((glob) => minimatch(filePath, glob, GLOB));
    let tier = forced ? 'high' : null;
    if (tier !== 'high') {
      for (const rule of rules) {
        const hit = minimatch(filePath, rule.glob, GLOB);
        if (hit && above(tier, rule.tier)) tier = rule.tier;
      }
    }
    tier ??= 'medium';
    if (best === null || RANK[tier] > RANK[best]) best = tier;
  }
  return best ?? 'medium';
}
export function assess(filePaths, rules, body) {
  const computed = tierForPaths(filePaths, rules);
  const claimed = claimedTier(body);
  if (RANK[claimed] < RANK[computed]) {
    fail(`PR body tier ${claimed} is lower than computed tier ${computed}`);
  }
  return { computed, claimed };
}
function git(args) {
  try {
    const options = { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] };
    return execFileSync('git', args, options);
  } catch {
    fail('git diff failed');
  }
}
export function changedPaths(base, head) {
  if (!SHA.test(base ?? '') || !SHA.test(head ?? '')) fail(BAD_SHA);
  git(['fetch', '--no-tags', 'origin', base, head]);
  const diff = git(['diff', '--name-status', '-M', `${base}...${head}`]);
  return pathsFromNameStatus(diff);
}
export function main() {
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (!eventPath) fail('GITHUB_EVENT_PATH is not set');
  const pull = JSON.parse(fs.readFileSync(eventPath, 'utf8')).pull_request;
  const tiersPath = path.join(import.meta.dirname, '..', 'risk-tiers');
  const paths = changedPaths(pull?.base?.sha, pull?.head?.sha);
  const claimedBody = typeof pull?.body === 'string' ? pull.body : '';
  const result = assess(paths, loadRiskTiers(tiersPath), claimedBody);
  console.log(`Computed risk tier: ${result.computed}`);
  console.log(`PR body tier: ${result.claimed}`);
}
const scriptPath = process.argv[1];
const entry = scriptPath && pathToFileURL(path.resolve(scriptPath)).href;
if (import.meta.url === entry) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
