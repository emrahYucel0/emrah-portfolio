// R19 — THE CAPSULES' RIMS, WITHOUT AND WITH THE CONSERVATION RULE: sheets for the user's comparison.
//
//   node r19sheet.cjs <port> [WxH] [dpr,...]
//
// One sheet per DPR. Rows: Full-Stack, Creative. Columns: the rule off (today), the rule on (?r19=both). Each panel is
// the whole frame at half size, and under it the left end of the lower capsule's top rim, magnified four times —
// where the rows crowd most. Writes tools/diag/out/iq/r19/R19-<W>x<H>@<dpr>.png.
const pw = require('playwright')
const sharp = require('sharp')
const fs = require('fs')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const [port, size = '1440x900', dprs = '1,2'] = process.argv.slice(2)
const [W, H] = size.split('x').map(Number)
const OUT = 'out/iq/r19'
fs.mkdirSync(OUT, { recursive: true })

async function shot(b, place, dpr, mode) {
  const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: dpr })
  const p = await ctx.newPage()
  await p.goto(`http://127.0.0.1:${port}/tr?r19=${mode}`, { waitUntil: 'load', timeout: 90000 })
  await p.waitForFunction(() => window.__lab && window.__lab.A.mode === 'index', null, { timeout: 90000 })
  await sleep(2000)
  await p.evaluate((n) => window.__lab.go(window.__lab.STOP[n]), place)
  await sleep(2800)
  // the badge is the prototype's, not the design's
  await p.evaluate(() => [...document.body.children].forEach((e) => { if (/^R19 /.test(e.textContent || '')) e.style.display = 'none' }))
  const cap = await p.evaluate((n) => { const L = window.__lab; const f = L.IDX()[L.STOP[n]].features.filter((x) => !x.kind)[1]; return { x: f.cx - f.hw * 0.75, y: f.cy - f.h - 40 } }, place)
  const png = await p.screenshot()
  await ctx.close()
  return { png, cap }
}

const label = (text, w) => Buffer.from(`<svg width="${w}" height="34" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#ffffff"/><text x="10" y="23" font-family="monospace" font-size="18" fill="#111">${text}</text></svg>`)

;(async () => {
  const b = await pw.chromium.launch({ channel: 'chrome' })
  for (const dpr of dprs.split(',').map(Number)) {
    const pw2 = Math.round(W * 0.5), ph2 = Math.round(H * 0.5)
    const cwC = 200, chC = 100
    const cw = cwC * 4, ch = chC * 4
    const colW = Math.max(pw2, cw)
    const rowH = 34 + ph2 + 12 + ch + 16
    const comps = []
    let r = 0
    for (const [place, face] of [['system', 'Full-Stack'], ['creative', 'Creative']]) {
      let c = 0
      for (const [mode, name] of [['off', 'rule off (today)'], ['both', 'rule on']]) {
        const { png, cap } = await shot(b, place, dpr, mode)
        const x = c * (colW + 12), y = r * rowH
        const crop = { left: Math.max(0, Math.round(cap.x * dpr)), top: Math.max(0, Math.round(cap.y * dpr)), width: Math.round(cwC * dpr), height: Math.round(chC * dpr) }
        comps.push({ input: label(`${face} · ${name} · ${W}x${H}@${dpr}`, colW), left: x, top: y })
        comps.push({ input: await sharp(png).resize({ width: pw2, height: ph2 }).toBuffer(), left: x, top: y + 34 })
        comps.push({ input: await sharp(png).extract(crop).resize({ width: cw, height: ch, kernel: 'nearest' }).toBuffer(), left: x, top: y + 34 + ph2 + 12 })
        c++
      }
      r++
    }
    const file = `${OUT}/R19-${W}x${H}@${dpr}.png`
    await sharp({ create: { width: 2 * colW + 12, height: 2 * rowH, channels: 3, background: '#ff00ff' } }).composite(comps).png().toFile(file)
    console.log('written ' + file)
  }
  await b.close()
})().catch((e) => { console.error(e); process.exit(1) })
