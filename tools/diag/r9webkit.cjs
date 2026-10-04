// R9 PROTOTYPE IN WEBKIT, AT PHONE SIZE, OVER THE LAN — what the user's iPhone loads: boots, no GL or console error,
// the badge exactly when a key is given.
//
//   node r9webkit.cjs       the prototype build served --lan --wk on 4972 at 192.168.1.5
const pw = require('playwright')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
;(async () => {
  const b = await pw.webkit.launch()
  let fail = 0
  for (const q of ['', '?r9=a', '?r9=b', '?r9=c']) for (const path of ['/tr', '/tr/work/ege']) {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true })
    const p = await ctx.newPage()
    const errs = []
    p.on('console', (m) => { if ((m.type() === 'error' || m.type() === 'warning') && !/preload/.test(m.text())) errs.push(m.text().slice(0, 140)) })
    p.on('pageerror', (e) => errs.push('pageerror ' + e.message))
    await p.goto('http://192.168.1.5:4972' + path + q, { waitUntil: 'load', timeout: 90000 })
    const ok1 = await p.waitForFunction(() => window.__lab && (window.__lab.A.mode === 'index' || window.__lab.A.mode === 'world'), null, { timeout: 60000 }).then(() => true, () => false)
    await sleep(2500)
    if (path === '/tr' && ok1) { await p.evaluate(() => window.__lab.go(window.__lab.STOP.system)); await sleep(2500) }
    const r = ok1 ? await p.evaluate(() => ({ gl: window.__lab.surface.gl.getError(), badge: [...document.body.children].some((e) => /^R9 [ABC]$/.test(e.textContent)), dpr: window.__lab.V.dpr * window.__lab.V.u })) : null
    const ok = ok1 && r.gl === 0 && !errs.length && r.badge === !!q
    if (!ok) fail++
    console.log(`${ok ? 'ok  ' : 'FAIL'} webkit 390x844@3 ${path}${q || ' (no key)'}: boot ${ok1}, gl ${r?.gl}, ratio ${r?.dpr}, badge ${r?.badge}, console ${errs.length ? errs.join(' | ') : 'clean'}`)
    await ctx.close()
  }
  await b.close()
  console.log(fail ? 'R9WEBKIT: FAIL' : 'R9WEBKIT: PASS')
})()
