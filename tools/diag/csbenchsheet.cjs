// CROSS SECTION — a contact sheet of csbenchshot's stills: one sheet per size and direction, r in order.
//
//   node csbenchsheet.cjs <tag, e.g. 1440x900@2> <open|close>   → tools/diag/out/cross/bench/sheet-<tag>-<kind>.png
const sharp = require('sharp')
const fs = require('node:fs')
const [tag = '1440x900@2', kind = 'open'] = process.argv.slice(2)
const dir = 'out/cross/bench'
const files = fs.readdirSync(dir).filter((f) => f.startsWith(`${tag}-${kind}-`) && f.endsWith('.png')).sort()
if (kind === 'close') files.reverse()
;(async () => {
  const meta = await sharp(`${dir}/${files[0]}`).metadata()
  const portrait = meta.width < meta.height
  const cw = portrait ? 260 : 560, ch = Math.round((cw * meta.height) / meta.width), cols = portrait ? 8 : 4
  const rows = Math.ceil(files.length / cols)
  const tiles = await Promise.all(files.map(async (f, i) => {
    const r = (Number(f.slice(-7, -4)) / 100).toFixed(2)
    const label = Buffer.from(`<svg width="${cw}" height="18"><rect width="100%" height="100%" fill="#000" opacity=".6"/><text x="6" y="13" font-family="monospace" font-size="12" fill="#fff">${kind} r ${r}</text></svg>`)
    const img = await sharp(`${dir}/${f}`).resize(cw, ch).composite([{ input: label, top: 0, left: 0 }]).png().toBuffer()
    return { input: img, left: (i % cols) * (cw + 4), top: Math.floor(i / cols) * (ch + 4) }
  }))
  const out = `${dir}/sheet-${tag}-${kind}.png`
  await sharp({ create: { width: cols * (cw + 4), height: rows * (ch + 4), channels: 3, background: '#f0f' } }).composite(tiles).png().toFile(out)
  console.log(out)
})()
