const pw = require('playwright')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const [port, sel = '.hero-about'] = process.argv.slice(2)
;(async () => {
  const b = await pw.webkit.launch()
  const p = await (await b.newContext({ viewport: { width: 1366, height: 768 } })).newPage()
  await p.goto(`http://127.0.0.1:${port}/tr/`, { waitUntil: 'networkidle', timeout: 60000 })
  await p.waitForFunction(() => window.__lab?.A.mode === 'index', null, { timeout: 40000 }).catch(() => {})
  await sleep(3000)
  // the language changes under a focused control, the way a Back across the boundary would do it
  const r = await p.evaluate(async (s) => {
    const el = document.querySelector(s); el.focus()
    const before = document.activeElement === el
    window.__lab.setLocale('en')
    await new Promise((r) => setTimeout(r, 600))
    const a = document.activeElement
    return { before, after: `${a.tagName.toLowerCase()}.${String(a.className).split(' ')[0]}`, text: (a.textContent || '').trim().slice(0, 12) }
  }, sel)
  console.log(`${sel}: focused before=${r.before} → after the language change: ${r.after} "${r.text}"`)
  await b.close()
})().catch((e) => { console.error(String(e).slice(0, 300)); process.exit(1) })
