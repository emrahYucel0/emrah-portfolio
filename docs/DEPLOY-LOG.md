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

**Note 1 — `885b14b`.** Recorded from evidence rather than from a log: the package exists dated 2026-09-25, and
`release-backup-pre-885b14b/` is a backup of the live document root taken *before* that upload, which is only made when
an upload is about to happen. Nobody is named because nobody recorded it. Treat the date as the upload date and the
verification as unknown.

**Note 2 — what was live before this release.** `996a226` was the deployed site. In particular the Contact finale,
Linefield and the AUDIT-01 fixes were **never deployed**: `origin/main` `b04e1ed` merged the finale but was not
uploaded. So the Linefield release is the first time a visitor sees any of it, and a fault that was already present in
`b04e1ed` is still new to visitors.

## Adding a line

After an upload, append a row and fill `verified live by` only once someone has actually opened the deployed site. The
numbers come from the package itself, not from the build log:

```bash
sha256sum deploy/<package>.zip
unzip -l deploy/<package>.zip | tail -1     # file count and size
```
