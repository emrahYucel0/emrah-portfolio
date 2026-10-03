// CROSS SECTION — the reference and ours side by side, off one clock: stills at the review's moments, and films.
//
//   node cspair.cjs <port> [--view=demo|glow] [--sizes=1440x900,390x844,390x660,375x560] [--film]
//
// Drives tools/diag/compare/cs-compare.html through the dev server (flag on), which serves this page, the reference
// and the debug entry on one origin. Writes to tools/diag/out/cross/pair/<view>/ and, with --film, .webm recordings
// of a forward and a backward sweep to tools/diag/out/cross/film/.
const pw = require('playwright')
const { watch } = require('./consolewatch.cjs')
const fs = require('node:fs')
const path = require('node:path')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const args = process.argv.slice(2)
const port = args.find((a) => /^\d+$/.test(a)) || '4960'
const opt = (k, d) => { const a = args.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d }
const view = opt('view', 'demo')
const FILM = args.includes('--film')
const sizes = opt('sizes', '1440x900,390x844,390x660,375x560').split(',').map((s) => s.split('x').map(Number))
const repo = path.resolve(__dirname, '..', '..').replace(/\\/g, '/')
const PAGE = `http://127.0.0.1:${port}/_nuxt/@fs/${repo}/tools/diag/compare/cs-compare.html`
const AT = [0, 0.2, 0.35, 0.42, 0.44 + 0.08 * 0.12, 0.44 + 0.44 * 0.12, 0.44 + 0.8 * 0.12, 0.56, 0.62, 0.75, 1]

;(async () => {
  const OUT = `out/cross/pair/${view}`
  fs.mkdirSync(OUT, { recursive: true })
  const b = await pw.chromium.launch({ channel: 'chrome' })
  for (const [w, h] of sizes) {
    // the page holds two panes of w x h at scale 1 plus its bar
    const vw = w * 2 + 24, vh = h + 64
    const extra = FILM ? { recordVideo: { dir: 'out/cross/film/tmp', size: { width: Math.min(vw, 1920), height: Math.round(vh * Math.min(1, 1920 / vw)) } } } : {}
    const ctx = await b.newContext({ viewport: { width: vw, height: vh }, deviceScaleFactor: 1, ...extra })
    const p = await ctx.newPage()
    const W = watch(p, `${w}x${h}`)
    await p.goto(`${PAGE}?view=${view}&size=${w}x${h}`, { waitUntil: 'load', timeout: 180000 })
    await p.waitForFunction(() => window.__pair, null, { timeout: 60000 })
    await p.evaluate(() => window.__pair())
    await sleep(1500)
    for (const v of AT) {
      await p.evaluate((x) => window.__set(x), v)
      await sleep(250)
      fs.writeFileSync(`${OUT}/${w}x${h}-${String(Math.round(v * 1000)).padStart(4, '0')}.png`, await p.screenshot())
    }
    if (FILM) {
      await p.evaluate(() => window.__set(0)); await sleep(600)
      await p.evaluate(() => window.__sweep(0, 1, 8000)); await sleep(700)
      await p.evaluate(() => window.__sweep(1, 0, 6000)); await sleep(500)
    }
    const bad = await W.verdict(p)
    if (bad.length) { process.exitCode = 1; console.log(`  FAIL console (${bad.length}): ${bad[0]}`) }
    await ctx.close()
    if (FILM) {
      const vid = await p.video().path()
      fs.mkdirSync('out/cross/film', { recursive: true })
      const dest = `out/cross/film/pair-${view}-${w}x${h}.webm`
      fs.renameSync(vid, dest)
      console.log(`  film ${dest}`)
    }
    console.log(`  ${w}x${h}: ${AT.length} stills`)
  }
  await b.close()
  console.log(`  in tools/diag/${OUT}`)
})()
