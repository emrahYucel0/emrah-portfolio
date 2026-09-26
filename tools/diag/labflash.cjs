// THE RETIRED LAB VISUAL — is it on screen at any point of the four handoffs?
// Classified per frame from the runtime's own state, not from CSS: the retired composition is the one the Lab
// stop owns (IDX[4]) — visible whenever the surface is showing index position ~4 while C2 owns the screen.
// node labflash.cjs <port> [reduced] [locale]
const pw = require('playwright')
const sharp = require('sharp'), fs = require('fs')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const [port, motion, loc = 'tr'] = process.argv.slice(2)
const reduced = motion === 'reduced'
const tag = `${loc}${reduced ? '-reduced' : ''}`
fs.mkdirSync(`out/labflash/${tag}`, { recursive: true })

// sampled inside the page at animation-frame rate, so nothing between screenshots is missed
const WATCH = () => {
  window.__f = []
  const tick = () => {
    const A = window.__lab?.A
    const c2 = document.documentElement.dataset.c2 === 'on'
    const labLayerOn = !!document.querySelector('#ui .layer.lab.on')
    const capVisible = (() => { const e = document.querySelector('#ui .layer.lab .cap'); if (!e) return false; const r = e.getBoundingClientRect(); const cs = getComputedStyle(e.closest('.layer')); return r.width > 4 && +cs.opacity > 0.02 })()
    if (A) window.__f.push({
      t: Math.round(performance.now()), c2, mode: A.mode, base: A.base, p: +A.p.toFixed(3),
      // Being AT index 4 is allowed — it is the semantic Lab stop. What is not allowed is the retired ARTWORK:
      // the caption room and the opening that held it. So the test is whether the state the surface is drawing
      // at that position still carries them.
      atLab: c2 && A.mode === 'index' && Math.abs(A.p - 4) < 0.5,
      labArtwork: (() => {
        if (!(c2 && A.mode === 'index' && Math.abs(A.p - 4) < 0.5)) return false
        const st = window.__lab.IDX()[4]
        const feats = st.features ? (st.features.length ?? 0) : 0
        return feats > 0 || !!st.layout?.cap || st.beneath === 'pin'
      })(),
      labLayerOn, capVisible, path: location.pathname,
      bench: !!document.querySelector('.lab-stage'),
      // the document's own first-paint plate counts as a controlled visual, not as a blank screen
      plate: (() => { const e = document.getElementById('c2-plate'); return !!e && getComputedStyle(e).display !== 'none' })(),
    })
    requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
}

;(async () => {
  const b = await pw.webkit.launch()
  const ctx = await b.newContext({ viewport: { width: 1366, height: 768 }, reducedMotion: reduced ? 'reduce' : 'no-preference' })
  await ctx.addInitScript(WATCH)
  const p = await ctx.newPage()
  const settle = reduced ? 1600 : 5200
  const click = (s) => p.evaluate((x) => document.querySelector(x)?.click(), s)
  const reset = () => p.evaluate(() => { window.__f = [] })
  const frames = () => p.evaluate(() => window.__f)

  const report = async (label) => {
    const f = await frames()
    const lab = f.filter((r) => r.labArtwork || r.capVisible)
    // blank = nothing owns the screen: no C2 surface, no plate, no bench
    const blank = f.filter((r) => !r.c2 && !r.plate && !r.bench)
    const span = lab.length ? `${lab[0].t}→${lab.at(-1).t}ms` : '—'
    console.log(`  ${label.padEnd(16)} frames ${String(f.length).padStart(4)} | RETIRED LAB frames ${String(lab.length).padStart(3)} ${span} | at stop 4 ${f.filter((r) => r.atLab).length} | cap visible ${f.filter((r) => r.capVisible).length} | blank ${blank.length}`)
    return lab.length
  }

  console.log(`== ${reduced ? 'REDUCED' : 'NORMAL'} ${loc.toUpperCase()} — retired Lab visual during the four handoffs`)
  // A. WORK → LAB (the authored bridge)
  await p.goto(`http://127.0.0.1:${port}/${loc}`, { waitUntil: 'networkidle', timeout: 60000 })
  await p.waitForFunction(() => window.__lab?.A.mode === 'index', null, { timeout: 40000 }).catch(() => {})
  await sleep(settle)
  await click('#ui [data-go="work"]'); await sleep(settle)
  await reset()
  await click('#ui [data-go="lab"]')
  await p.waitForFunction(() => /\/lab$/.test(location.pathname), null, { timeout: 30000 }).catch(() => {})
  await sleep(1500)
  const a = await report('A Work → Lab')

  // B. CONTACT → LAB (travel up the index)
  await p.goto(`http://127.0.0.1:${port}/${loc}`, { waitUntil: 'networkidle' })
  await p.waitForFunction(() => window.__lab?.A.mode === 'index', null, { timeout: 40000 }).catch(() => {})
  await sleep(settle)
  await click('#ui [data-go="rest"]'); await sleep(settle)
  await reset()
  await p.mouse.wheel(0, -130)
  await p.waitForFunction(() => /\/lab$/.test(location.pathname), null, { timeout: 30000 }).catch(() => {})
  await sleep(1500)
  const bfr = await report('B Contact → Lab')

  // C / D. leaving the new Lab
  const leave = async (dy, label) => {
    await p.goto(`http://127.0.0.1:${port}/${loc}/lab`, { waitUntil: 'networkidle' })
    await sleep(1600)
    await reset()
    await p.mouse.wheel(0, dy)
    await p.waitForFunction(() => document.documentElement.dataset.c2 === 'on', null, { timeout: 30000 }).catch(() => {})
    await sleep(settle)
    return report(label)
  }
  const c = await leave(-130, 'C Lab → Work')
  const d = await leave(130, 'D Lab → Contact')

  // keep evidence of the worst case
  if (a + bfr + c + d > 0) {
    await p.goto(`http://127.0.0.1:${port}/${loc}`, { waitUntil: 'networkidle' })
    await p.waitForFunction(() => window.__lab?.A.mode === 'index', null, { timeout: 40000 }).catch(() => {})
    await sleep(settle)
    await click('#ui [data-go="rest"]'); await sleep(settle)
    await p.mouse.wheel(0, -130)
    for (let i = 0; i < 12; i++) { fs.writeFileSync(`out/labflash/${tag}/c2lab-${String(i).padStart(2, '0')}.png`, await p.screenshot()); await sleep(140) }
  }
  await b.close()
  console.log(`RETIRED LAB TOTAL: ${a + bfr + c + d} frames`)
})().catch((e) => { console.error(String(e).slice(0, 400)); process.exit(1) })
