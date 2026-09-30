/**
 * Production files for static hosting, written into the generated output after prerendering.
 *
 * Everything here derives from one site origin (runtimeConfig.public.siteUrl) and from the shared content:
 *   robots.txt, sitemap.xml   crawl entry points (only the public, canonical routes)
 *   404.html                  a real, script-free, bilingual not-found page (replaces Nuxt's empty SPA shell)
 *   .htaccess (root)          one-hop HTTPS + non-www redirect, clean URLs without a trailing-slash hop, the 404
 *                             document, MIME types, compression, cache policy for HTML, security headers and a
 *                             Content-Security-Policy whose script hashes are computed from the generated HTML
 *   _nuxt/.htaccess           fingerprinted build assets: immutable for a year
 *   opt/.htaccess             media derivatives (stable names, not fingerprinted): a week
 * 200.html (Nuxt's SPA fallback) is removed: every public route is prerendered, and unknown URLs must stay 404s.
 *
 * Every Apache directive that depends on a module is wrapped in <IfModule>, so a host without that module
 * ignores it instead of answering 500.
 */
import { createHash } from 'node:crypto'
import { existsSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { defineNuxtModule } from '@nuxt/kit'
import { HTML_LANG, LOCALES, messages, profile } from '../shared/content'
import { PUBLIC_PAGES } from '../shared/site'

const htmlFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return name === '_nuxt' ? [] : htmlFiles(path)
    return name.endsWith('.html') ? [path] : []
  })

const escapeXml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

function robots(site: string) {
  // the Contact finale's ?debug=1 panel is a diagnostics file, not a page
  return `User-agent: *\nAllow: /\nDisallow: /finale-debug.js\n\nSitemap: ${site}/sitemap.xml\n`
}

function sitemap(site: string) {
  const alternates = (page: string) =>
    [
      ...LOCALES.map((l) => `    <xhtml:link rel="alternate" hreflang="${HTML_LANG[l]}" href="${site}/${l}${page}"/>`),
      `    <xhtml:link rel="alternate" hreflang="x-default" href="${site}/"/>`,
    ].join('\n')
  const urls = [
    `  <url>\n    <loc>${site}/</loc>\n${alternates('')}\n  </url>`,
    ...PUBLIC_PAGES.flatMap((page) => LOCALES.map((l) => `  <url>\n    <loc>${site}/${l}${page}</loc>\n${alternates(page)}\n  </url>`)),
  ]
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.join('\n')}\n</urlset>\n`
}

// utility, not a showcase: the portfolio's paper and ink, system type, both languages, a way back
function notFound() {
  const en = messages('en'), tr = messages('tr')
  return `<!DOCTYPE html>
<html lang="${HTML_LANG.en}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${escapeXml(en.notFound.title)} · ${escapeXml(tr.notFound.title)} — ${escapeXml(profile.name)}</title>
<meta name="robots" content="noindex">
<meta name="theme-color" content="#efeee9">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/favicon.ico" sizes="32x32">
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body { margin: 0; min-height: 100vh; min-height: 100svh; display: grid; align-content: center; gap: 18px;
    padding: 48px max(18px, 6vw); background: #efeee9; color: #121212;
    font: 400 17px/1.5 ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
  .id { font: 400 11px/1 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; letter-spacing: .08em; text-transform: uppercase; }
  h1 { margin: 12px 0 0; font-size: clamp(56px, 12vw, 120px); line-height: .9; letter-spacing: -.04em; font-weight: 700; }
  p { margin: 0; max-width: 40ch; }
  ul { list-style: none; margin: 10px 0 0; padding: 0; display: flex; gap: 28px; }
  a { color: inherit; display: inline-block; padding: 10px 0; font: 400 13px/1 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; letter-spacing: .06em; text-transform: uppercase; text-underline-offset: 4px; }
  a:focus-visible { outline: 2px solid currentColor; outline-offset: 4px; border-radius: 2px; }
</style>
</head>
<body>
<main>
  <p class="id">${escapeXml(profile.name)}</p>
  <h1>404</h1>
  <p lang="${HTML_LANG.en}">${escapeXml(en.notFound.message)}</p>
  <p lang="${HTML_LANG.tr}">${escapeXml(tr.notFound.message)}</p>
  <ul>
    <li><a href="/tr" hreflang="${HTML_LANG.tr}" lang="${HTML_LANG.tr}">${escapeXml(en.localeSwitch.to)}</a></li>
    <li><a href="/en" hreflang="${HTML_LANG.en}" lang="${HTML_LANG.en}">${escapeXml(tr.localeSwitch.to)}</a></li>
  </ul>
</main>
</body>
</html>
`
}

/** every inline executable <script> in the generated HTML, hashed for the CSP */
function inlineScriptHashes(publicDir: string) {
  const hashes = new Set<string>()
  for (const file of htmlFiles(publicDir)) {
    for (const m of readFileSync(file, 'utf8').matchAll(/<script(\s[^>]*)?>([\s\S]*?)<\/script>/g)) {
      const attrs = m[1] ?? '', body = m[2] ?? ''
      if (/\bsrc=/.test(attrs) || !body) continue
      const type = /type="([^"]+)"/.exec(attrs)?.[1]
      if (type && !['module', 'importmap', 'text/javascript'].includes(type)) continue   // JSON data blocks are not executed
      hashes.add(`'sha256-${createHash('sha256').update(body, 'utf8').digest('base64')}'`)
    }
  }
  return [...hashes].sort()
}

function contentSecurityPolicy(scriptHashes: string[]) {
  return [
    "default-src 'self'",
    `script-src 'self' ${scriptHashes.join(' ')}`.trim(),
    "style-src 'self' 'unsafe-inline'",   // Nuxt inlines component CSS; the runtime positions layers with style attributes
    "img-src 'self' data: blob:",
    "font-src 'self' data:",   // Vite inlines the smallest font subsets into the CSS as data: URIs
    "media-src 'self'",
    "connect-src 'self'",
    "worker-src 'self'",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
    'upgrade-insecure-requests',
  ].join('; ')
}

function rootHtaccess(site: string, csp: string) {
  const host = new URL(site).host
  const TEXT = 'text/html text/css text/plain text/xml text/javascript application/javascript application/json application/xml application/manifest+json image/svg+xml'
  return `# Emrah Yücel — static production for ${site}
# Generated by modules/production-files.ts at build time. Edit the module, not this file on the server.

DirectoryIndex index.html
ErrorDocument 404 /404.html

<IfModule mod_rewrite.c>
  RewriteEngine On

  # /tr is served as /tr/index.html in place, without Apache's trailing-slash redirect hop. Only together with the
  # rewrites below: without mod_rewrite, the default slash redirect is what makes /tr reach its index.html.
  <IfModule mod_dir.c>
    DirectorySlash Off
  </IfModule>

  # one hop to ${site}: any www host, or plain HTTP (also behind a TLS-terminating proxy)
  RewriteCond %{HTTP_HOST} ^www\\. [NC]
  RewriteRule ^ https://${host}%{REQUEST_URI} [R=301,L,NE]
  RewriteCond %{HTTPS} !=on
  RewriteCond %{HTTP:X-Forwarded-Proto} !=https
  RewriteRule ^ https://${host}%{REQUEST_URI} [R=301,L,NE]

  # one canonical form per page: /tr/ -> /tr (absolute, so it never passes through http first)
  RewriteCond %{REQUEST_FILENAME} -d
  RewriteCond %{REQUEST_FILENAME}/index.html -f
  RewriteRule ^(.+)/$ https://${host}/$1 [R=301,L,NE]

  # a prerendered page directory is answered by its index.html
  RewriteCond %{REQUEST_FILENAME} -d
  RewriteCond %{REQUEST_FILENAME}/index.html -f
  RewriteRule ^(.+)$ /$1/index.html [L]

  # any other directory is not a page: 404, never a listing
  RewriteCond %{REQUEST_FILENAME} -d
  RewriteCond %{REQUEST_URI} !^/$
  RewriteRule ^ - [R=404,L]
</IfModule>

<IfModule mod_mime.c>
  AddType text/javascript .js .mjs
  AddType application/json .json
  AddType image/svg+xml .svg
  AddType image/avif .avif
  AddType image/webp .webp
  AddType font/woff2 .woff2
  AddType font/woff .woff
  AddType video/mp4 .mp4
  AddType image/x-icon .ico
  AddCharset utf-8 .html .css .js .mjs .json .txt .xml .svg
</IfModule>

# text only: images, fonts and video are already compressed
<IfModule mod_filter.c>
  <IfModule mod_brotli.c>
    AddOutputFilterByType BROTLI_COMPRESS ${TEXT}
  </IfModule>
  <IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE ${TEXT}
  </IfModule>
</IfModule>

<IfModule mod_headers.c>
  Header always set X-Content-Type-Options "nosniff"
  Header always set Referrer-Policy "strict-origin-when-cross-origin"
  Header always set Permissions-Policy "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()"
  Header always set X-Frame-Options "SAMEORIGIN"
  Header always set Content-Security-Policy "${csp}"

  # HTML and route payloads: always revalidated, so a new deployment is seen at once
  <FilesMatch "\\.(html|json)$">
    Header set Cache-Control "public, max-age=0, must-revalidate"
  </FilesMatch>
  # crawl files, icons and the share image: a day
  <FilesMatch "\\.(txt|xml|ico|svg|png|jpg)$">
    Header set Cache-Control "public, max-age=86400"
  </FilesMatch>
</IfModule>
`
}

const NUXT_HTACCESS = `# fingerprinted build assets: the name changes when the content does
<IfModule mod_headers.c>
  Header set Cache-Control "public, max-age=31536000, immutable"
  # the build manifest is not fingerprinted
  <FilesMatch "\\.json$">
    Header set Cache-Control "public, max-age=0, must-revalidate"
  </FilesMatch>
</IfModule>
`

const OPT_HTACCESS = `# media derivatives: stable names, not fingerprinted — a week, then revalidate
<IfModule mod_headers.c>
  Header set Cache-Control "public, max-age=604800"
</IfModule>
`

export default defineNuxtModule({
  meta: { name: 'production-files' },
  setup(_options, nuxt) {
    if (nuxt.options.dev) return
    nuxt.hook('nitro:init', (nitro) => {
      nitro.hooks.hook('close', () => {
        const site = String(nuxt.options.runtimeConfig.public.siteUrl)
        const out = nitro.options.output.publicDir
        writeFileSync(join(out, 'robots.txt'), robots(site))
        writeFileSync(join(out, 'sitemap.xml'), sitemap(site))
        writeFileSync(join(out, '404.html'), notFound())
        if (existsSync(join(out, '200.html'))) rmSync(join(out, '200.html'))
        const csp = contentSecurityPolicy(inlineScriptHashes(out))
        writeFileSync(join(out, '.htaccess'), rootHtaccess(site, csp))
        if (existsSync(join(out, '_nuxt'))) writeFileSync(join(out, '_nuxt', '.htaccess'), NUXT_HTACCESS)
        if (existsSync(join(out, 'opt'))) writeFileSync(join(out, 'opt', '.htaccess'), OPT_HTACCESS)
        nitro.logger.success(`production files for ${site}: robots.txt, sitemap.xml, 404.html, .htaccess (CSP with ${csp.match(/sha256-/g)?.length ?? 0} script hashes)`)
      })
    })
  },
})
