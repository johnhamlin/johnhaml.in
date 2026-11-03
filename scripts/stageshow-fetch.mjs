import { spawnSync } from 'node:child_process'
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const SHA = '802057409787133703c56001080169e347305572'
const DEST = join(dirname(fileURLToPath(import.meta.url)), '..', '.stageshow')
const MARKER = join(DEST, '.sha')

if (existsSync(MARKER) && readFileSync(MARKER, 'utf8').trim() === SHA) {
  console.log(`stageshow ${SHA.slice(0, 7)} already at ${DEST}`)
  process.exit(0)
}

const res = await fetch(`https://codeload.github.com/benjitaylor/skills/tar.gz/${SHA}`)
if (!res.ok) throw new Error(`download failed: ${res.status} ${res.statusText}`)

const work = mkdtempSync(join(tmpdir(), 'stageshow-'))
try {
  const member = `skills-${SHA}/stageshow`
  const input = Buffer.from(await res.arrayBuffer())
  const tar = spawnSync('tar', ['-xz', '-C', work, '--no-same-owner', '--no-same-permissions', member], { input, stdio: ['pipe', 'inherit', 'inherit'] })
  if (tar.status !== 0) throw new Error(`tar exited ${tar.status}`)
  rmSync(DEST, { recursive: true, force: true })
  cpSync(join(work, member), DEST, { recursive: true })
  // Written last, so an interrupted copy is fetched again instead of trusted.
  writeFileSync(MARKER, `${SHA}\n`)
  console.log(`stageshow ${SHA.slice(0, 7)} fetched to ${DEST}`)
} finally {
  rmSync(work, { recursive: true, force: true })
}
