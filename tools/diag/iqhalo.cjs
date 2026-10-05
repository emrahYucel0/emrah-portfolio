// R19 — THE HALO AT THE CAPSULES' RIMS, MEASURED AS INK PER AREA.
//
//   node iqhalo.cjs <port> [--cfg=WxH@dpr,...] [--modes=off,system,both]
//
// An opening (a capsule) pushes the rows aside and they crowd against its rim. If each row keeps its own width the
// ink per area rises there — the halo. If the rule conserves ink (R19), a crowded row is narrowed by exactly the
// crowding, and the ink per area stays the field's.
//
// So, through each capsule on Full-Stack and Creative, in columns across its flat middle, the canvas's own pixels are
// read (readPixels, preserveDrawingBuffer), every row is found going outward from the rim, its ink is integrated in
// linear light (0 the paper, 1 the ink), and the ink per area is taken in bands of distance from the rim:
//
//     0-8   8-16   16-32   32-64   64-128   composition px
//
// against the same column's own ink per area in the open field 140-200 px out (used only where its rows sit at the
// state's own pitch). 1.00 is conserved. The DOM is not in the backing store, so the capsules' text is not either.
const pw = require('playwright')
const fs = require('fs')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const args = process.argv.slice(2)
const port = args[0]
const opt = (k) => (args.find((a) => a.startsWith('--' + k + '=')) || '').slice(k.length + 3)
const CONFIGS = opt('cfg') ? opt('cfg').split(',').map((s) => { const m = /(\d+)x(\d+)@([\d.]+)/.exec(s); return [+m[1], +m[2], +m[3]] }) : [[1440, 900, 1], [1440, 900, 2], [1920, 991, 1]]
const MODES = (opt('modes') || 'off,system,both').split(',')
const BANDS = [[0, 8], [8, 16], [16, 32], [32, 64], [64, 128]]
const OUT = 'out/iq/halo'
fs.mkdirSync(OUT, { recursive: true })
const toLin = (v) => { const c = v / 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4) }
const LIN = Float64Array.from({ length: 256 }, (_, i) => toLin(i))
const lumOf = (rgb) => 0.2126 * LIN[rgb[0]] + 0.7152 * LIN[rgb[1]] + 0.0722 * LIN[rgb[2]]
const med = (a) => (a.length ? [...a].sort((x, y) => x - y)[a.length >> 1] : null)

/** a column of ink (0 paper, 1 ink), top down, from the backing store */
async function columns(p, xs) {
  const r = await p.evaluate((xs) => {
    const gl = window.__lab.surface.gl
    const H = gl.drawingBufferHeight
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    const buf = new Uint8Array(H * 4)
    const out = []
    for (const x of xs) {
      gl.readPixels(x, 0, 1, H, gl.RGBA, gl.UNSIGNED_BYTE, buf)
      let s = ''
      for (let y = H - 1; y >= 0; y--) s += String.fromCharCode(buf[y * 4], buf[y * 4 + 1], buf[y * 4 + 2])
      out.push(btoa(s))
    }
    return { H, out }
  }, xs)
  return r.out.map((b64) => { const raw = Buffer.from(b64, 'base64'); const c = []; for (let i = 0; i < raw.length; i += 3) c.push([raw[i], raw[i + 1], raw[i + 2]]); return c })
}

;(async () => {
  const b = await pw.chromium.launch({ channel: 'chrome' })
  const results = []
  console.log('== R19: ink per area at the capsules\' rims, against the field (1.00 = conserved), http://127.0.0.1:' + port)
  for (const [W, H, dpr] of CONFIGS) {
    for (const mode of MODES) {
      const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: dpr })
      await ctx.addInitScript(() => {
        const o = HTMLCanvasElement.prototype.getContext
        HTMLCanvasElement.prototype.getContext = function (t, a) { if (t === 'webgl2') a = Object.assign({}, a || {}, { preserveDrawingBuffer: true }); return o.call(this, t, a) }
      })
      const p = await ctx.newPage()
      await p.goto(`http://127.0.0.1:${port}/tr?r19=${mode}`, { waitUntil: 'load', timeout: 90000 })
      await p.waitForFunction(() => window.__lab && window.__lab.A.mode === 'index', null, { timeout: 90000 })
      await sleep(2000)
      for (const face of ['system', 'creative']) {
        await p.evaluate((n) => window.__lab.go(window.__lab.STOP[n]), face)
        await sleep(2800)
        const g = await p.evaluate((n) => {
          const L = window.__lab
          const st = L.IDX()[L.STOP[n]]
          return { R: L.V.dpr * L.V.u, s: st.spacing, ink: [...st.ink].map((v) => Math.round(v * 255)), paper: [...st.paper].map((v) => Math.round(v * 255)), caps: (st.features || []).filter((f) => !f.kind).map((f) => ({ cx: f.cx, cy: f.cy, h: f.h, hw: f.hw })), wordTop: st.layout && st.layout.wordTop ? st.layout.wordTop : 1e9 }
        }, face)
        const lp = lumOf(g.paper), li = lumOf(g.ink)
        const sum = BANDS.map(() => 0), cnt = BANDS.map(() => 0)
        for (const cap of g.caps) {
          const xs = []
          for (let x = cap.cx - cap.hw * 0.35; x <= cap.cx + cap.hw * 0.35; x += 13 / g.R) xs.push(Math.round(x * g.R))
          const cols = await columns(p, xs)
          for (const col of cols) {
            const e = col.map((rgb) => (lumOf(rgb) - lp) / (li - lp))
            const pitch = g.s * g.R
            for (const dir of [-1, 1]) {
              /*
               * THE RIM IS WHERE THE VOID ENDS: the first pixel with any ink at all, going out from the capsule's
               * centre. A first version took the first row with ink over 0.2, and conserved rows at the rim are
               * that faint — it found the rim 27 px out and reported a 30% deficit that the pixels do not have.
               */
              let y = Math.round(cap.cy * g.R)
              while (y > 0 && y < e.length - 1 && e[y] < 0.03) y += dir
              const rim = y
              /*
               * AND THE FIELD IS THE SAME COLUMN'S OWN INK PER PIXEL, 140-200 px out, used only where the rows there
               * sit at the state's own pitch (no other capsule, no word): the open field this column runs into.
               */
              /*
               * AND NOTHING BELOW THE WORD'S TOP. The word (FULL-STACK, CREATIVE) starts under the lower capsule; its
               * letters are exempt from the rule and are type, not a halo. A first version let the 64-128 px band run
               * into them and read 1.25 under Full-Stack's lower capsule (2026-10-05: the profile there is the field's
               * 0.10 per pixel until the letters, then 0.77-0.97).
               */
              const wordY = (g.wordTop - 4) * g.R
              const f0 = rim + dir * 140 * g.R, f1 = rim + dir * 200 * g.R
              const lo = Math.round(Math.min(f0, f1)), hi = Math.round(Math.min(Math.max(f0, f1), wordY))
              if (hi - lo < 30 * g.R) continue
              if (lo < 0 || hi >= e.length) continue
              const pk = []
              for (let j = lo + 1; j < hi - 1; j++) if (e[j] > 0.05 && e[j] >= e[j - 1] && e[j] > e[j + 1]) pk.push(j)
              const gaps = pk.slice(1).map((v, i) => v - pk[i])
              if (gaps.length < 4 || Math.abs(med(gaps) - pitch) > Math.max(1, pitch * 0.05)) continue
              let fs2 = 0
              for (let j = lo; j < hi; j++) fs2 += Math.max(0, e[j])
              const field = fs2 / (hi - lo)
              if (!(field > 0)) continue
              BANDS.forEach(([d0, d1], k) => {
                const y0 = rim + dir * d0 * g.R, y1 = rim + dir * d1 * g.R
                const a0 = Math.round(Math.min(y0, y1)), a1 = Math.round(Math.min(Math.max(y0, y1), wordY))
                let ink = 0
                for (let j = a0; j < a1; j++) ink += Math.max(0, e[j] ?? 0)
                if (a1 > a0) { sum[k] += (ink / (a1 - a0)) / field; cnt[k]++ }
              })
            }
          }
        }
        const prof = sum.map((v, k) => (cnt[k] ? v / cnt[k] : null))
        results.push({ W, H, dpr, mode, face, prof, n: cnt[0] })
        console.log(`   ${(W + 'x' + H + '@' + dpr).padEnd(13)} ${mode.padEnd(7)} ${face.padEnd(9)} ` + BANDS.map(([a, c], k) => `${a}-${c}: ${prof[k] == null ? '-' : prof[k].toFixed(2)}`).join('   ') + `   (${cnt[0]} rim columns)`)
      }
      await ctx.close()
    }
  }
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  fs.writeFileSync(`${OUT}/iqhalo-${stamp}.json`, JSON.stringify(results, null, 1))
  await b.close()
})().catch((e) => { console.error(e); process.exit(1) })
