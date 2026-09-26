// THE LAB'S FIRST PAINT — every Lab route, with the route's chunk deliberately held back, so the window a phone
// on a real network sees is reproduced rather than hoped for.
// node labboot.cjs <port>
const pw = require('playwright')
const fs = require('fs')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const port = process.argv[2]
let fails = 0
const ok = (c, l, x = '') => { if (!c) fails++; console.log(`  ${c ? 'ok  ' : 'FAIL'} ${l}${x ? ` — ${x}` : ''}`) }
fs.mkdirSync('out/labboot', { recursive: true })

const VIEWS = [{ w: 390, h: 844 }, { w: 320, h: 568 }, { w: 844, h: 390 }]
const PATHS = ['/tr/lab', '/en/lab', '/tr/lab/weight', '/en/lab/tone', '/tr/lab/line']

;(async () => {
  const b = await pw.webkit.launch()
  for (const v of VIEWS) {
    for (const path of PATHS) {
      for (const kind of ['cold', 'refresh']) {
        const ctx = await b.newContext({ viewport: { width: v.w, height: v.h }, deviceScaleFactor: 2, isMobile: v.w < 700, hasTouch: v.w < 700 })
        const p = await ctx.newPage()
        const hold = async (r) => { await sleep(1400); await r.continue() }
        if (kind === 'refresh') {
          await p.goto(`http://127.0.0.1:${port}${path}`, { waitUntil: 'networkidle', timeout: 60000 })
          await sleep(900)
          await p.route('**/_nuxt/*.js', hold)
          await p.reload({ waitUntil: 'commit' }).catch(() => {})
        } else {
          await p.route('**/_nuxt/*.js', hold)
          await p.goto(`http://127.0.0.1:${port}${path}`, { waitUntil: 'commit', timeout: 60000 }).catch(() => {})
        }
        await sleep(500)

        // the contract is what the first paint needs: the strip on its own row at its own height, the margin,
        // and no text running to the edges. Measured, not eyeballed.
        const m = await p.evaluate(() => {
          const strip = document.querySelector('[data-strip]')
          const cs = strip ? getComputedStyle(strip) : null
          const r = strip ? strip.getBoundingClientRect() : null
          const pad = getComputedStyle(document.documentElement).getPropertyValue('--pad')
          const bodyPad = strip ? parseFloat(getComputedStyle(strip).paddingLeft) : 0
          const nav = strip ? strip.querySelector('nav ul') : null
          const last = nav ? nav.lastElementChild : null
          const lr = last ? last.getBoundingClientRect() : null
          return {
            stripFixed: cs ? cs.position === 'fixed' : false,
            stripH: r ? Math.round(r.height) : 0,
            stripPad: Math.round(bodyPad),
            lastItemInside: lr ? lr.right <= innerWidth + 1 : false,
            overflowX: document.documentElement.scrollWidth > innerWidth + 1,
            labPad: pad.trim(),
          }
        })
        const tag = `${v.w}x${v.h} ${path.padEnd(16)} ${kind}`
        // one row (44 or 50 plus any notch), a real margin, and the language control not pushed off the edge
        ok(m.stripFixed && m.stripH > 30 && m.stripH < 90 && m.stripPad >= 16 && m.lastItemInside && !m.overflowX,
          `${tag}: styled at first paint`, JSON.stringify(m))
        if (kind === 'cold' && v.w === 390 && path === '/tr/lab') fs.writeFileSync('out/labboot/first-paint-390.png', await p.screenshot())
        await ctx.close()
      }
    }
  }
  await b.close()
  console.log(`\nLAB FIRST PAINT: ${fails === 0 ? `PASS — ${VIEWS.length * PATHS.length * 2} states` : `FAIL (${fails})`}`)
  process.exit(fails ? 1 : 0)
})().catch((e) => { console.error(String(e).slice(0, 400)); process.exit(1) })
