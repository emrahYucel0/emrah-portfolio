// THE FINALE ASKS ONCE — the way in, the attention guide, the foot band (pre-F4 design round).
//  1. arrival at p = 0: after 2.5 s of stillness (the site's one hint system, engine/cues.js — R3) the tear row
//     breathes (p untouched) and the foot's middle says to scroll; not before; the first scroll ends both for good,
//     and the ask is spent for the session. Reduced motion: the words, no breath.
//  2. desktop: the drawing done and the cursor still for 2.5 s → attention goes to GitHub and back to the email,
//     "move your cursor"; once per session; any movement cancels it. Reduced motion: the words only.
//  3. phone: the same walk by scroll-attention, "keep scrolling".
//  4. the foot's two ends are the home strip's words (TR/EN), fixed for the whole drawing — no ink counter.
//  5. no scrollbar on /contact, and the keyboard still scrolls it.
// Stills → docs/contact-finale/f3b/.   node beckon.cjs <port>
const fs = require('fs')
const path = require('path')
const pw = require('playwright')
const port = process.argv[2] || '4500'
const BASE = `http://127.0.0.1:${port}`
const OUT = path.resolve(__dirname, '../../docs/contact-finale/f3b')
fs.mkdirSync(OUT, { recursive: true })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let fails = 0
const ok = (cond, label, extra = '') => { if (!cond) fails++; console.log(`  ${cond ? 'ok  ' : 'FAIL'} ${label}${extra ? ` — ${extra}` : ''}`) }
const ready = (pg) => pg.waitForFunction(() => !!window.__finale, null, { timeout: 20000 }).catch(() => {})
const hintOf = () => { const h = document.querySelector('.finale .foot .hint'); return { on: h.classList.contains('on'), text: h.textContent.trim(), shown: getComputedStyle(h).textTransform === 'uppercase' ? h.textContent.toLocaleUpperCase(document.documentElement.lang) : h.textContent } }
// the tear row's ink, as a signature: it changes while the row breathes
const tearSig = () => {
  const F = window.__finale, V = F.plotter.view, c = document.querySelector('.finale canvas.ink')
  const dpr = c.width / innerWidth, y0 = Math.max(0, Math.floor((V.yTear - 10) * dpr)), h = Math.ceil(24 * dpr)
  const d = c.getContext('2d').getImageData(0, y0, c.width, h).data
  let s = 0; for (let i = 3; i < d.length; i += 4) s += d[i]
  return s
}
const attOf = (id) => window.__finale.partition.attOf(id)?.att ?? 0
const tag0 = (reduced) => (reduced ? 'reduced' : 'normal')
/*
 * THE WAY IN IS FROM THE BENCH. A direct /contact opens the drawing settled (AUDIT-01, batch 1), so a page opened on
 * that URL never stands at p = 0 and has nothing to beckon — which is what this section measured, and failed on, from
 * then on. A visitor reaches p = 0 by scrolling down off the bench, so that is how the check arrives.
 */
const fromBench = async (p) => {
  await p.goto(`${BASE}/tr/lab`, { waitUntil: 'networkidle' }); await sleep(2400)
  await p.mouse.move(700, 450)
  // one notch, as spine.cjs crosses: a longer burst's tail could leave the drawing a hair past p = 0
  await p.mouse.wheel(0, 110)
  await p.waitForFunction(() => /\/contact$/.test(location.pathname) && !!window.__finale, null, { timeout: 20000 })
  await sleep(300)
  const y = await p.evaluate(() => scrollY)
  if (y !== 0) console.log(`       (arrived at scrollY ${y}, not 0)`)
}

;(async () => {
  const br = await pw.chromium.launch({ channel: 'chrome' })
  const errs = []
  const page = async (opts) => { const ctx = await br.newContext(opts); const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/ResizeObserver/.test(m.text())) errs.push(m.text()) }); return [ctx, p] }
  const desk = { viewport: { width: 1440, height: 900 } }

  console.log('== 1. the way in')
  for (const reduced of [false, true]) {
    const [ctx, p] = await page({ ...desk, reducedMotion: reduced ? 'reduce' : 'no-preference' })
    await fromBench(p); await sleep(900)
    // not yet: a hint waits for stillness
    const early = await p.evaluate(hintOf)
    const e0 = []; for (let i = 0; i < 3; i++) { e0.push(await p.evaluate(tearSig)); await sleep(150) }
    ok(!early.on && new Set(e0).size === 1, `${tag0(reduced)}: before 2.5 s of stillness nothing asks and nothing breathes`)
    await sleep(2000)
    const h = await p.evaluate(hintOf)
    const sigs = []
    for (let i = 0; i < 6; i++) { sigs.push(await p.evaluate(tearSig)); await sleep(230) }
    const breathing = new Set(sigs).size > 2
    const y = await p.evaluate(() => scrollY)
    const tag = reduced ? 'reduced' : 'normal'
    ok(h.on && h.shown === 'AŞAĞI KAYDIR', `${tag}: at p = 0 the foot asks to scroll`, h.shown)
    ok(reduced ? !breathing : breathing, `${tag}: the tear row ${reduced ? 'is still' : 'breathes'} while p stays 0`, `distinct signatures ${new Set(sigs).size}/6, scrollY ${y}`)
    if (!reduced) await p.screenshot({ path: path.join(OUT, 'arrival-desktop.png') })
    await p.mouse.move(700, 450); await p.mouse.wheel(0, 120); await sleep(900)
    await p.evaluate(() => scrollTo(0, 0)); await sleep(900)
    const h2 = await p.evaluate(hintOf)
    const s2 = []; for (let i = 0; i < 4; i++) { s2.push(await p.evaluate(tearSig)); await sleep(230) }
    ok(!h2.on && new Set(s2).size === 1, `${tag}: the first scroll ends both, for good (back at p = 0: no words, no breath)`)
    // and it was asked once in this session: arriving again in the same tab asks nothing
    await fromBench(p); await sleep(3400)
    ok(!(await p.evaluate(hintOf)).on, `${tag}: once per session — a second arrival is not asked again`)
    await ctx.close()
  }

  console.log('\n== 2. the cursor guide (desktop)')
  {
    const [ctx, p] = await page(desk)
    await p.goto(`${BASE}/tr/contact`, { waitUntil: 'networkidle' }); await ready(p); await sleep(800)
    await p.mouse.move(300, 300)
    await p.evaluate(() => window.dispatchEvent(new Event('finale:arrive'))); await sleep(1500)
    const gh0 = await p.evaluate(() => document.querySelector('[data-cell="github"]').getBoundingClientRect().width)
    await sleep(2300)
    const mid = await p.evaluate(() => ({ h: (() => { const h = document.querySelector('.finale .foot .hint'); return { on: h.classList.contains('on'), t: h.textContent } })(), gh: document.querySelector('[data-cell="github"]').getBoundingClientRect().width }))
    await p.screenshot({ path: path.join(OUT, 'guide-desktop-github.png') })
    ok(mid.h.on && mid.h.t === 'imleci gezdir', 'the cursor still for 2.5 s → the foot says "imleci gezdir"', mid.h.t)
    ok(mid.gh > gh0 * 1.3, 'attention went to GitHub, which grew', `${Math.round(gh0)} → ${Math.round(mid.gh)} px`)
    await sleep(2600)
    const end = await p.evaluate(() => ({ on: document.querySelector('.finale .foot .hint').classList.contains('on'), gh: document.querySelector('[data-cell="github"]').getBoundingClientRect().width, key: sessionStorage.getItem('cue:finale-guide') }))
    ok(!end.on && end.gh < mid.gh * 0.85 && end.key === '1', 'it comes back, the words go, and it is spent for the session', `github ${Math.round(end.gh)} px`)
    await p.reload({ waitUntil: 'networkidle' }); await ready(p); await sleep(600)
    await p.evaluate(() => window.dispatchEvent(new Event('finale:arrive'))); await sleep(4200)
    ok(!(await p.evaluate(() => document.querySelector('.finale .foot .hint').classList.contains('on'))), 'once per session: not shown again')
    await ctx.close()
  }
  {
    const [ctx, p] = await page(desk)
    await p.goto(`${BASE}/tr/contact`, { waitUntil: 'networkidle' }); await ready(p); await sleep(800)
    await p.mouse.move(300, 300)
    await p.evaluate(() => window.dispatchEvent(new Event('finale:arrive'))); await sleep(3800)
    const on = await p.evaluate(() => document.querySelector('.finale .foot .hint').classList.contains('on'))
    // the cursor goes to the email: the guide lets go at once, and attention is the cursor's again
    const er = await p.evaluate(() => { const r = document.querySelector('[data-cell="email"]').getBoundingClientRect(); return { x: r.left + 40, y: r.top + r.height / 2 } })
    await p.mouse.move(er.x, er.y, { steps: 3 }); await sleep(80)
    const off = await p.evaluate(() => !document.querySelector('.finale .foot .hint').classList.contains('on'))
    await sleep(1200)
    const att = await p.evaluate(() => ({ email: window.__finale.partition.attOf('email').attT, github: window.__finale.partition.attOf('github').attT }))
    ok(on && off && att.email === 1 && att.github === 0, 'moving the cursor cancels it at once; attention follows the cursor again', JSON.stringify(att))
    await ctx.close()
  }
  {
    const [ctx, p] = await page({ ...desk, reducedMotion: 'reduce' })
    await p.goto(`${BASE}/tr/contact`, { waitUntil: 'networkidle' }); await ready(p); await sleep(800)
    await p.mouse.move(300, 300)
    await p.evaluate(() => window.dispatchEvent(new Event('finale:arrive'))); await sleep(1200)
    const gh0 = await p.evaluate(() => document.querySelector('[data-cell="github"]').getBoundingClientRect().width)
    await sleep(2400)
    const s = await p.evaluate(() => ({ on: document.querySelector('.finale .foot .hint').classList.contains('on'), gh: document.querySelector('[data-cell="github"]').getBoundingClientRect().width }))
    ok(s.on && Math.abs(s.gh - gh0) < 2, 'reduced motion: the words only, nothing moves', `github ${Math.round(gh0)} → ${Math.round(s.gh)}`)
    await ctx.close()
  }

  console.log('\n== 3. the phone: attention walked by scroll')
  {
    const [ctx, p] = await page({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
    await p.goto(`${BASE}/tr/contact`, { waitUntil: 'networkidle' }); await ready(p); await sleep(800)
    await p.screenshot({ path: path.join(OUT, 'arrival-phone.png') })
    /* A direct /contact opens settled, so the guide starts on its own once the sheet has been still for the hint
       system's 2.5 s; a 'finale:arrive' sent afterwards found it already walked (this failed from batch 1 on). The
       check waits for the walk to reach GitHub rather than for a fixed time. */
    await p.waitForFunction(() => window.__finale.partition.attOf('github').att > 0.5, null, { timeout: 9000 }).catch(() => {})
    const s = await p.evaluate(() => ({ on: document.querySelector('.finale .foot .hint').classList.contains('on'), t: document.querySelector('.finale .foot .hint').textContent, gh: window.__finale.partition.attOf('github').att }))
    await p.screenshot({ path: path.join(OUT, 'guide-phone-github.png') })
    ok(s.on && s.t === 'kaydırmaya devam et' && s.gh > 0.5, 'still for 2.5 s → "kaydırmaya devam et", attention walks to GitHub', `github att ${s.gh.toFixed(2)}`)
    await p.waitForFunction(() => !document.querySelector('.finale .foot .hint').classList.contains('on'), null, { timeout: 9000 }).catch(() => {})
    await sleep(400)
    const e = await p.evaluate(() => ({ on: document.querySelector('.finale .foot .hint').classList.contains('on'), gh: window.__finale.partition.attOf('github').att, y: Math.round(scrollY) }))
    ok(!e.on && e.gh < 0.2, 'and back, without the page having scrolled', `github att ${e.gh.toFixed(2)}`)
    await ctx.close()
  }

  console.log('\n== 4. the foot band: the home strip\'s words, fixed')
  for (const lang of ['tr', 'en']) {
    const [ctx, p] = await page(desk)
    await p.goto(`${BASE}/${lang}`, { waitUntil: 'networkidle' })
    await p.waitForFunction(() => window.__lab?.A.mode === 'index' && document.querySelector('#hint')?.textContent, null, { timeout: 30000 }).catch(() => {})
    await sleep(1500)
    const home = await p.evaluate(() => ({ roles: document.querySelector('.strip.bottom .roles').textContent.trim(), state: document.querySelector('#hint').textContent.trim() }))
    await p.goto(`${BASE}/${lang}/contact`, { waitUntil: 'networkidle' }); await ready(p); await sleep(800)
    const at = []
    for (const f of [0, 0.3, 0.6, 1]) {
      await p.evaluate((f) => { const t = document.querySelector('.finale .track'); scrollTo(0, t.offsetTop + f * (t.offsetHeight - innerHeight)) }, f)
      await sleep(700)
      at.push(await p.evaluate(() => ({ roles: document.querySelector('.finale .foot .roles').textContent.trim(), state: document.querySelector('.finale .foot .state').textContent.trim(), all: document.querySelector('.finale .foot').textContent })))
    }
    const fixed = at.every((a) => a.roles === home.roles && a.state === home.state)
    const noCounter = at.every((a) => !/mm|△|mürekkep|ink/i.test(a.all))
    ok(fixed && noCounter, `${lang}: left "${home.roles}", right "${home.state}" — the home strip's, at every p, no counter`, fixed ? '' : JSON.stringify(at[3]))
    await p.screenshot({ path: path.join(OUT, `foot-${lang}-p1.png`), clip: { x: 0, y: 900 - 60, width: 1440, height: 60 } })
    await ctx.close()
  }
  {
    const [ctx, p] = await page({ viewport: { width: 375, height: 667 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
    // a direct /contact opens settled, so what the band asks here is the guide, after the hint system's stillness
    await p.goto(`${BASE}/tr/contact`, { waitUntil: 'networkidle' }); await ready(p)
    await p.waitForFunction(() => document.querySelector('.finale .foot .hint').classList.contains('on'), null, { timeout: 8000 }).catch(() => {})
    await sleep(600)
    const f = await p.evaluate(() => { const foot = document.querySelector('.finale .foot'), r = foot.getBoundingClientRect(); const vis = [...foot.children].filter((e) => getComputedStyle(e).display !== 'none' && +getComputedStyle(e).opacity > 0.5).map((e) => { const b = e.getBoundingClientRect(); return { c: e.className, l: Math.round(b.left), r: Math.round(b.right) } }); return { vis, w: innerWidth, overflow: document.documentElement.scrollWidth > innerWidth + 1 } })
    const inside = f.vis.every((v) => v.l >= 0 && v.r <= f.w)
    ok(inside && !f.overflow && f.vis.length === 1 && f.vis[0].c.includes('hint'), 'phone 375: while the band asks, it says only that (the status yields), inside the screen', JSON.stringify(f.vis))
    await ctx.close()
  }

  console.log('\n== 5. no scrollbar, the keyboard still scrolls')
  {
    const [ctx, p] = await page(desk)
    await p.goto(`${BASE}/tr/contact`, { waitUntil: 'networkidle' }); await ready(p); await sleep(800)
    await p.mouse.click(700, 120) // (nothing there takes a click: the sheet)
    const bar = await p.evaluate(() => innerWidth - document.documentElement.clientWidth)
    await p.keyboard.press('PageDown'); await sleep(700)
    const y = await p.evaluate(() => Math.round(scrollY))
    ok(bar === 0 && y > 200, 'no scrollbar; PageDown still scrolls the drawing', `bar ${bar}px, scrollY ${y}`)
    await ctx.close()
  }

  {
    // after a visit to the index the runtime stays in memory; its keys must not be taken from the finale (they were:
    // PageDown did nothing here and moved the hidden index instead — fixed with the warm-up round)
    const [ctx, p] = await page(desk)
    await p.goto(`${BASE}/tr`, { waitUntil: 'networkidle' })
    await p.waitForFunction(() => window.__lab?.A.mode === 'index', null, { timeout: 30000 }).catch(() => {})
    await sleep(1500)
    await p.evaluate(() => document.querySelector('#ui [data-go="rest"]').click()); await ready(p); await sleep(1200)
    await p.evaluate(() => scrollTo(0, 0)); await sleep(400)
    const base0 = await p.evaluate(() => window.__lab.A.base)
    await p.mouse.click(700, 120); await p.keyboard.press('PageDown'); await sleep(700)
    const r = await p.evaluate(() => ({ y: Math.round(scrollY), base: window.__lab.A.base }))
    ok(r.y > 200 && r.base === base0, 'after a visit to the index, PageDown still scrolls the drawing and the hidden index stays put', `scrollY ${r.y}, index ${base0} → ${r.base}`)
    await ctx.close()
  }

  await br.close()
  console.log(`\n  console errors ${errs.length} ${JSON.stringify([...new Set(errs)].slice(0, 3))}`)
  if (errs.length) fails++
  console.log(`\nBECKON: ${fails === 0 ? 'PASS' : `FAIL (${fails})`}`)
  process.exit(fails ? 1 : 0)
})().catch((e) => { console.error(String(e).slice(0, 800)); process.exit(1) })
