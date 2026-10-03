// A HARNESS FAILS ON WHAT THE CONSOLE SAYS, NOT ONLY ON WHAT THE PAGE THROWS.
//
//   const { watch } = require('./consolewatch.cjs')
//   const W = watch(page, 'label')     … run the checks …
//   const bad = await W.verdict(page)  // [] when clean; every line is a failure
//
// Why this exists (2026-10-03). Cross Section's louver pass left its own WebGL program bound, and C2's next uniform
// write was rejected every frame: "WebGL: INVALID_OPERATION: uniform3f: location is not from the associated program".
// The user saw it in the console and saw the scene not drawn. No harness failed, because:
//   - cross.cjs and csseam.cjs listened only for `pageerror`. A WebGL error is never a page error: the browser reports
//     it as a console WARNING (Chrome) and the page carries on.
//   - csshot / csperf / cspair did listen to console warnings, but they ran the Phase B debug entry, which has a WebGL
//     context of its own with no C2 runtime in it — the faulty sequence (louver pass, then C2's phys() writing uGrid
//     to whatever program was bound) only exists in the integrated runtime.
//   - and Chrome stops reporting after 32 WebGL errors per context, so a harness that starts listening late hears
//     nothing at all.
// So every Cross Section harness now attaches this BEFORE it navigates, and fails on:
//   - any console error, in any engine;
//   - any console warning or error that names WebGL or a GL error (Chrome reports them as warnings, WebKit as errors);
//   - any uncaught page error;
//   - anything the runtime's own development check recorded on window.__csGLErrors (engine/c2/cross/glstate.js).
// The only thing let through is the dev server's font-preload notice, which is about the layout and not the scene.
const ALLOW = [/was preloaded using link preload but not used/i]
const GLISH = /webgl|\bgl_|invalid_operation|invalid_value|invalid_enum|invalid_framebuffer|context_lost|out_of_memory|too many errors/i

function watch(page, label = 'page') {
  const bad = []
  page.on('console', (m) => {
    const t = m.text(), type = m.type()
    if (ALLOW.some((r) => r.test(t))) return
    if (type === 'error' || ((type === 'warning' || type === 'warn') && GLISH.test(t)) || GLISH.test(t)) bad.push(`${label} console.${type}: ${t.slice(0, 300)}`)
  })
  page.on('pageerror', (e) => bad.push(`${label} pageerror: ${String(e.message).slice(0, 300)}`))
  return {
    bad,
    /** everything that failed, including the runtime's own record of GL errors (read from the page if it is still open) */
    async verdict(p = page) {
      const out = [...bad]
      try {
        const gl = await p.evaluate(() => window.__csGLErrors || [])
        for (const e of gl) out.push(`${label} gl-check: ${e.errs.join(', ')} after "${e.pass}"`)
      } catch { /* the page is gone: its console was heard while it lived */ }
      return [...new Set(out)]
    },
  }
}
module.exports = { watch }
