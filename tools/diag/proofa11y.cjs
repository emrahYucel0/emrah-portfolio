// THE ENGRAVED PROOF — what the press says when the canvas is ignored, and what it does without motion.
// node proofa11y.cjs <port>
const pw = require('playwright')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const port = process.argv[2]
let fails = 0
const ok = (c, l, x = '') => { if (!c) fails++; console.log(`  ${c ? 'ok  ' : 'FAIL'} ${l}${x ? ` — ${x}` : ''}`) }

;(async () => {
  const b = await pw.chromium.launch({ channel: 'chrome' })
  let total = 0

  // ── axe, both languages, both motion settings, at two sizes ───────────────
  for (const c of [
    { tag: '1440 normal ', w: 1440, h: 900, reduced: false },
    { tag: ' 390 normal ', w: 390, h: 844, reduced: false },
    { tag: ' 390 reduced', w: 390, h: 844, reduced: true },
  ]) {
    const ctx = await b.newContext({ viewport: { width: c.w, height: c.h }, reducedMotion: c.reduced ? 'reduce' : 'no-preference' })
    for (const loc of ['tr', 'en']) {
      const p = await ctx.newPage()
      await p.goto(`http://127.0.0.1:${port}/${loc}/lab/proof`, { waitUntil: 'networkidle', timeout: 60000 })
      await sleep(1800)
      await p.evaluate(() => { const t = document.querySelector('.proof-track'); scrollTo(0, t.offsetTop + (t.offsetHeight - innerHeight) * 0.6) })
      await sleep(900)
      await p.addScriptTag({ url: `http://127.0.0.1:${port}/axe.min.js` })
      const r = await p.evaluate(async () => {
        const res = await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } })
        return res.violations.map((v) => `${v.id}(${v.impact}×${v.nodes.length}: ${v.nodes[0]?.target?.join(' ') ?? ''})`)
      })
      total += r.length
      console.log(`  ${c.tag} /${loc}/lab/proof  violations ${r.length}${r.length ? ' — ' + r.join('; ') : ''}`)
      await p.close()
    }
    await ctx.close()
  }
  ok(total === 0, `axe: ${total} violations across 6 states`)

  // ── what a reader who never sees the canvas is told ───────────────────────
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } })
  const p = await ctx.newPage()
  await p.goto(`http://127.0.0.1:${port}/tr/lab/proof`, { waitUntil: 'networkidle', timeout: 60000 })
  await sleep(2000)
  const dom = await p.evaluate(() => ({
    h1: document.querySelector('h1')?.textContent?.trim() ?? null,
    described: [...document.querySelectorAll('.proof-ui p')].map((e) => e.textContent.trim()).filter(Boolean).length,
    stages: [...document.querySelectorAll('.proof-stages li')].map((e) => e.textContent.trim()),
    current: document.querySelector('.proof-stages li[aria-current]')?.textContent?.trim() ?? null,
    statusRole: !!document.querySelector('[role=status]'),
    canvasHidden: document.querySelector('.proof-canvas')?.getAttribute('aria-hidden') === 'true',
    controls: [...document.querySelectorAll('.proof-controls button')].map((e) => e.textContent.trim()),
  }))
  ok(!!dom.h1, 'the experience names itself', dom.h1)
  ok(dom.described >= 1, 'and says what it is')
  ok(dom.stages.length === 4 && !!dom.current, 'the four stages are in the DOM, one marked current', dom.stages.join(' · '))
  ok(dom.statusRole, 'the current stage is announced politely')
  ok(dom.canvasHidden, 'the canvas is decorative and out of the tree')
  ok(dom.controls.length === 2, 'a control onward and a control back', dom.controls.join(' | '))

  // keyboard: both controls reachable, and focus visible on them
  const tab = []
  for (let i = 0; i < 12; i++) {
    await p.keyboard.press('Tab')
    tab.push(await p.evaluate(() => {
      const a = document.activeElement
      return `${a.tagName.toLowerCase()}.${String(a.className).split(' ')[0]}`
    }))
  }
  ok(tab.some((t) => t.includes('proof-back')) && tab.some((t) => t.includes('proof-skip')), 'both controls are in the keyboard order', tab.filter((t) => t.includes('proof')).join(' → '))
  const ring = await p.evaluate(() => { const el = document.querySelector('.proof-skip'); el.focus(); return getComputedStyle(el).outlineWidth })
  ok(parseFloat(ring) >= 1, 'focus is visible on them', ring)
  await ctx.close()

  // ── reduced motion quantises the same parameter ───────────────────────────
  const rc = await b.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' })
  const rp = await rc.newPage()
  await rp.goto(`http://127.0.0.1:${port}/tr/lab/proof`, { waitUntil: 'networkidle', timeout: 60000 })
  await sleep(1800)
  const seen = new Set()
  for (const f of [0.05, 0.2, 0.4, 0.6, 0.8, 0.98]) {
    await rp.evaluate((v) => { const t = document.querySelector('.proof-track'); scrollTo(0, t.offsetTop + (t.offsetHeight - innerHeight) * v) }, f)
    await sleep(450)
    seen.add(await rp.evaluate(() => document.querySelector('.proof-stages li[aria-current]')?.textContent?.trim()))
  }
  ok(seen.size === 4, 'reduced motion still reaches all four stages, in steps', [...seen].join(' → '))
  await rp.click('.proof-skip')
  await rp.waitForFunction(() => /\/lab$/.test(location.pathname), null, { timeout: 30000 }).catch(() => {})
  await sleep(1500)
  ok(await rp.evaluate(() => /\/lab$/.test(location.pathname)), 'and it continues into the Lab', await rp.evaluate(() => location.pathname))
  await rc.close()

  await b.close()
  console.log(`\nPROOF A11Y: ${fails === 0 ? 'PASS' : `FAIL (${fails})`}`)
  process.exit(fails ? 1 : 0)
})().catch((e) => { console.error(String(e).slice(0, 400)); process.exit(1) })
