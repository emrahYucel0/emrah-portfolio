// Tone processing off the main thread — the adaptation of engine/c2/tone.worker.js for a
// runtime with no OffscreenCanvas dependency (iOS 15 included): the main thread rasterises the
// cell's type and posts raw RGBA; this worker runs the REAL toneData (verbatim copy) and posts
// the processed pixels back. The computation is byte-for-byte the site's own.
import { toneData } from '../../c2/tone-core.js'

self.onmessage = (e) => {
  const { id, buf, cw, ch } = e.data
  const p = new Uint8ClampedArray(buf)
  toneData(p, cw, ch)
  self.postMessage({ id, buf: p.buffer, cw, ch }, [p.buffer])
}
