// CROSS SECTION — DOES A LOUVER SEEN AT A SLANT ALIAS ITS ROWS? Measured against a supersampled ground truth, and
// calibrated on a deliberately broken build.
//
//   node csshimmer.cjs <port> [W@dpr ...]        e.g. 1440@1 1440@2 390@1.75 (viewport heights: 900 / 844)
//
// WHY NOT A PLAIN HIGH-FREQUENCY NUMBER. Tried first: the mean |Laplacian| over the scene read the broken build only
// 6-7% higher than the real one at every size — the louvers' own outlines and the letters dominate it, not the rows'
// aliasing. It did not discriminate, so no claim was made from it.
//
// THE MEASURE. The same pose is rendered three times, its canvas read back over the same crop:
//   truth   at four times the device pixel ratio (?csdpr), area-averaged down — what a perfect filter would show;
//   real    the build as it is;
//   broken  ?csbreak=nomip — the faces without mipmaps or anisotropic filtering, as canvas-2D would have drawn them.
// The figure is the mean absolute luminance error against the truth (0..255). The real build must sit clearly
// nearer the truth than the broken one; if it does not, the measure is reported as not discriminating.
//
// What it cannot say: shimmer is motion and this is a still. It says the frame is not aliased; whether it boils
// between frames is judged on the device.
const pw = require('playwright')
const { watch } = require('./consolewatch.cjs')
const args = process.argv.slice(2)
const port = args.find((a) => /^\d+$/.test(a)) || '4960'
const sizes = args.filter((a) => /^\d+@[\d.]+$/.test(a)).map((s) => { const [w, d] = s.split('@').map(Number); return { w, h: w < 700 ? 844 : 900, dpr: d } })
if (!sizes.length) sizes.push({ w: 1440, h: 900, dpr: 1 }, { w: 1440, h: 900, dpr: 1.5 }, { w: 390, h: 844, dpr: 1.75 })
// the turn and the carry, where faces are steep but not edge-on
const AT = [0.34, 0.38, 0.41, 0.43, 0.58, 0.61, 0.66]

async function crops(b, S, q, dpr) {
  const ctx = await b.newContext({ viewport: { width: S.w, height: S.h }, deviceScaleFactor: 1 })
  const p = await ctx.newPage()
  const W = watch(p, `shimmer ${S.w}@${dpr}`)
  await p.goto(`http://127.0.0.1:${port}/tr?cross=1&csatmo=0&csdpr=${dpr}${q}`, { waitUntil: 'load', timeout: 180000 })
  await p.waitForFunction(() => window.__cs && window.__cs.renderer, null, { timeout: 120000 })
  await p.evaluate(() => document.fonts.ready)
  // a crop where the louvers are steep through the turn and the carry, and small enough to supersample
  const box = { x: Math.round(S.w * 0.1), y: 90, w: Math.min(360, Math.round(S.w * 0.8)), h: 220 }
  const out = []
  for (const v of AT) {
    const c = await p.evaluate(([x, r]) => { window.__cs.setProgress(x); return window.__cs.crop(r.x, r.y, r.w, r.h) }, [v, box])
    out.push({ w: c.w, h: c.h, px: Buffer.from(c.b64, 'base64') })
  }
  const bad = await W.verdict(p)
  if (bad.length) { process.exitCode = 1; console.log(`   FAIL console (${bad.length}): ${bad[0]}`) }
  await ctx.close()
  return out
}
// area-average a k-times supersampled crop down to the target size
function down(c, w, h) {
  const k = c.w / w, out = new Float64Array(w * h)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let s = 0, n = 0
      for (let yy = Math.floor(y * k); yy < Math.floor((y + 1) * k); yy++) for (let xx = Math.floor(x * k); xx < Math.floor((x + 1) * k); xx++) { s += c.px[yy * c.w + xx]; n++ }
      out[y * w + x] = s / n
    }
  }
  return out
}
const err = (a, t) => { let e = 0; const n = Math.min(a.px.length, t.length); for (let i = 0; i < n; i++) e += Math.abs(a.px[i] - t[i]); return e / n }

;(async () => {
  const b = await pw.chromium.launch({ channel: 'chrome' })
  console.log('== CROSS SECTION: aliasing of the foreshortened louvers — mean |luminance error| against a 4x supersampled truth')
  console.log(`   at p = ${AT.join(', ')}`)
  for (const S of sizes) {
    const real = await crops(b, S, '', S.dpr)
    const broke = await crops(b, S, '&csbreak=nomip', S.dpr)
    const truth = await crops(b, S, '', S.dpr * 4)
    const er = [], eb = []
    for (let i = 0; i < AT.length; i++) {
      const t = down(truth[i], real[i].w, real[i].h)
      er.push(err(real[i], t)); eb.push(err(broke[i], t))
    }
    const mr = er.reduce((a, c) => a + c, 0) / er.length, mb = eb.reduce((a, c) => a + c, 0) / eb.length
    console.log(`   ${S.w}x${S.h}@${S.dpr}  real ${mr.toFixed(2)}   nomip ${mb.toFixed(2)}   broken/real ${(mb / mr).toFixed(2)}   ${mb / mr > 1.5 ? 'DISCRIMINATES' : 'DOES NOT DISCRIMINATE — no claim'}`)
    console.log(`      per p real  ${er.map((v) => v.toFixed(1)).join(' ')}`)
    console.log(`      per p nomip ${eb.map((v) => v.toFixed(1)).join(' ')}`)
  }
  await b.close()
})()
