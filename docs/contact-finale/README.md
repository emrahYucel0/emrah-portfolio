# The Contact finale

The site's one Contact is `/[locale]/contact`. On it, a plotter draws the Contact section as one line of ink. The
email then soaks into the site's display face (Archivo). After that, attention redistributes the five fields, and
every action is recorded on the drawing as a revision.

The finale was prototyped in the sibling repo `lab-contact`, whose README holds the storyboard and every design
decision. It was integrated on the branch `feature/contact-finale` in phases F0–F4.

## Where things are

| Piece | File |
|---|---|
| The page: prerendered, accessible DOM (the meaning, with or without script), foot band, arrival | `app/pages/[locale]/contact.vue` |
| The engine: framework-free Canvas 2D | `engine/lab/finale/` (`finale.js` entry; `finale.d.ts` types) |
| The crossings in and out: history-state arrivals, gesture-tail hush, bench seam, scroll memory | `app/composables/useContactSeam.ts` |
| The Lab's gesture down → the finale | `app/composables/useLabSpine.ts`, `app/components/lab/LabBench.vue` (the veil) |
| The runtime's Contact stop and Contact control → the route | `engine/c2/main.js` (`openContact`, `HOST.contact`), `app/composables/useC2Engine.ts` |
| The strips' Contact links, `/tr#contact` | `LabChrome.vue`, `SiteHeader.vue`, `app/plugins/c2.client.ts` |
| The `?debug=1` panel: production, loaded only with the flag, robots-disallowed | `public/finale-debug.js` |
| Words (TR/EN) | `shared/content/locales/*.ts` → `finale`, `contact`, `identity` |

## How a visitor arrives

| From | Lands on |
|---|---|
| The Lab bench, a gesture down | p = 0. The bench clears to its bare row field, which is the finale's first frame, pixel for pixel. |
| The runtime's Contact stop, reached by travel | p = 0 |
| A strip's or the header's Contact, or `/tr#contact` | p = 1, settled |
| The finale at p = 0, a gesture up that began at the top | the Lab bench, as it was left |
| Back / Forward | where the finale was left |
| The language control on the finale | the same place, in the other language |

After a crossing, the tail of the gesture is spent on the other side, so one gesture reaches one destination. How the
visitor arrived rides on the history entry (`finaleArrive`, `labArrive`) and is spent on arrival.

## Decisions taken during the integration

- **The Contact stop is a handoff.** The old runtime Contact (the wedge room and its DOM block) was deleted in F4,
  together with its flag. The stop is now plain material: straight rows carrying the visit's threads. Travel that
  settles on it hands over to the finale.
- **Browser floor: iOS 15.4 / Safari 15.4.** This is Nuxt's own requirement (`Array#at`, `Object.hasOwn`); no
  polyfills. `tools/diag/compat-ios15.cjs` checks it.
- **Attention follows the pointer type.**
  - All pointers coarse: attention by scroll.
  - Any fine pointer (mouse, trackpad, an iPad with its trackpad): attention by the cursor.
  - Details: `responsive/README.md`.
- **The finale asks once.**
  - At p = 0 the tear row breathes and the foot band says to scroll.
  - At p = 1, if the visitor stays still for 2 s, attention walks to GitHub and back, shown once per session.
- **The foot band carries the home strip's words.** The roles on the left, city · status on the right, fixed for
  the whole drawing. There is no ink counter.
- **The email's ceiling is 10 % of the sheet's height.** It only binds on screens wider than about 2.2:1.
- **Revisions live only while the page is open.**

## Checks

All of these live in `tools/diag`; `README.md` there describes each one.

- In the gate (`run6.sh`):
  - `contact.cjs`: the route, the DOM, axe, no script.
  - `compat-ios15.cjs`
  - `seam.cjs`: the crossings, arrivals and history; `record` rewrites `f2/`.
  - `finale-a11y.cjs`: assistive technology at every p, keyboard, language, reduced motion, phones.
  - `beckon.cjs`: the way in, the guide, the foot band.
  - `spine.cjs` and `journey.cjs` cover the Lab ⇄ Contact route.
  - `nonlab.cjs` records the Contact stop as moved by design.
- On demand:
  - `responsive.cjs`: 15 sizes × Chromium and WebKit.
  - `perf-large.cjs`: DPR 2 at the large sizes.
- Real phone: `DEVICE-TEST.md`. The LAN server is `sh tools/diag/serve.sh`, port 4501.

## Records

- `f1/`: the prototype and the integration side by side; perf A/B.
- `f2/`: the Lab ⇄ finale crossing on video (desktop and phone), and the seam's stills.
- `f3/`, `f3b/`: phones, keyboard, reduced motion; the arrival, the guide, the foot band.
- `responsive/`: the contact sheet, per-size stills, `perf.json`.
