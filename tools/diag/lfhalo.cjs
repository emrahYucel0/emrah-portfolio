// THE HALO AROUND A VOID — how much brighter the pile-up is than the field it came from.
//
//   node lfhalo.cjs <port> <label>
//
// A void pushes the rows aside and the material compresses against its rim. Because a row's rendered half-width is a
// SCREEN width (dist is already a screen distance), each row keeps its full width however much material is squeezed
// into the band — so the ink per pixel rises and the rows fuse into a solid edge. This measures that directly:
//
//   the void is found as a long run of ground-coloured pixels in a central column;
//   HALO is the mean luminance of the twenty device pixels just outside its rim;
//   FIELD is the mean of a band two hundred pixels further out, where the push has ended;
//   the number that matters is HALO / FIELD — one means the ink was conserved, more means it piled up.
//
// A magnified crop and the full frame are written for every case, so the number can be checked by eye.
const pw = require('playwright')
const sharp = require('sharp')
const fs = require('fs')
const { stopsOf } = require('./stops.cjs')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const [port, label = 'build'] = process.argv.slice(2)
const OUT = 'out/linefield/halo'

const lum = (d, i) => 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]
const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0)

;(async () => {
  fs.mkdirSync(OUT, { recursive: true })
  const b = await pw.chromium.launch({ channel: 'chrome' })
  for (const cfg of [[1920, 1080, 2], [1920, 1080, 1]]) {
    const W = cfg[0]
    const H = cfg[1]
    const dpr = cfg[2]
    const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: dpr })
    const p = await ctx.newPage()
    await p.goto('http://127.0.0.1:' + port + '/tr', { waitUntil: 'networkidle', timeout: 120000 })
    await p.waitForFunction(() => window.__lab && window.__lab.A.mode === 'index', null, { timeout: 90000 }).catch(() => {})
    await sleep(2800)
    const STOP = await stopsOf(p)
    const geo = await p.evaluate(() => {
      const c = document.querySelector('canvas#surface') || document.querySelector('canvas')
      return { buf: c ? [c.width, c.height] : null, uDpr: window.__lab.V.dpr * window.__lab.V.u }
    })

    for (const g of [['Full-Stack', 'system'], ['Creative  ', 'creative']]) {
      const name = g[0]
      const place = g[1]
      await p.evaluate((i) => window.__lab.go(i), STOP[place])
      await sleep(2600)
      await p.evaluate(() => document.querySelectorAll('.layer, .strip, #__nuxt').forEach((e) => { e.style.visibility = 'hidden' }))
      await sleep(300)
      const png = await p.screenshot()
      const r = await sharp(png).raw().toBuffer({ resolveWithObject: true })
      const SW = r.info.width
      const SH = r.info.height

      // the ground is read from a corner the composition never reaches
      const gx = Math.round(SW * 0.012)
      const gy = Math.round(SH * 0.5)
      const ground = lum(r.data, (gy * SW + gx) * r.info.channels)

      // the void: the longest run of near-ground pixels in a central column
      const cx = Math.round(SW * 0.5)
      let bestLen = 0
      let bestEnd = -1
      let run = 0
      for (let y = Math.round(SH * 0.1); y < Math.round(SH * 0.9); y++) {
        const v = lum(r.data, (y * SW + cx) * r.info.channels)
        if (Math.abs(v - ground) < 8) { run++; if (run > bestLen) { bestLen = run; bestEnd = y } } else run = 0
      }
      if (bestLen < 20 || bestEnd < 0) { console.log('   ' + label.padEnd(9) + name + ' ' + (W + 'x' + H + '@' + dpr).padEnd(13) + ' no void found in the centre column') ; continue }

      const rim = bestEnd + 1
      const near = []
      for (let y = rim + 2; y < Math.min(SH, rim + 22); y++) near.push(lum(r.data, (y * SW + cx) * r.info.channels))
      const far = []
      for (let y = rim + 200; y < Math.min(SH, rim + 300); y++) far.push(lum(r.data, (y * SW + cx) * r.info.channels))
      const halo = mean(near)
      const field = mean(far)
      // peak in the halo band, and how far the pile-up extends before the pitch is normal again
      const peakNear = Math.max.apply(null, near)
      const peakFar = Math.max.apply(null, far)
      const ratio = field > 0 ? halo / field : 0

      const tag = label + '-' + name.trim() + '-' + W + 'x' + H + '@' + dpr
      fs.writeFileSync(OUT + '/' + tag + '-full.png', png)
      await sharp(png).extract({ left: Math.max(0, cx - 110), top: Math.max(0, rim - 10), width: 220, height: Math.min(96, SH - rim) })
        .resize({ width: 880, kernel: 'nearest' }).toFile(OUT + '/' + tag + '-ZOOM.png')

      console.log('   ' + label.padEnd(9) + name + ' ' + (W + 'x' + H + '@' + dpr).padEnd(13)
        + 'uDpr ' + geo.uDpr.toFixed(2) + '  rim y ' + String(rim).padEnd(6)
        + 'halo ' + halo.toFixed(1).padEnd(7) + 'field ' + field.toFixed(1).padEnd(7)
        + 'HALO/FIELD ' + ratio.toFixed(2).padEnd(7)
        + 'peak ' + peakNear.toFixed(0) + ' vs ' + peakFar.toFixed(0))
    }
    await ctx.close()
  }
  await b.close()
})().catch((e) => { console.error(String(e).slice(0, 400)); process.exit(1) })
