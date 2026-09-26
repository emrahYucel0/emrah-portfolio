// A PROJECT'S NAME, THROUGH THE RELEASE: can it be read, and does it stay off the capture?
//
// Two bugs in three passes came from this one place. A project's first frame sets its name in a box the material
// clears, and inside a project the ground is near-black: a void is where the rows stop, so a void is DARK. The
// desktop box was `wb-band`, the one block class coloured --ink, so it was dark type on dark ground — the name
// survived only where the rows happened to be dense, and the line beneath it fell onto the bare ground and onto
// the captured site's own navigation. `authored` sets its name in the strip and `scale` in `wb-facts`; both
// inherit `.wb`'s --paper and both stay legible.
//
// So this measures two things, at every sampled moment of the release:
//   contrast   the distance between the type's own colour and the median luminance of the ground beneath it.
//              Not "is the ground cream" — that would punish the two rhythms that are right.
//   clearance  the gap between the last line of the title and the top of the capture being shown.
//
// node titlefit.cjs <port> [locale] [w] [h] [label] [only]
const pw = require('playwright')
const sharp = require('sharp')
const fs = require('fs')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const [port, loc = 'tr', W = '1440', H = '900', label = 'x', only = ''] = process.argv.slice(2)
const NAMES = ['istanbul', 'ege', 'evden']
const dir = `out/titlefit/${label}-${W}x${H}-${loc}`
fs.mkdirSync(dir, { recursive: true })

;(async () => {
  const b = await pw.webkit.launch()
  const ctx = await b.newContext({ viewport: { width: +W, height: +H }, deviceScaleFactor: 1 })
  const p = await ctx.newPage()
  await p.goto(`http://127.0.0.1:${port}/${loc}`, { waitUntil: 'networkidle', timeout: 60000 })
  await p.waitForFunction(() => window.__lab?.A.mode === 'index', null, { timeout: 40000 })
  await sleep(2500)
  await p.evaluate(() => document.querySelector('#ui [data-go="work"]').click())
  await p.waitForFunction(() => window.__lab.A.base === 3 && !window.__lab.A.busy, null, { timeout: 20000 }).catch(() => {})
  await sleep(2500)

  let worst = 999
  const KS = only === '' ? [0, 1, 2] : [+only]
  for (const k of KS) {
    await p.evaluate((i) => document.querySelector(`#ui [data-work="${i}"]`)?.click(), k)
    await p.waitForFunction((i) => window.__lab.A.wLocked === i && window.__lab.WORKS()[i]?.fill > 0.5 && !window.__lab.A.busy, k, { timeout: 25000 })
    await sleep(400)
    const t0 = Date.now()
    await p.evaluate((i) => document.querySelector(`#ui [data-work="${i}"]`)?.click(), k)
    console.log(`\n  -- ${NAMES[k]} --`)
    for (const at of [200, 400, 600, 800, 1000, 1400, 1800, 2400]) {
      while (Date.now() - t0 < at) await sleep(20)
      const png = await p.screenshot()
      fs.writeFileSync(`${dir}/${NAMES[k]}-${String(at).padStart(4, '0')}.png`, png)
      const m = await p.evaluate(() => {
        const el = document.querySelector('.wb.on') || document.querySelector('.wb[data-f="0"]')
        if (!el) return null
        const kids = [...el.children].map((c) => c.getBoundingClientRect()).filter((c) => c.height > 0)
        if (!kids.length) return null
        const col = (getComputedStyle(el).color.match(/[\d.]+/g) || [0, 0, 0]).map(Number)
        return {
          lum: 0.2126 * col[0] + 0.7152 * col[1] + 0.0722 * col[2],
          op: +getComputedStyle(el).opacity,
          x: Math.round(Math.min(...kids.map((c) => c.left))),
          y: Math.round(Math.min(...kids.map((c) => c.top))),
          w: Math.round(Math.max(...kids.map((c) => c.right)) - Math.min(...kids.map((c) => c.left))),
          h: Math.round(Math.max(...kids.map((c) => c.bottom)) - Math.min(...kids.map((c) => c.top))),
        }
      })
      if (!m) { console.log(`   ${String(at).padStart(4)}ms  no block yet`); continue }
      const { data, info } = await sharp(png).greyscale().raw().toBuffer({ resolveWithObject: true })
      const vals = []
      for (let y = Math.max(0, m.y); y < Math.min(info.height, m.y + m.h); y++) {
        for (let x = Math.max(0, m.x); x < Math.min(info.width, m.x + m.w); x++) vals.push(data[y * info.width + x])
      }
      vals.sort((a, c) => a - c)
      const ground = vals.length ? vals[Math.floor(vals.length / 2)] : 0   // median: the type is the minority
      const contrast = Math.round(Math.abs(m.lum - ground))
      const showing = m.op > 0.05
      if (showing && contrast < worst) worst = contrast
      console.log(`   ${String(at).padStart(4)}ms  opacity ${m.op.toFixed(2)} | type ${String(Math.round(m.lum)).padStart(3)} on ground ${String(ground).padStart(3)} | contrast ${String(contrast).padStart(3)}${showing && contrast < 60 ? '   <-- UNREADABLE' : ''}`)
    }
    if (k !== KS.at(-1)) {   // the last project stays open, so its clearance can be measured settled
      // let the world finish arriving before asking it to leave, or the exit is ignored and the next project
      // never opens — the harness then measures a world that is not there and reports nothing at all
      await p.waitForFunction(() => window.__lab.A.mode === 'world' && !window.__lab.A.busy, null, { timeout: 25000 }).catch(() => {})
      await sleep(600)
      await p.evaluate(() => document.querySelector('.world [data-world="all"]')?.click())
      await p.waitForFunction(() => window.__lab.A.mode === 'index' && !window.__lab.A.busy, null, { timeout: 25000 }).catch(() => {})
      await sleep(2500)
    }
  }
  // and, settled in whichever project the session ended on, the last line must clear the capture
  const r = await p.evaluate(() => {
    const el = document.querySelector('.wb.on')
    if (!el) return null
    const kids = [...el.children].map((c) => c.getBoundingClientRect())
    // the engine marks the media it is showing with .on; every other frame's elements stay in the DOM
    const shown = [...document.querySelectorAll('#media .on img, #media img.on')].filter((i) => i.getBoundingClientRect().height > 60)
    const top = shown.length ? Math.min(...shown.map((i) => i.getBoundingClientRect().top)) : null
    return { bottom: Math.round(Math.max(...kids.map((c) => c.bottom))), capTop: top === null ? null : Math.round(top) }
  })
  await b.close()
  const gap = r && r.capTop !== null ? r.capTop - r.bottom : null
  if (gap !== null) console.log(`\n  ${NAMES[KS.at(-1)]}: last line ends at y=${r.bottom}, capture starts at y=${r.capTop} -> clearance ${gap}px`)
  const bad = worst < 60 || (gap !== null && gap <= 0)
  console.log(`  worst contrast while any title was showing: ${worst === 999 ? 'n/a' : worst}   (needs 60)`)
  console.log(`TITLEFIT: ${bad ? 'FAIL' : 'PASS'}`)
  process.exit(bad ? 1 : 0)
})().catch((e) => { console.error(String(e).slice(0, 300)); process.exit(1) })
