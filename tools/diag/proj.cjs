// PROJECT TRANSITIONS — how long the visitor waits, and for what. Four moments per step, all from the gesture:
//   response    the picture has started to change at all
//   meaningful  the project's own text is on screen
//   usable      the next gesture would be answered (not busy)
//   settled     nothing is moving any more
//
// Opening a project takes TWO activations, and the second one only opens if the engine already counts the project
// as registered — `registeredWork()` is `A.wLocked === i && WORKS[i].fill > 0.5` (main.js:448). Waiting on
// `wLocked` alone clicks too early, the handler takes its retarget branch instead, and every later step then reads
// the previous project's DOM. Wait for both.
// node proj.cjs <port> [reduced]
const pw = require('playwright')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const [port, motion] = process.argv.slice(2)
const reduced = motion === 'reduced'

const read = () => {
  const L = window.__lab, A = L.A
  const inWorld = A.mode === 'world' || A.mode === 'exit'
  const wsum = document.querySelector('.world .wsum h2')
  const idx = document.querySelector('#ui [data-work].active .wid')
  return {
    mode: A.mode, busy: !!A.busy, k: A.k, wLocked: A.wLocked,
    fill: +(L.WORKS()[A.wT]?.fill ?? 0).toFixed(2),
    p: +A.p.toFixed(3), pT: +A.pT.toFixed(3),
    wp: +A.wp.toFixed(3), wpT: +A.wpT.toFixed(3),
    // stale DOM must not be able to satisfy "meaningful", and the two sources are tagged because a project's
    // world heading and its index label are the SAME string — untagged, entering a world would look like no change
    text: (inWorld ? 'world:' : 'index:') + (inWorld ? (wsum?.innerText || '') : (idx?.innerText || '')).replace(/\s+/g, ' ').trim(),
  }
}

;(async () => {
  const b = await pw.webkit.launch()
  const ctx = await b.newContext({ viewport: { width: 1366, height: 768 }, reducedMotion: reduced ? 'reduce' : 'no-preference' })
  const p = await ctx.newPage()
  const errs = []
  p.on('pageerror', (e) => errs.push(String(e.message).slice(0, 110)))
  await p.goto(`http://127.0.0.1:${port}/tr`, { waitUntil: 'networkidle', timeout: 60000 })
  await p.waitForFunction(() => window.__lab?.A.mode === 'index', null, { timeout: 40000 })
  await sleep(2500)
  await p.evaluate(() => document.querySelector('#ui [data-go="work"]').click())
  await p.waitForFunction(() => window.__lab.A.base === 3 && !window.__lab.A.busy, null, { timeout: 20000 }).catch(() => {})
  await sleep(2500)

  console.log(`== ${reduced ? 'REDUCED' : 'NORMAL'} — project transitions`)
  let fails = 0
  const watch = async (label, prep, act, wantMode) => {
    await prep()
    const before = await p.evaluate(read)
    const t0 = Date.now()
    let response = null, meaningful = null, usable = null, settled = null, name = ''
    await act()
    for (let i = 0; i < 90; i++) {
      const s = await p.evaluate(read)
      const t = Date.now() - t0
      if (response === null && (s.mode !== before.mode || s.busy)) response = t
      if (meaningful === null && s.text && s.text !== before.text) { meaningful = t; name = s.text }
      if (usable === null && response !== null && !s.busy && s.mode === wantMode) usable = t
      if (settled === null && usable !== null && Math.abs(s.p - s.pT) < 0.002 && Math.abs(s.wp - s.wpT) < 0.002) settled = t
      if (settled !== null && t > settled + 400) break
      await sleep(90)
    }
    const f = (v) => (v === null ? '    — ' : `${String(v).padStart(5)}ms`)
    const bad = response === null || meaningful === null || usable === null || settled === null
    if (bad) fails++
    console.log(`  ${bad ? 'FAIL' : 'ok  '} ${label.padEnd(20)} response ${f(response)} | meaningful ${f(meaningful)} | usable ${f(usable)} | settled ${f(settled)}  (${name.split(' ').slice(0, 3).join(' ')})`)
  }

  // the engine's own precondition for "this activation opens the project", then the activation that opens it
  // bring project i into register — the carousel travel the visitor does before deciding to open it
  const register = (i) => async () => {
    await p.evaluate((k) => document.querySelector(`#ui [data-work="${k}"]`)?.click(), i)
    await p.waitForFunction((k) => window.__lab.A.wLocked === k && window.__lab.WORKS()[k]?.fill > 0.5 && !window.__lab.A.busy, i, { timeout: 25000 })
    await sleep(400)
  }
  // ...and the one activation that opens it: this is what the four numbers are measured from
  const open = (i) => async () => { await p.evaluate((k) => document.querySelector(`#ui [data-work="${k}"]`)?.click(), i) }
  const back = async () => {
    await p.evaluate(() => document.querySelector('.world [data-world="all"]')?.click())
    await p.waitForFunction(() => window.__lab.A.mode === 'index' && !window.__lab.A.busy, null, { timeout: 25000 }).catch(() => {})
    await sleep(2500)
  }

  const noop = async () => {}
  await watch('Work → project A', register(0), open(0), 'world')
  await watch('project A → B', async () => { await back(); await register(1)() }, open(1), 'world')
  await watch('project B → C', async () => { await back(); await register(2)() }, open(2), 'world')
  await watch('project → Work', noop, async () => { await p.evaluate(() => document.querySelector('.world [data-world="all"]')?.click()) }, 'index')

  console.log(`  errors ${errs.length}${errs.length ? ` :: ${errs[0]}` : ''}`)
  console.log(`PROJ: ${fails || errs.length ? `FAIL (${fails})` : 'PASS'}`)
  await b.close()
  process.exit(fails || errs.length ? 1 : 0)
})().catch((e) => { console.error(String(e).slice(0, 300)); process.exit(1) })
