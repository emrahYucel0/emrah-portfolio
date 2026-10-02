<script setup lang="ts">
import { labCount, studies, studyNo, type StudyId } from '~~/shared/content'
import { CUE_IDLE, cueSeen, cueSpend } from '~~/engine/cues.js'

/**
 * LAB — THE REGISTERED BENCH, EMBEDDED REGISTER, DATUM. (Accepted reference: research lab-reopen/bench-v2-refined.)
 *
 * Transplanted from the research site, where it was a section of the home page. Here it is the Lab route's own
 * landing: /[locale]/lab. Nothing about the bench itself changed — the same sheet, the same three records pinned
 * to the same registration edge, the same datum. Only its address did.
 *
 * One working sheet with three studies registered on it. The records are pinned to a registration edge — no cards,
 * no tabs, no rail. A record is an impression in the sheet: the rows it crosses are interrupted, and nothing else
 * marks it out. Registered / unregistered is told by registration (an unregistered record carries a second,
 * misregistered impression), and the registered record's baseline lies on the DATUM, the one line that leaves it,
 * crosses the field and ends at the terminal. Choosing a record re-registers the sheet; the field is rebuilt for
 * that study: WEIGHT's partition, LINE's single run, TONE's row weight.
 */
const { copy, path } = useLocale()
const REDUCED = import.meta.client && matchMedia('(prefers-reduced-motion: reduce)').matches
const { visit } = useVisit()
const router = useRouter()

const POS = [0.06, 0.4, 0.78] // editorial positions, in the sheet's own rows — deliberately not even
const stage = ref<HTMLElement | null>(null)
const canvas = ref<HTMLCanvasElement | null>(null)
const recEls = ref<HTMLElement[]>([])
const openEl = ref<HTMLElement | null>(null)
const noteEl = ref<HTMLElement | null>(null)
const markEl = ref<HTMLElement | null>(null)
// the server cannot know which study this visit last registered (it lives in session memory), so the bench is
// rendered from its first record and adopts the remembered one once it is mounted — no hydration mismatch
const sel = ref(0)
const registering = ref(false)
const status = ref('')
const current = computed(() => studies[sel.value]!)
const href = (id: StudyId) => path(`/lab/${id}`)

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const smooth = (t: number) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t) }
const damp = (a: number, b: number, l: number, dt: number) => a + (b - a) * (1 - Math.exp(-l * dt))

let ctx: CanvasRenderingContext2D | null = null
let W = 0, H = 0, DPR = 1, TOP = 50, BOT = 44
const S = { reg: 0, fill: 1, datum: 0, datumT: 0, edges: null as number[] | null, hover: -1, veil: 0, veilT: 0 }
/*
 * THE SEAM TO CONTACT (F2, useContactSeam). The finale opens on the bench's bare row field, value for value, so the
 * bench crosses to it by clearing itself to that field first — the field, the register and the records fade, the
 * trim's rows run on across the sheet — and hands over only when it IS the finale's first frame. Coming back up out
 * of the finale it does the reverse: it arrives bare and registers itself out of the field. `veil` is 0 for the
 * bench, 1 for the bare field; reduced motion is simply at the end of either.
 */
const VEIL_OUT = 0.28, VEIL_IN = 0.42 // seconds
let veilDone: (() => void) | null = null
function exitToBare() {
  // the foot band is the finale's too: the bench's hint goes at once, not faded, so the handover finds it identical
  clearTimeout(cueTimer); cueText.value = ''; leavingSeam.value = true
  S.veilT = 1
  if (REDUCED) { S.veil = 1; paintVeilDom(); request(); return Promise.resolve() }
  request()
  return new Promise<void>((res) => { veilDone = res })
}
let veilDom = -1
function paintVeilDom() {
  if (veilDom === S.veil || !stage.value) return
  veilDom = S.veil
  stage.value.style.setProperty('--veil', String(smooth(S.veil)))
}
let L: { portrait: boolean; short: boolean; spacing: number; th: number; pad: number; railX: number; ys: number[]; fieldX: number } | null = null

function select(i: number, how: string) {
  if (i === sel.value && how !== 'boot') { if (how === 'press') enter(); return }
  sel.value = i
  visit.value.lab.activeStudy = studies[i]!
  status.value = `${copy.value.lab.studies[studies[i]!].name} — ${copy.value.lab.registered}`
  if (how !== 'boot') {
    registering.value = !REDUCED
    S.reg = REDUCED ? 0 : 1
    S.fill = REDUCED ? 1 : 0
  }
  toneField = null
  nextTick(() => { place(); if (REDUCED || how === 'boot') S.datum = S.datumT; request() })
}
function enter() { void router.push(href(current.value)) }
/** one study along (R7, useLabSpine): false at either end, where the gesture is the next place's */
function step(d: 1 | -1) {
  const i = sel.value + d
  if (i < 0 || i >= studies.length) return false
  select(i, 'step')
  return true
}

/*
 * THE BENCH'S ONE HINT (R3's system, engine/cues.js). The bench asks two things at once — that scrolling browses the
 * studies and that a click (a tap) opens one — so it says both, in the foot band's middle, after CUE_IDLE of no input
 * at all, once per session. Any input ends it.
 */
const touchSheet = import.meta.client && matchMedia('(hover: none)').matches
const cueText = ref('')
const leavingSeam = ref(false)
let cueTimer = 0
const CUE = 'bench'
function armCue() {
  clearTimeout(cueTimer)
  if (cueText.value) cueText.value = ''
  if (cueSeen(CUE)) return
  cueTimer = window.setTimeout(() => {
    if (cueSeen(CUE)) return
    cueSpend(CUE)
    cueText.value = touchSheet ? copy.value.hints.benchTouch : copy.value.hints.bench
  }, CUE_IDLE)
}
const cueInputs = ['wheel', 'pointerdown', 'keydown'] as const
function onKey(e: KeyboardEvent) {
  const d = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? -1 : 0
  if (!d) return
  e.preventDefault()
  select((sel.value + d + studies.length) % studies.length, 'key')
  nextTick(() => recEls.value[sel.value]?.querySelector('button')?.focus())
}

// ── geometry ─────────────────────────────────────────────────────────────
function geom() {
  const portrait = W < H * 0.9, short = H < 470
  const railX = portrait ? 62 : short ? 86 : 104
  const top = TOP + (short ? 34 : 70), bot = H - BOT - (short ? 40 : 100)
  const spread = Math.max(80, bot - top)
  return { portrait, short, spacing: portrait ? 5.2 : 7, th: portrait ? 0.72 : 0.85, pad: portrait ? 20 : 28, railX, ys: POS.map((f) => Math.round(top + spread * f)), fieldX: railX }
}
const rowOf = (y: number) => Math.max(0, Math.round((y - TOP - L!.spacing * 0.5) / L!.spacing))
function place() {
  const st = stage.value
  if (!st || !canvas.value) return
  L = geom()
  const base = st.getBoundingClientRect()
  recEls.value.forEach((el, i) => {
    el.style.left = `${L!.railX}px`; el.style.top = '0px'
    const bl = el.querySelector<HTMLElement>('.bl')!
    const bt = bl.getBoundingClientRect().top - el.getBoundingClientRect().top
    el.style.top = `${Math.round(L!.ys[i]! - bt)}px`
  })
  const co = recEls.value[sel.value]?.querySelector<HTMLElement>('.co')
  if (co) co.textContent = `r${String(rowOf(L.ys[sel.value]!)).padStart(3, '0')}`
  S.datumT = L.ys[sel.value]!
  // the mark and the note take their places first: on a portrait screen the terminal is placed against the note,
  // and it cannot be placed against something that has not been put anywhere yet
  markEl.value!.style.left = `${Math.max(6, L.railX - (L.portrait ? 28 : 34))}px`
  markEl.value!.style.bottom = `${BOT + 18}px`
  noteEl.value!.style.left = `${L.railX + 18}px`
  // on the narrowest phone the note takes the slack it was holding above the foot rule, so the terminal above it
  // has room to stand clear of both the record and the note
  noteEl.value!.style.bottom = `${BOT + (L.portrait ? (W <= 360 ? 6 : 16) : 24)}px`
  noteEl.value!.style.right = `${L.pad}px`

  const o = openEl.value!
  const t1 = o.querySelector<HTMLElement>('.t1')!, t2 = o.querySelector<HTMLElement>('.t2')!
  o.style.top = '0px'
  if (L.portrait) {
    o.style.left = `${L.railX + 18}px`; o.style.right = 'auto'
    const rb = recEls.value[sel.value]!.getBoundingClientRect()
    // The datum's terminal sits just under the registered record. On a small phone the third record sits low
    // enough that this put the terminal on top of the note — measured at 320×568, 37px of overlap. It may be
    // lifted towards the note, but never above the record it belongs to: the record's own lines come first.
    const under = Math.round(rb.bottom - base.top + 8)
    const noteTop = Math.round(noteEl.value!.getBoundingClientRect().top - base.top)
    // The gap it has to live in is bounded by the next record down as well: the records are fixed to the rail, so
    // on a small phone the two lines of notation ran straight through the one below and its title read doubled.
    // Where the gap is too shallow the terminal sets itself on one line — the same two pieces of notation, in the
    // order they are read, on the row the datum ends at.
    const below = recEls.value
      .filter((_, i) => i !== sel.value)
      .map((el) => Math.round(el.getBoundingClientRect().top - base.top))
      .filter((y) => y > under)
      .sort((x, y) => x - y)[0]
    const ceiling = Math.min(below ?? Infinity, noteTop > 0 ? noteTop : Infinity)
    o.classList.toggle('tight', Number.isFinite(ceiling) && o.offsetHeight + 16 > ceiling - under)
    const floor = (Number.isFinite(ceiling) ? ceiling : noteTop) - o.offsetHeight - 10
    o.style.top = `${Number.isFinite(ceiling) && floor > under ? Math.min(under, floor) : under}px`
  } else {
    o.style.left = 'auto'; o.style.right = `${L.pad}px`
    const ra = o.getBoundingClientRect()
    const mid = (t1.getBoundingClientRect().bottom + t2.getBoundingClientRect().top) / 2
    o.style.top = `${Math.round(L.ys[sel.value]! - (mid - ra.top))}px`
  }
  layoutVoids()
}
function resize() {
  const st = stage.value, cv = canvas.value
  if (!st || !cv) return
  const w = st.clientWidth, h = st.clientHeight, dpr = Math.min(devicePixelRatio || 1, 2)
  /*
   * A canvas whose size is set is cleared, and the browser may paint it before the next frame draws it again: one
   * frame of bare ground with no rows (measured, R7: the ResizeObserver's first call, which arrives with the size
   * unchanged, did it right after the bench had mounted). So an unchanged size leaves the canvas alone, and a changed
   * one is drawn again at once.
   */
  if (ctx && w === W && h === H && dpr === DPR) { place(); request(); return }
  W = w; H = h; DPR = dpr
  cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR)
  ctx = cv.getContext('2d')
  ctx?.setTransform(DPR, 0, 0, DPR, 0, 0)
  TOP = document.querySelector<HTMLElement>('[data-strip]')?.getBoundingClientRect().height ?? 50
  BOT = H < 470 ? 32 : W < 760 ? 40 : 44
  toneField = null
  weight = { w: new Array(5).fill(0.2), phase: 0 }
  place()
  if (raf) { cancelAnimationFrame(raf); raf = 0 }
  frame(performance.now())
}

// ── row interruption: whole rows stop and resume around a record ──────────
let voids: { x: number; w: number; y0: number; y1: number }[] = []
function textBands(el: Element | null | undefined, padX = 7, padY = 3) {
  if (!el || !L) return []
  const cs = getComputedStyle(el)
  if (cs.display === 'none' || cs.visibility === 'hidden') return []
  const base = stage.value!.getBoundingClientRect()
  const range = document.createRange(); range.selectNodeContents(el)
  let rs = [...range.getClientRects()].filter((r) => r.width > 0.5 && r.height > 0.5)
  if (!rs.length) { const b = el.getBoundingClientRect(); if (b.width > 0.5) rs = [b] }
  const out = []
  for (const r of rs) {
    const sp = L.spacing, top = r.top - base.top, bottom = r.bottom - base.top
    const k0 = Math.ceil((top - padY - TOP - sp * 0.5) / sp)
    const k1 = Math.floor((bottom + padY - TOP - sp * 0.5) / sp)
    if (k1 < k0) continue
    out.push({ x: r.left - base.left - padX, w: r.width + padX * 2, y0: TOP + k0 * sp, y1: TOP + (k1 + 1) * sp })
  }
  return out
}
function layoutVoids() {
  const v = []
  for (const el of recEls.value) {
    v.push(...textBands(el.querySelector('.no'), 6))
    v.push(...textBands(el.querySelector('.nm'), 7, 4))
    v.push(...textBands(el.querySelector('.pr'), 6))
  }
  v.push(...textBands(openEl.value?.querySelector('.t1'), 8))
  v.push(...textBands(openEl.value?.querySelector('.t2'), 8))
  // the note is the one piece of running prose on the sheet, and on a phone it is small: its lines are given a
  // row of clearing above and below so the field does not run through the letterforms
  v.push(...textBands(noteEl.value, 8, L!.portrait ? 6 : 3))
  v.push(...textBands(markEl.value, 5, 4))
  voids = v
}

// ── WEIGHT field: the partition, and its rules moving ─────────────────────
let weight = { w: new Array(5).fill(0.2), phase: 0 }
function stepWeight(dt: number) {
  weight.phase += dt * (REDUCED ? 0 : 0.22)
  const att = weight.phase % 5
  let sum = 0
  const raw: number[] = []
  for (let i = 0; i < 5; i++) {
    const d = Math.min(Math.abs(i - att), 5 - Math.abs(i - att))
    const v = 0.08 + Math.exp(-(d * d) / (2 * 0.62 * 0.62)) * (1 + (S.hover === 0 ? 0.24 : 0))
    raw.push(v); sum += v
  }
  for (let i = 0; i < 5; i++) weight.w[i] = REDUCED ? raw[i]! / sum : damp(weight.w[i]!, raw[i]! / sum, 4.5, dt)
}

// ── TONE field: the precomputed tone map, centred on the datum ────────────
let toneSrc: { t: Uint8Array; tw: number; th: number } | null = null
let toneField: { c: HTMLCanvasElement; x0: number } | null = null
async function loadTone() {
  const img = new Image(); img.decoding = 'async'
  await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = '/tone/lab-texture.webp' })
  const tw = img.naturalWidth, th = img.naturalHeight
  const c = Object.assign(document.createElement('canvas'), { width: tw, height: th })
  const x = c.getContext('2d', { willReadFrequently: true })!
  x.drawImage(img, 0, 0)
  const d = x.getImageData(0, 0, tw, th).data
  const t = new Uint8Array(tw * th)
  for (let j = 0; j < t.length; j++) t[j] = d[j * 4]!
  toneSrc = { t, tw, th }
  request()
}
function buildToneField() {
  if (!L || !toneSrc) return
  const x0 = Math.round(L.fieldX)
  const cw = Math.max(2, Math.round(W) - x0), chh = Math.max(2, Math.round(H))
  const c = Object.assign(document.createElement('canvas'), { width: cw, height: chh })
  const x = c.getContext('2d')!
  const im = x.createImageData(cw, chh)
  const d = im.data
  for (let i = 0; i < d.length; i += 4) { d[i] = 239; d[i + 1] = 238; d[i + 2] = 233; d[i + 3] = 255 }
  const { t, tw, th: tH } = toneSrc
  const AMP = 0.54, CROP = 0.34
  const cx0 = (tw - tw * CROP) / 2, cy0 = (tH - tH * CROP) / 2
  const dat = S.datumT
  const R = Math.max(120, (H - TOP - BOT) * 0.58)
  for (let px = 0; px < cw; px++) {
    const sx = Math.min(tw - 1, Math.floor(cx0 + (px / cw) * tw * CROP))
    for (let row = 0; ; row++) {
      const cy = TOP + row * L.spacing + L.spacing * 0.5
      if (cy > chh - BOT) break
      const sy = Math.min(tH - 1, Math.floor(cy0 + ((cy - TOP) / Math.max(1, chh - TOP - BOT)) * tH * CROP))
      const tv = t[sy * tw + sx]! / 255
      const env = 0.26 + 0.74 * smooth(1 - Math.abs(cy - dat) / R)
      const hw = L.th * (0.5 + tv * 1.15 * AMP * env)
      const top = cy - hw, bot = cy + hw
      const y0 = Math.max(0, Math.floor(top)), y1 = Math.min(chh - 1, Math.ceil(bot) - 1)
      for (let y = y0; y <= y1; y++) {
        const cov = clamp(Math.min(bot, y + 1) - Math.max(top, y), 0, 1)
        if (cov <= 0) continue
        const o = (y * cw + px) * 4
        d[o] = Math.round(d[o]! + (18 - d[o]!) * cov)
        d[o + 1] = Math.round(d[o + 1]! + (18 - d[o + 1]!) * cov)
        d[o + 2] = Math.round(d[o + 2]! + (18 - d[o + 2]!) * cov)
      }
    }
  }
  x.putImageData(im, 0, 0)
  toneField = { c, x0 }
}

// ── LINE field: one thin run, rising early, returning to the datum ───────
function linePath(now: number) {
  const { pad, fieldX, portrait } = L!
  const x0 = fieldX + 6, x1 = W - pad, fw = x1 - x0, y = S.datum
  const upH = Math.max(28, Math.min((H - TOP - BOT) * 0.42, fw * 0.26, y - TOP - 30))
  const dnH = Math.max(12, Math.min(upH * 0.22, H - BOT - 24 - y))
  const breathe = REDUCED ? 0.5 : Math.sin(now / 3200) * 0.5 + 0.5
  const ax = x0 + fw * lerp(portrait ? 0.08 : 0.1, portrait ? 0.12 : 0.13, breathe)
  const aw = fw * (portrait ? 0.6 : 0.28)
  const bx = x0 + fw * 0.68, bw = fw * 0.2
  const uy = y - upH, dy = y + dnH
  const r = Math.min(18, upH / 4), r2 = Math.min(10, dnH / 2.2)
  const pts: [number, number][] = []
  const arc = (cx: number, cy: number, rr: number, a0: number, a1: number) => { for (let i = 0; i <= 12; i++) { const a = lerp(a0, a1, i / 12); pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]) } }
  const P = Math.PI
  pts.push([x0, y], [ax, y], [ax, uy + r]); arc(ax + r, uy + r, r, P, P * 1.5)
  pts.push([ax + aw - r, uy]); arc(ax + aw - r, uy + r, r, P * 1.5, P * 2)
  pts.push([ax + aw, y])
  if (!portrait) {
    pts.push([bx, y], [bx, dy - r2]); arc(bx + r2, dy - r2, r2, P, P * 0.5)
    pts.push([bx + bw - r2, dy]); arc(bx + bw - r2, dy - r2, r2, P * 0.5, 0)
    pts.push([bx + bw, y])
  }
  pts.push([x1, y])
  return pts
}

// ── painting ─────────────────────────────────────────────────────────────
function rowsLoop(fn: (cy: number) => void) { for (let row = 0; ; row++) { const cy = TOP + row * L!.spacing + L!.spacing * 0.5; if (cy > H - BOT) break; fn(cy) } }
function paintField(now: number) {
  const c = ctx!, { fieldX, th } = L!
  const id = current.value
  c.save(); c.beginPath(); c.rect(fieldX, 0, W - fieldX, H); c.clip()
  if (id === 'weight') {
    let acc = 0
    const edges = [fieldX]
    for (let i = 0; i < 5; i++) { acc += weight.w[i]!; edges.push(fieldX + (W - fieldX) * acc) }
    c.fillStyle = '#121212'
    rowsLoop((cy) => {
      for (let i = 0; i < 5; i++) {
        const share = clamp(weight.w[i]! * 5, 0, 2.4)
        const hw = th * (0.28 + share * 0.26)
        c.fillRect(edges[i]!, cy - hw, Math.max(0, edges[i + 1]! - edges[i]!) - 1, hw * 2)
      }
    })
    c.strokeStyle = 'rgba(18,18,18,.44)'; c.lineWidth = 1
    for (let i = 1; i < 5; i++) { const rx = Math.round(edges[i]!) + 0.5; c.beginPath(); c.moveTo(rx, TOP + 10); c.lineTo(rx, H - BOT - 10); c.stroke() }
    S.edges = edges
  } else if (id === 'line') {
    c.fillStyle = 'rgba(18,18,18,.52)'
    rowsLoop((cy) => c.fillRect(fieldX, cy - th * 0.5, W - fieldX, th))
    const pts = linePath(now)
    c.strokeStyle = '#121212'; c.lineWidth = L!.portrait ? 1.3 : 1.5; c.lineCap = 'round'; c.lineJoin = 'round'
    c.beginPath(); c.moveTo(pts[0]![0], pts[0]![1]); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i]![0], pts[i]![1]); c.stroke()
  } else {
    if (!toneField && toneSrc) buildToneField()
    if (toneField) c.drawImage(toneField.c, toneField.x0, 0, W - toneField.x0, H)
    else { c.fillStyle = 'rgba(18,18,18,.5)'; rowsLoop((cy) => c.fillRect(fieldX, cy - th * 0.5, W - fieldX, th)) }
  }
  c.restore()
}
function paintTrim() {
  const c = ctx!
  c.fillStyle = 'rgba(18,18,18,.5)'
  rowsLoop((cy) => c.fillRect(0, cy - L!.th * 0.5, L!.railX, L!.th))
}
function clearVoids() {
  const c = ctx!, F = 16
  for (const v of voids) {
    const g = c.createLinearGradient(v.x - F, 0, v.x + v.w + F, 0)
    const t = F / (v.w + F * 2)
    g.addColorStop(0, 'rgba(239,238,233,0)'); g.addColorStop(t, 'rgba(239,238,233,1)')
    g.addColorStop(1 - t, 'rgba(239,238,233,1)'); g.addColorStop(1, 'rgba(239,238,233,0)')
    c.fillStyle = g
    c.fillRect(v.x - F, v.y0, v.w + F * 2, v.y1 - v.y0)
  }
}
function paintRegister() {
  const c = ctx!, { railX, ys, spacing, portrait, pad } = L!
  const base = stage.value!.getBoundingClientRect()
  const rx = Math.round(railX) + 0.5
  const ch = 4, fe = 6
  const g = c.createLinearGradient(rx - ch - fe, 0, rx + ch + fe, 0)
  g.addColorStop(0, 'rgba(239,238,233,0)'); g.addColorStop(fe / (ch * 2 + fe * 2), 'rgba(239,238,233,1)')
  g.addColorStop(1 - fe / (ch * 2 + fe * 2), 'rgba(239,238,233,1)'); g.addColorStop(1, 'rgba(239,238,233,0)')
  c.fillStyle = g; c.fillRect(rx - ch - fe, TOP, (ch + fe) * 2, H - TOP - BOT)
  // the rule is CUT where a study registers — the gap is the registration point
  const gaps = ys.map((y, i) => [y - (i === sel.value ? 13 : 9), y + (i === sel.value ? 13 : 9)] as const)
  const y0 = TOP + 8, y1 = H - BOT - 8
  c.strokeStyle = 'rgba(18,18,18,.72)'; c.lineWidth = 1
  let cy = y0
  for (const [a, b] of [...gaps].sort((p, q) => p[0] - q[0])) {
    if (a > cy) { c.beginPath(); c.moveTo(rx, cy); c.lineTo(rx, Math.min(a, y1)); c.stroke() }
    cy = Math.max(cy, b)
  }
  if (cy < y1) { c.beginPath(); c.moveTo(rx, cy); c.lineTo(rx, y1); c.stroke() }
  // the scale: the edge measures the sheet in its own rows
  c.fillStyle = 'rgba(18,18,18,.34)'
  for (let k = 0; ; k += 5) {
    const y = TOP + k * spacing + spacing * 0.5
    if (y > y1) break
    if (y < y0 || gaps.some(([a, b]) => y > a - 3 && y < b + 3)) continue
    const long = k % 25 === 0
    c.fillRect(rx - (long ? 9 : 5), Math.round(y), long ? 9 : 5, 1)
  }
  // ticks: inked and square on the rule when registered, hollow and off the rule when not
  ys.forEach((y, i) => {
    if (i === sel.value) {
      c.fillStyle = '#121212'; c.fillRect(rx - 4.5, y - 4.5, 9, 9)
      c.fillRect(rx - 15, y - 6, 9, 1); c.fillRect(rx - 15, y + 5, 9, 1)
    } else { c.strokeStyle = 'rgba(18,18,18,.55)'; c.lineWidth = 1; c.strokeRect(rx + 3.5, y - 3, 6, 6) }
  })
  // the datum: it leaves the registered record and ends between the terminal's two lines
  const rec = recEls.value[sel.value]
  if (!rec) return
  const recR = rec.getBoundingClientRect(), openR = openEl.value!.getBoundingClientRect()
  const nmW = rec.querySelector('.nm')!.getBoundingClientRect().width
  const dx0 = Math.max(rx + 12, recR.left - base.left + nmW + 34)
  const dx1 = portrait ? W - pad : Math.min(W - pad, openR.left - base.left - 4)
  if (dx1 > dx0 + 20) {
    const y = Math.round(S.datum) + 0.5
    c.strokeStyle = 'rgba(18,18,18,.62)'; c.lineWidth = 1
    c.beginPath(); c.moveTo(dx0, y); c.lineTo(dx1, y); c.stroke()
    c.fillStyle = '#121212'; c.fillRect(dx0 - 0.5, y - 4.5, 1.6, 9); c.fillRect(dx1 - 1, y - 5.5, 1.6, 11)
    if (current.value === 'weight' && S.edges) for (let i = 1; i < 5; i++) { const ex = Math.round(S.edges[i]!) + 0.5; if (ex > dx0 && ex < dx1) c.fillRect(ex - 3, y - 3.5, 6, 1.4) }
  }
}
function paintSheet(now: number) { paintField(now); paintTrim() }

let raf = 0, last = 0, visible = false
function request() { if (!raf && visible && ctx) raf = requestAnimationFrame(frame) }
function frame(now: number) {
  raf = 0
  if (!ctx || !L) return
  const dt = last ? Math.min(1 / 24, (now - last) / 1000) : 1 / 60
  last = now
  if (!REDUCED) {
    S.reg = damp(S.reg, 0, 11, dt); S.fill = damp(S.fill, 1, 9, dt)
    S.datum = damp(S.datum, S.datumT, 14, dt)
    if (Math.abs(S.datum - S.datumT) < 0.4) S.datum = S.datumT
    if (S.reg < 0.004 && registering.value) registering.value = false
  } else S.datum = S.datumT
  if (S.veil !== S.veilT) {
    const step = dt / (S.veilT > S.veil ? VEIL_OUT : VEIL_IN)
    S.veil = REDUCED ? S.veilT : S.veilT > S.veil ? Math.min(S.veilT, S.veil + step) : Math.max(S.veilT, S.veil - step)
  }
  stepWeight(dt)
  const c = ctx
  c.fillStyle = '#efeee9'; c.fillRect(0, 0, W, H)
  const off = S.reg * (L.spacing * 2.2)
  if (S.reg > 0.004) {
    c.save(); c.globalAlpha = 0.5 * S.fill + 0.18; c.translate(0, -off); paintSheet(now); c.restore()
    c.save(); c.globalAlpha = 0.5 * S.fill + 0.18; c.translate(0, off); paintSheet(now); c.restore()
  } else { c.globalAlpha = 1; paintSheet(now) }
  c.globalAlpha = 1
  clearVoids()
  paintRegister()
  // the bare field the finale opens on: at 1 it is exactly its first frame (the same ground, the same fillRect rows)
  if (S.veil > 0.0005) {
    const v = smooth(S.veil)
    c.globalAlpha = v; c.fillStyle = '#efeee9'; c.fillRect(0, 0, W, H)
    c.fillStyle = 'rgba(18,18,18,.5)'; rowsLoop((cy) => c.fillRect(0, cy - L!.th * 0.5, W, L!.th))
    c.globalAlpha = 1
  }
  paintVeilDom()
  if (S.veil === S.veilT && S.veilT === 1 && veilDone) { const d = veilDone; veilDone = null; requestAnimationFrame(() => d()) }
  if (S.veil !== S.veilT) { request(); return }
  // the bench lives while it is seen: WEIGHT's rules move, LINE breathes; reduced motion holds still
  if (!REDUCED || S.reg > 0.004) request()
  else last = 0
}

let io: IntersectionObserver | null = null
let ro: ResizeObserver | null = null
// A ResizeObserver callback must not force layout. place() measures records, the note and the terminal and writes
// their positions back, interleaved — doing that inside the callback made the browser report "ResizeObserver loop
// completed with undelivered notifications" under load. The observer now only asks for the next frame, and several
// notifications in one frame coalesce into one measurement.
let roRaf = 0
function scheduleResize() {
  if (roRaf) return
  roRaf = requestAnimationFrame(() => { roRaf = 0; resize() })
}
onMounted(() => {
  benchSeam.exit = exitToBare
  benchSeam.step = step
  /*
   * WHERE THE BENCH OPENS (R7, user decisions 2026-10-02). Up out of the finale: on the last study, 03, the one the way
   * down left from. Back from a study — the browser's Back, or the study's own way back to the bench — on that study.
   * Every other way in (Work, the passage, the strip's LAB, the address): on the first, 01.
   */
  const h = (history.state ?? {}) as { back?: unknown; forward?: unknown }
  const from = (p: unknown) => { const m = typeof p === 'string' ? p.match(/\/lab\/([a-z]+)\/?$/) : null; return m ? studies.indexOf(m[1] as StudyId) : -1 }
  const fromStudy = Math.max(from(h.forward), from(h.back))
  if (takeHistoryFlag(LAB_ARRIVE) === 'contact') {
    // up out of the finale: the tail of that gesture is spent, and the bench registers itself out of the bare field
    sel.value = studies.length - 1
    hushTail()
    // the first frames are the finale's last, exactly: bare, and only then does the bench register itself out of it
    // (damping from the very first tick painted 0.995 — records at half a percent, one level off the finale's sheet)
    if (!REDUCED) { S.veil = 1; S.veilT = 1; requestAnimationFrame(() => requestAnimationFrame(() => { S.veilT = 0; request() })) }
  } else sel.value = fromStudy >= 0 ? fromStudy : 0
  for (const t of cueInputs) addEventListener(t, armCue, { passive: true })
  armCue()
  paintVeilDom()
  resize()
  select(sel.value, 'boot')
  /*
   * THE FIRST FRAME IS PAINTED NOW, NOT ON THE NEXT ANIMATION FRAME. The route's DOM is committed before then, and the
   * browser painted it once with the sheet still empty: arriving up out of the finale, one frame of bare ground with
   * no rows at all between the finale's field and the bench's (measured, R7: 165 600 pixels for 12 ms). Drawn here,
   * inside the mount, the first frame the browser shows is already the sheet.
   */
  if (raf) { cancelAnimationFrame(raf); raf = 0 }
  frame(performance.now())
  io = new IntersectionObserver((es) => {
    visible = es.some((e) => e.isIntersecting)
    if (visible) request(); else { if (raf) cancelAnimationFrame(raf); raf = 0; last = 0 }
  })
  if (stage.value) { io.observe(stage.value); ro = new ResizeObserver(() => scheduleResize()); ro.observe(stage.value) }
  document.fonts?.ready.then(() => { place(); request() })
  loadTone().catch(() => {})
})
onBeforeUnmount(() => {
  if (benchSeam.step === step) benchSeam.step = null
  clearTimeout(cueTimer)
  for (const t of cueInputs) removeEventListener(t, armCue)
  if (benchSeam.exit === exitToBare) benchSeam.exit = null; io?.disconnect(); ro?.disconnect(); if (raf) cancelAnimationFrame(raf); if (roRaf) cancelAnimationFrame(roRaf) })
</script>

<template>
  <section id="lab" class="lab-track" aria-labelledby="lab-h">
    <div ref="stage" class="lab-stage">
      <canvas ref="canvas" class="lab-sheet" aria-hidden="true" />
      <!-- on the research site the bench was a section of the home page and this was its h2; here the bench IS the
           route, so the same words are its h1. Nothing is shown either way: the sheet says it, this says it aloud. -->
      <h1 id="lab-h" class="u-sr">{{ copy.lab.title }} — {{ copy.lab.line }}</h1>
      <!-- without script the bench cannot compose itself (everything below is placed by it) and its parts pile up in
           a corner: this plain list is the Lab then — shown by CSS alone, so a visit with script never sees it flash
           (AUDIT-01). Also when the build failed to load (html.c2-failed, app.vue). -->
      <nav class="lab-bench-nojs" :aria-label="copy.lab.heading">
        <p class="u-label">{{ copy.lab.title }}</p>
        <p>{{ copy.lab.line }}</p>
        <ol>
          <li v-for="id in studies" :key="id">
            <a :href="href(id)"><span class="u-label">{{ studyNo(id) }}</span> <span lang="en">{{ copy.lab.studies[id].name }}</span></a>
            <span> — {{ copy.lab.studies[id].note }}</span>
          </li>
        </ol>
      </nav>
      <p ref="markEl" class="mark" aria-hidden="true">{{ labCount(copy) }}</p>
      <ul class="spine" :aria-label="copy.lab.heading" @keydown="onKey">
        <li v-for="(id, i) in studies" :key="id" :ref="(el) => { if (el) recEls[i] = el as HTMLElement }" class="rec-wrap">
          <button class="rec" type="button" :aria-current="i === sel ? 'true' : undefined" @click="select(i, 'press')" @pointerenter="S.hover = i" @pointerleave="S.hover = -1">
            <span class="no">{{ studyNo(id) }}<span class="co" /></span>
            <span class="nm" :data-nm="copy.lab.studies[id].name" lang="en">{{ copy.lab.studies[id].name }}<i class="bl" /></span>
            <span class="pr">{{ copy.lab.studies[id].prim }}</span>
          </button>
        </li>
      </ul>
      <div ref="openEl" class="open">
        <NuxtLink :to="href(current)" class="open-link" :aria-label="`${copy.lab.open}: ${copy.lab.studies[current].name}`">
          <span class="t1" lang="en">{{ studyNo(current) }} · {{ copy.lab.studies[current].name.toLowerCase() }}</span><span class="t2">{{ copy.lab.open }}<span class="a">→</span></span>
        </NuxtLink>
      </div>
      <p ref="noteEl" class="note">{{ copy.lab.studies[current].note }}</p>
      <!-- the foot band is the site's own strip (R7): the roles at the left, the city and the status at the right, from
           the same source as the home strip and the finale's foot, so the seam to Contact changes nothing in it.
           Its middle carries the bench's one hint. Which study is open is told by the records and the terminal. -->
      <div class="foot" :class="{ 'is-hinting': !!cueText, 'is-leaving': leavingSeam }" aria-hidden="true">
        <span class="roles" lang="en">{{ copy.roles.creative }} · {{ copy.roles.fullStack }}</span>
        <span class="hint" :class="{ on: !!cueText }">{{ cueText }}</span>
        <span class="state">{{ copy.identity.city }}{{ copy.hints.quietSeparator }}{{ copy.identity.status }}</span>
      </div>
      <p class="u-sr" role="status">{{ status }}</p>
    </div>
  </section>
</template>

<style>
.lab-track { position: relative; }
.lab-stage { position: relative; height: 100svh; min-height: 420px; overflow: hidden; background: var(--ground); }
/* the bench never pans: a finger's gesture here is the site's (useLabSpine), and a touch sequence that began here must
   not start scrolling the finale's document when the route changes under it mid-swipe (pinch zoom stays) */
.lab-stage { touch-action: pinch-zoom; }
/* the seam to Contact: what is not the bare field fades with the veil */
.lab-stage .spine, .lab-stage .open, .lab-stage .note, .lab-stage .mark { opacity: calc(1 - var(--veil, 0)); }
.lab-sheet { position: absolute; inset: 0; width: 100%; height: 100%; }
.lab-bench-nojs { display: none; position: absolute; inset: 0; z-index: 5; overflow: auto; background: var(--ground); padding: calc(var(--strip) + 40px) var(--pad) 40px; }
@media (scripting: none) { .lab-bench-nojs { display: block; } }
html.c2-failed .lab-bench-nojs { display: block; }
.lab-bench-nojs > * { max-width: 40rem; }
.lab-bench-nojs ol { list-style: none; margin: 24px 0 0; padding: 0; display: grid; gap: 14px; }
.lab-bench-nojs a { color: inherit; }
.lab-stage .spine { position: absolute; inset: 0; pointer-events: none; }
.lab-stage .rec-wrap { position: absolute; }
.lab-stage .rec {
  pointer-events: auto; display: block; padding: 9px 14px 9px 18px; text-align: left;
  color: var(--ink-muted); -webkit-tap-highlight-color: transparent;
  /* a record is an impression in the sheet, not a card: the browser's own button face and border were drawn
     around every one, because nothing here reset them (R7) */
  background: none; border: 0; border-radius: 0; font: inherit; min-height: 44px;
}
.lab-stage .rec .no { display: inline; margin-right: 9px; font-family: var(--mono); font-size: 10px; letter-spacing: 0.14em; vertical-align: 2px; }
.lab-stage .rec .co { display: none; }
.lab-stage .rec .nm {
  display: inline; position: relative; font-family: 'Archivo Var', var(--sans); font-size: 19px;
  font-variation-settings: 'wdth' 84, 'wght' 430;
  transition: font-size 0.2s cubic-bezier(0.2, 0.7, 0.3, 1), color 0.2s, font-variation-settings 0.2s;
}
/* R7 (user decision 2026-10-02): the unregistered records' second, misregistered impression is gone: it read as a
   doubled, blurred title, not as a state. Which study is registered is told by its size, its notation and the datum. */
.lab-stage .rec .bl { display: inline-block; width: 0; height: 0; }
.lab-stage .rec .pr { display: none; }
.lab-stage .rec[aria-current] { color: var(--ink); }
.lab-stage .rec[aria-current] .no { display: block; margin: 0 0 3px; vertical-align: baseline; }
.lab-stage .rec[aria-current] .co { display: inline; margin-left: 8px; opacity: 0.7; }
.lab-stage .rec[aria-current] .nm { font-size: 31px; font-variation-settings: 'wdth' 99, 'wght' 620; }
.lab-stage .rec[aria-current] .pr { display: block; margin-top: 5px; font-family: var(--mono); font-size: 9.5px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--ink-muted); }
.lab-stage .rec:focus-visible { outline: 2px solid var(--ink); outline-offset: 2px; }
/* the terminal: the datum ends between two lines of notation, not on a button */
.lab-stage .open { position: absolute; z-index: 2; }
.lab-stage .open-link { display: block; padding: 11px 0 11px 16px; text-decoration: none; color: var(--ink); font-family: var(--mono); font-size: 10.5px; letter-spacing: 0.12em; text-transform: uppercase; white-space: nowrap; }
.lab-stage .open .t1 { display: block; color: var(--ink-muted); }
.lab-stage .open .t2 { display: block; margin-top: 11px; color: var(--act); }
/* one row of notation where two will not fit between the record and the next one down (see place()) */
.lab-stage .open.tight .t1, .lab-stage .open.tight .t2 { display: inline; }
.lab-stage .open.tight .t2 { margin: 0 0 0 14px; }
.lab-stage .open.tight .open-link { padding-top: 7px; padding-bottom: 7px; }
.lab-stage .open .a { margin-left: 6px; }
.lab-stage .open:hover .t2, .lab-stage .open:focus-visible .t2 { text-decoration: underline; }
.lab-stage .mark {
  position: absolute; writing-mode: vertical-rl; transform: rotate(180deg);
  font-family: var(--mono); font-size: 10px; letter-spacing: 0.22em; text-transform: uppercase; color: var(--ink-muted); white-space: nowrap;
}
.lab-stage .note { position: absolute; font-family: var(--mono); font-size: 10.5px; letter-spacing: 0.05em; color: var(--ink-muted); max-width: 46ch; line-height: 1.95; }
.lab-stage .foot {
  position: absolute; left: 0; right: 0; bottom: 0; height: 44px; padding: 0 var(--pad);
  display: flex; align-items: center; justify-content: space-between; gap: 18px; border-top: 1px solid var(--rule);
  font-family: var(--mono); font-size: 11px; letter-spacing: 0.09em; text-transform: uppercase; color: var(--ink-muted);
  white-space: nowrap;
  /* opaque, as the finale's is: text on a transparent band over the canvas was rasterised differently (grey-scale
     instead of the platform's sub-pixel smoothing), and the same words differed by 1135 pixels across the seam */
  background: var(--ground);
}
/* the finale's foot, measure for measure (contact.vue): the status keeps the right edge and ends in an ellipsis */
.lab-stage .foot .state { margin-left: auto; overflow: hidden; text-overflow: ellipsis; min-width: 0; transition: opacity .4s ease; }
.lab-stage .foot .roles { flex: none; }
.lab-stage .foot .hint {
  position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%);
  color: var(--ink); opacity: 0; transition: opacity .5s ease; white-space: nowrap; pointer-events: none;
}
.lab-stage .foot .hint.on { opacity: 1; }
.lab-stage .foot.is-leaving span { transition: none; }
@media (max-width: 1100px) { .lab-stage .foot.is-hinting .state, .lab-stage .foot.is-hinting .roles { opacity: 0; } }
@media (max-width: 700px) { .lab-stage .foot .roles { display: none; } .lab-stage .foot { font-size: 10px; letter-spacing: 0.04em; } }
@media (prefers-reduced-motion: reduce) { .lab-stage .foot .hint, .lab-stage .foot .state { transition: none; } }
@media (max-width: 760px) {
  .lab-stage .rec { padding: 14px 12px 14px 15px; }
  .lab-stage .rec .nm { font-size: 16px; }
  .lab-stage .rec[aria-current] .nm { font-size: 25px; }
  .lab-stage .note { font-size: 10px; max-width: none; }
  .lab-stage .foot { height: 40px; }
}
@media (max-height: 470px) {
  .lab-stage .rec[aria-current] .pr, .lab-stage .note { display: none; }
  .lab-stage .rec .nm { font-size: 15px; }
  .lab-stage .rec[aria-current] .nm { font-size: 20px; }
  .lab-stage .foot { height: 32px; }
}
</style>
