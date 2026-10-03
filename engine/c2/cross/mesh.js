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

const HALF = CS_THICK / 2

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
  if (uScene.w < 0.5) {
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
  } else {
    // premultiplied: the edge lies over what is behind it at the reference's opacity
    vec3 c = copper(vUV.x) * vEdge.y;
    o = vec4(c * vEdge.x, vEdge.x);
  }
}`

export function createMesh(gl) {
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
  const aniso = gl.getExtension('EXT_texture_filter_anisotropic')

  // vertex arrays of our own: C2's attribute 0 lives in the default vertex array and is never touched
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
  gl.bindVertexArray(null)
  gl.bindBuffer(gl.ARRAY_BUFFER, null)
  let verts = new Float32Array(0)

  let faces = [null, null]       // the two face textures
  let msFbo = null, msColor = null, msDepth = null, size = [0, 0]
  const samples = Math.min(4, gl.getParameter(gl.MAX_SAMPLES) || 0)

  const targets = (w, h) => {
    if (size[0] === w && size[1] === h && msFbo) return
    for (const r of [msColor, msDepth]) if (r) gl.deleteRenderbuffer(r)
    if (msFbo) gl.deleteFramebuffer(msFbo)
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
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.bindRenderbuffer(gl.RENDERBUFFER, null)
    size = [w, h]
  }

  return {
    samples,
    /**
     * Have C2 draw a face. `draw` renders one frame into whatever framebuffer is bound; the texture it leaves is
     * the face, at the canvas's own resolution, with mipmaps for when it is seen at a slant.
     */
    face(i, w, h, draw, { mips = true } = {}) {
      if (faces[i]) gl.deleteTexture(faces[i])
      const t = gl.createTexture()
      gl.bindTexture(gl.TEXTURE_2D, t)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
      const fbo = gl.createFramebuffer()
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0)
      draw()
      gl.bindFramebuffer(gl.FRAMEBUFFER, null)
      gl.deleteFramebuffer(fbo)
      gl.bindTexture(gl.TEXTURE_2D, t)
      // (the calibration break `nomip` leaves them out: a face seen at a slant then aliases, as canvas-2D would)
      if (mips) gl.generateMipmap(gl.TEXTURE_2D)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, mips ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
      if (aniso && mips) gl.texParameterf(gl.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, gl.getParameter(aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT)))
      gl.bindTexture(gl.TEXTURE_2D, null)
      faces[i] = t
    },
    /**
     * The quads for this pose: per louver, the face the eye can see and the edge it can see. Corners are taken
     * through the louver's own matrix to scene space here; the shader only projects.
     */
    geometry(L, Q, sides, strip, H) {
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
      const W = L.W
      for (let i = 0; i < n; i++) {
        const l = Q.louvers[i], M = l.M, top = l.top, hl = l.hl
        const sd = sides(l.Minv, Q.eye, top, hl)
        // the image a face carries is the screen's own: v is the GL texture row of screen y (y up)
        const vy = (sy) => 1 - (strip + sy) / H
        if (sd.face > 0) {
          quad([[M, 0, top, HALF, 0, vy(top), 0, 0, 0, 0], [M, W, top, HALF, 1, vy(top), 0, 0, 0, 0],
            [M, W, top + hl, HALF, 1, vy(top + hl), 0, 0, 0, 0], [M, 0, top + hl, HALF, 0, vy(top + hl), 0, 0, 0, 0]])
        } else if (sd.face < 0) {
          // the back's image is turned over with the louver: local y maps to image y 2·top + hl − y
          quad([[M, 0, top, -HALF, 0, vy(top + hl), 1, 0, 0, 0], [M, W, top, -HALF, 1, vy(top + hl), 1, 0, 0, 0],
            [M, W, top + hl, -HALF, 1, vy(top), 1, 0, 0, 0], [M, 0, top + hl, -HALF, 0, vy(top), 1, 0, 0, 0]])
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
      const bw = Math.round(V.W * V.dpr), bh = Math.round(V.H * V.dpr)
      targets(bw, bh)
      gl.bindFramebuffer(gl.FRAMEBUFFER, msFbo)
      gl.viewport(0, 0, bw, bh)
      gl.disable(gl.BLEND); gl.disable(gl.DEPTH_TEST); gl.disable(gl.SCISSOR_TEST)
      gl.clearDepth(1); gl.clear(gl.DEPTH_BUFFER_BIT)
      // the ground
      gl.useProgram(bg.p)
      gl.bindVertexArray(bgVao)
      gl.uniform2f(bg.u('uRes'), V.W, V.H); gl.uniform1f(bg.u('uDpr'), V.dpr)
      gl.uniform4f(bg.u('uScene'), V.strip, V.H - 2 * V.strip, V.W, 0)
      gl.uniform3f(bg.u('uGap'), look.gap[0], look.gap[1], look.gap[2])
      gl.uniform4f(bg.u('uAtmo'), look.atmo, look.light, look.warm, 0)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
      // the louvers, inside the scene only: the material never crosses into a strip
      gl.enable(gl.SCISSOR_TEST)
      gl.scissor(0, Math.round(V.strip * V.dpr), bw, Math.round((V.H - 2 * V.strip) * V.dpr))
      gl.useProgram(lv.p)
      gl.bindVertexArray(lvVao)
      gl.bindBuffer(gl.ARRAY_BUFFER, lvBuf)
      gl.bufferData(gl.ARRAY_BUFFER, verts.subarray(0, count * STRIDE), gl.STREAM_DRAW)
      gl.uniform3f(lv.u('uEye'), Q.eye[0], Q.eye[1], Q.eye[2])
      gl.uniform3f(lv.u('uView'), V.W, V.H, V.strip)
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, faces[0]); gl.uniform1i(lv.u('uFace0'), 0)
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, faces[1]); gl.uniform1i(lv.u('uFace1'), 1)
      gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL); gl.depthMask(true)
      gl.drawArrays(gl.TRIANGLES, 0, count)
      gl.disable(gl.DEPTH_TEST)
      // the light, as a screen blend over everything in the scene
      if (look.light > 0.001) {
        gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_COLOR)
        gl.useProgram(bg.p)
        gl.bindVertexArray(bgVao)
        gl.uniform4f(bg.u('uScene'), V.strip, V.H - 2 * V.strip, V.W, 1)
        gl.drawArrays(gl.TRIANGLES, 0, 3)
        gl.disable(gl.BLEND)
      }
      gl.disable(gl.SCISSOR_TEST)
      gl.bindVertexArray(null)
      gl.bindBuffer(gl.ARRAY_BUFFER, null)
      // resolve the samples onto the canvas
      gl.bindFramebuffer(gl.READ_FRAMEBUFFER, msFbo)
      gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null)
      gl.blitFramebuffer(0, 0, bw, bh, 0, 0, bw, bh, gl.COLOR_BUFFER_BIT, gl.NEAREST)
      gl.bindFramebuffer(gl.FRAMEBUFFER, null)
      gl.activeTexture(gl.TEXTURE0)
    },
  }
}
