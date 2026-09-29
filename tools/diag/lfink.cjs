// HOW MUCH INK IS IN A LETTER — ours against the reference, at 1:1, from the same side-by-side frame.
//
//   node lfink.cjs
//
// The pair page renders each side at its own full size, so the two halves of one screenshot are both 1:1 and
// photographed under the same clock. Coverage is measured INSIDE the word block — the fraction of that block's
// pixels that are ink — which is what "the rows fill the letters" means and is comparable across two renderers
// that agree on nothing else.
const sharp = require('sharp')
const OUT = 'out/linefield/pair'

/*
 * THE DUTY CYCLE INSIDE A LETTER — which is what "62% of the row pitch" means, and what block coverage cannot
 * measure. A block contains the gaps between words and the air around them, so a renderer whose type is
 * simply LARGER scores differently for a reason that has nothing to do with how the rows fill a letter.
 *
 * So: per column, the fraction of its span that is ink, and then the 90th percentile of those columns. A
 * column at that percentile runs down a letter stem for most of its length, and its ink fraction is the
 * segment height over the pitch.
 */
function duty(d, W, H, c, x0, x1, dark) {
  const isInk = (i) => {
    const L = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]
    return dark ? L < 110 : L > 150
  }
  // the block the type occupies, so empty screen is not averaged in
  let y0 = H
  let y1 = -1
  let cx0 = x1
  let cx1 = x0
  for (let y = 0; y < H; y++) {
    for (let x = x0; x < x1; x++) {
      if (!isInk((y * W + x) * c)) continue
      if (y < y0) y0 = y
      if (y > y1) y1 = y
      if (x < cx0) cx0 = x
      if (x > cx1) cx1 = x
    }
  }
  if (y1 < 0 || y1 - y0 < 20) return null
  const cols = []
  for (let x = cx0; x <= cx1; x++) {
    let n = 0
    for (let y = y0; y <= y1; y++) if (isInk((y * W + x) * c)) n++
    cols.push(n / (y1 - y0 + 1))
  }
  cols.sort((a, b) => a - b)
  return { duty: cols[Math.floor(cols.length * 0.9)], w: cx1 - cx0, h: y1 - y0 }
}

;(async () => {
  for (const [file, label, dark] of [
    ['pair-1440x900-0.png', 'backend at rest, 1440x900', false],
    ['pair-1440x900-100.png', 'frontend at rest, 1440x900', true],
    ['pair-390x844-0.png', 'backend at rest, 390x844', false],
    ['pair-390x844-100.png', 'frontend at rest, 390x844', true],
  ]) {
    const { data, info } = await sharp(`${OUT}/${file}`).raw().toBuffer({ resolveWithObject: true })
    const { width: W, height: H, channels: c } = info
    const half = Math.floor(W / 2)
    const demo = duty(data, W, H, c, 0, half - 4, dark)
    const ours = duty(data, W, H, c, half + 4, W, dark)
    if (!demo || !ours) { console.log(`  ${label}: not measurable`); continue }
    console.log(
      `  ${label}
    demo ${(demo.duty * 100).toFixed(1)}% of the pitch   ours ${(ours.duty * 100).toFixed(1)}%   `
      + `(the reference's rule is 62%)`,
    )
  }
})()
