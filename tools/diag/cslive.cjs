// CROSS SECTION ON THE LIVE SITE — after an upload: is it the package, is the passage there, does the way work.
//
//   node cslive.cjs [origin=https://yucelemrah.com] [--engine=chrome|webkit]
//
// Reads the live build ID (against the package's), the spine, then walks Work's last work → the passage → the bench in
// gestures dispatched from inside the page (one notch each, the seam waited out), counting the positions passed and
// the blinds' frames, and one gesture back up from the bench, which must arrive at DEPTH. Console clean.
const pw = require('playwright')
const { watch } = require('./consolewatch.cjs')
const args = process.argv.slice(2)
const origin = args.find((a) => /^https?:/.test(a)) || 'https://yucelemrah.com'
const opt = (k, d) => { const a = args.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d }
const engine = opt('engine', 'chrome')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let fails = 0
const check = (ok, msg) => { console.log(`   ${ok ? 'ok  ' : 'FAIL'} ${msg}`); if (!ok) fails++ }

;(async () => {
  const b = engine === 'webkit' ? await pw.webkit.launch() : await pw.chromium.launch({ channel: 'chrome' })
  const p = await (await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 })).newPage()
  const W = watch(p, `live-${engine}`)
  await p.addInitScript(() => {
    window.__live = { xs: new Set(), rv: 0 }
    const s = () => { const L = window.__lab, c = L && L.csState && L.csState(); if (c) { if (L.A.base === L.STOP.cross) window.__live.xs.add(c.x); if (c.reveal.on && c.reveal.r > 0 && c.reveal.r < 1) window.__live.rv++ } requestAnimationFrame(s) }
    requestAnimationFrame(s)
  })
  await p.goto(`${origin}/tr`, { waitUntil: 'load', timeout: 120000 })
  await p.waitForFunction(() => window.__lab && window.__lab.A.mode === 'index' && window.__lab.STOP, null, { timeout: 120000 })
  await sleep(1500)
  const id = await p.evaluate(() => (document.documentElement.outerHTML.match(/buildId:"([^"]+)"/) || [])[1] || null)
  const spine = await p.evaluate(() => window.__lab.SPINE)
  console.log(`== CROSS SECTION, LIVE   ${origin}   ${engine}\n   build ${id}\n   spine ${spine.join(' · ')}`)
  check(spine.includes('cross') && spine.indexOf('cross') === spine.indexOf('work') + 1 && spine.indexOf('lab') === spine.indexOf('cross') + 1, 'the spine has Cross Section between Work and the Lab')
  const STOP = await p.evaluate(() => window.__lab.STOP)
  await p.evaluate((s) => window.__lab.go(s.work), STOP); await sleep(2600)
  for (let i = 0; i < 3; i++) { await p.keyboard.press('ArrowRight'); await sleep(500) }
  await sleep(1500)
  const notch = (dy) => p.evaluate((d) => window.dispatchEvent(new WheelEvent('wheel', { deltaY: d, deltaMode: 0, cancelable: true })), dy)
  const seamDone = () => p.waitForFunction(() => document.documentElement.dataset.c2 !== 'cs' && !(window.__lab && window.__lab.A.csHeld), null, { timeout: 20000 }).catch(() => {})
  let n = 0
  for (; n < 8 && !(await p.evaluate(() => /\/lab$/.test(location.pathname) && !document.documentElement.dataset.c2)); n++) { await notch(100); await sleep(2400); await seamDone(); await sleep(400) }
  const fwd = await p.evaluate(() => ({ xs: [...window.__live.xs].sort(), rv: window.__live.rv, path: location.pathname, study: [...document.querySelectorAll('.lab-stage .rec')].findIndex((e) => e.getAttribute('aria-current')) }))
  check(n === 5 && fwd.path.endsWith('/lab') && fwd.study === 0, `Work's last work → the bench in ${n} gestures, on 01 (${fwd.path})`)
  check(['1', '2', '3', '4'].every((x) => fwd.xs.map(String).includes(x)) && fwd.rv > 10, `the passage was passed through: positions ${fwd.xs.join(',')}, the blinds drawn over ${fwd.rv} frames`)
  await sleep(1200)
  await p.evaluate(() => { window.__live.rv = 0 })
  await notch(-100)
  await p.waitForFunction(() => !location.pathname.includes('/lab') && document.documentElement.dataset.c2 === 'on' && !window.__lab.A.csHeld, null, { timeout: 30000 }).catch(() => {})
  await sleep(1500)
  const up = await p.evaluate(() => ({ base: window.__lab.A.base, x: window.__lab.csState().x, rv: window.__live.rv, path: location.pathname }))
  check(up.base === STOP.cross && up.x === 4, `one gesture up from the bench: Cross Section at DEPTH (base ${up.base}, x ${up.x}, the blinds closing over ${up.rv} frames, ${up.path})`)
  const v = await W.verdict(p)
  check(v.length === 0, `console clean (${v.length})${v.length ? '\n        ' + v.slice(0, 6).join('\n        ') : ''}`)
  await b.close()
  console.log(fails ? `   FAIL (${fails})` : '   PASS')
  process.exit(fails ? 1 : 0)
})()
