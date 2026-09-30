# Responsive round (before F4)

Checked 15 sizes in Chromium and WebKit: phones, tablets (portrait and landscape), laptops, desktops and 21:9.
Harness: `tools/diag/responsive.cjs`. Per-size results are in `responsive.json`. `contact-sheet.png` holds one
p = 1 still per size, and `p1/` holds each still on its own.

Every size was checked at four moments: the arrival at p = 0 (breath and words), mid-drawing, p = 1 at rest, and
with GitHub attended. The checks:

- no overflow; the strip on one line and not clipped;
- the foot's words on one line, inside the band, not touching each other;
- every value inside its own cell, with clearance;
- the copy control clear of the email's lettering;
- the email soaks;
- the Lab → finale seam: the bench's last frame against the finale's first.

**Result: 0 findings in both engines.** The email soaks at every size. The seam differs by 0 % at every size.

| size | attention | email cap | share of H | min. clearance |
|---|---|---|---|---|
| 360×780 | scroll | 33 px | 4.3 % | 9.7 px |
| 430×932 | scroll | 41 | 4.4 | 11.8 |
| 768×1024 | scroll | 78 | 7.6 | 4.6 |
| 1024×768 | scroll | 53 | 6.9 | 15.0 |
| 820×1180 | scroll | 83 | 7.1 | 3.0 |
| 1180×820 | scroll | 61 | 7.5 | 15.1 |
| 1024×1366 | scroll | 105 | 7.7 | 3.0 |
| 1366×1024 | scroll | 71 | 7.0 | 16.1 |
| 1280×800 | cursor | 67 | 8.3 | 15.6 |
| 1366×768 | cursor | 71 | 9.3 | 16.1 |
| 1512×982 | cursor | 80 | 8.1 | 16.9 |
| 1728×1117 | cursor | 92 | 8.2 | 18.2 |
| 1920×1080 | cursor | 103 | 9.5 | 17.9 |
| 2560×1440 | cursor | 139 | 9.6 | 16.8 |
| 3440×1440 | cursor | 144 (ceiling) | 10.0 | 16.7 |

The tablets are emulated as touch-only devices, so they carry attention by scroll.

## What this round found and fixed

1. **The copy control sat on the email's lettering** at 8 of 15 sizes. This happened whenever another field was
   attended and the email cell shrank under the control's fixed top-right corner.
   - Now it takes the first corner of the email cell that is clear of the lettering: top right, then bottom right.
   - With neither corner free, it steps back: not shown, no pointer. It stays in the tab order, and focusing it
     attends the email, which then has room.
   - Example: `fixed/1920x1080-github-attended-copy.png`.
2. **At 21:9 the email took 13 % of the sheet's height**, against 9.5 % on 16:9. It is the one line that spans the
   sheet, so its size follows the width.
   - It now stops at 10 % of the height (`EMAIL_CAP_H`, `engine/lab/finale/plotter.js`).
   - This does not bind at 16:9 or narrower; of the measured sizes it only changes 3440×1440 (189 → 144 px).
3. **At 360 px the foot's status ran onto two lines.**
   - The band is now kept to one line. On a phone it uses the home strip's own measure (10 px, .04em), which fits the
     status whole at 360 px.
   - Below 360 px the status ends in an ellipsis, as the home strip's does.
   - Still: `fixed/360x780-foot-one-line.png`.
4. **The attention rule now follows the pointer, not the sheet's shape** (see below). A touch tablet held
   landscape had no way to attend at all: it has no hover, and a tap acts.

## Attention: scroll or cursor

The pointer decides, fresh on every resize:

- **All pointers coarse** (a phone, or a tablet in the hand, in either orientation): attention is carried by
  scroll. The track runs on into an attention stretch, and a tap only acts.
- **Any fine pointer** (`any-pointer: fine` or `hover: hover`: a mouse, a trackpad, or an iPad with its trackpad
  connected): attention is carried by the cursor.
- **A mouse or trackpad that turns up mid-visit** (a `pointermove` of type `mouse`) moves the page to the cursor for
  good. The track loses its attention stretch, and the frame is rebuilt.

## Performance (DPR 2, Chromium, `perf.json`, `tools/diag/perf-large.cjs`)

Figures are the frame-time p95 from the page's own HUD, which times the finale's frame work. Each cell shows three
runs, in ms.

| size | sweep 0 → 1 → 0 | attention moving between fields |
|---|---|---|
| 1440×900 (reference) | 1.0 / 0.9 / 0.9 | 3.2 / 3.2 / 3.0 |
| 1920×1080 | 1.7 / 1.3 / 1.0 | 3.4 / 4.1 / 4.5 |
| 2560×1440 | 3.0 / 3.5 / 4.5 | 10.1 / 11.1 / 11.4 |

Every run is under 16 ms, so no DPR limit was added. The heaviest case is attention at 2560×1440, where the soaks
follow the attended field.
