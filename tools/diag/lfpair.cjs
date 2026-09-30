// THE REFERENCE AND THE SITE, SIDE BY SIDE, OFF ONE CLOCK.
//
//   node lfpair.cjs <port> [<served build dir>] [--film]
//
// The comparison page and its copy of the reference are STAGED into the served build rather than kept there:
// they were only ever in the build folder, so every rebuild silently deleted the one thing the whole visual
// review is done against. The sources are tools/diag/compare/lf-compare.html and docs/reference/linefield-v2.html,
// both tracked; they land in the build as lf-compare.html and lf-demo.html and are served same-origin with the
// site, which is what lets one clock drive both.
const pw = require('playwright')
const fs = require('node:fs')
const path = require('node:path')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const [port = '4801', dir = '../../../builds/linefield'] = process.argv.slice(2).filter((a) => !a.startsWith('--'))
const FILM = process.argv.includes('--film')
const OUT = 'out/linefield'

function stage() {
  const root = path.resolve(__dirname, dir)
  if (!fs.existsSync(path.join(root, 'tr', 'index.html'))) throw new Error(`no build at ${root}`)
  fs.copyFileSync(path.join(__dirname, 'compare', 'lf-compare.html'), path.join(root, 'lf-compare.html'))
  fs.copyFileSync(path.join(__dirname, 'compare', 'lf-compare.js'), path.join(root, 'lf-compare.js'))
  fs.copyFileSync(path.resolve(__dirname, '..', '..', 'docs', 'reference', 'linefield-v2.html'), path.join(root, 'lf-demo.html'))
  console.log(`  staged lf-compare.html and lf-demo.html into ${root}`)
}

;(async () => {
  stage()
  const b = await pw.chromium.launch({ channel: 'chrome' })
  for (const [w, h, tag] of [[2880, 900, 'pair-1440x900'], [780, 844, 'pair-390x844']]) {
    const extra = FILM ? { recordVideo: { dir: `${OUT}/video`, size: { width: w, height: h } } } : {}
    const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, ...extra })
    const p = await ctx.newPage()
    await p.goto(`http://127.0.0.1:${port}/lf-compare.html`, { waitUntil: 'load', timeout: 90000 })
    await p.evaluate(() => window.__pair())
    await sleep(1500)
    fs.mkdirSync(`${OUT}/pair`, { recursive: true })
    // the moments the review is about: the flight, the fold-back, the tip, the point, the line, and the reverse
    for (const v of [0, 0.16, 0.28, 0.4, 0.44, 0.46, 0.48, 0.5, 0.52, 0.54, 0.62, 0.76, 1]) {
      await p.evaluate((x) => window.__set(x), v)
      await sleep(300)
      fs.writeFileSync(`${OUT}/pair/${tag}-${Math.round(v * 100)}.png`, await p.screenshot())
    }
    if (FILM) {
      await p.evaluate(() => window.__set(0))
      await sleep(500)
      await p.evaluate(() => window.__sweep(0, 1, 7000))
      await sleep(500)
      await p.evaluate(() => window.__sweep(1, 0, 5000))
      await sleep(500)
      // and the passage itself, slowly, because the fold-back and the point are four per cent of it
      await p.evaluate(() => window.__set(0.4))
      await sleep(400)
      await p.evaluate(() => window.__sweep(0.4, 0.6, 5000))
      await sleep(600)
    }
    const v = p.video()
    await ctx.close()
    if (v) { const to = `${OUT}/video/${tag}-REFERENCE-left-SITE-right.webm`; fs.rmSync(to, { force: true }); await v.saveAs(to) }
    console.log(`  ${tag} done`)
  }
  await b.close()
})()
