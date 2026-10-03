// A FREE-SPINNING MOUSE WHEEL, COASTING DOWN — one physical gesture whose gaps grow past every quiet threshold.
//
//   node freespin.cjs <port> [chrome|webkit] [places] [--reps=n] [--log]
//
// THE CASE THIS EXISTS FOR. R28 added `quiet = gap > GEST_STREAM` to opensGesture: a stream that has STOPPED has
// died down, whatever its last size was, because the envelope only decays per event and a Mac's fingers-down cut
// freezes it mid-fall. A free-spinning wheel is the one stream that can reach that threshold without having
// stopped. Its detents are full-size notches — each one clears GEST_FLOOR on its own, unlike a trackpad's small
// deltas — and as the wheel slows the gaps between them grow, so late in a single coast they pass 120 ms while
// the hand has done nothing at all. If `quiet` let one of those notches open a gesture, one spin of the wheel
// would walk the visitor down the spine, which is the exact fault the one-gesture-one-stop rule was built to stop.
//
// So: constant notch size (a detent is a fixed amount of wheel, it is the RATE that falls), gaps growing
// geometrically from about 10 ms to a stated end gap, across the notch sizes a real wheel sends and the end gaps
// that bracket GEST_STREAM, GEST_REST and GEST_GAP. Every case must move EXACTLY ONE STOP.
//
// Events are dispatched one at a time and never summed — summing is how an earlier harness manufactured a
// "super-event" no device sends (see mactrack.cjs) — and the gaps the page actually received are reported, since
// a harness that cannot hold its own timing cannot answer this question.
const pw = require('playwright')
const { stopsOf } = require('./stops.cjs')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const [port, engine = 'chrome', placesArg = ''] = process.argv.slice(2)
const argOf = (k, d) => { const a = process.argv.find((x) => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d }
const REPS = +argOf('reps', '1')
const ONLY_NOTCH = argOf('notch'), ONLY_GAP = argOf('gap')
/*
 * A RUN THE HARNESS DID NOT KEEP TIME FOR IS NOT A FREE SPIN. If the dispatch loop falls far behind, the page
 * sees a hole the wheel never left — one run stalled 830 ms and the page received a 989 ms gap, which is past
 * GEST_GAP (400 ms), so a second gesture opened on the GAP rule exactly as it should for a wheel that has stopped.
 * That says nothing about a coasting wheel. Beyond this much lateness the case is reported as NOT MEASURED, the
 * way seam.cjs declines a crossing whose first frame never arrived, rather than counted as an overshoot.
 */
const LATE_LIMIT = +argOf('late', '120')
const LOG = process.argv.includes('--log')
let fails = 0
const table = []

const NOTCHES = [100, 120, 150]
/*
 * END GAPS, INCLUDING ONES PAST THE REST THRESHOLD. The first four bracket GEST_STREAM (120 ms). The last three
 * are past GEST_REST (340 ms) and GEST_GAP (400 ms), because the final detents of a real free spin can arrive
 * that slowly — and at that point the rule opens a gesture on the GAP, which has nothing to do with R28. Whether
 * that is right is a separate question from this release: a wheel still turning at one detent every 600 ms is
 * barely turning at all, and the report says how long after the throw the extra stop lands.
 */
const END_GAPS = [150, 200, 250, 300, 350, 450, 600]
const N = 22                      // detents in one spin
const G0 = 10                     // and the spacing it starts at, near the top of the spin

/** one coast: constant notch, gap growing geometrically from G0 to endGap over N detents */
function coast(notch, endGap) {
  const ev = []
  let t = 0
  for (let i = 0; i < N; i++) {
    ev.push([t, notch])
    const g = G0 * Math.pow(endGap / G0, i / (N - 1))
    t += g
  }
  return ev
}

;(async () => {
  const b = await pw[engine === 'chrome' ? 'chromium' : 'webkit'].launch(engine === 'chrome' ? { channel: 'chrome' } : {})
  const ctx = await b.newContext({ viewport: { width: 1366, height: 768 } })
  const p = await ctx.newPage()
  const base = `http://127.0.0.1:${port}`
  const goTo = async (name) => {
    // `networkidle` on a loaded machine can miss its window and throw, which ends a 60-case run at case 14 for a
    // reason that has nothing to do with the site. Three tries, and `load` is enough: the runtime is waited for
    // explicitly on the line below anyway.
    for (let attempt = 0; ; attempt++) {
      const up = await p.goto(`${base}/tr`, { waitUntil: 'load', timeout: 45000 })
        .then(() => p.waitForFunction(() => window.__lab?.A.mode === 'index', null, { timeout: 40000 }).then(() => true, () => false))
        .catch(() => false)
      if (up) break
      if (attempt >= 2) throw new Error('the runtime did not boot in three tries')
      console.log('  (boot retry)')
    }
    await sleep(2600)
    if (name !== 'name') { await p.evaluate((n) => window.__lab.go(window.__lab.STOP[n]), name); await sleep(2600) }
    await p.waitForFunction(() => { const A = window.__lab?.A; return !A || !A.hush || performance.now() >= A.hush }, null, { timeout: 8000 }).catch(() => {})
  }
  await goTo('name')
  const STOP = await stopsOf(p)
  const SPINE = (await p.evaluate(() => window.__lab.SPINE).catch(() => null)) || Object.keys(STOP).sort((a, b) => STOP[a] - STOP[b])
  const LAST = SPINE.length - 1
  const HAS_AXIS = new Set(['work', 'linefield'])
  console.log(`== FREE-SPINNING WHEEL, COASTING DOWN  ${engine} :${port}`)
  console.log(`   spine ${SPINE.join(' · ')}`)
  console.log(`   ${N} detents, spacing ${G0}ms growing to the stated end gap; GEST_STREAM is 120ms, GEST_REST 340ms, GEST_GAP 400ms`)

  const run = (events) => p.evaluate(({ events }) => new Promise((res) => {
    const A = window.__lab.A
    const log = []
    let late = 0
    const fire = (dy) => {
      const pre = { from: A.gFrom, spent: A.gSpent, env: A.gEnv, peak: A.gPeak, at: A.gAt }
      const t = performance.now()
      const gap = t - pre.at
      document.body.dispatchEvent(new WheelEvent('wheel', { deltaY: dy, deltaMode: 0, bubbles: true, cancelable: true }))
      log.push({ t: +t.toFixed(1), dy, gap: +gap.toFixed(1), env: +(pre.env ?? -1).toFixed(4), peak: +(pre.peak ?? -1).toFixed(4),
        opened: A.gFrom !== pre.from || (pre.spent && !A.gSpent), base: A.base, pT: +A.pT.toFixed(3) })
    }
    const lands = []; let lb = A.base
    const watch = setInterval(() => { if (A.base !== lb) { lands.push([+performance.now().toFixed(0), lb, A.base]); lb = A.base } }, 5)
    const t0 = performance.now() + 30
    let i = 0
    const tick = () => {
      const now = performance.now()
      while (i < events.length && t0 + events[i][0] <= now) { late = Math.max(late, now - (t0 + events[i][0])); fire(events[i][1]); i++ }
      if (i < events.length) setTimeout(tick, 3)
      else setTimeout(() => { clearInterval(watch); res({ log, lands, t0, late: +late.toFixed(1) }) }, 3200)
    }
    setTimeout(tick, 30)
  }), { events })

  const places = placesArg ? placesArg.split(',').map((x) => { const [n, d] = x.split(':'); return [n, +d] })
    : [['name', 1], ['creative', 1], ['system', 1], ['system', -1], ['creative', -1]]

  for (const [place, dir] of places) {
    if (!(place in STOP)) continue
    console.log(`\n-- ${place} ${dir > 0 ? 'down' : 'up'}  (one stop along is ${SPINE[STOP[place] + dir] || 'the end'})`)
    for (const notch of NOTCHES) {
      if (ONLY_NOTCH && +ONLY_NOTCH !== notch) continue
      for (const endGap of END_GAPS) {
        if (ONLY_GAP && +ONLY_GAP !== endGap) continue
        for (let rep = 0; rep < REPS; rep++) {
          await goTo(place)
          const b4 = await p.evaluate(() => ({ base: window.__lab.A.base, wT: +(window.__lab.A.wT ?? 0).toFixed(3), lfp: +(window.__lab.A.lfp ?? -1).toFixed(3) }))
          const r = await run(coast(notch, endGap).map(([t, d]) => [t, d * dir]))
          await sleep(300)
          const aft = await p.evaluate(() => ({ base: window.__lab.A.base, wT: +(window.__lab.A.wT ?? 0).toFixed(3), lfp: +(window.__lab.A.lfp ?? -1).toFixed(3) }))
          const nextName = SPINE[b4.base + dir]
          const axisRan = HAS_AXIS.has(nextName) && (nextName === 'work' ? Math.abs(aft.wT - b4.wT) > 0.02 : Math.abs(aft.lfp - b4.lfp) > 0.02)
          const moved = Math.abs(aft.base - b4.base)
          const atEnd = dir > 0 ? b4.base >= LAST : b4.base <= 0
          const opens = r.log.filter((e) => e.opened)
          // ONE SPIN IS ONE GESTURE: exactly one stop, or none at an end, or none while it runs an inner axis
          const good = moved === 1 || (moved === 0 && (atEnd || axisRan))
          const kept = r.late <= LATE_LIMIT
          if (!kept) { console.log(`  --   ${place.padEnd(9)} ${dir > 0 ? 'down' : 'up  '} notch ${String(notch).padStart(3)}px  end gap ${String(endGap).padStart(3)}ms  NOT MEASURED — the harness fell ${r.late}ms behind, so the page saw a hole the wheel never left (moved ${moved})`); continue }
          if (!good) fails++
          // the first event's "gap" is the time since A.gAt was initialised, which is not a gap at all
          const gaps = r.log.slice(1).map((e) => e.gap).filter((g) => g > 0)
          const label = `${place.padEnd(9)} ${dir > 0 ? 'down' : 'up  '} notch ${String(notch).padStart(3)}px  end gap ${String(endGap).padStart(3)}ms`
          const detail = `${b4.base}→${aft.base} (moved ${moved}${axisRan ? `, ran ${nextName}'s axis` : ''})`
            + `  opened ${opens.length}x`
            + `  gaps the page saw ${Math.round(Math.min(...gaps))}-${Math.round(Math.max(...gaps))}ms, harness at most ${r.late}ms late`
            + (!good && r.lands.length > 1 ? `  EXTRA STOP at +${Math.round(r.lands[1][0] - r.t0)}ms from the first detent (${r.lands.map((l) => `${Math.round(l[0] - r.t0)}ms ${l[1]}>${l[2]}`).join(', ')})` : '')
            + (opens.length > 1 ? `  OPENINGS AFTER THE FIRST: ${opens.slice(1).map((e) => `+${Math.round(e.t - r.t0)}ms dy ${e.dy} gap ${e.gap}ms env ${e.env} peak ${e.peak}`).join(' | ')}` : '')
          console.log(`  ${good ? 'ok  ' : 'OVER'} ${label}  ${detail}`)
          if (LOG && !good) for (const e of r.log) console.log(`        +${String(Math.round(e.t - r.t0)).padStart(5)}ms dy ${e.dy} gap ${String(e.gap).padStart(6)} env ${String(e.env).padStart(8)} peak ${String(e.peak).padStart(8)} base ${e.base} pT ${e.pT}${e.opened ? '   <== OPENED' : ''}`)
          table.push({ place, dir, notch, endGap, moved, good, opens: opens.length })
        }
      }
    }
  }

  console.log('\n== how many stops one spin moved, by notch size and end gap  (1 is right; the spine ends count as 0)')
  console.log(`     end gap |${NOTCHES.map((n) => `${n}px`.padStart(10)).join('')}`)
  for (const endGap of END_GAPS) {
    const cells = NOTCHES.map((notch) => {
      const sub = table.filter((t) => t.notch === notch && t.endGap === endGap)
      const bad = sub.filter((t) => !t.good).length
      return (bad ? `${bad} OVER` : `${sub.length}/${sub.length} ok`).padStart(10)
    })
    console.log(`     ${String(endGap).padStart(4)} ms |${cells.join('')}`)
  }
  const over = table.filter((t) => !t.good)
  console.log(`\nFREE SPIN: ${fails === 0 ? `PASS — ${table.length} spins, each one stop` : `FAIL — ${over.length} of ${table.length} spins opened a second stop`}`)
  await b.close()
  process.exit(fails ? 1 : 0)
})().catch((e) => { console.error(String(e).slice(0, 700)); process.exit(1) })
