// THE SEAM AT EITHER END OF THE PASSAGE — are the words ever on screen at the same time as another place's content.
//
//   node lfseam.cjs <port> [locale]
//
// HOW THE WORDS ARE FOUND, after two ways that did not work. Thresholding each frame against its own median called
// 99% of every row of the Work stop ink, because a photograph has no quiet median. Counting vertical runs of full ink
// — which is how linefield.cjs tells a letter from a field row, and is right there — counts Full-Stack's capsules and
// the Istanbul capture too, so at the Work end it read 340% of the words' own size.
//
// Differencing the same moment with the words pinned on and pinned off did not work either, and the numbers said so
// loudly: a footprint of 938,856 px on a 1,088,640 px band, and ratios of 1782%. Two captures of "the same moment"
// are not the same frame — this field has an ambient wave, the visit imprint fades in, the registration drifts — so
// the difference is dominated by the material moving, not by the words.
//
// SO THE CLAIM IS SPLIT IN TWO, and each half is measured where it can be measured honestly:
//
//   1. THAT THE GATE WORKS. Held still at the passage, the words pinned on against pinned off, against a noise floor
//      taken from two captures at the SAME setting. One place, many samples, no transition — the ambient motion is
//      measured rather than mistaken for signal.
//   2. THAT ITS TIMING IS RIGHT. The renderer records the gate it actually drew each frame (A.lfWords), so at every
//      5% of a crossing that decision is read back instead of being inferred from pixels. It must be nothing through
//      the sweep, where the other place still has its own content, and full at the passage's own end.
//
// The frames are written out at every 10% either way, because the eye is the judge of whether it LOOKS like the words
// thickening out of the rows, and no number here claims to settle that.
//
// WHAT IS ASSERTED. The site's transition is a sweep over ROW ORDER and both scenes are legitimately interleaved
// during it — that is the language and it stays. What may not happen is the passage's eight words being formed while
// another place's content is up. So the words' own type pixels are counted at every 5% of each crossing, and they
// must be absent through the sweep and present only at the passage's own end of it.
const pw = require('playwright')
const sharp = require('sharp')
const fs = require('fs')
const { stopsOf } = require('./stops.cjs')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const [port, loc = 'tr'] = process.argv.slice(2)
const OUT = 'out/linefield/seam'
let fails = 0
const ok = (c, l, x = '') => { if (!c) fails++; console.log(`  ${c ? 'ok  ' : 'FAIL'} ${l}${x ? ` — ${x}` : ''}`) }
const note = (l) => console.log(`       ${l}`)

// the pixels that BOTH of two frames disagree with a third about — the words, with the wave mostly cancelled
function differingBoth(a, b, ref, info, box) {
  const { width: W, channels: c } = info
  const far = (p, q, i) => Math.max(Math.abs(p[i] - q[i]), Math.abs(p[i + 1] - q[i + 1]), Math.abs(p[i + 2] - q[i + 2])) > 10
  let n = 0
  for (let y = box.y; y < box.y + box.h; y++) {
    for (let x = box.x; x < box.x + box.w; x++) {
      const i = (y * W + x) * c
      if (far(a, ref, i) && far(b, ref, i)) n++
    }
  }
  return n
}

// the pixels two frames of the same moment disagree about
function differing(a, b, info, box) {
  const { width: W, channels: c } = info
  let n = 0
  for (let y = box.y; y < box.y + box.h; y++) {
    for (let x = box.x; x < box.x + box.w; x++) {
      const i = (y * W + x) * c
      if (Math.max(Math.abs(a[i] - b[i]), Math.abs(a[i + 1] - b[i + 1]), Math.abs(a[i + 2] - b[i + 2])) > 10) n++
    }
  }
  return n
}

;(async () => {
  fs.mkdirSync(OUT, { recursive: true })
  const b = await pw.chromium.launch({ channel: 'chrome' })

  for (const [W, H] of [[1440, 900], [390, 844]]) {
    const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 })
    const p = await ctx.newPage()
    const errs = []
    p.on('pageerror', (e) => errs.push(String(e).slice(0, 160)))
    await p.goto(`http://127.0.0.1:${port}/${loc}`, { waitUntil: 'networkidle', timeout: 90000 })
    await p.waitForFunction(() => window.__lab?.A.mode === 'index', null, { timeout: 60000 }).catch(() => {})
    await sleep(3000)
    const STOP = await stopsOf(p)
    if (STOP.linefield === undefined) { console.log('  !!  no passage in this build\'s spine; nothing to measure'); await ctx.close(); continue }
    /*
     * THE CHROME IS NOT A SCENE, and there are TWO kinds of it. The runtime's own layers and strips carry pale mono
     * type at every stop; and the Nuxt shell has a semantic header of its own — header.head inside div.u-shell —
     * which is painted while the runtime owns the screen. Only hiding the first left the second on screen, and
     * Chrome's SUBPIXEL ANTIALIASING puts coloured fringes on a glyph edge (18,98,170 blue beside 196,122,38
     * orange), a few of which read as the passage's accent. That is what gave the Lab -> Full-Stack jump its
     * "5 px of rust" at rows 19-146, with flash 0 and the horizon at 450. Measured on the flag-OFF build, which
     * contains no Linefield code at all: the same 3 px. On origin/main: 5 px. It was never the passage's.
     *
     * It is hidden before EVERY sample, because the runtime rebuilds its DOM when it takes the screen back after a
     * route change and an inline style set before that is thrown away.
     */
    const hideChrome = () => p.evaluate(() => document.querySelectorAll('.layer, .strip, #__nuxt').forEach((e) => { e.style.visibility = 'hidden' }))
    await hideChrome()
    const band = { x: 0, y: Math.round(H * 0.08), w: W, h: Math.round(H * 0.84) }

    // hold the spine at an exact place between two stops, with the passage on the half it is entered from
    /*
     * HOLDING A POSITION BETWEEN TWO STOPS IS NOT AS SIMPLE AS SETTING IT.
     *
     * snap() damps the TARGET toward A.base every frame, so with base at the nearest stop the field walks to that
     * stop while the harness is looking: held at 2.80 for 240 ms at rate 4.5 it arrives at 2.93, and the gate read
     * 0.37 where the model said 0. Every earlier number here was taken against a moving position.
     *
     * snap() returns early while the input is recent, so the hold is a timestamp in the future: nothing drags, the
     * position is exactly what was asked for, and the ambient wave is the only thing still moving.
     */
    const hold = async (pos, lfp, pin) => {
      await p.evaluate(({ v, lf, w }) => {
        const A = window.__lab.A
        window.__lab.lfWords(w)
        A.p = v; A.pT = v; A.base = Math.round(v); A.gesture = false
        /*
         * AND NO ARRIVAL MAY BE ANNOUNCED. The frame loop calls onArrive() whenever base differs from prevBase, and
         * onArrive puts the passage back to the end it thinks the visitor came from — so setting the passage to 50%
         * and then moving base silently reset it to 0, and the rust-line control photographed the backend end and
         * found no line at all. Moving prevBase with base is what makes the hold a hold.
         */
        A.prevBase = A.base
        // these crossings all have the passage as one of their ends; the crossings that do NOT are section 3
        A.lfLeg = true
        A.lastInput = performance.now() + 1e7
        window.__lab.lfSet(lf)
        window.__lab.redraw()
      }, { v: pos, lf: lfp, w: pin })
      await sleep(240)
      const png = await p.screenshot()
      const { data, info } = await sharp(png).raw().toBuffer({ resolveWithObject: true })
      return { png, data, info }
    }
    const shoot = async () => {
      const png = await p.screenshot()
      const { data, info } = await sharp(png).raw().toBuffer({ resolveWithObject: true })
      return { png, data, info }
    }
    /*
     * 1. THAT THE GATE WORKS — held still at the passage, where the words are its content and nothing else is on
     * screen. The noise floor is two captures at the same setting, so the ambient motion is a number too.
     */
    const rest = STOP.linefield
    /*
     * The two captures have to be as close together in TIME as they can be. Taken through the full hold each time
     * they were about half a second apart, and the ambient wave moved 75,911 px of the band in that half second —
     * more than half the words' own size, which made the comparison worthless. So the floor is two shots back to
     * back with nothing changed between them, and the swing is two shots with only the uniform changed.
     */
    await hold(rest, 0, 1)
    const a1 = await shoot()
    const a2 = await shoot()
    await p.evaluate(() => { window.__lab.lfWords(0); window.__lab.redraw() })
    await sleep(120)
    const b1 = await shoot()
    await p.evaluate(() => { window.__lab.lfWords(1); window.__lab.redraw() })
    await sleep(120)
    const a3 = await shoot()
    /*
     * THE WAVE CANCELS AND THE WORDS DO NOT. A single ON-against-OFF difference is dominated by the ambient motion —
     * 55,011 px of a 1,088,640 px band moved between two back-to-back screenshots at 1440x900, which is half the
     * words' own size. But the words differ in EVERY ON-against-OFF comparison, while a wave crest differs in the one
     * it happened to fall in. So the estimate is the intersection of two such comparisons, taken either side of the
     * OFF frame, and the floor stays a plain back-to-back pair for scale.
     */
    const floor = differing(a1.data, a2.data, a1.info, band)
    const swing = differingBoth(a2.data, a3.data, b1.data, a1.info, band)
    fs.writeFileSync(`${OUT}/${W}x${H}-words-ON.png`, a1.png)
    fs.writeFileSync(`${OUT}/${W}x${H}-words-OFF.png`, b1.png)
    note(`${W}x${H} the gate: ${swing} px change when the words are turned off, against ${floor} px of ambient noise`)
    // The floor is the ambient wave, which never stops, so this ratio is the weakest number in this file and is
    // reported as such: the strong evidence that the gate adds and removes the words is words-ON.png beside
    // words-OFF.png, which is why they are written out.
    ok(swing > Math.max(2000, floor), `${W}x${H} the gate does add and remove the words — ${swing} px present in both comparisons, against a ${floor} px ambient floor`)

    // 2. THAT ITS TIMING IS RIGHT — the gate the renderer drew with, read back
    const at = async (pos, lfp) => {
      const f = await hold(pos, lfp, null)
      const r = await p.evaluate(() => ({ gate: window.__lab.A.lfWords, p: +window.__lab.A.p.toFixed(4) }))
      return { png: f.png, gate: r.gate, p: r.p }
    }

    for (const [name, from, to, lfp] of [
      ['enter from Full-Stack', STOP.system, STOP.linefield, 0],
      ['back to Full-Stack   ', STOP.linefield, STOP.system, 0],
      ['leave for Work       ', STOP.linefield, STOP.work, 1],
      ['return from Work     ', STOP.work, STOP.linefield, 1],
    ]) {
      const rows = []
      for (let i = 0; i <= 20; i++) {
        const v = from + ((to - from) * i) / 20
        const f = await at(v, lfp)
        if (i % 2 === 0) fs.writeFileSync(`${OUT}/${W}x${H}-${name.trim().replace(/[^a-z]+/gi, '-')}-${String(i * 5).padStart(3, '0')}.png`, f.png)
        rows.push({ pc: i * 5, gate: f.gate, want: +v.toFixed(4), got: f.p })
      }
      const atPassage = to === STOP.linefield ? 100 : 0
      const end = rows.find((r) => r.pc === atPassage)
      note(`${W}x${H} ${name}  ${rows.map((r) => `${r.pc}%:${r.gate.toFixed(2)}`).join(' ')}`)
      const adrift = rows.filter((r) => Math.abs(r.want - r.got) > 0.004)
      ok(adrift.length === 0, `${W}x${H} ${name}: every frame was taken where it was asked for`, adrift.length ? `drifted at ${adrift.map((r) => `${r.pc}% (${r.want}->${r.got})`).join(', ')}` : `${rows.length} positions held`)
      ok(end.gate > 0.9, `${W}x${H} ${name}: the words are there at the passage's end — gate ${end.gate.toFixed(2)}`)
      // through the sweep the other place still has its own type or image up, so the words must not be forming
      const sweep = rows.filter((r) => Math.abs(r.pc - atPassage) >= 20)
      const worst = sweep.reduce((m, r) => (r.gate > m.gate ? r : m), sweep[0])
      ok(worst.gate < 0.02, `${W}x${H} ${name}: nothing of the words through the sweep — worst gate ${worst.gate.toFixed(2)} at ${worst.pc}%`)
    }
    /*
     * 3. CROSSING IT ON THE WAY SOMEWHERE ELSE. The header and the keyboard can ask for a place on the far side, and
     * the spine travels straight through the passage. Nothing of the passage may assert itself then: no words, and the
     * ground it is crossed at must be the end it is approached from rather than whatever the last visit left — which
     * is what drew cream across a jump from Creative to Work.
     */
    for (const [a, z, wantEnd] of [['creative', 'work', 0], ['work', 'creative', 1]]) {
      await p.evaluate(({ from }) => {
        const A = window.__lab.A
        A.lastInput = -1e9
        window.__lab.go(window.__lab.STOP[from])
      }, { from: a })
      await sleep(2600)
      // leave the passage's own progress at the WRONG end, so a fix has something to correct
      await p.evaluate(({ w }) => window.__lab.lfSet(w), { w: wantEnd === 0 ? 1 : 0 })
      await sleep(400)
      await p.evaluate(() => { window.__cross = []; const A = window.__lab.A; const t = () => { window.__cross.push([+A.p.toFixed(3), +A.lfp.toFixed(3), +(A.lfWords ?? -1).toFixed(3)]); if (window.__cross.length < 500) requestAnimationFrame(t) }; requestAnimationFrame(t) })
      await p.evaluate(({ to }) => window.__lab.go(window.__lab.STOP[to]), { to: z })
      await sleep(3200)
      const tr = await p.evaluate(() => window.__cross)
      const near = tr.filter(([pp]) => Math.abs(pp - STOP.linefield) < 0.9)
      const worstGate = near.reduce((m, r) => Math.max(m, r[2]), 0)
      const ends = [...new Set(near.map((r) => r[1]))]
      note(`${W}x${H} ${a} → ${z} across the passage: ${near.length} frames within one stop of it, its own progress ${ends.join('/')}`)
      ok(near.length > 4, `${W}x${H} ${a} → ${z}: the crossing was actually observed — ${near.length} frames`)
      ok(worstGate < 0.02, `${W}x${H} ${a} → ${z}: no words while merely crossing — worst gate ${worstGate.toFixed(2)}`)
      ok(ends.length === 1 && ends[0] === wantEnd, `${W}x${H} ${a} → ${z}: crossed at the end it is approached from — ${ends.join('/')} (wanted ${wantEnd})`)
    }

    /*
     * 4. THE THREE ARTEFACTS THE REVIEW NAMED, hunted across every way of reaching or crossing the passage fast.
     *
     * Before one gesture was one stop, a hard flick from Full-Stack ran clean across the passage and the recording
     * showed the Istanbul capture WARPED by the corridor, blank cream frames, and a rust band along the bottom. Each
     * is now a measurement rather than a memory:
     *
     *   THE MAP  the corridor may map its own place and nothing else, so wherever the passage is not the destination
     *            its depth must be zero — at zero the map is the identity and another stop's content is drawn exactly
     *            as the base program would draw it. A warped capture IS a non-zero depth somewhere it does not belong.
     *   RUST     the accent belongs to the passage's own line at its own crossing. Any rust anywhere else, at any
     *            point of a journey that is not stopping at the passage, is the fault.
     *   BLANK    no frame may be empty. Ink is counted against the frame's own ground; a screen carrying only ground
     *            is the blank cream.
     */
    /*
     * THE CHROME HAS TO BE HIDDEN AGAIN FOR EVERY SAMPLE, not once per journey. The runtime rebuilds its DOM when it
     * takes the screen back after a route change, which throws away an inline style set before that — so the top
     * strip's own type was on screen again, and Chrome's SUBPIXEL ANTIALIASING puts coloured fringes on a glyph edge:
     * 18,98,170 blue beside 196,122,38 orange. A handful of those fringes read as the passage's accent and gave the
     * Lab -> Full-Stack jump its 5 px of "rust", at rows 19-27 and 126-146 with flash 0 and the horizon at 450.
     */
    const rustAndInk = async () => {
      await hideChrome()
      const png = await p.screenshot()
      const { data, info } = await sharp(png).raw().toBuffer({ resolveWithObject: true })
      const pr = await p.evaluate(() => (window.__lab.lfProbe ? window.__lab.lfProbe() : null))
      const g = pr ? pr.ground : [17, 18, 20]
      let rust = 0
      let ink = 0
      for (let y = band.y; y < band.y + band.h; y += 2) {
        for (let x = 0; x < W; x += 2) {
          const i = (y * info.width + x) * info.channels
          const r = data[i], gg = data[i + 1], bl = data[i + 2]
          // #b8622f itself, within a tolerance that excludes the projects' own warm inks — Istanbul is #8e3a17 and
          // Ege #6a1f1c, and a plain "redder than blue" test counted both of them as the passage's accent
          if (Math.abs(r - 0xb8) <= 26 && Math.abs(gg - 0x62) <= 26 && Math.abs(bl - 0x2f) <= 26) rust++
          if (Math.max(Math.abs(r - g[0]), Math.abs(gg - g[1]), Math.abs(bl - g[2])) > 10) ink++
        }
      }
      return { rust, ink, depth: pr ? +pr.seq.depth.toFixed(3) : -1, png }
    }
    /*
     * A POSITIVE CONTROL FIRST. A rust test tightened until it stops matching anything would pass every journey below
     * for the wrong reason, so it is first shown to find the line where the line certainly is: held at the crossing,
     * where the whole point of the passage is one rust line across the frame.
     */
    await hold(STOP.linefield, 0.5, null)
    const control = await (async () => {
      const png = await p.screenshot()
      const { data, info } = await sharp(png).raw().toBuffer({ resolveWithObject: true })
      let n = 0
      for (let y = band.y; y < band.y + band.h; y += 2) {
        for (let x = 0; x < W; x += 2) {
          const i = (y * info.width + x) * info.channels
          if (Math.abs(data[i] - 0xb8) <= 26 && Math.abs(data[i + 1] - 0x62) <= 26 && Math.abs(data[i + 2] - 0x2f) <= 26) n++
        }
      }
      fs.writeFileSync(`${OUT}/${W}x${H}-rust-control.png`, png)
      return n
    })()
    ok(control > 120, `${W}x${H} the rust test does find the passage's own line — ${control} px at the crossing`)

    /*
     * A JOURNEY THAT BEGINS ON THE BENCH BEGINS ON A ROUTE, and it has to leave it the way a visitor does.
     *
     * This read `go(STOP.system)` from the bench and called itself "jump Lab -> Full-Stack". It was nothing of the
     * kind: the Lab is a route the document owns, __lab.go() does not navigate it back, and so data-c2 stayed OFF,
     * #surface stayed display:none, and all fourteen measured frames were THE BENCH. Its "5 px of rust" was the
     * bench's own chrome. The handoff is driven by a gesture, so the gesture is what this makes — and it then
     * asserts that it actually arrived before measuring anything.
     */
    const JOURNEYS = [
      ['flick from Full-Stack down', 'system', 1, false],
      ['flick from Work up        ', 'work', -1, false],
      ['jump Creative → Work      ', 'creative', 0, 'work'],
      ['jump Work → Creative      ', 'work', 0, 'creative'],
      ['bench → Work → Full-Stack ', 'bench', 0, 'system'],
      ['jump Creative → Linefield ', 'creative', 0, 'linefield'],
      ['jump Work → Linefield     ', 'work', 0, 'linefield'],
    ]
    for (const [label, start, dir, jumpTo] of JOURNEYS) {
      await p.goto(`http://127.0.0.1:${port}/${loc}`, { waitUntil: 'networkidle', timeout: 90000 })
      await p.waitForFunction(() => window.__lab?.A.mode === 'index', null, { timeout: 60000 }).catch(() => {})
      await sleep(2800)
      await hideChrome()
      if (start === 'bench') {
        // leave the bench by the site's own vertical grammar, and prove the runtime has the screen back
        await p.goto(`http://127.0.0.1:${port}/${loc}/lab`, { waitUntil: 'networkidle', timeout: 60000 })
        await sleep(2000)
        await p.mouse.wheel(0, -130)
        await p.waitForFunction(() => document.documentElement.dataset.c2 === 'on' && !/\/lab/.test(location.pathname), null, { timeout: 25000 }).catch(() => {})
        await sleep(2200)
        const back = await p.evaluate(() => ({ c2: document.documentElement.dataset.c2 ?? 'off', path: location.pathname, base: window.__lab?.A?.base ?? null }))
        ok(back.c2 === 'on' && !/\/lab/.test(back.path), `${W}x${H} ${loc} ${label}: the runtime has the screen back before anything is measured`, `c2 ${back.c2} at ${back.path}, base ${back.base}`)
        if (back.c2 !== 'on') continue
        await hideChrome()
      } else if (start !== 'name') { await p.evaluate((n) => window.__lab.go(window.__lab.STOP[n]), start); await sleep(2600) }
      // leave the passage's progress at an end that a crossing must correct
      await p.evaluate(() => window.__lab.lfSet(0.5))
      await sleep(300)
      if (jumpTo) await p.evaluate((n) => window.__lab.go(window.__lab.STOP[n]), jumpTo)
      else for (let i = 0; i < 14; i++) { await p.mouse.wheel(0, 420 * dir); await sleep(6) }
      /*
       * A JOURNEY THAT STARTS ON THE BENCH STARTS ON ANOTHER ROUTE'S DOM. The Lab is a route of its own and the
       * runtime does not own that screen, so the first frames after the jump are the bench — whose own chrome carries
       * the site's accent, and was being counted as the passage's rust: 145 px of it, every time. The runtime is
       * waited for, and the chrome hidden again, before anything here is measured.
       */
      await p.waitForFunction(() => document.documentElement.dataset.c2 === 'on', null, { timeout: 20000 }).catch(() => {})
      await hideChrome()
      // watch the whole journey, not just its end
      const seen = []
      for (let i = 0; i < 14; i++) { seen.push(await rustAndInk()); await sleep(150) }
      const stopping = jumpTo === 'linefield'
      const worstRust = seen.reduce((m, r) => (r.rust > m.rust ? r : m), seen[0])
      const blank = seen.filter((r) => r.ink < 200)
      const worstDepth = seen.reduce((m, r) => Math.max(m, r.depth), 0)
      fs.writeFileSync(`${OUT}/${W}x${H}-${loc}-${label.trim().replace(/[^a-z]+/gi, '-')}-worst.png`, worstRust.png)
      note(`${W}x${H} ${loc} ${label}  worst rust ${worstRust.rust} px · blank frames ${blank.length}/${seen.length} · worst corridor depth ${worstDepth}`)
      ok(blank.length === 0, `${W}x${H} ${loc} ${label}: no blank frame`, `${blank.length} of ${seen.length} carried only ground`)
      if (!stopping) {
        ok(worstRust.rust < 40, `${W}x${H} ${loc} ${label}: no rust away from the passage's own line — ${worstRust.rust} px`)
        ok(worstDepth < 0.02, `${W}x${H} ${loc} ${label}: the corridor never maps another place — worst depth ${worstDepth}`)
      }
    }

    if (errs.length) ok(false, `${W}x${H}: page errors`, errs.slice(0, 3).join(' | '))
    await ctx.close()
  }
  await b.close()
  console.log(`\nSEAM: ${fails === 0 ? 'PASS' : `FAIL (${fails})`}`)
  process.exit(fails ? 1 : 0)
})().catch((e) => { console.error(String(e).slice(0, 400)); process.exit(1) })
