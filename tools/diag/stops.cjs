// THE STOPS, ASKED OF THE PAGE.
//
//   const STOP = await stopsOf(page)   // { name, creative, system, work, lab, rest, ... }
//
// The index is a spine of places and the runtime derives their positions from one list of names (see the rule
// in CLAUDE.md). A harness that writes `base === 3` is asserting a position, not a place, and stops being true
// the moment a place is inserted — which is exactly what happened: the work-field touch check failed on a build
// where Work is the fourth stop and not the third, while every functional assertion under it passed.
//
// Older artifacts — the baselines, anything built before the renaming — do not expose window.__lab.STOP. For
// those the historical spine IS the answer, so it is the fallback rather than a failure.
const LEGACY = { name: 0, creative: 1, system: 2, work: 3, lab: 4, rest: 5 }

/*
 * IT HAS TO BE ASKED ON A ROUTE THE RUNTIME OWNS. On the Lab routes the document owns the screen and the engine
 * is never started, so `window.__lab` is simply not there and the fallback is all this can return — which is
 * wrong on a build where a place has been inserted. A harness that begins at the Lab loads a locale route once
 * to ask, and only then goes where it means to go.
 */
async function stopsOf(page, waitMs = 8000) {
  await page.waitForFunction(() => !!(window.__lab && window.__lab.STOP), null, { timeout: waitMs }).catch(() => {})
  const s = await page.evaluate(() => (window.__lab && window.__lab.STOP) || null).catch(() => null)
  return s || { ...LEGACY }
}

module.exports = { stopsOf, LEGACY }
