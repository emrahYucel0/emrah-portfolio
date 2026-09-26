// DOES THE SERVED BUILD ACTUALLY BOOT UNDER THE CSP THE HOST WILL SEND?
//
// The production .htaccess pins each inline script by sha256. sv.cjs reads .htaccess ONCE at startup, so a server
// that was running before a rebuild serves the NEW html with the OLD hash: the inline script is refused, the
// runtime never boots, and the page shows the first-paint plate with a document scrollbar and nothing else. No
// request fails, so the network tab looks perfect. This harness exists because that failure is silent and looks
// exactly like broken product code.
//
//   node cspboot.cjs --dir <path>              PRE-DEPLOY. No server, no browser: does the .htaccess in this built
//                                              artifact name every inline script in that artifact's own HTML?
//   node cspboot.cjs --static <port|origin>    the same question, of something already being served.
//   node cspboot.cjs <port|origin> [chrome|webkit]   loads /tr and /tr/lab and asserts the runtime came up.
//
// <origin> may be a full URL (https://yucelemrah.com), which is how this runs against the live host after a
// deploy. A bare number is taken as a port on 127.0.0.1.
const crypto = require('crypto')
const http = require('http')
const https = require('https')
const fs = require('fs')
const path = require('path')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const originOf = (t) => (/^https?:\/\//i.test(t) ? t.replace(/\/$/, '') : `http://127.0.0.1:${t}`)

// THE HOST BLOCKS AI CRAWLERS AND NON-BROWSER CLIENTS, and answers them 403. That is a live, healthy site
// refusing a stranger — not a broken one. Every request here therefore identifies as an ordinary browser, and a
// 403 is reported as BLOCKED, never as a failure: the only thing it proves is that the request did not look like
// a visitor. A human opening the page in a real browser is what settles it.
const UA = {
  chrome: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
  webkit: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Safari/605.1.15',
  mobile: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Mobile/15E148 Safari/604.1',
}
const BLOCKED = 'blocked-by-host'

const get = (target, p) => new Promise((resolve, reject) => {
  const url = new URL(originOf(target) + p)
  const mod = url.protocol === 'https:' ? https : http
  mod.get(url, { headers: {
    'user-agent': UA.chrome,
    accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'accept-language': 'tr-TR,tr;q=0.9,en;q=0.8',
    'accept-encoding': 'identity',
  } }, (res) => {
    let body = ''
    res.setEncoding('utf8')
    res.on('data', (c) => { body += c })
    res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }))
  }).on('error', reject)
})

// only EXECUTABLE inline scripts are gated by script-src: a data payload is never run and CSP never asks for it
const executable = (attrs) => {
  const t = /\btype\s*=\s*["']?([^"'\s>]+)/i.exec(attrs)
  return !t || /^(text\/javascript|module|application\/javascript)$/i.test(t[1])
}
const inlineHashes = (html) => [...html.matchAll(/<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/g)]
  .filter((m) => executable(m[1]))
  .map((m) => `sha256-${crypto.createHash('sha256').update(m[2], 'utf8').digest('base64')}`)

// PRE-DEPLOY: the artifact on disk, checked against itself. This is the one that must run before anything is
// uploaded — the policy and the documents travel together or the site does not boot.
function dirCheck(root) {
  const ht = path.join(root, '.htaccess')
  if (!fs.existsSync(ht)) { console.log(`  FAIL no .htaccess in ${root}`); return 1 }
  const m = fs.readFileSync(ht, 'utf8').match(/Header\s+(?:always\s+)?set\s+Content-Security-Policy\s+"([\s\S]*?)"\s*$/m)
  if (!m) { console.log('  FAIL .htaccess carries no Content-Security-Policy'); return 1 }
  const named = new Set(m[1].replace(/\\\n\s*/g, ' ').match(/sha256-[A-Za-z0-9+/=]+/g) || [])
  const htmls = []
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, e.name)
      if (e.isDirectory()) walk(full)
      else if (e.name.endsWith('.html')) htmls.push(full)
    }
  }
  walk(root)
  let bad = 0, checked = 0
  const missing = new Map()
  for (const f of htmls) {
    for (const h of inlineHashes(fs.readFileSync(f, 'utf8'))) {
      checked++
      if (!named.has(h)) { bad++; if (!missing.has(h)) missing.set(h, path.relative(root, f)) }
    }
  }
  console.log(`  .htaccess names ${named.size} hash(es); ${htmls.length} HTML files carry ${checked} executable inline script(s)`)
  if (bad) {
    console.log(`  FAIL ${bad} inline script(s) are NOT named by this artifact's own .htaccess:`)
    for (const [h, f] of [...missing].slice(0, 5)) console.log(`       ${h}  first seen in ${f}`)
    console.log('       This artifact would not boot: the browser refuses the inline script and no JavaScript runs.')
    return 1
  }
  // and nothing named should be dead weight from an older build
  const used = new Set(htmls.flatMap((f) => inlineHashes(fs.readFileSync(f, 'utf8'))))
  const stale = [...named].filter((h) => !used.has(h))
  if (stale.length) console.log(`  note: ${stale.length} hash(es) in the policy match no document in this artifact`)
  console.log('  ok   every inline script in this artifact is named by the .htaccess shipping beside it')
  return 0
}

// every inline <script> in the document must be named by the CSP the same document was served with
async function staticCheck(port) {
  let bad = 0, blocked = 0
  for (const path of ['/tr', '/tr/lab', '/en']) {
    const r = await get(port, path)
    if (r.status === 403) {
      console.log(`  BLOCKED ${path} answered 403 — the host refused this client, which it does to anything that`)
      console.log(`          does not look like a browser. This says nothing about the site. Check it by hand.`)
      blocked++
      continue
    }
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
  return blocked && !bad ? BLOCKED : bad
}

async function browserCheck(port, engine) {
  const pw = require('playwright')
  const b = engine === 'webkit' ? await pw.webkit.launch() : await pw.chromium.launch({ channel: 'chrome' })
  let bad = 0, blocked = 0
  for (const path of ['/tr', '/tr/lab']) {
    // Playwright's default user agent says HeadlessChrome, which is exactly what the host refuses. Ask as a
    // browser; if it still says 403 that is the host's decision about the client, not a fact about the site.
    const ctx = await b.newContext({ viewport: { width: 1366, height: 768 }, userAgent: engine === 'webkit' ? UA.webkit : UA.chrome, locale: 'tr-TR' })
    const p = await ctx.newPage()
    const csp = [], errs = [], failed = []
    p.on('pageerror', (e) => errs.push(String(e.message).slice(0, 120)))
    p.on('console', (m) => { if (m.type() === 'error') (/Content Security/i.test(m.text()) ? csp : errs).push(m.text().slice(0, 160)) })
    p.on('response', (r) => { if (r.status() >= 400) failed.push(`${r.status()} ${new URL(r.url()).pathname}`) })
    const resp = await p.goto(originOf(port) + path, { waitUntil: 'networkidle', timeout: 60000 })
    if (resp && resp.status() === 403) {
      blocked++
      console.log(`  BLOCKED ${engine} ${path} answered 403 — the host refused this client. Not a site failure;`)
      console.log(`          open it in a real browser to decide.`)
      await ctx.close()
      continue
    }
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
  return blocked && !bad ? BLOCKED : bad
}

;(async () => {
  const args = process.argv.slice(2)
  let bad
  if (args[0] === '--dir') { console.log(`== PRE-DEPLOY: does this artifact's .htaccess match its own HTML? ${args[1]}`); bad = dirCheck(args[1]) }
  else if (args[0] === '--static') { console.log(`== CSP vs the served document, ${originOf(args[1])}`); bad = await staticCheck(args[1]) }
  else { console.log(`== does it boot under the production CSP, ${originOf(args[0])}`); bad = await browserCheck(args[0], args[1] || 'chrome') }
  if (bad === BLOCKED) {
    console.log('CSPBOOT: BLOCKED BY HOST — every request was refused before it reached the site.')
    console.log('         This is NOT a site failure and must never be reported as one. The host answers 403 to')
    console.log('         AI crawlers and to anything that does not look like a browser. Your own browser decides.')
    process.exit(2)
  }
  console.log(`CSPBOOT: ${bad ? `FAIL (${bad})` : 'PASS'}`)
  process.exit(bad ? 1 : 0)
})().catch((e) => { console.error(String(e).slice(0, 300)); process.exit(1) })
