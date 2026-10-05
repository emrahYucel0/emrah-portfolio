// R20 — THE DRAWING RATIO: WHAT A FRAME COSTS AT EACH STEP, WHETHER THE STEPS COME AT REST, AND HOW THEY LOOK.
//
//   node r20.cjs <beforePort> <r20Port> [--cfg=WxH@dpr,...] [--only=before,natural,ladder,film] [--headed] [--out=dir]
//   (the cap is the R20 build's default; `natural` switches the adaptive ratio on in its page, __lab.ratioAdaptive)
//
// Per size, on this machine's GPU (the renderer the browser really used is printed):
//
//   before   today's build: the backing store, and a frame's cost on Full-Stack
//   natural  the R20 build left to itself: a transition Creative <-> Full-Stack every few seconds with rests between,
//            for up to 60 s, and the ratio's own record of every step it took (when, from what to what). For each step
//            the harness checks that the site was at rest at that moment (arrived, nothing in flight).
//   ladder   every level the R20 build can reach, forced one by one (__lab.ratioStep()): a frame's cost there, and a
//            still of the same region at 1:1 device pixels — what the screen shows, page capture only
//   film     the moment of a step: the region captured as fast as the page allows, a little before and after
//
// A frame's cost, two ways:
//   gpu   EXT_disjoint_timer_query_webgl2 around surface.render(): the GPU's own time for the frame (if exposed)
//   drawn the interval between frames the surface draws in a transition: what the visitor gets, and what R20's
//         own meter reads (headless, so not paced by this machine's display)
const pw = require('playwright')
const fs = require('node:fs')
const path = require('node:path')
const { execFileSync } = require('node:child_process')
const { guarded } = require('./quiet.cjs')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const args = process.argv.slice(2)
const [before, r20] = args.filter((a) => /^\d+$/.test(a))
const opt = (k, d) => { const a = args.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d }
const CONFIGS = opt('cfg', '2560x1440@1,2560x1440@2,3840x2160@2').split(',').map((s) => s.split(/[x@]/).map(Number))
const OUT = opt('out', path.join(__dirname, 'out', 'iq', 'r20'))
const ONLY = opt('only', 'before,natural,ladder,film').split(',')
fs.mkdirSync(OUT, { recursive: true })
const med = (a) => (a.length ? [...a].sort((x, y) => x - y)[a.length >> 1] : NaN)
const FFMPEG = (() => {
  const root = path.join(process.env.LOCALAPPDATA || '', 'ms-playwright')
  const dir = fs.existsSync(root) && fs.readdirSync(root).find((d) => d.startsWith('ffmpeg-'))
  const exe = dir && path.join(root, dir, 'ffmpeg-win64.exe')
  return exe && fs.existsSync(exe) ? exe : null
})()

async function open(b, port, W, H, dpr, q = '') {
  const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: dpr })
  const p = await ctx.newPage()
  await p.goto(`http://127.0.0.1:${port}/tr${q}`, { waitUntil: 'load', timeout: 120000 })
  await p.waitForFunction(() => window.__lab && window.__lab.A.mode === 'index' && !window.__lab.A.busy, null, { timeout: 120000 })
  await sleep(1500)
  return { ctx, p }
}
const go = (p, n) => p.evaluate((k) => window.__lab.go(window.__lab.STOP[k]), n)
const settle = (p) => p.waitForFunction(() => { const A = window.__lab.A; return A.mode === 'index' && !A.busy && A.p === A.base }, null, { timeout: 20000 })
// a frame's cost where the page stands: GPU timer around 40 renders, and the backing store
const cost = (p) => p.evaluate(async () => {
  const L = window.__lab, s = L.surface, gl = s.gl
  const raf = () => new Promise((r) => requestAnimationFrame(r))
  const ext = gl && gl.getExtension('EXT_disjoint_timer_query_webgl2')
  const out = { backing: [gl.drawingBufferWidth, gl.drawingBufferHeight], R: L.ratio ? L.ratio().R : L.V.dpr * L.V.u, gpu: null, renderer: '' }
  const dbg = gl.getExtension('WEBGL_debug_renderer_info')
  out.renderer = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : ''
  if (ext) {
    const t = []
    for (let i = 0; i < 40; i++) {
      const q = gl.createQuery()
      gl.beginQuery(ext.TIME_ELAPSED_EXT, q); s.render(); gl.endQuery(ext.TIME_ELAPSED_EXT)
      for (let k = 0; k < 30 && !gl.getQueryParameter(q, gl.QUERY_RESULT_AVAILABLE); k++) await raf()
      if (!gl.getParameter(ext.GPU_DISJOINT_EXT) && gl.getQueryParameter(q, gl.QUERY_RESULT_AVAILABLE)) t.push(gl.getQueryParameter(q, gl.QUERY_RESULT) / 1e6)
      gl.deleteQuery(q)
    }
    t.sort((a, b) => a - b)
    out.gpu = t.length ? t[t.length >> 1] : null
  }
  return out
})
// the interval between frames the surface actually draws, through four transitions Creative <-> Full-Stack: what the
// visitor gets in motion, and what R20's own meter judges (an animation frame that draws nothing is not counted)
const rafDuring = (p) => p.evaluate(async () => {
  const L = window.__lab, s = L.surface, raf = () => new Promise((r) => requestAnimationFrame(r))
  const o = s.render.bind(s)
  let last = 0
  const iv = []
  s.render = () => { o(); const t = performance.now(); if (last && t - last < 500) iv.push(t - last); last = t }
  for (let i = 0; i < 4; i++) {
    L.go(L.STOP[i % 2 ? 'system' : 'creative'])
    const t0 = performance.now()
    while (performance.now() - t0 < 6000) { await raf(); if (L.A.p === L.A.base && !L.A.busy) break }
    last = 0
    for (let k = 0; k < 10; k++) await raf()
  }
  s.render = o
  iv.sort((a, b) => a - b)
  return { n: iv.length, med: iv[iv.length >> 1] || NaN, p90: iv[Math.floor(iv.length * 0.9)] || NaN }
})
// the region the stills and the film show: a 360x200 CSS px window on Full-Stack's lower capsule edge and its rows
const region = (p) => p.evaluate(() => {
  const V = window.__lab.V, u = V.u
  return { x: Math.round(V.W * u * 0.5 - 180 * u), y: Math.round(V.H * u * 0.62 - 100 * u), width: Math.round(360 * u), height: Math.round(200 * u) }
})

;(async () => {
  const b = await pw.chromium.launch({ channel: 'chrome', headless: !args.includes('--headed') })
  const report = { when: new Date().toISOString(), sizes: [] }
  for (const [W, H, dpr] of CONFIGS) {
    const tag = `${W}x${H}@${dpr}`
    console.log(`== ${tag}`)
    const row = { size: tag }
    // ── before: today's build (each section waits for a quiet machine and is repeated if disturbed: quiet.cjs)
    if (ONLY.includes('before')) await guarded(`${tag} before`, async () => {
      const { ctx, p } = await open(b, before, W, H, dpr)
      await go(p, 'system'); await settle(p); await sleep(600)
      row.before = { ...(await cost(p)), raf: await rafDuring(p) }
      await go(p, 'system'); await settle(p); await sleep(600)
      const clip = await region(p)
      await p.screenshot({ path: path.join(OUT, `${tag}-before.png`), clip })
      console.log(`   before   ${row.before.backing.join('x')} (R ${row.before.R.toFixed(2)})  gpu ${row.before.gpu?.toFixed(1)} ms  drawn ${row.before.raf.med.toFixed(1)} / p90 ${row.before.raf.p90.toFixed(1)} ms (n ${row.before.raf.n})   [${row.before.renderer}]`)
      await ctx.close()
    })
    // ── natural: the R20 build on its own
    if (ONLY.includes('natural')) await guarded(`${tag} natural`, async () => {
      const { ctx, p } = await open(b, r20, W, H, dpr)
      await p.evaluate(() => window.__lab.ratioAdaptive(true))
      const t0 = await p.evaluate(() => performance.now())
      const start = await p.evaluate(() => window.__lab.ratio())
      // a watcher in the page records the site's state on every frame, so each step can be checked against it
      await p.evaluate(() => {
        const L = window.__lab, raf = () => new Promise((r) => requestAnimationFrame(r))
        window.__r20 = { log: [], n: 0 }
        ;(async () => {
          while (window.__r20) {
            const A = L.A, r = L.ratio()
            if (r.steps.length !== window.__r20.n) {
              window.__r20.n = r.steps.length
              const s = r.steps[r.steps.length - 1]
              window.__r20.log.push({ ...s, mode: A.mode, busy: A.busy, p: A.p, base: A.base, pT: A.pT })
            }
            await raf()
          }
        })()
      })
      const seen = []
      for (let i = 0; i < 12; i++) {
        await go(p, i % 2 ? 'creative' : 'system')
        await sleep(3500)
        const r = await p.evaluate(() => window.__lab.ratio())
        seen.push(r.R)
        if (r.done) break
      }
      const log = await p.evaluate(() => window.__r20.log)
      const end = await p.evaluate(() => window.__lab.ratio())
      row.natural = { start: start.R, end: end.R, done: end.done, steps: log.map((s) => ({ ...s, at: (s.at - t0) / 1000 })) }
      console.log(`   natural  R ${start.R.toFixed(2)} -> ${end.R.toFixed(2)}${end.done ? ' (at the floor)' : ''}; steps: ${row.natural.steps.map((s) => `${s.at.toFixed(1)} s ${s.from.toFixed(2)}->${s.to.toFixed(2)} [${s.mode}${s.busy ? ' BUSY' : ''}, p ${s.p} base ${s.base}]`).join('; ') || 'none'}`)
      await ctx.close()
    })
    // ── ladder: every level, forced, with its cost and a still
    if (ONLY.includes('ladder')) await guarded(`${tag} ladder`, async () => {
      // the default: the cap without the meter, so the page cannot step on its own before the first level is measured
      const { ctx, p } = await open(b, r20, W, H, dpr)
      row.ladder = []
      for (let lvl = 0; lvl < 6; lvl++) {
        await go(p, 'system'); await settle(p); await sleep(800)
        const c = await cost(p)
        const raf = await rafDuring(p)
        await go(p, 'system'); await settle(p); await sleep(800)
        const clip = await region(p)
        const file = `${tag}-R${c.R.toFixed(2)}.png`
        await p.screenshot({ path: path.join(OUT, file), clip })
        row.ladder.push({ R: c.R, backing: c.backing, gpu: c.gpu, raf, file })
        console.log(`   level ${lvl}  ${c.backing.join('x')} (R ${c.R.toFixed(2)}, ${(c.backing[0] * c.backing[1] / 1e6).toFixed(1)} Mpx)  gpu ${c.gpu?.toFixed(1)} ms  drawn ${raf.med.toFixed(1)} / p90 ${raf.p90.toFixed(1)} ms (n ${raf.n})`)
        const r = await p.evaluate(() => window.__lab.ratio())
        if (r.done) break
        await p.evaluate(() => window.__lab.ratioStep())
        await sleep(300)
        if ((await p.evaluate(() => window.__lab.ratio())).R >= c.R - 1e-3) break
      }
      await ctx.close()
    })
    // ── film: the first step, at 1:1, as fast as the page can be captured
    if (FFMPEG && ONLY.includes('film')) {
      const { ctx, p } = await open(b, r20, W, H, dpr)
      await go(p, 'system'); await settle(p); await sleep(800)
      const clip = await region(p)
      const dir = path.join(OUT, `${tag}-film`)
      fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir)
      const shots = []
      const t0 = Date.now()
      let stepped = false
      while (Date.now() - t0 < 3000) {
        if (!stepped && Date.now() - t0 > 1200) { stepped = true; await p.evaluate(() => window.__lab.ratioStep()) }
        shots.push(await p.screenshot({ clip, type: 'jpeg', quality: 92 }))
      }
      const fps = Math.max(2, Math.round(shots.length / 3))
      shots.forEach((s, i) => fs.writeFileSync(path.join(dir, `f${String(i).padStart(4, '0')}.jpg`), s))
      try {
        // Playwright's ffmpeg reads JPEGs from a pipe (it has no image-sequence input), as Playwright itself feeds it
        execFileSync(FFMPEG, ['-loglevel', 'error', '-y', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', 'pipe:0', '-c:v', 'vp8', '-b:v', '4M', path.join(OUT, `${tag}-step.webm`)], { input: Buffer.concat(shots) })
        row.film = `${tag}-step.webm (${shots.length} frames at ${fps} fps)`
      } catch (e) { row.film = `ffmpeg failed: ${String(e.message).slice(0, 120)}` }
      console.log(`   film     ${row.film}`)
      await ctx.close()
    }
    report.sizes.push(row)
  }
  fs.writeFileSync(path.join(OUT, `r20-${report.when.replace(/[:.]/g, '-')}.json`), JSON.stringify(report, null, 2))
  await b.close()
})().catch((e) => { console.error(e); process.exit(1) })
