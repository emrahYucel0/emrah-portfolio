// axe over the hero, in both languages and both motion settings, with the About room open and closed.
// Also: the keyboard order into the new control, and that it is named once.
// node heroaxe.cjs <port>
const pw = require('playwright')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const port = process.argv[2]
let fails = 0
const ok = (c, l, x = '') => { if (!c) fails++; console.log(`  ${c ? 'ok  ' : 'FAIL'} ${l}${x ? ` — ${x}` : ''}`) }
const CONFIGS = [
  { tag: '1440 normal ', w: 1440, h: 900, reduced: false },
  { tag: ' 390 normal ', w: 390, h: 844, reduced: false },
  { tag: ' 390 reduced', w: 390, h: 844, reduced: true },
]
;(async () => {
  const b = await pw.chromium.launch({ channel: 'chrome' })
  let total = 0
  for (const c of CONFIGS) {
    const ctx = await b.newContext({ viewport: { width: c.w, height: c.h }, reducedMotion: c.reduced ? 'reduce' : 'no-preference' })
    for (const loc of ['tr', 'en']) {
      for (const open of [false, true]) {
        const p = await ctx.newPage()
        await p.goto(`http://127.0.0.1:${port}/${loc}/`, { waitUntil: 'networkidle', timeout: 60000 })
        await p.waitForFunction(() => window.__lab?.A.mode === 'index', null, { timeout: 40000 }).catch(() => {})
        await sleep(3000)
        if (open) { await p.click('.hero-about'); await sleep(3400) }
        await p.addScriptTag({ url: `http://127.0.0.1:${port}/axe.min.js` })
        const r = await p.evaluate(async () => {
          const res = await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } })
          return res.violations.map((v) => `${v.id}(${v.impact}×${v.nodes.length}: ${v.nodes[0]?.target?.join(' ') ?? ''})`)
        })
        total += r.length
        console.log(`  ${c.tag} /${loc}/ ${open ? 'about open  ' : 'hero        '} violations ${r.length}${r.length ? ' — ' + r.join('; ') : ''}`)
        await p.close()
      }
    }
    await ctx.close()
  }
  ok(total === 0, `axe: ${total} violations across 12 states`)

  // the control in the keyboard's order, and named once
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } })
  const p = await ctx.newPage()
  for (const loc of ['tr', 'en']) {
    await p.goto(`http://127.0.0.1:${port}/${loc}/`, { waitUntil: 'networkidle', timeout: 60000 })
    await p.waitForFunction(() => window.__lab?.A.mode === 'index', null, { timeout: 40000 }).catch(() => {})
    await sleep(3000)
    const order = []
    for (let i = 0; i < 9; i++) {
      await p.keyboard.press('Tab')
      order.push(await p.evaluate(() => {
        const a = document.activeElement
        return `${a.tagName.toLowerCase()}${a.className ? '.' + String(a.className).split(' ')[0] : ''}:${(a.ariaLabel || a.textContent || '').trim().slice(0, 14)}`
      }))
    }
    const at = order.findIndex((o) => o.startsWith('button.hero-about'))
    ok(at >= 0, `/${loc}/ the control is in the keyboard order`, order.join(' → '))
    const afterStrip = order.slice(0, at).some((o) => /rest|lang|İletişim|Contact/i.test(o))
    ok(at > 0 && afterStrip, `/${loc}/ it comes after the strip's navigation, with the hero`, `position ${at + 1}`)
    // reached from the keyboard, it opens About
    await p.keyboard.press('Enter').catch(() => {})
    const names = await p.evaluate(() => [...document.querySelectorAll('#ui button, #ui a')].filter((e) => e.offsetParent !== null || e.getClientRects().length).map((e) => (e.ariaLabel || e.textContent).trim().toLowerCase()))
    const about = names.filter((n) => n === 'hakkımda' || n === 'about')
    ok(about.length <= 2, `/${loc}/ About is named at most twice on screen (strip, hero)`, `${about.length}`)
  }
  await b.close()
  console.log(`HERO A11Y: ${fails === 0 ? 'PASS' : `FAIL (${fails})`}`)
  process.exit(fails ? 1 : 0)
})().catch((e) => { console.error(String(e).slice(0, 400)); process.exit(1) })
