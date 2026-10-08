// ONE GESTURE = ONE MOVEMENT — inside a project, and on the index, however hard it is thrown.
//
//   node gesture2.cjs <port>
//
// The first two checks are the original ones: a trackpad swipe with its momentum tail moves one frame inside a
// project and one stop on the index. What follows is the case they never covered.
//
// WHAT WENT WRONG. A gesture was the interval between two 240 ms silences and its size was whatever the events in
// it added up to; snap() promoted that distance to as many stops as it covered. Measured on the built site, from
// the hero: ten 400 px notches thrown inside 80 ms arrived four places along, and twenty landed on Contact. So the
// rule held for every input anyone had tested and failed for the one input nobody had — a hard flick.
//
// So the flicks are here, at every place on the spine, in both directions, in the three shapes a hand can make:
// a burst of large deltas in almost no time, a trackpad-style push with a long decaying tail, and (in touch.cjs,
// which owns Chrome's touch pipeline) a hard finger flick. Each must move exactly one stop — or, in a place that
// has an axis of its own, move that axis and stay.
const pw = require('playwright')
const { stopsOf } = require('./stops.cjs')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const port = process.argv[2]
/*
 * FILTERS, so one suspicious cell can be re-run on its own as many times as it takes. The flick matrix is 4
 * shapes x 5 places x 2 directions and takes about 25 minutes; when a single case needs a verdict, repeating the
 * whole matrix buys nothing and costs the quiet machine time it does not have.
 *   node gesture2.cjs 4950 --shape=long --place=linefield --reps=10 --only-flicks
 */
const argOf = (k, d) => { const a = process.argv.find((x) => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d }
const ONLY_SHAPE = argOf('shape'), ONLY_PLACE = argOf('place')
const FLICK_REPS = +argOf('reps', '1')
const ONLY_FLICKS = process.argv.includes('--only-flicks')
let fails = 0
const ok = (c, l, x = '') => { if (!c) fails++; console.log(`  ${c ? 'ok  ' : 'FAIL'} ${l}${x ? ` — ${x}` : ''}`) }
const note = (l) => console.log(`       ${l}`)
const momentum = async (p, dir) => { for (const d of [6, 14, 26, 38, 44, 40, 34, 27, 21, 16, 12, 9, 7, 5, 4, 3, 2, 1]) { await p.mouse.wheel(0, d * dir); await sleep(16) } }

/*
 * THE FOUR SHAPES OF A HARD GESTURE. Each is one physical act, and each must therefore be one stop.
 *
 * `burst` is an angry flick on a notched wheel: large deltas at once, decaying, over before snap's silence has
 * even begun. This is the shape that used to carry the visitor from the hero to Contact.
 *
 * `coast` is a FREE-SPINNING wheel thrown hard, and it is the hardest case on this page. Its detents are one notch
 * each — full size, never decaying — and the GAPS between them grow as the wheel runs down. So no threshold on the
 * gap can tell its coast from a hand notching deliberately: any gap short enough to keep the site responsive is one
 * the coast eventually crosses, once per detent, all the way down the spine.
 *
 * `tail` is a trackpad thrown hard: a short violent push by the hand, then a long decay the hand is no longer
 * making. Its late events are separated by more than snap's 240 ms, which is what used to make one physical throw
 * count as several gestures — and, because snap moved base toward the target while the target damped back toward
 * base, made the landing oscillate (1, 2, 1, 2) and depend on when the tail happened to stop.
 *
 * `long` is one unbroken stream held far longer than any silence window: a second and a half at full cadence, so
 * that no fixed-duration answer can pass the other three and fail this. It is one stop for the same reason a long
 * finger drag is — the hand never let go. The counterpart, separate deliberate inputs that must each still be
 * obeyed, is the last section of this file.
 */
const FLICKS = {
  burst: async (p, dir) => {
    for (const d of [420, 420, 400, 360, 300, 240, 190, 150, 115, 90, 70, 54, 42, 32, 25, 19, 15, 11, 9, 7]) { await p.mouse.wheel(0, d * dir); await sleep(6) }
  },
  coast: async (p, dir) => {
    // 24 detents of one notch, the gaps growing as the wheel slows — 16 ms at the throw, 330 ms as it stops
    for (let i = 0; i < 24; i++) { await p.mouse.wheel(0, 112 * dir); await sleep(16 + Math.round(i * i * 0.58)) }
  },
  tail: async (p, dir) => {
    const push = [180, 360, 460, 430]
    const decay = [340, 260, 200, 150, 115, 88, 66, 50, 38, 29, 22, 17, 13, 10, 7, 5, 4, 3, 2, 1]
    for (const d of push) { await p.mouse.wheel(0, d * dir); await sleep(10) }
    for (let i = 0; i < decay.length; i++) { await p.mouse.wheel(0, decay[i] * dir); await sleep(20 + i * 22) }
  },
  long: async (p, dir) => { for (let i = 0; i < 90; i++) { await p.mouse.wheel(0, 300 * dir); await sleep(1) } },
}

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
/*
 * WHAT THE ENGINE ACTUALLY SAW, for a case that fails.
 *
 * This file drives the wheel through Playwright, one round trip per event, so the gaps the page receives are the
 * harness's own and grow with the machine's load — which is why its coast and tail cases have failed on some runs
 * and not others, and why that is recorded in docs/KNOWN-ISSUES.md. When a case overshoots, the question is
 * always the same: did the engine open a second gesture on a gap the WHEEL left, or on a gap the HARNESS left?
 * Two listeners answer it. Both only observe — nothing here dispatches, delays or swallows an event.
 *
 *   capture phase, before the engine's own handler: the state it is about to judge against
 *   bubble phase, registered after it: whether that judgement opened a gesture
 *
 * `quiet` is not read from the engine — it is a local there — but it is exactly `gap > GEST_STREAM`, and
 * GEST_STREAM is 120 ms, so the gap on the line tells you whether it was true.
 */
const GEST_STREAM_MS = 120
const installWatch = (pg) => pg.evaluate(() => {
  if (window.__gw) return
  window.__gw = []
  const A = () => window.__lab && window.__lab.A
  addEventListener('wheel', (e) => {
    const a = A(); if (!a) return
    window.__gw.push({ t: +performance.now().toFixed(1), dy: +e.deltaY.toFixed(1), gap: +(performance.now() - a.gAt).toFixed(1),
      env: +(a.gEnv ?? -1).toFixed(4), peak: +(a.gPeak ?? -1).toFixed(4), spent: !!a.gSpent, from: a.gFrom, base: a.base })
  }, { capture: true })
  addEventListener('wheel', () => {
    const a = A(), r = window.__gw[window.__gw.length - 1]; if (!a || !r) return
    r.opened = a.gFrom !== r.from || (r.spent && !a.gSpent)
    r.pT = +a.pT.toFixed(3)
  })
})
const takeWatch = async (pg) => { const r = await pg.evaluate(() => { const x = window.__gw || []; window.__gw = []; return x }).catch(() => []); return r }
const sayOpenings = (rec) => {
  const op = rec.filter((e) => e.opened)
  if (!op.length) return '  (no opening was observed)'
  return '  openings: ' + op.map((e, i) => `#${i + 1} dy ${e.dy} gap ${e.gap}ms ${e.gap > GEST_STREAM_MS ? 'QUIET-TRUE' : 'quiet-false'} env ${e.env} peak ${e.peak} env/peak ${e.peak > 0 ? (e.env / e.peak).toFixed(2) : '?'}${e.spent ? ' spent' : ''}`).join('  |  ')
    + `  ·  all gaps ${rec.slice(1).map((e) => Math.round(e.gap)).join(',')}`
}
;(async () => {
  const b = await pw.webkit.launch()
  const p = await (await b.newContext({ viewport: { width: 1366, height: 768 } })).newPage()
  await nav(p, `http://127.0.0.1:${port}/tr`)
  await p.waitForFunction(() => window.__lab?.A.mode === 'index', null, { timeout: 40000 }).catch(() => {})
  await sleep(3000)
  await installWatch(p)
  const STOP = await stopsOf(p)
  const SPINE = await p.evaluate(() => window.__lab.SPINE || null).catch(() => null)
  const LAST = (SPINE ? SPINE.length : Object.keys(STOP).length) - 1
  console.log(`== ONE GESTURE, ONE STOP   port ${port}   spine: ${SPINE ? SPINE.join(' · ') : '(not exposed)'}`)

  const st = () => p.evaluate(() => ({ mode: window.__lab.A.mode, k: window.__lab.A.k, wp: +window.__lab.A.wp.toFixed(2), base: window.__lab.A.base, wbase: window.__lab.A.wbase }))

  // ── the original two: a normal trackpad swipe, inside a project and on the index ──────────────────────────
  console.log('\n-- a normal trackpad swipe, with its tail')
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

  await nav(p, `http://127.0.0.1:${port}/tr`)
  await p.waitForFunction(() => window.__lab?.A.mode === 'index', null, { timeout: 40000 }).catch(() => {})
  await sleep(3000)
  const i0 = await st()
  await momentum(p, 1); await sleep(4200)
  const i1 = await st()
  ok(i1.base - i0.base === 1, 'one momentum gesture on the index moves exactly one stop', `${i0.base} → ${i1.base}`)

  /*
   * ── THE HARD FLICK ────────────────────────────────────────────────────────────────────────────────────────
   *
   * WHERE THE VISITOR IS is one number, and it has to be read from the place and not from the URL, because two
   * of the stops ARE routes: the Lab opens the bench and the last stop opens the Contact finale, and on both the
   * runtime is on screen but does not own it. So a position is the index stop when the index is showing, and the
   * stop those routes stand for when they are.
   */
  const LAB_STOP = STOP.lab
  const posOf = async (pg) => {
    const s = await pg.evaluate(() => ({ path: location.pathname, c2: document.documentElement.dataset.c2 ?? 'off', mode: window.__lab?.A?.mode ?? null, base: window.__lab?.A?.base ?? null, wT: +(window.__lab?.A?.wT ?? 0).toFixed(2), lfp: +(window.__lab?.A?.lfp ?? -1).toFixed(3), csx: window.__lab?.csState?.()?.x ?? null }))
    if (/\/contact$/.test(s.path)) return { ...s, pos: LAST }
    if (/\/lab$/.test(s.path)) return { ...s, pos: LAB_STOP }
    if (/\/lab\//.test(s.path)) return { ...s, pos: LAB_STOP }
    return { ...s, pos: s.base }
  }
  /*
   * A place is reached by name, through the same call the strip's controls make — and from a FRESH PAGE every time.
   * Reusing the page carried the work field's register over from the previous case, so "a hard flick up from Work"
   * was really "a hard flick up from Work with the field already at its last project" and the two read differently.
   * A check whose result depends on the case before it is not measuring what it says it is.
   */
  const goTo = async (name) => {
    await nav(p, `http://127.0.0.1:${port}/tr`)
    await p.waitForFunction(() => window.__lab?.A.mode === 'index', null, { timeout: 40000 }).catch(() => {})
    await sleep(2600)
    if (name !== 'name') { await p.evaluate((n) => window.__lab.go(window.__lab.STOP[n]), name); await sleep(2600) }
  }
  // the hush the Lab handover arms is not a gesture's business: it is cleared before a flick is judged
  const hushClear = async (pg) => { await pg.waitForFunction(() => { const A = window.__lab?.A; return !A || !A.hush || performance.now() >= A.hush }, null, { timeout: 8000 }).catch(() => {}) }

  // the places the index itself owns, named — never numbered (see CLAUDE.md)
  const PLACES = (SPINE || []).filter((n) => n !== 'lab' && n !== 'rest')
  // and the two that have an axis of their own: a flick may run the axis instead of leaving
  // (Cross Section, R14, has positions of its own: one flick inside it moves exactly ONE of them — its own rule)
  const HAS_AXIS = new Set(['work', 'linefield', 'cross'].filter((n) => STOP[n] !== undefined))

  for (const kind of ['burst', 'coast', 'tail', 'long']) {
    if (ONLY_SHAPE && ONLY_SHAPE !== kind) continue
    console.log(`\n-- a hard flick: ${kind}`)
    for (const name of PLACES) {
      if (ONLY_PLACE && ONLY_PLACE !== name) continue
      for (const dir of [1, -1]) {
       for (let rep = 0; rep < FLICK_REPS; rep++) {
        await goTo(name)
        await hushClear(p)
        const before = await posOf(p)
        await installWatch(p); await takeWatch(p)
        await FLICKS[kind](p, dir)
        await sleep(3200)
        const rec = await takeWatch(p)
        const after = await posOf(p)
        const moved = after.pos - before.pos
        const atEnd = (dir > 0 && before.pos >= LAST) || (dir < 0 && before.pos <= 0)
        const axis = HAS_AXIS.has(name)
        // what an axis carried, so that "it stayed" can be told from "nothing happened"
        const ran = name === 'work' ? Math.abs(after.wT - before.wT) : name === 'cross' ? Math.abs((after.csx ?? 0) - (before.csx ?? 0)) : Math.abs(after.lfp - before.lfp)
        const held = moved === 0 && axis && (name === 'cross' ? ran === 1 : ran > 0.2)
        const good = Math.abs(moved) <= 1 && (Math.abs(moved) === 1 || atEnd || held)
        const why = moved === 0 ? (atEnd ? 'the end of the spine' : held ? `stayed, and its own axis moved ${ran.toFixed(2)}` : axis && ran > 0 ? `stayed, but its own axis moved ${ran.toFixed(2)}${name === 'cross' ? ' (one position is the rule)' : ''}` : 'NOTHING MOVED') : `${moved > 0 ? '+' : ''}${moved}`
        ok(good, `${kind} ${dir > 0 ? 'down' : 'up  '} from ${name.padEnd(10)} ${before.pos} → ${after.pos}`, why)
        if (!good) console.log(`     ${sayOpenings(rec)}`)
       }
      }
    }

    /*
     * ── and from the bench, where the runtime is on screen but does not own it ──────────────────────────────
     * R7 (user decision 2026-10-02): the bench browses — a gesture moves it one study, and only past either end does
     * it carry on to the next place. It opens on 01, so a flick down must move it exactly one study (01 → 02,
     * still the bench) and a flick up must leave it for Work, one stop. One gesture, one study, one stop: the same rule.
     */
    const studyOf = (pg) => pg.evaluate(() => [...document.querySelectorAll('.lab-stage .rec')].findIndex((b) => b.getAttribute('aria-current') === 'true') + 1)
    for (const dir of [1, -1]) {
      await nav(p, `http://127.0.0.1:${port}/tr/lab`)
      await sleep(2400)
      await hushClear(p)
      const before = await posOf(p), s0 = await studyOf(p)
      await FLICKS[kind](p, dir)
      await sleep(3600)
      const after = await posOf(p)
      const moved = after.pos - before.pos
      const s1 = /\/lab$/.test(after.path) ? await studyOf(p) : null
      const good = dir > 0 ? moved === 0 && s0 === 1 && s1 === 2 : moved === -1
      ok(good, `${kind} ${dir > 0 ? 'down' : 'up  '} from the bench (01) ${dir > 0 ? `study ${s0} → ${s1}` : `${before.pos} → ${after.pos}`}`, `${dir > 0 ? 'one study' : 'one stop'}  ${after.path}`)
    }
  }
  // one cell, re-run on its own: the sections after this are the bench, the arrival and the cadences, and
  // repeating them ten times over says nothing about the case under the microscope
  if (ONLY_FLICKS) { console.log(`
GESTURE (flicks only): ${fails === 0 ? 'PASS' : `FAIL (${fails})`}`); await b.close(); process.exit(fails ? 1 : 0) }

  /*
   * ── AND THE ARRIVAL STAYS RESPONSIVE ──────────────────────────────────────────────────────────────────────
   *
   * A budget that absorbed everything for a second would pass every check above and ruin the site: a visitor who
   * arrives and means to carry on must be obeyed. So a deliberate second gesture, made as soon as the first has
   * landed, has to move the next stop — which is what the rise test in opensGesture() is for.
   */
  console.log('\n-- a deliberate second gesture, straight after arriving')
  for (const gap of [150, 300, 500]) {
    await goTo('name')
    await hushClear(p)
    const b0 = (await posOf(p)).pos
    await FLICKS.burst(p, 1)
    await sleep(gap)
    await FLICKS.burst(p, 1)
    await sleep(3200)
    const b1 = (await posOf(p)).pos
    ok(b1 - b0 === 2, `two hard flicks ${String(gap).padStart(3)} ms apart move two stops`, `${b0} → ${b1}`)
  }
  // and the same with a normal notch as the second gesture, which is the gentler version of the same question
  await goTo('name')
  await hushClear(p)
  const n0 = (await posOf(p)).pos
  await FLICKS.burst(p, 1)
  await sleep(500)
  await p.mouse.wheel(0, 130)
  await sleep(3200)
  const n1 = (await posOf(p)).pos
  ok(n1 - n0 === 2, 'a hard flick then one notch move two stops', `${n0} → ${n1}`)

  /*
   * ── NORMAL SCROLLING: ONE DELIBERATE NOTCH IS ONE STOP (R15, user decision 2026-10-08) ─────────────────────
   *
   * A gesture lands by its own travel, from where its target stood when it began, and lands past 0.10 of a stop
   * (91 px). So a notch is a stop at any pace a hand turns a wheel — 1400, 700 or 300 ms apart — while notches that
   * come faster than the landing (a roll, two detents 60 ms apart) are one gesture and one stop.
   *
   * WHAT THIS TABLE USED TO SAY. It asserted what origin/main did — 130 px notches 1400 / 700 / 300 ms apart moved
   * 3 / 2 / 1 — and read the shortfall as "part of a notch is spent on the arrival still settling". Traced in the
   * page it was worse: a notch made while the last arrival was under way was measured against the new base, read the
   * arrival's lag as its own travel, and landed BACKWARDS (300 ms: 0 → 1 → 0 → 1). And a Windows detent, 100 px, was
   * 0.11 of a stop, under the old 0.12, so alone it never moved at all (3 x 300 ms: 0 → 1 → 0; 3 x 1400 ms: 0).
   * On a build without the change these RHYTHM lines fail by design; that is the comparison, not a fault.
   */
  console.log('\n-- normal scrolling: one deliberate notch, one stop')
  for (const px of [130, 100]) {
    for (const [n, gap, expect] of [[1, 0, 1], [2, 60, 1], [3, 45, 1], [3, 300, 3], [3, 700, 3], [3, 1400, 3]]) {
      await goTo('name')
      await hushClear(p)
      const s0 = (await posOf(p)).pos
      for (let i = 0; i < n; i++) { await p.mouse.wheel(0, px); if (i < n - 1) await sleep(gap) }
      await sleep(2600)
      const s1 = (await posOf(p)).pos
      const label = `RHYTHM ${n} notch${n > 1 ? 'es' : ''} of ${px}px${n > 1 ? `, ${String(gap).padStart(4)} ms apart` : ''}`
      ok(s1 - s0 === expect, `${label}, move ${expect}`, `${s0} → ${s1}`)
    }
  }

  note(`${PLACES.length} places x 2 directions x 4 shapes, plus the bench, the arrival and normal scrolling`)
  await b.close()
  console.log(`\nGESTURE: ${fails === 0 ? 'PASS' : `FAIL (${fails})`}`)
  process.exit(fails ? 1 : 0)
})().catch((e) => { console.error(String(e).slice(0, 400)); process.exit(1) })
