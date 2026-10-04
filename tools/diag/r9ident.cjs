// R9 PROTOTYPE, THE NO-KEY GUARANTEE — without ?r9= the build draws the same pixels as the base; every variant boots
// clean, shows its badge and draws something different.
//
//   node r9ident.cjs        base (8da676c) on 4970, the prototype build on 4971
//
// Read on Ege inside and Linefield's dark half (no ambient wave, so two builds can match to the byte).
const pw = require('playwright')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const grab = async (port, q, scene, W, H, dpr) => {
  const b = await pw.chromium.launch({ channel: 'chrome' })
  const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: dpr })
  await ctx.addInitScript(() => { const o = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function (t, a) { if (t === 'webgl2') a = Object.assign({}, a || {}, { preserveDrawingBuffer: true }); return o.call(this, t, a) } })
  const p = await ctx.newPage()
  const errs = []
  p.on('console', (m) => { if ((m.type() === 'error' || m.type() === 'warning') && !/preload/.test(m.text())) errs.push(m.text().slice(0, 140)) })
  p.on('pageerror', (e) => errs.push('pageerror ' + e.message))
  const url = scene === 'work' ? `/tr/work/ege${q}` : `/tr${q}`
  await p.goto(`http://127.0.0.1:${port}${url}`, { waitUntil: 'networkidle' })
  await p.waitForFunction(() => window.__lab && (window.__lab.A.mode === 'index' || (window.__lab.A.mode === 'world' && !window.__lab.A.busy)), null, { timeout: 90000 })
  await sleep(2600)
  if (scene === 'lf') { await p.evaluate(() => window.__lab.go(window.__lab.STOP.linefield)); await sleep(2600); await p.evaluate(() => window.__lab.lfSet(0)); await sleep(900) }
  if (scene === 'system') { await p.evaluate(() => window.__lab.go(window.__lab.STOP.system)); await sleep(2600) }
  const r = await p.evaluate(() => {
    const gl = window.__lab.surface.gl
    const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight, buf = new Uint8Array(w * h * 4)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, buf)
    let s = ''; for (let i = 0; i < buf.length; i += 8192) s += String.fromCharCode.apply(null, buf.subarray(i, i + 8192))
    return { w, h, b64: btoa(s), err: gl.getError(), badge: document.body.innerText.includes('R9 ') }
  })
  await b.close()
  return { buf: Buffer.from(r.b64, 'base64'), w: r.w, h: r.h, glErr: r.err, errs, badge: r.badge }
}
;(async () => {
  let fail = 0
  for (const [W, H, dpr] of [[1920, 991, 1], [1440, 900, 2]]) for (const scene of ['work', 'lf']) {
    const a = await grab(4970, '', scene, W, H, dpr)
    const b = await grab(4971, '', scene, W, H, dpr)
    let diff = 0
    for (let i = 0; i < a.buf.length; i++) if (a.buf[i] !== b.buf[i]) diff++
    const ok = diff === 0 && a.buf.length === b.buf.length && !b.badge
    if (!ok) fail++
    console.log(`${ok ? 'ok  ' : 'FAIL'} no key = base, ${scene} ${W}x${H}@${dpr}: ${diff} bytes differ of ${a.buf.length}${b.badge ? ' (badge shown!)' : ''}`)
  }
  for (const q of ['?r9=a', '?r9=b', '?r9=c']) for (const scene of ['system', 'work', 'lf']) {
    const r = await grab(4971, q, scene, 1920, 991, 1)
    const base = await grab(4971, '', scene, 1920, 991, 1)
    let diff = 0
    for (let i = 0; i < r.buf.length; i++) if (r.buf[i] !== base.buf[i]) diff++
    const ok = r.glErr === 0 && !r.errs.length && r.badge && diff > 0
    if (!ok) fail++
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${q} ${scene}: gl ${r.glErr}, console ${r.errs.length ? r.errs.join(' | ') : 'clean'}, badge ${r.badge}, differs from no-key: ${diff} bytes`)
  }
  console.log(fail ? `R9IDENT: FAIL (${fail})` : 'R9IDENT: PASS')
})()
