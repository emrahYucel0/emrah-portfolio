// BACKTICKS DO NOT BELONG INSIDE A GLSL TEMPLATE LITERAL.
//
//   node glslcheck.cjs <file> [<file>...]
//
// Every shader in this project is a JS template literal, so one backtick in a GLSL comment ends the string and
// the file stops parsing — usually with an error pointing at whatever word came next, which reads like anything
// but the real cause. It has cost this project three separate debugging detours. This finds it in a second.
const fs = require('fs')
let bad = 0
for (const f of process.argv.slice(2)) {
  const src = fs.readFileSync(f, 'utf8')
  const lines = src.split('\n')
  let inLit = false
  lines.forEach((ln, i) => {
    const ticks = (ln.match(/`/g) || []).length
    if (!inLit) { if (ticks % 2 === 1) inLit = true; return }
    if (ticks === 0) return
    if (ticks % 2 === 1) { inLit = false; return }
    console.log(`  ${f}:${i + 1}  a backtick pair inside a shader literal — ${ln.trim().slice(0, 90)}`)
    bad++
  })
}
console.log(bad ? `\n  ${bad} suspect line(s)` : '  no stray backticks in a shader literal')
process.exit(bad ? 1 : 0)
