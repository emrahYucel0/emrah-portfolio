// FIRST PAINT ON THE PROOF ROUTE — a cold load and a refresh, with the route's own chunk held back so the window
// the iPhone showed is reproduced on purpose rather than hoped for.
// node proofboot.cjs <port> [locale]
const pw = require('playwright')
const fs = require('fs')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const [port, loc = 'tr'] = process.argv.slice(2)
let fails = 0
const ok = (c, l, x = '') => { if (!c) fails++; console.log(`  ${c ? 'ok  ' : 'FAIL'} ${l}${x ? ` — ${x}` : ''}`) }
fs.mkdirSync('out/proof', { recursive: true })

const VIEWS = [
  { tag: 'portrait 390x844', w: 390, h: 844 },
  { tag: 'portrait 320x568', w: 320, h: 568 },
  { tag: 'landscape 844x390', w: 844, h: 390 },
]

;(async () => {
  const b = await pw.webkit.launch()
  for (const v of VIEWS) {
    for (const kind of ['cold', 'refresh']) {
      const ctx = await b.newContext({ viewport: { width: v.w, height: v.h }, deviceScaleFactor: 2, isMobile: v.w < 700, hasTouch: v.w < 700 })
      const p = await ctx.newPage()
      // the route's script and its stylesheet arrive late, as they do on a phone on a real network
      await p.route('**/_nuxt/*.js', async (r) => { await sleep(1400); await r.continue() })
      if (kind === 'refresh') {
        await p.unroute('**/_nuxt/*.js')
        await p.goto(`http://127.0.0.1:${port}/${loc}/lab/proof`, { waitUntil: 'networkidle', timeout: 60000 })
        await sleep(1500)
        await p.route('**/_nuxt/*.js', async (r) => { await sleep(1400); await r.continue() })
        await p.reload({ waitUntil: 'commit' }).catch(() => {})
      } else {
        await p.goto(`http://127.0.0.1:${port}/${loc}/lab/proof`, { waitUntil: 'commit' }).catch(() => {})
      }
      await sleep(550)

      const seen = await p.evaluate(() => {
        const txt = document.querySelector('.lab-nojs')
        const plate = document.querySelector('.proof-plate')
        const vis = (e) => { if (!e) return false; const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.display !== 'none' && s.visibility !== 'hidden' && +s.opacity > 0.01 }
        const pr = plate ? plate.getBoundingClientRect() : null
        // what the visitor actually sees at a point, not merely what is in the layout: the fallback is in the
        // document either way, and the only question is whether anything of it reaches the screen
        const topAt = (x, y) => {
          const e = document.elementFromPoint(x, y)
          if (!e) return null
          if (e.closest('.proof-plate')) return 'plate'
          if (e.closest('.lab-nojs')) return 'raw'
          if (e.closest('.lab-strip')) return 'strip'
          if (e.closest('.proof')) return 'press'
          return e.className || e.tagName
        }
        const pts = [[innerWidth / 2, innerHeight / 2], [innerWidth / 2, 30], [innerWidth / 2, innerHeight - 30], [20, innerHeight / 2]]
        return {
          tops: pts.map(([x, y]) => topAt(x, y)),
          fallbackVisible: vis(txt),
          plateVisible: vis(plate),
          covers: !!pr && pr.top <= 0 && pr.left <= 0 && pr.right >= innerWidth - 1 && pr.bottom >= innerHeight - 1,
          zAbove: plate ? +getComputedStyle(plate).zIndex : null,
          overflowX: document.documentElement.scrollWidth > innerWidth + 1,
        }
      })
      fs.writeFileSync(`out/proof/boot-${kind}-${v.w}x${v.h}.png`, await p.screenshot())
      // A cold arrival must show the field and nothing else. A refresh with the chunk already in cache may be
      // live before the first sample, which is the same promise kept a different way — what neither may show is
      // the raw page: the unwrapped fallback text, or the strip without the measures its stylesheet gives it.
      const raw = seen.tops.filter((t) => t === 'raw')
      if (kind === 'cold') ok(seen.plateVisible && seen.covers && seen.tops.every((t) => t === 'plate'), `${v.tag} cold: the row field owns the first paint`, seen.tops.join(' · '))
      else ok(raw.length === 0 && seen.tops.every((t) => t === 'plate' || t === 'press' || t === 'strip'), `${v.tag} refresh: the field or the live press, never the raw page`, seen.tops.join(' · '))
      ok(raw.length === 0, `${v.tag} ${kind}: nothing of the raw page reaches the screen`, seen.tops.join(' · '))
      ok(!seen.overflowX, `${v.tag} ${kind}: no horizontal overflow`)

      // and once the chunk lands, the stage replaces it with no gap
      await p.waitForFunction(() => document.body.classList.contains('proof-painted'), null, { timeout: 30000 }).catch(() => {})
      await sleep(400)
      const after = await p.evaluate(() => ({
        plate: !!document.querySelector('.proof-plate') && getComputedStyle(document.querySelector('.proof-plate')).display !== 'none',
        stage: !!document.querySelector('.proof-canvas'),
        stages: [...document.querySelectorAll('.proof-stages li')].length,
      }))
      ok(!after.plate && after.stage && after.stages === 4, `${v.tag} ${kind}: the stage takes over and the plate is gone`, JSON.stringify(after))
      await ctx.close()
    }
  }
  await b.close()
  console.log(`\nPROOF FIRST PAINT: ${fails === 0 ? 'PASS' : `FAIL (${fails})`}`)
  process.exit(fails ? 1 : 0)
})().catch((e) => { console.error(String(e).slice(0, 400)); process.exit(1) })
