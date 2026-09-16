import type { MediaFile } from './types'

/** The derivative manifest written by tools/make-derivatives.mjs (public/opt/img/manifest.json). */
export interface ManifestEntry {
  w: number
  h: number
  avif: [number, string, number][]
  webp: [number, string, number][]
  tone: [string, number]
  sourceKB: number
}
export type Manifest = Record<string, ManifestEntry>

export interface ImageSource {
  file: string
  w: number
  h: number
  aspect: number
  alt: string
  shade: 'light' | 'dark'
  avif: string
  webp: string
  src: string
  toneSrc: string
}

/** One image, one set of derivatives, both locales — only `alt` is localised. */
export function imageSource(manifest: Manifest, base: string, media: MediaFile, alt: string): ImageSource {
  const m = manifest[media.file]
  if (!m) throw new Error(`No derivative for ${media.file} — run node tools/make-derivatives.mjs`)
  const opt = (f: string) => `${base}opt/img/${f}`
  const set = (list: [number, string, number][]) => list.map(([w, f]) => `${opt(f)} ${w}w`).join(', ')
  const mid = m.webp.find(([w]) => w >= 1080) || m.webp[m.webp.length - 1]!
  return {
    file: media.file, w: m.w, h: m.h, aspect: m.w / m.h, alt, shade: media.shade,
    avif: set(m.avif), webp: set(m.webp), src: opt(mid[1]), toneSrc: opt(m.tone[0]),
  }
}

export interface ClipSource {
  n: string
  w: number
  h: number
  aspect: number
  mp4: string
  poster: string
  desc: string
}

export function clipSource(base: string, n: string, w: number, h: number, desc: string): ClipSource {
  return { n, w, h, aspect: w / h, mp4: `${base}opt/lab/lab-${n}.mp4`, poster: `${base}opt/lab/lab-${n}.webp`, desc }
}
