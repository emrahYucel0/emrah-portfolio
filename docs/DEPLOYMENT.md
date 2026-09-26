# Deployment — yucelemrah.com

## Architecture
- **Build:** Nuxt 4 with `ssr: true`, used only at build time. `nuxt generate` prerenders every page to static HTML.
- **Output:** `.output/public/` is the whole website. HTML, JS, CSS, fonts, media, `robots.txt`, `sitemap.xml`, `404.html` and the Apache `.htaccess` rules.
- **Production:** static files on shared cPanel hosting (Apache / LiteSpeed). There is **no Node process, no Nitro server, no PM2, no API, no database**. The hosting's *Setup Node.js App* feature is not used.
- **Site origin:** `https://yucelemrah.com`, non-www, HTTPS. It is set once in `shared/site.ts` (`PRODUCTION_ORIGIN`) and can be overridden at build time with `NUXT_PUBLIC_SITE_URL`, HTTPS only. Canonicals, hreflang, Open Graph, JSON-LD, the sitemap, `robots.txt` and the redirects all derive from it.

## Build
```bash
npm ci
npx nuxt typecheck
npm run generate          # → .output/public
```
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

Brand assets (`public/favicon.*`, `public/apple-touch-icon.png`, `public/og/emrah-yucel-portfolio.jpg`) are committed. Regenerate them only on purpose, with `tools/brand-assets.cjs` (see its header).

## What goes on the server
**Upload:** the *contents* of `.output/public/`, including the hidden `.htaccess` files:
- `.htaccess`
- `_nuxt/.htaccess`
- `opt/.htaccess`

**Never upload:** `node_modules`, `.git`, `.nuxt`, `.output/server` (if present), source files, `docs/`, `tools/`, test evidence, `.env*`.

## Document root
Status: **UNKNOWN until checked in cPanel.**

cPanel → *Domains* → `yucelemrah.com` → **Document Root** column, usually `public_html` for the main domain, or `public_html/<folder>` for an addon domain. The site lives directly in that folder: `index.html`, `tr/`, `en/`, `_nuxt/`, …

## Upload: first launch
1. **Inventory and back up.** File Manager → document root → select all → *Compress* → `backup-YYYYMMDD.zip`, then download it. The domain currently answers `403` (empty or blocked root), so the backup may be tiny. Take it anyway.
2. **Clean.** Remove the old site files from the document root. Keep `.well-known/` (SSL validation) and `cgi-bin/` if present.
3. **Package locally.** Zip the *contents* of `.output/public/`, so that `index.html` is at the zip root. Make sure hidden files are included: `.htaccess` at the root, in `_nuxt/` and in `opt/`.
4. **Upload and extract.** File Manager → *Upload* the zip into the document root → *Extract* → delete the zip.
5. **Check hidden files.** File Manager → *Settings* → *Show Hidden Files (dotfiles)*. Confirm the three `.htaccess` files exist.

FTP/SFTP works equally well: upload the contents of `.output/public/` to the document root, hidden files included.

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
Run from any machine (`-I` headers only):
```bash
for u in http://yucelemrah.com/ http://www.yucelemrah.com/ https://www.yucelemrah.com/ https://yucelemrah.com/; do
  curl -sI -o /dev/null -w "$u -> %{http_code} %{redirect_url}\n" "$u"; done      # three 301 → https://yucelemrah.com/, one 200
for p in / /tr /en /tr/about /en/about /robots.txt /sitemap.xml /favicon.ico /og/emrah-yucel-portfolio.jpg /this-page-does-not-exist-m5-test; do
  curl -s -o /dev/null -w "$p -> %{http_code}\n" "https://yucelemrah.com$p"; done  # 200 … and 404 for the last
curl -sI -H "Accept-Encoding: br, gzip" https://yucelemrah.com/tr | grep -iE "content-encoding|cache-control|content-security-policy"
```
### Does the live site actually boot?
```bash
cd tools/diag
node cspboot.cjs --static https://yucelemrah.com            # the served policy names the served scripts
node cspboot.cjs https://yucelemrah.com chrome              # /tr and /tr/lab, runtime up, 0 CSP violations
node cspboot.cjs https://yucelemrah.com webkit              # the same, in the engine iOS uses
```
All three must exit 0. The browser runs assert what a visitor gets, not what the headers promise: on `/tr` the
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

## Rollback
The site is static; there is no database.
1. **Before every deployment**, keep `backup-YYYYMMDD.zip` of the document root (step 1 above), or keep the previous `.output/public` zip locally.
2. **If production breaks:**
   - File Manager → document root → delete the new files;
   - upload and extract the previous zip;
   - hard-refresh (HTML is revalidated on every request; `_nuxt` assets are fingerprinted, so old and new never mix).
3. **If only `.htaccess` is at fault:** rename it to `.htaccess.off`. The site then serves with default server behaviour while you fix it.

## Checklist
- **PRE-BUILD:** clean `git status`; `NUXT_PUBLIC_SITE_URL` unset (or the intended HTTPS origin); `npm ci`
- **BUILD:** `npx nuxt typecheck` exit 0; `npm run generate` exit 0; log shows the production-files line
- **PRE-UPLOAD:** `.output/public` contains `.htaccess`, `_nuxt/.htaccess`, `opt/.htaccess`, `404.html`, `robots.txt`, `sitemap.xml`, `og/`, favicons; no `200.html`
- **PRE-UPLOAD (CSP):** `node tools/diag/cspboot.cjs --dir .output/public` exit 0 — the policy names every inline script in the artifact it ships with
- **PRE-UPLOAD (payload):** no `tools/`, no `*.cjs`, no `lab/proof` route in the artifact
- **UPLOAD:** document root identified; backup downloaded; old files cleaned; zip extracted; dotfiles visible
- **DNS/SSL:** A record → hosting IP; AutoSSL valid for apex and www
- **MAIL:** mailbox exists; Email Deliverability valid; inbound / outbound / auth tests recorded
- **POST-DEPLOY:** redirect matrix; status matrix; 404 is a real 404; console clean; `cspboot.cjs --static <origin>` and `cspboot.cjs <origin> chrome|webkit` all exit 0
- **SEO:** `robots.txt` and `sitemap.xml` reachable; canonical and hreflang in page source; OG preview renders
- **PERFORMANCE:** PageSpeed mobile + desktop recorded (lab); field data only if it exists
- **REAL DEVICE:** iPhone smoke, including Work / Lab hold → swipe
- **FINAL:** backup of this deployment kept for the next rollback
