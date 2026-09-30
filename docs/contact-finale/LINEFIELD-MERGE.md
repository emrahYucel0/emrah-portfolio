# Merging Linefield with the Contact finale

The Contact finale reached `main` on 2026-09-30, merged from `feature/contact-finale` into `origin/main` with
`--no-ff`. Linefield was then still on its own local `main`, in the worktree `emrah-portfolio-linefield`, 11 commits
ahead of `origin/main`. When Linefield takes `origin/main` in, these 7 files conflict. Below: what the Contact finale
changed in each and why, how `CONTACT_STOP` binds to Linefield's stop map, and what to run afterwards.

## The 7 files

| File | What contact-finale changed | Why | What Linefield changed | How to merge |
|---|---|---|---|---|
| `engine/c2/main.js` | See "engine/c2/main.js in detail" below. | Contact became its own route. Three leaks surfaced once the runtime could live beside other routes. | Named stops (`SPINE` / `STOP`), the Linefield passage, `LINEFIELD` switch. | Take Linefield's stop map, then re-apply the Contact pieces on top of it. The details are in the next two sections. |
| `engine/c2/states.js` | `rest()` lost its wedge room and contact block (`layout.block`, `layout.wedge`, the `feature`). It keeps the visit's threads and `visitKey`. | The old runtime Contact is deleted (F4). The stop is only material now. | `build` and `mk` exported. | Both apply. No overlap in meaning. |
| `app/composables/useC2Engine.ts` | `openContact` option; `host()` split out of `start()`; `warm()` and `loadModule()`. | The route handover; the cold-boot warm-up. | A dev-only Linefield debug entry inside `start()`. | Keep both. Linefield's debug import goes in `start()` after `host()`. |
| `nuxt.config.ts` | Comment only: the browser floor is iOS 15.4. | User decision, 2026-09-29. | The `LINEFIELD` switch (`define: { __LINEFIELD__ }`). | Keep both. |
| `shared/content/types.ts` | `meta.contact` added. `finale` block: copy, revision and the three hints; the ink counter strings removed. | The route's SEO, and the finale's words. | Optional `linefield` block. | Keep both blocks. |
| `shared/content/locales/tr.ts` | Same keys as `types.ts`, in Turkish. | Same as `types.ts`. | Linefield's words. | Keep both. |
| `shared/content/locales/en.ts` | Same keys as `types.ts`, in English. | Same as `types.ts`. | Linefield's words. | Keep both. |

### `engine/c2/main.js` in detail

What the Contact finale changed, in order:

1. `HOST.contact` and `configure({ openContact })`.
2. `openContact(how)` and its handover in `frame()`: travel that settles on the Contact stop opens the route.
3. The strip's `data-go="rest"` opens the route settled (`HOST.contact('end')`).
4. The old runtime Contact is deleted: `D.rest`, `restReg`, `restOpen`, `placeRest`, the wedge. `PLACE_HEADING` at
   the Contact stop is now `() => null`.
5. `arriveAt` no longer knows `'rest'`.
6. `keydown` and `contextmenu` return unless `owns()`.
7. The frame loop parks after 1 s without the screen and wakes on `data-c2`.
8. The boot is split into `prepare()` and `start()` (begin), with `export { start as mountC2, prepare as warmC2 }`.
9. `CONTACT_STOP` names the Contact stop.

## `CONTACT_STOP` and Linefield's stop map

`engine/c2/main.js` names the Contact stop once:

```js
const CONTACT_STOP = 5
const LAST = CONTACT_STOP // Contact is the index's last stop
```

It is read by:

- the handover in `frame()`: `A.base === CONTACT_STOP` and the settled `p` / `pT`;
- the strip's and `navigate()`'s stop tables: `rest: CONTACT_STOP`;
- `IDX[CONTACT_STOP]`: the stop's material, built last in `rebuild()`;
- the texture warm queue;
- the imprint's visibility at the stop (`impT`, `impVis`);
- `window.__lab.CONTACT_STOP`, which `tools/diag/seam.cjs` uses.

Linefield names its stops. `rest` is at index 6 when `LINEFIELD` is on, because the passage sits before Work, and at
index 5 when it is off.

**On the merge, bind `CONTACT_STOP` to the map, not to 5:**

```js
const SPINE = LINEFIELD ? ['name', 'creative', 'system', 'linefield', 'work', 'lab', 'rest'] : [...]
const STOP = Object.fromEntries(SPINE.map((n, i) => [n, i]))
const CONTACT_STOP = STOP.rest
const LAST = SPINE.length - 1   // Linefield's own; still equals CONTACT_STOP while Contact is last
```

The literal stop tables (`{ name: 0, …, rest: CONTACT_STOP }`) become Linefield's `STOP`-based tables. Linefield
already writes them that way; keep its version and drop the literals.

Also check:

- the `impT` line hardcodes the Lab as `stop === 4`. On Linefield's map that must be `STOP.lab`;
- `PLACE_HEADING` and `PLACE_NAME` are positional arrays: they must follow `SPINE`, with `() => null` at `STOP.rest`;
- `arriveAt` must not map `'rest'`: Contact is reached by `openContact`, never by an arrival.

## After the merge

Run the full gate: `npm run generate && sh tools/diag/serve.sh`, then `sh tools/diag/run6.sh 4500 4650`. Run it with
`LINEFIELD` both off and on (`NUXT_PUBLIC_LINEFIELD=1 npm run generate`). These sections must pass:

- **SEAM** (`seam.cjs`): the Lab ⇄ finale crossing. This includes the runtime's Contact stop reached by travel (via
  `window.__lab.CONTACT_STOP`), and Back past the finale sitting on that stop.
- **GESTURE** (`gesture2.cjs`): one gesture, one stop. Run it several times with `GESTURE_RUNS=5`: Linefield changes
  the index, and this check once escaped on timing.
- **CONTACT ROUTE** (`contact.cjs`): the route, its DOM, axe, and no script.
- **BECKON** (`beckon.cjs`): the way in, the guide, the foot band, and the keys after a visit to the index.
- **JOURNEY** (`journey.cjs`, TR normal and EN reduced): the whole path, including Lab → Contact → Lab → Work.
- **SPINE**, **FINALE A11Y** and **NON-LAB**. In NON-LAB, the Contact step is expected to show "moved by design".

These older harnesses are not in the gate and still expect the runtime's pre-F2 Contact stop: `live.cjs`,
`proof1.cjs`, `touch.cjs`, `touchjourney.cjs`. If any of them is brought back, it should expect `/[locale]/contact`
instead.
