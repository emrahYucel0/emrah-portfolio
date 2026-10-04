// CROSS SECTION — STILLS OF THE SEAM TO THE BENCH (C3), with the real bench mounted underneath.
//
//   node csbenchshot.cjs <port> [--sizes=1440x900@2,1920x991@1,390x844@3] [--engine=chrome|webkit] [--q=... --tag=...] [--rs=0,0.2,...]
//
// Takes the place to DEPTH, opens the blinds onto the bench with the reveal's clock held (__lab.csRevealFreeze) at
// each r, photographs it, lets it finish; then closes them again from the bench the same way. Development only.
// Writes tools/diag/out/cross/bench/<size>-<open|close>-<r>.png
const pw = require('playwright')
const fs = require('node:fs')
const { watch } = require('./consolewatch.cjs')
const args = process.argv.slice(2)
const port = args.find((a) => /^\d+$/.test(a)) || '4960'
const opt = (k, d) => { const a = args.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d }
const engine = opt('engine', 'chrome')
// --q=csrevealrows=5 etc.: a variant, named by --tag in the file names
const Q = opt('q', ''), TAG = opt('tag', '')
const SIZES = opt('sizes', '1440x900@2,1920x991@1,390x844@3').split(',').map((s) => { const [wh, d] = s.split('@'); const [w, h] = wh.split('x').map(Number); return { w, h, dpr: Number(d || 1) } })
const RS = (opt('rs', '') ? opt('rs', '').split(',').map(Number) : [0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9, 1])
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

;(async () => {
  fs.mkdirSync('out/cross/bench', { recursive: true })
  const b = engine === 'webkit' ? await pw.webkit.launch() : await pw.chromium.launch({ channel: 'chrome' })
  let bad = 0
  for (const S of SIZES) {
    const tag = `${engine === 'webkit' ? 'wk-' : ''}${TAG ? TAG + '-' : ''}${S.w}x${S.h}@${S.dpr}`
    const ctx = await b.newContext({ viewport: { width: S.w, height: S.h }, deviceScaleFactor: S.dpr })
    const p = await ctx.newPage()
    const W = watch(p, tag)
    await p.goto(`http://127.0.0.1:${port}/tr${Q ? '?' + Q : ''}`, { waitUntil: 'load', timeout: 180000 })
    await p.waitForFunction(() => window.__lab && window.__lab.A.mode === 'index' && window.__lab.csState, null, { timeout: 120000 })
    await sleep(800)
    const STOP = await p.evaluate(() => window.__lab.STOP)
    await p.evaluate((s) => window.__lab.go(s.cross), STOP); await sleep(2800)
    await p.evaluate(() => window.__lab.csSet(4)); await sleep(1200)
    // open, held at each r
    await p.evaluate(() => window.__lab.csRevealFreeze(0))
    await p.keyboard.press('ArrowDown')
    await p.waitForFunction(() => document.querySelector('#__nuxt .lab-stage') && window.__lab.csState().reveal.wait === false, null, { timeout: 15000 })
    await sleep(600)
    for (const r of RS) { await p.evaluate((x) => window.__lab.csRevealFreeze(x), r); await sleep(250); await p.screenshot({ path: `out/cross/bench/${tag}-open-${String(Math.round(r * 100)).padStart(3, '0')}.png` }) }
    await p.evaluate(() => window.__lab.csRevealFreeze(null))
    await p.waitForFunction(() => !document.documentElement.dataset.c2, null, { timeout: 10000 })
    await sleep(1500)
    await p.screenshot({ path: `out/cross/bench/${tag}-bench.png` })
    // close, from the bench, held at each r
    await p.evaluate(() => window.__lab.csRevealFreeze(1))
    await p.evaluate(() => window.dispatchEvent(new WheelEvent('wheel', { deltaY: -100, cancelable: true })))
    await p.waitForFunction(() => document.documentElement.dataset.c2 === 'cs', null, { timeout: 15000 })
    await sleep(400)
    for (const r of [...RS].reverse()) { await p.evaluate((x) => window.__lab.csRevealFreeze(x), r); await sleep(250); await p.screenshot({ path: `out/cross/bench/${tag}-close-${String(Math.round(r * 100)).padStart(3, '0')}.png` }) }
    await p.evaluate(() => window.__lab.csRevealFreeze(null))
    await p.waitForFunction(() => document.documentElement.dataset.c2 === 'on', null, { timeout: 15000 })
    await sleep(800)
    await p.screenshot({ path: `out/cross/bench/${tag}-depth.png` })
    const v = await W.verdict(p)
    if (v.length) { bad++; console.log(`  ${tag} FAIL console (${v.length}): ${v[0]}`) }
    console.log(`  ${tag}: ${RS.length * 2 + 2} stills`)
    await ctx.close()
  }
  await b.close()
  console.log(bad ? '  FAIL' : '  written tools/diag/out/cross/bench/')
  process.exit(bad ? 1 : 0)
})()
