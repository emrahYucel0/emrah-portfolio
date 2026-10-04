// CROSS SECTION — STILLS OF THE PLACE AT EACH POSITION, on the real runtime (C4: the landscape rule, reduced motion).
//
//   node csplaces.cjs <port> [--sizes=844x390@3,390x844@3] [--reduced] [--tag=name] [--engine=chrome|webkit]
//
// Takes the place to each position — SURFACE (0), EDGE behind / beside / in front (1-3), DEPTH (4) — lets it settle,
// and photographs it. With --reduced the browser asks for reduced motion. Development server, flag on.
// Writes tools/diag/out/cross/places/<tag>-<size>-<x>.png and a sheet <tag>-<size>-sheet.png per size.
const pw = require('playwright')
const sharp = require('sharp')
const fs = require('node:fs')
const { watch } = require('./consolewatch.cjs')
const args = process.argv.slice(2)
const port = args.find((a) => /^\d+$/.test(a)) || '4960'
const opt = (k, d) => { const a = args.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d }
const engine = opt('engine', 'chrome')
const REDUCED = args.includes('--reduced')
const TAG = opt('tag', REDUCED ? 'reduced' : 'normal')
const SIZES = opt('sizes', '844x390@3,390x844@3').split(',').map((s) => { const [wh, d] = s.split('@'); const [w, h] = wh.split('x').map(Number); return { w, h, dpr: Number(d || 1) } })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

;(async () => {
  fs.mkdirSync('out/cross/places', { recursive: true })
  const b = engine === 'webkit' ? await pw.webkit.launch() : await pw.chromium.launch({ channel: 'chrome' })
  let bad = 0
  for (const S of SIZES) {
    const tag = `${TAG}-${S.w}x${S.h}@${S.dpr}`
    const ctx = await b.newContext({ viewport: { width: S.w, height: S.h }, deviceScaleFactor: S.dpr, reducedMotion: REDUCED ? 'reduce' : 'no-preference', hasTouch: S.w < 900 })
    const p = await ctx.newPage()
    const W = watch(p, tag)
    await p.goto(`http://127.0.0.1:${port}/tr`, { waitUntil: 'load', timeout: 180000 })
    await p.waitForFunction(() => window.__lab && window.__lab.A.mode === 'index' && window.__lab.csState, null, { timeout: 120000 })
    await sleep(1000)
    const STOP = await p.evaluate(() => window.__lab.STOP)
    await p.evaluate((s) => window.__lab.go(s.cross), STOP); await sleep(3000)
    const files = []
    for (const x of [0, 1, 2, 3, 4]) {
      await p.evaluate((i) => window.__lab.csSet(i), x); await sleep(1500)
      const f = `out/cross/places/${tag}-${x}.png`
      await p.screenshot({ path: f }); files.push(f)
    }
    const info = await p.evaluate(() => { const c = window.__lab.csState(); const L = window.__lab.cs?.layout; return { positions: c.positions, layout: L ? { count: L.count, pitch: +L.pitch.toFixed(2), rows: +L.spacing.toFixed(2) } : null } })
    // a sheet of the five, side by side
    const H = S.w > S.h ? 260 : 420
    const tiles = await Promise.all(files.map((f) => sharp(f).resize({ height: H }).png().toBuffer()))
    const m = await sharp(tiles[0]).metadata()
    await sharp({ create: { width: (m.width + 6) * 5, height: H, channels: 3, background: '#f0f' } }).composite(tiles.map((t, i) => ({ input: t, left: i * (m.width + 6), top: 0 }))).png().toFile(`out/cross/places/${tag}-sheet.png`)
    const v = await W.verdict(p)
    if (v.length) { bad++; console.log(`  ${tag} FAIL console (${v.length}): ${v[0]}`) }
    console.log(`  ${tag}: 5 stills, layout ${JSON.stringify(info.layout)} → out/cross/places/${tag}-sheet.png`)
    await ctx.close()
  }
  await b.close()
  process.exit(bad ? 1 : 0)
})()
