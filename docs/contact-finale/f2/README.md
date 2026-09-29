# F2 — the crossings into the Contact finale

Every way into Contact now lands on `/[locale]/contact`. The old Contact stop stays in the runtime behind
`CONTACT_FINALE` (`shared/site.ts`) until F4.

| From | Lands on | How |
|---|---|---|
| The bench, a gesture down (wheel, trackpad, finger) | the finale at **p = 0** | The bench clears itself to its bare row field (the veil, 0.28 s), then hands over. That field is the finale's first frame. |
| The finale at p = 0, a gesture up | **the bench**, as it was left | It arrives bare and registers itself back out of the field (0.42 s). |
| The runtime's strip Contact, the Lab strip Contact, the semantic header, `/tr#contact` | the finale at **p = 1** | Asked for by name. On `/contact` itself, the strip's Contact settles the finale in place. |
| The runtime's Contact stop, reached by travel | the finale at p = 0 | Travel that settles on the stop hands over, as the Lab stop does. A state restored onto the stop by Back sits quietly; one more gesture down hands over. |
| Back / Forward | the finale where it was left | Kept per history entry (`finaleScroll`); the page owns its scroll (`scrollToTop: false`). |

**One gesture, one destination, both ways.** After a handover, the gesture's tail is spent (`hushTail`: 420 ms,
re-armed by 140 ms while it keeps coming), so the finale does not scroll and the bench does not go on to Work. At
the top of the finale, only a gesture that *began* at the top leaves for the Lab: a scroll that ran the drawing back
to p = 0 stays. A finger that began on the bench cannot pan the finale mid-swipe (`.lab-stage` is set to
`touch-action: pinch-zoom`).

**How the arrival is recorded.** It rides on the history entry (`finaleArrive` / `labArrive`, the same way as the
runtime's `c2Arrive`) and is spent on arrival. The finale's engine is fetched while the bench is on screen.

## Recording

- `lab-finale-desktop.webm`: 1440×900, trackpad. Bench → gesture down → finale draws → back to the top →
  gesture up → bench.
- `lab-finale-phone.webm`: 390×844, touch. The same crossing with a finger.
- `seam-1-bench.png` → `seam-2-bench-bare.png` (the bench's last frame) → `seam-3-finale-first.png` (the finale's
  first frame) → `seam-4-bench-again.png` (back up).

Stills 2 and 3 were compared over the sheet, with the strip and the foot excluded: mean |Δ luminance| **0**, **0 %**
of pixels differ.

Harness: `tools/diag/seam.cjs` (a gate section; `record` rewrites this folder's videos and stills).
