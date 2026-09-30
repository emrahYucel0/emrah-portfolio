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
  await settleIndex(p, '/tr', STOP.work, 'wheel: Lab -> Work')
  s = await p.evaluate(state)
  let path1 = await p.evaluate(seen)
  ok(s.path === '/tr' && s.c2 === 'on' && s.base === STOP.work, 'Lab → Work', `at ${s.path} c2 ${s.c2} mode ${s.mode} base ${s.base} p ${s.p}`)
  ok(!path1.some((v) => v < 2.5), 'no flash through Name on the way to Work', `p seen: ${Math.min(...path1)}…${Math.max(...path1)}`)

  await fresh('/tr/lab')
  await p.evaluate(watchP)
  await wheelBurst(p, 110, 1)
  await settleIndex(p, '/tr', STOP.rest, 'wheel: Lab -> Contact')
  s = await p.evaluate(state)
  path1 = await p.evaluate(seen)
  ok(s.path === '/tr' && s.base === STOP.rest, 'Lab → Contact', `at ${s.path} c2 ${s.c2} mode ${s.mode} base ${s.base} p ${s.p}`)
  ok(!path1.some((v) => v < 4.5), 'no flash through Name on the way to Contact', `p seen: ${Math.min(...path1)}…${Math.max(...path1)}`)

  // ── trackpad momentum: the tail must not carry a second stop ──────────────
  console.log('\n-- trackpad momentum')
  for (const [dir, want, label] of [[-1, STOP.work, 'Lab → Work'], [1, STOP.rest, 'Lab → Contact']]) {
    await fresh('/tr/lab')
    await momentum(p, dir)
    await settleIndex(p, '/tr', want, `momentum: ${label}`)
    s = await p.evaluate(state)
    ok(s.path === '/tr' && s.base === want, `${label} (momentum) — one gesture, one stop`, `at ${s.path} c2 ${s.c2} base ${s.base} (wanted ${want})`)
  }

  // ── touch swipe ───────────────────────────────────────────────────────────
  console.log('\n-- touch swipe (phone)')
  p = phonePage
  for (const [dy, want, label] of [[220, STOP.work, 'Lab → Work'], [-220, STOP.rest, 'Lab → Contact']]) {
    await fresh('/tr/lab')
    await swipe(p, dy)
    await settleIndex(p, '/tr', want, `swipe: ${label}`)
    s = await p.evaluate(state)
    ok(s.path === '/tr' && s.base === want, `${label} (swipe) — one gesture, one stop`, `at ${s.path} c2 ${s.c2} base ${s.base} (wanted ${want})`)
  }

  // ── Contact → Lab, the reverse of the same grammar ─────────────────────────
  console.log('\n-- Contact → Lab')
  p = deskPage
  await fresh('/tr/lab')
  await wheelBurst(p, 110, 1)
  await settleIndex(p, '/tr', STOP.rest, 'wheel down to Contact')
  ok((await p.evaluate(state)).base === STOP.rest, 'standing at Contact')
  await wheelBurst(p, -110, 1)
  await settleBench(p, '/tr/lab', 'Contact -> reverse -> bench')
  s = await p.evaluate(state)
  ok(s.path === '/tr/lab' && s.bench, 'Contact → reverse gesture → the bench, restored', `at ${s.path}`)

  // ── the Work → Lab bridge still ends at the bench ─────────────────────────
  console.log('\n-- Work → Lab bridge')
  p = phonePage
  await fresh('/tr')
  await p.evaluate(() => document.querySelector('#ui [data-go="work"]')?.click())
  await settleIndex(p, '/tr', STOP.work, 'nav control to Work')
  ok((await p.evaluate(state)).base === STOP.work, 'standing at Work')
  await swipe(p, -220)
  await settleBench(p, '/tr/lab', 'Work -> bridge -> bench')
  s = await p.evaluate(state)
  ok(s.path === '/tr/lab' && s.bench, 'Work → bridge → the bench', `at ${s.path}`)

  // ── history ───────────────────────────────────────────────────────────────
  console.log('\n-- browser history')
  p = deskPage
  await fresh('/tr/lab')
  await wheelBurst(p, -110, 1); await settleIndex(p, '/tr', STOP.work, 'wheel to Work (history setup)')
  await p.goBack(); await settleBench(p, '/tr/lab', 'Back -> bench')
  s = await p.evaluate(state)
  ok(s.path === '/tr/lab' && s.bench, 'one Back returns to the bench', `at ${s.path}`)
  await p.goForward(); await settleIndex(p, '/tr', STOP.work, 'Forward -> Work')
  s = await p.evaluate(state)
  ok(s.path === '/tr' && s.base === STOP.work, 'Forward restores Work', `base ${s.base}`)

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
  await wheelBurst(p, -110, 1); await settleIndex(p, '/tr', STOP.work, 'bench -> wheel -> Work')
  s = await p.evaluate(state)
  ok(s.path === '/tr' && s.base === STOP.work, 'and the site grammar resumes: → Work', `base ${s.base}`)

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
