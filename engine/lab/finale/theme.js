// THE SHEET'S OWN MEASURES — every value here is copied from the production site, with its source
// named, so the opening frame of this finale is the Lab's resting sheet to the pixel. Nothing in
// this file is invented; change a value only by changing it at its source first.

// app/assets/css/base.css :16–20
export const GROUND = '#efeee9'
export const INK = '#121212'
export const INK_MUTED = '#46464a'
export const RULE = 'rgb(18 18 18 / 0.16)'

// engine/c2/states.js :15–17 — the surface's paper and the line study's ink
export const PAPER = '#e7e6e0'
export const LINE_INK = '#151412' // engine/lab/line-study.js :16

// engine/c2/states.js :91 rowSpacing(V) — one row pitch for the whole site
// (LabBench.vue geom() :76 carries the same values: spacing P ? 5.2 : 7)
export const rowSpacing = (portrait) => (portrait ? 5.2 : 7)
// LabBench.vue geom() :76 — the bench's row thickness: `th: portrait ? 0.72 : 0.85`.
// (The C2 labState (states.js :252) says 0.82 on desktop, but the frame the visitor actually
// leaves the Lab from is the bench, so the bench's value is the one continuity is measured on.)
export const rowThick = (portrait) => (portrait ? 0.72 : 0.85)
// LabBench.vue paintTrim() :320 — the bare sheet outside the field: `fillStyle 'rgba(18,18,18,.5)'`
export const ROW_ALPHA = 0.5

// LabBench.vue resize() :144 — the bench's foot band: `BOT = H < 470 ? 32 : W < 760 ? 40 : 44`
export const footHeight = (W, H) => (H < 470 ? 32 : W < 760 ? 40 : 44)

// app/assets/css/lab.css .lab-route — the strip and the edge the studies compose against
export const stripHeight = (portrait) => (portrait ? 44 : 50) // + safe-area, applied in CSS
// --pad: max(clamp(18px, 2.5vw, 36px), safe-area) — mirrored in styles.css; JS needs the resolved value
export const padOf = (W) => Math.max(18, Math.min(36, W * 0.025))

// engine/lab/line-study.js — the line's weight and physics-facing view constants
export const LINE_BASE_W = (portrait) => (portrait ? 1.05 : 1.15) // lwBase :115
export const HEM_DEPTH = 72 // :17
export const LINE_N = (portrait) => (portrait ? 5200 : 9000) // view().N :107
export const HEM_PITCH = (portrait) => (portrait ? 1.7 : 2.2) // view().pitch :107

// app/components/lab/StudyWeight.vue — the width/weight axes the type is solved on
export const WDTH = [62, 75, 90, 100, 112, 125]
export const WGHT = [100, 300, 500, 700, 900]
export const FAMILY_VAR = "'Archivo Var', system-ui, sans-serif"

// engine/c2/tone-core.js :52 — tone is processed at a resolution independent of the viewport
export { toneSize } from '../../c2/tone-core.js'

export const DPR_CAP = 2 // useStudy.ts :28 — every lab canvas clamps devicePixelRatio to 2

export const isPortrait = (W, H) => W < H * 0.9 // useStudy.ts S.portrait
export const isShort = (H) => H < 470 // useStudy.ts S.short
