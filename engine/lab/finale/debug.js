// The finale's side of the ?debug=1 panel (public/finale-debug.js — a classic script loaded only
// with the flag, so it still reports when the app bundle fails to boot). Modules only NOTE things:
// why a fallback path was taken, what a feature probe found. Without the flag this is a no-op
// apart from a tiny queue the panel drains if it arrives after the engine.

const DEBUG = typeof location !== 'undefined' && /[?&]debug=1/.test(location.search)

export function note(kind, msg) {
  if (!DEBUG) return
  try {
    const d = window.__dbg
    if (!d) { (window.__dbgQueue ??= []).push([kind, msg]); return }
    const list = kind === 'fallback' ? d.fallbacks : kind === 'error' ? d.errors : d.info
    if (!list.includes(msg)) list.push(msg)
    d.render?.()
  } catch {}
}
