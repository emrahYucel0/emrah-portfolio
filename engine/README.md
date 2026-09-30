# engine/ — the C2 integration slot (empty by design in M0)

The frozen prototype in `../c2-surface-lab` is the design authority for everything that happens on the
surface. When it is migrated it lands **here**, and it must not have to change shape to fit Nuxt.

## The boundary

- `engine/` is plain TypeScript. It imports nothing from Vue, Nuxt or vue-router.
- The page tells the engine *what* happened (`navigate`, `openProject`, `setReducedMotion`), never *how*
  to draw. The engine owns its own `requestAnimationFrame` loop.
- Vue reactivity must never drive a frame. A component may write into the engine on an event and read a
  snapshot on demand; it may not make the loop a computed.
- The engine reports back through plain callbacks, which a composable can turn into Nuxt state.
- Session memory (`app/composables/useVisit.ts`) is the serialisable contract between the two: the engine
  restores from it and writes into it, so a client-side route change or a language switch never restarts
  a visit.

## What is NOT here yet, on purpose

No WebGL, no shaders, no Lab physics, no project worlds, no state textures. M0 only reserves the place
and the rule, so that nothing in the production shell grows a dependency the engine would have to fight.

`#engine` is aliased in `nuxt.config.ts`, so the first migration commit can add files here and import
them as `#engine/...` without touching the shell.

## Since M0

- `c2/`: the migrated runtime.
- `lab/`: the Lab studies' shared cores.
- `lab/finale/`: the Contact finale. It is framework-free, like the rest; the page hands it canvases, DOM and
  words. The integration's map and decisions are in `docs/contact-finale/README.md`.
