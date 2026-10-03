// A MAC TRACKPAD'S SECOND SWIPE — fingers down kills the momentum, then a new swipe begins after a short silence.
//
//   node mactrack.cjs <port> [chrome|webkit] [places]
//
// WHY THIS SHAPE AND NOT trackpad.cjs's. trackpad.cjs plays a throw and lets its momentum run to the end. On a Mac
// that is only half of what a hand does: putting the fingers back down DURING momentum scrolling cancels the
// momentum at once — the system stops sending the fling — and then the new swipe's own events start after the
// short silence it takes to push. So the stream a second swipe really arrives in is:
//
//     [ finger push ][ momentum, CUT OFF mid-flight ][ silence ][ the new swipe's push + its own momentum ]
//
// and the question is whether that new swipe is heard, or absorbed into the throw it interrupted.
//
// WHAT THE RULE HAS TO SAY YES WITH (engine/c2/main.js). A gesture opens on a rise or on a gap:
//
//     perFrame = mag / clamp(gap / 16.7, 1, 8)
//     rise     = mag > 0.12 && perFrame > gEnv * 2.6 && gEnv < gPeak * 0.5
//     opens    = gSpent ? rise || gap > (stream ? 340 : 0) : rise || gap > 400
//
// Three things matter for a cut-off, and none of them is obvious:
//
//   THE ENVELOPE DOES NOT DECAY DURING SILENCE. It keeps 0.75 per EVENT, not per millisecond — a deliberate fix,
//   because a clock-decayed envelope called every event of a steady stream a new gesture. So a cut-off FREEZES the
//   envelope at the last momentum event's size, however long the hand then waits.
//   `gEnv < gPeak * 0.5` MEANS THE STREAM MUST HAVE DIED DOWN. Cut the momentum early and the envelope is still
//   more than half its peak, so no rise is possible at all, whatever the new swipe does.
//   THE FLOOR IS IN STOPS. 0.12 stops is about 109 px of wheel in one event, and a normal macOS swipe's biggest
//   event is about 44 px. A gentle swipe may therefore be unable to clear the floor however the envelope stands,
//   which would leave the gap as its only way in — and the gap thresholds are 340 ms and 400 ms.
//
// So the silences are chosen around those thresholds: 80, 150 and 250 ms are the ones a hand actually leaves, and
// 400 ms is just past the door. Everything the rule looks at is recorded at the new swipe's every event.
const pw = require('playwright')
const { stopsOf } = require('./stops.cjs')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const [port, engine = 'chrome', placesArg = ''] = process.argv.slice(2)
// filters, so one suspicious cell can be re-run on its own as many times as it takes:
//   node mactrack.cjs 4934 chrome name:1 --rate=120 --cut=1000 --silence=150 --reps=5 --log
const argOf = (k, d) => { const a = process.argv.find((x) => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d }
const ONLY_RATE = argOf('rate'), ONLY_CUT = argOf('cut'), ONLY_SIL = argOf('silence')
const REPS = +argOf('reps', '1')
const LOG = process.argv.includes('--log')
let fails = 0, issues = 0
const ok = (c, l, x = '') => { if (!c) fails++; console.log(`  ${c ? 'ok  ' : 'FAIL'} ${l}${x ? ` — ${x}` : ''}`) }

function fingerThenMomentum({ frame, ramp, v0, keep, liftGap = 0, round = true, floor = 1 }) {
  const ev = []; let t = 0
  for (const d of ramp) { ev.push([t, d]); t += frame }
  t += liftGap
  let v = v0
  while (Math.abs(v) >= floor) { ev.push([t, round ? Math.round(v) : +v.toFixed(3)]); v *= keep; t += frame }
  return ev
}
// the hard throw being interrupted, at both refresh rates
const THROW = {
  60: () => fingerThenMomentum({ frame: 16.7, ramp: [20, 60, 140, 240, 320, 380], v0: 400, keep: 0.955, liftGap: 8 }),
  120: () => fingerThenMomentum({ frame: 8.33, ramp: [10, 30, 70, 120, 160, 190, 200, 200], v0: 200, keep: Math.sqrt(0.955), liftGap: 4 }),
}
// a NORMAL deliberate swipe — the one a hand makes second. Its own momentum is included, because a real swipe has one.
const SWIPE = {
  60: () => fingerThenMomentum({ frame: 16.7, ramp: [6, 14, 26, 38, 44, 40], v0: 190, keep: 0.95, liftGap: 8 }),
  120: () => fingerThenMomentum({ frame: 8.33, ramp: [3, 7, 13, 19, 22, 22, 20, 20], v0: 95, keep: Math.sqrt(0.95), liftGap: 4 }),
}
const cutAt = (events, ms) => events.filter(([t]) => t <= ms)

/*
 * A NAVIGATION THAT MISSES ITS WINDOW IS NOT A RESULT. `networkidle` resolves here in about a second, measured —
 * but twice it threw during a long run and ended a 40-minute matrix at case 1, which reads as a failure and is
 * only load. `nav` retries three times and settles for `load`, because every caller waits for the runtime
 * explicitly on the next line anyway. Nothing about what is measured changes.
 */
const nav = async (pg, url, tries = 3) => {
  for (let i = 0; ; i++) {
    const ok = await pg.goto(url, { waitUntil: i === 0 ? 'networkidle' : 'load', timeout: 45000 }).then(() => true, () => false)
    if (ok) return
    if (i >= tries - 1) throw new Error('could not open ' + url + ' in ' + tries + ' tries')
  }
}
;(async () => {
  const b = await pw[engine === 'chrome' ? 'chromium' : 'webkit'].launch(engine === 'chrome' ? { channel: 'chrome' } : {})
  const ctx = await b.newContext({ viewport: { width: 1366, height: 768 } })
  const p = await ctx.newPage()
  const base = `http://127.0.0.1:${port}`
  const goTo = async (name) => {
    // A FRESH DOCUMENT PER CASE, deliberately. `A.gPeak` and `A.gEnv` outlive a gesture, and `gEnv < gPeak * 0.5`
    // is one of the three things a rise depends on, so a previous case's throw would decide this one's verdict.
    await nav(p, `${base}/tr`)
    await p.waitForFunction(() => window.__lab?.A.mode === 'index', null, { timeout: 40000 })
    await sleep(2600)
    if (name !== 'name') { await p.evaluate((n) => window.__lab.go(window.__lab.STOP[n]), name); await sleep(2600) }
    await p.waitForFunction(() => { const A = window.__lab?.A; return !A || !A.hush || performance.now() >= A.hush }, null, { timeout: 8000 }).catch(() => {})
  }
  await goTo('name')
  const STOP = await stopsOf(p)
  const SPINE = (await p.evaluate(() => window.__lab.SPINE).catch(() => null)) || Object.keys(STOP).sort((a, b) => STOP[a] - STOP[b])
  const LAST = SPINE.length - 1
  const PER_PX = await p.evaluate(() => {
    const A = window.__lab.A, p0 = A.pT
    document.body.dispatchEvent(new WheelEvent('wheel', { deltaY: 20, deltaMode: 0, bubbles: true, cancelable: true }))
    return +(Math.abs(A.pT - p0) / 20).toFixed(6)
  })
  console.log(`== MAC TRACKPAD, SECOND SWIPE AFTER A CUT-OFF  ${engine} :${port}`)
  console.log(`   spine ${SPINE.join(' · ')}`)
  console.log(`   1 px of wheel = ${PER_PX} stops, so the rule's floor of 0.12 stops is ${Math.round(0.12 / PER_PX)} px in one event`)

  /*
   * One run: the truncated throw, the silence, then the swipe — all on one clock, inside the page, coalescing
   * whatever fell due while the page was busy exactly as trackpad.cjs does.
   */
  const run = (throwEv, swipeEv, silence) => p.evaluate(({ throwEv, swipeEv, silence }) => new Promise((res) => {
    const A = window.__lab.A
    const log = []
    const fire = (dy, tag, n = 1) => {
      const pre = { from: A.gFrom, spent: A.gSpent, env: A.gEnv, peak: A.gPeak, at: A.gAt, base: A.base, minGap: A.gMinGap, pT: A.pT }
      const t = performance.now()
      const gap = t - pre.at
      document.body.dispatchEvent(new WheelEvent('wheel', { deltaY: dy, deltaMode: 0, bubbles: true, cancelable: true }))
      log.push({
        tag, t: +t.toFixed(1), dy: +dy.toFixed(2), gap: +gap.toFixed(1),
        env: +(pre.env ?? -1).toFixed(4), peak: +(pre.peak ?? -1).toFixed(4),
        fallen: pre.peak ? +(pre.env / pre.peak).toFixed(3) : null,
        spentB: pre.spent, minGap: Math.round(pre.minGap ?? -1),
        opened: A.gFrom !== pre.from || (pre.spent && !A.gSpent),
        base: A.base, pT: +A.pT.toFixed(3), pTb: +pre.pT.toFixed(3), n,
      })
    }
    let late = 0
    const lands = []; let lb = A.base
    const watch = setInterval(() => { if (A.base !== lb) { lands.push([+performance.now().toFixed(0), lb, A.base]); lb = A.base } }, 5)
    const t0 = performance.now() + 30
    const lastThrow = throwEv.length ? throwEv[throwEv.length - 1][0] : 0
    const swipeT0 = lastThrow + silence
    let i = 0, j = 0
    /*
     * EVERY DUE EVENT IS FIRED SEPARATELY, NEVER SUMMED.
     *
     * This loop used to add up whatever had fallen due and dispatch it as ONE wheel event. That is how two cases
     * in the first full run moved THREE stops, which the site cannot do from two gestures: `A.pT` is clamped to
     * `A.gFrom +/- 1` (main.js:587), so three stops needs three gesture openings, and the third one came from the
     * harness. A rise needs a single event over GEST_FLOOR = 0.12 stops = 109 px, and a real 120 Hz trackpad's
     * biggest event — including its own momentum — is 95 px = 0.105 stops, so a real 120 Hz stream can NEVER open
     * a gesture by rise. But five summed events of the swipe's ramp come to 110 px, which does clear it. Under the
     * scheduling jitter of a long run the tick fell behind, five or more events were summed into one super-event
     * no trackpad ever sends, and a spurious third gesture opened.
     *
     * Firing them separately keeps the device's own stream: if the harness is late the events arrive late, one by
     * one, exactly as a browser that queues them would deliver. `lateMax` records how far behind it ever got, so a
     * run that was badly delayed can be recognised instead of being read as a result.
     */
    const tick = () => {
      const now = performance.now()
      let n = 0
      while (i < throwEv.length && t0 + throwEv[i][0] <= now) {
        late = Math.max(late, now - (t0 + throwEv[i][0])); fire(throwEv[i][1], 'throw', 1); i++; n++
      }
      let m = 0
      while (j < swipeEv.length && t0 + swipeT0 + swipeEv[j][0] <= now) {
        late = Math.max(late, now - (t0 + swipeT0 + swipeEv[j][0])); fire(swipeEv[j][1], 'swipe', 1); j++; m++
      }
      if (i < throwEv.length || j < swipeEv.length) setTimeout(tick, 5)
      else setTimeout(() => { clearInterval(watch); res({ log, lands, t0, lastThrow, swipeT0, nThrow: throwEv.length, nSwipe: swipeEv.length, late: +late.toFixed(1) }) }, 3000)
    }
    setTimeout(tick, 30)
  }), { throwEv, swipeEv, silence })

  const places = placesArg ? placesArg.split(',').map((x) => { const [n, d] = x.split(':'); return [n, +d] }) : [['name', 1], ['creative', 1], ['creative', -1]]
  const CUTS = [300, 600, 1000]
  const SILENCES = [80, 150, 250, 400]
  const RATES = [60, 120]
  const table = []
  for (const [place, dir] of places) {
    if (!(place in STOP)) continue
    console.log(`\n-- ${place} ${dir > 0 ? 'down' : 'up'}  (one stop along is ${SPINE[STOP[place] + dir]})`)
    for (const rate of RATES) {
      if (ONLY_RATE && +ONLY_RATE !== rate) continue
      for (const cut of CUTS) {
        if (ONLY_CUT && +ONLY_CUT !== cut) continue
        for (const silence of SILENCES) {
          if (ONLY_SIL && +ONLY_SIL !== silence) continue
          for (let rep = 0; rep < REPS; rep++) {
          /*
           * A DESTINATION WITH AN INNER AXIS RUNS IT, AND THAT IS NOT "ABSORBED".
           * The Work field and the Linefield passage each run their own progress for a gesture before carrying on,
           * which is the site's rule. From Creative the second swipe's destination is Linefield, so the index
           * stays on the stop before it while the passage moves — and this file, which read only `A.base`, called
           * that absorbed. ptp2.cjs was taught this and mactrack was not: `creative down` scored 15/24 against
           * `name down` 22/24 for no reason to do with the floor. The axis is read now, so running it is told
           * apart from doing nothing.
           */
          await goTo(place)
          const b4 = await p.evaluate(() => ({ base: window.__lab.A.base, wT: +(window.__lab.A.wT ?? 0).toFixed(3), lfp: +(window.__lab.A.lfp ?? -1).toFixed(3) }))
          const from = b4.base
          const thrown = cutAt(THROW[rate](), cut).map(([t, d]) => [t, d * dir])
          const swiped = SWIPE[rate]().map(([t, d]) => [t, d * dir])
          const r = await run(thrown, swiped, silence)
          await sleep(300)
          const aft = await p.evaluate(() => ({ base: window.__lab.A.base, wT: +(window.__lab.A.wT ?? 0).toFixed(3), lfp: +(window.__lab.A.lfp ?? -1).toFixed(3) }))
          const after = aft.base
          const HAS_AXIS = new Set(['work', 'linefield'])
          const nextName = SPINE[from + dir]
          const axisRan = HAS_AXIS.has(nextName) && (nextName === 'work' ? Math.abs(aft.wT - b4.wT) > 0.02 : Math.abs(aft.lfp - b4.lfp) > 0.02)
          const sw = r.log.filter((e) => e.tag === 'swipe')
          const opened = sw.find((e) => e.opened)
          const first = sw[0]
          const moved = Math.abs(after - from) + (axisRan && Math.abs(after - from) === 1 ? 1 : 0)
          const atEnd = dir > 0 ? from + 2 > LAST : from - 2 < 0
          const landT = r.lands.length ? Math.round(r.lands[0][0] - r.t0) : null
          const heard = !!opened || axisRan
          const label = `${rate}Hz cut@${String(cut).padStart(4)}ms silence ${String(silence).padStart(3)}ms`
          const why = first
            ? `at its first event: gap ${first.gap}ms, mag ${(Math.abs(first.dy) * PER_PX).toFixed(3)} stops (floor 0.12), envelope ${first.env}`
              + `${first.fallen != null ? `, env/peak ${first.fallen} (must be under 0.5)` : ''}, spent ${first.spentB}`
            : '(no swipe event was played)'
          const opens = r.log.filter((e) => e.opened)
          const coal = { throw: r.log.filter((e) => e.tag === 'throw'), swipe: r.log.filter((e) => e.tag === 'swipe') }
          const worstThrow = Math.max(0, ...coal.throw.map((e) => e.n)), worstSwipe = Math.max(0, ...coal.swipe.map((e) => e.n))
          /*
           * WHAT SPACING THE PAGE ACTUALLY SAW. The 120 Hz fix turns on events arriving about 8.33 ms apart: that
           * is what lets the floor read them as a frame's worth. This harness dispatches from a setTimeout loop,
           * and under load it cannot hold 8 ms — the page then sees 16 ms gaps, the events read as one frame's
           * worth each, and the case fails for the harness's reason rather than the site's. The median gap among
           * the swipe's own events is therefore reported on every case, so the two can be told apart.
           */
          const swGaps = sw.map((e) => e.gap).filter((g) => g > 0).sort((a, b) => a - b)
          const medGap = swGaps.length ? swGaps[Math.floor(swGaps.length / 2)] : null
          const opensSaid = `  opened ${opens.length}x [${opens.map((e) => `${e.tag}@${Math.round(e.t - r.t0)}ms dy ${e.dy} gap ${e.gap} env ${e.env} env/peak ${e.fallen} n${e.n}`).join(' | ')}]`
            + `  dispatched ${coal.throw.length}/${r.nThrow} throw + ${coal.swipe.length}/${r.nSwipe} swipe events, never summed; the harness was at most ${r.late}ms late`
          const detail = `[median swipe gap ${medGap == null ? '?' : medGap.toFixed(1)}ms, meant to be ${rate === 120 ? '8.3' : '16.7'}] ${from}→${after} (moved ${moved}${axisRan ? `, the second ran ${nextName}'s own axis: ${b4.lfp} → ${aft.lfp}` : ''})  throw's last event +${Math.round(r.lastThrow)}ms, swipe began +${Math.round(r.swipeT0)}ms, stop announced ${landT == null ? 'after the run' : '+' + landT + 'ms'}  ·  ${heard ? `HEARD on swipe event ${sw.indexOf(opened) + 1} of ${sw.length}` : `ABSORBED in ${sw.length} events`}, ${why}`
          table.push({ place, dir, rate, cut, silence, heard, moved, atEnd })
          if (moved > 2 || LOG) console.log(`       ${opensSaid}`)
          if (LOG) for (const e of r.log) console.log(`         ${e.tag.padEnd(5)} +${String(Math.round(e.t - r.t0)).padStart(5)}ms dy ${String(e.dy).padStart(8)} n${e.n} gap ${String(e.gap).padStart(6)} env ${String(e.env).padStart(7)} peak ${String(e.peak).padStart(7)} fallen ${e.fallen} spent ${e.spentB} pT ${e.pTb}→${e.pT} base ${e.base}${e.opened ? '   <== OPENED' : ''}`)
          if (atEnd) { console.log(`  --   ${label}  ${detail}  (the spine ends here — not a verdict)`); continue }
          // The verdict is simply whether a deliberate swipe was heard. It is NOT asserted as a pass: the user
          // asked for this to be reported first, and changing nothing.
          if (heard && moved === 2) console.log(`  ok   ${label}  ${detail}`)
          else { issues++; console.log(`  !!   ${label}  ${detail}`) }
          }
        }
      }
    }
  }

  console.log('\n== was the second swipe heard?   rows = silence after the cut, columns = where the momentum was cut')
  for (const rate of RATES) {
    console.log(`  ${rate} Hz`)
    console.log(`     silence |  ${CUTS.map((c) => `cut@${c}ms`.padStart(9)).join(' ')}`)
    for (const silence of SILENCES) {
      const cells = CUTS.map((cut) => {
        const rows = table.filter((t) => t.rate === rate && t.cut === cut && t.silence === silence && !t.atEnd)
        if (!rows.length) return '        -'
        const h = rows.filter((t) => t.heard).length
        return `${h}/${rows.length} heard`.padStart(9)
      })
      console.log(`     ${String(silence).padStart(4)} ms |  ${cells.join(' ')}`)
    }
  }
  const judged = table.filter((t) => !t.atEnd)
  const unheard = judged.filter((t) => !t.heard)
  console.log(`\n   ${unheard.length} of ${judged.length} deliberate second swipes were absorbed into the throw they interrupted.`)
  if (unheard.length) {
    const byS = SILENCES.map((s) => `${s}ms: ${unheard.filter((t) => t.silence === s).length}/${judged.filter((t) => t.silence === s).length}`)
    console.log(`   by silence — ${byS.join(' · ')}`)
  }
  console.log(`\nMAC SECOND SWIPE: ${issues ? `${issues} cases where a deliberate swipe did not move a second stop` : 'every deliberate swipe was heard'}`)
  await b.close()
  process.exit(0)   // reporting harness: the verdict is the table, not an exit code
})().catch((e) => { console.error(String(e).slice(0, 700)); process.exit(1) })
