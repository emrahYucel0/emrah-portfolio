// iOS 15.4 (Safari 15.4) for the Contact finale — without a device. The site's floor is iOS 15.4 (the Nuxt /
// vue-router runtime itself calls Array#at and Object.hasOwn; decided 2026-09-29, no polyfills — docs/KNOWN-ISSUES.md,
// docs/POST-M5-IOS15-COMPATIBILITY.md); the validation device is an iPhone 7 Plus on iOS 15.8.8. The build lowers
// SYNTAX, but it cannot lower a missing API or a regex feature — one regex lookbehind (Safari 16.4) made the
// prototype a parse error on the real phone.
//
// 1) STATIC: the finale's sources (engine/lab/finale, its page, the ?debug=1 panel) through esbuild at target
//    safari15.4 (a regex it rewrites into `new RegExp` would still throw there), plus a scan for runtime APIs
//    Safari 15.4 lacks.
// 2) RUNTIME IMITATION on the BUILT site, in the floor's profile (Safari 15.4): /tr/contact at phone size with what
//    that Safari lacks removed before any script runs, module workers made to fail (the finale's own fallback) and
//    font-stretch reported as not drawn (?stretch=0) — the finale must still take its RICH path: it starts, the
//    ink canvas carries the plot, the email soaks, no uncaught error. The ?debug=1 panel is captured.
// node compat-ios15.cjs <port>
const fs = require('fs')
const path = require('path')
const { transformSync } = require('../../node_modules/esbuild')
const pw = require('playwright')

const ROOT = path.resolve(__dirname, '../..')
const port = process.argv[2] || '4500'
const SOURCES = [
  ...fs.readdirSync(path.join(ROOT, 'engine/lab/finale')).filter((f) => f.endsWith('.js')).map((f) => `engine/lab/finale/${f}`),
  'app/pages/[locale]/contact.vue',
  'public/finale-debug.js',
]
// what Safari 15.4 lacks (Array#at, Object.hasOwn, structuredClone, findLast, crypto.randomUUID arrived IN 15.4)
const API = [
  [/\.(toSorted|toReversed|toSpliced)\(/, 'change-array-by-copy (16+)'],
  [/\b(Object|Map)\.groupBy\b/, 'groupBy (17.4)'],
  [/\bAbortSignal\.timeout\b/, 'AbortSignal.timeout (16)'],
  [/\bOffscreenCanvas\b/, 'OffscreenCanvas (16.4)'],
  [/\brequestIdleCallback\b/, 'requestIdleCallback (never in Safari)'],
]

const statics = []
for (const rel of SOURCES) {
  let src = fs.readFileSync(path.join(ROOT, rel), 'utf8')
  if (rel.endsWith('.vue')) src = (/<script[^>]*>([\s\S]*?)<\/script>/.exec(src) || [, ''])[1]
  try {
    const out = transformSync(src, { loader: rel.endsWith('.vue') ? 'ts' : 'js', target: 'safari15.4', format: 'esm' })
    if (/new RegExp\(/.test(out.code) && !/new RegExp\(/.test(src)) statics.push(`${rel}: a regex literal needs a feature Safari 15.4 lacks (esbuild rewrote it to new RegExp — it would still throw)`)
    for (const w of out.warnings) statics.push(`${rel}: ${w.text}`)
  } catch (e) { statics.push(`${rel}: esbuild safari15.4: ${e.message.split('\n')[0]}`) }
  src.split('\n').forEach((line, i) => {
    if (/^\s*(\/\/|\*)/.test(line)) return
    if (/\bprobe\(/.test(line)) return // the debug panel's feature probes TEST for an API, they do not use it
    for (const [re, name] of API) if (re.test(line)) statics.push(`${rel}:${i + 1}: ${name}`)
  })
}

// removed before any script of the page runs — what Safari 15.4 does not have
const REMOVE = `(() => {
  const del = (o, k) => { try { delete o[k] } catch (e) {} }
  del(window, 'OffscreenCanvas')
  for (const P of [Array.prototype]) { del(P, 'toSorted'); del(P, 'toReversed'); del(P, 'toSpliced') }
  del(Object, 'groupBy'); del(Map, 'groupBy'); del(AbortSignal, 'timeout')
  // a module worker that cannot start (the finale must fall back to its main-thread tone path)
  const W = window.Worker
  window.Worker = function (url, opts) { if (opts && opts.type === 'module') throw new TypeError('module workers unsupported (imitated)'); return new W(url, opts) }
})()`

;(async () => {
  const b = await pw.chromium.launch({ channel: 'chrome' })
  const ctx = await b.newContext({ viewport: { width: 375, height: 667 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
  await ctx.addInitScript(REMOVE)
  const p = await ctx.newPage()
  const errs = []
  p.on('pageerror', (e) => errs.push(e.message))
  p.on('console', (m) => { if (m.type() === 'error' && !/ResizeObserver loop/.test(m.text())) errs.push(`console: ${m.text()}`) })
  await p.goto(`http://127.0.0.1:${port}/tr/contact?debug=1&stretch=0`, { waitUntil: 'networkidle', timeout: 60000 })
  await p.waitForTimeout(2500)
  await p.evaluate(() => { const t = document.querySelector('.finale .track'); scrollTo(0, t.offsetTop + (3.2 / 4.4) * (t.offsetHeight - innerHeight)) })
  await p.waitForTimeout(3500)
  const rt = await p.evaluate(() => {
    const c = document.querySelector('.finale canvas.ink'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data
    let ink = 0
    for (let i = 3; i < d.length; i += 16) if (d[i] > 150) ink++
    return {
      removed: { OffscreenCanvas: typeof window.OffscreenCanvas, toSorted: typeof [].toSorted, groupBy: typeof Object.groupBy },
      started: !!window.__finaleStarted, panelErrors: window.__dbg ? window.__dbg.errors : ['(no panel)'],
      fallbacks: window.__dbg ? window.__dbg.fallbacks : [], inkPixels: ink,
      emailSoaked: window.__finale ? window.__finale.plotter.soakTOf('email', 1) : null,
      budgetHolds: window.__finale ? window.__finale.plotter.invariant() : null,
    }
  })
  fs.mkdirSync(path.join(__dirname, 'out'), { recursive: true })
  await p.screenshot({ path: path.join(__dirname, 'out/compat-ios15-panel.png') })
  await b.close()
  console.log(JSON.stringify({ statics, runtime: { ...rt, pageErrors: errs } }, null, 2))
  const ok = !statics.length && rt.started && !errs.length && !rt.panelErrors.length && rt.inkPixels > 1000 && rt.emailSoaked === 1 && rt.budgetHolds
  console.log(`\nCOMPAT IOS15.4: ${ok ? 'PASS (rich path, no uncaught errors)' : 'FAIL'}`)
  process.exit(ok ? 0 : 1)
})().catch((e) => { console.error(String(e).slice(0, 400)); process.exit(1) })
