// R19 — DOES A PRESS STILL READ WITH THE RULE ON? Stills and short films of the pointer's press, rule off and on.
//
//   node r19press.cjs <port> [WxH]
//
// The press is an opening too, so with the rule on its rim conserves ink like a capsule's. For Full-Stack and Creative,
// with ?r19=off and ?r19=both: the pointer goes down on open rows between the capsules and the word, holds, drags a
// little, and lets go. Each run is filmed (Playwright's own recording of the page, not of the desktop) and a still is
// taken at the middle of the hold. Writes tools/diag/out/iq/r19press/: PRESS-<WxH>.png (the stills, with the edge at 3x)
// and <face>-<mode>.webm.
const pw = require('playwright')
const sharp = require('sharp')
const fs = require('fs')
const path = require('path')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const [port, size = '1440x900'] = process.argv.slice(2)
const [W, H] = size.split('x').map(Number)
const OUT = 'out/iq/r19press'
fs.mkdirSync(OUT, { recursive: true })

const label = (text, w) => Buffer.from(`<svg width="${w}" height="34" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#ffffff"/><text x="10" y="23" font-family="monospace" font-size="18" fill="#111">${text}</text></svg>`)

;(async () => {
  const b = await pw.chromium.launch({ channel: 'chrome' })
  const panels = []
  for (const [place, face] of [['system', 'fullstack'], ['creative', 'creative']]) {
    for (const mode of ['off', 'both']) {
      const dir = path.join(OUT, 'tmp-' + face + '-' + mode)
      fs.rmSync(dir, { recursive: true, force: true })
      const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, recordVideo: { dir, size: { width: W, height: H } } })
      const p = await ctx.newPage()
      await p.goto(`http://127.0.0.1:${port}/tr?r19=${mode}`, { waitUntil: 'load', timeout: 90000 })
      await p.waitForFunction(() => window.__lab && window.__lab.A.mode === 'index', null, { timeout: 90000 })
      await sleep(1500)
      await p.evaluate((n) => window.__lab.go(window.__lab.STOP[n]), place)
      await sleep(2600)
      await p.evaluate(() => [...document.body.children].forEach((e) => { if (/^R19 /.test(e.textContent || '')) e.style.display = 'none' }))
      // open rows: left of the lower capsule, between the upper capsule and the word
      const at = { x: Math.round(W * 0.24), y: Math.round(H * 0.5) }
      await p.mouse.move(at.x - 40, at.y)
      await sleep(300)
      await p.mouse.move(at.x, at.y, { steps: 8 })
      await p.mouse.down()
      await sleep(900)
      const still = await p.screenshot()
      await sleep(500)
      for (let i = 1; i <= 30; i++) { await p.mouse.move(at.x + i * 2, at.y + Math.round(Math.sin(i / 5) * 6)); await sleep(16) }
      await sleep(400)
      await p.mouse.up()
      await sleep(1400)
      const video = p.video()
      await ctx.close()
      const src = await video.path()
      fs.copyFileSync(src, path.join(OUT, `${face}-${mode}.webm`))
      fs.rmSync(dir, { recursive: true, force: true })
      panels.push({ face, mode, still, at })
      console.log(`filmed ${face} ${mode}`)
    }
  }
  // the stills: whole frame at half size, and the press's edge at 3x
  const pw2 = Math.round(W / 2), ph2 = Math.round(H / 2)
  const cw = 240 * 3, ch = 160 * 3
  const colW = Math.max(pw2, cw)
  const rowH = 34 + ph2 + 12 + ch + 16
  const comps = []
  panels.forEach((pn, i) => {
    const x = (i % 2) * (colW + 12), y = Math.floor(i / 2) * rowH
    comps.push({ input: label(`${pn.face === 'fullstack' ? 'Full-Stack' : 'Creative'} · press held · rule ${pn.mode === 'off' ? 'off (today)' : 'on'}`, colW), left: x, top: y })
    comps.push({ input: null, left: x, top: y + 34, still: pn.still, kind: 'full' })
    comps.push({ input: null, left: x, top: y + 34 + ph2 + 12, still: pn.still, kind: 'crop', at: pn.at })
  })
  const resolved = []
  for (const c of comps) {
    if (c.kind === 'full') resolved.push({ input: await sharp(c.still).resize({ width: pw2, height: ph2 }).toBuffer(), left: c.left, top: c.top })
    else if (c.kind === 'crop') resolved.push({ input: await sharp(c.still).extract({ left: Math.max(0, c.at.x - 200), top: Math.max(0, c.at.y - 80), width: 240, height: 160 }).resize({ width: cw, height: ch, kernel: 'nearest' }).toBuffer(), left: c.left, top: c.top })
    else resolved.push(c)
  }
  const file = `${OUT}/PRESS-${W}x${H}.png`
  await sharp({ create: { width: 2 * colW + 12, height: 2 * rowH, channels: 3, background: '#ff00ff' } }).composite(resolved).png().toFile(file)
  console.log('written ' + file)
  await b.close()
})().catch((e) => { console.error(e); process.exit(1) })
