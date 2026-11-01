import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'
import { createServer, loadConfigFromFile } from 'vite'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const FPS = 30
const STARTUP_MS = 15_000
const LAYOUTS = [
  { name: '16x9', viewport: { width: 960, height: 540 }, gifWidth: 960 },
  { name: '1x1', viewport: { width: 540, height: 540 }, gifWidth: 720 },
]
const out = process.argv[2] && resolve(process.argv[2])
if (!out) {
  console.error('usage: npm run stageshow:render -- <output dir>')
  process.exit(2)
}

const ffmpeg = (...args) => {
  const r = spawnSync('/usr/bin/ffmpeg', ['-y', '-loglevel', 'error', ...args], { stdio: ['ignore', 'ignore', 'inherit'] })
  if (r.status !== 0) throw new Error(`ffmpeg exited ${r.status}`)
}
const mb = (file) => `${(statSync(file).size / 1e6).toFixed(2)} MB`

async function openPage(browser, viewport, options) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 2, ...options })
  page.on('console', (m) => m.type() === 'error' && console.error(`page console: ${m.text()}`))
  page.on('pageerror', (e) => console.error(`page error: ${e.message}`))
  return page
}

async function recordLoop(browser, url, layout, frames) {
  const page = await openPage(browser, layout.viewport)
  let failure = null
  page.on('pageerror', (e) => (failure ??= e.message))
  page.on('response', (r) => r.status() >= 400 && (failure ??= `HTTP ${r.status()} for ${r.url()}`))
  await page.goto(`${url}?render=${FPS}`)
  // Polled from Node: the virtual clock owns the page's timers and rAF, which waitForFunction relies on.
  const deadline = Date.now() + STARTUP_MS
  while (!(await page.evaluate(() => !!(window.__stageshow?.clock && document.querySelector('.ss-stage'))))) {
    if (failure) throw new Error(`scene failed to start: ${failure}`)
    if (Date.now() > deadline) throw new Error(`scene not mounted within ${STARTUP_MS / 1000}s`)
    await new Promise((r) => setTimeout(r, 100))
  }
  // One loop runs from the script's opening `start` mark to the next one.
  const marks = []
  let previous = null
  for (let frame = 0; marks.length < 2; frame++) {
    if (frame > FPS * 60) throw new Error('no loop within 60s of scene time')
    await page.evaluate(() => window.__stageshow.clock.step())
    const mark = await page.evaluate(() => document.querySelector('.ss-stage').dataset.mark ?? null)
    if (mark === 'start' && previous !== 'start') marks.push(frame)
    previous = mark
    if (marks.length === 1) await page.screenshot({ path: join(frames, `${String(frame).padStart(5, '0')}.png`) })
  }
  await page.close()
  return { start: marks[0], count: marks[1] - marks[0] }
}

const { config } = await loadConfigFromFile({ command: 'serve', mode: 'development' }, join(ROOT, 'stageshow/vite.config.ts'))
const server = await createServer({ ...config, configFile: false, logLevel: 'warn', server: { ...config.server, port: 5273, watch: null } })
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? '/usr/bin/google-chrome' })
const work = mkdtempSync(join(tmpdir(), 'stageshow-frames-'))
try {
  await server.listen()
  const url = server.resolvedUrls.local[0]
  mkdirSync(out, { recursive: true })
  for (const layout of LAYOUTS) {
    const frames = join(work, layout.name)
    mkdirSync(frames)
    const loop = await recordLoop(browser, url, layout, frames)
    const mp4 = join(out, `clip1-${layout.name}.mp4`)
    const gif = join(out, `clip1-${layout.name}.gif`)
    ffmpeg('-framerate', String(FPS), '-start_number', String(loop.start), '-i', join(frames, '%05d.png'), '-frames:v', String(loop.count), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-movflags', '+faststart', mp4)
    ffmpeg('-i', mp4, '-vf', `fps=15,scale=${layout.gifWidth}:-1:flags=lanczos,split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=sierra2_4a`, '-loop', '0', gif)
    console.log(`${layout.name}: ${loop.count} frames (${(loop.count / FPS).toFixed(2)}s) -> ${mp4} ${mb(mp4)}, ${gif} ${mb(gif)}`)
  }
  const poster = join(out, 'clip1-poster.png')
  const page = await openPage(browser, LAYOUTS[0].viewport, { reducedMotion: 'reduce' })
  await page.goto(url)
  await page.waitForSelector('.ss-stage', { timeout: STARTUP_MS })
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(1000)
  await page.screenshot({ path: poster })
  console.log(`poster -> ${poster}`)
} finally {
  await browser.close()
  await server.close()
  rmSync(work, { recursive: true, force: true })
}
