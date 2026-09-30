// THE CONTACT FINALE'S ROUTE (/[locale]/contact) — what it must carry, in both engines and both languages:
//   - it answers, boots under the production policy with no console message and no page error;
//   - it is a document route: the C2 runtime is NOT mounted there (no data-c2='on', no window.__lab);
//   - its meaning is real DOM: one h1, and the five facts (mailto, tel, GitHub, LinkedIn, the location) — with
//     JavaScript on AND off;
//   - axe finds nothing (wcag2a/aa, 21a/aa, 22aa) at desktop and phone size, normal and reduced motion.
// Screenshots land in out/contact-<engine>-<lang>-<w>.png.
// Needs axe.min.js at the served root: cp tools/diag/node_modules/axe-core/axe.min.js .output/public/
// node contact.cjs <port>
const pw = require('playwright')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const port = process.argv[2] || '4500'
const BASE = `http://127.0.0.1:${port}`
const FACTS = [/^mailto:info@yucelemrah\.com$/, /^tel:\+905065199691$/, /^https:\/\/github\.com\//, /^https:\/\/www\.linkedin\.com\//]
const LOCATION = /(İ|I)stanbul, Türkiye/ // (EN writes Istanbul)
const H1 = { tr: 'İletişim', en: 'Contact' }
const VIEWS = [{ w: 1440, h: 900 }, { w: 390, h: 844 }]

;(async () => {
  let fails = 0
  const bad = (m) => { fails++; console.log(`  FAIL ${m}`) }
  for (const engine of ['chromium', 'webkit']) {
    const b = engine === 'chromium' ? await pw.chromium.launch({ channel: 'chrome' }) : await pw.webkit.launch()
    for (const lang of ['tr', 'en']) {
      for (const v of VIEWS) {
        for (const reduced of [false, true]) {
          const ctx = await b.newContext({ viewport: { width: v.w, height: v.h }, reducedMotion: reduced ? 'reduce' : 'no-preference' })
          const p = await ctx.newPage()
          const msgs = []
          p.on('console', (m) => { if (!/ResizeObserver loop/.test(m.text())) msgs.push(`${m.type()}: ${m.text()}`) })
          p.on('pageerror', (e) => msgs.push(`pageerror: ${e.message}`))
          const res = await p.goto(`${BASE}/${lang}/contact`, { waitUntil: 'networkidle', timeout: 60000 })
          await sleep(1200)
          const tag = `${engine} ${lang} ${v.w}${reduced ? ' reduced' : ''}`
          if (res.status() !== 200) bad(`${tag}: HTTP ${res.status()}`)
          const s = await p.evaluate(() => ({
            c2: document.documentElement.getAttribute('data-c2'), lab: typeof window.__lab,
            h1: [...document.querySelectorAll('h1')].map((h) => h.textContent.trim()),
            hrefs: [...document.querySelectorAll('main a[href]')].map((a) => a.getAttribute('href')),
            text: document.querySelector('main').textContent,
            strip: !!document.querySelector('[data-strip]'),
          }))
          if (s.c2 === 'on' || s.lab !== 'undefined') bad(`${tag}: the C2 runtime is mounted (data-c2=${s.c2}, __lab ${s.lab})`)
          if (s.h1.length !== 1 || s.h1[0] !== H1[lang]) bad(`${tag}: h1 ${JSON.stringify(s.h1)}`)
          for (const re of FACTS) if (!s.hrefs.some((h) => re.test(h))) bad(`${tag}: missing ${re}`)
          if (!LOCATION.test(s.text)) bad(`${tag}: no location`)
          if (!s.strip) bad(`${tag}: no strip`)
          if (msgs.length) bad(`${tag}: console ${JSON.stringify(msgs)}`)
          if (engine === 'chromium' && !reduced) {
            await p.addScriptTag({ url: `${BASE}/axe.min.js` })
            const ax = await p.evaluate(async () => {
              const r = await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } })
              return r.violations.map((x) => `${x.id}(${x.impact}×${x.nodes.length})`)
            })
            if (ax.length) bad(`${tag}: axe ${ax.join('; ')}`)
            console.log(`  ${tag.padEnd(26)} axe ${ax.length}`)
          }
          if (!reduced) await p.screenshot({ path: `out/contact-${engine}-${lang}-${v.w}.png` })
          await ctx.close()
        }
      }
      // JavaScript off: the facts are in the document itself
      const ctx = await b.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } })
      const p = await ctx.newPage()
      await p.goto(`${BASE}/${lang}/contact`, { waitUntil: 'load' })
      const hrefs = await p.evaluate(() => [...document.querySelectorAll('main a[href]')].map((a) => a.getAttribute('href')))
      const missing = FACTS.filter((re) => !hrefs.some((h) => re.test(h)))
      if (missing.length) bad(`${engine} ${lang} no-JS: missing ${missing.join(', ')}`)
      console.log(`  ${`${engine} ${lang} no-JS`.padEnd(26)} facts ${FACTS.length - missing.length}/${FACTS.length}`)
      await ctx.close()
    }
    await b.close()
  }
  console.log(`\nCONTACT ROUTE: ${fails === 0 ? 'PASS' : `FAIL (${fails})`}`)
  process.exit(fails ? 1 : 0)
})().catch((e) => { console.error(String(e).slice(0, 400)); process.exit(1) })
