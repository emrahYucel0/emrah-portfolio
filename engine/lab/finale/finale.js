// THE CONTACT FINALE — the site's one Contact, drawn by a plotter (prototype: the sibling repo
// lab-contact, whose README carries the storyboard and every decision). Framework-free, like
// engine/lab/line-study.js: the page (app/pages/[locale]/contact.vue) owns the DOM and the
// content, and hands this module its canvases, its prerendered accessible cells and its words.
//
//   tear → cartridge → the sheet parts at the cells' borders → the pen writes the labels and
//   the five values (Hershey futural) → the email SOAKS into the site's display face → live:
//   attention redistributes the cells (Weight), soaking is attention's reward, and every action
//   is recorded on the drawing as a revision (cloud + △n), paid from one fixed length of ink.
//
// Everything is a function of the document's scroll POSITION (useStudy's model); on the narrow
// touch sheet the track runs on into an attention stretch where the scroll carries attention.

import { createFrame } from './frame.js'
import { createSurface } from './surface.js'
import { createPlotter, LIVE_P, FLOOR_CAP, P_TEAR, mapReducedP, partingAt } from './plotter.js'
import { createPartition } from './partition.js'
import { createParting } from './parting.js'
import { createOverlay } from './overlay.js'
import { createSoak } from './soak.js'
import { createHud } from './hud.js'
import { note } from './debug.js'

// ~4.2 viewports of travel (user decision: 4–4.5); the narrow touch sheet adds an ATTENTION
// stretch after the plot (one field after another, by scroll: ≈ 1.2 screens, user decision)
const STAGES = 3.2
const ATT_STAGES = 1.2
const STATES = 4 // resting · parted+labels · email written · settled (reduced snaps here)
const ORDER = ['email', 'phone', 'github', 'linkedin', 'location']

// a touch device: on its narrow sheet the SCROLL carries attention and a tap only ever acts.
// Asked FRESH on every resize (a browser's device emulation toggles it without a reload) and from
// every signal a touch screen gives — not only `(hover: none)`
const mq = (q) => { try { return matchMedia(q).matches } catch { return false } }
const touchCapable = () => mq('(pointer: coarse)') || mq('(any-pointer: coarse)') || navigator.maxTouchPoints > 0 || 'ontouchstart' in window
const touchSheet = (S) => S.portrait && touchCapable()

/** the touch sheet's attention by scroll: q 0…1 walks the five fields; each holds a plateau and
 *  hands over along a smooth ramp (deterministic both ways). Reduced motion: one at a time. */
function scrollLevels(q, reduced) {
  const u = q * ORDER.length
  const out = {}
  ORDER.forEach((id, i) => {
    if (reduced) { out[id] = q > 0 && Math.min(ORDER.length - 1, Math.floor(u)) === i ? 1 : 0; return }
    const c = i + 0.5
    let a = 1 - Math.max(0, Math.abs(u - c) - 0.3) / 0.7
    if (i === 0) a *= Math.min(1, u / 0.5) // the first rises out of the plot
    if (i === ORDER.length - 1 && u >= c) a = 1 // the last holds to the end
    a = Math.max(0, Math.min(1, a))
    out[id] = a * a * (3 - 2 * a)
  })
  return out
}

/**
 * @param {object} o
 * @param {HTMLElement} o.track      the scroll track (its height is the finale's travel)
 * @param {HTMLCanvasElement} o.paper, o.ink
 * @param {HTMLElement} o.contact    the prerendered accessible layer ([data-cell] cells, [data-copy])
 * @param {HTMLElement} o.status     role=status
 * @param {HTMLElement} o.footLeft, o.footRight
 * @param {Array} o.items            the five cells (see app/pages/[locale]/contact.vue)
 * @param {object} o.strings         { contact, finale, labTitle, registered }
 * @param {string} o.lang            'tr' | 'en'
 */
export function createFinale(o) {
  const { items, strings, lang } = o
  const params = new URLSearchParams(location.search)
  const SOAK = params.get('soak') !== '0' // the crescendo IS the default; ?soak=0 only compares

  const frame = createFrame({ stages: (S) => STAGES + (touchSheet(S) ? ATT_STAGES : 0), states: STATES, track: o.track, canvases: { paper: o.paper, ink: o.ink } })
  const surface = createSurface(frame.S)
  const partition = createPartition(items)
  // user decision: the GitHub/LinkedIn cells carry no plotted label — the short name IS the word
  const plotter = createPlotter(frame.S, () => items, { soak: SOAK, hideLabels: ['github', 'linkedin'] })
  let soak = null
  if (SOAK) {
    try { soak = createSoak(frame.S, () => items) } catch (err) { note('fallback', `soak unavailable (${err.message}) → pen lettering only`) }
  }
  const overlay = createOverlay(o.contact, o.status)
  const parting = createParting()
  const hud = createHud()
  const off = new AbortController()
  let dead = false

  function onAttention(kind, id, ts) {
    // keyboard focus must wake the frame loop itself — a resting sheet has no rAF running
    if (kind === 'focus') { partition.setFocus(id); frame.request() }
    else if (kind === 'blur') { partition.setFocus(null); frame.request() }
    else if (kind === 'spend') {
      // the climax: the action (browser default / clipboard) fires with this very event and
      // waits for NOTHING — even the pen's compile is deferred to the next task
      const t0 = performance.now()
      setTimeout(() => {
        if (dead) return
        if (plotter.revise(id) === 'new') {
          const it = items.find((x) => x.id === id)
          o.status.textContent = `${strings.finale.revision} ${plotter.revCount}: ${it?.label ?? id}`
        }
        frame.request()
      }, 0)
      if (ts) (window.__spendLat ??= []).push({ queue: Math.round((t0 - ts) * 100) / 100, work: Math.round((performance.now() - t0) * 1000) / 1000 })
    } else if (kind === 'copied') {
      plotter.copied()
      frame.request()
    }
    // hover is carried by the pointer itself (pointermove → attention)
  }
  overlay.adopt(items, strings, onAttention)

  const frameRect = () => { const v = plotter.view; return { x: v.fr.x, y: v.fr.y, w: v.fr.w, h: v.fr.h } }
  function rebuild() {
    plotter.build(partition, lang)
    soak?.reset()
    // prime the soak stages for the rest layout at once: the crescendo only ever blits
    requestAnimationFrame(() => {
      if (dead) return
      plotter.layout(partition.tick(frameRect(), 1 / 60, frame.S.reduced, false, frame.S.portrait))
      soak?.prime(plotter, lang)
    })
    surface.makePaper()
    frame.request()
  }
  frame.resized(rebuild)
  rebuild()

  // ── chrome that follows the story: the foot carries the place and the ink counter ──
  let chromeKey = '', counterAt = 0
  function chrome(p, now) {
    const past = p >= 0.5
    let right
    if (p < P_TEAR) right = strings.registered
    else {
      if (now - counterAt < 120 && chromeKey) return // the counter breathes at its own pace
      const ink = plotter.inkState(p)
      right = ink.out
        ? strings.finale.inkOut
        : `${strings.finale.ink} ${ink.reserveMm.toLocaleString(lang === 'tr' ? 'tr-TR' : 'en-US')} mm${ink.rev ? ` · △${ink.rev}` : ''}`
      counterAt = now
    }
    const key = `${past ? 1 : 0}|${right}`
    if (key === chromeKey) return
    chromeKey = key
    o.footLeft.textContent = past ? strings.contact.heading : strings.labTitle
    o.footRight.textContent = right
  }

  // graceful degradation ladder: EMA of the frame's own cost, with hysteresis
  let ema = 8, level = 0, calm = 0
  function pickLevel(ms) {
    ema += (ms - ema) * 0.08
    if (ema > 14 && level < 2) { level++; ema = 10; calm = 0 }
    else if (ema < 7 && level > 0 && ++calm > 90) { level--; calm = 0 }
  }

  let lastTouch = null
  function frameBody(stepP, dt) {
    const t0 = performance.now()
    // the plot's p; on the touch sheet the track runs on into the attention stretch (q)
    let rawP = stepP, q = 0
    const touch = touchSheet(frame.S)
    if (touch !== lastTouch) { lastTouch = touch; note('info', `touch sheet (scroll carries attention): ${touch ? 'yes' : 'no'} · portrait ${frame.S.portrait}`) }
    if (touch) {
      const u = frame.rawProgress() * (STAGES + ATT_STAGES)
      rawP = Math.min(1, u / STAGES)
      q = Math.max(0, Math.min(1, (u - STAGES) / ATT_STAGES))
    }
    // reduced motion's four stations, applied ONCE for every layer (plot, soak, pen, chrome)
    const p = frame.S.reduced ? mapReducedP(rawP) : rawP
    const live = p >= LIVE_P
    partition.setScrollAttention(touch && live ? scrollLevels(q, frame.S.reduced) : null)
    const pt = partition.tick(frameRect(), dt, frame.S.reduced, live, frame.S.portrait)
    plotter.layout(pt)
    parting.set(pt.divs, plotter.view.sp, partingAt(p), frame.S.portrait)
    // the others' soak follows ATTENTION (its reward); the email's follows the scroll
    const atts = {}
    for (const it of items) atts[it.id] = partition.attOf(it.id)?.att ?? 0
    const soakMoving = plotter.soakTick(live ? atts : null, dt)
    surface.clear()
    surface.drawRestingRows(undefined, plotter.tear, parting)
    let soakRes = { busy: false, drawn: {} }
    if (soak) {
      try { soakRes = soak.draw(p, pt, plotter, lang, parting) } catch (err) {
        note('fallback', `soak switched off after an error (${err.message}) → pen lettering only`)
        soak = null
      }
    }
    const plotMoving = plotter.draw(p, dt, level, soakRes.drawn)
    chrome(p, t0)
    overlay.setVisible(p >= LIVE_P)
    if (p >= 0.9) {
      const boxes = {}, fallback = {}
      for (const it of items) {
        boxes[it.id] = plotter.valueBox(it.id)
        fallback[it.id] = plotter.capOf(it.id) < FLOOR_CAP
      }
      overlay.sync(pt.rects, boxes, fallback)
    }
    const ms = performance.now() - t0
    pickLevel(ms)
    hud.sample(ms)
    return plotMoving || pt.moving || soakRes.busy || soakMoving
  }
  // the frame is guarded: an exception is reported (?debug=1) instead of freezing the sheet
  frame.run((stepP, dt) => {
    try { return frameBody(stepP, dt) } catch (err) {
      note('error', `frame: ${err.message}`)
      return false
    }
  })

  // the pointer: attention for Weight (the pen is a machine — no plucking here)
  const sig = { signal: off.signal, passive: true }
  addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return // a finger never gives attention (the scroll does)
    partition.setPointer({ x: e.clientX, y: e.clientY })
    frame.request()
  }, sig)
  addEventListener('pointerleave', () => { partition.setPointer(null); frame.request() }, sig)
  document.addEventListener('pointerout', (e) => { if (!e.relatedTarget) { partition.setPointer(null); frame.request() } }, sig)

  // the harnesses' handles (like the runtime's window.__lab)
  window.__finale = { plotter, partition, frame, touchSheet: () => touchSheet(frame.S), STAGES, ATT_STAGES }
  window.__finaleStarted = true // the ?debug=1 panel reads it, whenever it arrives
  if (window.__dbg) { window.__dbg.started = true; window.__dbg.render() }

  return {
    /** the settled state (menu / #contact arrival lands here; wired in F2) */
    arrive() {
      const f = touchSheet(frame.S) ? STAGES / (STAGES + ATT_STAGES) : 1
      scrollTo({ top: o.track.offsetTop + f * (o.track.offsetHeight - innerHeight), behavior: 'instant' })
    },
    destroy() {
      dead = true
      off.abort()
      frame.destroy()
      overlay.destroy()
      soak?.destroy()
      hud.destroy?.()
      if (window.__finale?.plotter === plotter) delete window.__finale
    },
  }
}
