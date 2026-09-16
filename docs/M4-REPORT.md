# M4 — Accessibility & input hardening

A practical WCAG 2.2 AA pass on the live C2 experience, in Turkish and English. It is not a formal conformance claim.

**Build and test setup:**
- Production build (`nuxt generate`) served statically: M4 on `127.0.0.1:4411`; the M3 baseline (commit `d7d1944`) on `127.0.0.1:4410`.
- Automated tools: Chrome 152 headless with axe-core 4, Lighthouse 12.8.2 and the Chrome accessibility tree (CDP).

**No trustworthy human screen-reader evidence exists.** NVDA was later installed, but a reliable human test could not be completed; VoiceOver was not tested reliably either. Everything below is automated, scripted or emulated evidence (§ T). **This report does not claim formal WCAG 2.2 AA conformance.**

**Pre-screen-reader patch applied** (§ Y): Creative Developer and Full-Stack Developer are now reachable from the plain navigation by any activation (double-tap, click, Enter), and the open-project control keeps its visible label at the start of its accessible name, with the project appended and a keyboard / screen-reader hint as its description (§ Z). Every section below reflects the patched build unless marked "before".

Nothing committed or pushed. `c2-surface-lab/` untouched (only its installed `axe-core`, `puppeteer-core` and `sharp` were loaded read-only).

---

## A · Executive summary

**Before M4.** A screen reader heard the identity, the strip navigation and a plain link list, and nothing else:
- Every C2 place except the current one is `inert`, so the Work, Lab and Contact content did not exist for assistive technology until reached. When reached, nothing said so.
- **Project world:** facts, stack and PageSpeed evidence were exposed one frame at a time and never announced.
- **Focus loss:** opening a project, collapsing the long About and switching language all dropped focus to `<body>`.
- **Keyboard trap:** returning from a project left focus on a button that swallowed the arrow and page keys, so the keyboard journey stopped there.
- **Lab live caption:** re-announced its text every time a room moved a pixel.
- **axe:** one violation (skip link outside a landmark).

**After M4.** The keyboard journey is complete and continuous, the reading model is "one place at a time, always told where you are", and the project world is readable as one ordered summary:
- **Focus:** a place reached from the keyboard, or from any navigation control (a strip button, the plain navigation, the project navigation, by keyboard, click or a screen reader's double-tap), takes focus to its own heading.
- **Announcements:** a place reached by scrolling or swiping is named once in a polite status line.
- **Every place is reachable without gestures or arrow keys:** Work, About, Lab and Contact from the strip; Creative Developer and Full-Stack Developer from the plain navigation (§ Y).
- **Focus restoration:** returning from a project, the long About or a language change restores focus to the control that led there.
- **Noise removed:** pointer-only hints and duplicated labels are gone from the tree.
- **Automated results:**
  - axe: 0 violations in 8 states × 2 languages × 5 viewports, plus reduced motion;
  - Lighthouse Accessibility: 100 on `/en`, `/tr`, `/en/about`, `/tr/about`;
  - no focus stop invisible, off-screen, obscured or without a ring (416 stops before the patch, 168 re-checked after it).

No visual, physics, timing or copy change beyond one sub-pixel strip difference at 320 px (§ S); M3 touch behaviour is intact.

**Final status: M4 IMPLEMENTATION COMPLETE — HUMAN SCREEN-READER VALIDATION DEFERRED** (§ X).

---

## B · Files changed

| File | Change | Why |
|---|---|---|
| `engine/c2/main.js` | Focus management (`wantFocus` / `focusStep`, `arrived`, `focusKey`); one polite status line; keyboard-modality flag; heading `tabindex="-1"`; project summary (`.wsum`); staged world blocks `aria-hidden` and out of the tab order; `aria-current` on the registered work; bottom strip and duplicate labels `aria-hidden`; skip link inside the banner; lead line + keyboard instructions after the h1; new-tab note on external links; Lab live caption only on a study change; arrow / page keys work from a focused control | 1.3.1, 2.1.1, 2.4.3, 4.1.2, 4.1.3 |
| `engine/c2/world.js` | `psiHTML`: the "PageSpeed Insights" heading moved out of the `<dl>` (was an invalid child) | 1.3.1 (axe `definition-list`, serious) |
| `engine/c2/style.css` | `.psi-rows` keeps the same column; no ring on focused *headings*; strip nav buttons get 4 px of invisible hit area | 2.5.8 target size |
| `shared/content/types.ts`, `locales/en.ts`, `locales/tr.ts` | `a11y.keys`, `workKeys`, `worldKeys`, `labKeys`, `newTab`, `openProject` ("Open project" / "Projeyi aç"), `openHint` ("Activate with keyboard or screen reader." / "Klavye veya ekran okuyucuyla etkinleştirin."), in the existing content authority; no second translation system | 2.1.1 discoverability, 3.2.5-style new-window notice, 4.1.2 name |
| `engine/c2/main.js` (patch) | plain navigation: two `<button data-go>` for Creative / Full-Stack (names from the content, `lang="en"`); `navigate()` knows both faces; activating any navigation control asks for focus on arrival; face sections and the About room are no longer named regions (their headings name them); face headings `lang="en"`; the open control's name is "<visible label> — Open project: <project>" with `aria-describedby` → the hint; **activating the index entry of the project already in register opens it** | 2.1.1, 2.4.3, 3.1.2, 4.1.2 |
| `engine/c2/style.css` (patch) | the two plain-navigation buttons are laid out like its links (visible only while the plain navigation has focus) | — |

No Nuxt app files and no dependencies changed. `surface.js`, `physics.js`, `media.js`, `states.js` are untouched.

---

## C · Baseline (M3 build, before any change)

`m4-accessibility/baseline/audit-en-1440x900.json`

| # | Issue | WCAG | Severity |
|---|---|---|---|
| 1 | Only the active C2 place is in the accessibility tree; home exposes 1 heading (h1). Work / Lab / Contact / project facts appear only once visually reached | 1.3.1, 1.3.2 | High |
| 2 | Place changes (arrow keys, wheel, nav) announce nothing and do not move focus; the reader cannot tell the page changed | 4.1.3, 2.4.3 | High |
| 3 | Project world: content split across frames, each `inert` until shown; no project heading until the last frame; the "images" paragraph is the only text on entry | 1.3.1 | High |
| 4 | Opening a project from the keyboard: the Open button becomes inert, focus → `<body>` | 2.4.3 | High |
| 5 | After a project, focus sits on a button that ignores ArrowDown / PageDown (handler returned early for any focused button): **the keyboard journey stops** | 2.1.1 | High |
| 6 | Language switch: DOM rebuilt, focus → `<body>` | 2.4.3 | Medium |
| 7 | Long About closed with Escape / Back: focus left inside an inert layer | 2.4.3 | Medium |
| 8 | Lab caption `aria-live="polite"` rewritten whenever a room moves (position was part of its update key): repeated announcements | 4.1.3 | Medium |
| 9 | `<dl class="psi">` contains a `<div>` heading | 1.3.1 | Serious (axe, project world) |
| 10 | Skip link outside any landmark | best practice | Moderate (axe `region`) |
| 11 | Bottom strip read as content: roles duplicate the h1; pointer hints ("SCROLL · HOLD THE IMAGE") mean nothing to a keyboard or screen-reader user | 1.3.1 noise | Low |
| 12 | Face layers read a stray "Developer" (the visual role word); Work reads the project title and strength twice (index + caption) | noise | Low |
| 13 | External links (`target="_blank"`) give no new-tab notice | advisory (3.2.5 AAA pattern) | Low |
| 14 | "Lab" strip button 19.2 × 30 px at 320 px wide with 11 px spacing | 2.5.8 | Low |
| 15 | No keyboard instructions anywhere (hints are pointer-only) | 3.3.2 / discoverability | Medium |

---

## D · Semantic / landmark audit

| | Before | After |
|---|---|---|
| banner | ✓ (skip link outside) | ✓ (skip link inside) |
| navigation "Portfolio" / "Portfolyo" | ✓ | ✓ |
| main | ✓ | ✓ |
| contentinfo | bottom strip (duplicates, pointer hints) | removed from the tree (visual strip only) |
| navigation "Plain navigation" / "Düz gezinme" | ✓ | ✓ |
| navigation "Project" / "Proje" | in a world | in a world |
| region per place | the active place (named) | only the long About ("About Emrah Yücel"); faces and the About room are named by their headings, so a screen reader does not read the name twice |

The landmark list is 4 entries at home and at every place, and 5 inside a project. No landmark per visual block.

The canvas (`#surface`) and the media layer (`#media`) are `aria-hidden` and absent from the tree (0 image / canvas nodes in every state): screenshots and Lab videos are visual. Their meaning is in the DOM: the project summary, the image descriptions, and the study list.

---

## E · Heading hierarchy

Accessibility tree, TR and EN identical in structure:

| State | Headings |
|---|---|
| Home | h1 "Emrah Yücel — Creative Developer and Full-Stack Developer, Istanbul, Türkiye" |
| Creative / Full-Stack | h1, h2 "Creative Developer" / "Full-Stack Developer" |
| Work | h1, h2 "Work" / "İşler" |
| Project | h1, h2 project name |
| Lab | h1, h2 "Lab" |
| Contact | h1, h2 "Contact" / "İletişim" |
| About (home room) | h1, h2 "About" / "Hakkımda" |
| `/en/about`, `/tr/about` (C2) | h1, h2 "About" / "Hakkımda" (the long About is a state of the same page; the h1 stays the person) |

Generated HTML before JavaScript (the Nuxt shell):
- `/en`, `/tr`: h1 name; h2 Work, Lab, Contact; h3 each project.
- `/en/about`, `/tr/about`: h1 About; h2 Capabilities, Contact.

No empty or skipped levels.

---

## F · Keyboard path (both languages; 1440 × 900, 1366 × 768, 820 × 1180, 390 × 844, 320 × 568; with and without reduced motion)

| Key | Result | Focus lands on |
|---|---|---|
| ArrowDown | Creative | h2 "Creative Developer" |
| ArrowDown | Full-Stack | h2 "Full-Stack Developer" |
| ArrowDown | Work (first work registers) | h2 "Work" / "İşler" |
| ArrowRight / ArrowLeft | next / previous work registers | stays on h2 |
| Enter | the registered work opens | h2 project name (summary) |
| ArrowDown | next frame of the project | stays |
| Escape | back to Work | that project's index button (`aria-current`) |
| PageDown | Work → Lab through the bridge | h2 "Lab" |
| Enter | a room opens; its study is announced | stays |
| ArrowDown | Contact | h2 "Contact" / "İletişim" |
| Tab to strip "About", Enter | About room opens | h2 "About" |
| Tab, Enter on "More about me" | long About (`/tr/about`) | h2 "Hakkımda" inside the scroller (arrows scroll it) |
| Escape (or "← Back") | long About closes, URL `/tr` | "More about me" link |
| Enter on "TR" / "EN" | language changes, same place | the language control |

**Space / Enter** activate a focused control; the arrow and page keys keep moving through the portfolio from any focused control. Escape only acts where it closes something (long About, About room, project). **Traps:** none: from every state Tab and Shift+Tab continue through the strip, the place's controls and the plain navigation (52 focus stops per audit run).

---

## G · Focus order and visibility

Every audit run walks Tab through home, Work, the project world, the About room and the long About, and records for each stop: CSS visibility, in viewport, covered by another element at its centre, and a ≥ 1 px outline.

| Run | Focus stops | Invisible | Off-screen | Obscured | No ring |
|---|---|---|---|---|---|
| EN 1440 × 900 | 52 | 0 | 0 | 0 | 0 |
| TR 1440 × 900 | 52 | 0 | 0 | 0 | 0 |
| EN 1366 × 768 | 52 | 0 | 0 | 0 | 0 |
| TR 820 × 1180 | 52 | 0 | 0 | 0 | 0 |
| EN 390 × 844 | 52 | 0 | 0 | 0 | 0 |
| TR 320 × 568 | 52 | 0 | 0 | 0 | 0 |
| EN 390 × 844 reduced motion | 52 | 0 | 0 | 0 | 0 |
| TR 1440 × 900 reduced motion | 52 | 0 | 0 | 0 | 0 |

**Ring.** 2 px `currentColor` outline, offset 4 px: ink on paper, paper on the project inks and on night (`rgb(231,230,224)` measured on a project world, `m4-accessibility/screens/focus-on-project-world.webp`).

**Programmatic heading focus.** Headings focused on arrival have no ring by design: they are reading positions, not controls.

**Order.** Skip link → identity → strip nav → language → the active place's controls → plain navigation.

**Inactive places.** Their controls are inert, so they are never focused; the staged project blocks are out of the tab order (`tabindex=-1`).

---

## H · Work — keyboard equivalence

No gesture is required. Arrow keys register works (the same registration the pointer performs).

**Index buttons.** Each name is the project and its strength line; the registered one carries `aria-current="true"`. Enter on an index button selects it.

**Opening.** Enter anywhere on the place (focus on the heading) opens the registered work. The button showing "Hold the image to open it" also opens it with Enter / Space / double-tap. Its visible text is unchanged (locked copy). Its accessible name **begins with that visible label** and appends the registered project: **"Hold the image to open it — Open project: İstanbul Şehir İçi"** / **"Açmak için görseli basılı tut — Projeyi aç: İstanbul Şehir İçi"** (WCAG 2.5.3: a speech-input user can say the visible words). Its accessible description says that no hold is needed: **"Activate with keyboard or screen reader."** / **"Klavye veya ekran okuyucuyla etkinleştirin."** The keyboard instruction ("Left and right arrow keys choose a project; Enter opens it.") is read after the Work intro.

**Opening from the index (patch).** Activating the index button of the project that is already in register (`aria-current`) opens it. On a phone the open button is not shown (≤ 700 px) and a screen reader cannot reach the image, so without this a VoiceOver user on a phone could select a project but never open it. Pointer effect: clicking or tapping the name of the project that is already registered now opens it; selecting another project is unchanged.

**Duplicates removed.** The large title / strength caption beside the index is `aria-hidden` (it repeats the active index entry).

---

## I · Project world — equivalence

On entry, focus (keyboard) or the status line (pointer / touch) lands on a visually hidden summary built from the same content fields as the frames, in this order:
1. name (h2)
2. positioning line
3. role
4. strength
5. facts list
6. stack (`lang` from the content)
7. PageSpeed Insights as a description list (Mobile / Desktop with named abbreviations)
8. image descriptions
9. "Arrow keys move through the project; Escape returns to all work."

Then the project navigation: "← All work", **"Visit İstanbul Şehir İçi istanbulsehirici.com ↗ (opens in a new tab)"** (visible label contained in the name), "Next".

The staged frames stay exactly as they are visually and are hidden from the tree, so nothing is read twice.

Language switch inside a project (tested): same project, same mode, summary re-rendered in the new language, one summary, one canvas.

---

## J · Lab — keyboard equivalence

- **Understanding what the Lab is:** h2 "Lab", the line "Hold to make room…", then the keyboard instruction "Press Enter to make a room; each room shows the next study."
- **Discovering all five studies:** the study list (01–05 with titles) is read in the Lab region and is also in the plain navigation.
- **Moving among studies:** Enter ×5 opened five rooms showing studies 0, 1, 2, 3, 4. The live caption announced each exactly once: "01 / 05 — Tipografik büyütme çalışması" … "05 / 05 — Satır yayılması çalışması". Before M4 it repeated while rooms relaxed.
- **Media:** the five Lab videos are silent screen studies (0 audio streams each), muted, `playsinline`, no controls exposed. **No captions are required;** the study title is the text equivalent. No video is focusable, so there is no trap.
- **Leaving the Lab:** ArrowDown / ArrowUp / PageUp, the strip nav, or Tab onward.

Pointer Lab physics unchanged.

---

## K · Reduced motion

`prefers-reduced-motion: reduce` (the runtime already runs animations 6× faster and skips the opening and bridge animations):
- **Full keyboard journey** (F) completes in TR 1440 × 900 and EN 390 × 844: every place reached, focus on each heading, project open / exit, Lab rooms, Contact, About, language. axe 0, errors 0.
- **M3 (still valid):** all six places reachable at 390, 820, 844 × 390, 1366, 2560; no state waits on an animation that never ends.

---

## L · Contrast

axe cannot see through the canvas (its colour-contrast results are "incomplete"), so contrast was measured on rendered pixels with the lab's contrast method: hide the DOM, screenshot the ground under each text box, compare the text colour at its effective opacity with the mean ground.

| Run | States | Text boxes | Below threshold |
|---|---|---|---|
| TR 1440 × 900 (M4) | 21 (every place, all 13 project frames, Lab, Contact) | 294 | 1* |
| TR 1440 × 900 (M3 baseline) | 21 | 287 | 1* (same item) |
| EN 390 × 844 (M4) | 21 | 253 | 0 |
| EN 390 × 844 (M3 baseline) | 21 | 248 | 0 |

The M4 runs measure a few more boxes than M3: the new-tab notes and the project summary are visually hidden and excluded, but the Contact and project-navigation links now contain extra spans.

\* **Full-Stack stack line** ("Nuxt · Vue · TypeScript…", 13 px, 0.78 opacity) was reported at 1.1:1. Re-measured in isolation, 3 s and 6 s after arrival, it is paper `rgb(231,230,224)` × 0.78 on ground `rgb(11,12,14)`, which is **≈ 9.6:1**. The 1.1 was a capture during the face transition, not a rendering state.

**Lowest passing ratios** (all normal-size text, threshold 4.5:1), all on the İstanbul project ink:
- desktop: 4.88:1 for "Özgün dijital yön" (10.5 px mono kicker) and 4.92:1 for the host name in the project nav;
- phone: 4.96:1 and 5.02:1 for the "Mobile" / "Desktop" PageSpeed labels.

These pass with little margin; they are unchanged from M3.

**Large-text thresholds:** 3:1 applied only to ≥ 24 px (or ≥ 18.66 px bold). The display words (EMRAH / YÜCEL / CREATIVE / FULL-STACK) are canvas material, not text; their meaning is in the DOM.

**Non-text contrast:** the focus ring is 2 px `currentColor`, with the same ratio as the text it surrounds. Material lines are decoration, not UI boundaries.

**Forced colours** (emulated `forced-colors: active`): text readable, links and buttons keep system colours, focus outline in the system highlight (`rgb(26,235,255)`) (`screens/forced-colors-work-focus.webp`).

---

## M · Alt / media audit

| Media | Treatment |
|---|---|
| WebGL canvas | `aria-hidden`; its meaning is the DOM |
| Project screenshots (`#media` `<img>`) | inside `aria-hidden` `#media`; described once per project in the summary ("Images in this project: …", concise, no "image of", no repeated title) |
| Lab posters / videos | `alt=""` posters inside `aria-hidden`; silent; study titles are the equivalent |
| Static shell | no images |
| Visual role word "Developer", strip roles, pointer hints | `aria-hidden` (duplicates / pointer-only) |

---

## N · Accessibility-tree findings (after)

Home (TR), in order:
1. skip link
2. banner: identity link; nav buttons İşler / Hakkımda / Lab / İletişim; "EN — English"
3. main:
   - h1;
   - "Nasıl hareket ettiğini tasarlıyorum, üzerinde çalıştığı sistemi kuruyorum."
   - the keyboard instruction;
   - status
4. plain navigation: **"Creative Developer", "Full-Stack Developer" (buttons)**, 3 work links with new-tab note, 5 studies, email, phone, GitHub, LinkedIn, "Hakkımda daha fazla"

The hero positioning line is hidden while the About room (which says it) is open. **About ~20 lines to hear the whole home**, not a wall of copy.

- **Duplicates removed:** bottom-strip roles and hints; "Developer"; Work caption; world frame blocks (name / strength / facts repeated per frame).
- **Remaining intentional repetition:** the plain navigation lists works / studies / contact on every page. It is the always-available route, labelled as navigation.
- **Language of parts:** "Creative Developer", "Full-Stack Developer", "Admin", host names, the stack line and GitHub / LinkedIn labels are `lang="en"` inside Turkish. The new-tab note sits outside the English label so it is read in the page language. `ADMIN` still renders as ADMIN (no dotted İ).
- **Current state:** `aria-current` on the registered work; the language control names its target ("EN — English"); expanded / collapsed About is conveyed by focus and the heading, not `aria-expanded` (no disclosure widget exists).

---

## O · axe results (axe-core, WCAG 2.0 / 2.1 / 2.2 A + AA + best practice)

| | Before (EN 1440) | After |
|---|---|---|
| home, Creative, Work, project, Lab, Contact, About room, long About | `region` (moderate) ×1 in every state | **0 violations** |
| project world | `region` ×1 | 0 (after fixing `definition-list`, serious, found mid-pass) |

After-runs: TR + EN 1440 × 900, EN 1366 × 768, TR 820 × 1180, EN 390 × 844, TR 320 × 568, and reduced motion TR 1440 / EN 390. That is 8 states each, 64 scans, **0 violations**.

"Incomplete" = `color-contrast` on canvas-backed text, covered by § L.

---

## P · Lighthouse Accessibility (12.8.2, production build)

| Route | Accessibility | Best practices | SEO | Failing audits |
|---|---|---|---|---|
| `/en` | 100 | 100 | 100 | none |
| `/tr` | 100 | 100 | 100 | none |
| `/en/about` | 100 | 100 | 100 | none |
| `/tr/about` | 100 | 100 | 100 | none |

Lighthouse lists 10 manual checks per route. The keyboard / focus / order ones are covered by § F–G; the screen-reader ones are **not** closed by automation (§ T).

---

## Q · Generated HTML (before JavaScript)

(`m4-accessibility/generated-html/`)

| Route | `lang` | Landmarks | Headings | Content |
|---|---|---|---|---|
| `/` | en | nav, main | h1 name | language choice, hreflang TR / EN |
| `/en` | en | header, nav, main, 3 sections, footer, address | h1, h2 ×3, h3 ×3 | identity, roles, intro, the three projects with strength, facts, visit links; Lab studies; email, phone, GitHub, LinkedIn |
| `/tr` | tr-TR | same | same | same in Turkish, English terms marked |
| `/en/about`, `/tr/about` | en / tr-TR | header, nav, main, article, footer | h1 About, h2 Capabilities, Contact | full About text, capabilities, contact |

**JavaScript disabled** (`screens/nojs-tr.webp`): the shell renders as a readable page, with h1 + 6 headings, 15 links and 1,467 characters in TR. C2 does not start, and nothing is blank.

**Shell caveats** (unchanged in M4, Nuxt app files not touched):
- the no-JS home does not contain the hero positioning sentence or the Creative / Full-Stack capability lists (the about page does);
- the shell skip link is labelled "Skip to plain navigation" but targets `#main`.

---

## R · M3 touch regression

`touchreg.cjs` (24 real CDP touch steps, 390 × 844) on the M4 build:

| | EN | TR |
|---|---|---|
| Work hold, sideways registration, project enter / return | ✓ | ✓ |
| two-finger squeeze | ✓ | ✓ |
| Work → Lab swipe, Lab hold ×2, video playing, loaded hold → swipe away | ✓ | ✓ |
| language switch (same rooms, visits, history length) | ✓ | ✓ |
| About → Back, rotation | ✓ | ✓ |
| input at rest after every step | 24 / 24 | 24 / 24 |
| errors | 0 | 0 |

`endGesture()` and every M3 path are unchanged. The only input-path edit is a keyboard modality flag set on `keydown` and cleared on `pointerdown`.

---

## S · Regression checks

**Listeners, instances, console (M3 vs M4):**

| | M3 | M4 |
|---|---|---|
| window listeners (boot / after 4 language switches / after rotation) | 16 / 16 / 16 | 16 / 16 / 16 |
| document / `#ui` listeners | 1 / 1 | 1 / 1 |
| canvases, `#ui` | 1, 1 | 1, 1 |
| status regions | 0 | 1 |
| console messages, page errors, failed requests | 0 | 0 |

**Desktop visuals, 1440 × 900 EN, M3 vs M4:**
- Work and all 13 project frames: ≤ 0.05 mean diff (unchanged, including the PSI markup change).
- Open / About / Creative: 0.12–0.55 (row motion noise; M2 vs M2 measured 0.9–1.6).
- Lab / Contact: the known non-deterministic `freeSpot()` room placement (§ M3 report 5).

**Strip pixels** (new target padding): 1440 EN identical (0); 320 TR 0.01 mean, max 1 level.

**Performance** (same harness, alternate runs, this machine's GPU; fps / p95 ms):

| | Open | Registration | Release | World | Bridge | Lab hold | Lab playing | Contact |
|---|---|---|---|---|---|---|---|---|
| 1440 M3 | 110 / 14 · 115 / 14 | 107 / 21 · 109 / 21 | 108 / 14 · 107 / 14 | 75 / 21 · 76 / 21 | 76 / 21 · 75 / 21 | 53 / 55 · 51 / 49 | 142 / 7 · 140 / 7 | 66 / 21 · 65 / 21 |
| 1440 M4 | 112 / 14 · 105 / 14 | 108 / 21 · 110 / 21 | 107 / 21 · 106 / 21 | 75 / 21 · 76 / 21 | 76 / 21 · 75 / 21 | 52 / 49 · 53 / 55 | 140 / 7 · 142 / 7 | 65 / 21 · 65 / 21 |
| 390 × 844 M3 / M4 | 136 / 14 · 143 / 7 | 118 / 14 · 118 / 14 | 119 / 14 · 121 / 14 | 93 / 14 · 93 / 21 | 97 / 14 · 96 / 14 | 80 / 35 · 84 / 35 | 140 / 7 · 139 / 7 | 90 / 21 · 91 / 21 |
| 1366 × 768 M3 / M4 | 134 / 14 · 132 / 14 | 116 / 14 · 117 / 14 | 117 / 14 · 117 / 14 | 91 / 14 · 90 / 15 | 92 / 21 · 92 / 21 | 74 / 41 · 74 / 42 | 139 / 7 · 141 / 7 | 81 / 21 · 80 / 21 |

Initial payload 982 → 989 KB (+7 KB). No dependency added.

---

## T · Real screen-reader status

| | Status |
|---|---|
| Windows + NVDA | **Installed, but a reliable human test was not completed.** No result is recorded; nothing here counts as a pass. |
| iPhone 7 Plus + iOS 15.8.8 + Safari + VoiceOver | **A reliable human test was not completed.** No result is recorded. |

What the evidence in this report is, and is not:

| Evidence | Kind |
|---|---|
| axe-core scans | automated evidence only |
| Lighthouse Accessibility | automated evidence only |
| Chrome accessibility tree (CDP) | automated evidence only |
| keyboard journeys, focus walks, screen-reader activation simulation (`element.click()`) | scripted evidence only |
| contrast, target size, forced colours, zoom | automated / emulated measurement |

None of these replace a person using a screen reader. The human scripts in § V remain ready for that test.

---

## U · Known limitations

1. **One place at a time.** C2 exposes the place you are in, plus the plain navigation, not the whole portfolio as one scrolling document. This is deliberate (inactive places are visually absent and inert), made navigable by focus-on-arrival and the status line. Whether it reads as a clear mental model for a screen-reader user is exactly what the NVDA / VoiceOver tests must confirm.
2. **VoiceOver on iOS.** The C2 gestures (hold, swipe, squeeze) are replaced by VoiceOver's own gestures and by controls:
   - Work, About, Lab, Contact: the strip buttons;
   - **Creative Developer, Full-Stack Developer: the plain navigation's two buttons** (§ Y; before the patch these two places had no control and were reachable by arrow keys only);
   - project open / All work / Next: the Work and project controls.

   Not verified on the device yet. The plain navigation is visually hidden until it has keyboard focus, and VoiceOver reaches it by swiping. Whether VoiceOver activates a control inside a visually clipped container on iOS 15 Safari is part of the human test (§ V, steps 6–9).
3. **Lab rooms without a keyboard.** Enter makes a room on a keyboard. VoiceOver on iOS has no Enter on the page: studies are readable (list), their rooms are not openable. That is acceptable only if the list is judged an equivalent.
4. **Focus-on-arrival** moves keyboard focus away from a strip button to the place's heading (the standard single-page pattern). A keyboard user returning to the strip presses Shift+Tab.
5. **Text-only zoom.** Browser zoom 200 % was tested (1440 × 900 at 200 % → 720 × 450: all controls in view, no horizontal scroll, `screens/zoom200-*`). C2's type is set in `px`, so a browser's minimum-font-size or text-only setting does not reflow the C2 composition; the static shell uses `rem`. **Reflow at 320 CSS px:** the C2 phone composition (M3) plus the semantic summary. The full-screen canvas does not reflow like a document; the meaning does (§ Q, § I).
6. **Forced colours:** emulated in Chrome only; the Windows High Contrast themes themselves were not run.
7. **Shell caveats** in § Q (no-JS home lacks the hero line; shell skip-link label / target mismatch).
8. **Contrast method limits:** the rendered-ground measurement is a mean over each text box. Individual glyphs over row edges can momentarily sit on lighter / darker material.

---

## V · Human screen-reader test scripts

Test build: `npm run generate` → serve `.output/public`. Phone access is over your Wi-Fi as in M3; I can start the server on request.

### NVDA + Chrome or Firefox (Windows)
1. Open `/tr`.
2. Press **H** repeatedly: expect h1 "Emrah Yücel — Creative Developer ve Full-Stack Developer, İstanbul, Türkiye" only (home shows one place).
3. Press **D**: expect banner, main, navigation "Portfolyo", navigation "Düz gezinme".
4. **Tab** through: skip link, name, İşler, Hakkımda, Lab, İletişim, "EN — English", then the plain navigation links.
5. Read from the top (NVDA + ↓): identity, hero sentence, keyboard instruction.
6. C2 moves with the arrow and page keys, which NVDA's browse mode keeps for reading. Press **NVDA + Space** (focus mode), then **↓** until "İşler": NVDA should say the heading. Press **NVDA + Space** again to read in browse mode.
7. Identify the three projects (Tab through the index buttons; the registered one says "geçerli / current"). The open button reads **"Açmak için görseli basılı tut — Projeyi aç: İstanbul Şehir İçi"**, then its description **"Klavye veya ekran okuyucuyla etkinleştirin."** (NVDA may read the description after a short pause, or with NVDA + Tab).
7a. Press **D** to "Düz gezinme", Tab to **"Creative Developer"**, press **Enter**: NVDA reads the heading "Creative Developer" (English voice). Shift+Tab back into the plain navigation, **"Full-Stack Developer"**, Enter: heading "Full-Stack Developer". Then return to Work with the strip ("İşler").
8. Press **Enter**: İstanbul Şehir İçi opens, NVDA reads its heading. Read on (↓): line, role, strength, facts, stack, PageSpeed list, images, instruction.
9. Tab: "← Tüm işler", "Siteyi ziyaret et İstanbul Şehir İçi istanbulsehirici.com (yeni sekmede açılır)", "Sonraki".
10. Press **Escape**: back on the İstanbul index button.
11. **PageDown**: "Lab" heading.
12. Read the five studies; press **Enter** a few times: each study title is announced once.
13. **↓**: "İletişim".
14. Verify email, phone, GitHub, LinkedIn (links, new-tab note on the last two).
15. Shift+Tab to "EN — English", press **Enter**: same place in English, focus stays on the language control.
16. Check NVDA switches to English speech.
17. Tab to "About", Enter, Tab to "More about me", Enter: long About heading is read; ↓ reads the text.
18. Press **Escape** (or activate "← Back"): focus returns to "More about me".
19. Note any focus loss, trap, duplicate reading or confusing announcement.

### VoiceOver — iPhone 7 Plus, iOS 15.8.8, Safari
1. Open `/tr`.
2. Enable VoiceOver (Settings → Accessibility → VoiceOver, or triple-click Home if set).
3. Swipe right from the top: skip link, name, İşler, Hakkımda, Lab, İletişim, EN, h1, hero sentence, keyboard instruction, plain navigation.
4. Rotor → **Headings**: flick down.
5. Rotor → **Links**: works, email, phone, GitHub, LinkedIn.
6. Swipe right into the plain navigation (after the keyboard instruction): the first items are **"Creative Developer"** and **"Full-Stack Developer"** buttons.
7. Double-tap **Creative Developer**: the Creative place opens; VoiceOver moves to and reads the heading **"Creative Developer"** (in English), then swipe right: "Dokunduğun yüzeyi kuruyorum", the three capabilities.
8. Return to the plain navigation (rotor → Buttons, or swipe), double-tap **Full-Stack Developer**: heading **"Full-Stack Developer"**, then "ve altındaki sistemi", the stack line and the capabilities.
9. Note whether each heading was read exactly once (no "Creative Developer" twice).
10. Double-tap **İşler** in the strip: VoiceOver lands on the "İşler" heading.
11. Swipe to the project buttons: three names.
12. Double-tap a project button (e.g. "Ege Eşya"): **first activation selects it**; it comes into register and becomes "geçerli / current". **Double-tap the same button again: the second activation opens it**, and VoiceOver reads the project name. (The "Açmak için görseli basılı tut" button is shown on wider screens only.)
13. Swipe through the project summary: line, facts, PageSpeed, images.
14. Double-tap "← Tüm işler": "İşler" / back to the list.
15. Double-tap **Lab** in the strip: "Lab" announced.
16. Swipe to the five study titles.
17. Double-tap **İletişim**: contact links.
18. Verify email, phone, GitHub, LinkedIn.
19. Double-tap **EN**.
20. Verify English reading.
21. Double-tap Hakkımda, then "Hakkımda daha fazla" / "More about me": long About.
22. Use Back (Safari back or "← Back").
23. Disable VoiceOver.
24. Touch normally: hold on Work and Lab, swipe; M3 behaviour must be unchanged.

**Also report:** whether the plain-navigation buttons could be reached and activated by double-tap (limitation 2), and, on a wider screen or iPad, whether the open button is read as "Açmak için görseli basılı tut — Projeyi aç: …" followed by "Klavye veya ekran okuyucuyla etkinleştirin." without sounding repetitive.

### Report format (one per screen reader)
```
Device:
OS:
Browser:
Screen reader:
Heading navigation: PASS / FAIL
Landmarks: PASS / FAIL
Tab/swipe order: PASS / FAIL
Work: PASS / FAIL
Project: PASS / FAIL
Lab: PASS / FAIL
Contact: PASS / FAIL
Locale: PASS / FAIL
About / Back: PASS / FAIL
Focus lost: YES / NO
Trap: YES / NO
Duplicate / confusing announcements: YES / NO
Notes:
```

### Real-phone touch smoke (VoiceOver off)
Same iPhone:
- Work hold → swipe immediately;
- open a project and return;
- Lab hold → swipe; video plays;
- EN / TR;
- rotate.

Nothing in M4 changed touch or responsive code; this confirms it.

---

## W · Acceptance (§68)

| # | Question | Answer |
|---|---|---|
| 1 | Semantic DOM exposes all meaningful core content? | YES — identity, roles, hero line, capabilities (per face), About, Work, the three projects with facts / stack / PageSpeed / visit links, Lab studies, Contact, language; place by place, every place reachable by a control (Creative / Full-Stack from the plain navigation), plus the plain navigation (limitation 1) |
| 2 | Heading hierarchy logical in TR and EN? | YES |
| 3 | Landmarks meaningful? | YES |
| 4 | Full meaningful journey keyboard-only? | YES |
| 5 | Any keyboard traps? | NO (the post-project arrow-key dead end is fixed) |
| 6 | Focus always visible? | YES (416 stops, 0 without a ring; arrival headings intentionally ringless) |
| 7 | Focus order meaningful? | YES |
| 8 | Work operable without pointer gestures? | YES |
| 9 | Lab meaningfully accessible without hold gestures? | YES by keyboard (Enter rooms, all five studies announced); on VoiceOver iOS as a readable study list (limitation 3) |
| 10 | Reduced motion preserves the full journey? | YES |
| 11 | Meaningful images / media correctly represented? | YES |
| 12 | Decorative visuals removed from screen-reader noise? | YES |
| 13 | Unresolved serious / critical automated issues? | NO |
| 14 | Generated HTML has meaningful content before JS? | YES |
| 15 | M3 mobile interaction regressed? | NO (emulated regression 24 / 24 × 2; real-device smoke script in § V) |
| 16 | Desktop C2 visually regressed? | NO |
| 17 | Real desktop screen reader tested? | **NO** (NVDA installed; a reliable human test was not completed) |
| 18 | Real iOS VoiceOver tested? | **NO** (a reliable human test was not completed) |
| 19 | Remaining WCAG caveats documented honestly? | YES (§ U) |

---

## Y · Pre-screen-reader patch

**Why.** The first M4 pass already predicted a VoiceOver failure: Creative Developer and Full-Stack Developer could only be reached with arrow keys or C2 gestures. Fixed before the human test, not after.

**What changed:**
- **Plain navigation / Düz gezinme:** two native `<button>`s, "Creative Developer" and "Full-Stack Developer". Their names come from the shared content (English role names in both languages, `lang="en"`), and they drive the real C2 places through the same `navigate()`. No new visible control in the authored interface (the plain navigation is shown only while it has keyboard focus); no capability content duplicated.
- **Focus on activation:** activating a navigation control asks for focus on arrival, whatever activated it. Before, only keyboard-initiated moves took focus; a double-tap or click only updated the status line. This includes the strip, the plain navigation, open project / All work / Next, and the case where the place is already on screen.
- **No duplicate names:** the face sections and the About room no longer carry region labels equal to their headings.
- **Open control name:** see § Z (label in name).

**Verified** (element `.click()` only, no keyboard event, no pointer gesture: what a screen reader's activation does; `presr.cjs`, TR 390 × 844 and EN 1440 × 900):

| Activation | Place | Focus lands on (TR / EN) | Status line |
|---|---|---|---|
| plain nav "Creative Developer" | Creative | h2 [lang=en] "Creative Developer" / same | unchanged (no second announcement) |
| plain nav "Full-Stack Developer" | Full-Stack | h2 [lang=en] "Full-Stack Developer" / same | unchanged |
| plain nav "Creative Developer" again (moving back up) | Creative | h2 "Creative Developer" | unchanged |
| strip "İşler" / "Work" | Work | h2 "İşler" / "Work" | unchanged |
| 390 × 844, index "Ege Eşya" (select), then "Ege Eşya" again | Ege Eşya comes into register, then opens | stays on h2 "İşler" / "Work", then h2 "Ege Eşya"; "← All work" returns to the Ege Eşya button | unchanged |
| open button ("Açmak için görseli basılı tut — Projeyi aç: İstanbul Şehir İçi") | project | h2 "İstanbul Şehir İçi" | unchanged |
| project nav "← Tüm işler" / "← All work" | Work | the İstanbul index button | unchanged |
| plain nav "Full-Stack Developer" from inside a project | project exits, then Full-Stack | h2 "Full-Stack Developer" | unchanged |
| strip "Lab" | Lab | h2 "Lab" | unchanged |
| strip "İletişim" / "Contact" | Contact | h2 "İletişim" / "Contact" | unchanged |
| language | same place, other language | the element that had focus, rebuilt | unchanged |
| strip "About" | About room | h2 "About" / "Hakkımda" (not the name passed on the way) | unchanged |
| "More about me" | long About | h2 "About" / "Hakkımda" | unchanged |
| "← Back" | About room | "More about me" link | unchanged |
| plain nav "Creative Developer" from the About room | About closes, Creative | h2 "Creative Developer" | unchanged |

**Accessibility tree** at Creative (TR and EN): landmarks are banner, main, two navigations; **no region named "Creative Developer"**. Headings are h1 and h2 "Creative Developer": the name is read once.

**Re-run after the patch:**

| Check | Result |
|---|---|
| axe, 8 states × TR 1440 × 900, EN 390 × 844, EN 1440 × 900 reduced motion | 0 violations |
| keyboard journey (§ F), same three runs | complete, same focus targets, errors 0 |
| focus stops (now 56 per run: two new plain-navigation buttons) | 168 stops, 0 invisible / off-screen / obscured / ringless |
| pointer path | wheel → status "Creative Developer", "Full-Stack Developer"; a clicked strip button now takes focus to the place heading (heading focus shows no ring) |
| About Escape / Back, direct `/tr/about`, locale inside a project, forced colours, 200 % zoom, no-JS | unchanged from § G, I, L, Q |
| Lab Enter ×5 | all five studies announced once. A sixth announcement ("01 / 05") followed after the fifth room shrank the others below viability and the playing study changed: a real change, not the old per-pixel repetition |
| M3 touch regression, EN + TR 390 × 844 | 24 / 24 and 24 / 24 at rest, errors 0; re-run EN after the index change: 24 / 24, errors 0 |
| 1440 × 900 EN visuals vs M3 | Work and all 13 project frames 0.00–0.01; open / About / Creative / Full-Stack 0.08–0.24; Lab / Contact the known room-placement noise |
| typecheck / generate | exit 0 / exit 0 (12 routes) |

---

## Z · Label in Name (WCAG 2.5.3) micro patch

**Issue.** The pre-screen-reader patch had renamed the open control "Open project: <project>", which no longer contained its visible label "Hold the image to open it" / "Açmak için görseli basılı tut". A speech-input user saying the visible words could not target it. That was a known AA failure, fixed here instead of being documented.

**Now:**
- **Visible label:** unchanged (locked copy).
- **Accessible name:** starts with the visible label, then appends the project: `aria-label="<visible label> — <Open project>: <project>"`. The project part updates when another work comes into register.
- **Accessible description:** `aria-describedby` → a visually hidden span with `a11y.openHint` from the shared content: "Activate with keyboard or screen reader." / "Klavye veya ekran okuyucuyla etkinleştirin." The explanation stays out of the name.
- **Phone path unchanged:** at ≤ 700 px the button is not shown; the first activation of an index entry selects that project, and the second opens it.

**Verified** (Chrome accessibility tree, `m4-accessibility/patch/label-in-name.json`):

| | Visible text | Accessible name | Description | Name starts with visible label |
|---|---|---|---|---|
| TR, İstanbul registered | Açmak için görseli basılı tut | Açmak için görseli basılı tut — Projeyi aç: İstanbul Şehir İçi | Klavye veya ekran okuyucuyla etkinleştirin. | YES |
| TR, after Evden Eve Nakliyat registers | same | Açmak için görseli basılı tut — Projeyi aç: Evden Eve Nakliyat | same | YES |
| EN, İstanbul registered | Hold the image to open it | Hold the image to open it — Open project: İstanbul Şehir İçi | Activate with keyboard or screen reader. | YES |
| EN, after Evden Eve Nakliyat registers | same | Hold the image to open it — Open project: Evden Eve Nakliyat | same | YES |

(Rendered on screen in uppercase by CSS; the comparison is case-insensitive in each locale.)

**Regression after this patch:**

| Check | Result |
|---|---|
| axe, 8 states, TR 1440 × 900 and EN 390 × 844 | 0 violations |
| keyboard journey (§ F) | complete, same focus targets, errors 0 |
| focus stops | 112, 0 invisible / off-screen / obscured / ringless |
| screen-reader activation (`presr.cjs`, TR 390 × 844, EN 1440 × 900) | 15 / 15 steps land on the right heading in both runs (§ Y table unchanged) |
| phone project path (`vophone.cjs`, TR + EN 390 × 844) | first activation of "Ege Eşya" selects (`aria-current`), second opens it (focus h2 "Ege Eşya"), "← All work" returns focus to the Ege Eşya button |
| M3 touch regression, EN + TR 390 × 844 | 24 / 24 and 24 / 24 at rest, errors 0 |
| visuals vs M3 | 1440 × 900 EN: Work and all 13 project frames 0.00; open / About / faces 0.10–0.45; Lab / Contact room-placement noise. 390 × 844 TR: every state ≤ 0.03 |
| typecheck / generate | exit 0 / exit 0 |

---

## X · Decision (§70)

**M4 IMPLEMENTATION COMPLETE — HUMAN SCREEN-READER VALIDATION DEFERRED**

- **Implementation:** complete, including the pre-screen-reader patch (§ Y) and the label-in-name patch (§ Z).
- **Automated and scripted verification:** complete (§ F–S, Y, Z). No pass rule in §69 other than the real screen-reader gate is violated, and no known AA issue is left open in the code.
- **Known limitations:** § U, all preserved.
- **No formal conformance claim:** this is a practical WCAG 2.2 AA pass, not a WCAG 2.2 AA conformance claim.

### Deferred human screen-reader test

| | Status |
|---|---|
| NVDA (Windows) | installed; reliable human test **not completed** |
| VoiceOver (iPhone 7 Plus, iOS 15.8.8, Safari) | reliable human test **not completed** |

A test by a real screen-reader user remains a **pre-launch quality recommendation**, ideally someone who uses NVDA or VoiceOver daily, following § V and reporting in its format. The points it should settle are limitations 1–3: the one-place-at-a-time model, the plain-navigation route to Creative / Full-Stack under VoiceOver, and the Lab study list as the equivalent of rooms.

**This deferral does not block starting M5.**

---

## Git

Nothing committed or pushed.

```
 M engine/c2/main.js
 M engine/c2/style.css
 M engine/c2/world.js
 M shared/content/locales/en.ts
 M shared/content/locales/tr.ts
 M shared/content/types.ts
?? docs/M4-REPORT.md
?? docs/m4-accessibility/   (1.5 MB)
```
