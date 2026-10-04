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

**Release candidate — `df5ab32`, Cross Section (R14). NOT UPLOADED; no table row until it is.** Prepared on
2026-10-04 on `feature/cross-section`. `main` will be fast-forwarded to it; it is still checked out in another worktree.

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

## Adding a line

After an upload, append a row and fill `verified live by` only once someone has actually opened the deployed site. The
numbers come from the package itself, not from the build log:

```bash
sha256sum deploy/<package>.zip
unzip -l deploy/<package>.zip | tail -1     # file count and size
```
