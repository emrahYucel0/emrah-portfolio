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

The honest substitute, when the recorded baseline is gone, is the merge target: build `main` into its own directory
and serve that. Say in the report which baseline was used — a comparison against a different baseline is a different
measurement.

```bash
npm run generate                                   # build first
cp tools/diag/node_modules/axe-core/axe.min.js .output/public/   # only for the a11y runs
cd tools/diag
node sv.cjs ../../.output/public 4500 --wk         # the build under test
node sv.cjs /path/to/baseline/public 4700 --wk     # the build to compare against
sh run6.sh                                         # the whole gate → out/final6.log
```

**Restart the servers after every rebuild.** The CSP in `.htaccess` carries a hash of the generated HTML, so a
server started before a rebuild serves the old hash, the inline script is refused, the runtime never boots, and
every test fails in the same confusing way. More than one afternoon has gone into rediscovering this.

`--wk` strips `upgrade-insecure-requests` from the CSP, which WebKit would otherwise use to rewrite
`http://127.0.0.1` to https. `--lan` binds 0.0.0.0 for testing on a phone on the same network.

## What each one is for

| | |
|---|---|
| `sv.cjs` | the static server: serves a built artifact with the `.htaccess` CSP the host would send |
| `spine.cjs` | the six-stop spine, the Lab as its fifth destination, and browser history |
| `gesture2.cjs` | one input = one movement, on the index and inside a project |
| `journey.cjs` | the whole visit, end to end, scanned for `undefined` / `NaN` in what is on screen |
| `shell.cjs` | the Lab's chrome, the studies' own scroll, one control back |
| `labflash.cjs` | the retired Lab visual must never be drawn during a handoff |
| `labboot.cjs` | every Lab route is styled at first paint, with its chunk held back |
| `boot.cjs` | the cold load: who owns the paint, and when |
| `bootresp.cjs` | the same, across the screens the composition is set for |
| `proj.cjs` | how long a project transition makes the visitor wait, and for what — measured from the one activation that opens the project, with the carousel positioning done before the clock starts |
| `edge.cjs` | **UNVERIFIED** — rewritten from a description that does not match the code; asserts nothing. See its header |
| `labaxe.cjs` | axe over the Lab routes, both languages, both motion settings |
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

**To compare pixels, compare in reduced motion.** `nonlabred.cjs` stops the wave, and two builds that really are
the same then come out at **0 on every stop** — which is the only pixel comparison worth asserting on.

Recorded values live in the report each branch produced, not here — a number in a README goes stale in a week.
