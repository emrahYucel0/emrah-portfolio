// PROJECT TRANSITIONS — how long the visitor waits, and for what. Four moments per step, all from the gesture:
//   response    the picture has started to change at all
//   meaningful  the project's own text is on screen
//   usable      the next gesture would be answered (not busy)
//   settled     nothing is moving any more
// node proj.cjs <port> [reduced]
const pw = require('playwright')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const [port, motion] = process.argv.slice(2)
const reduced = motion === 'reduced'

;(async () => {
  const b = await pw.webkit.launch()
  const ctx = await b.newContext({ viewport: { width: 1366, height: 768 }, reducedMotion: reduced ? 'reduce' : 'no-preference' })
  const p = await ctx.newPage()
  await p.goto(`http://127.0.0.1:${port}/tr`, { waitUntil: 'networkidle', timeout: 60000 })
  await p.waitForFunction(() => window.__lab?.A.mode === 'index', null, { timeout: 40000 }).catch(() => {})
  await sleep(3000)
  await p.evaluate(() => document.querySelector('#ui [data-go="work"]').click())
  await sleep(4200)

  console.log(`== ${reduced ? 'REDUCED' : 'NORMAL'} — project transitions`)
  const watch = async (label, act) => {
    const t0 = Date.now()
    let response = null, meaningful = null, usable = null, settled = null, name = ''
    await act()
    for (let i = 0; i < 60; i++) {
      const s = await p.evaluate(() => {
        const on = [...document.querySelectorAll('.wb.on, .world .wsum')].map((e) => (e.innerText || '').replace(/\s+/g, ' ').trim()).filter(Boolean)
        return {
          mode: window.__lab.A.mode, busy: window.__lab.A.busy,
          wp: +window.__lab.A.wp.toFixed(3), wpT: +window.__lab.A.wpT.toFixed(3),
          k: window.__lab.A.k, text: on.join(' ').slice(0, 60),
        }
      })
      const t = Date.now() - t0
      if (response === null && (s.mode === 'world' || s.busy)) response = t
      if (meaningful === null && s.text) { meaningful = t; name = s.text }
      if (usable === null && !s.busy && s.mode === 'world') usable = t
      if (settled === null && !s.busy && Math.abs(s.wp - s.wpT) < 0.002 && meaningful !== null) settled = t
      if (settled !== null && t > settled + 400) break
      await sleep(90)
    }
    const f = (v) => (v === null ? '   —  ' : `${String(v).padStart(5)}ms`)
    console.log(`  ${label.padEnd(22)} response ${f(response)} | meaningful ${f(meaningful)} | usable ${f(usable)} | settled ${f(settled)}  (${name.split(' ').slice(0, 3).join(' ')})`)
  }

  const open = (i) => async () => {
    await p.evaluate((k) => document.querySelector(`#ui [data-work="${k}"]`)?.click(), i)
    await p.waitForFunction((k) => window.__lab.A.wLocked === k, i, { timeout: 20000 }).catch(() => {})
    await p.evaluate((k) => document.querySelector(`#ui [data-work="${k}"]`)?.click(), i)
  }
  await watch('Work → project A', open(0))
  await watch('project A → B', async () => { await p.evaluate(() => document.querySelector('#ui [data-world="all"]')?.click()); await sleep(4200); await open(1)() })
  await watch('project B → C', async () => { await p.evaluate(() => document.querySelector('#ui [data-world="all"]')?.click()); await sleep(4200); await open(2)() })
  await watch('project → Work', async () => { await p.evaluate(() => document.querySelector('#ui [data-world="all"]')?.click()) })
  await b.close()
})().catch((e) => { console.error(String(e).slice(0, 300)); process.exit(1) })
