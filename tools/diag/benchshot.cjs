const pw = require('playwright')
const fs = require('fs')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const [port, tag = 'now'] = process.argv.slice(2)
fs.mkdirSync(`out/bench-${tag}`, { recursive: true })
const V = [[390, 844], [320, 568], [844, 390]]
;(async () => {
  const b = await pw.webkit.launch()
  for (const [w, h] of V) for (const loc of ['tr', 'en']) {
    const p = await (await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: w < 700, hasTouch: w < 700 })).newPage()
    await p.goto(`http://127.0.0.1:${port}/${loc}/lab`, { waitUntil: 'networkidle', timeout: 60000 })
    await sleep(2600)
    fs.writeFileSync(`out/bench-${tag}/${loc}-${w}x${h}.png`, await p.screenshot())
    // every text box on the bench, so overlaps can be measured rather than eyeballed
    const boxes = await p.evaluate(() => {
      const out = []
      for (const el of document.querySelectorAll('.lab-stage .rec, .lab-stage .rec .no, .lab-stage .rec .nm, .lab-stage .rec .pr, .lab-stage .open-link, .lab-stage .note, .lab-stage .mark, .lab-stage .term')) {
        const r = el.getBoundingClientRect()
        if (r.width < 1 || r.height < 1) continue
        out.push({ k: el.className.split(' ')[0], t: (el.textContent || '').trim().slice(0, 18), x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) })
      }
      return out
    })
    const hit = (a, z) => a.x < z.x + z.w && z.x < a.x + a.w && a.y < z.y + z.h && z.y < a.y + a.h
    const leaf = boxes.filter((b) => b.k !== 'rec')
    const bad = []
    for (let i = 0; i < leaf.length; i++) for (let j = i + 1; j < leaf.length; j++) if (hit(leaf[i], leaf[j])) bad.push(`${leaf[i].k}"${leaf[i].t}" × ${leaf[j].k}"${leaf[j].t}"`)
    console.log(`${loc} ${w}x${h} overlaps ${bad.length}${bad.length ? ' — ' + bad.slice(0, 4).join(' | ') : ''}`)
    await p.close()
  }
  await b.close()
})()
