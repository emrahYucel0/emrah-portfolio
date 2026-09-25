import type { Ref } from 'vue'

/** the same question the rest of the site asks; the studies quantise rather than animate when it is true */
const REDUCED = import.meta.client && matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * A focused study's mechanics — nothing visual. (Adapted from research lab-reopen/focused-final/shared/frame.js.)
 *
 * The page really scrolls: no wheel handler, no preventDefault, no snapping. A study is a fixed stage plus a tall
 * track, and it reads its own scroll POSITION, so its parameter is a function of position rather than a queue of
 * played transitions — scrolling back runs the study backwards for free. Reduced motion quantises the same parameter
 * to the study's discrete states: the information still arrives, it stops being continuous.
 */
export function useStudy(o: { stages: number; states: number; track: Ref<HTMLElement | null>; canvas?: Ref<HTMLCanvasElement | null> }) {
  const S = {
    W: 0, H: 0, DPR: 1, top: 50,
    ctx: null as CanvasRenderingContext2D | null,
    get portrait() { return S.W < S.H * 0.9 },
    get short() { return S.H < 470 },
    reduced: REDUCED,
  }
  const status = ref('')
  let onFrame: (p: number, dt: number, now: number) => boolean | void = () => false
  let onResize: () => void = () => {}

  function resize() {
    S.W = innerWidth; S.H = innerHeight
    S.DPR = Math.min(devicePixelRatio || 1, 2)
    S.top = document.querySelector<HTMLElement>('[data-strip]')?.getBoundingClientRect().height ?? 50
    const cv = o.canvas?.value
    if (cv) {
      cv.width = Math.round(S.W * S.DPR); cv.height = Math.round(S.H * S.DPR)
      S.ctx = cv.getContext('2d')
      S.ctx?.setTransform(S.DPR, 0, 0, S.DPR, 0, 0)
    }
    if (o.track.value) o.track.value.style.height = `${Math.round(S.H * (1 + o.stages))}px`
  }
  const rawProgress = () => {
    const t = o.track.value
    if (!t) return 0
    return Math.min(1, Math.max(0, (scrollY - t.offsetTop) / Math.max(1, t.offsetHeight - S.H)))
  }
  const progress = () => {
    const p = rawProgress()
    return REDUCED ? Math.round(p * (o.states - 1)) / (o.states - 1) : p
  }
  const say = (s: string) => { if (status.value !== s) status.value = s }

  let raf = 0, last = 0
  const request = () => { if (!raf) raf = requestAnimationFrame(tick) }
  function tick(now: number) {
    raf = 0
    const dt = last ? Math.min(1 / 24, (now - last) / 1000) : 1 / 60
    last = now
    if (onFrame(progress(), dt, now)) request(); else last = 0
  }
  const re = () => { resize(); onResize(); request() }
  let rt = 0
  const onWinResize = () => { clearTimeout(rt); rt = window.setTimeout(re, 90) }

  onMounted(() => {
    resize()
    addEventListener('scroll', request, { passive: true })
    addEventListener('resize', onWinResize, { passive: true })
    addEventListener('orientationchange', onWinResize)
    document.addEventListener('visibilitychange', () => { if (!document.hidden) request() })
  })
  onBeforeUnmount(() => {
    removeEventListener('scroll', request)
    removeEventListener('resize', onWinResize)
    removeEventListener('orientationchange', onWinResize)
    if (raf) cancelAnimationFrame(raf)
  })

  return {
    S, status, progress, rawProgress, say, request,
    run(fn: typeof onFrame) { onFrame = fn; request() },
    resized(fn: typeof onResize) { onResize = fn },
  }
}
