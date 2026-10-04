// CROSS SECTION — one overview of a csresp group: every size's sheet (SURFACE, EDGE beside, DEPTH), labelled, stacked.
//   node csrespsheet.cjs <group>   → tools/diag/out/cross/resp/<group>-overview.png
const sharp = require('sharp')
const fs = require('node:fs')
const group = process.argv[2] || 'phones'
const dir = 'out/cross/resp'
;(async () => {
  const files = fs.readdirSync(dir).filter((f) => f.startsWith(`${group}-`) && f.endsWith('-sheet.png'))
  const H = 260, tiles = []
  let x = 0, y = 0, rowH = 0, maxW = 2400, width = 0
  for (const f of files) {
    const img = await sharp(`${dir}/${f}`).resize({ height: H }).png().toBuffer()
    const m = await sharp(img).metadata()
    if (x + m.width > maxW) { x = 0; y += rowH + 24; rowH = 0 }
    const label = Buffer.from(`<svg width="${m.width}" height="20"><rect width="100%" height="100%" fill="#000"/><text x="6" y="14" font-family="monospace" font-size="13" fill="#fff">${f.slice(group.length + 1, -10)}</text></svg>`)
    tiles.push({ input: label, left: x, top: y }, { input: img, left: x, top: y + 20 })
    x += m.width + 8; rowH = Math.max(rowH, H); width = Math.max(width, x)
  }
  const out = `${dir}/${group}-overview.png`
  await sharp({ create: { width, height: y + rowH + 24, channels: 3, background: '#777' } }).composite(tiles).png().toFile(out)
  console.log(out)
})()
