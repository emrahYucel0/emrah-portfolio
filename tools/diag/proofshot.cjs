const pw = require('playwright')
const fs = require('fs')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const [port, loc = 'tr', w = '1366', h = '768'] = process.argv.slice(2)
fs.mkdirSync('out/proof', { recursive: true })
;(async () => {
  const b = await pw.webkit.launch()
  const p = await (await b.newContext({ viewport: { width: +w, height: +h }, deviceScaleFactor: 2, isMobile: +w < 700, hasTouch: +w < 700 })).newPage()
  await p.goto(`http://127.0.0.1:${port}/${loc}/lab/proof`, { waitUntil: 'networkidle', timeout: 60000 })
  await sleep(2200)
  for (const [i, f] of [0.02, 0.35, 0.6, 0.9].entries()) {
    await p.evaluate((v) => { const t = document.querySelector('.proof-track'); scrollTo(0, t.offsetTop + (t.offsetHeight - innerHeight) * v) }, f)
    await sleep(700)
    fs.writeFileSync(`out/proof/${loc}-${w}-0${i + 1}.png`, await p.screenshot())
  }
  console.log('shots ok')
  await b.close()
})()
