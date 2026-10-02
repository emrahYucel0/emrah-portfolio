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

**Note 1 — `885b14b`.** Recorded from evidence rather than from a log: the package exists dated 2026-09-25, and
`release-backup-pre-885b14b/` is a backup of the live document root taken *before* that upload, which is only made when
an upload is about to happen. Nobody is named because nobody recorded it. Treat the date as the upload date and the
verification as unknown.

**Note 2 — what was live before the Linefield release.** `996a226` was the deployed site. In particular the Contact
finale, Linefield and the AUDIT-01 fixes were **never deployed**: `origin/main` `b04e1ed` merged the finale but was
not uploaded. So `b8918dc` is the first time a visitor saw any of it, and a fault that was already present in
`b04e1ed` was still new to visitors.

**Note 3 — `b8918dc`, the Linefield release.** The first upload to carry the Contact finale, the Linefield passage
(on by default, R25), both AUDIT-01 fix rounds and the R7 bench. Verified after upload, from this machine:

```
node tools/diag/cspboot.cjs --static https://yucelemrah.com   PASS  /tr, /tr/lab, /en — every inline script named
node tools/diag/cspboot.cjs https://yucelemrah.com chrome     PASS  __lab up, data-c2 on, no document scrollbar
node tools/diag/cspboot.cjs https://yucelemrah.com webkit     PASS  the same, and the bench's canvas sized by its script
```

and the live spine reads `name · creative · system · linefield · work · lab · rest`, `/tr/contact` answers 200, with
no page errors. `origin/main` was fast-forwarded to `b8918dc` before the upload.

## Adding a line

After an upload, append a row and fill `verified live by` only once someone has actually opened the deployed site. The
numbers come from the package itself, not from the build log:

```bash
sha256sum deploy/<package>.zip
unzip -l deploy/<package>.zip | tail -1     # file count and size
```
