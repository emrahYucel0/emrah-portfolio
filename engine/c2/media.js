// Work media. Real images live underneath the surface and are never processed: when the material leaves,
// this is what is seen, exactly as delivered, in its own proportions — served as AVIF/WebP at the size the room needs.
// The same image is also turned into tone so the rows can carry it — the picture the visitor registers in the
// material is the picture that is released. Tone is processed once per image, in a worker, independent of layout.
import { toneData, toneSize } from './tone-core.js'

const loaded = new Map()
export function loadImage(src) {
  if (!loaded.has(src)) {
    loaded.set(src, new Promise((res) => {
      const im = new Image()
      im.decoding = 'async'
      im.onload = () => (im.decode ? im.decode().catch(() => {}) : Promise.resolve()).then(() => res(im))
      im.onerror = () => res(null)
      im.src = src
    }))
  }
  return loaded.get(src)
}

// a pristine media element: <picture> with AVIF and WebP sources; the browser picks the width the rect needs
export function mediaElement(item, cls = '') {
  const el = document.createElement('div')
  el.className = `media ${cls}`
  const pic = document.createElement('picture')
  for (const [type, set] of [['image/avif', item.avif], ['image/webp', item.webp]]) {
    const s = document.createElement('source'); s.type = type; s.srcset = set; pic.appendChild(s)
  }
  const node = document.createElement('img')
  node.alt = item.alt
  node.decoding = 'async'
  node.loading = 'eager'   // created only when this work is about to be seen
  node.draggable = false
  node.src = item.src
  node.className = 'media-node'
  pic.appendChild(node)
  el.appendChild(pic)
  return { el, node, pic, item }
}
export function placeMedia(me, r, pos = 'top left') {
  const s = me.el.style
  s.left = `${r.x}px`; s.top = `${r.y}px`; s.width = `${r.w}px`; s.height = `${r.h}px`
  me.node.style.objectPosition = pos
  const sizes = `${Math.max(1, Math.round(r.w * Math.max(1, (me.item.aspect * r.h) / Math.max(1, r.w))))}px`
  if (me.lastSizes !== sizes) { me.lastSizes = sizes; for (const src of me.pic.querySelectorAll('source')) src.sizes = sizes; me.node.sizes = sizes }
}

// A Lab study: its poster is always cheap; the video is only created while it is the one active study,
// and its decoder is released as soon as it is not.
export function labElement(entry) {
  const el = document.createElement('div')
  el.className = 'media lab-media'
  const poster = document.createElement('img')
  poster.src = entry.poster; poster.alt = ''; poster.decoding = 'async'; poster.className = 'media-node'
  el.appendChild(poster)
  let video = null
  return {
    el, entry,
    play() {
      if (!video) {
        video = document.createElement('video')
        Object.assign(video, { muted: true, loop: true, playsInline: true, preload: 'auto' })
        video.setAttribute('muted', ''); video.setAttribute('playsinline', ''); video.setAttribute('aria-hidden', 'true')
        video.poster = entry.poster; video.className = 'media-node'; video.src = entry.mp4
        el.appendChild(video)
      }
      video.play().catch(() => {})
      el.classList.add('playing')
    },
    release() {
      if (!video) return
      video.pause(); video.removeAttribute('src'); video.load(); video.remove(); video = null
      el.classList.remove('playing')
    },
  }
}

// ─── tone ────────────────────────────────────────────────────────────────────
let worker = null, seq = 0
const waiting = new Map()
function toneWorker() {
  if (worker === null) {
    try {
      if (typeof OffscreenCanvas === 'undefined' || typeof createImageBitmap !== 'function') throw new Error('no offscreen')
      worker = new Worker(new URL('./tone.worker.js', import.meta.url), { type: 'module' })
      worker.onmessage = (e) => { const r = waiting.get(e.data.id); waiting.delete(e.data.id); r?.(e.data.out) }
      worker.onerror = () => { worker = false; for (const r of waiting.values()) r(null); waiting.clear() }
    } catch { worker = false }
  }
  return worker
}

// prepare an image's tone without blocking the page; resolves once im._tone exists. The worker's bitmap is the tone
// itself (canvas drawImage accepts it), so nothing is resized or copied on the main thread.
export async function prepareTone(im) {
  if (!im || im._tone) return im?._tone
  if (im._toneP) return im._toneP
  im._toneP = (async () => {
    const [cw, ch] = toneSize(im.naturalWidth, im.naturalHeight)
    const w = toneWorker()
    if (w) {
      try {
        const bitmap = await createImageBitmap(im)
        const out = await new Promise((res) => { const id = ++seq; waiting.set(id, res); w.postMessage({ id, bitmap, cw, ch }, [bitmap]) })
        if (out && !im._tone) { im._tone = out; im._toneVia = 'worker' }
      } catch {}
    }
    return toneOf(im)
  })()
  return im._toneP
}

// synchronous access (and fallback): the cached tone, or processed here if it was never prepared
export function toneOf(im) {
  if (!im) return null
  if (im._tone) return im._tone
  const [cw, ch] = toneSize(im.naturalWidth, im.naturalHeight)
  const c = document.createElement('canvas'); c.width = cw; c.height = ch
  const x = c.getContext('2d', { willReadFrequently: true })
  x.drawImage(im, 0, 0, cw, ch)
  const d = x.getImageData(0, 0, cw, ch)
  toneData(d.data, cw, ch)
  x.putImageData(d, 0, 0)
  im._tone = c; im._toneVia = 'main'
  return c
}

// draw a source into a rect, covering it, anchored top-left (interfaces read from the top left)
export function drawCover(ctx, src, r) {
  const sw = src.width, sh = src.height
  const k = Math.max(r.w / sw, r.h / sh)
  ctx.drawImage(src, 0, 0, r.w / k, r.h / k, r.x, r.y, r.w, r.h)
}

// Split a rect into fragments: two complementary sets of irregular tiles. Each row set carries one set;
// only in exact register do the tiles meet and make the image whole.
export function fragments(r, seed = 1) {
  let s = seed * 9301 + 49297
  const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280 }
  const cut = (n, len) => {
    const w = Array.from({ length: n }, () => 0.6 + rnd()), sum = w.reduce((a, b) => a + b, 0)
    let acc = 0
    return w.map((v) => { const a = acc; acc += (v / sum) * len; return [a, acc] })
  }
  const cols = cut(r.w > r.h ? 6 : 4, r.w), rows = cut(r.w > r.h ? 4 : 6, r.h)
  const a = [], b = []
  rows.forEach(([y0, y1], j) => cols.forEach(([x0, x1], i) => {
    const tile = { x: r.x + x0, y: r.y + y0, w: x1 - x0, h: y1 - y0 }
    if (((i + j) % 2 === 0) !== (rnd() < 0.18)) a.push(tile); else b.push(tile)
  }))
  return [a, b]
}
