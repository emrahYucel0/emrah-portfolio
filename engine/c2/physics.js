// Coarse material grid (inherited from original C2's displacement field, extended).
//   R  displacement — rows combed by motion, spring + tension + plastic residue + permanent imprint
//   G  develop      — how far latent information has come up into the rows under load
//   B  memory       — weight left by holds, releases and drawn strokes
//   A  disturbance  — fast motion knocks alternating rows out of registration; they find it again
//
// IMPRINT (V2): a permanent displacement the sheet keeps for the whole visit — strokes drawn in the Lab,
// and the scars left where the surface once gave way. It belongs to the sheet, not to a state, so it is
// present wherever the visitor goes next; `impVis` sets how strongly each state lets it show.
const RANGE = 160

export function createPhysics() {
  const P = {
    cell: 16, cols: 1, rows: 1, W: 1, H: 1,
    disp: null, vel: null, plast: null, dev: null, mem: null, dist: null, imp: null, data: null,
    K: 26, TENSION: 700, DAMP: 5.2,
    plasticDecay: 0.18, plasticYield: 5, memDecay: 0.0025, combGain: 0.03, impVis: 0.6,
  }

  P.resize = (W, H) => {
    const old = P.mem ? { mem: P.mem, imp: P.imp, cols: P.cols, rows: P.rows, cell: P.cell } : null
    P.W = W; P.H = H
    P.cell = W < 700 ? 12 : 16
    P.cols = Math.ceil(W / P.cell) + 2
    P.rows = Math.ceil(H / P.cell) + 2
    const n = P.cols * P.rows
    P.disp = new Float32Array(n); P.vel = new Float32Array(n); P.plast = new Float32Array(n)
    P.dev = new Float32Array(n); P.mem = new Float32Array(n); P.dist = new Float32Array(n); P.imp = new Float32Array(n)
    P.data = new Uint8Array(n * 4)
    // memory and imprint survive a resize: they are the visitor's history, not layout
    if (old) for (let y = 0; y < P.rows; y++) for (let x = 0; x < P.cols; x++) {
      const ox = Math.min(old.cols - 1, Math.round((x * P.cell) / old.cell)), oy = Math.min(old.rows - 1, Math.round((y * P.cell) / old.cell))
      P.mem[y * P.cols + x] = old.mem[oy * old.cols + ox]
      P.imp[y * P.cols + x] = old.imp[oy * old.cols + ox]
    }
  }
  const each = (x0, y0, x1, y1, fn) => {
    const gx0 = Math.max(0, Math.floor(x0 / P.cell)), gx1 = Math.min(P.cols - 1, Math.ceil(x1 / P.cell))
    const gy0 = Math.max(0, Math.floor(y0 / P.cell)), gy1 = Math.min(P.rows - 1, Math.ceil(y1 / P.cell))
    for (let gy = gy0; gy <= gy1; gy++) for (let gx = gx0; gx <= gx1; gx++) fn(gy * P.cols + gx, gx * P.cell, gy * P.cell)
  }

  // weight: anisotropic, longer along the rows than across them
  P.mark = (x, y, ax, ay, amt, cap = 1) => {
    each(x - ax * 2.5, y - ay * 2.5, x + ax * 2.5, y + ay * 2.5, (i, cx, cy) => {
      const dx = (cx - x) / ax, dy = (cy - y) / ay
      P.mem[i] = Math.min(cap, P.mem[i] + amt * Math.exp(-(dx * dx + dy * dy) / 2))
    })
  }
  P.memAt = (x, y) => {
    const gx = Math.max(0, Math.min(P.cols - 1, Math.round(x / P.cell))), gy = Math.max(0, Math.min(P.rows - 1, Math.round(y / P.cell)))
    return P.mem[gy * P.cols + gx]
  }
  // a stroke through the rows: rows ahead of a vertical stroke are dragged along it,
  // rows beside a horizontal stroke are pushed apart from it. Slopes stay under 1, so rows never cross.
  P.groove = (x0, y0, x1, y1, r = 16, amp = 11) => {
    const lx = x1 - x0, ly = y1 - y0, len = Math.hypot(lx, ly)
    if (len < 0.5) return
    const ny = ly / len
    each(Math.min(x0, x1) - r * 2.5, Math.min(y0, y1) - r * 2.5, Math.max(x0, x1) + r * 2.5, Math.max(y0, y1) + r * 2.5, (i, cx, cy) => {
      const t = Math.max(0, Math.min(1, ((cx - x0) * lx + (cy - y0) * ly) / (len * len)))
      const px = x0 + lx * t, py = y0 + ly * t
      const d2 = (cx - px) ** 2 + (cy - py) ** 2
      const f = Math.exp(-d2 / (2 * r * r))
      if (f < 0.02) return
      const side = cy >= py ? 1 : -1
      const push = amp * f * (ny * 0.9 + side * (1 - Math.abs(ny))) * Math.min(1, len / 10)
      P.imp[i] = Math.max(-18, Math.min(18, P.imp[i] + push * 0.35))
      P.mem[i] = Math.min(0.8, P.mem[i] + f * 0.05)
    })
  }
  // where the surface once gave way it does not close perfectly: a thin permanent seam
  P.scar = (x, y, halfW, amp = 5, r = 9) => {
    each(x - halfW * 1.3, y - r * 3, x + halfW * 1.3, y + r * 3, (i, cx, cy) => {
      const ex = Math.max(0, Math.abs(cx - x) - halfW) / (halfW * 0.25 + 1)
      const fx = Math.exp(-ex * ex)
      const dy = cy - y
      const f = Math.exp(-(dy * dy) / (2 * r * r)) * fx
      P.imp[i] = Math.max(-18, Math.min(18, P.imp[i] + Math.sign(dy || 1) * amp * f))
      P.mem[i] = Math.min(0.9, P.mem[i] + f * 0.6)
    })
  }
  // a line impulse along the rows: tension carries it outward
  P.kick = (y, amp, x0 = 0, x1 = P.W) => {
    const gy = Math.max(0, Math.min(P.rows - 1, Math.round(y / P.cell)))
    for (let gx = Math.max(0, Math.floor(x0 / P.cell)); gx <= Math.min(P.cols - 1, Math.ceil(x1 / P.cell)); gx++) P.vel[gy * P.cols + gx] += amp
  }

  // sources: pointer [{x,y,vx,vy,hover}]   develops: [{x,y,ax,ay,amt}]
  P.step = (dt, sources, develops) => {
    const { cols, rows, cell, disp, vel, plast, dev, dist, imp, K, TENSION, DAMP } = P
    const iv = P.impVis
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const i = y * cols + x
        const cx = x * cell, cy = y * cell
        const lap = (disp[x > 0 ? i - 1 : i] + disp[x < cols - 1 ? i + 1 : i] + disp[y > 0 ? i - cols : i] + disp[y < rows - 1 ? i + cols : i]) * 0.25 - disp[i]
        let dT = 0, rT = 0
        for (const s of sources) {
          const dx = s.x - cx, dy = s.y - cy, d2 = dx * dx + dy * dy
          const sp = s.vx * s.vx + s.vy * s.vy
          if (sp > 225 && d2 < 8100) {
            const fc = 1 - Math.sqrt(d2) / 90
            const push = s.vy * fc * fc * P.combGain
            vel[i] += push > 40 ? 40 : push < -40 ? -40 : push
          }
          if (sp > 40000 && d2 < 90000) rT = Math.max(rT, Math.min(1, (Math.sqrt(sp) - 200) / 2200) * Math.exp(-d2 / 24200))
        }
        for (const d of develops) {
          const dx = (cx - d.x) / d.ax, dy = (cy - d.y) / d.ay
          const q = dx * dx + dy * dy
          if (q < 12) dT = Math.max(dT, d.amt * Math.exp(-q / 2))
        }
        vel[i] += (-K * (disp[i] - plast[i] - imp[i] * iv) + TENSION * lap - DAMP * vel[i]) * dt
        dev[i] += (dT - dev[i]) * Math.min(1, (dT > dev[i] ? 4 : 1.1) * dt)
        dist[i] += (rT - dist[i]) * Math.min(1, (rT > dist[i] ? 9 : 1.6) * dt)
      }
    }
    const { data, mem } = P
    const md = 1 - P.memDecay * dt, pd = 1 - P.plasticDecay * dt
    for (let i = 0; i < disp.length; i++) {
      disp[i] += vel[i] * dt
      const e = disp[i] - plast[i] - imp[i] * iv
      if (e > P.plasticYield || e < -P.plasticYield) plast[i] += e * 0.8 * dt
      plast[i] *= pd
      mem[i] *= md
      const v = disp[i] / RANGE + 0.5
      const o = i * 4
      data[o] = v <= 0 ? 0 : v >= 1 ? 255 : v * 255
      data[o + 1] = Math.min(255, dev[i] * 255)
      data[o + 2] = Math.min(255, mem[i] * 255 * Math.min(1, iv * 1.4))
      data[o + 3] = Math.min(255, dist[i] * 255)
    }
  }
  return P
}
