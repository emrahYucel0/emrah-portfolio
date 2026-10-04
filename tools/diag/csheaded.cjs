// CROSS SECTION — the whole way in a REAL, HEADED Chrome window at this machine's own configuration, recorded:
// Work's last work → the band → DEPTH → the blinds open onto the bench → up: the blinds close → DEPTH → back to Work.
//
//   node csheaded.cjs <port> [--keys]
//
// Installed Chrome (not Playwright's Chromium), headed, maximised, with NO viewport or device-pixel emulation: the
// window's own size and the display's own dpr, on whatever GPU Chrome itself picks (it prints the renderer). The
// recording is Chrome's screencast of that window — the compositor's frames — not a capture of the desktop, so
// nothing else on the screen is recorded. (Never a desktop capture: user rule, 2026-10-04.)
//
// Fails on any console error, any WebGL warning, any page error and any record of the runtime's own GL check
// (consolewatch.cjs), and on a path that does not draw: it counts the louver frames and photographs every position.
// Writes tools/diag/out/cross/film/headed-<w>x<h>.webm and tools/diag/out/cross/headed/*.png.
const pw = require('playwright')
const fs = require('node:fs')
const { watch } = require('./consolewatch.cjs')
const args = process.argv.slice(2)
const port = args.find((a) => /^\d+$/.test(a)) || '4960'
const keys = args.includes('--keys')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let fails = 0
const check = (ok, msg) => { console.log(`   ${ok ? 'ok  ' : 'FAIL'} ${msg}`); if (!ok) fails++ }

;(async () => {
  fs.mkdirSync('out/cross/headed', { recursive: true })
  fs.mkdirSync('out/cross/film/tmp', { recursive: true })
  const b = await pw.chromium.launch({ channel: 'chrome', headless: false, args: ['--start-maximized'] })
  // the window's own size, measured in a first page, so the recording is made at exactly that size
  const probe = await (await b.newContext({ viewport: null })).newPage()
  await probe.goto('about:blank')
  const win = await probe.evaluate(() => ({ w: innerWidth, h: innerHeight, dpr: devicePixelRatio }))
  await probe.context().close()
  const ctx = await b.newContext({ viewport: null, recordVideo: { dir: 'out/cross/film/tmp', size: { width: win.w, height: win.h } } })
  const p = await ctx.newPage()
  const W = watch(p, 'headed')
  await p.goto(`http://127.0.0.1:${port}/tr`, { waitUntil: 'load', timeout: 180000 })
  await p.waitForFunction(() => window.__lab && window.__lab.A.mode === 'index' && window.__lab.csState, null, { timeout: 120000 })
  await p.bringToFront()
  const env = await p.evaluate(() => {
    const c = document.querySelector('canvas#surface'), gl = c.getContext('webgl2'), d = gl.getExtension('WEBGL_debug_renderer_info')
    return { inner: [innerWidth, innerHeight], dpr: devicePixelRatio, backing: [c.width, c.height], renderer: d ? gl.getParameter(d.UNMASKED_RENDERER_WEBGL) : '?', ua: navigator.userAgent.match(/Chrome\/[\d.]+/)?.[0] }
  })
  console.log(`== headed ${env.ua}  window ${env.inner.join('x')} @ dpr ${env.dpr}  backing ${env.backing.join('x')}\n   renderer: ${env.renderer}`)
  await sleep(1000)
  await p.evaluate(() => window.__lab.go(window.__lab.STOP.work)); await sleep(2200)
  for (let i = 0; i < 3; i++) { await p.keyboard.press('ArrowRight'); await sleep(500) }
  await sleep(1800)
  await p.evaluate(() => { window.__mesh = 0; window.__rv = 0; const s = () => { const c = window.__lab.csState(); if (c.p > 0 && c.p < 1) window.__mesh++; if (c.reveal.on && c.reveal.r > 0 && c.reveal.r < 1) window.__rv++; requestAnimationFrame(s) }; requestAnimationFrame(s) })
  const step = async (dir) => {
    if (keys) await p.keyboard.press(dir > 0 ? 'ArrowDown' : 'ArrowUp')
    else await p.evaluate((d) => window.dispatchEvent(new WheelEvent('wheel', { deltaY: 100 * d, deltaMode: 0, cancelable: true })), dir)
  }
  const shot = async (n) => { await p.screenshot({ path: `out/cross/headed/${n}.png` }); return p.evaluate(() => ({ ...(window.__lab.csState() || {}), path: location.pathname, base: window.__lab.A.base })) }
  const benchUp = () => p.waitForFunction(() => location.pathname.endsWith('/lab') && !document.documentElement.dataset.c2, null, { timeout: 20000 })
  const depthUp = () => p.waitForFunction(() => !location.pathname.includes('/lab') && document.documentElement.dataset.c2 === 'on' && !window.__lab.A.csHeld, null, { timeout: 20000 })
  await shot('0-work')
  await step(1); await sleep(3200); const s1 = await shot('1-behind')
  await step(1); await sleep(1800); const s2 = await shot('2-beside')
  await step(1); await sleep(1800); const s3 = await shot('3-front')
  await step(1); await sleep(2800); const s4 = await shot('4-depth')
  // C3: on to the bench, and up again
  await step(1); await benchUp(); await sleep(1500); const sb = await shot('5-bench')
  const study = await p.evaluate(() => [...document.querySelectorAll('.lab-stage .rec')].findIndex((e) => e.getAttribute('aria-current')))
  await step(-1); await depthUp(); await sleep(1500); const sd = await shot('5-depth-again')
  await step(-1); await sleep(1800); await shot('5-front')
  await step(-1); await sleep(1800); await shot('6-beside')
  await step(-1); await sleep(1800); await shot('7-behind')
  await step(-1); await sleep(3400); await shot('8-work')
  const mesh = await p.evaluate(() => window.__mesh), rv = await p.evaluate(() => window.__rv)
  const back = await p.evaluate(() => ({ base: window.__lab.A.base, work: window.__lab.STOP.work }))
  const bad = await W.verdict(p)
  await ctx.close()
  const dest = `out/cross/film/headed-${env.inner.join('x')}.webm`
  fs.renameSync(await p.video().path(), dest)
  await b.close()
  check([s1.x, s2.x, s3.x, s4.x].join() === '1,2,3,4' && s4.p === 1, `the positions, one gesture each: ${[s1.x, s2.x, s3.x, s4.x].join(' → ')}, DEPTH at rest`)
  check(mesh > 60, `the louvers were drawn: ${mesh} louver frames over the path`)
  check(sb.path.endsWith('/lab') && study === 0, `one more: the blinds open onto the bench, on 01 (${sb.path}, study ${study})`)
  check(!sd.path.includes('/lab') && sd.x === 4 && sd.base === s4.stop, `one up: the blinds close, DEPTH (${sd.path}, x ${sd.x})`)
  check(rv > 30, `the blinds were drawn: ${rv} seam frames, both ways`)
  check(back.base === back.work, 'four gestures back: Work')
  check(bad.length === 0, `console clean (${bad.length})${bad.length ? '\n        ' + bad.slice(0, 6).join('\n        ') : ''}`)
  console.log(`   film ${dest}\n   stills tools/diag/out/cross/headed/`)
  console.log(fails ? `   FAIL (${fails})` : '   PASS')
  process.exit(fails ? 1 : 0)
})()
