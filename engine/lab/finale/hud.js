// ?hud=1 — a small frame-time meter, measuring furniture only (never part of the composition;
// without the flag nothing is drawn — only the numbers the harness reads are kept).
// window.__hudStats() / window.__hudReset() are the capture rig's measurement hooks.

export function createHud() {
  const on = new URLSearchParams(location.search).get('hud') === '1'
  let times = []
  const stats = () => {
    const s = [...times].sort((a, b) => a - b)
    const at = (q) => (s.length ? s[Math.min(s.length - 1, Math.floor(q * s.length))] : 0)
    return { n: s.length, p50: at(0.5), p95: at(0.95), max: s[s.length - 1] ?? 0 }
  }
  window.__hudStats = stats
  window.__hudReset = () => { times = [] }

  let el = null
  if (on) {
    el = document.createElement('div')
    el.setAttribute('aria-hidden', 'true')
    el.style.cssText = 'position:fixed;right:12px;top:60px;z-index:40;background:rgba(18,18,18,.85);color:#efeee9;'
      + 'font:400 10px/1.7 ui-monospace,monospace;padding:6px 9px;letter-spacing:.05em;pointer-events:none;white-space:pre'
    document.body.appendChild(el)
  }

  let frames = 0
  return {
    destroy() { el?.remove() },
    sample(ms) {
      times.push(ms)
      if (times.length > 600) times.shift()
      if (el && ++frames % 30 === 0) {
        const s = stats()
        el.textContent = `frame ms  p50 ${s.p50.toFixed(2)}\n          p95 ${s.p95.toFixed(2)}\n          max ${s.max.toFixed(2)}\nn ${s.n}`
      }
    },
  }
}
