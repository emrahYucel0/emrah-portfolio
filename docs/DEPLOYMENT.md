# Deployment — yucelemrah.com

## Architecture
- **Build:** Nuxt 4 with `ssr: true`, used only at build time. `nuxt generate` prerenders every page to static HTML.
- **Output:** `.output/public/` is the whole website. HTML, JS, CSS, fonts, media, `robots.txt`, `sitemap.xml`, `404.html` and the Apache `.htaccess` rules.
- **Production:** static files on shared cPanel hosting (Apache / LiteSpeed). There is **no Node process, no Nitro server, no PM2, no API, no database**. The hosting's *Setup Node.js App* feature is not used.
- **The host answers `403` to AI crawlers and to anything that does not look like a browser.** curl, headless
  browsers, link checkers and scrapers are refused at the edge, before the request reaches the files. **This is a
  live, healthy site refusing a stranger. It is not an empty document root and it is not a deployment failure.**
  It has been mistaken for one. Judge the site in a real browser; treat every `403` from a tool as a statement
  about the client, never about the site. The checks in this document send an ordinary browser User-Agent for
  exactly this reason, and report a `403` as BLOCKED rather than as a failure.
- **Site origin:** `https://yucelemrah.com`, non-www, HTTPS. It is set once in `shared/site.ts` (`PRODUCTION_ORIGIN`) and can be overridden at build time with `NUXT_PUBLIC_SITE_URL`, HTTPS only. Canonicals, hreflang, Open Graph, JSON-LD, the sitemap, `robots.txt` and the redirects all derive from it.

## Build
```bash
npm ci
npx nuxt typecheck
npm run generate          # → .output/public   (Linefield ON, Cross Section ON — see below)
```

**Linefield is on by default.** `npm run generate` builds the release *with* the passage; there is no variable to
remember and no way to publish the site without it by forgetting one. The only way to build without it is to say so:

```bash
NUXT_PUBLIC_LINEFIELD=0 npm run generate    # a flag-off build, for the gate's flag-off half
```

A release build must show Linefield's code in the package — `grep -ril uLFmode .output/public/_nuxt/*.js` finds it —
and a flag-off build must not.

**Cross Section is on by default too** (R14, released the same way as Linefield in R25). `npm run generate` builds the
release *with* the passage between Work and the Lab. The one-line off switch brings back the Work → Lab bridge,
byte for byte as it was:

```bash
NUXT_PUBLIC_CROSS=0 npm run generate        # a build without Cross Section (the bridge), for the gate's flag-off half
```

A release build must show Cross Section's code in the package — `grep -ril cs-still .output/public/_nuxt/*.js` finds
it (its own chunk) — and a `NUXT_PUBLIC_CROSS=0` build must not. Both switches are independent; a fully flag-off
build, the one compared with the previous live package, sets both to `0`.
The build log ends with `production files for https://yucelemrah.com: robots.txt, sitemap.xml, 404.html, .htaccess (CSP with N script hashes)`.

The CSP script hashes are computed from the generated HTML. A new build always ships its own matching `.htaccess`: **never deploy HTML from one build with the `.htaccess` of another.**

### Pre-deploy: prove the policy matches the documents
```bash
node tools/diag/cspboot.cjs --dir .output/public     # exit 0 required
```
No server, no browser: it reads the `.htaccess` in the artifact, hashes every **executable** inline script in every
HTML file beside it, and fails if the policy does not name them all. Run it on the exact artifact you are about to
zip, and again on the unzipped contents if you repackage.

This is not hypothetical. A preview server that had been left running across a rebuild served the new HTML with
the previous build's policy: the browser refused the inline script, **no JavaScript ran at all**, inline styles
still applied and nothing 404'd — so the site looked styled and deliberate and completely dead. On the live host
the same mismatch is one forgotten file away, because the policy travels in `.htaccess` and the hashes travel in
the HTML.

Brand assets (`public/favicon.*`, `public/apple-touch-icon.png`, the manifest icons `public/icon-*.png`, and the share images `public/og/emrah-yucel-portfolio.jpg`, `…-lab.jpg`, `…-contact.jpg`) are committed. Regenerate them only on purpose, with `tools/brand-assets.cjs` (see its header).

## What goes on the server
**Upload:** the *contents* of `.output/public/`, including the hidden `.htaccess` files:
- `.htaccess`
- `_nuxt/.htaccess`
- `opt/.htaccess`

**Never upload:** `node_modules`, `.git`, `.nuxt`, `.output/server` (if present), source files, `docs/`, `tools/`, test evidence, `.env*`.

## Document root
Status: **UNKNOWN until checked in cPanel.**

cPanel → *Domains* → `yucelemrah.com` → **Document Root** column, usually `public_html` for the main domain, or `public_html/<folder>` for an addon domain. The site lives directly in that folder: `index.html`, `tr/`, `en/`, `_nuxt/`, …

## Upload: updating the live site

The site is live. This replaces its files in place, so the backup is the part that matters: it is the only way
back. Do steps 1 and 2 before deleting anything.

### 1 · Take a full backup, and prove it is real
1. cPanel → *File Manager* → the document root (cPanel → *Domains* → `yucelemrah.com` → **Document Root**).
2. **Write down what is there now:** File Manager shows the item count at the bottom of the listing. Note it, and
   turn on *Settings → Show Hidden Files (dotfiles)* first so the `.htaccess` files are counted.
3. Select all → *Compress* → **Zip Archive** → name it `backup-YYYYMMDD.zip`. Let it finish.
4. **Download it to your machine.** A backup left on the server is not a backup.
5. **Check it before you trust it.** Open the downloaded zip and compare against what you wrote down in step 2:
   - the **file count** should match the live listing, including the three `.htaccess` files;
   - the **size** should be in the same range as the site you are replacing — the current artifact is ~9 MB, so a
     live backup is megabytes, not kilobytes.

   > **A live site cannot produce a tiny backup. If the zip is a few kilobytes, or holds a handful of files, STOP.**
   > Something went wrong — the wrong folder, a permissions error, or a compress that silently skipped dotfiles.
   > Do not delete anything. Find out why first. You will not get a second chance at the old files.

### 2 · Clear the old site
With the verified backup on your machine, delete from the document root:
- `index.html`, `404.html`, `robots.txt`, `sitemap.xml`, the favicons and `apple-touch-icon.png`;
- the folders `_nuxt/`, `opt/`, `tr/`, `en/`, `og/`, `fonts/`, `tone/`;
- `_payload.json`, and the root `.htaccess` (the new build ships its own).

**Keep, and do not touch:**
- **`.well-known/`** — SSL/AutoSSL validation lives here. Deleting it can break certificate renewal.
- **`cgi-bin/`** — created by cPanel; harmless, and its absence confuses some panels.
- anything you did not put there and do not recognise — mail folders, `error_log`, panel files. If it is not in the
  list above, leave it.

### 3 · Upload and extract
1. File Manager → *Upload* → `deploy/yucelemrah-<short-commit>.zip` into the document root.
2. Select the uploaded zip → *Extract* → into the document root.
3. Delete the zip from the server.

`index.html` is at the zip root, so the files land directly in the document root — not inside a nested folder.
If you see `public/` or a folder named after the zip, the extract went one level too deep: move the contents up.

### 4 · Confirm the three `.htaccess` files
File Manager → *Settings* → **Show Hidden Files (dotfiles)**, then confirm all three exist:
- `.htaccess` (document root) — redirects, clean URLs, 404, CSP
- `_nuxt/.htaccess` — a year of immutable caching for fingerprinted assets
- `opt/.htaccess` — a week for media

**If the root `.htaccess` is missing, the site will serve with the wrong headers and no CSP.** Re-upload it alone
rather than re-extracting everything.

### 5 · Then run the post-deploy checks
See *Post-deploy verification* below. Read its note about `403` before reading its results.

FTP/SFTP works equally well: upload the contents of the zip to the document root, hidden files included.

## Rollback — restoring the backup
The site is static and there is no database, so a rollback is a file swap.

1. File Manager → document root → delete the files listed in step 2 above (again keeping `.well-known/` and
   `cgi-bin/`).
2. *Upload* `backup-YYYYMMDD.zip` → *Extract* into the document root → delete the zip.
3. Confirm the three `.htaccess` files are back (*Show Hidden Files*).
4. Hard-refresh. HTML is revalidated on every request and `_nuxt/` assets are fingerprinted, so old and new never
   mix and no cache needs clearing.

**If only `.htaccess` is at fault** — a 500, a redirect loop, a CSP that blocks the inline script — rename it to
`.htaccess.off`. The site then serves with default server behaviour, losing the redirects and caching but staying
up, while you fix `modules/production-files.ts` and rebuild.

**If the site is up but dead** — the page renders, styled, and nothing responds — that is the CSP not matching the
HTML. The policy and the documents must come from the same build. Roll back, then run
`node tools/diag/cspboot.cjs --dir .output/public` locally before packaging again.

## Redirects, cache, compression, headers
All of this is in the generated `.htaccess`, verified on Apache 2.4 (`docs/M5-REPORT.md` § L–N). Every module-dependent block is wrapped in `<IfModule>`.

| Area | Behaviour |
|---|---|
| Redirects | `http://` and `www.`, in any combination → **one 301** to `https://yucelemrah.com<path><query>` |
| Clean URLs | `/tr` is served in place; `/tr/` → one 301 to `/tr`. Unknown URLs and bare directories → real **404** with `/404.html`. **No SPA fallback.** |
| Cache | HTML and `_payload.json`: `max-age=0, must-revalidate`. `_nuxt/*` (fingerprinted): 1 year, `immutable`. `opt/*` media: 7 days. Icons, OG image, `robots.txt`, `sitemap.xml`: 1 day. |
| Compression | Brotli, else gzip, for text types only |
| Security headers | `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `X-Frame-Options`, and an enforced `Content-Security-Policy` (self-hosted only, hashed inline scripts) |
| HSTS | **Not enabled at first launch.** After SSL, the redirects and a few weeks of stable HTTPS, add to the root `.htaccess` inside `<IfModule mod_headers.c>`: `Header always set Strict-Transport-Security "max-age=31536000"` (add it to the module so it survives rebuilds) |

If the site shows **500** right after upload, rename `.htaccess` → `.htaccess.off` to confirm it is the cause. Then open cPanel → *Errors* (or `error_log`) for the offending line, fix it in `modules/production-files.ts`, and rebuild.

## SSL
cPanel → *SSL/TLS Status*: `yucelemrah.com` and `www.yucelemrah.com` must both show a valid certificate (AutoSSL). On 2026-09-16 the live certificate was Let's Encrypt for `yucelemrah.com`, valid until 2026-12-15, and `www` also verified.

## Mail: info@yucelemrah.com
Records published in DNS on 2026-09-16 (provider: Cenuta, nameservers `ns66/ns67.tr.dnsowner.com`):

| Record | Value found | Action |
|---|---|---|
| MX | `yucelemrah.com` (priority 0) | keep (the provider's own) |
| SPF (TXT @) | `v=spf1 include:_spf.cenuta.com -all` | keep; exactly **one** SPF record |
| DKIM | `default._domainkey` TXT (RSA key) | keep; check cPanel → *Email Deliverability* shows it "valid" |
| DMARC | `_dmarc` TXT `v=DMARC1; p=none;` | keep `p=none` while testing (see below) |

**Steps:**
1. cPanel → *Email Accounts* → confirm `info@yucelemrah.com` exists, or create it. Store its password in your own password manager, never in this repository.
2. cPanel → *Email Deliverability* → `yucelemrah.com` must show **Valid** for DKIM and SPF. Use *Repair* only with values the panel itself generates; never type invented values.
3. Tests, each recorded as PASS / FAIL:
   - Gmail → info@ (arrives in Inbox, not Spam)
   - info@ → Gmail (Inbox; Turkish characters in subject and body intact; display name correct)
   - reply both ways
   - one more provider (Outlook / iCloud)
4. In Gmail open the message from info@ → ⋮ → **Show original**: `SPF: PASS`, `DKIM: PASS`, `DMARC: PASS`.
5. **DMARC** after about 2 weeks of consistent passes:
   - move to `v=DMARC1; p=quarantine;`, later `p=reject;`;
   - add `rua=mailto:<an existing mailbox>` only if you want reports; never use an address that does not exist.
6. **mailto:** click `info@yucelemrah.com` on the site from desktop and from the phone; the mail app opens with the address filled in.

## Post-deploy verification

> ### Read this before reading any result
> **The host refuses clients that do not look like a browser, with `403`.** Every command below therefore sends an
> ordinary desktop-browser User-Agent, and `cspboot.cjs` does the same for its plain requests and for the browsers
> it drives — Playwright's default agent says `HeadlessChrome`, which is precisely what gets refused.
>
> **A `403` from any of these is reported as BLOCKED BY HOST, and is never evidence that the site is broken.**
> `cspboot` exits `2` for that case, separately from `1` for a real failure. The only thing a block proves is that
> the request did not look like a visitor. **When a check is blocked, the site is judged by opening it in a real
> browser — that check decides, and nothing here overrides it.**

Run from any machine (`-I` headers only):
```bash
UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36'

for u in http://yucelemrah.com/ http://www.yucelemrah.com/ https://www.yucelemrah.com/ https://yucelemrah.com/; do
  curl -sI -A "$UA" -o /dev/null -w "$u -> %{http_code} %{redirect_url}\n" "$u"; done   # three 301 → https://yucelemrah.com/, one 200
for p in / /tr /en /tr/about /en/about /robots.txt /sitemap.xml /favicon.ico /og/emrah-yucel-portfolio.jpg /this-page-does-not-exist-m5-test; do
  curl -s -A "$UA" -o /dev/null -w "$p -> %{http_code}\n" "https://yucelemrah.com$p"; done  # 200 … and 404 for the last
curl -sI -A "$UA" -H "Accept-Encoding: br, gzip" https://yucelemrah.com/tr | grep -iE "content-encoding|cache-control|content-security-policy"
```
A `403` here means the same thing it means everywhere else in this document: the host did not recognise the
client. Try it in a browser before concluding anything.
### Does the live site actually boot?
```bash
cd tools/diag
node cspboot.cjs --static https://yucelemrah.com            # the served policy names the served scripts
node cspboot.cjs https://yucelemrah.com chrome              # /tr and /tr/lab, runtime up, 0 CSP violations
node cspboot.cjs https://yucelemrah.com webkit              # the same, in the engine iOS uses
```
Exit `0` passes, `1` is a real failure, **`2` means the host blocked the client** — re-check by hand, and do not
record it as a site problem. The browser runs assert what a visitor gets, not what the headers promise: on `/tr` the
runtime owns the screen (`data-c2` on, no document scrollbar) and on `/tr/lab` the bench has sized its own canvas
and spread its records. A page whose inline script was refused still renders its markup and its inline styles —
it just does nothing — so "the HTML looks right" is not evidence and these checks exist because of it.

Then check each item below:
- the view source of `/tr`: canonical `https://yucelemrah.com/tr`, hreflang `tr-TR` / `en` / `x-default`, `og:image` absolute;
- the browser console on `/tr` and `/en`: 0 errors, 0 CSP messages;
- PageSpeed Insights, mobile and desktop, for `/tr` and `/en` (a new domain has no field data yet; that is normal);
- iPhone 7 Plus / Safari smoke:
  - load, Creative, Full-Stack, Work, a project, Lab video, Contact, TR/EN, About/Back;
  - hold on Work and Lab, then swipe (the M3 bug must not return);
- share `https://yucelemrah.com/tr` in a private chat or a card validator: the OG image and title appear.

## The deployment log

Every upload is recorded in [DEPLOY-LOG.md](DEPLOY-LOG.md): date, commit, package, SHA-256, file count, size, and who
confirmed it live. A package that was built but not uploaded is not a line in it. This exists because
`deploy/yucelemrah-996a226.zip` was live and unrecorded, and a later session had to infer what visitors were seeing from
file dates and a backup folder.

## Checklist
- **PRE-BUILD:** clean `git status`; `NUXT_PUBLIC_SITE_URL` unset (or the intended HTTPS origin); `npm ci`
- **BUILD:** `npx nuxt typecheck` exit 0; `npm run generate` exit 0; log shows the production-files line
- **BUILD (Cross Section):** on by default — confirm it is IN the package (`grep -ril cs-still .output/public/_nuxt/*.js`
  returns at least one file) and that Work → Cross Section → the bench, and back up, works in the artifact being shipped
- **BUILD (Linefield):** on by default — confirm it is IN the package (`grep -ril uLFmode .output/public/_nuxt/*.js`
  returns at least one file) and that Full-Stack → Linefield → Work works in the artifact being shipped
- **PRE-UPLOAD:** `.output/public` contains `.htaccess`, `_nuxt/.htaccess`, `opt/.htaccess`, `404.html`, `robots.txt`, `sitemap.xml`, `og/`, favicons; no `200.html`
- **PRE-UPLOAD (CSP):** `node tools/diag/cspboot.cjs --dir .output/public` exit 0 — the policy names every inline script in the artifact it ships with
- **PRE-UPLOAD (payload):** no `tools/`, no `*.cjs`, no `lab/proof` route in the artifact; no wheel log (`grep -rl "WHEEL LOG" .output/public` finds nothing — `NUXT_PUBLIC_WHEELLOG` must be unset for a release build)
- **UPLOAD:** document root identified; backup downloaded **and its size and file count checked against the live listing — a tiny backup means STOP**; old files cleaned keeping `.well-known/` and `cgi-bin/`; zip extracted; three `.htaccess` confirmed
- **AFTER UPLOAD:** append a line to `docs/DEPLOY-LOG.md` — date, commit, package, SHA-256, file count, size —
  and fill `verified live by` only after opening the deployed site yourself
- **DNS/SSL:** A record → hosting IP; AutoSSL valid for apex and www
- **MAIL:** mailbox exists; Email Deliverability valid; inbound / outbound / auth tests recorded
- **POST-DEPLOY:** redirect matrix; status matrix; 404 is a real 404; console clean; `cspboot.cjs --static <origin>` and `cspboot.cjs <origin> chrome|webkit` exit 0 (**exit 2 = blocked by host** — judge in a real browser, never record it as a site failure)
- **SEO:** `robots.txt` and `sitemap.xml` reachable; canonical and hreflang in page source; OG preview renders
- **PERFORMANCE:** PageSpeed mobile + desktop recorded (lab); field data only if it exists
- **REAL DEVICE:** iPhone smoke, including Work / Lab hold → swipe
- **FINAL:** backup of this deployment kept for the next rollback
