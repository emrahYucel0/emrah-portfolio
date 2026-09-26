// THE ENGRAVED PROOF — Phase 1: the passage, not the picture.
// Every way into it, both ways out, the fold at the end, and the places it must never touch.
// node proof1.cjs <port> [locale]
const pw = require('playwright')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const [port, loc = 'tr'] = process.argv.slice(2)
let fails = 0
const NL = String.fromCharCode(10)
const ok = (c, l, x = '') => { if (!c) fails++; console.log(`  ${c ? 'ok  ' : 'FAIL'} ${l}${x ? ` — ${x}` : ''}`) }
const BASE = `http://127.0.0.1:${port}`
const momentum = async (p, dir) => { for (const d of [6, 14, 26, 38, 44, 40, 34, 27, 21, 16, 12, 9, 7, 5, 4, 3, 2, 1]) { await p.mouse.wheel(0, d * dir); await sleep(16) } }

;(async () => {
  const b = await pw.webkit.launch()
  const ctx = await b.newContext({ viewport: { width: 1366, height: 768 } })
  const p = await ctx.newPage()
  const errs = []
  p.on('pageerror', (e) => errs.push(e.message))
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()) })

  const st = () => p.evaluate(() => ({
    path: location.pathname,
    c2: document.documentElement.dataset.c2 ?? 'off',
    mode: window.__lab?.A?.mode ?? null,
    base: window.__lab?.A?.base ?? null,
    wt: window.__lab?.A ? Math.round(window.__lab.A.wt) : null,
    stage: document.querySelector('.proof-stages li[aria-current]')?.textContent?.trim() ?? null,
    stages: [...document.querySelectorAll('.proof-stages li')].length,
    scrollable: document.documentElement.scrollHeight > innerHeight + 1,
    trackH: document.querySelector('.proof-track')?.getBoundingClientRect().height ?? 0,
  }))
  const home = async () => {
    await p.goto(`${BASE}/${loc}`, { waitUntil: 'networkidle', timeout: 60000 })
    await p.waitForFunction(() => window.__lab?.A.mode === 'index', null, { timeout: 40000 }).catch(() => {})
    await sleep(3000)
  }
  const toWork = async () => { await p.evaluate(() => document.querySelector('#ui [data-go="work"]').click()); await sleep(3800) }
  const waitProof = () => p.waitForFunction(() => /\/lab\/proof$/.test(location.pathname), null, { timeout: 25000 }).catch(() => {})

  console.log(`== PROOF PHASE 1 · ${loc.toUpperCase()} ==\n-- every way in`)

  // 1. wheel past the last project
  await home(); await toWork()
  await p.mouse.wheel(0, 400); await sleep(900); await p.mouse.wheel(0, 400); await sleep(900); await p.mouse.wheel(0, 400)
  await waitProof(); await sleep(1600)
  let s = await st()
  ok(/\/lab\/proof$/.test(s.path), 'wheel past the last project → the proof', s.path)
  ok(s.c2 === 'off', 'and the screen belongs to the document', `data-c2 ${s.c2}`)
  ok(s.stages === 4 && !!s.stage, 'the four stages are named, one of them current', `${s.stages} · ${s.stage}`)
  ok(s.scrollable && s.trackH > 768 * 3, 'the press is a document with a track to scroll', `track ${Math.round(s.trackH)}px`)

  // 2. the strip's LAB control, standing on Work
  await home(); await toWork()
  await p.evaluate(() => document.querySelector('#ui [data-go="lab"]').click())
  await waitProof(); await sleep(1400)
  ok(/\/lab\/proof$/.test((await st()).path), 'the strip LAB control on Work → the proof')

  // 3. the keyboard
  await home(); await toWork()
  await p.keyboard.press('ArrowDown')
  await waitProof(); await sleep(1400)
  ok(/\/lab\/proof$/.test((await st()).path), 'ArrowDown on Work → the proof')

  // 4. a whole momentum burst is still one passage
  await home(); await toWork()
  await momentum(p, 1); await momentum(p, 1); await momentum(p, 1)
  await waitProof(); await sleep(1600)
  ok(/\/lab\/proof$/.test((await st()).path), 'a momentum burst off Work → the proof, once')

  console.log('\n-- progression')
  await p.evaluate(() => scrollTo(0, 0)); await sleep(700)
  const seen = []
  for (const f of [0, 0.3, 0.55, 0.8, 0.99]) {
    await p.evaluate((v) => { const t = document.querySelector('.proof-track'); scrollTo(0, t.offsetTop + (t.offsetHeight - innerHeight) * v) }, f)
    await sleep(500)
    seen.push((await st()).stage)
  }
  ok(new Set(seen).size === 4, 'scrolling moves through all four stages, in order', seen.join(' → '))
  await p.evaluate(() => { const t = document.querySelector('.proof-track'); scrollTo(0, t.offsetTop + (t.offsetHeight - innerHeight) * 0.3) })
  await sleep(500)
  const backAgain = (await st()).stage
  ok(backAgain === seen[1], 'scrolling back returns to the same stage', `${backAgain}`)

  console.log('\n-- the way out, backward')
  await p.evaluate(() => scrollTo(0, 0)); await sleep(800)
  await p.mouse.wheel(0, -150); await sleep(4200)
  s = await st()
  ok(new RegExp(`^/${loc}/?$`).test(s.path), 'one reverse gesture at the top → the site', s.path)
  ok(s.mode === 'index' && s.base === 3, 'and it is Work, composed', JSON.stringify({ mode: s.mode, base: s.base }))
  ok(s.c2 === 'on', 'the runtime has the screen again', `data-c2 ${s.c2}`)

  console.log(NL + '-- the way out, forward: scrolling past the end')
  await home(); await toWork()
  await p.mouse.wheel(0, 400); await sleep(900); await p.mouse.wheel(0, 400); await sleep(900); await p.mouse.wheel(0, 400)
  await waitProof(); await sleep(1600)
  await p.evaluate(() => { const t = document.querySelector('.proof-track'); scrollTo(0, t.offsetTop + t.offsetHeight) })
  await sleep(800)
  ok(await p.evaluate(() => scrollY + innerHeight >= document.documentElement.scrollHeight - 1), 'the track can be scrolled to its end')
  await p.mouse.wheel(0, 150)
  await p.waitForFunction(() => window.__lab?.A?.mode === 'bridge' || /\/lab$/.test(location.pathname), null, { timeout: 25000 }).catch(() => {})
  await sleep(1000)
  const fwd = await st()
  ok(fwd.mode === 'bridge' || /\/lab$/.test(fwd.path), 'one further gesture past the last stage starts the fold', JSON.stringify({ mode: fwd.mode, path: fwd.path }))
  await p.waitForFunction(() => /\/lab$/.test(location.pathname), null, { timeout: 25000 }).catch(() => {})
  await sleep(2000)
  ok(await p.evaluate(() => /\/lab$/.test(location.pathname) && !!document.querySelector('.lab-stage')), 'and it carries through to the bench, with no control pressed')

  console.log('\n-- the way out, forward: the fold')
  await home(); await toWork()
  await p.mouse.wheel(0, 400); await sleep(900); await p.mouse.wheel(0, 400); await sleep(900)
  const workAt = (await st()).wt   // the project in register as the visitor leaves, not as they arrived
  await p.mouse.wheel(0, 400)
  await waitProof(); await sleep(1600)
  await p.click('.proof-skip')
  await p.waitForFunction(() => window.__lab?.A?.mode === 'bridge', null, { timeout: 20000 }).catch(() => {})
  const during = await st()
  ok(during.mode === 'bridge', 'the skip hands the screen back and the existing fold runs', `mode ${during.mode}`)
  ok(during.c2 === 'on', 'the runtime owns the screen during the fold', `data-c2 ${during.c2}`)
  await p.waitForFunction(() => /\/lab$/.test(location.pathname), null, { timeout: 25000 }).catch(() => {})
  await sleep(2200)
  s = await st()
  ok(/\/lab$/.test(s.path), 'the fold ends on the bench', s.path)
  ok(s.c2 === 'off', 'and the screen is the document\'s again', `data-c2 ${s.c2}`)
  ok(await p.evaluate(() => !!document.querySelector('.lab-stage')), 'the bench is there')

  console.log('\n-- history')
  await p.goBack(); await sleep(4000)
  s = await st()
  ok(new RegExp(`^/${loc}/?$`).test(s.path), 'Back from the bench skips the proof and reaches the site', s.path)
  ok(s.mode === 'index' && s.base === 3, 'at Work, composed — not at the Lab stop the fold ended on', JSON.stringify({ mode: s.mode, base: s.base }))
  ok(s.wt === workAt, 'on the project the visitor had registered', `${s.wt} vs ${workAt}`)

  console.log('\n-- the passage happens once')
  await toWork(); await sleep(1200)
  await p.evaluate(() => document.querySelector('#ui [data-go="lab"]').click())
  // the fold is 2.5 s and the index may still be damping when the control is pressed: wait for the destination,
  // not for a fixed number of milliseconds
  await p.waitForFunction(() => /\/lab$/.test(location.pathname), null, { timeout: 30000 }).catch(() => {})
  await sleep(1200)
  s = await st()
  ok(/\/lab$/.test(s.path), 'a second Work → Lab in the same session plays the plain fold, straight to the bench', s.path)

  console.log('\n-- the places it must not touch')
  await home()
  await p.evaluate(() => document.querySelector('#ui [data-go="rest"]').click()); await sleep(4200)
  ok((await st()).base === 5, 'standing at Contact')
  await p.mouse.wheel(0, -150)
  await p.waitForFunction(() => /\/lab$/.test(location.pathname), null, { timeout: 25000 }).catch(() => {})
  await sleep(1500)
  s = await st()
  ok(/\/lab$/.test(s.path), 'Contact → Lab reaches the bench and never the proof', s.path)

  console.log('\n-- a direct arrival')
  const ctx2 = await b.newContext({ viewport: { width: 1366, height: 768 } })
  const p2 = await ctx2.newPage()
  p2.on('pageerror', (e) => errs.push('direct: ' + e.message))
  await p2.goto(`${BASE}/${loc}/lab/proof`, { waitUntil: 'networkidle', timeout: 60000 })
  await sleep(2500)
  ok(await p2.evaluate(() => [...document.querySelectorAll('.proof-stages li')].length === 4), 'the proof loads on its own URL')
  await p2.evaluate(() => { const t = document.querySelector('.proof-track'); scrollTo(0, t.offsetTop + (t.offsetHeight - innerHeight) * 0.45) })
  await sleep(2600)
  await p2.click('.proof-skip')
  await p2.waitForFunction(() => /\/lab$/.test(location.pathname), null, { timeout: 30000 }).catch(() => {})
  await sleep(2000)
  ok(await p2.evaluate(() => /\/lab$/.test(location.pathname) && !!document.querySelector('.lab-stage')), 'and a cold visitor still reaches the bench', await p2.evaluate(() => location.pathname))
  await ctx2.close()

  console.log(NL + '-- a cold arrival that makes nothing')
  const ctx3 = await b.newContext({ viewport: { width: 1366, height: 768 } })
  const p3 = await ctx3.newPage()
  p3.on('pageerror', (e) => errs.push('cold-skip: ' + e.message))
  await p3.goto(BASE + '/' + loc + '/lab/proof', { waitUntil: 'networkidle', timeout: 60000 })
  await sleep(1200)
  ok(await p3.evaluate(() => document.querySelector('.proof-stages li[aria-current]')?.textContent?.trim().startsWith('01')), 'still in the first stage, before the runtime has been asked for')
  // every frame's ownership is recorded, so a work field the visitor never chose cannot pass unseen
  const owned = []
  const poll = setInterval(() => {
    p3.evaluate(() => document.documentElement.dataset.c2 ?? 'off').then((v) => owned.push(v)).catch(() => {})
  }, 60)
  await p3.click('.proof-skip')
  await p3.waitForFunction(() => /\/lab$/.test(location.pathname), null, { timeout: 30000 }).catch(() => {})
  await sleep(2500)
  clearInterval(poll)
  const cold = await p3.evaluate(() => ({ path: location.pathname, bench: !!document.querySelector('.lab-stage') }))
  ok(/\/lab$/.test(cold.path) && cold.bench, 'a cold visitor who skips at once reaches the bench', cold.path)
  ok(!owned.includes('on'), 'and the runtime never takes the screen, so no unvisited work field is shown', 'ownership seen: ' + ([...new Set(owned)].join(',') || 'none'))
  await ctx3.close()

  ok(errs.length === 0, 'no page or console errors', [...new Set(errs)].slice(0, 2).join(' | ').slice(0, 180))

  await b.close()
  console.log(`\nPROOF PHASE 1 (${loc}): ${fails === 0 ? 'PASS' : `FAIL (${fails})`}`)
  process.exit(fails ? 1 : 0)
})().catch((e) => { console.error(String(e).slice(0, 400)); process.exit(1) })
