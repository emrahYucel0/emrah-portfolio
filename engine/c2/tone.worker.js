// Tone processing off the main thread: the page keeps moving while a real interface becomes material.
// The full-size bitmap arrives here; resizing, pixel work and encoding back to a bitmap all happen in the worker.
import { toneData } from './tone-core.js'

self.onmessage = (e) => {
  const { id, bitmap, cw, ch } = e.data
  const c = new OffscreenCanvas(cw, ch)
  const x = c.getContext('2d', { willReadFrequently: true })
  x.imageSmoothingQuality = 'high'
  x.drawImage(bitmap, 0, 0, cw, ch)
  bitmap.close?.()
  const d = x.getImageData(0, 0, cw, ch)
  toneData(d.data, cw, ch)
  x.putImageData(d, 0, 0)
  const out = c.transferToImageBitmap()
  self.postMessage({ id, out }, [out])
}
