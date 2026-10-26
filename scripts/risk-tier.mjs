// Computes a pull request risk tier from changed paths and sets one risk:* label.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const TIERS_FILE = 'risk-tiers';
export const CHECK_SCRIPT = 'scripts/risk-tier.mjs';
export const FILE_LIST_CAP = 3000;

// These stay high even if risk-tiers maps them lower.
export const ALWAYS_HIGH_GLOBS = [
  '**/AGENTS.md',
  '**/CLAUDE.md',
  '**/REVIEW.md',
  '.cursor/**',
  '.claude/**',
  '.github/pull_request_template.md',
  '.github/**',
  TIERS_FILE,
  CHECK_SCRIPT,
];

const RISK_LABELS = ['risk:low', 'risk:medium', 'risk:high'];
const GLOB_SPECIAL = new Set(['\\', '^', '$', '+', '.', '(', ')', '|', '[', ']', '{', '}']);

function scriptRoot() {
  return fileURLToPath(new URL('..', import.meta.url));
}

export function repoRoot() {
  return process.env.RISK_TIER_REPO || scriptRoot();
}

export function riskTiersPath() {
  return path.join(scriptRoot(), TIERS_FILE);
}

export function moduleRelativePath() {
  return path.relative(scriptRoot(), fileURLToPath(import.meta.url)).split(path.sep).join('/');
}

export function globSource(glob) {
  const normalized = glob.replace(/^\.\//, '');
  let source = '';
  let index = 0;
  while (index < normalized.length) {
    const char = normalized[index];
    if (char === '*' && normalized[index + 1] === '*') {
      if (normalized[index + 2] === '/') {
        source += '(?:[^/]+/)*';
        index += 3;
      } else {
        source += '.*';
        index += 2;
      }
      continue;
    }
    if (char === '*') {
      source += '[^/]*';
      index += 1;
      continue;
    }
    if (char === '?') {
      source += '[^/]';
      index += 1;
      continue;
    }
    source += GLOB_SPECIAL.has(char) ? `\\${char}` : char;
    index += 1;
  }
  return source;
}

export function matchGlob(glob, filePath) {
  // The s flag lets ** (compiled to .*) match a newline inside a path.
  // The caller lowercases the path once. The glob is lowercased here so the
  // pattern compares in that same case. The path text is otherwise literal.
  return new RegExp(`^${globSource(glob.toLowerCase())}$`, 's').test(filePath);
}

export function isUnsafeChangedPath(filePath) {
  if (typeof filePath !== 'string') return true;
  if (filePath.includes('\\')) return true;
  return filePath.split('/').some((segment) => segment === '..');
}

export function parseRiskTiers(text) {
  const rules = [];
  const lines = text.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (!line || line.startsWith('#')) continue;
    const match = line.match(/^(low|medium|high)\s+(.+)$/);
    const glob = match?.[2]?.trim() ?? '';
    if (!match || !glob) {
      throw new Error(`risk-tiers:${index + 1}: expected "<tier> <glob>"`);
    }
    rules.push({ tier: match[1], glob });
  }
  return rules;
}

export function loadRiskTiers(filePath = riskTiersPath()) {
  return parseRiskTiers(fs.readFileSync(filePath, 'utf8'));
}

export function rankTier(tier) {
  switch (tier) {
    case 'low':
      return 0;
    case 'medium':
      return 1;
    case 'high':
      return 2;
    default: {
      const unexpected = tier;
      throw new Error(`Unknown tier: ${String(unexpected)}`);
    }
  }
}

export function riskLabel(tier) {
  switch (tier) {
    case 'low':
      return 'risk:low';
    case 'medium':
      return 'risk:medium';
    case 'high':
      return 'risk:high';
    default: {
      const unexpected = tier;
      throw new Error(`Unknown tier: ${String(unexpected)}`);
    }
  }
}

export function tierForPath(filePath, rules, alwaysHigh = ALWAYS_HIGH_GLOBS) {
  if (isUnsafeChangedPath(filePath)) return 'high';
  const lowered = filePath.toLowerCase();
  for (const glob of alwaysHigh) {
    if (matchGlob(glob, lowered)) return 'high';
  }
  let best = null;
  for (const rule of rules) {
    if (!matchGlob(rule.glob, lowered)) continue;
    if (best === null || rankTier(rule.tier) > rankTier(best)) best = rule.tier;
  }
  return best ?? 'medium';
}

export function tierForPaths(filePaths, rules, alwaysHigh = ALWAYS_HIGH_GLOBS) {
  if (filePaths.length === 0) return 'medium';
  let best = 'low';
  for (const filePath of filePaths) {
    const tier = tierForPath(filePath, rules, alwaysHigh);
    if (rankTier(tier) > rankTier(best)) best = tier;
  }
  return best;
}

export function isLabelWriteDenied(error) {
  const message = error instanceof Error ? error.message : String(error);
  return message.startsWith('GitHub API 403');
}

export async function reportTierResult({ tier, body, applyLabels, warn = console.warn }) {
  try {
    const applied = await applyLabels();
    console.log(`Removed stale labels: ${applied.plan.remove.join(', ') || '(none)'}`);
    console.log(`Added label: ${applied.plan.add.join(', ') || '(none)'}`);
    console.log(`Risk labels now: ${riskLabelsOn(applied.labels).join(', ')}`);
  } catch (error) {
    if (!isLabelWriteDenied(error)) throw error;
    warn('Risk label write was denied (403). Continuing with the body check.');
  }
  const assessment = assessBody(body, tier);
  if (!assessment.ok) {
    console.error(`Risk tier check failed: ${assessment.reason}`);
    return assessment;
  }
  console.log(`PR body check passed (checked ${assessment.claimed}, computed ${tier}).`);
  return assessment;
}

export function checkedTiers(body) {
  if (!body) return [];
  const tiers = [];
  const re = /^[ \t]*(?:[-*]|\d+[.)])[ \t]+\[([ xX])\][ \t]+(low|medium|high)(?![\w-])/gim;
  for (const match of body.matchAll(re)) {
    if (match[1].toLowerCase() === 'x') tiers.push(match[2].toLowerCase());
  }
  return tiers;
}

export function assessBody(body, computed) {
  const checked = checkedTiers(body);
  if (checked.length === 0) {
    return { ok: false, claimed: null, reason: 'no tier is checked in the PR body' };
  }
  const claimed = checked.reduce((best, tier) => (rankTier(tier) > rankTier(best) ? tier : best));
  if (rankTier(claimed) < rankTier(computed)) {
    return {
      ok: false,
      claimed,
      reason: `checked tier ${claimed} is lower than computed tier ${computed}`,
    };
  }
  return { ok: true, claimed, reason: '' };
}

export function planLabelUpdates(currentLabels, tier) {
  const desired = riskLabel(tier);
  const remove = currentLabels.filter((label) => RISK_LABELS.includes(label) && label !== desired);
  const add = currentLabels.includes(desired) ? [] : [desired];
  return { desired, remove, add };
}

export function applyLabelPlan(currentLabels, plan) {
  const next = currentLabels.filter((label) => !plan.remove.includes(label));
  for (const label of plan.add) {
    if (!next.includes(label)) next.push(label);
  }
  return next;
}

export function riskLabelsOn(labels) {
  return labels.filter((label) => RISK_LABELS.includes(label));
}

export function assertSingleRiskLabel(labels, tier) {
  const desired = riskLabel(tier);
  const found = riskLabelsOn(labels);
  if (found.length !== 1 || found[0] !== desired) {
    throw new Error(`Expected exactly one label ${desired}, found ${found.join(', ') || 'none'}`);
  }
}

function riskTierName(label) {
  switch (label) {
    case 'risk:low':
      return 'low';
    case 'risk:medium':
      return 'medium';
    case 'risk:high':
      return 'high';
    default: {
      const unexpected = label;
      throw new Error(`Unknown risk label: ${String(unexpected)}`);
    }
  }
}

function mergeBlockReason(labels, tier) {
  const found = riskLabelsOn(labels);
  if (found.length > 1) return 'conflict';
  if (found.length === 1 && rankTier(riskTierName(found[0])) < rankTier(tier)) return 'lower';
  return '';
}

async function bestEffortRemove(labels, removeLabel) {
  for (const label of labels) {
    try {
      await removeLabel(label);
    } catch (error) {
      if (!isLabelWriteDenied(error)) throw error;
    }
  }
}

async function rereadRiskLabels(listLabels) {
  try {
    return riskLabelsOn(await listLabels());
  } catch (error) {
    if (!isLabelWriteDenied(error)) throw error;
    throw new Error('Risk label update was denied (403) and the labels could not be re-read. Fail closed.');
  }
}

export async function applyRiskLabel({ tier, listLabels, addLabels, removeLabel }) {
  const current = await listLabels();
  const plan = planLabelUpdates(current, tier);
  let changed = false;
  try {
    if (plan.add.length > 0) {
      await addLabels(plan.add);
      changed = true;
    }
    for (const label of plan.remove) {
      await removeLabel(label);
      changed = true;
    }
  } catch (error) {
    if (!isLabelWriteDenied(error)) throw error;
    const desired = riskLabel(tier);
    let left = await rereadRiskLabels(listLabels);
    if (changed || mergeBlockReason(left, tier)) {
      await bestEffortRemove(
        left.filter((label) => label !== desired),
        removeLabel,
      );
      left = await rereadRiskLabels(listLabels);
      if (left.length > 1) {
        await bestEffortRemove(
          left.filter((label) => label !== desired),
          removeLabel,
        );
        left = await rereadRiskLabels(listLabels);
      }
    }
    const blocked = mergeBlockReason(left, tier);
    if (blocked === 'conflict') {
      throw new Error(
        `Risk label update was denied (403) and left conflicting labels: ${left.join(', ')}. Fail closed.`,
      );
    }
    if (blocked === 'lower') {
      throw new Error(
        `Risk label update was denied (403) and left ${left.join(', ')}, lower than computed tier ${tier}. Fail closed.`,
      );
    }
    if (left.length === 1 && left[0] === desired) return { plan, labels: left };
    throw error;
  }
  const labels = await listLabels();
  assertSingleRiskLabel(labels, tier);
  return { plan, labels };
}

export function assessFileList(entryCount, changedFiles, capped = false) {
  const countKnown = Number.isInteger(changedFiles) && changedFiles >= 0;
  const short = !countKnown || entryCount < changedFiles;
  const capHit = capped || entryCount >= FILE_LIST_CAP;
  if (!short && !capHit) return { complete: true, reason: '' };
  const reasons = [];
  if (short) {
    const shown = countKnown ? String(changedFiles) : 'missing';
    reasons.push(
      `Pull file list returned ${entryCount} files, fewer than pull_request.changed_files (${shown}). The files API stops at 3000. Fail closed as high.`,
    );
  }
  if (capHit) {
    reasons.push(
      `Pull file list hit the 3000-file page cap (${entryCount} files). Fail closed as high.`,
    );
  }
  return { complete: false, reason: reasons.join(' ') };
}

export function filesFromPullEntries(entries) {
  if (!Array.isArray(entries)) throw new Error('GitHub pull file list was not an array');
  const files = [];
  for (const entry of entries) {
    if (!entry || typeof entry !== 'object') continue;
    if (typeof entry.filename === 'string' && entry.filename) files.push(entry.filename);
    if (typeof entry.previous_filename === 'string' && entry.previous_filename) {
      files.push(entry.previous_filename);
    }
  }
  return [...new Set(files)].sort();
}

function assertSha(value, label) {
  if (typeof value !== 'string' || !/^[0-9a-f]{40}$/i.test(value)) {
    throw new Error(`Unexpected ${label}`);
  }
  return value;
}

export function pullRequestFromEvent(event) {
  const pullRequest = event?.pull_request;
  if (!pullRequest || typeof pullRequest !== 'object') {
    throw new Error('GitHub event has no pull_request payload');
  }
  const number = pullRequest.number;
  if (!Number.isInteger(number) || number <= 0) {
    throw new Error('GitHub event has no pull request number');
  }
  const changedFiles = pullRequest.changed_files;
  return {
    number,
    body: typeof pullRequest.body === 'string' ? pullRequest.body : '',
    baseSha: assertSha(pullRequest.base?.sha, 'base SHA'),
    headSha: assertSha(pullRequest.head?.sha, 'head SHA'),
    changedFiles: Number.isInteger(changedFiles) ? changedFiles : null,
  };
}

function nextLink(header) {
  if (!header) return null;
  for (const part of header.split(',')) {
    const match = part.match(/<([^>]+)>;\s*rel="next"/);
    if (match) return match[1];
  }
  return null;
}

const LABEL_META = {
  'risk:low': { color: '0e8a16', description: 'Computed risk tier is low' },
  'risk:medium': { color: 'fbca04', description: 'Computed risk tier is medium' },
  'risk:high': { color: 'b60205', description: 'Computed risk tier is high' },
};

function createGitHub(env) {
  const token = env.GITHUB_TOKEN;
  if (!token) throw new Error('GITHUB_TOKEN is not set');
  const repository = env.GITHUB_REPOSITORY;
  if (!repository || !/^[\w.-]+\/[\w.-]+$/.test(repository)) {
    throw new Error('GITHUB_REPOSITORY is missing');
  }
  const api = (env.GITHUB_API_URL ?? 'https://api.github.com').replace(/\/$/, '');

  async function request(url, options = {}) {
    const method = options.method ?? 'GET';
    const response = await fetch(url.startsWith('http') ? url : `${api}${url}`, {
      method,
      body: options.body,
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'User-Agent': 'risk-tier-check',
        'X-GitHub-Api-Version': '2022-11-28',
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      },
    });
    const text = response.status === 204 ? '' : await response.text();
    let data = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
    }
    const allowed = new Set(options.allow ?? []);
    if (!response.ok && !allowed.has(response.status)) {
      const detail = typeof data === 'string' ? data : JSON.stringify(data ?? '');
      throw new Error(`GitHub API ${response.status} for ${method} ${url}: ${detail.slice(0, 300)}`);
    }
    return { status: response.status, data, next: nextLink(response.headers.get('link')) };
  }

  async function ensureLabel(name) {
    const meta = LABEL_META[name];
    if (!meta) throw new Error(`Unknown risk label: ${name}`);
    const existing = await request(`/repos/${repository}/labels/${encodeURIComponent(name)}`, {
      allow: [404],
    });
    if (existing.status === 200) return;
    await request(`/repos/${repository}/labels`, {
      method: 'POST',
      body: JSON.stringify({ name, color: meta.color, description: meta.description }),
      allow: [422],
    });
  }

  return {
    async listLabels(number) {
      const names = [];
      let url = `/repos/${repository}/issues/${number}/labels?per_page=100`;
      while (url) {
        const page = await request(url);
        if (!Array.isArray(page.data)) throw new Error('GitHub label list was not an array');
        for (const label of page.data) names.push(label.name);
        url = page.next;
      }
      return names;
    },
    async addLabels(number, labels) {
      for (const label of labels) await ensureLabel(label);
      await request(`/repos/${repository}/issues/${number}/labels`, {
        method: 'POST',
        body: JSON.stringify({ labels }),
      });
    },
    async removeLabel(number, label) {
      await request(`/repos/${repository}/issues/${number}/labels/${encodeURIComponent(label)}`, {
        method: 'DELETE',
        allow: [404],
      });
    },
    async listPullFiles(number) {
      const entries = [];
      let url = `/repos/${repository}/pulls/${number}/files?per_page=100`;
      let capped = false;
      let pages = 0;
      while (url) {
        const page = await request(url);
        if (!Array.isArray(page.data)) throw new Error('GitHub pull file list was not an array');
        pages += 1;
        entries.push(...page.data);
        if (entries.length >= FILE_LIST_CAP || (pages >= FILE_LIST_CAP / 100 && page.next)) {
          capped = true;
          break;
        }
        url = page.next;
      }
      return { files: filesFromPullEntries(entries), entryCount: entries.length, capped };
    },
  };
}

export function printTierReport(files, rules) {
  const ranked = [...files].sort();
  for (const file of ranked) {
    console.log(`${tierForPath(file, rules)}\t${file}`);
  }
  const tier = tierForPaths(ranked, rules);
  console.log(`Computed risk tier: ${tier}`);
  console.log(`Label: ${riskLabel(tier)}`);
  return tier;
}

function parseArgs(argv) {
  const args = { paths: null, body: null };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--paths' || arg === '--body') {
      const value = argv[index + 1];
      if (value === undefined || value.startsWith('--')) {
        throw new Error(`${arg} needs a value`);
      }
      if (arg === '--paths') args.paths = value;
      else args.body = value;
      index += 1;
      continue;
    }
    if (arg === '--help') {
      args.help = true;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }
  if (args.body !== null && args.paths === null) {
    throw new Error('--body requires --paths');
  }
  return args;
}

async function runLocal(args, rules) {
  const files = args.paths
    .split(',')
    .map((file) => file.trim())
    .filter(Boolean);
  const tier = printTierReport(files, rules);
  if (args.body === null) return;
  const assessment = assessBody(args.body, tier);
  if (!assessment.ok) {
    console.error(`Risk tier check failed: ${assessment.reason}`);
    process.exitCode = 1;
    return;
  }
  console.log(`PR body check passed (checked ${assessment.claimed}, computed ${tier}).`);
}

function failClosedReasons(listed, changedFiles, tiersError) {
  const reasons = [];
  if (tiersError) {
    const message = tiersError instanceof Error ? tiersError.message : String(tiersError);
    reasons.push(`Base risk-tiers is invalid (${message.split('\n')[0]}). Fail closed as high.`);
  }
  const completeness = assessFileList(listed.entryCount, changedFiles, listed.capped);
  if (!completeness.complete) reasons.push(completeness.reason);
  const unsafe = listed.files.filter(isUnsafeChangedPath);
  if (unsafe.length > 0) {
    reasons.push(
      `Changed path contains '\\' or a '..' segment (${unsafe[0]}). Paths are matched literally and are not normalized. Fail closed as high.`,
    );
  }
  return reasons;
}

async function runPullRequest(rules, env, tiersError = null) {
  if (!env.GITHUB_EVENT_PATH) throw new Error('GITHUB_EVENT_PATH is not set');
  const event = JSON.parse(fs.readFileSync(env.GITHUB_EVENT_PATH, 'utf8'));
  const pullRequest = pullRequestFromEvent(event);
  const github = createGitHub(env);
  let listed = { files: [], entryCount: 0, capped: false };
  try {
    listed = await github.listPullFiles(pullRequest.number);
  } catch (error) {
    if (!tiersError) throw error;
    const message = error instanceof Error ? error.message : String(error);
    console.log(`Could not list changed files. The tier is still high. ${message.split('\n')[0]}`);
  }
  const reasons = failClosedReasons(listed, pullRequest.changedFiles, tiersError);
  let tier;
  if (reasons.length > 0) {
    for (const reason of reasons) console.log(reason);
    for (const file of listed.files) console.log(`high\t${file}`);
    console.log('Computed risk tier: high');
    console.log(`Label: ${riskLabel('high')}`);
    tier = 'high';
  } else {
    tier = printTierReport(listed.files, rules);
  }
  const assessment = await reportTierResult({
    tier,
    body: pullRequest.body,
    applyLabels: () =>
      applyRiskLabel({
        tier,
        listLabels: () => github.listLabels(pullRequest.number),
        addLabels: (labels) => github.addLabels(pullRequest.number, labels),
        removeLabel: (label) => github.removeLabel(pullRequest.number, label),
      }),
  });
  if (!assessment.ok) process.exitCode = 1;
}

export async function main(argv = process.argv.slice(2), env = process.env) {
  const args = parseArgs(argv);
  if (args.help) {
    console.log('Usage: node scripts/risk-tier.mjs --paths <a,b> [--body <text>]');
    return;
  }
  let rules;
  try {
    rules = loadRiskTiers();
  } catch (error) {
    if (args.paths !== null) throw error;
    await runPullRequest(null, env, error);
    return;
  }
  if (args.paths !== null) {
    await runLocal(args, rules);
    return;
  }
  await runPullRequest(rules, env);
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : '';
if (import.meta.url === invokedPath) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
