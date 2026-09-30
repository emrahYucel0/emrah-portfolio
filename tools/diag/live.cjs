// THE LIVE SITE — the published domain, in a fresh browser session, with nothing of the review server in it.
// node live.cjs [origin]
const pw = require('playwright')
const { stopsOf } = require('./stops.cjs')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const ORIGIN = process.argv[2] || 'https://yucelemrah.com'
let fails = 0
const ok = (c, l, x = '') => { if (!c) fails++; console.log(`  ${c ? 'ok  ' : 'FAIL'} ${l}${x ? ` — ${x}` : ''}`) }

;(async () => {
  const b = await pw.chromium.launch({ channel: 'chrome' })

  // ── 1. what the server answers ──────────────────────────────────────────────
  const req = await b.newContext()
  const api = req.request
  console.log(`== ${ORIGIN} — server`)
  for (const [url, want] of [
    [`http://yucelemrah.com/`, 301], [`http://www.yucelemrah.com/`, 301], [`https://www.yucelemrah.com/`, 301],
  ]) {
    const r = await api.fetch(url, { maxRedirects: 0 }).catch(() => null)
    ok(r && r.status() === want, `${url} → ${want}`, r ? `${r.status()} → ${r.headers().location ?? ''}` : 'no answer')
  }
  for (const p of ['/', '/tr', '/en', '/tr/about', '/en/about', '/tr/lab', '/en/lab', '/tr/lab/weight', '/tr/lab/line', '/tr/lab/tone', '/en/lab/weight', '/robots.txt', '/sitemap.xml', '/favicon.ico', '/og/emrah-yucel-portfolio.jpg']) {
    const r = await api.fetch(ORIGIN + p, { maxRedirects: 0 }).catch(() => null)
    ok(r && r.status() === 200, `${p} → 200`, r ? String(r.status()) : 'no answer')
  }
  const miss = await api.fetch(`${ORIGIN}/this-page-does-not-exist-release-test`, { maxRedirects: 0 }).catch(() => null)
  ok(miss && miss.status() === 404, 'an unknown URL is a real 404, not an SPA fallback', miss ? String(miss.status()) : 'no answer')
  const hdr = await api.fetch(`${ORIGIN}/tr`).catch(() => null)
  const h = hdr ? hdr.headers() : {}
  ok(!!h['content-security-policy'], 'the CSP header is served', (h['content-security-policy'] || '').slice(0, 60))
  // the review server sends its own no-store; only the real host serves the .htaccess rules
  if (/^https/.test(ORIGIN)) ok(/must-revalidate/.test(h['cache-control'] || ''), 'HTML is revalidated on every request', h['cache-control'])
  await req.close()

  // ── 2. the page itself ──────────────────────────────────────────────────────
  const run = async (tag, opts, steps) => {
    const ctx = await b.newContext({ ...opts, bypassCSP: false })
    const p = await ctx.newPage()
    const errs = [], csp = []
    p.on('pageerror', (e) => errs.push(e.message))
    p.on('console', (m) => { if (m.type() === 'error') { (/Content Security Policy/i.test(m.text()) ? csp : errs).push(m.text()) } })
    p.on('requestfailed', (r) => errs.push(`${r.url().slice(-40)} ${r.failure()?.errorText}`))
    console.log(`\n== ${tag}`)
    await steps(p)
    ok(errs.length === 0, `${tag}: no console or page errors`, [...new Set(errs)].slice(0, 2).join(' | ').slice(0, 160))
    ok(csp.length === 0, `${tag}: no CSP violations`, [...new Set(csp)].slice(0, 1).join('').slice(0, 160))
    await ctx.close()
  }
  const state = (p) => p.evaluate(() => ({
    path: location.pathname, c2: document.documentElement.dataset.c2 ?? 'off',
    base: window.__lab?.A?.base ?? null, mode: window.__lab?.A?.mode ?? null,
    about: window.__lab?.A?.aboutOpen ?? null,
    bench: !!document.querySelector('.lab-stage'), study: !!document.querySelector('.study'),
    hero: !!document.querySelector('.hero-about'),
    text: document.body.innerText,
  }))
  const literals = (s) => /\b(undefined|NaN|\[object Object\])\b/.test(s.text)

  await run('desktop 1440 TR, normal motion', { viewport: { width: 1440, height: 900 } }, async (p) => {
    await p.goto(`${ORIGIN}/tr`, { waitUntil: 'networkidle', timeout: 60000 })
    await p.waitForFunction(() => window.__lab?.A.mode === 'index', null, { timeout: 40000 }).catch(() => {})
    await sleep(3200)
    let s = await state(p)
    const STOP = await stopsOf(p)
    ok(s.c2 === 'on' && s.base === STOP.name, 'the homepage loads and the runtime owns it', JSON.stringify({ c2: s.c2, base: s.base }))
    ok(s.hero, 'the hero carries its About control')
    ok(!literals(s), 'no undefined or NaN in what the page says')
    await p.mouse.wheel(0, 150); await sleep(2600)
    ok((await state(p)).base === STOP.creative, 'one wheel notch reaches Creative')
    await p.evaluate(() => document.querySelector('#ui [data-go="system"]').click()); await sleep(2600)
    ok((await state(p)).base === STOP.system, 'Full-Stack')
    await p.evaluate(() => document.querySelector('#ui [data-go="work"]').click()); await sleep(3600)
    ok((await state(p)).base === STOP.work, 'Work')
    await p.evaluate(() => document.querySelector('#ui [data-work="0"]').click()); await sleep(2000)
    await p.evaluate(() => document.querySelector('#ui [data-work="0"]').click())
    await p.waitForFunction(() => window.__lab.A.mode === 'world', null, { timeout: 25000 }).catch(() => {})
    await sleep(3000)
    ok((await state(p)).mode === 'world', 'a project opens')
    await p.evaluate(() => document.querySelector('#ui [data-world="all"]').click()); await sleep(4000)
    ok((await state(p)).base === STOP.work, 'and returns to Work')
    await p.evaluate(() => document.querySelector('#ui [data-go="lab"]').click())
    await p.waitForFunction(() => /\/lab$/.test(location.pathname), null, { timeout: 30000 }).catch(() => {})
    await sleep(2200)
    s = await state(p)
    ok(s.bench && /\/tr\/lab$/.test(s.path), 'Work → Lab reaches the bench', s.path)
    ok(!literals(s), 'the bench says nothing undefined')
    for (const id of ['weight', 'line', 'tone']) {
      await p.goto(`${ORIGIN}/tr/lab/${id}`, { waitUntil: 'networkidle', timeout: 60000 }); await sleep(2600)
      s = await state(p)
      ok(s.study, `${id} loads`)
      ok(!literals(s), `${id} says nothing undefined`)
      await p.click('.study .back'); await sleep(2200)
      ok((await state(p)).bench, `${id} → Lab, by the study's own control`)
    }
    await p.mouse.wheel(0, 200); await sleep(5000)
    s = await state(p)
    ok(s.c2 === 'on' && s.base === STOP.rest, 'Lab → Contact', JSON.stringify({ c2: s.c2, base: s.base }))
    await p.mouse.wheel(0, -200); await sleep(5000)
    await p.waitForFunction(() => /\/lab$/.test(location.pathname), null, { timeout: 25000 }).catch(() => {})
    await p.mouse.wheel(0, -200); await sleep(5000)
    ok((await state(p)).base === STOP.work, 'Lab → Work')
    await p.goto(`${ORIGIN}/tr`, { waitUntil: 'networkidle' })
    await p.waitForFunction(() => window.__lab?.A.mode === 'index', null, { timeout: 40000 }).catch(() => {})
    await sleep(3200)
    await p.click('.hero-about'); await sleep(3400)
    ok((await state(p)).about, 'the hero About control opens About')
    await p.click('.layer.about .more'); await sleep(4200)
    ok(/\/tr\/about$/.test((await state(p)).path), 'and continues to the About route')
    await p.goBack(); await sleep(4000)
    ok(/^\/tr\/?$/.test((await state(p)).path), 'Back returns to the portfolio')
  })

  await run('phone 390 EN, reduced motion', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3, reducedMotion: 'reduce' }, async (p) => {
    await p.goto(`${ORIGIN}/en`, { waitUntil: 'networkidle', timeout: 60000 })
    await p.waitForFunction(() => window.__lab?.A.mode === 'index', null, { timeout: 40000 }).catch(() => {})
    await sleep(3200)
    let s = await state(p)
    ok(s.c2 === 'on' && s.base === 0 && s.hero, 'the English homepage loads with its About control')
    ok(!literals(s), 'no undefined or NaN')
    await p.evaluate(() => document.querySelector('#ui [data-go="lab"]').click())
    await p.waitForFunction(() => /\/lab$/.test(location.pathname), null, { timeout: 30000 }).catch(() => {})
    await sleep(2200)
    s = await state(p)
    ok(s.bench && /\/en\/lab$/.test(s.path), 'the bench on a phone, in English', s.path)
    const scroll = await p.evaluate(() => ({ doc: document.documentElement.scrollHeight, view: innerHeight, over: document.documentElement.scrollWidth > innerWidth + 1 }))
    ok(scroll.doc <= scroll.view + 1 && !scroll.over, 'the bench does not scroll and does not overflow sideways', JSON.stringify(scroll))
    await p.goto(`${ORIGIN}/en/lab/tone`, { waitUntil: 'networkidle' }); await sleep(2600)
    ok((await state(p)).study, 'TONE on a phone')
    const sc = await p.evaluate(() => document.documentElement.scrollHeight > innerHeight + 1)
    ok(sc, 'a study is a document, and scrolls')
  })

  // ── 3. what a crawler sees ──────────────────────────────────────────────────
  const ctx = await b.newContext()
  const p = await ctx.newPage()
  console.log('\n== SEO')
  for (const [path, canon] of [['/tr', `${ORIGIN}/tr`], ['/en', `${ORIGIN}/en`], ['/tr/lab', `${ORIGIN}/tr/lab`], ['/tr/lab/weight', `${ORIGIN}/tr/lab/weight`]]) {
    await p.goto(ORIGIN + path, { waitUntil: 'domcontentloaded' })
    const m = await p.evaluate(() => ({
      canonical: document.querySelector('link[rel=canonical]')?.href ?? null,
      alts: [...document.querySelectorAll('link[rel=alternate]')].map((l) => `${l.hreflang}=${l.href}`),
      title: document.title,
      og: document.querySelector('meta[property="og:image"]')?.content ?? null,
      robots: document.querySelector('meta[name=robots]')?.content ?? null,
      ld: !!document.querySelector('script[type="application/ld+json"]'),
      lang: document.documentElement.lang,
    }))
    ok(m.canonical === canon, `${path} canonical`, m.canonical ?? 'missing')
    ok(m.alts.length >= 3, `${path} hreflang tr / en / x-default`, m.alts.join(' '))
    ok(!!m.og && m.og.startsWith('https://'), `${path} og:image is absolute`, m.og ?? 'missing')
    ok(!/noindex/i.test(m.robots || ''), `${path} is indexable (no staging noindex)`, m.robots ?? 'none')
    ok(!!m.title && !/undefined/.test(m.title), `${path} title`, m.title)
  }
  await p.goto(`${ORIGIN}/tr`, { waitUntil: 'domcontentloaded' })
  ok(await p.evaluate(() => !!document.querySelector('script[type="application/ld+json"]')), 'structured data is present on /tr')
  await ctx.close()

  await b.close()
  console.log(`\nLIVE: ${fails === 0 ? 'PASS' : `FAIL (${fails})`}`)
  process.exit(fails ? 1 : 0)
})().catch((e) => { console.error(String(e).slice(0, 400)); process.exit(1) })
