// LAB HOME ON THE SPINE — leaving the bench by the site's own vertical grammar, and coming back.
// node spine.cjs <port> [reduced]
const pw = require('playwright')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const { stopsOf } = require('./stops.cjs')
const [port, motion] = process.argv.slice(2)
const reduced = motion === 'reduced'
const BASE = `http://127.0.0.1:${port}`
let fails = 0
const ok = (cond, label, extra = '') => { if (!cond) fails++; console.log(`  ${cond ? 'ok  ' : 'FAIL'} ${label}${extra ? ` — ${extra}` : ''}`) }

const state = () => {
  const A = window.__lab?.A
  return {
    path: location.pathname,
    c2: document.documentElement.dataset.c2 ?? 'off',
    mode: A?.mode ?? null, base: A?.base ?? null, p: A ? +A.p.toFixed(3) : null,
    bench: !!document.querySelector('.lab-stage'),
    study: !!document.querySelector('.study'),
    strip: !!document.querySelector('.lab-strip'),
    stripH: Math.round(document.querySelector('[data-strip]')?.getBoundingClientRect().height ?? 0),
    // one row: every control shares one vertical centre, and none of them reaches past the strip
    stripRows: (() => {
      const s = document.querySelector('.lab-strip')
      if (!s) return 0
      const mids = new Set([...s.querySelectorAll('a')].map((e) => { const r = e.getBoundingClientRect(); return Math.round((r.top + r.bottom) / 2 / 3) }))
      return mids.size
    })(),
    stripVar: getComputedStyle(document.body).getPropertyValue('--strip').trim(),
    docScroll: document.documentElement.scrollHeight > innerHeight + 4,
    overflowX: document.documentElement.scrollWidth > innerWidth + 1,
    footer: !!document.querySelector('footer'),
    header: !!document.querySelector('header.head'),
    labLinks: [...document.querySelectorAll('a')].filter((a) => /\/lab\/?$/.test(a.getAttribute('href') || '')).length,
  }
}

// travel is sampled while it happens, so "no flash through Name" is a measurement, not a hope
const watchP = () => {
  window.__seen = []
  clearInterval(window.__w)
  window.__w = setInterval(() => { const A = window.__lab?.A; if (A && document.documentElement.dataset.c2 === 'on') window.__seen.push(+A.p.toFixed(2)) }, 40)
}
const seen = () => { clearInterval(window.__w); return window.__seen || [] }

// LEAVING THE LAB ARMS A HUSH (main.js:269). The handover happens on the threshold, so the tail of the gesture that
// carried the visitor out arrives with no hand behind it; it is spent rather than obeyed, and it re-arms the hush for
// as long as it keeps coming. A harness that dispatches its next gesture inside that window has it swallowed — which
// is the product working as designed, not a defect. So every gesture waits for the hush to lapse first. This is why
// the old fixed 1600ms sleep passed: it was long enough to outlast the hush by accident.
const hushClear = async (pg) => {
  await pg.waitForFunction(() => { const A = window.__lab?.A; return !A || !A.hush || performance.now() >= A.hush },
    null, { timeout: 8000 }).catch(() => {})
}
const wheelBurst = async (p, dy, n, gap = 16) => { await hushClear(p); for (let i = 0; i < n; i++) { await p.mouse.wheel(0, dy); await sleep(gap) } }
// a Mac trackpad: a short push, then a long decaying tail the hand is no longer making
const momentum = async (p, dir) => {
  await hushClear(p)
  const push = [6, 14, 26, 38, 44, 40]
  const tail = [34, 27, 21, 16, 12, 9, 7, 5, 4, 3, 2, 2, 1, 1]
  for (const d of [...push, ...tail]) { await p.mouse.wheel(0, d * dir); await sleep(16) }
}
/*
 * THE BENCH BROWSES (R7, user decision 2026-10-02): a gesture on the bench moves one study, 01 → 02 → 03, and only
 * past the last does it carry on to Contact (past the first, up to Work). Every way down to the finale therefore
 * starts from 03: the bench is stepped there first, one deliberate gesture at a time, and the crossing is the
 * gesture that follows. A step is read back from the records themselves.
 */
const studyAt = (pg) => pg.evaluate(() => [...document.querySelectorAll('.lab-stage .rec')].findIndex((b) => b.getAttribute('aria-current') === 'true') + 1)
const toLastStudy = async (pg, finger) => {
  for (let i = 0; i < 2; i++) { if (finger) await swipe(pg, -220); else await wheelBurst(pg, 110, 1); await sleep(700) }
}
const swipe = async (p, dy) => {
  await hushClear(p)
  await p.evaluate(async (d) => {
    const x = Math.round(innerWidth / 2), y0 = Math.round(innerHeight * (d < 0 ? 0.72 : 0.3))
    const mk = (t, cy) => new PointerEvent(t, { pointerId: 9, pointerType: 'touch', isPrimary: true, clientX: x, clientY: cy, bubbles: true, cancelable: true })
    const wait = (ms) => new Promise((r) => setTimeout(r, ms))
    ;(document.elementFromPoint(x, y0) || document.body).dispatchEvent(mk('pointerdown', y0))
    for (let i = 1; i <= 14; i++) { window.dispatchEvent(mk('pointermove', Math.round(y0 + (d * i) / 14))); await wait(16) }
    window.dispatchEvent(mk('pointerup', y0 + d))
  }, dy)
}

;(async () => {
  const b = await pw.webkit.launch()
  const errs = [], csp = []
  const watch = (pg) => {
    pg.on('pageerror', (e) => errs.push(`${pg.url().replace(BASE, '')} :: ${String(e.message).slice(0, 110)}`))
    pg.on('console', (c) => { if (c.type() === 'error') { const t = `${pg.url().replace(BASE, '')} :: ${c.text().slice(0, 110)}`; (/Content Security/i.test(t) ? csp : errs).push(t) } })
    return pg
  }
  // mobile WebKit has no wheel at all, so the pointer tests and the wheel tests take the screen they belong to
  const phone = await b.newContext({ viewport: { width: 414, height: 896 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, reducedMotion: reduced ? 'reduce' : 'no-preference' })
  const desk = await b.newContext({ viewport: { width: 1366, height: 768 }, reducedMotion: reduced ? 'reduce' : 'no-preference' })
  const phonePage = watch(await phone.newPage())
  const deskPage = watch(await desk.newPage())
  let p = phonePage
  // A DESTINATION IS WAITED FOR, NOT SLEPT THROUGH. This used to sleep 1600ms in reduced motion and assert; but
  // handing the screen to the runtime takes 460ms from cold and as much as 1941ms under load, so the guess failed
  // here and on main at the same rate, for no reason to do with the site. Each arrival now waits for the composed
  // state with an explicit timeout, and its measured time is reported at the end.
  const ARRIVE_MS = 25000
  const arrivals = []
  const settleIndex = async (pg, wantPath, wantBase, label) => {
    const t0 = Date.now(); let reached = true
    // `base` is the stop being aimed at and is set the moment the gesture lands, so it is not arrival: `p` is still
    // travelling. Waiting on base alone returned about a second early, the next gesture fell inside the engine's
    // own input cooldown and was swallowed, and Contact → bench failed. Arrival is `p` and `pT` at the stop.
    await pg.waitForFunction(([pth, b]) => location.pathname === pth
      && document.documentElement.dataset.c2 === 'on'
      && !!window.__lab?.A && window.__lab.A.base === b && !window.__lab.A.busy
      && Math.abs(window.__lab.A.p - b) < 0.02 && Math.abs(window.__lab.A.pT - b) < 0.02,
    [wantPath, wantBase], { timeout: ARRIVE_MS }).catch(() => { reached = false })
    const t = Date.now() - t0
    arrivals.push(`${label.padEnd(34)} ${reached ? `${String(t).padStart(5)} ms` : `NEVER (gave up at ${ARRIVE_MS} ms)`}`)
    return reached
  }
  const settleBench = async (pg, wantPath, label) => {
    const t0 = Date.now(); let reached = true
    await pg.waitForFunction((pth) => location.pathname === pth && !!document.querySelector('.lab-stage'),
      wantPath, { timeout: ARRIVE_MS }).catch(() => { reached = false })
    const t = Date.now() - t0
    arrivals.push(`${label.padEnd(34)} ${reached ? `${String(t).padStart(5)} ms` : `NEVER (gave up at ${ARRIVE_MS} ms)`}`)
    return reached
  }

  // F2: down from the bench is the Contact finale, its own route — arrival is the finale running, at p = 0
  const settleFinale = async (pg, label) => {
    const t0 = Date.now(); let reached = true
    await pg.waitForFunction(() => location.pathname === '/tr/contact' && !!window.__finale, null, { timeout: ARRIVE_MS }).catch(() => { reached = false })
    arrivals.push(`${label.padEnd(34)} ${reached ? `${String(Date.now() - t0).padStart(5)} ms` : `NEVER (gave up at ${ARRIVE_MS} ms)`}`)
    await sleep(900)
    return reached
  }
  const finaleAt = () => ({ path: location.pathname, y: Math.round(scrollY), running: !!window.__finale })

  const fresh = async (path) => {
    await p.goto(BASE + path, { waitUntil: 'networkidle', timeout: 60000 })
    // on a C2 route the opening plays before the index can be travelled at all; the Lab has no such wait
    if (!/\/lab/.test(path)) await p.waitForFunction(() => window.__lab?.A.mode === 'index', null, { timeout: 30000 }).catch(() => {})
    await sleep(1500)
  }

  console.log(`== ${reduced ? 'REDUCED' : 'NORMAL'} — Lab Home as the fifth destination`)
  // the spine is read from a locale route: on /tr/lab the runtime is never started and cannot be asked
  await fresh('/tr')
  const STOP = await stopsOf(p)
  // above the bench: Work, or — with Cross Section on the spine (R14) — the passage, entered at DEPTH
  const UP = STOP.cross ?? STOP.work, UPN = STOP.cross != null ? 'Cross Section (DEPTH)' : 'Work'
  await fresh('/tr/lab')
  let s = await p.evaluate(state)
  ok(!s.docScroll, 'Lab Home does not scroll as a document', `scrollHeight vs viewport: ${s.docScroll ? 'taller' : 'exactly one screen'}`)
  ok(s.bench && !s.study, 'the bench owns the frame')
  ok(!s.footer && !s.header, 'no semantic Contact footer and no second header under the Lab')
  ok(s.strip && s.stripRows === 1, 'the Lab strip is one row', `rows ${s.stripRows}, height ${s.stripH}px, --strip ${s.stripVar}`)
  ok(!s.overflowX, 'no horizontal overflow')

  // ── wheel: up to Work, down to Contact, one gesture one stop ──────────────
  console.log('\n-- mouse wheel (desktop)')
  p = deskPage
  await fresh('/tr/lab')
  await p.evaluate(watchP)
  await wheelBurst(p, -110, 1)
  await settleIndex(p, '/tr', UP, 'wheel: Lab -> Work')
  s = await p.evaluate(state)
  let path1 = await p.evaluate(seen)
  ok(s.path === '/tr' && s.c2 === 'on' && s.base === UP, `Lab → ${UPN}`, `at ${s.path} c2 ${s.c2} mode ${s.mode} base ${s.base} p ${s.p}`)
  ok(!path1.some((v) => v < 2.5), 'no flash through Name on the way to Work', `p seen: ${Math.min(...path1)}…${Math.max(...path1)}`)

  await fresh('/tr/lab')
  ok((await studyAt(p)) === 1, 'the bench opens on 01')
  await wheelBurst(p, 110, 1); await sleep(700)
  ok((await studyAt(p)) === 2 && (await p.evaluate(state)).path === '/tr/lab', 'one notch down browses: 02, still on the bench')
  await wheelBurst(p, 110, 1); await sleep(700)
  ok((await studyAt(p)) === 3, 'and again: 03')
  await wheelBurst(p, 110, 1)
  await settleFinale(p, 'wheel: Lab (03) -> Contact finale')
  let f = await p.evaluate(finaleAt)
  ok(f.path === '/tr/contact' && f.running && f.y === 0, 'Lab → Contact: the finale, from its first frame', `at ${f.path} scrollY ${f.y}`)

  // ── trackpad momentum: the tail must not carry a second stop ──────────────
  console.log('\n-- trackpad momentum')
  await fresh('/tr/lab')
  await momentum(p, -1)
  await settleIndex(p, '/tr', UP, 'momentum: Lab -> Work')
  s = await p.evaluate(state)
  ok(s.path === '/tr' && s.base === UP, `Lab → ${UPN} (momentum) — one gesture, one stop`, `at ${s.path} c2 ${s.c2} base ${s.base} (wanted ${UP})`)
  await fresh('/tr/lab')
  await momentum(p, 1); await sleep(700)
  ok((await studyAt(p)) === 2, 'a momentum gesture down from 01 browses one study: 02')
  await momentum(p, 1); await sleep(700)
  await momentum(p, 1)
  await settleFinale(p, 'momentum: Lab (03) -> Contact finale')
  await sleep(600)
  f = await p.evaluate(finaleAt)
  ok(f.path === '/tr/contact' && f.y === 0, 'Lab → Contact (momentum) — one gesture, one stop: the tail does not scroll the finale', `at ${f.path} scrollY ${f.y}`)

  // ── touch swipe ───────────────────────────────────────────────────────────
  console.log('\n-- touch swipe (phone)')
  p = phonePage
  await fresh('/tr/lab')
  await swipe(p, 220)
  await settleIndex(p, '/tr', UP, 'swipe: Lab -> Work')
  s = await p.evaluate(state)
  ok(s.path === '/tr' && s.base === UP, `Lab → ${UPN} (swipe) — one gesture, one stop`, `at ${s.path} c2 ${s.c2} base ${s.base} (wanted ${UP})`)
  await fresh('/tr/lab')
  await toLastStudy(p, true)
  ok((await studyAt(p)) === 3, 'two swipes up: 03')
  await swipe(p, -220)
  await settleFinale(p, 'swipe: Lab (03) -> Contact finale')
  f = await p.evaluate(finaleAt)
  ok(f.path === '/tr/contact' && f.y === 0, 'Lab → Contact (swipe) — one gesture, one stop', `at ${f.path} scrollY ${f.y}`)

  // ── Contact → Lab, the reverse of the same grammar ─────────────────────────
  console.log('\n-- Contact → Lab')
  p = deskPage
  await fresh('/tr/lab')
  await toLastStudy(p, false)
  await wheelBurst(p, 110, 1)
  await settleFinale(p, 'wheel down to the Contact finale')
  ok((await p.evaluate(finaleAt)).y === 0, 'standing at the top of the finale')
  await sleep(500)
  await wheelBurst(p, -110, 1)
  await settleBench(p, '/tr/lab', 'Contact -> reverse -> bench')
  s = await p.evaluate(state)
  ok(s.path === '/tr/lab' && s.bench && (await studyAt(p)) === 3, 'Contact → reverse gesture → the bench, restored on 03', `at ${s.path}, study ${await studyAt(p)}`)

  // ── the Work → Lab bridge still ends at the bench ─────────────────────────
  console.log('\n-- Work → Lab bridge')
  p = phonePage
  await fresh('/tr')
  await p.evaluate(() => document.querySelector('#ui [data-go="work"]')?.click())
  await settleIndex(p, '/tr', STOP.work, 'nav control to Work')
  ok((await p.evaluate(state)).base === STOP.work, 'standing at Work')
  // with Cross Section on the spine (R14) the way is the passage: five swipes, one position each, then the bench
  let swipes = 0
  if (STOP.cross != null) {
    for (; swipes < 7 && !(await p.evaluate(() => /\/lab$/.test(location.pathname) && !document.documentElement.dataset.c2)); swipes++) { await swipe(p, -220); await sleep(2600) }
  } else { await swipe(p, -220); swipes = 1 }
  await settleBench(p, '/tr/lab', 'Work -> bench')
  s = await p.evaluate(state)
  ok(s.path === '/tr/lab' && s.bench && swipes === (STOP.cross != null ? 5 : 1), `Work → ${STOP.cross != null ? 'Cross Section → ' : 'bridge → '}the bench`, `at ${s.path}, ${swipes} swipe(s)`)

  // ── history ───────────────────────────────────────────────────────────────
  console.log('\n-- browser history')
  p = deskPage
  await fresh('/tr/lab')
  await wheelBurst(p, -110, 1); await settleIndex(p, '/tr', UP, 'wheel to Work (history setup)')
  await p.goBack(); await settleBench(p, '/tr/lab', 'Back -> bench')
  s = await p.evaluate(state)
  ok(s.path === '/tr/lab' && s.bench, 'one Back returns to the bench', `at ${s.path}`)
  await p.goForward(); await settleIndex(p, '/tr', UP, 'Forward -> Work')
  s = await p.evaluate(state)
  ok(s.path === '/tr' && s.base === UP, 'Forward restores Work', `base ${s.base}`)

  // bench → study → Back → bench → reverse gesture → Work
  await fresh('/tr/lab')
  await p.evaluate(() => document.querySelector('.lab-stage .open-link')?.click())
  await p.waitForFunction(() => /\/lab\/(weight|line|tone)$/.test(location.pathname), null, { timeout: 20000 }).catch(() => {})
  await sleep(1500)
  const study = await p.evaluate(state)
  ok(study.study && study.docScroll && study.c2 === 'off', 'the study is a document again', `${study.path} scrolls ${study.docScroll}`)
  await p.goBack(); await settleBench(p, '/tr/lab', 'study -> Back -> bench')
  s = await p.evaluate(state)
  ok(s.path === '/tr/lab' && s.bench && !s.docScroll, 'Back → the bench, and it does not scroll')
  await wheelBurst(p, -110, 1); await settleIndex(p, '/tr', UP, 'bench -> wheel -> Work')
  s = await p.evaluate(state)
  ok(s.path === '/tr' && s.base === UP, 'and the site grammar resumes: → Work', `base ${s.base}`)

  // ── a study owns its scroll, and never navigates ───────────────────────────
  console.log('\n-- the studies keep their scroll')
  p = deskPage
  for (const id of ['weight', 'line', 'tone']) {
    await fresh(`/tr/lab/${id}`)
    const h = await p.evaluate(() => document.documentElement.scrollHeight)
    await p.mouse.wheel(0, 600); await sleep(700)
    const mid = await p.evaluate(() => Math.round(scrollY))
    await p.evaluate((y) => scrollTo(0, y), h)
    await sleep(700)
    const end = await p.evaluate(state)
    await p.evaluate(() => scrollTo(0, 0)); await sleep(600)
    const back = await p.evaluate(() => Math.round(scrollY))
    ok(mid > 100 && end.path === `/tr/lab/${id}` && back === 0, `${id}: scrolls, stays, reverses`, `mid ${mid}px, back ${back}px`)
    ok(!end.overflowX, `${id}: no horizontal overflow`)
  }

  // ── one Lab control, not two ──────────────────────────────────────────────
  await fresh('/tr/lab/weight')
  const nav = await p.evaluate(() => {
    const vis = (e) => { const r = e.getBoundingClientRect(), cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.display !== 'none' && cs.visibility !== 'hidden' }
    const all = [...document.querySelectorAll('a, button')]
    return {
      toLab: all.filter((a) => /\/lab\/?$/.test(a.getAttribute('href') || '') && vis(a)).length,
      hiddenBack: !!document.querySelector('.study .back') && !vis(document.querySelector('.study .back')),
      focusable: all.filter((e) => vis(e)).length,
    }
  })
  ok(nav.toLab === 1, 'exactly one visible control returns to the Lab', `found ${nav.toLab}`)
  ok(!nav.hiddenBack, "the study's own return is the visible one control to the Lab")

  console.log(`\n-- measured arrival times (${reduced ? 'REDUCED' : 'NORMAL'}) -- how long each destination took to compose`)
  for (const a of arrivals) console.log(`  ${a}`)
  console.log(`\n  console errors ${errs.length} | CSP ${csp.length} ${JSON.stringify([...errs, ...csp].slice(0, 2))}`)
  if (errs.length || csp.length) fails++
  await b.close()
  console.log(`\nSPINE: ${fails === 0 ? 'PASS' : `FAIL (${fails})`}`)
  process.exit(fails ? 1 : 0)
})().catch((e) => { console.error(String(e).slice(0, 600)); process.exit(1) })
