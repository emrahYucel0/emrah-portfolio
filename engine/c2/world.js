// Project worlds. One material, one set of laws — and a different rhythm per project, chosen by what that
// project proves. Every frame is a material state (absent, band, seam, the whole surface with rooms, the
// surface carrying an interface as tone) plus the real media it exposes, in the media's own proportions.
//
//   authored (İstanbul Şehir İçi)  the work first, whole → a seam holding two halves of its visual system apart →
//                                  the surface keeps two rooms, tablet and phone, at their own sizes → what it adds up to
//   scale    (Ege Eşya)            one published page held in a room → the room becomes three published pages →
//                                  the surface carries the page as material, and slits expose its sections in place →
//                                  what it adds up to. The surface never leaves: it is a publishing architecture.
//   system   (Evden Eve Nakliyat)  the product under a band at the top → the densest surface in the site →
//                                  it yields one large room: the real admin → the devices over a band that carries the
//                                  production evidence → what it adds up to.
import { fitRect } from './states.js'

export const GEOM = (P) => ({
  below: { cy: 2.8, sigma: 0.22, Lm: 2.2, s: 1 },           // absent: the material has gone off the bottom
  above: { cy: -1.8, sigma: 0.22, Lm: 2.2, s: 1 },          // absent: it has gone off the top
  bandBottom: P ? { cy: 0.92, sigma: 0.25, Lm: 2.1, s: 1 } : { cy: 0.96, sigma: 0.21, Lm: 2.1, s: 1 },
  bandTop: P ? { cy: 0.08, sigma: 0.25, Lm: 2.1, s: 1 } : { cy: 0.08, sigma: 0.21, Lm: 2.1, s: 1 },
  seam: { cy: 0.5, sigma: 0.022, Lm: 0.62, s: 1 },
  full: { cy: 0.5, sigma: 1.6, Lm: 1.6, s: 0 },
})
export const ABSENT = new Set(['below', 'above'])

// PageSpeed Insights as quiet evidence: verified values only, set in type, never a gauge
export function psiHTML(w) {
  const { mobile, desktop, short, labels } = w.psi
  const row = (name, vals) => {
    const v = vals.map((n, j) => (n == null ? '' : `<span><b>${n}</b> <abbr title="${labels[j]}">${short[j]}</abbr></span>`)).join('')
    return v ? `<div class="psi-row"><dt>${name}</dt><dd>${v}</dd></div>` : ''
  }
  return `<dl class="psi"><div class="psi-head" lang="en">${w.psi.head}</div>${row(w.psi.mobileLabel, mobile)}${row(w.psi.desktopLabel, desktop)}</dl>`
}
const li = (list) => `<ul class="wb-list">${list.map((f) => `<li>${f}</li>`).join('')}</ul>`

export function framesFor(V, w) {
  const { W, H, P, pad, strip } = V
  const G = GEOM(P), m = w.media
  const core = (g) => ({ top: (G[g].cy - G[g].sigma * 0.9) * H, bot: (G[g].cy + G[g].sigma * 0.9) * H })
  const between = { x: 0, y: strip, w: W, h: H - strip * 2 }
  const R = (x, y, ww, hh) => ({ x: Math.round(x), y: Math.round(y), w: Math.round(ww), h: Math.round(hh) })
  const title = `<h2 class="wb-name">${w.name}</h2><p class="wb-line">${w.line}</p>`
  const stripTitle = { rect: R(pad, H - strip, W - pad * 2, strip), cls: 'wb-strip', html: `<span class="wb-sname">${w.name}</span><span class="wb-str">${w.strength}</span>` }
  const close = { full: true, g: 'full' }
  const F = []
  // a room reaches past its media (see states.room): text is laid out against the room, not the image
  const outer = (r) => ({ l: r.x - r.w * 0.125 - 6, r: r.x + r.w * 1.125 + 6, b: r.y + r.h * 1.05 + 8 })
  const GAP = P ? 26 : 52

  if (w.rhythm === 'authored') {
    // 1 · the work itself, whole: the surface is not there at all
    F.push({ g: 'below', media: [{ item: P ? (V.T && m.tablet) || m.mobile : m.hero, rect: between, pos: 'center top' }], blocks: [stripTitle] })
    // 2 · one seam holds the illustrated and the type-led halves of the same visual system apart
    if (m.landing) {
      const c = core('seam')
      F.push({
        g: 'seam',
        media: [
          { item: m.hero, rect: R(0, strip, W, c.top - strip + 6), pos: P ? '40% top' : 'center top' },
          { item: m.landing, rect: R(0, c.bot - 6, W, H - strip - c.bot + 6), pos: 'left top' },
        ],
        blocks: [{ rect: R(pad, H / 2 - 6, W - pad * 2, 12), cls: 'wb-cap', html: `<span>${w.captions.illustration}</span><span>${w.captions.landing}</span>` }],
      })
    }
    // 3 · the surface returns and keeps two rooms: tablet and phone, each at its own size
    let tab, mob, txt
    if (!P) {
      // M3 RESPONSIVE GEOMETRY — on a narrower landscape (a tablet on its side) both rooms scale down together until the
      // facts keep a readable column (300px); on a laptop or desktop the column is already wider and nothing changes
      const k0 = (W - pad - 300 - W * 0.14 - 6 - GAP) / (H * 0.74 * m.tablet.aspect + H * 0.6 * m.mobile.aspect * 1.125)
      const k = Math.min(1, k0)
      const th = H * 0.74 * k, tw = th * m.tablet.aspect
      tab = R(W * 0.08, strip + (H - strip * 2 - th) / 2, tw, th)
      const mh = H * 0.6 * k, mw = mh * m.mobile.aspect
      mob = R(tab.x + tab.w + W * 0.06, tab.y + tab.h - mh, mw, mh)
      const tx = outer(mob).r + GAP
      txt = R(tx, tab.y + 8, W - pad - tx, Math.max(th * 0.86, H * 0.74 * 0.86 * Math.min(1, k + 0.15)))
    } else {
      // M3 RESPONSIVE GEOMETRY — on a short phone the two rooms give height back to the facts beneath them
      const gap = 12, hh = Math.min((W - pad * 2 - gap - 30) / (m.tablet.aspect + m.mobile.aspect), H < 640 ? H * 0.24 : H < 760 ? H * 0.3 : Infinity)
      tab = R(pad + 14, strip + 24, hh * m.tablet.aspect, hh)
      mob = R(tab.x + tab.w + gap, strip + 24, hh * m.mobile.aspect, hh)
      const ty = outer(tab).b + GAP
      txt = R(pad, ty, W - pad * 2, H - strip - 16 - ty)
    }
    // accessibility (contrast): on a phone the rooms' lower rim is taller than outer() estimates, so the text alone
    // starts below it; the void — and so the material — is exactly as before
    const txtBlock = P ? R(txt.x, txt.y + 36, txt.w, txt.h - 36) : txt
    F.push({
      g: 'full', rooms: [tab, mob], voids: [txt],
      media: [{ item: m.tablet, rect: tab }, { item: m.mobile, rect: mob }],
      blocks: [{ rect: txtBlock, cls: 'wb-facts', html: `<p class="wb-kicker">${w.strength}</p>${li(w.facts)}<p class="wb-stack" lang="${w.stackLang}">${w.stack}</p>${psiHTML(w)}` }],
    })
    F.push(close)
  } else if (w.rhythm === 'scale') {
    // 1 · SURFACE — one published page, held in a room the material makes for it
    const page = P ? (V.T && m.tablet) || m.mobile : m.landing
    let pageR, t0
    if (!P) {
      pageR = fitRect(page.aspect, R(W * 0.34, strip + 40, W * 0.6, H - strip * 2 - 80), 'center')
      const tx = pad
      t0 = R(tx, H - strip - 150, Math.max(260, outer(pageR).l - GAP - tx), 130)
    } else {
      const ph = H - strip * 2 - 230, pw = ph * page.aspect
      pageR = R((W - pw) / 2, strip + 26, pw, ph)
      const ty = outer(pageR).b + 14
      t0 = R(pad, ty, W - pad * 2, H - strip - 12 - ty)
    }
    F.push({ g: 'full', rooms: [pageR], voids: [t0], media: [{ item: page, rect: pageR }], blocks: [{ rect: t0, cls: 'wb-facts wb-bottom', html: title }] })

    // 2 · SCALE — the room becomes several published pages at once
    let pages, t1
    if (!P) {
      const items = [m.landing, m.tablet, m.mobile]
      const gap = W * 0.05, total = items.reduce((s, it) => s + it.aspect, 0)
      const hh = Math.min(H * (V.S ? 0.34 : 0.5), (W - pad * 2 - gap * 2 - total * 0.3 * (H * 0.5)) / total)
      let x = pad + hh * items[0].aspect * 0.125 + 10
      pages = items.map((it) => { const r = R(x, strip + 56, hh * it.aspect, hh); x += r.w + gap + hh * it.aspect * 0.08; return { it, r } })
      if (V.S) { const tx = outer(pages[2].r).r + GAP * 0.5; t1 = R(tx, strip + 30, W - pad - tx, H - strip * 2 - 60) }
      else { const ty = outer(pages[0].r).b + GAP; t1 = R(pad, ty, W * 0.5, H - strip - 16 - ty) }
    } else {
      const lr = R(pad + 20, strip + 22, W - pad * 2 - 40, (W - pad * 2 - 40) / m.landing.aspect)
      const tw = W * 0.42, tr = R(pad + 14, outer(lr).b + 18, tw, tw / m.tablet.aspect)
      pages = [{ it: m.landing, r: lr }, { it: m.tablet, r: tr }]
      // the block starts below the landing room's lower rim, beside the tablet
      const tx = outer(tr).r + 14
      t1 = R(tx, tr.y + 40, W - pad - tx, tr.h - 40)
    }
    F.push({
      g: 'full', rooms: pages.map((p) => p.r), voids: [t1], media: pages.map((p) => ({ item: p.it, rect: p.r })),
      blocks: [{ rect: t1, cls: 'wb-facts', html: `<p class="wb-kicker">${w.strength}</p><p class="wb-big">${w.facts[0]}</p>${li([w.facts[2]])}` }],
    })

    // 3 · STRUCTURE — the surface carries the page as material; slits expose its sections exactly where they are
    const pageS = P ? (V.T && m.tablet) || m.mobile : m.landing
    const S = R(0, strip, W, H - strip * 2)
    const cuts = P ? [[0.08, 22], [0.2, 34], [0.33, 26], [0.45, 20]] : [[0.1, 30], [0.25, 50], [0.42, 36], [0.57, 26]]
    const slits = cuts.map(([f, hh]) => R(-W * 0.1, S.y + S.h * f, W * 1.2, hh))
    const ty2 = S.y + S.h * (P ? (H < 760 ? 0.52 : 0.6) : V.S ? 0.42 : 0.7)
    const t2 = R(pad, ty2, P ? W - pad * 2 : W * 0.52, H - strip - 12 - ty2)
    F.push({
      g: 'full', tone: { item: pageS, rect: S }, rooms: slits, voids: [t2], media: [{ item: pageS, rect: S, pos: 'left top' }],
      blocks: [{ rect: t2, cls: 'wb-facts wb-bottom', html: `<p class="wb-kicker">${w.captions.structure}</p><p class="wb-big">${w.facts[1]}</p>${li([w.facts[3]])}${psiHTML(w)}` }],
    })
    F.push(close)
  } else {
    // 1 · PRODUCT — a band at the top edge carries the name; the public site sits wide beneath it
    const ct = core('bandTop')
    const lead = P ? (V.T && m.tablet) || m.mobile || m.hero : m.hero
    const leadR = P ? (() => { const ww = W * 0.62, hh = ww / lead.aspect; return R((W - ww) / 2, H - hh - 12, ww, hh) })() : R(0, H - W / lead.aspect, W, W / lead.aspect)
    F.push({ g: 'bandTop', media: [{ item: lead, rect: leadR }], blocks: [{ rect: R(pad, strip + 14, W - pad * 2, Math.max(ct.bot - strip - 30, V.S ? 30 : 0)), cls: 'wb-band wb-at-top', html: title }] })

    // 2 · SYSTEM DENSITY — the densest material in the site, and what the system does
    const sysT = P ? R(pad, strip + H * 0.14, W - pad * 2, H * 0.6) : R(W * 0.3, strip + (H - strip * 2) * 0.18, W * 0.44, (H - strip * 2) * 0.64)
    F.push({
      g: 'full', dense: true, voids: [sysT],
      blocks: [{ rect: sysT, cls: 'wb-facts wb-system', html: `<p class="wb-big">${w.strength}</p>${li([w.facts[0], w.facts[1], w.facts[3]])}<p class="wb-stack" lang="${w.stackLang}">${w.stack}</p>` }],
    })

    // 3 · ADMIN — the dense surface yields one large room, and the real management system is in it
    if (m.admin) {
      const ar = P ? fitRect(m.admin.aspect, R(pad + 20, strip + 60, W - pad * 2 - 40, H * 0.4), 'center') : fitRect(m.admin.aspect, R(W * 0.14, strip + 36, W * 0.72, H - strip * 2 - 150), 'center')
      // the caption sits under the room's own left edge, where the rim is calm (at the screen edge the rim flares)
      const ty = outer(ar).b + (P ? 84 : 66), ax = P ? pad : ar.x
      const at = R(ax, ty, W - pad - ax, Math.max(28, H - strip - 10 - ty))
      F.push({
        g: 'full', dense: true, rooms: [ar], voids: [at], media: [{ item: m.admin, rect: ar }],
        blocks: [{ rect: at, cls: 'wb-facts wb-admin', html: `<p class="wb-kicker">${w.captions.admin}</p>` }],
      })
    }

    // 4 · PRODUCTION — the system is released back into the public devices: each held in its own room, pristine;
    // the performance evidence sits in the material that is left
    let mob, tab, pt
    if (!P) {
      const mh = H * 0.6, mw = mh * m.mobile.aspect
      mob = R(W * 0.14, strip + 56, mw, mh)
      const th = mh * 0.72, tw = th * m.tablet.aspect
      tab = R(outer(mob).r + GAP * 0.4, mob.y + mh - th + 24, tw, th)
      const tx = Math.max(outer(tab).r + GAP, W * 0.62)
      pt = R(tx, H - strip - 250, W - pad - tx, 220)
    } else {
      const mh = H * 0.42, mw = mh * m.mobile.aspect
      mob = R(pad + 8, strip + 28, mw, mh)
      let tw = W - pad - 8 - (outer(mob).r + 12), th = tw / m.tablet.aspect
      if (th > mh) { th = mh; tw = th * m.tablet.aspect }
      tab = R(outer(mob).r + 12, mob.y + mh - th, tw, th)
      const ty = outer(mob).b + 14
      pt = R(pad, ty, W - pad * 2, H - strip - 12 - ty)
    }
    F.push({
      g: 'full', rooms: [mob, tab], voids: [pt], media: [{ item: m.mobile, rect: mob }, { item: m.tablet, rect: tab }],
      blocks: [{ rect: pt, cls: 'wb-facts wb-bottom', html: `<p class="wb-kicker">${w.captions.production}</p>${psiHTML(w)}` }],
    })
    F.push(close)
  }
  return F
}
