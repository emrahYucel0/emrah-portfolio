// An image as row tone: dark → heavy rows, light → hairlines — with levels, an adaptive curve, local contrast and
// edges, so light, dark and illustrated interfaces all keep their structure in row weight.
// Pure pixel code: runs in the tone worker, or on the main thread only as a fallback.
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v)

// separable box blur, two passes
function blur(src, w, h, r) {
  const a = Float32Array.from(src), b = new Float32Array(src.length)
  const inv = 1 / (2 * r + 1)
  for (let pass = 0; pass < 2; pass++) {
    for (let y = 0; y < h; y++) {
      let acc = 0
      const o = y * w
      for (let x = -r; x <= r; x++) acc += a[o + Math.min(w - 1, Math.max(0, x))]
      for (let x = 0; x < w; x++) { b[o + x] = acc * inv; acc += a[o + Math.min(w - 1, x + r + 1)] - a[o + Math.max(0, x - r)] }
    }
    for (let x = 0; x < w; x++) {
      let acc = 0
      for (let y = -r; y <= r; y++) acc += b[Math.min(h - 1, Math.max(0, y)) * w + x]
      for (let y = 0; y < h; y++) { a[y * w + x] = acc * inv; acc += b[Math.min(h - 1, y + r + 1) * w + x] - b[Math.max(0, y - r) * w + x] }
    }
  }
  return a
}

// p: RGBA bytes of a cw×ch image, rewritten in place as grey tone
export function toneData(p, cw, ch) {
  const n = cw * ch
  const t = new Float32Array(n)
  for (let j = 0; j < n; j++) t[j] = 1 - (p[j * 4] * 0.2126 + p[j * 4 + 1] * 0.7152 + p[j * 4 + 2] * 0.0722) / 255
  const hist = new Uint32Array(256)
  let mean = 0
  for (let j = 0; j < n; j++) { hist[Math.min(255, Math.trunc(t[j] * 255))]++; mean += t[j] }
  const pct = (q) => { let acc = 0; for (let b = 0; b < 256; b++) { acc += hist[b]; if (acc >= q * n) return b / 255 } return 1 }
  const lo = pct(0.02), hi = Math.max(lo + 0.25, pct(0.985))
  mean = clamp01((mean / n - lo) / (hi - lo))
  const gamma = Math.min(4, Math.max(0.4, Math.log(0.4) / Math.log(Math.min(0.97, Math.max(0.03, mean)))))
  const b = blur(t, cw, ch, Math.max(2, Math.round(cw / 90)))
  for (let j = 0; j < n; j++) {
    const i = j % cw
    let v = Math.pow(clamp01((t[j] - lo) / (hi - lo) - 0.015), gamma)
    v += (t[j] - b[j]) * 1.6
    const ex = i > 0 && i < cw - 1 ? Math.abs(t[j + 1] - t[j - 1]) : 0
    const ey = j >= cw && j < n - cw ? Math.abs(t[j + cw] - t[j - cw]) : 0
    v = Math.max(v, Math.min(1, (ex + ey) * 1.5))
    const o = j * 4, g = Math.round(clamp01(v) * 255)
    p[o] = p[o + 1] = p[o + 2] = g; p[o + 3] = 255
  }
}

// tone is processed at a resolution that does not depend on the viewport
export const toneSize = (w, h) => { const s = Math.min(1, 1100 / Math.max(w, h)); return [Math.max(2, Math.round(w * s)), Math.max(2, Math.round(h * s))] }
