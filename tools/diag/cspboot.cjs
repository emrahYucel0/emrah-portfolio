// DOES THE SERVED BUILD ACTUALLY BOOT UNDER THE CSP THE HOST WILL SEND?
//
// The production .htaccess pins each inline script by sha256. sv.cjs reads .htaccess ONCE at startup, so a server
// that was running before a rebuild serves the NEW html with the OLD hash: the inline script is refused, the
// runtime never boots, and the page shows the first-paint plate with a document scrollbar and nothing else. No
// request fails, so the network tab looks perfect. This harness exists because that failure is silent and looks
// exactly like broken product code.
//
//   node cspboot.cjs --static <port>     hashes only: no browser. Fast enough to preflight every port.
//   node cspboot.cjs <port> [chrome|webkit]   loads /tr and /tr/lab and asserts the runtime came up.
const crypto = require('crypto')
const http = require('http')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const get = (port, path) => new Promise((resolve, reject) => {
  http.get({ host: '127.0.0.1', port, path }, (res) => {
    let body = ''
    res.setEncoding('utf8')
    res.on('data', (c) => { body += c })
    res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }))
  }).on('error', reject)
})

// every inline <script> in the document must be named by the CSP the same document was served with
async function staticCheck(port) {
  let bad = 0
  for (const path of ['/tr', '/tr/lab', '/en']) {
    const r = await get(port, path)
    if (r.status !== 200) { console.log(`  FAIL ${path} answered ${r.status}`); bad++; continue }
    const csp = r.headers['content-security-policy'] || ''
    const named = new Set((csp.match(/sha256-[A-Za-z0-9+/=]+/g) || []))
    // Only EXECUTABLE inline scripts are gated by script-src. A <script type="application/ld+json"> block, or any
    // other data payload, is never run by the browser and CSP never asks for its hash — counting it would report a
    // stale server on a perfectly fresh one.
    const executable = (attrs) => {
      const t = /\btype\s*=\s*["']?([^"'\s>]+)/i.exec(attrs)
      return !t || /^(text\/javascript|module|application\/javascript)$/i.test(t[1])
    }
    const inline = [...r.body.matchAll(/<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/g)]
      .filter((m) => executable(m[1]))
      .map((m) => m[2])
    const missing = []
    for (const src of inline) {
      const h = 'sha256-' + crypto.createHash('sha256').update(src, 'utf8').digest('base64')
      if (!named.has(h)) missing.push(h)
    }
    if (!csp) { console.log(`  FAIL ${path} was served with no Content-Security-Policy at all`); bad++ }
    else if (missing.length) {
      bad++
      console.log(`  FAIL ${path} — ${missing.length} of ${inline.length} inline script(s) are not named by the CSP this server sends`)
      console.log(`       the document needs ${missing[0]}`)
      console.log(`       the CSP offers    ${[...named][0] || '(no hashes)'}`)
      console.log(`       STALE SERVER: restart it, or it is serving a rebuild with a pre-rebuild policy`)
    } else console.log(`  ok   ${path} — ${inline.length} inline script(s), all named by the served CSP`)
  }
  return bad
}

async function browserCheck(port, engine) {
  const pw = require('playwright')
  const b = engine === 'webkit' ? await pw.webkit.launch() : await pw.chromium.launch({ channel: 'chrome' })
  let bad = 0
  for (const path of ['/tr', '/tr/lab']) {
    const ctx = await b.newContext({ viewport: { width: 1366, height: 768 } })
    const p = await ctx.newPage()
    const csp = [], errs = [], failed = []
    p.on('pageerror', (e) => errs.push(String(e.message).slice(0, 120)))
    p.on('console', (m) => { if (m.type() === 'error') (/Content Security/i.test(m.text()) ? csp : errs).push(m.text().slice(0, 160)) })
    p.on('response', (r) => { if (r.status() >= 400) failed.push(`${r.status()} ${new URL(r.url()).pathname}`) })
    await p.goto(`http://127.0.0.1:${port}${path}`, { waitUntil: 'networkidle', timeout: 60000 })
    await sleep(4500)
    const s = await p.evaluate(() => {
      const cv = document.querySelector('.lab-stage canvas')
      const recs = [...document.querySelectorAll('.lab-stage .rec')]
      return {
        booted: typeof window.__lab === 'object', c2: document.documentElement.dataset.c2 ?? 'off',
        docScroll: document.documentElement.scrollHeight > innerHeight + 4,
        // A bench that never ran its script still has its elements — that is the whole trap. What it does NOT have
        // is a canvas its script sized (an unsized canvas keeps the 300x150 default) or records spread down the
        // rail (they pile up in the top-left corner instead). Both are measured, neither is an inline style.
        canvasW: cv ? Math.round(cv.getBoundingClientRect().width) : 0,
        canvasAttr: cv ? cv.width : 0,
        recs: recs.length,
        spread: recs.length ? Math.round(Math.max(...recs.map((e) => e.getBoundingClientRect().top))
          - Math.min(...recs.map((e) => e.getBoundingClientRect().top))) : 0,
      }
    })
    const isLab = path.endsWith('/lab')
    // on a C2 route the runtime must own the screen; on a Lab route it must not, but the bench must have RUN
    const well = isLab
      ? (s.recs > 0 && s.canvasAttr > 300 && Math.abs(s.canvasAttr - s.canvasW) < 2 && s.spread > 100)
      : (s.booted && s.c2 === 'on' && !s.docScroll)
    const problem = csp.length || errs.length || failed.length || !well
    if (problem) bad++
    console.log(`  ${problem ? 'FAIL' : 'ok  '} ${engine} ${path} — ${isLab
      ? `canvas ${s.canvasAttr}px sized by its script (css ${s.canvasW}px), ${s.recs} records spread over ${s.spread}px`
      : `__lab ${s.booted ? 'object' : 'undefined'}, data-c2 ${s.c2}, document scrollbar ${s.docScroll}`}`)
    if (csp.length) console.log(`       CSP VIOLATION: ${csp[0]}`)
    if (errs.length) console.log(`       error: ${errs[0]}`)
    if (failed.length) console.log(`       failed request: ${failed[0]}`)
    await ctx.close()
  }
  await b.close()
  return bad
}

;(async () => {
  const args = process.argv.slice(2)
  let bad
  if (args[0] === '--static') { console.log(`== CSP vs the served document, port ${args[1]}`); bad = await staticCheck(args[1]) }
  else { console.log(`== does it boot under the production CSP, port ${args[0]}`); bad = await browserCheck(args[0], args[1] || 'chrome') }
  console.log(`CSPBOOT: ${bad ? `FAIL (${bad})` : 'PASS'}`)
  process.exit(bad ? 1 : 0)
})().catch((e) => { console.error(String(e).slice(0, 300)); process.exit(1) })
