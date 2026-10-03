/*
 * ── SHARING ONE WEBGL CONTEXT WITH C2 ───────────────────────────────────────────────────────────────────────
 *
 * Cross Section draws into the runtime's own context, between C2's frames. C2 assumes its own state between them —
 * most visibly that ITS program is bound: surface.phys() writes uGrid every frame without binding first. A pass that
 * left its own program bound made every such write fail with "location is not from the associated program", every
 * frame (found on the user's machine, 2026-10-03). So every pass here takes the whole of the state it may touch on
 * the way in and gives it back on the way out: program, vertex array and array buffer, framebuffers and renderbuffer,
 * viewport and scissor, blend, depth and cull, clear values and write masks, pixel-store settings, the active texture
 * unit and the 2D binding of units 0..8 (C2 uses 0..6; these passes use 0..2).
 *
 * And it checks. In development every pass is followed by gl.getError(): the first error is reported by its NAME and
 * the PASS that raised it — in the console, loudly, and in a red banner — and kept on window.__csGLErrors for the
 * harnesses. Errors already pending when a pass begins are reported as belonging to whatever ran before it.
 *
 * Imported only where __CROSS__ is true.
 */
const UNITS = 9
const DEV = !!(import.meta.env && import.meta.env.DEV)

export function saveGL(gl) {
  const unit = gl.getParameter(gl.ACTIVE_TEXTURE)
  const tex = []
  for (let i = 0; i < UNITS; i++) { gl.activeTexture(gl.TEXTURE0 + i); tex.push(gl.getParameter(gl.TEXTURE_BINDING_2D)) }
  gl.activeTexture(unit)
  const s = {
    prog: gl.getParameter(gl.CURRENT_PROGRAM),
    vao: gl.getParameter(gl.VERTEX_ARRAY_BINDING),
    abuf: gl.getParameter(gl.ARRAY_BUFFER_BINDING),
    dfb: gl.getParameter(gl.DRAW_FRAMEBUFFER_BINDING),
    rfb: gl.getParameter(gl.READ_FRAMEBUFFER_BINDING),
    rb: gl.getParameter(gl.RENDERBUFFER_BINDING),
    vp: gl.getParameter(gl.VIEWPORT),
    sc: gl.getParameter(gl.SCISSOR_BOX),
    on: [gl.SCISSOR_TEST, gl.BLEND, gl.DEPTH_TEST, gl.CULL_FACE, gl.STENCIL_TEST].map((c) => [c, gl.isEnabled(c)]),
    bf: [gl.getParameter(gl.BLEND_SRC_RGB), gl.getParameter(gl.BLEND_DST_RGB), gl.getParameter(gl.BLEND_SRC_ALPHA), gl.getParameter(gl.BLEND_DST_ALPHA)],
    be: [gl.getParameter(gl.BLEND_EQUATION_RGB), gl.getParameter(gl.BLEND_EQUATION_ALPHA)],
    df: gl.getParameter(gl.DEPTH_FUNC),
    dm: gl.getParameter(gl.DEPTH_WRITEMASK),
    cm: gl.getParameter(gl.COLOR_WRITEMASK),
    cc: gl.getParameter(gl.COLOR_CLEAR_VALUE),
    cd: gl.getParameter(gl.DEPTH_CLEAR_VALUE),
    ua: gl.getParameter(gl.UNPACK_ALIGNMENT),
    pa: gl.getParameter(gl.PACK_ALIGNMENT),
    flip: gl.getParameter(gl.UNPACK_FLIP_Y_WEBGL),
    pre: gl.getParameter(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL),
    unit, tex,
  }
  return function restore() {
    gl.useProgram(s.prog)
    gl.bindVertexArray(s.vao)
    gl.bindBuffer(gl.ARRAY_BUFFER, s.abuf)
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, s.dfb)
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, s.rfb)
    gl.bindRenderbuffer(gl.RENDERBUFFER, s.rb)
    gl.viewport(s.vp[0], s.vp[1], s.vp[2], s.vp[3])
    gl.scissor(s.sc[0], s.sc[1], s.sc[2], s.sc[3])
    for (const [c, en] of s.on) { if (en) gl.enable(c); else gl.disable(c) }
    gl.blendFuncSeparate(s.bf[0], s.bf[1], s.bf[2], s.bf[3])
    gl.blendEquationSeparate(s.be[0], s.be[1])
    gl.depthFunc(s.df)
    gl.depthMask(s.dm)
    gl.colorMask(s.cm[0], s.cm[1], s.cm[2], s.cm[3])
    gl.clearColor(s.cc[0], s.cc[1], s.cc[2], s.cc[3])
    gl.clearDepth(s.cd)
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, s.ua)
    gl.pixelStorei(gl.PACK_ALIGNMENT, s.pa)
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, s.flip)
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, s.pre)
    for (let i = 0; i < UNITS; i++) { gl.activeTexture(gl.TEXTURE0 + i); gl.bindTexture(gl.TEXTURE_2D, s.tex[i]) }
    gl.activeTexture(s.unit)
  }
}

const NAMES = { 0x0500: 'INVALID_ENUM', 0x0501: 'INVALID_VALUE', 0x0502: 'INVALID_OPERATION', 0x0505: 'OUT_OF_MEMORY', 0x0506: 'INVALID_FRAMEBUFFER_OPERATION', 0x9242: 'CONTEXT_LOST_WEBGL' }
const reported = new Set()

/** every error pending on the context, by name (empties the queue) */
export function drainGL(gl) {
  const out = []
  for (let i = 0; i < 16; i++) { const e = gl.getError(); if (e === gl.NO_ERROR) break; out.push(NAMES[e] || `0x${e.toString(16)}`) }
  return out
}

/**
 * In development: report the first error of each pass, loudly, and keep every one for the harnesses. Returns the
 * errors found (empty when there were none). In production it is never called except by the one-time probe.
 */
export function checkGL(gl, pass) {
  const errs = drainGL(gl)
  if (!errs.length) return errs
  if (typeof window !== 'undefined') {
    const list = (window.__csGLErrors ??= [])
    list.push({ pass, errs, at: performance.now() })
    if (DEV && !reported.has(pass)) {
      reported.add(pass)
      console.error(`[cross-section] WebGL ${errs.join(', ')} after the pass "${pass}" — the first error of that pass; every one is on window.__csGLErrors`)
      banner(`WebGL ${errs[0]} after "${pass}"`)
    }
  }
  return errs
}

function banner(text) {
  if (typeof document === 'undefined') return
  let el = document.getElementById('cs-gl-banner')
  if (!el) {
    el = document.createElement('div')
    el.id = 'cs-gl-banner'
    el.style.cssText = 'position:fixed;left:0;right:0;top:0;z-index:2147483647;padding:8px 12px;background:#c00;color:#fff;font:600 12px/1.4 ui-monospace,Consolas,monospace;pointer-events:none'
    document.body.appendChild(el)
  }
  el.textContent = `CROSS SECTION (dev): ${text}${el.textContent ? ` · ${el.textContent.replace(/^CROSS SECTION \(dev\): /, '')}` : ''}`.slice(0, 400)
}

export const GL_DEV = DEV
