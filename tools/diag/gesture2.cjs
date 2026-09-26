// ONE INPUT = ONE MOVEMENT — inside a project, and on the index. Momentum must not skip a project.
// node gesture2.cjs <port>
const pw = require('playwright')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const port = process.argv[2]
let fails = 0
const ok = (c, l, x = '') => { if (!c) fails++; console.log(`  ${c ? 'ok  ' : 'FAIL'} ${l}${x ? ` — ${x}` : ''}`) }
const momentum = async (p, dir) => { for (const d of [6, 14, 26, 38, 44, 40, 34, 27, 21, 16, 12, 9, 7, 5, 4, 3, 2, 1]) { await p.mouse.wheel(0, d * dir); await sleep(16) } }
;(async () => {
  const b = await pw.webkit.launch()
  const p = await (await b.newContext({ viewport: { width: 1366, height: 768 } })).newPage()
  await p.goto(`http://127.0.0.1:${port}/tr`, { waitUntil: 'networkidle' })
  await p.waitForFunction(() => window.__lab?.A.mode === 'index', null, { timeout: 40000 }).catch(() => {})
  await sleep(3000)
  const st = () => p.evaluate(() => ({ mode: window.__lab.A.mode, k: window.__lab.A.k, wp: +window.__lab.A.wp.toFixed(2), base: window.__lab.A.base, wbase: window.__lab.A.wbase }))
  // open a project
  await p.evaluate(() => document.querySelector('#ui [data-go="work"]').click()); await sleep(4200)
  await p.evaluate(() => document.querySelector('#ui [data-work="0"]').click())
  await p.waitForFunction(() => window.__lab.A.wLocked === 0 || window.__lab.A.mode === 'world', null, { timeout: 20000 }).catch(() => {})
  await p.evaluate(() => document.querySelector('#ui [data-work="0"]').click())
  await p.waitForFunction(() => window.__lab.A.mode === 'world', null, { timeout: 20000 }).catch(() => {})
  await sleep(4200)
  const a = await st()
  await momentum(p, 1); await sleep(4200)
  const c = await st()
  ok(c.mode === 'world' && c.k === a.k && c.wbase - a.wbase <= 1, 'one momentum gesture inside a project moves at most one frame, and never leaves the project', `${JSON.stringify(a)} → ${JSON.stringify(c)}`)
  // and on the index: one gesture, one stop
  await p.goto(`http://127.0.0.1:${port}/tr`, { waitUntil: 'networkidle' })
  await p.waitForFunction(() => window.__lab?.A.mode === 'index', null, { timeout: 40000 }).catch(() => {})
  await sleep(3000)
  const i0 = await st()
  await momentum(p, 1); await sleep(4200)
  const i1 = await st()
  ok(i1.base - i0.base === 1, 'one momentum gesture on the index moves exactly one stop', `${i0.base} → ${i1.base}`)
  await b.close()
  console.log(`GESTURE: ${fails === 0 ? 'PASS' : `FAIL (${fails})`}`)
  process.exit(fails ? 1 : 0)
})().catch((e) => { console.error(String(e).slice(0, 300)); process.exit(1) })
