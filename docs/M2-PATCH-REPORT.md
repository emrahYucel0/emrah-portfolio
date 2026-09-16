# M2 human-review patch

Targeted corrections only. Production build served statically on `127.0.0.1:4300` (your `npm run dev`
on `[::1]:3000` was left running). Nothing committed or pushed.

## A · Files changed
- `engine/c2/main.js` — Work caption shows the strength line only; `HOST.replace`, used by the language control
- `engine/c2/types.ts` — `replace` on the typed boundary
- `shared/content/locales/tr.ts` — hero, Creative / Full-Stack lines, `Admin` marked English
- `shared/content/types.ts`, `shared/content/term.ts`, `shared/content/index.ts` — a term can mark one word inside a sentence; captions are terms
- `app/composables/useC2Engine.ts`, `app/components/LocaleSwitcher.vue` — locale change uses `router.replace` / `<NuxtLink replace>`
- `app/pages/[locale]/index.vue` — shell Work list shows strength only
- `app/pages/[locale]/about.vue` — capabilities render marked terms
- `app/assets/css/base.css` — Turkish-only hero measure (`24ch`)

## B–E · Copy before → after
| | Before | After |
|---|---|---|
| Work (EN) | Original digital direction · Design, creative direction… (role sentence adjacent) | Original digital direction |
| Work (TR) | Özgün dijital yön · Özgün görsel yön, yaratıcı frontend… | Özgün dijital yön |
| TR hero | Nasıl hareket ettiğini tasarlarım, neyin üzerinde çalıştığını kurarım. | Nasıl hareket ettiğini tasarlıyorum, üzerinde çalıştığı sistemi kuruyorum. |
| TR Creative | Dokunduğun yüzeyi kurarım | Dokunduğun yüzeyi kuruyorum |
| TR Full-Stack | ve altındaki sistemi. | ve altındaki sistemi |

The role / positioning sentence still appears inside each project world's closing block, never beside the strength line.

TR hero composition: same type size (38 px at 1440). At the English measure (21ch) it wrapped over three lines and split "üzerinde | çalıştığı"; with a Turkish-only 24ch measure it sets as two clause-true lines, "Nasıl hareket ettiğini tasarlıyorum, / üzerinde çalıştığı sistemi kuruyorum." (same at 1366 × 768 and 1920 × 1080).

## F–G · English unchanged
Rendered: hero "I design how it moves and engineer what it runs on." · Creative "I build the surface you touch" · Full-Stack "and the system underneath it." `en.ts` positioning lines have no diff. Pixels vs M2: hero 0.15, Creative 0.43, Full-Stack 0.18, exact lock 0.01, worlds 0.00. Work 1.39 = the removed role text.

## H · Locale-switch history
Before: a switch pushed a new entry, so Back undid the language. After: a switch replaces the entry — `history.length` 2 → 2 on home, 3 → 3 on About. On `/tr` → `/tr/about` (push) → switch → `/en/about` (replace) → Back lands on `/tr`, the home entry before About was opened (that entry's URL was Turkish).

## I · ADMIN
Rendered "GENELE AÇIK SİTENİN ARKASINDAKİ YÖNETİM SİSTEMİ · ADMIN / CMS" and "CMS / ADMIN SİSTEMLERİ" (`<span lang="en">Admin</span>`). No `ADMİN` remains.

## J · Lab titles
Unchanged decision — translated per locale: 01 Tipografik büyütme çalışması … 05 Satır yayılması çalışması.

## K · Session
One live session: /en → İstanbul, Evden → About wedge → Lab, 2 holds (5 rooms) → switch /tr → hero, Creative, Full-Stack, Work, Evden ADMIN → /tr/about → Back → /tr/about → switch → Back → switch /en. Throughout: the same canvas instance, 1 canvas, 1 `#ui`, 12 window listeners, visit order `0,2`, inks `#8e3a17,#274237`, 5 Lab rooms, About mark kept; scars 3 → 5 only because opening the About wedge commits yield marks. Timings vs M2: lock, registration, release, bridge all within noise.

## L–O
- Typecheck: exit 0 · Generate: exit 0, 12 routes
- Console / hydration: 0 console messages, 0 page errors, 0 failed requests, 0 HTTP ≥ 400
- Old variants: none in source or build; "Dokunduğun yüzeyi kurarım" survives only in `docs/M2-REPORT.md` (historical, left unchanged)
- Git: unstaged M2 + patch changes; nothing committed

**M2 PATCH PASS — READY TO COMMIT**
