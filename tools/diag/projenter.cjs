// ENTERING A PROJECT, FRAME BY FRAME — what the material does and when the text arrives.
// node projenter.cjs <port> <projectIndex> [w] [h] [locale] [tag]
const pw = require('playwright')
const fs = require('fs')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const [port, k = '2', W = '390', H = '844', loc = 'tr', tag = 'now'] = process.argv.slice(2)
const dir = `out/enter-${tag}`
fs.mkdirSync(dir, { recursive: true })

;(async () => {
  const b = await pw.webkit.launch()
  const ctx = await b.newContext({ viewport: { width: +W, height: +H }, deviceScaleFactor: 1, isMobile: +W < 700, hasTouch: +W < 700 })
  const p = await ctx.newPage()
  await p.goto(`http://127.0.0.1:${port}/${loc}`, { waitUntil: 'networkidle', timeout: 60000 })
  await p.waitForFunction(() => window.__lab?.A.mode === 'index', null, { timeout: 40000 }).catch(() => {})
  await sleep(3000)
  await p.evaluate(() => document.querySelector('#ui [data-go="work"]').click())
  await sleep(4000)
  // register the project, then open it
  await p.evaluate((i) => document.querySelector(`#ui [data-work="${i}"]`).click(), +k)
  await p.waitForFunction((i) => window.__lab.A.wLocked === i, +k, { timeout: 20000 }).catch(() => {})
  await sleep(1200)
  const t0 = Date.now()
  await p.evaluate((i) => document.querySelector(`#ui [data-work="${i}"]`).click(), +k)

  const log = []
  for (let i = 0; i < 26; i++) {
    const t = Date.now() - t0
    const st = await p.evaluate(() => {
      const on = [...document.querySelectorAll('.wb')].filter((e) => e.classList.contains('on'))
      const txt = on.map((e) => (e.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 40))
      return {
        mode: window.__lab.A.mode, wp: +window.__lab.A.wp.toFixed(2), busy: window.__lab.A.busy,
        blocks: on.length, text: txt.join(' | '),
        // is any block box present in the material but empty on screen?
        boxes: [...document.querySelectorAll('.wb')].map((e) => ({ f: e.dataset.f, on: e.classList.contains('on') })),
      }
    })
    log.push(`${String(t).padStart(5)}ms  wp ${String(st.wp).padStart(5)}  busy ${st.busy ? 'Y' : 'n'}  blocks ${st.blocks}  ${st.text}`)
    fs.writeFileSync(`${dir}/${loc}-${W}-k${k}-${String(i).padStart(2, '0')}-${t}ms.png`, await p.screenshot())
    await sleep(180)
  }
  console.log(log.join('\n'))
  await b.close()
})().catch((e) => { console.error(String(e).slice(0, 300)); process.exit(1) })
