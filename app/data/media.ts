// Media contract only — no assets are imported in M0.
// The frozen prototype proved the strategy: a small tone texture for the surface, a high-resolution
// derivative only when a work is about to be seen, posters for studies, one active video decoder.
// Production keeps the same shape so those files can be pointed at without changing call sites.
export interface ResponsiveImage {
  /** intrinsic size of the source, for aspect-ratio boxes */
  readonly width: number
  readonly height: number
  /** srcset strings, widest-first selection left to the browser */
  readonly avif: string
  readonly webp: string
  /** fallback src (webp, mid width) */
  readonly src: string
  /** small tone source the surface reads; never shown to the visitor */
  readonly toneSrc: string
  readonly alt: string
}

export interface StudyClip {
  readonly mp4: string
  readonly poster: string
  readonly width: number
  readonly height: number
}
