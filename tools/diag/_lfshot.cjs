const pw = require('playwright')
const fs = require('fs')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const OUT = 'out/linefield'
;(async () => {
  fs.mkdirSync(OUT, { recursive: true })
  const b = await pw.chromium.launch({ channel: 'chrome' })
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })
  const p = await ctx.newPage()
  p.on('pageerror', (e) => console.log('  [error]', String(e).slice(0, 300)))
  p.on('console', (m) => { if (m.type() === 'error') console.log('  [console]', m.text().slice(0, 300)) })
  await p.goto('http://127.0.0.1:4800/tr?linefield=1', { waitUntil: 'load', timeout: 90000 })
  await p.waitForFunction(() => !!window.__lf, null, { timeout: 60000 }).catch(() => console.log('  __lf never appeared'))
  await sleep(600)
  console.log('  face:', await p.evaluate(() => window.__lf && window.__lf.faceOk))
  console.log('  spacing:', JSON.stringify(await p.evaluate(() => window.__lf && window.__lf.spacing())))
  for (const v of [0, 0.10, 0.16, 0.22, 0.32, 0.44, 0.5, 0.56, 0.68, 0.80, 0.92, 1]) {
    await p.evaluate((x) => window.__lf.setProgress(x), v)
    await sleep(160)
    fs.writeFileSync(`${OUT}/p-${String(Math.round(v*100)).padStart(3,'0')}.png`, await p.screenshot())
  }
  console.log('  frame ms mean/worst:', await p.evaluate(() => [window.__lf.frameMs().toFixed(2), window.__lf.worstMs().toFixed(2)].join(' / ')))
  await b.close()
})()
