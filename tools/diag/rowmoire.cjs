// IS THE BEATING IN THE ROWS REAL, OR IS IT THE EVIDENCE? (Phase 3 §5)
//
//   node rowmoire.cjs <png> [<png> ...]
//
// A moiré is a LOW-frequency envelope riding on a high-frequency pattern: the lines themselves stay at their
// own pitch, but their local contrast rises and falls across the frame in broad bands. That is a thing you can
// measure, and it is different from what a resize or a video codec does — those damage the lines everywhere,
// not in slow waves.
//
// So: take the high-frequency energy of each pixel (how far it sits from its own neighbourhood), then blur THAT
// heavily. A clean ruled field gives an energy map that is flat, because every part of it is equally ruled. A
// moiré gives an energy map with structure in it, and the ratio of that structure's spread to its mean is the
// number reported here.
//
// Nothing is resampled. The files are read at their own resolution and the crops are taken 1:1, because a
// nearest-neighbour upscale of a one-pixel line pattern manufactures exactly the beating under investigation —
// a mistake this evidence made once already, in Phase 2.
const sharp = require('sharp')
const files = process.argv.slice(2)

/** box blur, separable, radius r */
function blur(src, W, H, r) {
  const tmp = new Float32Array(W * H)
  const out = new Float32Array(W * H)
  for (let y = 0; y < H; y++) {
    let acc = 0
    for (let x = -r; x <= r; x++) acc += src[y * W + Math.min(W - 1, Math.max(0, x))]
    for (let x = 0; x < W; x++) {
      tmp[y * W + x] = acc / (2 * r + 1)
      acc -= src[y * W + Math.min(W - 1, Math.max(0, x - r))]
      acc += src[y * W + Math.min(W - 1, Math.max(0, x + r + 1))]
    }
  }
  for (let x = 0; x < W; x++) {
    let acc = 0
    for (let y = -r; y <= r; y++) acc += tmp[Math.min(H - 1, Math.max(0, y)) * W + x]
    for (let y = 0; y < H; y++) {
      out[y * W + x] = acc / (2 * r + 1)
      acc -= tmp[Math.min(H - 1, Math.max(0, y - r)) * W + x]
      acc += tmp[Math.min(H - 1, Math.max(0, y + r + 1)) * W + x]
    }
  }
  return out
}

;(async () => {
  console.log('== IS THE BEATING REAL? ==\n')
  for (const f of files) {
    const meta = await sharp(f).metadata()
    // the band where the bed recedes, above anything the objects occupy
    const top = Math.round(meta.height * 0.05)
    const h = Math.round(meta.height * 0.22)
    const r = await sharp(f).extract({ left: 0, top, width: meta.width, height: h }).greyscale().raw()
      .toBuffer({ resolveWithObject: true })
    const W = r.info.width
    const H = r.info.height
    const g = new Float32Array(W * H)
    for (let i = 0; i < W * H; i++) g[i] = r.data[i]

    // the ruled pattern is only in the part of the band that is actually bed; anything very light or very
    // saturated is something else, but at this height the frame is bed, so the whole band is used
    const local = blur(g, W, H, 2)
    const energy = new Float32Array(W * H)
    for (let i = 0; i < W * H; i++) energy[i] = Math.abs(g[i] - local[i])
    const env = blur(energy, W, H, 18)

    let mean = 0
    for (let i = 0; i < W * H; i++) mean += env[i]
    mean /= W * H
    let sd = 0
    for (let i = 0; i < W * H; i++) { const d = env[i] - mean; sd += d * d }
    sd = Math.sqrt(sd / (W * H))

    /*
     * AND PERSPECTIVE IS NOT A MOIRE.
     *
     * The bed recedes, so its rows converge and their local contrast changes smoothly from the front of the
     * band to the back. That is the picture being correct, and measured as "structure in the energy map" it
     * reads the same tens of per cent an actual beat would -- which is what the first version of this reported,
     * for every still including two from Phase 2 that were approved with no beating in them at all.
     *
     * Perspective varies with DISTANCE, which in this band is y. Arcs vary ACROSS the frame. So each row's own
     * mean is removed first, and what is left is horizontal structure: the thing the review is asking about.
     */
    const resid = new Float32Array(W * H)
    for (let y = 0; y < H; y++) {
      let m = 0
      for (let x = 0; x < W; x++) m += env[y * W + x]
      m /= W
      for (let x = 0; x < W; x++) resid[y * W + x] = env[y * W + x] - m
    }
    let sdX = 0
    for (let i = 0; i < W * H; i++) sdX += resid[i] * resid[i]
    sdX = Math.sqrt(sdX / (W * H))

    console.log(`  ${f}`)
    console.log(`    band ${W}x${H} at y=${top}, 1:1, never resampled`)
    console.log(`    ruled energy: mean ${mean.toFixed(3)}  ·  all structure ${((sd / mean) * 100).toFixed(1)}% of mean`)
    console.log(`    ACROSS the frame, perspective removed: ${((sdX / mean) * 100).toFixed(2)}% of mean`)
    console.log('')
  }
  console.log('  The last number is the one that matters. Arcs across the frame would put it into double figures.')
})()
