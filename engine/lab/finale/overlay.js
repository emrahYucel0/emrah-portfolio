// THE ACCESSIBLE LAYER. The drawing is the visual surface (aria-hidden canvases); every piece
// of information exists as real DOM in a sensible order: email and phone as real links,
// GitHub/LinkedIn as real anchors carrying their full URLs, the location as a real button
// (its only action is the drawing's own record — a revision), and a real copy button.
//
// In production the cells are NOT built here: the page prerenders them (app/pages/[locale]/
// contact.vue — the page's meaning, with or without JavaScript). This layer ADOPTS them: it
// wires their events and, each frame, places each cell over the area the drawing gave it.
// Each interactive cell IS its hit area; pointer dwell and keyboard focus feed Weight. A tap or
// click anywhere in a cell ACTS (on the narrow touch sheet the scroll carries attention).
//
// The pen plots the labels and the values, so the DOM text is visually hidden — except the
// fallback: a cell squeezed below the monoline floor shows its fact as one clear mono line.

export function createOverlay(container, statusEl) {
  let els = {}
  let visible = false
  const off = new AbortController() // every listener this layer adds goes with destroy()

  /** wire the prerendered cells ([data-cell]) and the copy button ([data-copy]) */
  function adopt(itemsList, strings, onAttention) {
    els = {}
    const sig = { signal: off.signal }
    for (const item of itemsList) {
      const el = container.querySelector(`[data-cell="${item.id}"]`)
      if (!el) continue
      el.addEventListener('pointerenter', () => onAttention('hover', item.id), sig)
      // KEYBOARD focus pins attention; a mouse click's incidental focus must not
      el.addEventListener('focus', () => { if (el.matches(':focus-visible')) onAttention('focus', item.id) }, sig)
      el.addEventListener('blur', () => onAttention('blur', item.id), sig)
      // a tap or click anywhere in the cell ACTS — the action fires with this very event
      // (browser default, NEVER delayed); the pen records the revision beside it
      el.addEventListener('click', (e) => onAttention('spend', item.id, e.timeStamp), sig)
      el.addEventListener('keydown', (e) => {
        if (e.key === ' ' && el.tagName === 'A') { e.preventDefault(); el.click() }
      }, sig)
      const val = el.querySelector('.val')
      if (val) val.dataset.full = item.valText ?? item.word // the DOM never shows the pen's arrow
      els[item.id] = el
      if (item.kind === 'mail') {
        const copy = container.querySelector('[data-copy]')
        if (!copy) continue
        copy.hidden = false // copying needs script: the prerendered button waits hidden until now
        copy.addEventListener('focus', () => { if (copy.matches(':focus-visible')) onAttention('focus', item.id) }, sig)
        copy.addEventListener('blur', () => onAttention('blur', item.id), sig)
        copy.addEventListener('click', async (e) => {
          e.preventDefault(); e.stopPropagation()
          onAttention('spend', item.id, e.timeStamp) // copying IS an action
          try {
            await navigator.clipboard.writeText(item.text)
            statusEl.textContent = strings.finale.copied
            copy.textContent = strings.finale.copied
            onAttention('copied', item.id)
            setTimeout(() => { copy.textContent = strings.finale.copy }, 2000)
          } catch {
            statusEl.textContent = item.text // the address itself is the fallback feedback
          }
        }, sig)
        els.__copy = copy
      }
    }
  }

  /**
   * `boxes[id]` = the plotted value's box (the touch target); `fallback[id]` = true when the
   * cell fell below the monoline floor and the DOM mono line must carry the fact instead.
   */
  function sync(rects, boxes, fallback) {
    for (const [id, el] of Object.entries(els)) {
      if (id === '__copy') continue
      const r = rects[id]
      if (!r) continue
      el.style.transform = `translate3d(${r.x}px, ${r.y}px, 0)`
      el.style.width = `${r.w}px`
      el.style.height = `${r.h}px`
      const v = el.querySelector('.val')
      const b = boxes[id]
      if (v && b) {
        const h = Math.max(44, b.y1 - b.y0)
        const y = (b.y0 + b.y1) / 2 - h / 2 - r.y
        // the fallback mono line starts where the plotted value would (never against its label)
        v.style.left = `${Math.max(0, b.x0 - r.x + (fallback[id] ? 4 : -6))}px`
        v.style.top = `${Math.max(0, y)}px`
        v.style.width = `${Math.min(r.w, b.x1 - b.x0 + 12)}px`
        v.style.height = `${Math.min(r.h, h)}px`
      }
      el.classList.toggle('is-fallback', !!fallback[id])
      if (v) {
        if (fallback[id] && !v.textContent) v.textContent = v.dataset.full
        else if (!fallback[id] && v.textContent) v.textContent = ''
      }
    }
    const er = rects.email
    if (els.__copy && er) {
      els.__copy.style.transform = `translate3d(${er.x + er.w - 90}px, ${er.y + 4}px, 0)`
    }
  }

  function setVisible(v) {
    if (v === visible) return
    visible = v
    container.classList.toggle('is-live', v)
  }

  function destroy() { off.abort() }

  return { adopt, sync, setVisible, destroy, get els() { return els } }
}
