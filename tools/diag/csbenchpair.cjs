// CROSS SECTION — THE BLINDS, PHONE AND DESKTOP SIDE BY SIDE AT MATCHED PROGRESS (C4, user review 2026-10-04).
//
//   node csbenchpair.cjs <out-name> <tag>[=label] <tag>[=label] ...   [--kind=open|close] [--h=300]
//
// Reads csbenchshot's stills (tools/diag/out/cross/bench/<tag>-<kind>-<r>.png, one tag per size or variant) and lays
// them out one row per r, one column per tag, every still scaled to the same height — so a phone and a desktop are
// compared at the same moment of the reveal, at the size each is seen at relative to its own screen.
// Writes tools/diag/out/cross/bench/pair-<out-name>-<kind>.png
const sharp = require('sharp')
const fs = require('node:fs')
const args = process.argv.slice(2)
const opt = (k, d) => { const a = args.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d }
const [name, ...cols] = args.filter((a) => !a.startsWith('--'))
const kind = opt('kind', 'open'), H = Number(opt('h', '300'))
const dir = 'out/cross/bench'
;(async () => {
  const files = fs.readdirSync(dir)
  const tags = cols.map((c) => { const [tag, label] = c.split('='); return { tag, label: label || tag } })
  // every r any column has, matched by its three-digit name
  const rs = [...new Set(tags.flatMap(({ tag }) => files.filter((f) => f.startsWith(`${tag}-${kind}-`) && /-\d{3}\.png$/.test(f)).map((f) => f.slice(-7, -4))))].sort()
  const metas = await Promise.all(tags.map(({ tag }) => sharp(`${dir}/${files.find((f) => f.startsWith(`${tag}-${kind}-`))}`).metadata()))
  const widths = metas.map((m) => Math.round((H * m.width) / m.height))
  const LBL = 20
  const tiles = []
  for (const [ri, r] of rs.entries()) {
    let x = 0
    for (const [ci, { tag, label }] of tags.entries()) {
      const f = `${dir}/${tag}-${kind}-${r}.png`
      if (fs.existsSync(f)) {
        const text = `${label} · ${kind} r ${(Number(r) / 100).toFixed(2)}`
        const lab = Buffer.from(`<svg width="${widths[ci]}" height="${LBL}"><rect width="100%" height="100%" fill="#000" opacity=".7"/><text x="6" y="14" font-family="monospace" font-size="12" fill="#fff">${text}</text></svg>`)
        tiles.push({ input: await sharp(f).resize(widths[ci], H).png().toBuffer(), left: x, top: ri * (H + LBL + 6) + LBL })
        tiles.push({ input: lab, left: x, top: ri * (H + LBL + 6) })
      }
      x += widths[ci] + 6
    }
  }
  const out = `${dir}/pair-${name}-${kind}.png`
  await sharp({ create: { width: widths.reduce((a, b) => a + b + 6, 0), height: rs.length * (H + LBL + 6), channels: 3, background: '#f0f' } }).composite(tiles).png().toFile(out)
  console.log(out, `(${rs.length} moments × ${tags.length} columns)`)
})()
