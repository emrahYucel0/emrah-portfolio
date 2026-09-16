// M2 ADAPTER — the C2 runtime's content shape, assembled from the shared content authority.
//
// There is no copy in this file. Facts, language and media descriptors all come from ../../shared/content;
// this module only (a) supplies the browser-side inputs that pure content cannot know (asset base, the ?n=
// harness), and (b) keeps the legacy export shape and object identities the runtime already depends on.
//
// Object identity matters: the runtime attaches loaded images and tone caches to the media objects, and
// builds textures from the work objects. A locale change therefore MUTATES these objects in place — it
// never replaces them — so no image reloads and no texture is thrown away for a language switch.
import MANIFEST from '../../public/opt/img/manifest.json'
import { c2Content, isLocale } from '../../shared/content'

// M1 TRANSPLANT: the host sets the public asset base before this module loads (Nuxt serves /public at
// app.baseURL, while Vite's BASE_URL points at the build-asset directory). Standalone, nothing changes.
const BASE = globalThis.__c2Base ?? import.meta.env.BASE_URL
// M2: the host tells the runtime which language it is in; it is never guessed from the URL.
const initialLocale = isLocale(globalThis.__c2Locale) ? globalThis.__c2Locale : 'en'
// ?n=1 … ?n=12 is a scalability harness only: it repeats the three projects
const count = Number(new URLSearchParams(location.search).get('n')) || undefined

const first = c2Content(initialLocale, { manifest: MANIFEST, base: BASE, count })

export let locale = first.locale
export const identity = { ...first.identity }
export const contact = { ...first.contact }
export const about = { home: { ...first.about.home }, detail: { ...first.about.detail } }
export const capabilities = { ...first.capabilities }
export const workIntro = { ...first.workIntro }
export const works = first.works
export const lab = { ...first.lab }
export const ui = { ...first.ui }

// the preview a work is registered with: wide on a wide screen, the real mobile capture on a phone
// M3: a tablet held upright registers the real tablet capture, not a phone capture cropped to its width
export const previewOf = (w, portrait, tablet = false) => (portrait ? (tablet && w.media.tablet) || w.media.mobile || w.media.tablet || w.media.hero : w.media.hero)

/**
 * Change language without disturbing anything the surface is made of.
 * Returns true when something actually changed, so the host can decide whether to refresh the DOM.
 */
export function applyLocale(next) {
  if (!isLocale(next) || next === locale) return false
  const c = c2Content(next, { manifest: MANIFEST, base: BASE, count })
  locale = c.locale
  Object.assign(identity, c.identity)
  Object.assign(contact, c.contact)
  Object.assign(about.home, c.about.home)
  Object.assign(about.detail, c.about.detail)
  Object.assign(capabilities, c.capabilities)
  Object.assign(workIntro, c.workIntro)
  Object.assign(ui, c.ui)
  lab.title = c.lab.title
  lab.line = c.lab.line
  // keep every entry object: the Lab holds poster and video elements against them
  c.lab.entries.forEach((e, i) => { if (lab.entries[i]) lab.entries[i].desc = e.desc })
  c.works.forEach((nw, i) => {
    const w = works[i]
    if (!w) return
    w.strength = nw.strength; w.line = nw.line; w.role = nw.role
    w.facts = nw.facts; w.captions = nw.captions; w.psi = nw.psi; w.stack = nw.stack; w.stackLang = nw.stackLang
    // images are shared by both languages; only their description changes
    for (const [key, media] of Object.entries(nw.media)) if (w.media[key]) w.media[key].alt = media.alt
  })
  return true
}
