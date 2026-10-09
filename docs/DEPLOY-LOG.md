# Deployment log

One line per **upload**, newest last. A package that was built but never uploaded does not belong here — that is what
made this file necessary: `deploy/yucelemrah-996a226.zip` existed, was almost certainly live, and nothing recorded it,
so a later session had to reason from file dates and backup folders to work out what visitors were actually seeing.

Each line carries the date, the commit the package was built from, the package name, its SHA-256 (first 16 hex digits is
enough to identify it; the full digest goes beside the package), the file count and size, and **who confirmed it live**.
"Verified" means someone loaded the deployed site and checked it, not that the upload reported success.

| date | commit | package | SHA-256 | files | size | verified live by |
|---|---|---|---|---|---|---|
| 2026-09-25 | `885b14b` | `yucelemrah-release-885b14b.zip` | `ac015ec0040de7ea…` | 184 | 8.7 MiB | — (see note 1) |
| 2026-09-26 | `996a226` | `deploy/yucelemrah-996a226.zip` | `64523944d3f5c0a3…` | 184 | 8.7 MiB | Emrah Yücel, via cPanel, after the site-polish release |
| 2026-10-03 | `b8918dc` | `deploy/yucelemrah-b8918dc.zip` | `08b27a0274508771…` | 219 | 8.9 MiB | Emrah Yücel, via cPanel, after checking it on his iPhone |
| 2026-10-03 | `1e663bd` | `deploy/yucelemrah-1e663bd.zip` | `cd150812ff38b68d…` | 219 | 8.9 MiB | Emrah Yücel, via cPanel, after checking it on his iPhone |
| 2026-10-04 | `df5ab32` | `deploy/yucelemrah-df5ab32.zip` | `9a627488d516721a…` | 220 | 8.9 MiB | Emrah Yücel, via cPanel, after the iPhone check of the release build (see note 5) |
| 2026-10-08 | `e192c24` | `deploy/yucelemrah-e192c24.zip` | `aa4a642ad7673f7c…` | 220 | 8.9 MiB | Emrah Yücel, via cPanel, after the iPhone and 1920 × 991 check of the release build (see note 6) |
| 2026-10-08 | `fd9b2e6` | `deploy/yucelemrah-fd9b2e6.zip` | `13c58e5a7f7cbbae…` | 220 | 8.9 MiB | Emrah Yücel, via cPanel, after the iPhone check of the release build (see note 7) |

**Note 1 — `885b14b`.** Recorded from evidence rather than from a log: the package exists dated 2026-09-25, and
`release-backup-pre-885b14b/` is a backup of the live document root taken *before* that upload, which is only made when
an upload is about to happen. Nobody is named because nobody recorded it. Treat the date as the upload date and the
verification as unknown.

**Note 2 — what was live before the Linefield release.** `996a226` was the deployed site. In particular the Contact
finale, Linefield and the AUDIT-01 fixes were **never deployed**: `origin/main` `b04e1ed` merged the finale but was
not uploaded. So `b8918dc` is the first time a visitor saw any of it, and a fault that was already present in
`b04e1ed` was still new to visitors.

**Note 4 — `1e663bd`, R28.** The 120 Hz Mac trackpad fix (the gesture floor read per frame, and a stopped stream
counted as died down). Two uploads in one day; `b8918dc` was live for a few hours between them. Verified after
upload, from this machine:

```
node tools/diag/cspboot.cjs --static https://yucelemrah.com   PASS  /tr, /tr/lab, /en
node tools/diag/cspboot.cjs https://yucelemrah.com chrome     PASS
node tools/diag/cspboot.cjs https://yucelemrah.com webkit     PASS
```

and the fix's own signature was checked on the live site, not just that it boots: a stream of 95 px every 8 ms —
the shape of a 120 Hz trackpad's momentum, which is UNDER the old per-event floor and OVER the new per-frame one —
moved the index one stop. No page errors; the spine reads `name · creative · system · linefield · work · lab ·
rest`.

**R22 is still open**: this was never tried on a real MacBook. R28 is live as measured, not as confirmed on a
device, and `docs/ROADMAP.md` says so.

**Note 3 — `b8918dc`, the Linefield release.** The first upload to carry the Contact finale, the Linefield passage
(on by default, R25), both AUDIT-01 fix rounds and the R7 bench. Verified after upload, from this machine:

```
node tools/diag/cspboot.cjs --static https://yucelemrah.com   PASS  /tr, /tr/lab, /en — every inline script named
node tools/diag/cspboot.cjs https://yucelemrah.com chrome     PASS  __lab up, data-c2 on, no document scrollbar
node tools/diag/cspboot.cjs https://yucelemrah.com webkit     PASS  the same, and the bench's canvas sized by its script
```

and the live spine reads `name · creative · system · linefield · work · lab · rest`, `/tr/contact` answers 200, with
no page errors. `origin/main` was fast-forwarded to `b8918dc` before the upload.

**Note 5 — `df5ab32`, the Cross Section release (R14).** Uploaded through cPanel and verified live by Emrah Yücel on
2026-10-04. The full SHA-256 is `9a627488d516721a20bea7f18f82b76a9675e74d991127bce57f236eaf14f70c`. Verified after the
upload, from this machine:

```
node tools/diag/cspboot.cjs --static https://yucelemrah.com   PASS  /tr, /tr/lab, /en — every inline script named
node tools/diag/cspboot.cjs https://yucelemrah.com chrome     PASS  __lab up, data-c2 on, no document scrollbar
node tools/diag/cspboot.cjs https://yucelemrah.com webkit     PASS  the same, and the bench's canvas sized by its script
node tools/diag/cslive.cjs https://yucelemrah.com             PASS  (chrome and --engine=webkit)
```

- **The package:** the live build ID is `401aca0d-e5f9-42e4-b35b-7f7e6fef4ad6`, the package's own.
- **The spine** reads `name · creative · system · linefield · work · cross · lab · rest`.
- **The way, in both engines:**
  - Work's last work → the bench in five gestures, through positions 0–4, with the blinds drawn (36 frames in Chrome,
    23 in WebKit);
  - one gesture up from the bench arrives at Cross Section at DEPTH;
  - console clean.
- `origin/main` was at `1299dd7` before the upload. The package is built from `df5ab32`, and every commit after it is
  documentation, or a harness outside the build.

Prepared as a release candidate on 2026-10-04 on `feature/cross-section`; `main` was fast-forwarded to it once the
other worktree had released `main`.

- **What is new:** between Work and the Lab, **Cross Section**, a passage of louvers (SURFACE → EDGE → DEPTH).
  - It is reached by scrolling, five gestures each way. A hard flick never skips the EDGE moment.
  - Past DEPTH, blinds open onto the Lab bench; up from the bench they close over it again.
  - Reduced motion shows each position as a cut, with an EDGE still.
  - It replaces the Work → Lab bridge. `docs/CROSS-SECTION.md` has the record.
- **On by default** (`nuxt.config.ts`). `NUXT_PUBLIC_CROSS=0 npm run generate` is the one-line off switch: that build is
  byte-identical in JS and CSS to the live `1e663bd` package.
- **Package:** `deploy/yucelemrah-df5ab32.zip`, SHA-256 `9a627488d516721a…`, 220 files, 8.9 MiB (10,257,048 bytes
  unpacked). `cspboot --dir` PASS on the build and on the unpacked zip.
- **Gate:** the full gate on this build, flag on, in four groups on a quiet machine. Everything passes but two known,
  recorded cases, both shared with the live package: LAB A11Y's `.hint` sample and GESTURE's fast-flick cases.
  `docs/CROSS-SECTION.md` has the record.
- **Before upload:** the user's own check on the iPhone (LAN preview `http://192.168.1.5:4964/tr`). Then fast-forward
  `main`, push only when asked, and upload by `docs/DEPLOYMENT.md`'s checklist.
- **Approved for release by the user after the iPhone check (2026-10-04).** The upload is done by hand, through cPanel.
- **Built from `df5ab32`; the commits after it are documentation only.** `main` was fast-forwarded to `4521323` and
  then to the commit that records this. `git diff --stat df5ab32..4521323` touches only `docs/CROSS-SECTION.md`,
  `docs/DEPLOY-LOG.md`, `docs/KNOWN-ISSUES.md` and `docs/ROADMAP.md`. The commits after that touch only
  `docs/` and `tools/diag/hintaa.cjs`, a harness that is never part of the build. The package's name and SHA-256 above
  stand for `df5ab32`; a build of `main`'s tip produces the same code.

**Note 6 — `e192c24`, the image-quality round (R9, R19, R20, R21, R29).**
- **Uploaded through cPanel and verified live by Emrah Yücel on 2026-10-08.**
- **Package:** `deploy/yucelemrah-e192c24.zip`, built from `e192c24`, SHA-256
  `aa4a642ad7673f7c4c260d03f232b91d203b72331396041f5b357969c72137fd`.
- **Checked after the upload:**
  - `cspboot.cjs https://yucelemrah.com` passes in Chrome and in WebKit, and `--static` passes.
  - The live `/tr` is byte-identical to the package's `tr/index.html`, with build ID `2aa62eca-f869-4653-91dc-7d805d9149a1`.
  - The host answers requests without a browser User-Agent (plain `curl`) with 403. That is the host's filtering,
    not the site.

**Note 7 — `fd9b2e6`, the R30 hotfix (the phone stuck at the end of Linefield).**
- **Uploaded through cPanel and verified live by Emrah Yücel on 2026-10-08,** after an iPhone check of the release
  build on the LAN preview.
- **Package:** `deploy/yucelemrah-fd9b2e6.zip` (in `emrah-portfolio-r15/deploy`), built from `fd9b2e6`, SHA-256
  `13c58e5a7f7cbbaeaec921661592284cf28d5d520c5af48629ae9fee370b8c3c`.
- **Checked after the upload:**
  - `cspboot.cjs --static https://yucelemrah.com`, and `cspboot.cjs https://yucelemrah.com` in Chrome and in WebKit:
    all PASS (`tools/diag/out/r15/live-fd9b2e6/`).
  - The live `/tr`, `/en` and `/tr/lab` are byte-identical to the package, build ID
    `caa006a3-5080-4794-b86c-fd9a2531dee1`. The runtime chunk carrying the fix (`_nuxt/INhCaMMk.js`) is served
    byte-identical; `e192c24`'s chunk (`CH-jZXya.js`) answers 404.

## Release — `e192c24`, the image-quality round (R9, R19, R20, R21, R29). Uploaded and verified live (note 6).

- **Approved for release by the user (2026-10-08),** after the user's own check of the release build on the iPhone and
  on the 1920 × 991 desktop.
- **Pushed:** `main` to `origin` at `95a825f`, fast-forward from `8da676c`, no force. `git ls-remote origin
  refs/heads/main` returns `95a825f402f19302d133623ac38144fd44387dd3`.
- **The package `deploy/yucelemrah-e192c24.zip` was built from `e192c24`.** The commits after it, up to `95a825f`, are
  documentation only: `git diff --name-only e192c24..95a825f` lists only `docs/` files. A build of `95a825f` produces
  the same code.
- **The upload is the user's, by hand through cPanel.** The table row is added once it is done and the site has been
  opened live.

The candidate's record follows.

Prepared 2026-10-07/08 on `feature/image-quality`.
- **`main`:** fast-forwarded locally to `e192c24`, and then to the commits that record this, which are documentation
  only. Nothing is pushed: `origin/main` is still `8da676c`.
- **Not in the table above:** a row is added only after an upload.

- **Package:** `deploy/yucelemrah-e192c24.zip`.
  - SHA-256 `aa4a642ad7673f7c4c260d03f232b91d203b72331396041f5b357969c72137fd`
    (`deploy/yucelemrah-e192c24.zip.sha256`).
  - 220 files, 10,267,497 bytes unpacked, 9,336,991 bytes zipped (8.9 MiB). No `axe.min.js` in it.
  - `cspboot --dir` PASS on the build (`builds/release-e192c24`) and on the unpacked zip
    (`builds/release-e192c24-unzipped`, byte-identical to the build).
- **Built from `main` at `e192c24`.** Identical in code to `builds/iq-final4`, the build every check of the round ran
  on: all 39 JS and CSS files are byte-identical. The other 44 differing files differ only in the build ID, the
  timestamps and the CSP hashes derived from them.
- **What is new for a visitor:**
  - The rows no longer shimmer as they move (R9).
  - No halo at the capsules (R19).
  - Large screens draw at most a 4K screen's pixels, and an integrated GPU steps the ratio down at rest (R20).
  - Linefield's words are at most 24 rows per capital on large screens, hung from their label (R21). This includes a
    1920 × 991 desktop.
  - Reduced motion: tone rows thicken as in normal motion (R29), and each cut paints once.
  - `docs/IMAGE-QUALITY.md` has the record.
- **Gate** (2026-10-07, RTX 4050; the other project stopped, the desktop's Chrome open at the user's request). Logs
  are in `tools/diag/out/iq/release/`.
  - **`run6.sh` on the release build (flag on), 46 min: every section PASS**, GESTURE and LAB A11Y included.
    NON-LAB REVIEW ×2.
  - **`run6.sh` with `NUXT_PUBLIC_LINEFIELD=0` (40 min) and `NUXT_PUBLIC_CROSS=0` (45 min):** every section PASS
    but GESTURE (5 and 3 failures) and NON-LAB REVIEW.
  - **GESTURE side by side** with the same flag-off builds of the live code (8da676c ≡ df5ab32, built in
    `emrah-portfolio-cross`), two alternating runs each:
    - Linefield off: release 8 and 5 failures, live 3 and 7.
    - Cross Section off: release 1 and 0, live 2 and 5.
    - Both builds fail the same ways: "down from Cross Section, the axis moved 2", and flicks or long gestures
      that travel two stops (or, from the bench, two back).
    - The exact cases change from run to run on both. A few release cases did not recur as the same case on the
      live builds in two runs: from name down two stops, from Work up two, from Full-Stack coasting up two. The same
      moves did occur on live from other places (Creative 1 → 3, Full-Stack 2 → 4, Work 4 → 2).
  - **NON-LAB:** the live package against the same `pre-site-polish` baseline also reports a state difference at
    all 7 stops (the spine's new places). The release only adds pixel differences where R9/R19 change the rows
    (Creative, Full-Stack, Work).
  - **This round's checks on the release build:**
    - PASS: `linefield.cjs` 180/180, `lfwords-locale`, `lfseam`, `lfresponsive` phones / tablets / laptops,
      `cross.cjs` WebKit, `csseam`, `r9webkit`, `iqhalo` (R19 values), `r9flat` (reduced within 2% of normal;
      Linefield dark +3.9–6.1%).
    - Known: `lfresponsive` wide `rust50` at 1920×1080 (identical on 8da676c); `cross.cjs` Chrome @2 / @1
      "fallback forced"; `csrotate` "held → landscape".
    - `iqr9.cjs` against the live package (moving rows' frame-to-frame change, p50, live → release):
      - transition 29.3 → 2.1% / 26.2 → 1.0%;
      - scroll 16.1 → 0.4% / 5.6 → 0.3%;
      - passage 25.6 → 3.4% / 29.2 → 1.5%;
      - ripple (1440×900@2) 8.0 → 1.4%.
  - **Reduced-motion cuts against the live package:** recorded in `docs/IMAGE-QUALITY.md`.
- **Before upload:** the user's own check of the release build, on the iPhone (LAN preview
  `http://192.168.1.5:4973/tr`, `builds/release-e192c24` served `--lan --wk`) and on the 1920 × 991 desktop. Then the
  push of `main`, when the user confirms it, and the upload by hand through cPanel by `docs/DEPLOYMENT.md`'s checklist.

## Release — `fd9b2e6`, hotfix: the phone stuck at the end of Linefield (R30). Uploaded and verified live (note 7).

Prepared 2026-10-08 on `fix/lf-touch-edge` (worktree `emrah-portfolio-r15`), cut from `main` 58a266c (= live
`e192c24` plus documentation). `main` is not moved and nothing is pushed.
- **Package:** `deploy/yucelemrah-fd9b2e6.zip` (in the worktree; `deploy/` is ignored).
  - SHA-256 `13c58e5a7f7cbbaeaec921661592284cf28d5d520c5af48629ae9fee370b8c3c`
    (`deploy/yucelemrah-fd9b2e6.zip.sha256`).
  - 220 files, 10,267,512 bytes unpacked, 9,337,059 bytes zipped (8.9 MiB). The three `.htaccess` files are in it; no
    `tools/`, `*.cjs`, `axe` or `lab/proof`.
  - `cspboot --dir` PASS on the build (`builds/release-fd9b2e6`) and on the unpacked zip
    (`builds/release-fd9b2e6-unzipped`, byte-identical to the build).
- **Built from `fd9b2e6`** (`npx nuxt typecheck` 0, `npm run generate` 0, Linefield and Cross Section in the package).
  Against the live `e192c24` build: same 220 paths, and of the 39 JS and CSS files 38 are byte-identical once the
  content-hashed chunk names are normalised. The one that differs adds 15 bytes, `lfEdgeY=null` at the end of the
  runtime's `pointerdown`. Later commits on the branch are a harness and documentation only.
- **What changes for a visitor:** on a phone, a swipe that reached Linefield's end late in the drag no longer leaves
  every later swipe unable to leave the passage. Nothing else.
- **Checks** (390 × 844 touch emulation and desktop, Chrome on the RTX 4050, quiet machine via `quiet.cjs`; logs in
  `tools/diag/out/r15/hotfix/`):
  - The failure, reproduced and then gone:
    - `touchjourney.cjs` new case (end reached late in a swipe, asserted; the next swipe must leave):
      live FAIL at both ends, fd9b2e6 PASS.
    - The same case repeated: live 5 times per end, 0 of 10 left; fd9b2e6 25 times per end, 50 of 50 left.
    - The natural walk (from the near end, swipe after swipe, slow drag): live stuck in 2 of 10; fd9b2e6 0 of 30.
  - `touchjourney.cjs` PASS (the rest identical to live).
  - `linefield.cjs` 180/180.
  - `journey.cjs` TR and EN PASS (WebKit).
  - `cspboot` Chrome and WebKit PASS.
  - `touch.cjs` 3 failures, **identical on the live build**: its expectations predate Cross Section (up from the
    bench "→ Work", now the passage at DEPTH; "hard flick down from cross").
  - Not run: the full gate, `gesture2`, `trackpad`, `freespin` and reduced motion. The change is one touch-only
    statement on Linefield builds, and no wheel or keyboard path reads it.
- **Before upload:** the user's iPhone check of the release build on the LAN preview
  (`builds/release-fd9b2e6` served `--lan --wk` on 4983), then the push when the user confirms it, and the upload by
  hand through cPanel by `docs/DEPLOYMENT.md`'s checklist.

## Candidate — `bcb8f90`, R15: the notch rule, one notch one work, indicator A. NOT UPLOADED.

Prepared 2026-10-10 on `feature/r15-tempo` (worktree `emrah-portfolio-r15`), on top of `main` f492799 (= live
`fd9b2e6` plus documentation). Nothing is pushed; `main` is not moved.
- **Package:** `deploy/yucelemrah-bcb8f90.zip` (in the worktree; `deploy/` is ignored).
  - SHA-256 `490a50f37a619c119ac5bc4f27f71614528af3aa9889e3ec16aebc46e6993305` (`deploy/yucelemrah-bcb8f90.zip.sha256`).
  - 220 files, 10,269,394 bytes unpacked, 9,337,588 bytes zipped (8.9 MiB). The three `.htaccess` files are in it;
    no wheel log, no `?r15` prototype, no `*.cjs`, no `200.html`.
  - `cspboot --dir` PASS on the build (`builds/release-bcb8f90`) and on the unpacked zip (byte-identical to it).
- **Built from `bcb8f90`** (`npx nuxt typecheck` 0, `npm run generate` 0, `NUXT_PUBLIC_WHEELLOG` unset, Linefield
  and Cross Section in). Its 39 JS and CSS files are byte-identical, chunk names normalised, to `builds/r15-rc3`, the
  build every proof run used.
- **What changes for a visitor** (`docs/TEMPO.md`):
  - One deliberate wheel notch is one stop at any pace, a 100 px Windows detent and Firefox's 96 px included; slow
    notches no longer move backwards.
  - A free-spinning wheel's late detents no longer each land a stop.
  - In the work field one notch is one work, and a hard trackpad flick no longer skips the middle work; a gentle
    trackpad feels as before.
  - The top strip marks the section the visitor is in (İŞLER, HAKKIMDA, LAB, İLETİŞİM), with `aria-current`.
- **Checks:**
  - **Proof, rc3 against the live build, alternating, quiet machine** (`tools/diag/out/r15/proof4/`): `freespin`
    ×2, the Work tail repeats ×2, Work `trackpad` ×2, `gesture2` Work cases ×2, full `gesture2` ×2 (with the 100 px
    section and the slow-notch rhythms), `trackpad` at every other place ×1 (the user cut the second pair for time),
    `touch`, `touchjourney`, `workfeel`.
    - No overshoot appeared only on rc3; every failure was re-run alone.
    - Overshoots on both builds, recorded as live issues: "long up from work", "coast up from linefield",
      "long down from Cross Section" (`docs/ROADMAP.md`, R15).
  - **On the candidate itself** (`tools/diag/out/r15/rc/`): `cspboot` Chrome and WebKit PASS; `journey.cjs` TR,
    EN and TR reduced PASS; `r15shot.cjs` (indicator A, desktop and phone, normal and reduced) PASS, 124 assertions.
- **Before upload:** the user's iPhone check on the LAN preview (`builds/release-bcb8f90` served `--lan --wk` on
  4983), then the push when the user confirms it, and the upload by hand through cPanel by `docs/DEPLOYMENT.md`.

## Adding a line

After an upload, append a row and fill `verified live by` only once someone has actually opened the deployed site. The
numbers come from the package itself, not from the build log:

```bash
sha256sum deploy/<package>.zip
unzip -l deploy/<package>.zip | tail -1     # file count and size
```
