// THE LAB'S SHELL — the strip that continues the runtime's, the studies' own scroll, and one control back.
// node shell.cjs <port>
const pw = require('playwright')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const port = process.argv[2]
let fails = 0
const ok = (c, l, x = '') => { if (!c) fails++; console.log(`  ${c ? 'ok  ' : 'FAIL'} ${l}${x ? ` — ${x}` : ''}`) }

;(async () => {
  const b = await pw.webkit.launch()
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 })
  const p = await ctx.newPage()
  const errs = [], csp = []
  p.on('pageerror', (e) => errs.push(e.message))
  p.on('console', (m) => { if (m.type() === 'error') (/Content Security Policy/i.test(m.text()) ? csp : errs).push(m.text()) })

  console.log('== LAB SHELL / RESPONSIVE')
  // the bench: one screen, one strip, no second header and no semantic footer under it
  await p.goto(`http://127.0.0.1:${port}/tr/lab`, { waitUntil: 'networkidle', timeout: 60000 })
  await sleep(2400)
  const bench = await p.evaluate(() => {
    const strip = document.querySelector('[data-strip]')
    const r = strip?.getBoundingClientRect()
    return {
      scrolls: document.documentElement.scrollHeight > innerHeight + 1,
      stage: !!document.querySelector('.lab-stage'),
      headers: document.querySelectorAll('header').length,
      footers: document.querySelectorAll('footer').length,
      stripH: r ? Math.round(r.height) : 0,
      strip: getComputedStyle(document.documentElement).getPropertyValue('--strip').trim(),
      overflowX: document.documentElement.scrollWidth > innerWidth + 1,
    }
  })
  ok(!bench.scrolls, 'Lab Home does not scroll as a document — scrollHeight vs viewport: exactly one screen')
  ok(bench.stage, 'the bench owns the frame')
  ok(bench.headers === 1 && bench.footers === 0, 'no semantic Contact footer and no second header under the Lab', `headers ${bench.headers} footers ${bench.footers}`)
  ok(bench.stripH > 30 && bench.stripH < 90, 'the Lab strip is one row', `height ${bench.stripH}px, --strip ${bench.strip}`)
  ok(!bench.overflowX, 'no horizontal overflow')

  // the studies keep the document's own scroll, and offer exactly one way back
  for (const id of ['weight', 'line', 'tone']) {
    await p.goto(`http://127.0.0.1:${port}/tr/lab/${id}`, { waitUntil: 'networkidle', timeout: 60000 })
    await sleep(2000)
    await p.evaluate(() => scrollTo(0, 600)); await sleep(700)
    const mid = await p.evaluate(() => Math.round(scrollY))
    await p.evaluate(() => scrollTo(0, 0)); await sleep(700)
    const back = await p.evaluate(() => Math.round(scrollY))
    ok(mid > 400 && back === 0, `${id}: scrolls, stays, reverses`, `mid ${mid}px, back ${back}px`)
    ok(!(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)), `${id}: no horizontal overflow`)
  }
  const nav = await p.evaluate(() => {
    const vis = (e) => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.display !== 'none' && s.visibility !== 'hidden' }
    const all = [...document.querySelectorAll('a[href$="/lab"]')]
    const backEl = document.querySelector('.study .back')
    return { toLab: all.filter(vis).length, hiddenBack: !!backEl && !vis(backEl) }
  })
  ok(nav.toLab === 1, 'exactly one visible control returns to the Lab', `found ${nav.toLab}`)
  ok(!nav.hiddenBack, "the study's own return is the visible one control to the Lab")

  console.log(`\n  console errors ${errs.length} | CSP ${csp.length} ${JSON.stringify([...errs, ...csp].slice(0, 2))}`)
  if (errs.length || csp.length) fails++
  await b.close()
  console.log(`\nSHELL: ${fails === 0 ? 'PASS' : `FAIL (${fails})`}`)
  process.exit(fails ? 1 : 0)
})().catch((e) => { console.error(String(e).slice(0, 300)); process.exit(1) })
