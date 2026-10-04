// THE FULL HUMAN JOURNEY — every step of it, in both languages and both motion settings.
// At each step: what the visitor can read (scanned for undefined/null/NaN), where they are, and whether the
// runtime or the document owns the screen.
// node journey.cjs <port> [locale] [reduced]
const pw = require('playwright')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const { stopsOf } = require('./stops.cjs')
const [port, loc = 'tr', motion = 'normal'] = process.argv.slice(2)
const reduced = motion === 'reduced'
const BASE = `http://127.0.0.1:${port}`
let fails = 0
const bad = (m) => { fails++; console.log(`  FAIL ${m}`) }
const LITERAL = /\b(undefined|null|NaN|\[object Object\])\b/

;(async () => {
  const b = await pw.webkit.launch()
  const ctx = await b.newContext({ viewport: { width: 1366, height: 768 }, reducedMotion: reduced ? 'reduce' : 'no-preference' })
  const p = await ctx.newPage()
  // ONE KNOWN BENIGN WARNING, and only this exact one. WebKit reports it when a ResizeObserver callback cannot be
  // delivered within the loop budget; nothing is broken and nothing the visitor sees changes. The bench's callback
  // was made to defer its measurement to the next frame (LabBench.vue), so this should now be rare — it is counted
  // and printed so a return is visible, but it does not fail the run. EVERY other console message still does.
  const BENIGN = ['ResizeObserver loop completed with undelivered notifications']
  const errs = [], warned = []
  const note = (t) => (BENIGN.some((b) => String(t).includes(b)) ? warned : errs).push(String(t))
  p.on('pageerror', (e) => note(e.message))
  p.on('console', (m) => { if (m.type() === 'error') note(m.text()) })

  const state = () => p.evaluate(() => ({
    path: location.pathname,
    c2: document.documentElement.dataset.c2 ?? 'off',
    base: window.__lab?.A?.base ?? null,
    mode: window.__lab?.A?.mode ?? null,
    bench: !!document.querySelector('.lab-stage'),
    study: !!document.querySelector('.study'),
    back: !!document.querySelector('.study .back'),
    labControls: [...document.querySelectorAll('a[href$="/lab"]')].filter((e) => e.offsetParent !== null || e.getClientRects().length).length,
    finale: !!window.__finale,
    y: Math.round(scrollY),
    text: document.body.innerText,
    // R7: which study the bench is on (1–3), read from its records
    benchStudy: [...document.querySelectorAll('.lab-stage .rec')].findIndex((b) => b.getAttribute('aria-current') === 'true') + 1,
  }))
  const click = (sel) => p.evaluate((s) => document.querySelector(s)?.click(), sel)

  // A DESTINATION IS WAITED FOR, NOT SLEPT THROUGH (as in spine.cjs). The Lab and the Contact finale are routes
  // without the runtime, so the journey's first return to it after a study was loaded directly — now Lab → Work,
  // since F2 moved Contact off the runtime — is a COLD boot: 3.3 s unloaded in headless WebKit, 8–9 s under load
  // (measured 2026-09-29). A fixed 4.2 s sleep failed there under the gate's load. Each step now waits for its
  // expected state (up to 25 s), never less than the old settle time, and reports how long it took.
  const step = async (label, act, expect) => {
    if (act) await act()
    const t0 = Date.now()
    await sleep(reduced ? 2600 : 4200)
    let s = await state()
    while (expect && !expect(s) && Date.now() - t0 < 25000) { await sleep(300); s = await state() }
    const took = Date.now() - t0
    if (took > (reduced ? 2900 : 4500)) console.log(`  (${label}: arrived after ${took} ms)`)
    const hits = (s.text.match(LITERAL) || [])
    const where = s.c2 === 'on' ? `base ${s.base}` : s.bench ? 'bench' : s.study ? 'study' : s.finale ? `finale y ${s.y}` : '—'
    console.log(`  ${label.padEnd(22)} ${s.path.padEnd(18)} ${where}  ${hits.length ? 'LITERALS' : 'clean'}`)
    if (hits.length) bad(`${label}: ${hits.slice(0, 3).join(', ')}`)
    if (expect && !expect(s)) bad(`${label}: unexpected state ${JSON.stringify({ path: s.path, base: s.base, bench: s.bench, study: s.study })}`)
    return s
  }

  console.log(`\n== JOURNEY ${loc.toUpperCase()} ${reduced ? 'REDUCED' : 'NORMAL'}`)
  await p.goto(`${BASE}/${loc}`, { waitUntil: 'networkidle', timeout: 60000 })
  await p.waitForFunction(() => window.__lab?.A.mode === 'index', null, { timeout: 40000 }).catch(() => {})
  const STOP = await stopsOf(p)
  await step('Hero', null, (s) => s.base === STOP.name)
  await step('Creative', () => click('#ui [data-go="creative"]'), (s) => s.base === STOP.creative)
  await step('Full-Stack', () => click('#ui [data-go="system"]'), (s) => s.base === STOP.system)
  await step('Work', () => click('#ui [data-go="work"]'), (s) => s.base === STOP.work)
  // with Cross Section on the spine (R14) the strip's LAB is a jump past the passage, as it was past the bridge
  await step(STOP.cross != null ? '→ Lab (the strip, past Cross Section)' : '→ Lab (bridge)', async () => {
    await click('#ui [data-go="lab"]')
    await p.waitForFunction(() => /\/lab$/.test(location.pathname), null, { timeout: 25000 }).catch(() => {})
  }, (s) => s.bench)
  for (const id of ['weight', 'line', 'tone']) {
    await step(`→ ${id.toUpperCase()}`, async () => { await p.goto(`${BASE}/${loc}/lab/${id}`, { waitUntil: 'networkidle' }) }, (s) => s.study && s.back && s.labControls === 1)
    await step(`${id} → Lab`, () => click('.study .back'), (s) => s.bench)
  }
  // F2: down from the bench is the Contact finale's own route, from its first frame — Contact is no longer an
  // index stop, so there is no stop number left here to name
  await step('→ Contact', () => p.mouse.wheel(0, 130), (s) => s.c2 === 'off' && s.finale && s.path === `/${loc}/contact` && s.y === 0)
  await step('→ Lab', async () => {
    await p.mouse.wheel(0, -130)
    await p.waitForFunction(() => /\/lab$/.test(location.pathname), null, { timeout: 25000 }).catch(() => {})
  }, (s) => s.bench && s.benchStudy === 3)
  // R7: the bench browses — up out of the finale it stands on 03, and the way up to Work is 02, 01, then Work
  await step('Lab: 02', () => p.mouse.wheel(0, -130), (s) => s.bench && s.benchStudy === 2)
  await step('Lab: 01', () => p.mouse.wheel(0, -130), (s) => s.bench && s.benchStudy === 1)
  // and up from 01 is the place above the bench: Work, or — with Cross Section — the passage, entered at DEPTH
  if (STOP.cross != null) await step('→ Cross Section (DEPTH)', () => p.mouse.wheel(0, -130), (s) => s.c2 === 'on' && s.base === STOP.cross)
  else await step('→ Work', () => p.mouse.wheel(0, -130), (s) => s.c2 === 'on' && s.base === STOP.work)
  await step('→ About', () => click('#ui [data-go="about"]'), (s) => s.c2 === 'on')
  await step('→ back to Hero', () => click('#ui [data-go="name"]'), (s) => s.base === STOP.name)

  console.log(`  errors ${errs.length} ${JSON.stringify([...new Set(errs)].slice(0, 2))}`)
  if (warned.length) console.log(`  benign warnings ${warned.length} ${JSON.stringify([...new Set(warned)].slice(0, 1))} — counted, not a failure`)
  if (errs.length) fails++
  await b.close()
  console.log(`JOURNEY ${loc.toUpperCase()} ${reduced ? 'REDUCED' : 'NORMAL'}: ${fails === 0 ? 'PASS' : `FAIL (${fails})`}`)
  process.exit(fails ? 1 : 0)
})().catch((e) => { console.error(String(e).slice(0, 300)); process.exit(1) })
