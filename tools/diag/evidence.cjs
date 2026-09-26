// EVENT-LEVEL EVIDENCE. The same build, the same finger, twice: once with the fix in force, once with the page
// handed back to the browser exactly as base.css used to hand it back. What differs is the pointer stream.
const pw = require('playwright')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const port = process.argv[2]
;(async () => {
  const b = await pw.chromium.launch({ channel: 'chrome' })
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 3 })
  const p = await ctx.newPage()
  const cdp = await ctx.newCDPSession(p)
  const swipe = async (x, y0, dy) => {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: y0 }] })
    for (let i = 1; i <= 14; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: Math.round(y0 + (dy * i) / 14) }] }); await sleep(16) }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  }
  const record = () => p.evaluate(() => {
    window.__ev = []
    for (const t of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel', 'touchstart', 'touchmove', 'touchcancel', 'click']) {
      addEventListener(t, (e) => window.__ev.push(t === 'pointermove' || t === 'touchmove' ? t : `${t}${e.target?.className ? '(' + String(e.target.className).slice(0, 10) + ')' : ''}`), { capture: true, passive: true })
    }
  })
  const summarise = async () => {
    const ev = await p.evaluate(() => window.__ev)
    const counts = {}
    for (const e of ev) counts[e.replace(/\(.*/, '')] = (counts[e.replace(/\(.*/, '')] || 0) + 1
    return { counts, cancelled: ev.some((e) => e.startsWith('pointercancel') || e.startsWith('touchcancel')), tail: ev.slice(-4) }
  }

  for (const mode of ['AS SHIPPED (fix in force)', 'PRE-FIX (page handed back to the browser)']) {
    await p.goto(`http://127.0.0.1:${port}/tr/lab`, { waitUntil: 'networkidle' })
    await sleep(1800)
    if (mode.startsWith('PRE-FIX')) {
      // exactly what base.css's unlock rule did to this page before the specificity was corrected
      await p.evaluate(() => { document.body.style.setProperty('touch-action', 'auto', 'important'); document.body.style.setProperty('overflow', 'visible', 'important'); document.body.style.setProperty('height', 'auto', 'important') })
    }
    await record()
    const ta = await p.evaluate(() => getComputedStyle(document.body).touchAction)
    await swipe(195, 610, -260)
    await sleep(5000)
    const s = await p.evaluate(() => ({ path: location.pathname, base: window.__lab?.A?.base ?? null }))
    const ev = await summarise()
    console.log(`\n${mode}`)
    console.log(`   body touch-action: ${ta}`)
    console.log(`   pointer stream: ${JSON.stringify(ev.counts)}  cancelled: ${ev.cancelled}`)
    console.log(`   result: ${s.path}${s.base !== null ? ` base ${s.base}` : ''}  → ${s.path === '/tr' ? 'NAVIGATED' : 'STAYED ON THE BENCH'}`)
  }
  await b.close()
})().catch((e) => { console.error(String(e).slice(0, 300)); process.exit(1) })
