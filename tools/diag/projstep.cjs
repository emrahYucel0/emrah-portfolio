const pw = require('playwright')
const fs = require('fs')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const [port, k = '2', W = '390', H = '844', loc = 'tr', tag = 'now'] = process.argv.slice(2)
fs.mkdirSync(`out/step-${tag}`, { recursive: true })
;(async () => {
  const b = await pw.webkit.launch()
  const p = await (await b.newContext({ viewport: { width: +W, height: +H }, deviceScaleFactor: 1, isMobile: +W < 700, hasTouch: +W < 700 })).newPage()
  await p.goto(`http://127.0.0.1:${port}/${loc}`, { waitUntil: 'networkidle', timeout: 60000 })
  await p.waitForFunction(() => window.__lab?.A.mode === 'index', null, { timeout: 40000 }).catch(() => {})
  await sleep(3000)
  await p.evaluate(() => document.querySelector('#ui [data-go="work"]').click()); await sleep(4000)
  await p.evaluate((i) => document.querySelector(`#ui [data-work="${i}"]`).click(), +k)
  await p.waitForFunction((i) => window.__lab.A.wLocked === i, +k, { timeout: 20000 }).catch(() => {})
  await sleep(1000)
  await p.evaluate((i) => document.querySelector(`#ui [data-work="${i}"]`).click(), +k)
  await p.waitForFunction(() => window.__lab.A.mode === 'world' && !window.__lab.A.busy, null, { timeout: 25000 }).catch(() => {})
  await sleep(2500)
  // step to the next frame and watch the void open against the text arriving
  const t0 = Date.now()
  await p.mouse.wheel(0, 300)
  let voidAt = null, textAt = null
  for (let i = 0; i < 30; i++) {
    const t = Date.now() - t0
    const st = await p.evaluate(() => {
      const on = [...document.querySelectorAll('.wb')].filter((e) => e.classList.contains('on'))
      return { wp: +window.__lab.A.wp.toFixed(2), busy: window.__lab.A.busy, n: on.length, txt: on.map((e) => (e.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 28)).join('|') }
    })
    if (voidAt === null && st.wp > 0.6) voidAt = t
    if (textAt === null && st.n > 0 && st.wp > 0.6) textAt = t
    if (i % 4 === 0) fs.writeFileSync(`out/step-${tag}/${loc}-k${k}-${String(t).padStart(5, '0')}ms.png`, await p.screenshot())
    await sleep(150)
  }
  console.log(`project ${k}: frame reached at ${voidAt}ms, its text on at ${textAt}ms, gap ${textAt - voidAt}ms`)
  await b.close()
})()
