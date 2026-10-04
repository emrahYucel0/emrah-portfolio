// CROSS SECTION — THE RESPONSIVE PASS (before the release, 2026-10-04): quick checks at every size, in groups.
//
//   node csresp.cjs <port> --group=phones|tablets|laptops|desktop [--sizes=WxH@dpr,...] [--engine=chrome|webkit]
//
// At each size, on the real runtime (development server, flag on):
//   words    SURFACE and DEPTH, their ink as C2 sets it, clear of the strips (top and bottom) and of the screen's edges
//   louvers  the crossing's count and row pitch (rows no finer than 5.2 px on a short screen)
//   blinds   the reveal's slat count, rows and share of the field: phone-like blinds everywhere (about 3.5% each)
//   EDGE     the word at each of the band's three stops, and the copper line, inside the field between the strips
//   seams    the Work seam's identity at both ends and its landings (DEPTH, and SURFACE on the turn back), and the
//            bench seam's identity (the blinds' first frame, their last frame) and its landing up from the bench —
//            each against the measured floor of at most 1 level
//   console  clean (consolewatch.cjs)
// Stills of SURFACE, EDGE beside, DEPTH per size, and a sheet per group, in tools/diag/out/cross/resp/.
const pw = require('playwright')
const sharp = require('sharp')
const fs = require('node:fs')
const { watch } = require('./consolewatch.cjs')
const args = process.argv.slice(2)
const port = args.find((a) => /^\d+$/.test(a)) || '4960'
const opt = (k, d) => { const a = args.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d }
const engine = opt('engine', 'chrome')
const GROUPS = {
  phones: '360x800@3,360x800@2,375x667@2,390x844@3,430x932@3,390x660@3,375x560@3,844x390@3,932x430@3',
  tablets: '768x1024@2,1024x768@2,820x1180@2,1180x820@2,1024x1366@2,1366x1024@2',
  laptops: '1280x800@2,1280x720@1.5,1366x768@1,1440x900@2,1440x900@1,1536x864@1.25,1728x1117@2',
  desktop: '1920x1080@1,1920x1080@2,2560x1440@1,2560x1440@2,3440x1440@1,3840x2160@1,3840x2160@2',
}
const group = opt('group', 'phones')
const SIZES = opt('sizes', GROUPS[group]).split(',').map((s) => { const [wh, d] = s.split('@'); const [w, h] = wh.split('x').map(Number); return { w, h, dpr: Number(d || 1) } })
const MARGIN = 8   // px the words keep from a strip and from the screen's edge
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let fails = 0
const rows = []

;(async () => {
  fs.mkdirSync('out/cross/resp', { recursive: true })
  const b = engine === 'webkit' ? await pw.webkit.launch() : await pw.chromium.launch({ channel: 'chrome' })
  console.log(`== CROSS SECTION, RESPONSIVE — ${group}   ${engine}`)
  for (const S of SIZES) {
    const tag = `${S.w}x${S.h}@${S.dpr}`
    const phone = Math.min(S.w, S.h) < 600, touch = Math.min(S.w, S.h) < 1100
    const ctx = await b.newContext({ viewport: { width: S.w, height: S.h }, deviceScaleFactor: S.dpr, hasTouch: touch, isMobile: engine === 'chrome' && phone ? true : undefined })
    const p = await ctx.newPage()
    const W = watch(p, tag)
    const R = { tag, notes: [] }
    try {
      await p.goto(`http://127.0.0.1:${port}/tr`, { waitUntil: 'load', timeout: 180000 })
      await p.waitForFunction(() => window.__lab && window.__lab.A.mode === 'index' && window.__lab.csState, null, { timeout: 120000 })
      await sleep(1000)
      const STOP = await p.evaluate(() => window.__lab.STOP)
      await p.evaluate(() => window.__lab.csAudit(true))
      await p.evaluate((s) => window.__lab.go(s.cross), STOP); await sleep(2800)
      const L = await p.evaluate(() => window.__lab.csLayout())
      const u = L.u
      // ── the words: ink inside the field and the screen, MARGIN clear ─────────────────────────────────────────────
      const wordOk = L.words.map((w) => {
        const top = w.y0 - L.strip, bot = (L.H - L.strip) - w.y1, left = w.x0, right = L.W - w.x1
        const worst = Math.min(top, bot, left, right)
        return { word: w.word, fs: w.fs, top: Math.round(top), bot: Math.round(bot), left: Math.round(left), right: Math.round(right), ok: worst >= MARGIN }
      })
      R.words = wordOk
      // ── the louvers, and the blinds' slats ──────────────────────────────────────────────────────────────────────
      R.louvers = { count: L.count, rows: +L.rows.toFixed(2) }
      R.blinds = { count: L.reveal.count, rows: L.reveal.rows, px: +L.reveal.pitch.toFixed(1), share: +((L.reveal.pitch / L.h) * 100).toFixed(2) }
      // ── EDGE at each band stop, and the line, inside the field (screen px) ─────────────────────────────────────
      const edge = []
      const shots = []
      for (const x of [0, 1, 2, 3, 4]) {
        await p.evaluate((i) => window.__lab.csSet(i), x); await sleep(x === 0 || x === 4 ? 900 : 700)
        if (x >= 1 && x <= 3) {
          const r = await p.evaluate(() => { const w = document.querySelector('.cs-word').getBoundingClientRect(), l = document.querySelector('.cs-line').getBoundingClientRect(); return { w: [w.left, w.top, w.right, w.bottom], l: [l.left, l.top, l.right, l.bottom], vw: innerWidth, vh: innerHeight } })
          const s0 = L.strip * u, s1 = r.vh - L.strip * u
          const inside = r.w[0] >= 0 && r.w[2] <= r.vw && r.w[1] >= s0 && r.w[3] <= s1
          edge.push({ x, inside, box: r.w.map((v) => Math.round(v)) })
        }
        if (x === 0 || x === 2 || x === 4) { const f = `out/cross/resp/${group}-${tag}-${x}.png`; await p.screenshot({ path: f }); shots.push(f) }
      }
      R.edge = edge
      // ── the seams: the Work seam's ends and landings, the bench seam's ends and its landing ─────────────────────
      const id = {}
      await p.evaluate(() => window.__lab.csSet(1)); await sleep(800)
      for (let i = 0; i < 3; i++) { await p.keyboard.press('ArrowDown'); await sleep(1500) }
      await p.waitForFunction(() => { const c = window.__lab.csState(); return c.x === 4 && c.p === 1 }, null, { timeout: 15000 }).catch(() => {})
      await sleep(800)
      id.depth = await p.evaluate(() => window.__lab.csIdentity()); await sleep(400)
      const rv = await p.evaluate(() => window.__lab.csRevealIdentity()); await sleep(600)
      id.blindsFirst = rv ? rv.first : null; id.blindsLastLit = rv ? rv.last.lit : null
      await p.keyboard.press('ArrowDown')
      await p.waitForFunction(() => /\/lab$/.test(location.pathname) && !document.documentElement.dataset.c2, null, { timeout: 20000 }).catch(() => {})
      await sleep(1200)
      await p.evaluate(() => window.dispatchEvent(new WheelEvent('wheel', { deltaY: -100, cancelable: true })))
      await p.waitForFunction(() => !location.pathname.includes('/lab') && document.documentElement.dataset.c2 === 'on' && !window.__lab.A.csHeld, null, { timeout: 20000 }).catch(() => {})
      await sleep(1200)
      for (let i = 0; i < 4; i++) { await p.keyboard.press('ArrowUp'); await sleep(i === 3 ? 2600 : 1500) }
      await p.evaluate((s) => window.__lab.go(s.cross), STOP); await sleep(2600)
      await p.evaluate(() => window.__lab.csSet(0)); await sleep(900)
      id.surface = await p.evaluate(() => window.__lab.csIdentity())
      const landings = await p.evaluate(() => window.__lab.csLandings())
      const worstOf = (r) => (r ? r.worst : null)
      R.seams = {
        idDepth: worstOf(id.depth), idSurface: worstOf(id.surface), blindsFirst: worstOf(id.blindsFirst), blindsLastLit: id.blindsLastLit,
        landDepth: worstOf(landings.find((l) => l.side === 1 && !l.kind)), landSurface: worstOf(landings.find((l) => l.side === 0)), landBench: worstOf(landings.find((l) => l.kind === 'bench')),
      }
      // ── a sheet: SURFACE, EDGE beside, DEPTH ────────────────────────────────────────────────────────────────────
      const H = S.w > S.h ? 200 : 300
      const tiles = await Promise.all(shots.map((f) => sharp(f).resize({ height: H }).png().toBuffer()))
      const m = await sharp(tiles[0]).metadata()
      await sharp({ create: { width: (m.width + 4) * 3, height: H, channels: 3, background: '#f0f' } }).composite(tiles.map((t, i) => ({ input: t, left: i * (m.width + 4), top: 0 }))).png().toFile(`out/cross/resp/${group}-${tag}-sheet.png`)
    } catch (e) { R.notes.push(`error: ${String(e).slice(0, 160)}`) }
    const v = await W.verdict(p).catch(() => ['verdict failed'])
    R.console = v.length
    await ctx.close()
    // ── the verdict for this size ─────────────────────────────────────────────────────────────────────────────────
    const s = R.seams || {}
    const seamVals = [s.idDepth, s.idSurface, s.blindsFirst, s.landDepth, s.landSurface, s.landBench]
    R.ok = {
      words: !!R.words && R.words.every((w) => w.ok),
      // (the row pitch is what the rule protects: no finer than the site's phone pitch; a count is only a consequence)
      louvers: !!R.louvers && R.louvers.rows >= 5.2 && R.louvers.count >= 15,
      blinds: !!R.blinds && R.blinds.share >= 3.4 && R.blinds.share <= 6,
      edge: !!R.edge && R.edge.length === 3 && R.edge.every((e) => e.inside),
      seams: seamVals.every((v) => v != null && v <= 1) && s.blindsLastLit === 0,
      console: R.console === 0,
    }
    const okAll = Object.values(R.ok).every(Boolean) && !R.notes.length
    if (!okAll) fails++
    rows.push(R)
    const w = R.words ? R.words.map((x) => `${x.word} ${x.fs}px [t${x.top} b${x.bot} l${x.left} r${x.right}]`).join(' · ') : '—'
    console.log(`\n ${okAll ? 'ok  ' : 'FAIL'} ${tag}`)
    console.log(`      words    ${R.ok.words ? 'ok ' : 'NO '} ${w}`)
    console.log(`      louvers  ${R.ok.louvers ? 'ok ' : 'NO '} ${R.louvers ? `${R.louvers.count} louvers, rows ${R.louvers.rows} px` : '—'}`)
    console.log(`      blinds   ${R.ok.blinds ? 'ok ' : 'NO '} ${R.blinds ? `${R.blinds.count} slats of ${R.blinds.rows} rows, ${R.blinds.px} px, ${R.blinds.share}% of the field` : '—'}`)
    console.log(`      EDGE     ${R.ok.edge ? 'ok ' : 'NO '} ${R.edge ? R.edge.map((e) => `${e.x}:${e.inside ? 'in' : 'OUT ' + e.box.join(',')}`).join(' ') : '—'}`)
    console.log(`      seams    ${R.ok.seams ? 'ok ' : 'NO '} identity DEPTH ${s.idDepth} / SURFACE ${s.idSurface}, landings DEPTH ${s.landDepth} / SURFACE ${s.landSurface} / up from the bench ${s.landBench}, blinds first ${s.blindsFirst} / last lit ${s.blindsLastLit} (levels)`)
    console.log(`      console  ${R.ok.console ? 'ok ' : 'NO '} ${R.console}${R.notes.length ? '   ' + R.notes.join(' | ') : ''}`)
  }
  await b.close()
  fs.writeFileSync(`out/cross/resp/${group}-${engine}.json`, JSON.stringify(rows, null, 2))
  console.log(fails ? `\n   ${group}: FAIL (${fails} of ${rows.length} sizes)` : `\n   ${group}: PASS (${rows.length} sizes)`)
  process.exit(fails ? 1 : 0)
})()
