// CROSS SECTION — a build against a reference package, file by file (the flag-off proof).
//
//   node cscompare.cjs <build dir> <reference dir>
//
// JavaScript and CSS must be byte-identical. Every other file may differ only by Nuxt's per-build ID and its prerender
// timestamps; `.htaccess` may differ only by the CSP hash of the one inline script that carries the build ID (proven
// by hashing it). Also counts Cross Section's markers in the build. Exit 0 when identical in that sense.
const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')
const [A, B] = process.argv.slice(2)
const walk = (d, b = '') => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name), b + e.name + '/') : [b + e.name]))
const fa = walk(A).filter((f) => f !== 'axe.min.js'), fb = new Set(walk(B).filter((f) => f !== 'axe.min.js'))
const idOf = (d) => (fs.readdirSync(path.join(d, '_nuxt/builds/meta'))[0] || '').replace('.json', '')
const idA = idOf(A), idB = idOf(B)
let js = 0, css = 0
const jsDiff = [], cssDiff = [], other = []
for (const f of fa) {
  if (!fb.has(f)) { if (!f.includes('builds/meta')) other.push(`new ${f}`); continue }
  const x = fs.readFileSync(path.join(A, f)), y = fs.readFileSync(path.join(B, f))
  if (f.endsWith('.js')) { js++; if (!x.equals(y)) jsDiff.push(f); continue }
  if (f.endsWith('.css')) { css++; if (!x.equals(y)) cssDiff.push(f); continue }
  if (x.equals(y)) continue
  const sx = x.toString('utf8').split(idA).join('ID').replace(/1[0-9]{12}/g, 'TS'), sy = y.toString('utf8').split(idB).join('ID').replace(/1[0-9]{12}/g, 'TS')
  if (sx === sy) continue
  if (f === '.htaccess') {
    const ha = sx.match(/sha256-[A-Za-z0-9+/=]+/g) || [], hb = sy.match(/sha256-[A-Za-z0-9+/=]+/g) || []
    const only = ha.filter((h) => !hb.includes(h))
    const html = fs.readFileSync(path.join(A, 'tr/index.html'), 'utf8')
    const scripts = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1])
    const hit = scripts.find((t) => 'sha256-' + crypto.createHash('sha256').update(t).digest('base64') === only[0])
    if (only.length === 1 && hit && hit.includes(idA)) continue
  }
  other.push(f)
}
for (const f of fb) if (!fa.includes(f) && !f.includes('builds/meta')) other.push(`missing ${f}`)
const markers = []
for (const f of fa) {
  if (!/\.(js|html|css|json)$/.test(f)) continue
  const t = fs.readFileSync(path.join(A, f), 'utf8')
  for (const m of ['__c2Cross', '__c2Rise', 'csToBench', 'csResize', 'revealPose', 'revealLayout', 'cs-still', 'cs-dom', "data-c2='cs'"]) if (t.includes(m)) markers.push(`${f}:${m}`)
}
console.log(`JS ${js} files, ${jsDiff.length} differ${jsDiff.length ? ': ' + jsDiff.join(' ') : ''}`)
console.log(`CSS ${css} files, ${cssDiff.length} differ`)
console.log(`other files differing beyond the build ID, the timestamps and the config script's CSP hash: ${other.length}${other.length ? ': ' + other.slice(0, 8).join(' ') : ''}`)
console.log(`files: ${fa.length} here, ${fb.size} in the reference; Cross Section markers here: ${markers.length}${markers.length ? ' (' + [...new Set(markers.map((m) => m.split(':')[0]))].join(', ') + ')' : ''}`)
process.exit(jsDiff.length || cssDiff.length || other.length ? 1 : 0)
