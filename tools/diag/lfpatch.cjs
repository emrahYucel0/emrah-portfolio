// A MAGNIFIED PATCH OF ROWS, SIDE BY SIDE, MOVING — so the shimmer can be confirmed by eye rather than inferred.
//
//   node lfpatch.cjs <port> [locale]
//
// The mouse is never touched. A small patch of ground is captured from Full-Stack (dark) and from Creative (cream) at
// 1920x1080 and device ratio 1 — the review machine's own configuration — forty times, fifty milliseconds apart. Each
// patch is magnified with NEAREST neighbour so one device pixel becomes a visible block and nothing is invented by
// the resampling. The two are placed side by side and played back as a recording.
//
// This exists because measuring a single row along its length defeated three attempts: at a pitch of two to seven
// pixels a follower either hops to the neighbouring row or creeps across rows over the width of the screen. The
// recording does not need a follower.
const pw = require('playwright')
const sharp = require('sharp')
const fs = require('fs')
const path = require('path')
const { stopsOf } = require('./stops.cjs')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const [port, loc = 'tr'] = process.argv.slice(2)
const OUT = 'out/linefield/patch'
const FRAMES = 40
const GAP = 50
const ZOOM = 6
const PW = 150   // device px of patch, before magnifying
const PH = 56

;(async () => {
  fs.rmSync(OUT, { recursive: true, force: true })
  fs.mkdirSync(OUT + '/frames', { recursive: true })
  const b = await pw.chromium.launch({ channel: 'chrome' })
  const ctx = await b.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 })
  const p = await ctx.newPage()
  await p.goto('http://127.0.0.1:' + port + '/' + loc, { waitUntil: 'networkidle', timeout: 120000 })
  await p.waitForFunction(() => window.__lab && window.__lab.A.mode === 'index', null, { timeout: 90000 }).catch(() => {})
  await sleep(2800)
  const STOP = await stopsOf(p)

  const grab = async (place, lfp, label) => {
    await p.evaluate((i) => window.__lab.go(i), STOP[place])
    await sleep(2600)
    if (lfp !== null) { await p.evaluate((v) => window.__lab.lfSet(v), lfp); await sleep(500) }
    await p.evaluate(() => document.querySelectorAll('.layer, .strip, #__nuxt').forEach((e) => { e.style.visibility = 'hidden' }))
    await sleep(300)
    const out = []
    for (let f = 0; f < FRAMES; f++) {
      const png = await p.screenshot({ clip: { x: 160, y: 300, width: PW, height: PH } })
      out.push(await sharp(png).resize({ width: PW * ZOOM, height: PH * ZOOM, kernel: 'nearest' }).png().toBuffer())
      await sleep(GAP)
    }
    console.log('  captured ' + out.length + ' frames of ' + label)
    return out
  }

  const dark = await grab('system', null, 'Full-Stack (dark)')
  const cream = await grab('creative', null, 'Creative (cream)')

  // one strip per frame: the two patches side by side, each labelled
  const label = (text) => Buffer.from('<svg width="' + PW * ZOOM + '" height="30"><rect width="100%" height="100%" fill="#111"/><text x="8" y="21" font-family="monospace" font-size="16" fill="#b8622f">' + text + '</text></svg>')
  for (let f = 0; f < FRAMES; f++) {
    const strip = await sharp({ create: { width: PW * ZOOM * 2 + 12, height: PH * ZOOM + 30, channels: 3, background: '#111' } })
      .composite([
        { input: label('Full-Stack — dark ground, 1920x1080 @1, mouse still'), top: 0, left: 0 },
        { input: label('Creative — cream ground, same frame'), top: 0, left: PW * ZOOM + 12 },
        { input: dark[f], top: 30, left: 0 },
        { input: cream[f], top: 30, left: PW * ZOOM + 12 },
      ]).png().toBuffer()
    fs.writeFileSync(OUT + '/frames/f' + String(f).padStart(3, '0') + '.png', strip)
  }
  console.log('  stitched ' + FRAMES + ' side-by-side strips')

  // played back in a page, and that page is recorded
  const W = PW * ZOOM * 2 + 12
  const H = PH * ZOOM + 30
  const html = '<!doctype html><meta charset="utf-8"><style>html,body{margin:0;background:#111}img{display:block;width:' + W + 'px;height:' + H + 'px;image-rendering:pixelated}</style>'
    + '<img id="v"><script>const n=' + FRAMES + ';let i=0;const v=document.getElementById("v");'
    + 'const src=(k)=>"frames/f"+String(k).padStart(3,"0")+".png";'
    + 'const pre=[];for(let k=0;k<n;k++){const im=new Image();im.src=src(k);pre.push(im)}'
    + 'setInterval(()=>{v.src=src(i);i=(i+1)%n},' + GAP + ');v.src=src(0);</script>'
  fs.writeFileSync(OUT + '/play.html', html)

  const vctx = await b.newContext({ viewport: { width: W, height: H }, recordVideo: { dir: OUT, size: { width: W, height: H } } })
  const vp = await vctx.newPage()
  await vp.goto('file:///' + path.resolve(OUT, 'play.html').replace(/\\/g, '/'), { waitUntil: 'load' })
  await sleep(FRAMES * GAP * 2 + 600)
  await vctx.close()
  await b.close()
  const vid = fs.readdirSync(OUT).filter((f) => f.endsWith('.webm'))
  console.log('  recording: ' + OUT + '/' + (vid[0] || '(none)') + '   ' + W + 'x' + H + ', two passes of ' + FRAMES + ' frames')
  console.log('  stills also in ' + OUT + '/frames/ if the video is awkward to scrub')
})().catch((e) => { console.error(String(e).slice(0, 400)); process.exit(1) })
