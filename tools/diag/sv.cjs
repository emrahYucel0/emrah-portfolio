// static server for a generated .output/public, honouring the .htaccess headers the host would send.
// WebKit is served the same CSP minus upgrade-insecure-requests (it would rewrite http://127.0.0.1 to https).
// node sv.cjs <root> <port> [--wk] [--lan] [--review]
//
// --review exempts the review furniture — lf-compare.html, lf-demo.html and their script — from the CSP, and
// NOTHING ELSE. They are not part of the site: the comparison page drives two frames from one clock and the
// reference demo loads its face from Google Fonts, and under the site's own policy (one inline script named by
// hash, default-src 'self') neither runs at all. Without the flag this server behaves exactly as it always has,
// which is what every other harness depends on.
const http = require('http'), fs = require('fs'), path = require('path')
const root = path.resolve(process.argv[2]), port = +process.argv[3], wk = process.argv.includes('--wk')
const host = process.argv.includes('--lan') ? '0.0.0.0' : '127.0.0.1'
const review = process.argv.includes('--review')
const isReviewFile = (f) => ['lf-compare.html', 'lf-demo.html'].includes(path.basename(f))
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.woff2': 'font/woff2', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif', '.svg': 'image/svg+xml', '.mp4': 'video/mp4', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml; charset=utf-8' }

let csp = ''
try {
  const ht = fs.readFileSync(path.join(root, '.htaccess'), 'utf8')
  const m = ht.match(/Header\s+(?:always\s+)?set\s+Content-Security-Policy\s+"([\s\S]*?)"\s*$/m)
  if (m) csp = m[1].replace(/\\\n\s*/g, ' ').trim()
} catch { /* a build without the production files */ }
if (wk) csp = csp.replace(/;?\s*upgrade-insecure-requests/g, '')

http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0])
  let f = path.join(root, url)
  if (!f.startsWith(root)) { res.writeHead(403).end(); return }
  try { if (fs.statSync(f).isDirectory()) f = path.join(f, 'index.html') } catch {
    if (!path.extname(f)) f += '/index.html'
  }
  fs.readFile(f, (err, buf) => {
    if (err) { res.writeHead(404, { 'content-type': 'text/plain' }).end('404'); return }
    const h = { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream', 'cache-control': 'no-store' }
    if (csp && f.endsWith('.html') && !(review && isReviewFile(f))) h['content-security-policy'] = csp
    res.writeHead(200, h).end(buf)
  })
}).listen(port, host, () => console.log(`serving ${root} on ${host}:${port}${wk ? ' (webkit csp)' : ''}`))
