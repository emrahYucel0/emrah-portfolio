// What owns a finger on Lab Home, and what owns the scroll. Static conditions first — no guessing.
const pw = require('playwright')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const port = process.argv[2]
const VIEWS = [[320, 568], [375, 667], [390, 844], [430, 932], [736, 330]]
;(async () => {
  const b = await pw.webkit.launch()
  for (const [w, h] of VIEWS) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 3, isMobile: true, hasTouch: true })
    const p = await ctx.newPage()
    await p.goto(`http://127.0.0.1:${port}/tr/lab`, { waitUntil: 'networkidle', timeout: 60000 })
    await sleep(1800)
    const d = await p.evaluate(() => {
      const ta = (sel) => { const e = document.querySelector(sel); return e ? getComputedStyle(e).touchAction : '—' }
      const de = document.documentElement, bd = document.body
      // every element that can scroll, and by how much
      const scrollers = [...document.querySelectorAll('*')].filter((e) => {
        const cs = getComputedStyle(e)
        return /auto|scroll/.test(cs.overflowY) && e.scrollHeight > e.clientHeight + 2
      }).map((e) => `${e.tagName.toLowerCase()}.${(e.className || '').toString().slice(0, 18)} ${e.scrollHeight}/${e.clientHeight}`)
      const rec = document.querySelector('.lab-stage .rec')
      return {
        docScroll: `${de.scrollHeight}/${de.clientHeight}`,
        bodyScroll: `${bd.scrollHeight}/${bd.clientHeight}`,
        overflowsBy: de.scrollHeight - de.clientHeight,
        vv: window.visualViewport ? `${Math.round(visualViewport.width)}x${Math.round(visualViewport.height)}` : '—',
        innerH: innerHeight,
        bodyH: Math.round(bd.getBoundingClientRect().height),
        stageH: Math.round(document.querySelector('.lab-stage')?.getBoundingClientRect().height ?? 0),
        bodyOverflow: getComputedStyle(bd).overflow,
        // touch-action does NOT inherit: each of these is what the browser sees under a finger
        taBody: ta('body'), taShell: ta('.u-shell'), taMain: ta('main'),
        taStage: ta('.lab-stage'), taSheet: ta('.lab-sheet'), taRec: ta('.lab-stage .rec'),
        taOpen: ta('.lab-stage .open-link'), taNote: ta('.lab-stage .note'), taSpine: ta('.lab-stage .spine'),
        nested: scrollers,
        recBox: rec ? (() => { const r = rec.getBoundingClientRect(); return `${Math.round(r.width)}x${Math.round(r.height)}` })() : '—',
      }
    })
    console.log(`\n${w}x${h}`)
    console.log(`   doc ${d.docScroll}  body ${d.bodyScroll}  overflows by ${d.overflowsBy}px  innerH ${d.innerH}  visualViewport ${d.vv}  stage ${d.stageH}px  body overflow ${d.bodyOverflow}`)
    console.log(`   touch-action — body ${d.taBody} | shell ${d.taShell} | main ${d.taMain} | stage ${d.taStage} | sheet ${d.taSheet} | rec ${d.taRec} | open ${d.taOpen} | note ${d.taNote} | spine ${d.taSpine}`)
    console.log(`   nested scrollers: ${d.nested.length ? d.nested.join(' · ') : 'none'}`)
    await ctx.close()
  }
  await b.close()
})().catch((e) => { console.error(String(e).slice(0, 300)); process.exit(1) })
