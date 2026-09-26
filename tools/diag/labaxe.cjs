// axe over the Lab's own routes, in both languages and both motion settings.
// Needs axe.min.js at the served root: cp tools/diag/node_modules/axe-core/axe.min.js .output/public/
// node labaxe.cjs <port>
const pw = require('playwright')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const port = process.argv[2]
const PATHS = ['/tr/lab', '/tr/lab/weight', '/tr/lab/line', '/tr/lab/tone', '/en/lab', '/en/lab/tone']
const CONFIGS = [
  { tag: '1440 normal', w: 1440, h: 900, reduced: false },
  { tag: ' 390 normal', w: 390, h: 844, reduced: false },
  { tag: ' 390 reduced', w: 390, h: 844, reduced: true },
]
;(async () => {
  const b = await pw.chromium.launch({ channel: 'chrome' })
  let total = 0
  for (const c of CONFIGS) {
    const ctx = await b.newContext({ viewport: { width: c.w, height: c.h }, reducedMotion: c.reduced ? 'reduce' : 'no-preference' })
    for (const path of PATHS) {
      const p = await ctx.newPage()
      await p.goto(`http://127.0.0.1:${port}${path}`, { waitUntil: 'networkidle', timeout: 60000 })
      await sleep(1800)
      await p.addScriptTag({ url: `http://127.0.0.1:${port}/axe.min.js` })
      const r = await p.evaluate(async () => {
        const res = await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } })
        return res.violations.map((v) => ({ id: v.id, impact: v.impact, n: v.nodes.length, ex: v.nodes[0]?.target?.join(' ') ?? '' }))
      })
      total += r.length
      console.log(`  ${c.tag}  ${path.padEnd(16)} violations ${r.length}${r.length ? ' — ' + r.map((v) => `${v.id}(${v.impact}×${v.n}: ${v.ex})`).join('; ') : ''}`)
      await p.close()
    }
    await ctx.close()
  }
  await b.close()
  console.log(`\nLAB A11Y: ${total === 0 ? 'PASS' : `FAIL (${total})`}`)
  process.exit(total ? 1 : 0)
})().catch((e) => { console.error(String(e).slice(0, 300)); process.exit(1) })
