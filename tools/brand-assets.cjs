// Brand utility assets, reproducible. Dev-only: uses puppeteer-core and sharp, which are NOT dependencies of this
// app — run with the tooling installed next to it, e.g.
//   NODE_PATH=../c2-surface-lab/node_modules node tools/brand-assets.cjs [siteBase=http://127.0.0.1:4501] [--only=icons|og]
// with the production build served locally (npm run generate, then any static server on .output/public).
//
//   public/favicon.ico            16 / 32 / 48 px (PNG entries), from public/favicon.svg, nearest-neighbour on the 16px grid
//   public/favicon-32x32.png      32 px
//   public/apple-touch-icon.png   180 px, opaque paper ground (iOS masks the corners itself)
//   public/og/emrah-yucel-portfolio.jpg   1200 × 630: a pure identity plate — a still of the live C2 name plate at rest
//                                  (reduced motion, so the rows are straight); no DOM text, only EMRAH / YÜCEL in the rows.
//                                  The paper bands above and below the row field are the site's own strips, left empty
//                                  on both sides so the plate stays symmetrical. The roles live in the page metadata.
const fs = require('fs')
const path = require('path')
const sharp = require('sharp')
const puppeteer = require('puppeteer-core')

const ROOT = path.join(__dirname, '..')
const PUBLIC = path.join(ROOT, 'public')
const BASE = process.argv.slice(2).find((a) => !a.startsWith('--')) || 'http://127.0.0.1:4501'
const ONLY = (process.argv.find((a) => a.startsWith('--only=')) || '').slice(7)   // 'icons' | 'og' | '' (both)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// the mark is drawn on a 16px grid: scale by whole numbers, never resample
const raster = (svg, size) => sharp(svg, { density: (72 * size) / 16 }).resize(size, size, { kernel: 'nearest' }).png().toBuffer()

function ico(pngs) {
  const header = Buffer.alloc(6 + 16 * pngs.length)
  header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(pngs.length, 4)
  let offset = header.length
  pngs.forEach(({ size, data }, i) => {
    const e = 6 + 16 * i
    header.writeUInt8(size >= 256 ? 0 : size, e); header.writeUInt8(size >= 256 ? 0 : size, e + 1)
    header.writeUInt8(0, e + 2); header.writeUInt8(0, e + 3)
    header.writeUInt16LE(1, e + 4); header.writeUInt16LE(32, e + 6)
    header.writeUInt32LE(data.length, e + 8); header.writeUInt32LE(offset, e + 12)
    offset += data.length
  })
  return Buffer.concat([header, ...pngs.map((p) => p.data)])
}

;(async () => {
  if (ONLY !== 'og') {
  const svg = fs.readFileSync(path.join(PUBLIC, 'favicon.svg'))
  const sizes = [16, 32, 48]
  const pngs = await Promise.all(sizes.map(async (size) => ({ size, data: await raster(svg, size) })))
  fs.writeFileSync(path.join(PUBLIC, 'favicon.ico'), ico(pngs))
  fs.writeFileSync(path.join(PUBLIC, 'favicon-32x32.png'), pngs[1].data)
  // 180: the 16px mark at ×10 (160px) on a 10px paper margin
  const mark = await raster(svg, 160)
  await sharp({ create: { width: 180, height: 180, channels: 3, background: '#e7e6e0' } })
    .composite([{ input: mark, left: 10, top: 10 }]).png().toFile(path.join(PUBLIC, 'apple-touch-icon.png'))
  }
  if (ONLY === 'icons') { console.log('icons written'); return }

  const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--enable-gpu', '--use-angle=d3d11', '--hide-scrollbars'] })
  const page = await browser.newPage()
  await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 2 })
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])
  await page.goto(`${BASE}/en`, { waitUntil: 'networkidle0' })
  await page.waitForFunction('window.__lab && window.__lab.A.mode === "index"', { timeout: 40000 })
  await sleep(3000)
  // the surface only: every DOM layer (strips, labels, hints) is hidden
  await page.evaluate(() => { document.getElementById('ui').style.visibility = 'hidden' })
  await sleep(500)
  fs.mkdirSync(path.join(PUBLIC, 'og'), { recursive: true })
  await sharp(await page.screenshot()).resize(1200, 630, { kernel: 'lanczos3' })
    .jpeg({ quality: 86, mozjpeg: true, chromaSubsampling: '4:4:4' }).toFile(path.join(PUBLIC, 'og', 'emrah-yucel-portfolio.jpg'))
  await browser.close()
  console.log('brand assets written')
})().catch((e) => { console.error(e); process.exit(1) })
