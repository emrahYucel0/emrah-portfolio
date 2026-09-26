// EVERY LINE OF A PROJECT'S TITLE, THROUGHOUT ITS OPENING: inside its panel, and readable against what is
// actually behind it.
//
// Why per LINE and per PIXEL. An earlier check measured the median luminance under the whole block. That passes
// while one line of the description sits outside the panel on the cream ground, and while a row rule runs straight
// through another line — the median stays dark because most of the block is. So:
//
//   * each line box is taken separately, from a Range over the text (getClientRects gives one rect per line);
//   * the background is measured with the type HIDDEN, so "the pixels actually behind it" are exactly that and
//     nothing has to be inferred about which pixels are ink;
//   * contrast is the WCAG ratio against every background pixel in the line box, not an average, so a rule
//     crossing a line is counted rather than averaged away.
//
// How it samples. Geometry is recorded inside the page every 25ms; frames come from a CDP screencast rather than
// page.screenshot, which needed 250-550ms per frame and could not get near the cadence this has to hit. Chrome,
// because that is where the composition was reported broken.
//
// node panelfit.cjs <port> [label] [sizes] [locales] [projects]
//   sizes 1920x1080,1440x900,1280x720   locales tr,en   projects 0,1,2
const pw = require('playwright')
const sharp = require('sharp')
const fs = require('fs')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const [port, label = 'run', sizeArg = '1920x1080,1440x900,1280x720', locArg = 'tr,en', projArg = '0,1,2'] = process.argv.slice(2)
const SIZES = sizeArg.split(',').map((s) => s.split('x').map(Number))
const LOCS = locArg.split(',')
const PROJS = projArg.split(',').map(Number)
const NAMES = ['Istanbul', 'Ege', 'Evden']
const AA = 4.5
// The brief asks for at least every 50ms through the first 1.5s. The title's own reveal is a 0.2s delay plus a
// 0.55s fade that only begins once the world has arrived — about 1.8s on a cold open — so a window ending at 1.5s
// would sample nothing but an invisible block. This runs to 2.6s, covering the whole reveal.
const UNTIL = 2600
const FAIL_FRACTION = 0.02   // up to 2% of a line's background may fail, for antialiasing at the glyph edges

const srgb = (c) => { const v = c / 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }
const lumOf = (r, g, b) => 0.2126 * srgb(r) + 0.7152 * srgb(g) + 0.0722 * srgb(b)
const ratio = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)

// one rect per rendered line, for every element that carries the title's words
const READ = `() => {
  const el = document.querySelector('.wb.on') || document.querySelector('.wb[data-f="0"]')
  if (!el) return null
  const panel = el.getBoundingClientRect()
  const col = (getComputedStyle(el).color.match(/[\\d.]+/g) || [255,255,255]).map(Number)
  const lines = []
  for (const kid of el.querySelectorAll('h2, p, span, li')) {
    if (!kid.textContent.trim()) continue
    if (kid.querySelector('h2, p, span, li')) continue
    const rng = document.createRange(); rng.selectNodeContents(kid)
    for (const r of rng.getClientRects()) {
      if (r.width < 4 || r.height < 4) continue
      lines.push({ x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height), text: kid.textContent.trim().slice(0,28) })
    }
  }
  return { op: +getComputedStyle(el).opacity, cls: el.className.replace(' on','').trim(),
    panel: { x: Math.round(panel.left), y: Math.round(panel.top), w: Math.round(panel.width), h: Math.round(panel.height) },
    col, lines }
}`

;(async () => {
  const b = await pw.chromium.launch({ channel: 'chrome' })
  const problems = []
  let samplesTaken = 0, worstGap = 0
  const allGaps = []
  const shownGaps = []
  const dir = `out/panelfit/${label}`
  fs.mkdirSync(dir, { recursive: true })

  for (const [W, H] of SIZES) {
    for (const loc of LOCS) {
      for (const k of PROJS) {
        const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 })
        const p = await ctx.newPage()
        await p.goto(`http://127.0.0.1:${port}/${loc}`, { waitUntil: 'networkidle', timeout: 60000 })
        await p.waitForFunction(() => window.__lab?.A.mode === 'index', null, { timeout: 40000 })
        await sleep(2200)
        await p.evaluate(() => document.querySelector('#ui [data-go="work"]').click())
        await p.waitForFunction(() => window.__lab.A.base === 3 && !window.__lab.A.busy, null, { timeout: 20000 }).catch(() => {})
        await sleep(2200)
        await p.evaluate((i) => document.querySelector(`#ui [data-work="${i}"]`)?.click(), k)
        await p.waitForFunction((i) => window.__lab.A.wLocked === i && window.__lab.WORKS()[i]?.fill > 0.5 && !window.__lab.A.busy, k, { timeout: 25000 })
        await sleep(400)
        // The type is hidden for the whole pass, so every frame IS the background behind it and nothing has to be
        // guessed. Layout is untouched: visibility:hidden keeps every box exactly where it is.
        await p.addStyleTag({ content: '#ui .wb { visibility: hidden !important; }' })

        const cdp = await ctx.newCDPSession(p)
        const frames = []
        let t0 = Date.now()
        // ack immediately and do no work in the handler: awaiting the ack here serialised the stream and the gap
        // between frames blew out to 490ms, far short of the cadence this has to sample at
        cdp.on('Page.screencastFrame', (f) => {
          frames.push({ at: Date.now() - t0, buf: Buffer.from(f.data, 'base64') })
          cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {})
        })
        await p.evaluate((src) => {
          window.__read = new Function(`return (${src})()`)
          window.__rec = []
          window.__recT0 = performance.now()
          window.__recI = setInterval(() => {
            const m = window.__read()
            window.__rec.push({ t: Math.round(performance.now() - window.__recT0), m })
          }, 25)
        }, READ)
        // PNG over CDP is ~1.5MB a frame at this size and the stream fell to ~10fps; the page itself paints at ~75fps
        // (measured), so the encoder was the limit, not the renderer. JPEG at 92 keeps the stream near the paint
        // rate. The luminance error it introduces is a level or two — irrelevant here, where failures land near
        // 2:1 and passes near 6:1, nowhere near the 4.5:1 line.
        await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, everyNthFrame: 1 })

        t0 = Date.now()
        await p.evaluate((i) => { window.__recT0 = performance.now(); document.querySelector(`#ui [data-work="${i}"]`)?.click() }, k)
        while (Date.now() - t0 < UNTIL) await sleep(20)
        await cdp.send('Page.stopScreencast').catch(() => {})
        await p.evaluate(() => clearInterval(window.__recI))
        const rec = (await p.evaluate(() => window.__rec)).filter((e) => e.m)

        const gaps = []
        for (let i = 1; i < frames.length; i++) gaps.push(frames[i].at - frames[i - 1].at)
        gaps.sort((a, c) => a - c)
        if (gaps.length && gaps[gaps.length - 1] > worstGap) worstGap = gaps[gaps.length - 1]
        allGaps.push(...gaps)

        const tag = `${NAMES[k]} ${W}x${H} ${loc}`
        let worstHere = { r: 99, at: 0, text: '' }, outside = 0, shown = 0
        let prevShownAt = null
        for (const shot of frames) {
          let m = null, best = 1e9
          for (const e of rec) { const d = Math.abs(e.t - shot.at); if (d < best) { best = d; m = e.m } }
          if (!m || !m.lines.length || best > 60) continue
          samplesTaken++
          if (m.op <= 0.05) continue
          shown++
          // the cadence that matters is between the frames actually being asserted on — the long gaps are startup
          // latency before the stream warms up, while the block is still invisible and there is nothing to read
          if (prevShownAt !== null) shownGaps.push(shot.at - prevShownAt)
          prevShownAt = shot.at
          const textLum = lumOf(m.col[0], m.col[1], m.col[2])
          const { data, info } = await sharp(shot.buf).raw().toBuffer({ resolveWithObject: true })
          const ch = info.channels
          for (const L of m.lines) {
            const inside = L.x >= m.panel.x - 1 && L.y >= m.panel.y - 1
              && L.x + L.w <= m.panel.x + m.panel.w + 1 && L.y + L.h <= m.panel.y + m.panel.h + 1
            if (!inside) {
              outside++
              problems.push(`${tag}  line "${L.text}" OUTSIDE its panel (line y ${L.y}..${L.y + L.h}, panel y ${m.panel.y}..${m.panel.y + m.panel.h})`)
            }
            let bad = 0, total = 0, worstPix = 99
            for (let y = L.y; y < L.y + L.h; y++) {
              for (let x = L.x; x < L.x + L.w; x++) {
                if (x < 0 || y < 0 || x >= info.width || y >= info.height) continue
                const idx = (y * info.width + x) * ch
                const r = ratio(textLum, lumOf(data[idx], data[idx + 1], data[idx + 2]))
                total++
                if (r < AA) bad++
                if (r < worstPix) worstPix = r
              }
            }
            if (!total) continue
            if (worstPix < worstHere.r) worstHere = { r: worstPix, at: shot.at, text: L.text }
            const frac = bad / total
            if (frac > FAIL_FRACTION) {
              problems.push(`${tag} @${shot.at}ms  "${L.text}" — ${(frac * 100).toFixed(1)}% of the pixels behind it fail AA (worst ${worstPix.toFixed(2)}:1)`)
            }
          }
        }
        console.log(`  ${tag.padEnd(24)} frames ${String(frames.length).padStart(3)} | shown ${String(shown).padStart(3)} | worst pixel ${worstHere.r === 99 ? ' n/a ' : `${worstHere.r.toFixed(2)}:1`} | lines outside panel ${outside}`)
        await ctx.close()
      }
    }
  }
  await b.close()
  const uniq = [...new Set(problems.map((t) => t.replace(/@\d+ms/, '')))]
  const pct = (arr, q) => (arr.length ? arr.slice().sort((a, c) => a - c)[Math.min(arr.length - 1, Math.floor(arr.length * q))] : 0)
  console.log(`\n  frames over the whole 2.6s window:  median gap ${pct(allGaps, 0.5)}ms, 90th ${pct(allGaps, 0.9)}ms, worst ${worstGap}ms`)
  console.log(`  frames while a title was on screen: median gap ${pct(shownGaps, 0.5)}ms, 90th ${pct(shownGaps, 0.9)}ms, worst ${pct(shownGaps, 1)}ms   <- the window that is asserted, needs <= 50ms`)
  console.log(`  ${samplesTaken} matched samples in all`)
  if (uniq.length) {
    console.log(`\n  ${uniq.length} distinct problem(s); first 14:`)
    for (const t of uniq.slice(0, 14)) console.log(`    ${t}`)
  }
  console.log(`PANELFIT: ${uniq.length ? `FAIL (${uniq.length})` : 'PASS'}`)
  process.exit(uniq.length ? 1 : 0)
})().catch((e) => { console.error(String(e).slice(0, 400)); process.exit(1) })
