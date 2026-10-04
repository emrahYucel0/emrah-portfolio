/*
 * ── THE LOUVERS AS GEOMETRY (technique C) ───────────────────────────────────────────────────────────────────
 *
 * Why this and not the per-pixel slats: measured on the Intel UHD, a ray cast added to C2's one fragment shader
 * cost about twice an ordinary place, and an ordinary place already misses 60 fps there at 1440×900@2
 * (docs/CROSS-SECTION.md, "the performance decision"). So C2 is asked to do what it already does — draw the two
 * flat states, once, with its own rows and its own anti-aliasing — and the louvers are drawn as what they are in
 * the reference: thin boxes in perspective, carrying strips of those two pictures.
 *
 *   faces   C2 renders the flat SURFACE and the flat DEPTH into two textures at the canvas's own resolution,
 *           mipmapped and filtered anisotropically, so a louver turning away is averaged by the GPU's filtering
 *           rather than aliased. At rest a louver samples its face texel for texel: the picture is C2's own.
 *   boxes   per louver, the face the eye can see and the edge it can see, as quads. The CPU poses them with the
 *           reference's own transforms (slats.js); the vertex shader applies the reference's perspective.
 *   depth   a depth buffer decides what is in front, as the browser's 3D compositing does in the reference.
 *   edges   4× multisampling: the louvers' outlines are geometry now, and C2's canvas has no anti-aliasing of
 *           its own (it never needed it — every edge it drew was analytic).
 *
 * Same WebGL context as C2. Everything it binds it unbinds: its own vertex array, its own framebuffers; C2's
 * program, its default vertex array and its textures are re-established by C2's own render().
 *
 * Imported only where __CROSS__ is true.
 */
import { CS_THICK } from './slats.js'
import { saveGL } from './glstate.js'

const HALF0 = CS_THICK / 2

const BG_VS = `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`

// the ground between the louvers, the reference's warm air behind them, and (as a second pass) its light across them
const BG_FS = `#version 300 es
precision highp float;
uniform vec2 uRes;      // css px
uniform float uDpr;
uniform vec4 uScene;    // strip, scene height, width, light (1) or ground (0) pass
uniform vec3 uGap;
uniform vec4 uAtmo;     // atmosphere opacity, light opacity, warm (1) or neutral (0)
out vec4 o;
void main() {
  vec2 p = vec2(gl_FragCoord.x, uRes.y * uDpr - gl_FragCoord.y) / uDpr;
  vec2 sp = vec2(p.x, p.y - uScene.x);
  if (uScene.w > 1.5) {
    // the reveal (C3): the scene is open — nothing of the canvas there but the louvers — and the strips, the DEPTH
    // side's own paper, thin away over the bench's own (premultiplied: the page underneath shows through)
    float inScene = step(0.0, sp.y) * step(sp.y, uScene.y);
    o = vec4(uGap, 1.0) * uAtmo.w * (1.0 - inScene);
  } else if (uScene.w < 0.5) {
    vec2 ac = (sp - vec2(0.54 * uScene.z, 0.48 * uScene.y)) / vec2(0.65 * uScene.z, 0.52 * uScene.y);
    float air = (1.0 - clamp(length(ac) / 0.68, 0.0, 1.0)) * uAtmo.x;
    float inScene = step(0.0, sp.y) * step(sp.y, uScene.y);
    o = vec4(mix(uGap, vec3(0.706, 0.47, 0.255), 0.22 * air * inScene), 1.0);
  } else {
    // a screen blend: the pass writes what it adds, the blend function does the rest
    float lx = dot(sp / vec2(uScene.z, uScene.y) - 0.5, normalize(vec2(0.966, 0.259))) + 0.5;
    float la = smoothstep(0.18, 0.33, lx) * 0.04 + smoothstep(0.33, 0.49, lx) * (1.0 - smoothstep(0.49, 0.66, lx)) * 0.32;
    vec3 lc = mix(vec3(0.95), vec3(0.992, 0.792, 0.569), uAtmo.z);
    float inScene = step(0.0, sp.y) * step(sp.y, uScene.y);
    o = vec4(lc * la * uAtmo.y * inScene, 1.0);
  }
}`

/*
 * THE PERSPECTIVE IS THE REFERENCE'S: a point at scene (x, y, z) lands at O + (xy - O)·P/(P - z). With
 * w = (P - z)/P that is O + (xy - O)/w, which is linear in clip space — so the GPU's own perspective-correct
 * interpolation carries the textures, exactly as the browser's compositor does in the demo.
 */
const LV_VS = `#version 300 es
in vec3 aPos;        // scene px, y down, z towards the eye
in vec4 aAttr;       // u, v in the face texture (0..1, GL's y up) — or, on an edge, (across, 0); side; kind
in vec2 aEdge;       // an edge's opacity and brightness
uniform vec3 uEye;   // O.x, O.y, P
uniform vec3 uView;  // css width, css height, strip
out vec2 vUV;
out float vSide;
out float vKind;
out vec2 vEdge;
void main() {
  float w = (uEye.z - aPos.z) / uEye.z;
  vec2 s = uEye.xy * w + aPos.xy - uEye.xy;          // (screen - O) * w + O * w, i.e. screen * w
  float x = 2.0 * s.x / uView.x - w;
  float y = w - 2.0 * (s.y + uView.z * w) / uView.y;
  gl_Position = vec4(x, y, clamp(-aPos.z / 4000.0, -0.99, 0.99) * w, w);
  vUV = aAttr.xy; vSide = aAttr.z; vKind = aAttr.w; vEdge = aEdge;
}`

const LV_FS = `#version 300 es
precision highp float;
uniform sampler2D uFace0;   // SURFACE
uniform sampler2D uFace1;   // DEPTH
uniform vec2 uFade;         // how much of the louvers is left (1 but in the reveal), and ink (1) or copper (0) edges
in vec2 vUV;
in float vSide;
in float vKind;
in vec2 vEdge;
out vec4 o;
vec3 copper(float g) {
  // R2's copper, shaped like the reference's edge: dark at the corners, the mark in the body, a lit crest
  vec3 dk = vec3(0.235, 0.137, 0.086), mk = vec3(0.722, 0.384, 0.184), lt = vec3(0.831, 0.529, 0.353);
  vec3 c = mix(dk, mk, smoothstep(0.0, 0.34, g));
  c = mix(c, lt, smoothstep(0.34, 0.53, g) * (1.0 - smoothstep(0.53, 0.74, g)));
  c = mix(c, mix(mk, dk, 0.35), smoothstep(0.53, 0.74, g));
  return mix(c, dk, smoothstep(0.74, 1.0, g));
}
void main() {
  if (vKind < 0.5) {
    o = vSide < 0.5 ? texture(uFace0, vUV) : texture(uFace1, vUV);
    o.a = 1.0;
    o *= uFade.x;
  } else {
    // premultiplied: the edge lies over what is behind it at the reference's opacity
    vec3 c = mix(copper(vUV.x) * vEdge.y, vec3(0.0706), uFade.y);
    o = vec4(c * vEdge.x, vEdge.x) * uFade.x;
  }
}`

// the resolved frame onto the canvas, texel for texel, by an ordinary draw call (see draw())
const CP_FS = `#version 300 es
precision highp float;
uniform sampler2D uSrc;
out vec4 o;
void main() { o = texelFetch(uSrc, ivec2(gl_FragCoord.xy), 0); }`

export function createMesh(gl, { leak = false } = {}) {
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s }
  const link = (vs, fs, attrs) => {
    const p = gl.createProgram()
    gl.attachShader(p, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs))
    attrs.forEach((a, i) => gl.bindAttribLocation(p, i, a))
    gl.linkProgram(p)
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p))
    const L = {}
    return { p, u: (n) => (L[n] ??= gl.getUniformLocation(p, n)) }
  }
  const bg = link(BG_VS, BG_FS, ['aPos'])
  const lv = link(LV_VS, LV_FS, ['aPos', 'aAttr', 'aEdge'])
  const cp = link(BG_VS, CP_FS, ['aPos'])
  const aniso = gl.getExtension('EXT_texture_filter_anisotropic')

  // vertex arrays of our own: C2's attribute 0 lives in the default vertex array and is never touched
  const restoreInit = saveGL(gl)
  const bgVao = gl.createVertexArray()
  gl.bindVertexArray(bgVao)
  const bgBuf = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, bgBuf)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
  const lvVao = gl.createVertexArray()
  gl.bindVertexArray(lvVao)
  const STRIDE = 9   // pos 3, attr 4, edge 2
  const lvBuf = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, lvBuf)
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, STRIDE * 4, 0)
  gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 4, gl.FLOAT, false, STRIDE * 4, 12)
  gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 2, gl.FLOAT, false, STRIDE * 4, 28)
  restoreInit()
  let verts = new Float32Array(0)

  let faces = [null, null]       // the two face textures
  let msFbo = null, msColor = null, msDepth = null, size = [0, 0], rsFbo = null, rsTex = null
  const samples = Math.min(4, gl.getParameter(gl.MAX_SAMPLES) || 0)

  const targets = (w, h) => {
    if (size[0] === w && size[1] === h && msFbo) return
    for (const r of [msColor, msDepth]) if (r) gl.deleteRenderbuffer(r)
    if (msFbo) gl.deleteFramebuffer(msFbo)
    if (rsFbo) gl.deleteFramebuffer(rsFbo)
    if (rsTex) gl.deleteTexture(rsTex)
    msFbo = gl.createFramebuffer()
    gl.bindFramebuffer(gl.FRAMEBUFFER, msFbo)
    msColor = gl.createRenderbuffer()
    gl.bindRenderbuffer(gl.RENDERBUFFER, msColor)
    gl.renderbufferStorageMultisample(gl.RENDERBUFFER, samples, gl.RGBA8, w, h)
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, msColor)
    msDepth = gl.createRenderbuffer()
    gl.bindRenderbuffer(gl.RENDERBUFFER, msDepth)
    gl.renderbufferStorageMultisample(gl.RENDERBUFFER, samples, gl.DEPTH_COMPONENT24, w, h)
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, msDepth)
    // the samples are resolved into this texture, never straight onto the canvas (see draw())
    rsTex = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, rsTex)
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA8, w, h)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
    rsFbo = gl.createFramebuffer()
    gl.bindFramebuffer(gl.FRAMEBUFFER, rsFbo)
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, rsTex, 0)
    size = [w, h]
  }

  // a face texture of this size, kept and reused; reallocated only when the canvas has changed size
  const sizes = [[0, 0], [0, 0]]
  function alloc(i, w, h) {
    if (faces[i] && sizes[i][0] === w && sizes[i][1] === h) return faces[i]
    if (faces[i]) gl.deleteTexture(faces[i])
    const t = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, t)
    // all the levels at once, so generateMipmap never reallocates and a copy never meets an incomplete texture
    gl.texStorage2D(gl.TEXTURE_2D, Math.floor(Math.log2(Math.max(w, h))) + 1, gl.RGBA8, w, h)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.bindTexture(gl.TEXTURE_2D, null)
    faces[i] = t; sizes[i] = [w, h]
    return t
  }
  function finish(t, mips) {
    gl.bindTexture(gl.TEXTURE_2D, t)
    // (the calibration break `nomip` leaves them out: a face seen at a slant then aliases, as canvas-2D would)
    if (mips) gl.generateMipmap(gl.TEXTURE_2D)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, mips ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR)
    if (aniso) gl.texParameterf(gl.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT, mips ? Math.min(8, gl.getParameter(aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT)) : 1)
    gl.bindTexture(gl.TEXTURE_2D, null)
  }

  // harness only: a face's pixels, or the canvas's, read back (RGBA, GL's row order)
  function readTex(t, w, h) {
    const fbo = gl.createFramebuffer()
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0)
    const out = new Uint8Array(w * h * 4)
    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, out)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.deleteFramebuffer(fbo)
    return out
  }

  return {
    samples,
    read(i) { if (!faces[i]) return null; const r = saveGL(gl); const out = readTex(faces[i], sizes[i][0], sizes[i][1]); r(); return out },
    readCanvas() { const r = saveGL(gl); const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight, out = new Uint8Array(w * h * 4); gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.pixelStorei(gl.PACK_ALIGNMENT, 4); gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, out); r(); return out },
    /**
     * Have C2 draw a face. `draw` renders one frame into whatever framebuffer is bound; the texture it leaves is
     * the face, at the canvas's own resolution, with mipmaps for when it is seen at a slant.
     */
    face(i, w, h, draw, { mips = true } = {}) {
      const r = saveGL(gl)
      const t = alloc(i, w, h)
      const fbo = gl.createFramebuffer()
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0)
      draw()
      gl.bindFramebuffer(gl.FRAMEBUFFER, null)
      gl.deleteFramebuffer(fbo)
      finish(t, mips)
      r()
    },
    /**
     * THE FRAME ON THE CANVAS, kept as a face: copied out of the drawing buffer right after C2 has drawn it, before
     * the browser takes the buffer away. The louvers then begin from exactly what the visitor was looking at.
     */
    capture(i) {
      const r = saveGL(gl)
      const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight
      const t = alloc(i, w, h)
      gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null)
      gl.bindTexture(gl.TEXTURE_2D, t)
      gl.copyTexSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 0, 0, w, h)
      finish(t, true)
      r()
    },
    /**
     * Band k of n of a face, drawn by C2 into the face's texture: a full C2 frame costs as much as an ordinary place
     * does, so the face that is still turned away is drawn a third at a time instead of all at once.
     */
    band(i, k, n, draw) {
      const r = saveGL(gl)
      const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight
      const t = alloc(i, w, h)
      const fbo = gl.createFramebuffer()
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0)
      const y0 = Math.floor((h * k) / n), y1 = Math.floor((h * (k + 1)) / n)
      gl.enable(gl.SCISSOR_TEST)
      gl.scissor(0, y0, w, y1 - y0)
      draw()
      gl.disable(gl.SCISSOR_TEST)
      gl.bindFramebuffer(gl.FRAMEBUFFER, null)
      gl.deleteFramebuffer(fbo)
      if (k === n - 1) finish(t, true)
      r()
    },
    /**
     * The quads for this pose: per louver, the face the eye can see and the edge it can see. Corners are taken
     * through the louver's own matrix to scene space here; the shader only projects.
     */
    geometry(L, Q, sides, strip, H, dpr) {
      // C2's own pixel mapping: a CSS px is exactly `dpr` device px from the top-left, whatever the backing store was
      // rounded to (390 at 1.75 is 682.5, stored as 683). Texture coordinates follow that mapping, not the rounding,
      // or the face drifts by up to half a pixel across the screen.
      const bw = gl.drawingBufferWidth, bh = gl.drawingBufferHeight
      // and the louvers span the backing's whole extent in those px, so its last column is covered too (682.5 → 683)
      const Wq = bw / dpr
      const n = Q.louvers.length
      const need = n * 2 * 6 * STRIDE
      if (verts.length < need) verts = new Float32Array(need)
      let o = 0
      const put = (M, x, y, z, u, v, side, kind, ev, br) => {
        verts[o++] = M[0] * x + M[1] * y + M[2] * z + M[3]
        verts[o++] = M[4] * x + M[5] * y + M[6] * z + M[7]
        verts[o++] = M[8] * x + M[9] * y + M[10] * z + M[11]
        verts[o++] = u; verts[o++] = v; verts[o++] = side; verts[o++] = kind; verts[o++] = ev; verts[o++] = br
      }
      const quad = (c) => { for (const k of [0, 1, 2, 0, 2, 3]) put(...c[k]) }
      const W = Wq, uMax = 1
      // a louver's thickness: the reveal's slats may be thicker than the crossing's (slats.js, revealLayout)
      const HALF = Q.half ?? HALF0
      /*
       * THE FIELD'S EDGES ARE WHOLE DEVICE ROWS (the responsive pass, 2026-10-04). At a fractional ratio the strips end
       * mid-row — 50 px × 1.25 is 62.5 device px — and that row is C2's own blend of strip and field. The faces carry it
       * (they are C2's picture), so the first and last louvers reach out to the whole boundary rows, and the scissor in
       * draw() takes them too; before this the row was the strip's ground, 93-110 levels off C2's frame at 1536×864@1.25.
       * The reach is applied at both ends of the louver, so it holds whichever face is showing (the back is turned over);
       * at an integer ratio it is nothing.
       */
      const fieldH = H - 2 * strip
      const reachTop = (strip * dpr - Math.floor(strip * dpr + 1e-6)) / dpr
      const reachBot = (Math.ceil((H - strip) * dpr - 1e-6) - (H - strip) * dpr) / dpr
      for (let i = 0; i < n; i++) {
        const l = Q.louvers[i], M = l.M, top = l.top, hl = l.hl
        const sd = sides(l.Minv, Q.eye, top, hl, HALF)
        // the image a face carries is the screen's own: v is the GL texture row of screen y (y up)
        const vy = (sy) => 1 - ((strip + sy) * dpr) / bh
        const e = i === 0 ? reachTop : i === n - 1 ? Math.max(0, fieldH + reachBot - (top + hl)) : 0
        const a0 = top - e, a1 = top + hl + e
        if (sd.face > 0) {
          quad([[M, 0, a0, HALF, 0, vy(a0), 0, 0, 0, 0], [M, W, a0, HALF, uMax, vy(a0), 0, 0, 0, 0],
            [M, W, a1, HALF, uMax, vy(a1), 0, 0, 0, 0], [M, 0, a1, HALF, 0, vy(a1), 0, 0, 0, 0]])
        } else if (sd.face < 0) {
          // the back's image is turned over with the louver: local y maps to image y 2·top + hl − y
          const f = (y) => vy(2 * top + hl - y)
          quad([[M, 0, a0, -HALF, 0, f(a0), 1, 0, 0, 0], [M, W, a0, -HALF, uMax, f(a0), 1, 0, 0, 0],
            [M, W, a1, -HALF, uMax, f(a1), 1, 0, 0, 0], [M, 0, a1, -HALF, 0, f(a1), 1, 0, 0, 0]])
        }
        if (sd.edge !== 0 && l.ev > 0.002) {
          const y0 = sd.edge < 0 ? top : top + hl
          quad([[M, 0, y0, -HALF, 0, 0, 0, 1, l.ev, l.bright], [M, W, y0, -HALF, 0, 0, 0, 1, l.ev, l.bright],
            [M, W, y0, HALF, 1, 0, 0, 1, l.ev, l.bright], [M, 0, y0, HALF, 1, 0, 0, 1, l.ev, l.bright]])
        }
      }
      return o / STRIDE
    },
    /**
     * One frame into the canvas: ground, louvers, light — multisampled, then resolved onto the default
     * framebuffer. `count` vertices from geometry().
     */
    draw(V, Q, count, look) {
      // the canvas's own size: on the site it is the composed size times the dpr AND the large-screen scale
      // and the projection maps CSS px to device px the same way C2 does: by its dpr, over the backing's own extent
      const restore = saveGL(gl)
      const bw = gl.drawingBufferWidth, bh = gl.drawingBufferHeight, r = V.dpr * (V.u || 1)
      targets(bw, bh)
      gl.bindFramebuffer(gl.FRAMEBUFFER, msFbo)
      gl.viewport(0, 0, bw, bh)
      gl.disable(gl.BLEND); gl.disable(gl.DEPTH_TEST); gl.disable(gl.SCISSOR_TEST)
      gl.colorMask(true, true, true, true)
      gl.clearDepth(1); gl.clear(gl.DEPTH_BUFFER_BIT)
      // the reveal (C3) draws over a canvas that lets the page through: the ground is open, the strips thin away
      const rv = look.reveal || null
      // the ground
      gl.useProgram(bg.p)
      gl.bindVertexArray(bgVao)
      gl.uniform2f(bg.u('uRes'), bw / r, bh / r); gl.uniform1f(bg.u('uDpr'), r)
      gl.uniform4f(bg.u('uScene'), V.strip, V.H - 2 * V.strip, V.W, rv ? 2 : 0)
      gl.uniform3f(bg.u('uGap'), look.gap[0], look.gap[1], look.gap[2])
      gl.uniform4f(bg.u('uAtmo'), look.atmo, look.light, look.warm, rv ? rv.strip : 0)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
      // the louvers, inside the scene only: the material never crosses into a strip
      gl.enable(gl.SCISSOR_TEST)
      // (whole device rows: at a fractional ratio the field's edge rows are C2's, carried by the faces — see geometry())
      const sy0 = Math.floor(V.strip * r + 1e-6), sy1 = Math.ceil((V.H - V.strip) * r - 1e-6)
      gl.scissor(0, sy0, bw, sy1 - sy0)
      gl.useProgram(lv.p)
      gl.bindVertexArray(lvVao)
      gl.bindBuffer(gl.ARRAY_BUFFER, lvBuf)
      gl.bufferData(gl.ARRAY_BUFFER, verts.subarray(0, count * STRIDE), gl.STREAM_DRAW)
      gl.uniform3f(lv.u('uEye'), Q.eye[0], Q.eye[1], Q.eye[2])
      gl.uniform3f(lv.u('uView'), bw / r, bh / r, V.strip)
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, faces[0]); gl.uniform1i(lv.u('uFace0'), 0)
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, faces[1]); gl.uniform1i(lv.u('uFace1'), 1)
      gl.uniform2f(lv.u('uFade'), rv ? rv.fade : 1, rv ? 1 : 0)
      gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL); gl.depthMask(true)
      // in the reveal what the louvers leave is blended over the open ground, premultiplied, as the page will see it
      if (rv) { gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA) }
      gl.drawArrays(gl.TRIANGLES, 0, count)
      if (rv) gl.disable(gl.BLEND)
      gl.disable(gl.DEPTH_TEST)
      // the light, as a screen blend over everything in the scene
      if (look.light > 0.001 && !rv) {
        gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_COLOR)
        gl.useProgram(bg.p)
        gl.bindVertexArray(bgVao)
        gl.uniform4f(bg.u('uScene'), V.strip, V.H - 2 * V.strip, V.W, 1)
        gl.drawArrays(gl.TRIANGLES, 0, 3)
        gl.disable(gl.BLEND)
      }
      gl.disable(gl.SCISSOR_TEST)
      /*
       * THE SAMPLES ARE RESOLVED INTO A TEXTURE, AND THE TEXTURE IS DRAWN ONTO THE CANVAS. Not blitted straight onto
       * the canvas: a blit to the default framebuffer depends on its format matching, which the page does not choose
       * (the browser does — and may change it for the display), and it is not a draw call. This way the canvas only
       * ever receives an ordinary draw, the same kind C2 itself does.
       */
      gl.bindFramebuffer(gl.READ_FRAMEBUFFER, msFbo)
      gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, rsFbo)
      gl.blitFramebuffer(0, 0, bw, bh, 0, 0, bw, bh, gl.COLOR_BUFFER_BIT, gl.NEAREST)
      gl.bindFramebuffer(gl.FRAMEBUFFER, null)
      gl.viewport(0, 0, bw, bh)
      gl.useProgram(cp.p)
      gl.bindVertexArray(bgVao)
      gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, rsTex); gl.uniform1i(cp.u('uSrc'), 2)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
      // (the calibration break `leakgl` leaves this pass's program and the rest of its state bound — the fault a user
      // found on 2026-10-03 — so the harnesses can be shown to fail on it)
      if (!leak) restore()
    },
  }
}
