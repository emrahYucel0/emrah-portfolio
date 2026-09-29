# tools/diag — the site's own harnesses

These are the checks the portfolio is held to. They drive a **built** site (`.output/public`) through a real
browser and assert what a visitor would see: where a gesture lands, what owns the paint, whether any text box
overlaps another, whether the retired Lab is ever drawn, what axe says.

They live in the repository because two branches depend on them and because a check that can be lost is not a
check. They are **never** part of the production artifact: `tools/` is source, and only `.output/public` is
uploaded (see `docs/DEPLOYMENT.md`).

## Setting up

```bash
npm install --prefix tools/diag playwright axe-core sharp
npx --prefix tools/diag playwright install webkit chromium
```

`tools/diag/node_modules`, `tools/diag/out` and `tools/diag/*.log` are ignored. Nothing else here is.

## Running

### The baseline build

`nonlab.cjs` needs a **second built artifact** to compare against, served on its own port. Keep that artifact
somewhere durable and inside no temp directory — the original baseline was lost to a temp sweep, and a server whose
directory has been deleted still answers, with 404, which surfaces as `window.__lab.A is undefined` rather than as
"your baseline is gone". `run6.sh` now preflights both ports and says which one is wrong.

The baseline is now a **tag**, not a folder: `baseline/pre-site-polish` (annotated, on `main`). `run6.sh` notices
when nothing serves the baseline port, rebuilds the artifact from that tag via `baseline.sh`, and serves it — so the
folder can be deleted without losing the baseline. `baseline.sh` builds in a detached git worktree, so your branch and
your uncommitted changes are never touched.

Say in the report which baseline was used. A comparison against a different commit is a different measurement.

```bash
npm run generate                                   # build first
cp tools/diag/node_modules/axe-core/axe.min.js .output/public/   # only for the a11y runs
cd tools/diag
node sv.cjs ../../.output/public 4500 --wk         # the build under test
node sv.cjs /path/to/baseline/public 4700 --wk     # the build to compare against
sh run6.sh                                         # the whole gate → out/final6.log
```

## After a rebuild, bring the servers up with `serve.sh`

```bash
npm run generate && sh tools/diag/serve.sh
```

**Restart the servers after every rebuild.** The CSP in `.htaccess` carries a hash of the generated HTML, so a
server started before a rebuild serves the old hash, the inline script is refused, the runtime never boots, and
every test fails in the same confusing way. More than one afternoon has gone into rediscovering this.

`--wk` strips `upgrade-insecure-requests` from the CSP, which WebKit would otherwise use to rewrite
`http://127.0.0.1` to https. `--lan` binds 0.0.0.0 for testing on a phone on the same network.

### What a stale server looks like, so you recognise it next time

`sv.cjs` reads `.htaccess` **once at startup**. The policy names each inline script by sha256 and every build makes
a new hash, so a server left running across a rebuild serves the NEW document with the OLD policy. Then:

- the browser refuses the inline script, so no JavaScript runs at all;
- inline **styles** still apply, so the page looks styled and deliberate;
- **nothing 404s**, so the network tab is clean;
- `/tr` shows the first-paint plate, no hero, and a document scrollbar — the runtime never took the screen;
- `/tr/lab` shows the strip and footer with the bench's text piled in the top-left, because its script never
  placed anything and never sized its canvas (it keeps the 300x150 default).

It reads exactly like broken product code, and it is not. `run6.sh` now refuses to launch a single browser until
`cspboot.cjs --static` confirms that each server's policy names the scripts in its own documents, and the gate's
first section boots the build in both engines under that policy. `serve.sh` avoids the whole class by stopping the
ports before it starts them.

## What each one is for

| | |
|---|---|
| `sv.cjs` | the static server: serves a built artifact with the `.htaccess` CSP the host would send |
| `serve.sh` | stops every port this repo owns, snapshots the build into `builds/<branch>/`, and serves it |
| `cspboot.cjs` | does the served build boot under the policy the host will send? `--static` compares hashes, without a browser |
| `baseline.sh` | rebuilds the baseline artifact from the tag `baseline/pre-site-polish`, in a throwaway git worktree |
| `spine.cjs` | the six-stop spine, the Lab as its fifth destination, and browser history |
| `gesture2.cjs` | one input = one movement, on the index and inside a project |
| `journey.cjs` | the whole visit, end to end, scanned for `undefined` / `NaN` in what is on screen |
| `shell.cjs` | the Lab's chrome, the studies' own scroll, one control back |
| `labflash.cjs` | the retired Lab visual must never be drawn during a handoff |
| `labboot.cjs` | every Lab route is styled at first paint, with its chunk held back |
| `boot.cjs` | the cold load: who owns the paint, and when |
| `bootresp.cjs` | the same, across the screens the composition is set for |
| `panelfit.cjs` | every line of a project's identity panel through the opening: inside the panel, and AA against the pixels actually behind it |
| `proj.cjs` | how long a project transition makes the visitor wait, and for what — measured from the one activation that opens the project, with the carousel positioning done before the clock starts |
| `labaxe.cjs` | axe over the Lab routes, both languages, both motion settings |
| `responsive.cjs` | on demand (≈25 min): the finale at 15 sizes, phone to 21:9, Chromium + WebKit — p = 0 / mid / p = 1 / attended; overflow, strip, foot on one line, every value inside its cell with clearance, the copy control clear, the email soaks, the Lab → finale seam; contact sheet → docs/contact-finale/responsive |
| `perf-large.cjs` | on demand: frame-time p95 (HUD) at 1440/1920/2560 DPR 2 — sweep and attention |
| `beckon.cjs` | the finale asks once: at p = 0 the tear row breathes and the foot says to scroll (words only when reduced), the first scroll ends both; the cursor guide (GitHub and back, once per session, cancelled by any movement) and the phone's scroll-attention walk; the foot's two ends are the home strip's words (TR/EN) at every p; no scrollbar, keys still scroll (stills → docs/contact-finale/f3b) |
| `finale-a11y.cjs` | F3: the finale's facts reach assistive technology at every p (axe 0 at p = 0 and 1, TR/EN, desktop/phone); Tab order, focus settles the drawing, the ring on its fact, Enter records a revision; the language control keeps the reader's place; reduced motion's four stations; five phone sizes incl. landscape in Chromium and WebKit (stills → docs/contact-finale/f3) |
| `seam.cjs` | F2: the Lab ⇄ Contact finale crossing (the bench's last frame = the finale's first, pixel for pixel; gesture tails hushed both ways), the by-name arrivals at p = 1 (strips, `#contact`), the runtime's Contact stop, Back / Forward, touch; `record` writes the crossing's videos to docs/contact-finale/f2, `reduced` runs it with reduced motion |
| `compat-ios15.cjs` | the Contact finale on the iOS 15.4 floor: its sources held to Safari 15.4 (esbuild + API scan), and its rich path on the built site with the validation device's missing APIs removed, module workers broken and font-stretch off |
| `contact.cjs` | the Contact finale's route: no runtime there, one h1, the five facts as DOM with and without JavaScript, axe — both engines, both languages |
| `heroaxe.cjs` | axe over the hero, and the About control's place in the keyboard order |
| `hero.cjs`, `herolayout.cjs`, `herotouch.cjs`, `herolocale.cjs` | the hero's About control |
| `touch.cjs`, `touchjourney.cjs`, `moblayout.cjs` | the Lab under a real finger, and its mobile layout |
| `worktap.cjs` | a tap opens a project, a swipe changes it, and neither is the other |
| `benchshot.cjs` | every text box on the bench, measured against every other |
| `nonlab.cjs`, `nonlabred.cjs` | the non-Lab site against a baseline build, stop by stop |
| `proof*.cjs` | the engraved proof (used by `feature/engraved-proof`) |

## Reading the results

**A pixel delta is weather.** The ambient wave is always moving, so two runs of the *same build* differ a lot:
measured 2026-09-26, one build against a byte-identical copy of itself gave **19.3% on the hero, 18.1% after a
drag, 6.8% on About** and 0 on Work and Contact. Treat anything in that band as nothing. `nonlab.cjs` prints the
delta but asserts the **state**: mode, stop, which layers are up, which destinations exist. A state difference is a
real change; a delta on its own is not.

**One console message is allowed, and only this one.** `ResizeObserver loop completed with undelivered
notifications` is a WebKit notice that a ResizeObserver callback missed its loop budget; nothing breaks, and nothing
the visitor sees changes. `journey.cjs` keeps it in a separate list, prints the count, and does not fail. Every other
console message and every page error is still a hard failure. `LabBench.vue`'s observer defers its measurement to the
next frame so it never forces layout inside the callback, which is what produced the notice in the first place — if
the count starts rising again, that is the thing to look at.

**To compare pixels, compare in reduced motion.** `nonlabred.cjs` stops the wave, and two builds that really are
the same then come out at **0 on every stop** — which is the only pixel comparison worth asserting on.

Recorded values live in the report each branch produced, not here — a number in a README goes stale in a week.
