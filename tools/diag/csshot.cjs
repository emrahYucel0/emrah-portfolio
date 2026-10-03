// CROSS SECTION — stills at fixed progresses from the Phase B debug entry, and every error the page raised.
//
//   node csshot.cjs <port> [WxH ...] [--atmo=0|1] [--headed] [--tag=name] [--q=csbreak=grad]
//
// Needs the dev server with the flag on: NUXT_PUBLIC_CROSS=1 npx nuxt dev --port <port>. The entry exists only in
// development, so a built site cannot answer. Writes to tools/diag/out/cross/shots/.
const pw = require('playwright')
const fs = require('node:fs')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const args = process.argv.slice(2)
const port = args[0] || '4960'
const sizes = args.filter((a) => /^\d+x\d+$/.test(a)).map((s) => s.split('x').map(Number))
if (!sizes.length) sizes.push([1440, 900], [390, 844])
const opt = (k, d) => { const a = args.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d }
const atmo = opt('atmo', '1')
const tag = opt('tag', `atmo${atmo}`)
const extra = opt('q', '')
const OUT = `out/cross/shots/${tag}`
// (the engine is part of the tag when it is not Chrome)
const AT = [0, 0.12, 0.25, 0.35, 0.42, 0.44, 0.47, 0.5, 0.53, 0.56, 0.6, 0.7, 0.85, 1]

;(async () => {
  fs.mkdirSync(OUT, { recursive: true })
  // --engine=webkit: Playwright's WebKit, the nearest thing to Safari on this machine (not a device result)
  const engine = opt('engine', 'chrome')
  const b = engine === 'webkit' ? await pw.webkit.launch() : await pw.chromium.launch({ channel: 'chrome', headless: !args.includes('--headed') })
  let bad = 0
  for (const [w, h] of sizes) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: w < 700 ? 3 : 2 })
    const p = await ctx.newPage()
    const errs = []
    p.on('pageerror', (e) => errs.push(`pageerror: ${e.message}`))
    // the dev server's own font preload notice is about the layout, not about this scene
    p.on('console', (m) => { if ((m.type() === 'error' || m.type() === 'warning') && !/preloaded using link preload/.test(m.text())) errs.push(`${m.type()}: ${m.text()}`) })
    await p.goto(`http://127.0.0.1:${port}/tr?cross=1&csatmo=${atmo}${extra ? `&${extra}` : ''}`, { waitUntil: 'load', timeout: 180000 })
    const ok = await p.waitForFunction(() => window.__cs && window.__cs.renderer, null, { timeout: 120000 }).then(() => true, () => false)
    if (!ok) { console.log(`  ${w}x${h}: __cs never appeared`); errs.forEach((e) => console.log('   ', e)); bad++; await ctx.close(); continue }
    await p.evaluate(() => document.fonts.ready)
    const info = await p.evaluate(() => ({ r: window.__cs.renderer, face: window.__cs.faceOk, L: window.__cs.layout() }))
    console.log(`  ${w}x${h}  renderer: ${info.r}  face ${info.face ? 'ok' : 'FALLBACK'}  louvers ${info.L.count} pitch ${info.L.pitch.toFixed(2)} rows ${info.L.spacing.toFixed(2)}  backing ${info.L.backing.join('x')}`)
    await p.evaluate(() => window.__cs.dock(false))
    for (const v of AT) {
      await p.evaluate((x) => window.__cs.setProgress(x), v)
      await sleep(120)
      fs.writeFileSync(`${OUT}/${w}x${h}-${String(Math.round(v * 1000)).padStart(4, '0')}.png`, await p.screenshot())
    }
    if (errs.length) { bad++; console.log(`  ${errs.length} page/console messages:`); [...new Set(errs)].slice(0, 12).forEach((e) => console.log('   ', e.slice(0, 400))) }
    await ctx.close()
  }
  await b.close()
  console.log(bad ? `  FAIL (${bad})` : '  OK — stills in tools/diag/' + OUT)
  process.exit(bad ? 1 : 0)
})()
