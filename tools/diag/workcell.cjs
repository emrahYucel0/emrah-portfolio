// WORK en→tr, the one cell that failed: is the copy actually wrong, or was the reference taken too early?
const pw = require('playwright')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const shown = () => {
  const layers = [...document.querySelectorAll('#ui .layers > .layer.on')]
  const clean = (s) => s.replace(/\s+/g, ' ').trim()
  return clean([
    [...document.querySelectorAll('#ui .top .nav button')].map((b) => b.textContent).join('|'),
    document.title,
    ...layers.map((e) => { const c = e.cloneNode(true); c.querySelectorAll('#hint, [aria-live], .sr').forEach((x) => x.remove()); return c.textContent }),
  ].join(' ~ '))
}
;(async () => {
  const b = await pw.webkit.launch()
  const p = await (await b.newContext({ viewport: { width: 1366, height: 768 } })).newPage()
  const at = async (loc, settleMs) => {
    await p.goto(`http://127.0.0.1:4500/${loc}`, { waitUntil: 'networkidle' })
    await p.waitForFunction(() => window.__lab?.A.mode === 'index', null, { timeout: 40000 }).catch(() => {})
    await sleep(5200)
    await p.evaluate(() => document.querySelector('#ui [data-go="work"]').click())
    await sleep(settleMs)
    return p.evaluate(shown)
  }
  for (let i = 0; i < 3; i++) {
    const ref = await at('tr', 9000)                 // arriving in TR, given time to settle
    const en = await at('en', 9000)                  // arriving in EN, then switching to TR
    await p.evaluate(() => document.querySelector('#ui [data-locale]').click())
    await sleep(6500)
    const got = await p.evaluate(shown)
    console.log(`run ${i}: ${got === ref ? 'MATCH' : 'DIFFER'}`)
    if (got !== ref) { console.log('   got  ' + got.slice(0, 170)); console.log('   ref  ' + ref.slice(0, 170)) }
  }
  await b.close()
})().catch((e) => { console.error(String(e).slice(0, 300)); process.exit(1) })
