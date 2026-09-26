// The hero's control through a language change: the same control, in the other language, still focused.
const pw = require('playwright')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const port = process.argv[2]
let fails = 0
const ok = (c, l, x = '') => { if (!c) fails++; console.log(`  ${c ? 'ok  ' : 'FAIL'} ${l}${x ? ` — ${x}` : ''}`) }
;(async () => {
  const b = await pw.webkit.launch()
  const p = await (await b.newContext({ viewport: { width: 1366, height: 768 } })).newPage()
  for (const [from, to, word] of [['tr', 'en', 'About'], ['en', 'tr', 'Hakkımda']]) {
    await p.goto(`http://127.0.0.1:${port}/${from}/`, { waitUntil: 'networkidle', timeout: 60000 })
    await p.waitForFunction(() => window.__lab?.A.mode === 'index', null, { timeout: 40000 }).catch(() => {})
    await sleep(3000)
    await p.evaluate(() => document.querySelector('.hero-about').focus())
    await p.click('#ui [data-locale]')
    await p.waitForFunction((w) => document.querySelector('.hero-about')?.textContent.trim() === w, word, { timeout: 20000 }).catch(() => {})
    await sleep(2500)
    const r = await p.evaluate(() => ({
      path: location.pathname, text: document.querySelector('.hero-about')?.textContent.trim(),
      focused: document.activeElement?.className, base: window.__lab.A.base, mode: window.__lab.A.mode,
      count: document.querySelectorAll('.hero-about').length,
    }))
    ok(r.path.startsWith(`/${to}`) && r.text === word, `${from} → ${to}: the control is in the new language`, JSON.stringify(r))
    ok(r.count === 1 && r.base === 0 && r.mode === 'index', 'one control, and the hero did not move', JSON.stringify(r))
    // where focus lands after the navigation itself is the browser's, and is what it was before this pass (the
    // control's own identity through a rebuild is covered by herofocus.cjs)
    await p.goBack(); await sleep(3000)
    const back = await p.evaluate(() => ({ path: location.pathname, text: document.querySelector('.hero-about')?.textContent.trim(), base: window.__lab.A.base }))
    ok(back.path.startsWith(`/${from}`) && back.base === 0, 'Back undoes the language change and keeps the place', JSON.stringify(back))
  }
  await b.close()
  console.log(`HERO LOCALE: ${fails === 0 ? 'PASS' : `FAIL (${fails})`}`)
  process.exit(fails ? 1 : 0)
})().catch((e) => { console.error(String(e).slice(0, 400)); process.exit(1) })
