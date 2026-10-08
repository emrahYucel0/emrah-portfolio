// ONE TRACKPAD THROW = ONE STOP, with the streams a trackpad really sends (ROADMAP R12).
//
//   node trackpad.cjs <port> [webkit|chrome] [runs] [shapes] [places] [--log]      MODES=coalesced|queued|both (default both)
//
// gesture2.cjs throws its flicks through Playwright, one round trip per event, so the gaps the page sees are the
// harness's own and grow with the machine's load — which is why its coast/tail cases failed on some runs and not
// others. Here the stream is played from INSIDE the page on a fixed timeline, in the shapes real devices send:
// macOS momentum at 60 and 120 Hz, a Windows precision touchpad with Chrome's fling, and gesture2's own two.
//
// And the page is busy while a flick lands, so a browser does not hand it every event: whatever fell due while it
// was drawing arrives as ONE event carrying the sum (coalesced), or, in a browser that queues, one by one. Both are
// played. Every event's view of the gesture can be logged (--log, for a throw that fails): its gap, its size, the
// envelope it was judged against, and whether it opened a new gesture.
const pw = require('playwright')
const { stopsOf } = require('./stops.cjs')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const [port, engine = 'webkit', runsArg = '3', shapesArg = '', placesArg = ''] = process.argv.slice(2)
const LOG = process.argv.includes('--log')
const RUNS = +runsArg

/* ── the streams, as [ms from start, deltaY px] ─────────────────────────────────────────────────────────── */
function fingerThenMomentum({ frame, ramp, v0, keep, liftGap = 0, round = true, floor = 1 }) {
  const ev = []; let t = 0
  for (const d of ramp) { ev.push([t, d]); t += frame }
  t += liftGap
  let v = v0
  while (Math.abs(v) >= floor) { ev.push([t, round ? Math.round(v) : +v.toFixed(3)]); v *= keep; t += frame }
  return ev
}
const SHAPES = {
  // macOS trackpad, 60 Hz: a finger push, then the system's momentum — every frame, decaying, integer deltas, ~1.8 s
  mac60: () => fingerThenMomentum({ frame: 16.7, ramp: [6, 18, 40, 72, 110, 150, 180], v0: 190, keep: 0.95, liftGap: 8 }),
  // the same thrown hard
  mac60hard: () => fingerThenMomentum({ frame: 16.7, ramp: [20, 60, 140, 240, 320, 380], v0: 400, keep: 0.955, liftGap: 8 }),
  // macOS ProMotion, 120 Hz: half the delta per event, twice the events
  mac120hard: () => fingerThenMomentum({ frame: 8.33, ramp: [10, 30, 70, 120, 160, 190, 200, 200], v0: 200, keep: Math.sqrt(0.955), liftGap: 4 }),
  // Windows precision touchpad (Chrome): ~8 ms finger reports with fractional deltas, then Chrome's own fling per frame
  ptp: () => fingerThenMomentum({ frame: 8, ramp: [4.5, 12.25, 25.5, 41.75, 58, 66.5, 71.25, 73], v0: 150, keep: 0.93, liftGap: 12, round: false, floor: 0.5 }).map(([t, d], i, a) => [i >= 8 ? 8 * 8 + 12 + (i - 8) * 16.7 : t, d]),
  ptphard: () => fingerThenMomentum({ frame: 8, ramp: [10, 30, 60, 100, 140, 170, 190, 200], v0: 320, keep: 0.935, liftGap: 12, round: false, floor: 0.5 }).map(([t, d], i) => [i >= 8 ? 8 * 8 + 12 + (i - 8) * 16.7 : t, d]),
  /*
   * A WINDOWS MOUSE'S OWN DETENT: 100 px (R15, 2026-10-08). One alone is 0.11 of a stop, under landGesture's 0.12, so
   * it springs back — the user's decision is to keep that threshold (his mouse moves a stop per detent), so a lone
   * detent is SOFT here: it may move nothing, never more than one. Turned as a hand turns it, three detents in
   * 90 ms, it is one stop like every other shape.
   */
  notch100: () => [[0, 100]],
  roll100: () => [[0, 100], [45, 100], [90, 100]],
  // gesture2's own two (mouse free-spin coast; hard trackpad tail), on an exact clock this time
  coast: () => { const ev = []; let t = 0; for (let i = 0; i < 24; i++) { ev.push([t, 112]); t += 16 + Math.round(i * i * 0.58) } return ev },
  tail: () => {
    const ev = []; let t = 0
    for (const d of [180, 360, 460, 430]) { ev.push([t, d]); t += 10 }
    const decay = [340, 260, 200, 150, 115, 88, 66, 50, 38, 29, 22, 17, 13, 10, 7, 5, 4, 3, 2, 1]
    decay.forEach((d, i) => { ev.push([t, d]); t += 20 + i * 22 })
    return ev
  },
}

;(async () => {
  const b = await pw[engine === 'chrome' ? 'chromium' : 'webkit'].launch(engine === 'chrome' ? { channel: 'chrome' } : {})
  const ctx = await b.newContext({ viewport: { width: 1366, height: 768 } })
  const p = await ctx.newPage()
  const base = `http://127.0.0.1:${port}`
  await p.goto(`${base}/tr`, { waitUntil: 'networkidle' })
  await p.waitForFunction(() => window.__lab?.A.mode === 'index', null, { timeout: 40000 })
  const STOP = await stopsOf(p)
  const SPINE = (await p.evaluate(() => window.__lab.SPINE).catch(() => null)) || Object.keys(STOP).sort((a, b) => STOP[a] - STOP[b])
  const LAST = SPINE.length - 1
  const places = placesArg ? placesArg.split(',') : SPINE.filter((n) => n !== 'lab' && n !== 'rest')
  const shapes = shapesArg ? shapesArg.split(',') : Object.keys(SHAPES)
  const HAS_AXIS = new Set(['work', 'linefield', 'cross'])
  const SOFT = new Set(['notch100'])
  console.log(`== TRACKPAD  ${engine} :${port}  spine ${SPINE.join(' · ')}  runs ${RUNS}`)

  const posOf = () => p.evaluate(() => {
    const path = location.pathname, A = window.__lab?.A
    return { path, base: A?.base, wT: +(A?.wT ?? 0).toFixed(2), lfp: +(A?.lfp ?? -1).toFixed(3), csp: +(window.__lab?.csState?.()?.p ?? -1).toFixed(3) }
  })
  const pos = (s) => (/\/contact$/.test(s.path) ? LAST : /\/lab/.test(s.path) ? STOP.lab : s.base)
  const goTo = async (name) => {
    for (let attempt = 0; ; attempt++) {
      await p.goto(`${base}/tr`, { waitUntil: 'networkidle' })
      const up = await p.waitForFunction(() => window.__lab?.A.mode === 'index', null, { timeout: 40000 }).then(() => true, () => false)
      if (up) break
      console.log('  (boot retry)')
      if (attempt >= 2) throw new Error('runtime did not boot three times')
    }
    await sleep(2600)
    if (name !== 'name') { await p.evaluate((n) => window.__lab.go(window.__lab.STOP[n]), name); await sleep(2600) }
    await p.waitForFunction(() => { const A = window.__lab?.A; return !A || !A.hush || performance.now() >= A.hush }, null, { timeout: 8000 }).catch(() => {})
  }
  const play = (events, mode) => p.evaluate(({ events, mode }) => new Promise((res) => {
    const A = window.__lab.A, log = []
    const fire = (dy, due) => {
      const before = { gFrom: A.gFrom, gSpent: A.gSpent, gEnv: A.gEnv, gAt: A.gAt, base: A.base }
      const t = performance.now()
      document.body.dispatchEvent(new WheelEvent('wheel', { deltaY: dy, deltaMode: 0, bubbles: true, cancelable: true }))
      log.push({ t: +t.toFixed(1), late: +(t - due).toFixed(1), dy: +dy.toFixed(2), gap: +(t - before.gAt).toFixed(1), env: +before.gEnv.toFixed(3), spentB: before.gSpent, spentA: A.gSpent, opened: A.gFrom !== before.gFrom || (before.gSpent && !A.gSpent), base: A.base, pT: +A.pT.toFixed(3), gesture: A.gesture, minGap: Math.round(A.gMinGap), wT: +(A.wT ?? 0).toFixed(2), lfT: window.__lab.lf?.()?.drive?.target != null ? +window.__lab.lf().drive.target.toFixed(3) : null })
    }
    // frames, to see whether the page itself stalls while the stream arrives
    const frames = []; let last = performance.now(), on = true
    const raf = (n) => { if (n - last > 40) frames.push([+(last).toFixed(0), +(n - last).toFixed(0)]); last = n; if (on) requestAnimationFrame(raf) }
    requestAnimationFrame(raf)
    // and every place the index lands on, as it lands
    const lands = []; let lb = A.base
    const watch = setInterval(() => { if (A.base !== lb) { lands.push([+performance.now().toFixed(0), lb, A.base]); lb = A.base } }, 5)
    const t0 = performance.now() + 30
    let i = 0
    const tick = () => {
      const now = performance.now()
      let sum = 0, n = 0, due = 0
      while (i < events.length && t0 + events[i][0] <= now) {
        if (mode === 'queued') fire(events[i][1], t0 + events[i][0]); else { sum += events[i][1]; due = t0 + events[i][0] }
        i++; n++
      }
      if (mode !== 'queued' && n) fire(sum, due)
      if (i < events.length) setTimeout(tick, Math.max(0, t0 + events[i][0] - performance.now()))
      else setTimeout(() => { on = false; clearInterval(watch); res({ log, frames, lands, t0 }) }, 3200)
    }
    setTimeout(tick, 30)
  }), { events, mode })

  const tally = {}
  for (let run = 0; run < RUNS; run++) for (const shape of shapes) for (const name of places) for (const dir of [1, -1]) for (const mode of (!process.env.MODES || process.env.MODES === 'both' ? 'coalesced,queued' : process.env.MODES).split(',')) {
    if (!(name in STOP)) continue
    await goTo(name)
    const before = await posOf()
    const events = SHAPES[shape]().map(([t, d]) => [t, d * dir])
    const r = await play(events, mode)
    await sleep(400)
    const after = await posOf()
    const moved = pos(after) - pos(before)
    const atEnd = (dir > 0 && pos(before) >= LAST) || (dir < 0 && pos(before) <= 0)
    const ran = name === 'work' ? Math.abs(after.wT - before.wT) : name === 'cross' ? Math.abs(after.csp - before.csp) : Math.abs(after.lfp - before.lfp)
    const held = moved === 0 && HAS_AXIS.has(name) && ran > 0.2
    // and in the work field one throw is at most one work (R15, user decision 2026-10-08: as on the bench)
    const oneWork = name !== 'work' || ran <= 1.02
    const good = oneWork && Math.abs(moved) <= 1 && (SOFT.has(shape) || Math.abs(moved) === 1 || atEnd || held)
    const key = `${shape.padEnd(10)} ${dir > 0 ? 'down' : 'up  '} ${name.padEnd(9)} ${mode}`
    const t = (tally[key] ??= { n: 0, bad: 0, res: [] }); t.n++; if (!good) t.bad++; t.res.push(moved)
    const opens = r.log.filter((e) => e.opened)
    const stalls = r.frames.filter(([, d]) => d > 60)
    const line = `${good ? (SOFT.has(shape) && moved === 0 && !held ? 'soft' : 'ok  ') : oneWork ? 'OVER' : 'SKIP'} ${key}  ${pos(before)}→${pos(after)}${name === 'work' ? ` works ${before.wT}→${after.wT}` : ''}  events ${r.log.length}  opened ${opens.length}${opens.length ? ` @ ${opens.map((e) => `${Math.round(e.t - r.t0)}ms gap ${e.gap} dy ${e.dy} env ${e.env}${e.spentB ? ' spent' : ''}`).join(' | ')}` : ''}  lands ${r.lands.map(([t, a, b]) => `${Math.round(t - r.t0)}ms ${a}→${b}`).join(', ')}  stalls ${stalls.map(([t, d]) => `${Math.round(t - r.t0)}ms+${d}`).join(' ') || '-'}`
    console.log(line)
    if (LOG && !good) for (const e of r.log) console.log('     ', JSON.stringify({ ...e, t: Math.round(e.t - r.t0) }))
  }
  console.log('\n== summary')
  let bad = 0, n = 0
  for (const [k, v] of Object.entries(tally)) { n += v.n; bad += v.bad; if (v.bad) console.log(`  ${k}  ${v.bad}/${v.n}  moved ${v.res.join(',')}`) }
  console.log(`TRACKPAD ${engine} :${port}: ${bad ? `FAIL — ${bad} of ${n} throws did not move exactly one stop (or one work)` : `PASS — ${n} throws, each one stop (a lone 100 px detent at most one)`}`)
  process.exitCode = bad ? 1 : 0
  await b.close()
})().catch((e) => { console.error(String(e).slice(0, 600)); process.exit(1) })
