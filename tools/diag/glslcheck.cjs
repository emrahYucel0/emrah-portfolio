// BACKTICKS DO NOT BELONG INSIDE A GLSL TEMPLATE LITERAL.
//
//   node glslcheck.cjs [<file>...]
//
// Every shader in this project is a JS template literal, so one backtick in a GLSL comment ends the string and
// the file stops parsing — usually with an error pointing at whatever word came next, which reads like anything
// but the real cause. It has cost this project four separate debugging detours. This finds it in a second.
//
// With no arguments it checks every engine module, because the one time it was run with none it passed on zero
// files and the next reload broke on a backtick pair in a shader comment.
//
// AND IT ONLY LOOKS AT SHADERS. Run over the whole engine it first reported seven faults in main.js, all of them
// nested template literals inside HTML strings — which are ordinary JavaScript and perfectly legal. A check that
// cries wolf on legal code is one people learn to ignore, so each literal is read whole and only the ones that
// are plainly GLSL are judged.
const fs = require('node:fs')
const path = require('node:path')

const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => {
  const full = path.join(d, e.name)
  if (e.isDirectory()) return walk(full)
  return /\.(js|ts)$/.test(e.name) ? [full] : []
})

const GLSL = /(^|\n)\s*(#version|#define|#ifndef|precision|uniform |varying |attribute |void main|float |vec[234] |mat[234] )/

const args = process.argv.slice(2)
const files = args.length ? args : walk(path.join(__dirname, '..', '..', 'engine'))
let bad = 0

for (const f of files) {
  const lines = fs.readFileSync(f, 'utf8').split('\n')
  let start = -1          // the line a literal opened on, or -1 outside one
  let body = []           // its lines so far
  let suspect = []        // lines inside it carrying a backtick pair
  const judge = () => {
    if (GLSL.test(body.join('\n'))) {
      for (const [i, ln] of suspect) {
        console.log(`  ${f}:${i + 1}  a backtick pair inside a shader literal — ${ln.trim().slice(0, 90)}`)
        bad++
      }
    }
    start = -1; body = []; suspect = []
  }
  lines.forEach((ln, i) => {
    const ticks = (ln.match(/`/g) || []).length
    if (start < 0) { if (ticks % 2 === 1) { start = i; body = [ln]; suspect = [] } return }
    body.push(ln)
    if (ticks === 0) return
    if (ticks % 2 === 1) { judge(); return }
    suspect.push([i, ln])
  })
  if (start >= 0) judge()
}

console.log(bad ? `\n  ${bad} suspect line(s)` : `  no stray backticks in a shader literal (${files.length} files)`)
process.exit(bad ? 1 : 0)
