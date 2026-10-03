// CROSS SECTION — a contact sheet of csshot's stills: one image per viewport, every progress in order.
//
//   node cssheet.cjs [tag=atmo1] [WxH]     → tools/diag/out/cross/sheet-<tag>-<WxH>.png
const sharp = require('sharp')
const fs = require('node:fs')
const [tag = 'atmo1', size = '1440x900'] = process.argv.slice(2)
const dir = `out/cross/shots/${tag}`
const files = fs.readdirSync(dir).filter((f) => f.startsWith(`${size}-`) && f.endsWith('.png')).sort()
;(async () => {
  const [w, h] = size.split('x').map(Number)
  const cw = w >= 700 ? 480 : 195, ch = Math.round((cw * h) / w), cols = w >= 700 ? 4 : 7
  const rows = Math.ceil(files.length / cols)
  const tiles = await Promise.all(files.map(async (f, i) => {
    const label = Buffer.from(`<svg width="${cw}" height="18"><rect width="100%" height="100%" fill="#000" opacity=".6"/><text x="6" y="13" font-family="monospace" font-size="12" fill="#fff">${(Number(f.slice(size.length + 1, -4)) / 10).toFixed(1)}%</text></svg>`)
    const img = await sharp(`${dir}/${f}`).resize(cw, ch).composite([{ input: label, top: 0, left: 0 }]).png().toBuffer()
    return { input: img, left: (i % cols) * (cw + 4), top: Math.floor(i / cols) * (ch + 4) }
  }))
  const out = `out/cross/sheet-${tag}-${size}.png`
  await sharp({ create: { width: cols * (cw + 4), height: rows * (ch + 4), channels: 3, background: '#777' } }).composite(tiles).png().toFile(out)
  console.log(out)
})()
