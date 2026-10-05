// R9 IN WEBKIT, AT PHONE SIZE, OVER THE LAN — what the user's iPhone loads: the index, Full-Stack and a work boot, in
// normal and in reduced motion, with no GL error, no console error and no page error.
//
//   node r9webkit.cjs [origin]       default http://192.168.1.5:4974 (a build served --lan --wk)
//
// During the step-2 prototype this also checked the ?r9= key and its badge (4a25b09); B is the shipped shader now
// and the key is gone, so a badge anywhere is a failure.
const pw = require('playwright')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const origin = process.argv[2] || 'http://192.168.1.5:4974'
;(async () => {
  const b = await pw.webkit.launch()
  let fail = 0
  for (const reduced of [false, true]) for (const path of ['/tr', '/tr/work/ege']) {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, reducedMotion: reduced ? 'reduce' : 'no-preference' })
    const p = await ctx.newPage()
    const errs = []
    p.on('console', (m) => { if ((m.type() === 'error' || m.type() === 'warning') && !/preload/.test(m.text())) errs.push(m.text().slice(0, 140)) })
    p.on('pageerror', (e) => errs.push('pageerror ' + e.message))
    await p.goto(origin + path, { waitUntil: 'load', timeout: 90000 })
    const booted = await p.waitForFunction(() => window.__lab && (window.__lab.A.mode === 'index' || window.__lab.A.mode === 'world'), null, { timeout: 60000 }).then(() => true, () => false)
    await sleep(2500)
    if (path === '/tr' && booted) { await p.evaluate(() => window.__lab.go(window.__lab.STOP.system)); await sleep(2500) }
    const r = booted ? await p.evaluate(() => ({
      gl: window.__lab.surface.gl ? window.__lab.surface.gl.getError() : 'no gl (2D)',
      badge: [...document.body.children].some((e) => /^R9 [ABC]$/.test(e.textContent)),
      ratio: window.__lab.V.dpr * window.__lab.V.u,
    })) : null
    const ok = booted && (r.gl === 0 || r.gl === 'no gl (2D)') && !r.badge && !errs.length
    if (!ok) fail++
    console.log(`${ok ? 'ok  ' : 'FAIL'} webkit 390x844@3 ${reduced ? 'reduced' : 'normal '} ${path}: boot ${booted}, gl ${r?.gl}, ratio ${r?.ratio}, badge ${r?.badge}, console ${errs.length ? errs.join(' | ') : 'clean'}`)
    await ctx.close()
  }
  await b.close()
  console.log(fail ? 'R9WEBKIT: FAIL' : 'R9WEBKIT: PASS')
})()
