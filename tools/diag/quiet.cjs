// A TIMED RUN ONLY ON A QUIET MACHINE. This machine is shared with other projects whose scripts (Lighthouse, video
// captures, profiles) load the CPU for minutes; a timing taken beside one of them measures them, not the site.
//
//   const { guarded } = require('./quiet.cjs')
//   const r = await guarded('label', () => run(...))   // waits for quiet, runs, repeats the run if it was disturbed
//
// Other work is another project's node script (`node scripts/...`) and the desktop's own Chrome (not a test browser),
// each with every process under it (its browser, its GPU process, its ffmpeg). What counts is the CPU time they use,
// as a rate: a script asleep or a browser sitting idle is not other work; a tab that animates, or a capture, is.
//   quiet       for 30 s: the processor's own load under 25%, and the other work under 0.35 s of CPU per second
//   disturbed   the other work averaged more than 0.35 s of CPU per second over the run (sampled every 10 s)
// (0.35: the desktop's Chrome with its tabs open idles at about 0.3 s/s; a capture or an audit uses 1–2.5 s/s)
// QUIET_CHROME=ignore leaves the desktop's Chrome out of the other work (the user asked to go on with it open,
// 2026-10-07); the processor's load still has to fall under 25%.
// Windows only (it asks WMI through PowerShell); elsewhere it does nothing and just runs.
const { execFileSync } = require('node:child_process')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const ps = (cmd) => execFileSync('powershell', ['-NoProfile', '-Command', cmd], { encoding: 'utf8' }).trim()
// the other work as it stands: each process's CPU seconds so far (pid -> s), and what its roots are
const OTHER = `
$all = Get-CimInstance Win32_Process
$roots = @($all | ? { ($_.Name -eq 'node.exe' -and $_.CommandLine -match 'scripts/') -or ($env:QUIET_CHROME -ne 'ignore' -and $_.Name -eq 'chrome.exe' -and $_.CommandLine -notmatch '--type=' -and $_.CommandLine -notmatch 'remote-debugging' -and $_.CommandLine -notmatch 'ms-playwright') })
$ids = @($roots.ProcessId); $n = -1
while ($ids.Count -ne $n) { $n = $ids.Count; $ids = @($ids + @($all | ? { $ids -contains $_.ParentProcessId } | % { $_.ProcessId }) | Select-Object -Unique) }
$parts = foreach ($i in $ids) { $p = Get-Process -Id $i -ErrorAction SilentlyContinue; if ($p -and $p.CPU) { '{0}:{1}:{2}' -f $i, [long]($p.CPU * 1000), [long]((Get-Date) - $p.StartTime).TotalMilliseconds } }
'{0}|{1}' -f ($parts -join ','), (($roots | % { $_.CommandLine }) -join ' ; ')`
const other = () => {
  try {
    const [list, what] = ps(OTHER).split('|')
    const pids = new Map()
    // whole milliseconds: PowerShell writes decimals in the system's locale (a comma here), which Number() cannot read
    for (const e of (list || '').split(',').filter(Boolean)) { const [pid, cpu, age] = e.split(':').map(Number); pids.set(pid, { cpu: cpu / 1000, age: age / 1000 }) }
    return { pids, what: what || '', t: Date.now() }
  } catch { return { pids: new Map(), what: '', t: Date.now() } }
}
// CPU seconds the other work used between two readings: per process, and a process that started in between counts
// whole (one that was there before but not counted, e.g. a browser whose root just appeared, counts from now)
const usedBetween = (a, b) => {
  let s = 0
  const dt = (b.t - a.t) / 1000
  for (const [pid, q] of b.pids) {
    const o = a.pids.get(pid)
    if (o) s += Math.max(0, q.cpu - o.cpu)
    else if (q.age <= dt + 1) s += q.cpu
  }
  return s
}
const load = () => { try { return Number(ps('(Get-CimInstance Win32_Processor).LoadPercentage')) || 0 } catch { return 0 } }
async function waitQuiet(label) {
  if (process.platform !== 'win32') return
  let n = 0, said = false, prev = other()
  while (n < 6) {
    await sleep(5000)
    const o = other(), l = load(), busy = usedBetween(prev, o)
    prev = o
    if (l < 25 && busy < 0.35 * 5) n++
    else { n = 0; if (!said) { console.log(`   (waiting for a quiet machine before ${label}: load ${l}%${busy >= 0.35 * 5 ? `, other work ${(busy / 5).toFixed(2)} s/s: ${o.what}` : ''})`); said = true } }
  }
}
async function guarded(label, fn, tries = 6) {
  // QUIET=gpu: for a measure read from the GPU's own timer, which the CPU's other work does not touch — the run goes ahead
  // under load and says so (its CPU-side numbers, such as frame intervals, are then not clean)
  if (process.env.QUIET === 'gpu') { console.log(`   (${label}: run under the machine's current load — load ${load()}%; GPU timer only)`); return fn() }
  for (let t = 0; t < tries; t++) {
    await waitQuiet(label)
    if (process.platform !== 'win32') return fn()
    const start = other(), t0 = Date.now()
    // summed per sampling interval and per process, so a process that ends or appears does not distort it
    let prev = start, used = 0, what = ''
    const iv = setInterval(() => { const o = other(), u = usedBetween(prev, o); if (u > 3.5) what = o.what; used += u; prev = o }, 10000)
    const r = await fn()
    clearInterval(iv)
    const end = other()
    used += usedBetween(prev, end)
    const rate = used / Math.max(1, (Date.now() - t0) / 1000)
    if (rate <= 0.35) return r
    console.log(`   (${label} disturbed: other work averaged ${rate.toFixed(2)} s of CPU per second — ${what || end.what}; repeated)`)
  }
  throw new Error(`${label}: never ran on a quiet machine`)
}
module.exports = { guarded, waitQuiet }
