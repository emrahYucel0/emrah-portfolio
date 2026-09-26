// BEFORE / AFTER on the phone, for each item that changed.
const pw = require('playwright')
const fs = require('fs')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const [port, tag] = process.argv.slice(2)
fs.mkdirSync(`out/pair/${tag}`, { recursive: true })
;(async () => {
  const b = await pw.webkit.launch()

  // item 1 — first paint with the route's chunk held back
  for (const [w, h] of [[390, 844], [844, 390]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: w < 700, hasTouch: w < 700 })
    const p = await ctx.newPage()
    await p.route('**/_nuxt/*.js', async (r) => { await sleep(1600); await r.continue() })
    await p.goto(`http://127.0.0.1:${port}/tr/lab`, { waitUntil: 'commit', timeout: 60000 }).catch(() => {})
    await sleep(520)
    fs.writeFileSync(`out/pair/${tag}/01-first-paint-${w}x${h}.png`, await p.screenshot())
    await ctx.close()
  }

  // item 2 — the bench, crowded labels
  for (const [w, h] of [[320, 568], [390, 844]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
    const p = await ctx.newPage()
    await p.goto(`http://127.0.0.1:${port}/tr/lab`, { waitUntil: 'networkidle', timeout: 60000 })
    await sleep(2600)
    fs.writeFileSync(`out/pair/${tag}/02-bench-${w}x${h}.png`, await p.screenshot())
    await ctx.close()
  }

  // items 3 and 6 — entering Evden Eve, and the work field's hint
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
  const p = await ctx.newPage()
  await p.goto(`http://127.0.0.1:${port}/tr`, { waitUntil: 'networkidle', timeout: 60000 })
  await p.waitForFunction(() => window.__lab?.A.mode === 'index', null, { timeout: 40000 }).catch(() => {})
  await sleep(3000)
  await p.evaluate(() => document.querySelector('#ui [data-go="work"]').click()); await sleep(4200)
  fs.writeFileSync(`out/pair/${tag}/06-work-hint.png`, await p.screenshot({ clip: { x: 0, y: 844 - 70, width: 390, height: 70 } }))
  await p.evaluate(() => document.querySelector('#ui [data-work="2"]').click())
  await p.waitForFunction(() => window.__lab.A.wLocked === 2, null, { timeout: 20000 }).catch(() => {})
  await sleep(900)
  await p.evaluate(() => document.querySelector('#ui [data-work="2"]').click())
  await sleep(1150)
  fs.writeFileSync(`out/pair/${tag}/03-evden-entering.png`, await p.screenshot())
  await p.waitForFunction(() => window.__lab.A.mode === 'world' && !window.__lab.A.busy, null, { timeout: 25000 }).catch(() => {})
  await sleep(2600)
  fs.writeFileSync(`out/pair/${tag}/03-evden-settled.png`, await p.screenshot())
  await ctx.close()
  await b.close()
  console.log(`${tag}: captured`)
})()
