# emrah-portfolio — working notes for Claude

## The site

Nuxt 4, statically generated (`npm run generate` → `.output/public`), hosting the frozen **C2 runtime** in
`engine/c2/`. The runtime owns the screen on the locale routes; the Lab routes (`/{locale}/lab*`) hand it back to
the document, which is what gives the studies their scroll. `docs/DEPLOYMENT.md` is the deployment authority.

## Features in progress

A feature under development lives on its own branch — or its own **worktree**, when another branch's work is open
in the main folder and must not be disturbed — and behind a **build-time flag that is off by default**.

- With the flag off the published site must behave identically and must contain **none of the feature's code**.
  That is a tested gate, not an intention: the flag is a `define` the bundler resolves, and the feature's modules
  are imported only where it is true, so a published build has nothing to strip.
- Each feature keeps its own document under `docs/` as the source of truth: the approved architecture, the phase
  plan, the approval checkpoints, and every decision agreed so far. Read it before continuing that feature's work,
  and **re-read it after any context compaction**. Record every later decision there.

## Verification policy — what to run, and when

Proportion is the rule: the size of the check follows the size of the change, not the size of the anxiety.

- **Small follow-ups and fixes:** the targeted harnesses for the area touched, plus `npx nuxt typecheck` and the
  flag-off route check. Minutes, not hours.
- **End of a phase, before asking for visual approval:** the same set, plus every harness that phase added.
- **The full flag-off gate (`tools/diag/run6.sh`, against the `baseline/pre-site-polish` artifact) and the full
  stability sample run at milestones only:** before asking for a seam or an integration to be approved, before
  any merge to `main` or deploy, and whenever a change touches `engine/c2/*`, the layout's screen ownership, or
  navigation.
- **Never start a run expected to take longer than 30 minutes without asking first.**

Two things the harnesses have learned the hard way, worth knowing before reading their output:

- **A pixel delta is weather.** The ambient wave is always moving, so two runs of the *same* build differ a lot.
  Compare pixels in reduced motion (`nonlabred.cjs`), where two identical builds come out at 0 on every stop.
  `nonlab.cjs` asserts the **state** — mode, stop, which layers are up, which destinations exist — and prints the
  delta without failing on it.
- **A server started before a rebuild serves the new HTML under the old CSP hash**, the inline script is refused,
  the runtime never boots, and every test fails in the same confusing way with no failed request. `cspboot.cjs`
  exists for exactly that, and `serve.sh` runs it after every restart.

## Conventions

- **The C2 runtime is frozen unless a brief says otherwise.** It is one full-screen fragment shader plus a
  material-coordinate map; changes there are felt everywhere on the site.
- Shaders and engine modules are plain ES modules with no framework imports.

## Stops are named, not numbered

The index is a spine of places. Their positions are derived from one list of names in `engine/c2/main.js`:

```js
const SPINE = ['name', 'creative', 'system', 'work', 'lab', 'rest']
const STOP = Object.fromEntries(SPINE.map((n, i) => [n, i]))
const LAST = SPINE.length - 1
```

Everything that means a place — travel, arrivals, hints, focus and announcement tables, the physics' imprint
visibility, the DOM layers — says `STOP.work`, never `3`. Tables that are per place are keyed by the NAME and
read through `SPINE`, never indexed by the number.

**Why.** For the life of this site those positions were literals, which was survivable while the list never
changed. Inserting a place breaks every number after it and nothing in the source says so: the work field's
"back off the near end goes to stop 2" silently skipped the new place, and an array of headings indexed by stop
silently moved every announcement one place along. Both were real, and both were invisible in review.

Adding, removing or reordering a place is an edit to that one list.

**And in the harnesses too.** A check that writes `base === 3` asserts a position, not a place. They read
`window.__lab.STOP` through `tools/diag/stops.cjs`, which falls back to the historical spine for artifacts built
before the renaming — and which has to be asked on a locale route, because the Lab routes never start the
runtime and cannot answer.

**A stop can hide in arithmetic.** The one that reached a review was `Math.abs(A.p - 3) < 0.6`: not a comparison
against a stop, a stop used as a distance, which every search for `=== 3` walked straight past.

## Standing rules

- **`docs/ROADMAP.md` is the project's one to-do list.** Read it at the start of every session. Update it as you
  work: mark what you start, record each user decision there with its date, and move what you finish into the
  "Tamamlananlar" table. The procedure is at the top of the file.
- Do not commit, push or deploy without being asked.
- The research sources at `C:\Users\monster\Desktop\emrah-yucel-porfolio\` are read-only.
- No mail, cPanel, SMTP or API credentials belong in this repository.
- Automated browser results are never reported as physical device verification.

## Safety — more than one worktree at a time

Work on two features can be open at once, in two folders sharing **one `.git`**. Everything below follows from
that: a command that looks local is not.

- **Never `git stash`.** The stash stack is shared, so a pop can take another session's work. Set work aside with
  a temporary commit on your own branch instead.
- **Never `git gc`, `git worktree prune`, or anything that rewrites, expires or deletes refs** that are not your
  own branch's. Another worktree's branch, reflog and index are not yours to touch.
- **Never touch the other folder** — its branch, its files, its index, tracked or untracked — or assume its state
  is what you last saw it as. It moves while you work.
- **Never run `tools/diag/serve.sh` with its default ports from a second worktree.** It force-kills whatever
  holds 4500-4700, which is the other session's servers. Name your own three ports instead — under test, LAN,
  baseline — and only those are stopped: `SERVE_PORTS="4910 4911 4914" sh tools/diag/serve.sh`, then
  `sh tools/diag/run6.sh 4910 4914`. `BUILD_DIR` overrides the snapshot folder. Do not change the defaults.
