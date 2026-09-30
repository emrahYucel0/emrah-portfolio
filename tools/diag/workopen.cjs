// OPENING A PROJECT FROM ITS IMAGE — by holding it on a pointer, by tapping it on a finger.
//
//   node workopen.cjs <port> [label]
//
// The work field registers one project at a time and its capture IS the control: on a pointer you hold the
// image until the material gives way, on a finger you tap it. Nothing else on the site opens a project from the
// material, and nothing in the gate was checking it — which is how a stop number left behind by the renaming
// reached a review.
//
// IT CHECKS THE REGISTER FIRST, because "it does not open" and "the image looks broken" are one fault. A work
// becomes openable only once it is in register: lockWork() resolves the capture (lod to 0) and fills the rows
// with it (fill to 1), and the same lock is what makes the press legal. Without it the visitor sees the
// unresolved patchwork the two row sets make out of register — which reads as a corrupted image — and the
// press is refused. So the state is asserted, and the picture is measured, and then it is opened.
//
// AND THE HOLD IS DRIVEN BY THE LOAD, NOT BY A CLOCK. A fixed 1.4 s press reported a failure on a build that
// was fine: the load needs about 1.5 s and the check was standing on the edge of it. It now holds until the
// material yields or gives up, and says which.
const pw = require('playwright')
const sharp = require('sharp')
const fs = require('node:fs')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const [port = '4801', label = `port-${process.argv[2] || '4801'}`] = process.argv.slice(2)
const OUT = 'out/linefield/workopen'

let pass = 0
let fail = 0
const ok = (c, m) => { if (c) { pass++; console.log(`  ok   ${m}`) } else { fail++; console.log(`  FAIL ${m}`) } }

async function open(b, w, h) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, isMobile: w < 700, hasTouch: w < 700 })
  const p = await ctx.newPage()
  const errs = []
  p.on('pageerror', (e) => errs.push(String(e).slice(0, 200)))
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 200)) })
  await p.goto(`http://127.0.0.1:${port}/tr`, { waitUntil: 'load', timeout: 90000 })
  await p.waitForFunction(() => !!window.__lab, null, { timeout: 60000 })
  await sleep(2600)
  await p.evaluate(() => window.__lab.go(window.__lab.STOP ? window.__lab.STOP.work : 3))
  await sleep(2400)
  return { ctx, p, errs }
}

/** everything the press law reads, asked of the runtime rather than guessed from a picture */
const lock = (p) => p.evaluate(() => {
  const L = window.__lab
  const A = L.A
  const st = L.IDX()[L.STOP ? L.STOP.work : 3]
  const u = L.V.u || 1
  const f = st.layout.frame
  return {
    mode: A.mode,
    base: A.base,
    wt: +A.wt.toFixed(3),
    wLocked: A.wLocked,
    fill: +(st.fill ?? -1).toFixed(2),
    lod: +(st.lod ?? -1).toFixed(2),
    frame: { x: f.x * u, y: f.y * u, w: f.w * u, h: f.h * u },
  }
})

/** how much edge there is in the capture: a resolved photograph has a great deal, an out-of-register one has little */
function sharpness(data, info) {
  const { width: W, height: H, channels: c } = info
  let s = 0
  let n = 0
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      const i = (y * W + x) * c
      const m = (data[i - c] + data[i + c] + data[i - W * c] + data[i + W * c]) / 4
      s += Math.abs(data[i] - m)
      n++
    }
  }
  return s / n
}

/** hold until the material yields, or until it plainly is not going to */
async function holdUntilOpen(p, cx, cy, ms = 5000) {
  await p.mouse.move(cx, cy)
  await sleep(150)
  await p.mouse.down()
  const t0 = Date.now()
  let peak = 0
  while (Date.now() - t0 < ms) {
    await sleep(200)
    const r = await p.evaluate(() => ({ L: window.__lab.A.press ? window.__lab.A.press.L : -1, mode: window.__lab.A.mode }))
    if (r.L > peak) peak = r.L
    if (r.mode === 'world') break
  }
  await p.mouse.up()
  await sleep(1800)
  return { peak: +peak.toFixed(2), ms: Date.now() - t0 }
}

;(async () => {
  fs.mkdirSync(OUT, { recursive: true })
  const b = await pw.chromium.launch({ channel: 'chrome' })
  console.log(`\n=== ${label} (port ${port}) ===`)

  // ── in register, and resolved ────────────────────────────────────────────────────────────────────────────
  {
    const { ctx, p, errs } = await open(b, 1440, 900)
    const L = await lock(p)
    const png = await p.screenshot()
    fs.writeFileSync(`${OUT}/${label}-work-1440x900.png`, png)
    const crop = sharp(png).extract({ left: Math.round(L.frame.x), top: Math.round(L.frame.y), width: Math.round(L.frame.w), height: Math.round(L.frame.h) })
    await crop.clone().toFile(`${OUT}/${label}-frame-1440x900.png`)
    const { data, info } = await crop.raw().toBuffer({ resolveWithObject: true })
    const sh = sharpness(data, info)
    console.log(`  wt ${L.wt} · wLocked ${L.wLocked} · fill ${L.fill} · lod ${L.lod} · capture sharpness ${sh.toFixed(1)}`)
    ok(L.wLocked >= 0, `${label}: the registered work is locked (wLocked ${L.wLocked})`)
    ok(L.fill > 0.5 && L.lod < 0.01, `${label}: and its capture is resolved and filled (fill ${L.fill}, lod ${L.lod})`)
    /*
     * AND THE EDGE MEASURE IS A FLOOR, NOT THE TEST. Measured on the broken build it read 20.6 against the good
     * build's 22.3: the out-of-register patchwork is two sets of fragments and has nearly as much edge as the
     * picture they resolve into. It catches a frame with nothing in it and no more than that. What actually
     * catches the broken image is `fill` and `lod` above, which are the state the visitor is looking at.
     */
    ok(sh > 6, `${label}: there is something in the frame at all — ${sh.toFixed(1)} of edge per pixel (a floor, not a likeness test)`)
    if (errs.length) console.log(`  errors: ${errs.slice(0, 3).join(' | ')}`)
    await ctx.close()
  }

  // ── holding it, on a pointer ─────────────────────────────────────────────────────────────────────────────
  {
    const { ctx, p, errs } = await open(b, 1440, 900)
    const L = await lock(p)
    const r = await holdUntilOpen(p, Math.round(L.frame.x + L.frame.w / 2), Math.round(L.frame.y + L.frame.h / 2))
    const a = await lock(p)
    fs.writeFileSync(`${OUT}/${label}-after-hold-1440x900.png`, await p.screenshot())
    ok(a.mode === 'world', `${label}: holding the image opens the project — peak load ${r.peak} in ${r.ms}ms, ended in ${a.mode}`)
    if (errs.length) console.log(`  errors: ${errs.slice(0, 3).join(' | ')}`)
    await ctx.close()
  }

  // ── tapping it, on a finger ──────────────────────────────────────────────────────────────────────────────
  {
    const { ctx, p, errs } = await open(b, 390, 844)
    const L = await lock(p)
    await p.touchscreen.tap(Math.round(L.frame.x + L.frame.w / 2), Math.round(L.frame.y + L.frame.h / 2))
    await sleep(2600)
    const a = await lock(p)
    fs.writeFileSync(`${OUT}/${label}-after-tap-390x844.png`, await p.screenshot())
    ok(a.mode === 'world', `${label}: tapping the image opens the project — ended in ${a.mode}`)
    if (errs.length) console.log(`  errors: ${errs.slice(0, 3).join(' | ')}`)
    await ctx.close()
  }

  await b.close()
  console.log(`\n  ${label}: ${fail === 0 ? 'PASS' : 'FAIL'} — ${pass} ok, ${fail} failed\n`)
  process.exit(fail ? 1 : 0)
})()
