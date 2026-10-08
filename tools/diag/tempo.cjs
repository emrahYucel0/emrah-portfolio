// THE WHOLE WALK, MEASURED (R15). From the name, one gesture at a time and as fast as the site lets the next one
// count as a new gesture, until the Contact finale has reached its end — how many gestures each place takes, how long
// each one moves for, and every frame on the way.
//
//   node tempo.cjs <port> [shape] [W]x[H]@[dpr] [--locale=tr] [--query=r15=ab] [--out=out/r15/tempo] [--quiet]
//
//   shape   roll    a mouse wheel turned three detents: 3 x 100 px, 45 ms apart (the default)
//           notchN  one N px wheel event (notch100 is one detent on a Windows mouse; alone it is under a stop's 0.12)
//           swipe   a trackpad swipe, 60 events 16.7 ms apart decaying from 60 px, on an in-page clock
//           touch   a finger swipe up 40% of the screen through Chrome's touch pipeline (CDP), 14 moves
//   --quiet waits for a quiet machine and repeats a disturbed walk (quiet.cjs): frame times are only worth reading so
//
// PER GESTURE: where it was, where it landed, when the motion began, when it had covered 90% of its way ("arrived" —
// what a visitor sees), and when it came to rest (the damping's tail included, which no visitor waits for). The next
// gesture is sent once the last has rested for 500 ms and the site's hush is over, so the walk is the fastest a
// visitor can go without a gesture being read as the tail of the one before.
// PER PLACE: every rAF interval and the JS run inside each frame, at rest and moving, and long tasks.
//
// Measured 2026-10-08 on e192c24 (Chrome, RTX 4050, 144 Hz, quiet machine): roll 30 gestures, swipe 19, touch 24;
// the first work after 10 / 6 / 7. Automated browser results, not device verification (CLAUDE.md).
const pw = require('playwright')
const fs = require('fs'), path = require('path')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const pos = process.argv.slice(2).filter((a) => !a.startsWith('--'))
const argOf = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d }
const [port, shape = 'roll', size = '1440x900@1'] = pos
const loc = argOf('locale', 'tr'), query = argOf('query', ''), outdir = argOf('out', 'out/r15/tempo')
const QUIET_RUN = process.argv.includes('--quiet')
const [, W, H, DPR] = size.match(/(\d+)x(\d+)@([\d.]+)/).map(Number)
const TOUCH = shape === 'touch'
const BASE = `http://127.0.0.1:${port}`

const METER = () => {
  const F = (window.__TEMPO = { d: {}, last: 0, lastY: 0, yAt: 0 })
  const key = () => {
    const L = window.__lab, A = L?.A
    const path = location.pathname
    if (document.documentElement.dataset.c2 === 'on' && A) {
      const at = L.SPINE[Math.max(0, Math.min(L.SPINE.length - 1, Math.round(A.p)))]
      const name = A.mode === 'index' ? at : A.mode
      const lf = L.lfState?.(), cs = L.csState?.()
      const moving = Math.abs(A.p - A.pT) > 0.002 || A.busy || (lf && Math.abs(lf.p - lf.target) > 0.002) || (cs && cs.moving)
      return `${name}|${moving ? 'move' : 'rest'}`
    }
    const now = performance.now()
    if (scrollY !== F.lastY) { F.lastY = scrollY; F.yAt = now }
    const place = /\/contact$/.test(path) ? 'finale' : /\/lab$/.test(path) ? 'bench' : /\/lab\//.test(path) ? 'study' : 'other'
    return `${place}|${now - F.yAt < 120 ? 'move' : 'rest'}`
  }
  // the JS the page runs in each frame: every rAF callback, timed (the runtime's frame loop is one of them)
  F.js = 0; F.c = {}; F.lt = {}
  const raf0 = window.requestAnimationFrame.bind(window)
  window.requestAnimationFrame = (cb) => raf0((t) => { const a = performance.now(); try { cb(t) } finally { F.js += performance.now() - a } })
  const tick = (t) => {
    if (F.last) { const k = key(); (F.d[k] ??= []).push(+(t - F.last).toFixed(2)); (F.c[k] ??= []).push(+F.js.toFixed(2)); F.k = k }
    F.js = 0
    F.last = t
    raf0(tick)
  }
  raf0(tick)
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) { const k = F.k || 'boot'; (F.lt[k] ??= []).push(Math.round(e.duration)) } }).observe({ type: 'longtask', buffered: true }) } catch {}
  F.drain = () => { const d = { iv: F.d, js: F.c, lt: F.lt }; F.d = {}; F.c = {}; F.lt = {}; return d }
  // one trackpad swipe on a fixed in-page clock (cstempo.cjs's shape), resolves when the stream is out
  F.swipe = (sign) => new Promise((res) => {
    const d = Array.from({ length: 60 }, (_, i) => 60 * Math.pow(0.93, i)), t0 = performance.now()
    let i = 0
    const tk = () => {
      const now = performance.now()
      while (i < d.length && now - t0 >= i * 16.7) { window.dispatchEvent(new WheelEvent('wheel', { deltaY: sign * d[i], deltaMode: 0, cancelable: true, bubbles: true })); i++ }
      if (i < d.length) setTimeout(tk, 2); else res()
    }
    tk()
  })
}

const READ = () => {
  const L = window.__lab, A = L?.A
  const c2 = document.documentElement.dataset.c2 ?? 'off'
  const lf = L?.lfState?.(), cs = L?.csState?.()
  const bench = [...document.querySelectorAll('.lab-stage .rec')].findIndex((b) => b.getAttribute('aria-current') === 'true') + 1
  const maxY = document.documentElement.scrollHeight - innerHeight
  const r = {
    path: location.pathname, c2,
    mode: A?.mode ?? null, base: A?.base ?? null, name: A && c2 === 'on' ? L.SPINE[A.base] : null,
    p: A ? +A.p.toFixed(3) : null, pT: A ? +A.pT.toFixed(3) : null, busy: !!A?.busy, hush: A?.hush ? Math.max(0, A.hush - performance.now()) : 0,
    lfp: lf ? +lf.p.toFixed(3) : null, lft: lf ? +lf.target.toFixed(3) : null,
    cs: cs ? JSON.stringify(cs).replace(/(\d+\.\d{3})\d+/g, '$1') : null, csMoving: !!cs?.moving,
    wT: A ? +(A.wT ?? 0).toFixed(3) : null, wL: A?.wLocked ?? null, k: A?.k ?? null, wp: A ? +(A.wp ?? 0).toFixed(3) : null,
    bench, y: Math.round(scrollY), maxY, t: performance.now(),
  }
  // the coarse place, for the log
  r.where = c2 === 'on' ? (A.mode === 'index' ? `${r.name}${r.name === 'linefield' ? ` lf ${r.lfp}` : ''}${r.name === 'work' ? ` w${r.wL}` : ''}${r.name === 'cross' ? ` cs ${cs ? (+cs.p).toFixed(2) : ''}` : ''}` : A.mode)
    : /\/contact$/.test(r.path) ? `finale y ${r.y}/${maxY}` : /\/lab$/.test(r.path) ? `bench ${bench}` : r.path
  r.vec = [r.c2 === 'on' ? r.p : null, r.lfp, cs ? +cs.p : null, A && A.wt != null ? +A.wt.toFixed(3) : null, r.y, bench]
  r.sig = [r.path, c2, r.mode, r.base, r.p, r.lfp, r.cs, r.wT, r.wL, r.k, r.wp, bench, r.y].join('·')
  return r
}

async function walk() {
  fs.mkdirSync(outdir, { recursive: true })
  const b = await pw.chromium.launch({ channel: 'chrome' })
  const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: DPR, ...(TOUCH ? { hasTouch: true, isMobile: true } : {}) })
  await ctx.addInitScript(METER)
  const p = await ctx.newPage()
  const cdp = TOUCH ? await ctx.newCDPSession(p) : null
  const errs = []
  p.on('pageerror', (e) => errs.push(String(e.message).slice(0, 160)))
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 160)) })

  await p.goto(`${BASE}/${loc}${query ? `?${query}` : ''}`, { waitUntil: 'load', timeout: 90000 })
  await p.waitForFunction(() => window.__lab?.A?.mode === 'index', null, { timeout: 60000 })
  const boot = await p.evaluate(() => ({ index: performance.now(), nav: performance.timing.navigationStart }))
  const read = () => p.evaluate(READ)

  // at rest: the continuous signature has not changed for QUIET ms and nothing is in the air
  const QUIET = 500
  const settle = async (t0, limit = 12000) => {
    let s = await read(), last = s.sig, lastAt = s.t, first = null
    const trace = [[s.t, s.vec, s.path]]
    const t90 = () => {
      // first time every component that moved has covered 90% of its way and the route is the final one
      const end = trace[trace.length - 1], beg = trace[0]
      for (const [t, v, pth] of trace) {
        if (pth !== end[2]) continue
        let ok = true
        for (let i = 0; i < v.length; i++) {
          const a = beg[1][i], z = end[1][i]
          if (a == null || z == null || v[i] == null || Math.abs(z - a) < 1e-3) continue
          if (Math.abs(z - v[i]) > 0.1 * Math.abs(z - a)) { ok = false; break }
        }
        if (ok && t >= (first ?? Infinity)) return Math.round(t - t0)
      }
      return null
    }
    while (true) {
      await sleep(40)
      s = await read()
      trace.push([s.t, s.vec, s.path])
      if (s.sig !== last) { last = s.sig; lastAt = s.t; first ??= s.t }
      const air = s.busy || s.csMoving || (s.lfp != null && s.lft != null && Math.abs(s.lfp - s.lft) > 0.002) || (s.p != null && s.c2 === 'on' && Math.abs(s.p - s.pT) > 0.002)
      if (!air && s.t - lastAt >= QUIET) return { s, t90: t90(), moveMs: first == null ? 0 : Math.round(lastAt - t0), startMs: first == null ? null : Math.round(first - t0) }
      if (s.t - t0 > limit) return { s, t90: t90(), moveMs: Math.round(lastAt - t0), startMs: first == null ? null : Math.round(first - t0), timeout: true }
    }
  }
  const nowIn = () => p.evaluate(() => performance.now())

  const center = { x: Math.round(W / 2), y: Math.round(H / 2) }
  const gesture = async (long = false) => {
    if (shape === 'roll') { await p.mouse.move(center.x, center.y); for (let i = 0; i < 3; i++) { await p.mouse.wheel(0, 100); if (i < 2) await sleep(45) } }
    else if (shape.startsWith('notch')) { await p.mouse.move(center.x, center.y); await p.mouse.wheel(0, +(shape.slice(5) || 100)) }
    else if (shape === 'swipe') {
      const s = await read()
      if (s.c2 === 'on' || /\/lab$/.test(s.path)) await p.evaluate(() => window.__TEMPO.swipe(1))
      else { await p.mouse.move(center.x, center.y); for (let i = 0; i < 60; i++) { await p.mouse.wheel(0, 60 * Math.pow(0.93, i)); await sleep(16) } }
    } else {
      // one finger swipe up (the content travels forward), 40% of the screen, 14 moves over ~230 ms
      const x = center.x, y0 = Math.round(H * (long ? 0.94 : 0.72)), dy = -Math.round(H * (long ? 0.88 : 0.4))
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: y0 }] })
      for (let i = 1; i <= 14; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: Math.round(y0 + (dy * i) / 14) }] }); await sleep(16) }
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    }
  }

  // the name, settled; the clock of the walk starts here
  let s0 = (await settle(await nowIn(), 30000)).s
  await p.evaluate(() => window.__TEMPO.drain())
  const rows = []
  const frames = { iv: {}, js: {}, lt: {} }
  const addFrames = (d) => { for (const g of ['iv', 'js', 'lt']) for (const [k, v] of Object.entries(d[g] || {})) (frames[g][k] ??= []).push(...v) }
  let walkMs = 0, walk90 = 0, n = 0, still = 0
  console.log(`== TEMPO  :${port}  ${shape}  ${W}x${H}@${DPR}  ${loc}${query ? `  ?${query}` : ''}   boot→index ${Math.round(boot.index)} ms`)
  while (n < 120) {
    // the next gesture is only a new gesture once the last one's tail and the site's hush are over
    const pre = await read()
    let waitHush = 0
    if (pre.hush > 0) { waitHush = Math.round(pre.hush); await sleep(pre.hush + 30) }
    const t0 = await nowIn()
    const rescue = TOUCH && rows.length >= 2 && !rows[rows.length - 1].moved && !rows[rows.length - 2].moved && rows[rows.length - 1].to === pre.where
    await gesture(rescue)
    const gMs = Math.round((await nowIn()) - t0)
    const r = await settle(t0)
    const after = r.t90 == null ? null : Math.max(0, r.t90 - gMs)
    n++
    const moved = r.s.sig !== pre.sig
    walkMs += r.moveMs + waitHush
    walk90 += (r.t90 ?? r.moveMs) + waitHush
    rows.push({ n, rescue, gMs, after, from: pre.where, to: r.s.where, moved, startMs: r.startMs, t90: r.t90, moveMs: r.moveMs, sum90: walk90, waitHush, timeout: !!r.timeout, path: r.s.path, total: walkMs })
    console.log(`  ${String(n).padStart(3)} ${pre.where.padEnd(24)} → ${r.s.where.padEnd(24)} ${moved ? '' : 'DEAD '}${rescue ? 'RESCUE(long swipe) ' : ''}start ${String(r.startMs ?? '—').padStart(5)}  90% ${String(r.t90 ?? '—').padStart(5)} (input ${String(gMs).padStart(4)}, after ${String(after ?? '—').padStart(4)})  rest ${String(r.moveMs).padStart(5)} ms${waitHush ? `  hush ${waitHush}` : ''}${r.timeout ? '  TIMEOUT' : ''}   Σ90 ${(walk90 / 1000).toFixed(1)} s  Σ ${(walkMs / 1000).toFixed(1)} s`)
    addFrames(await p.evaluate(() => window.__TEMPO.drain()))
    const atEnd = /\/contact$/.test(r.s.path) && r.s.y >= r.s.maxY - 2
    if (!moved) still++; else still = 0
    if (atEnd || still >= 5) break
  }
  // per place: rAF intervals at rest and moving
  const q = (a, f) => a[Math.min(a.length - 1, Math.floor(a.length * f))]
  const tab = (g) => Object.entries(frames[g]).map(([k, v]) => {
    const a = [...v].sort((x, y) => x - y)
    return { k, n: a.length, p50: q(a, 0.5), p95: q(a, 0.95), p99: q(a, 0.99), max: a[a.length - 1], over25: a.filter((x) => x > 25).length, over50: a.filter((x) => x > 50).length, over8: a.filter((x) => x > 8).length }
  }).sort((a, b) => a.k.localeCompare(b.k))
  const table = { iv: tab('iv'), js: tab('js'), lt: frames.lt }
  const jsBy = Object.fromEntries(table.js.map((t) => [t.k, t]))
  console.log(`\n  per place            rAF interval ms:  n     p50    p95    p99    max   >25  >50  | JS per frame ms: p50   p95   max  >8ms`)
  for (const i of table.iv) { const t = jsBy[i.k] || { p50: 0, p95: 0, max: 0, over8: 0 }; console.log(`  ${i.k.padEnd(30)} ${String(i.n).padStart(6)}  ${i.p50.toFixed(1).padStart(6)} ${i.p95.toFixed(1).padStart(6)} ${i.p99.toFixed(1).padStart(6)} ${i.max.toFixed(0).padStart(6)} ${String(i.over25).padStart(5)} ${String(i.over50).padStart(4)}  | ${t.p50.toFixed(1).padStart(15)} ${t.p95.toFixed(1).padStart(5)} ${t.max.toFixed(0).padStart(5)} ${String(t.over8).padStart(4)}`) }
  const lt = Object.entries(frames.lt).map(([k, v]) => `${k} ${v.length}x(max ${Math.max(...v)})`).join(', ')
  console.log(`  long tasks (>50 ms): ${lt || 'none'}`)
  const ratio = await p.evaluate(() => { try { const r = window.__lab.ratio(); return { R: r.R, steps: r.steps, backing: r.backing } } catch { return null } }).catch(() => null)
  console.log(`  drawing ratio at the end: ${JSON.stringify(ratio)}`)
  // per place: how many gestures were spent there (counted where each gesture began), and the first work
  const placeOf = (w) => w.split(' ')[0]
  const per = []
  for (const r of rows) { const k = placeOf(r.from); const last = per[per.length - 1]; if (last && last.k === k) { last.n++; last.ms += r.t90 ?? r.moveMs } else per.push({ k, n: 1, ms: r.t90 ?? r.moveMs }) }
  console.log(`  gestures per place: ${per.map((x) => `${x.k} ${x.n} (${(x.ms / 1000).toFixed(1)} s)`).join(' · ')}`)
  const fw = rows.findIndex((r) => placeOf(r.to) === 'work')
  if (fw >= 0) console.log(`  the first work: gesture ${fw + 1}, ${(rows[fw].sum90 / 1000).toFixed(1)} s of motion to 90%`)
  const live = rows.filter((r) => r.moved).length
  console.log(`
  TEMPO ${shape} ${W}x${H}@${DPR}${query ? ` ?${query}` : ''}: ${n} gestures (${live} moved, ${n - live} dead), Σ to 90% ${(walk90 / 1000).toFixed(1)} s, Σ after-input to 90% ${(rows.reduce((a, r) => a + (r.after ?? 0), 0) / 1000).toFixed(1)} s, Σ to rest ${(walkMs / 1000).toFixed(1)} s, errors ${errs.length}${errs.length ? ' ' + JSON.stringify(errs.slice(0, 2)) : ''}`)
  fs.writeFileSync(path.join(outdir, `tempo-${shape}-${W}x${H}@${DPR}-${loc}${query ? '-' + query.replace(/[^a-z0-9]+/gi, '_') : ''}.json`), JSON.stringify({ port, shape, W, H, DPR, loc, query, boot, rows, per, frames: table, ratio, errs }, null, 1))
  await b.close()
  return errs.length
}

;(QUIET_RUN ? require('./quiet.cjs').guarded(`tempo ${shape} ${size}`, walk) : walk())
  .then((errs) => process.exit(errs ? 1 : 0))
  .catch((e) => { console.error(String(e.stack || e).slice(0, 900)); process.exit(1) })
