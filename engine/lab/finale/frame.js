// The study frame, as the site runs it (app/composables/useStudy.ts, made vanilla).
// The page really scrolls: no wheel handler, no preventDefault, no snapping. The stage is fixed,
// the track is tall, and everything is a function of scroll POSITION — scrolling back runs the
// finale backwards for free. Reduced motion quantises the same parameter to the discrete states.

export const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches

export function createFrame({ stages, states, track, canvases }) {
  const S = {
    W: 0, H: 0, DPR: 1, top: 50,
    ctx: null, paperCtx: null,
    get portrait() { return S.W < S.H * 0.9 },
    get short() { return S.H < 470 },
    reduced: REDUCED,
  }
  let onFrame = () => false
  let onResize = () => {}

  function resize() {
    S.W = innerWidth; S.H = innerHeight
    S.DPR = Math.min(devicePixelRatio || 1, 2) // useStudy.ts :28
    S.top = document.querySelector('[data-strip]')?.getBoundingClientRect().height ?? 50
    for (const [name, cv] of Object.entries(canvases)) {
      cv.width = Math.round(S.W * S.DPR); cv.height = Math.round(S.H * S.DPR)
      const ctx = cv.getContext('2d')
      ctx.setTransform(S.DPR, 0, 0, S.DPR, 0, 0)
      if (name === 'paper') S.paperCtx = ctx; else S.ctx = ctx
    }
    // `stages` may be a function: the narrow touch sheet adds an attention stretch after the plot
    track.style.height = `${Math.round(S.H * (1 + (typeof stages === 'function' ? stages(S) : stages)))}px`
  }
  const rawProgress = () => {
    if (!track) return 0
    return Math.min(1, Math.max(0, (scrollY - track.offsetTop) / Math.max(1, track.offsetHeight - S.H)))
  }
  const progress = () => {
    const p = rawProgress()
    return REDUCED ? Math.round(p * (states - 1)) / (states - 1) : p
  }

  let raf = 0, last = 0, dead = false
  const request = () => { if (!raf && !dead) raf = requestAnimationFrame(tick) }
  function tick(now) {
    raf = 0
    const dt = last ? Math.min(1 / 24, (now - last) / 1000) : 1 / 60
    last = now
    if (onFrame(progress(), dt, now)) request(); else last = 0
  }
  const re = () => { resize(); onResize(); request() }
  let rt = 0
  const onWinResize = () => { clearTimeout(rt); rt = setTimeout(re, 90) }

  resize()
  // everything this frame listens to leaves with destroy(): the finale lives on a route of an SPA
  const off = new AbortController()
  const sig = { signal: off.signal, passive: true }
  addEventListener('scroll', request, sig)
  addEventListener('resize', onWinResize, sig)
  addEventListener('orientationchange', onWinResize, sig)
  document.addEventListener('visibilitychange', () => { if (!document.hidden) request() }, sig)
  function destroy() {
    dead = true
    off.abort()
    clearTimeout(rt)
    if (raf) cancelAnimationFrame(raf)
    raf = 0
  }

  /** jump the document so the finale opens in its settled state (the #contact arrival) */
  function jumpToEnd() {
    scrollTo({ top: track.offsetTop + track.offsetHeight - S.H, behavior: 'instant' })
  }

  return {
    S, progress, rawProgress, request, jumpToEnd, destroy,
    run(fn) { onFrame = fn; request() },
    resized(fn) { onResize = fn },
  }
}
