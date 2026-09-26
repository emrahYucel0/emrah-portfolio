const pw = require('playwright')
;(async () => {
  const b = await pw.webkit.launch()
  const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage()
  await p.goto('http://127.0.0.1:4500/tr/', { waitUntil: 'networkidle' })
  await new Promise(r => setTimeout(r, 3000))
  console.log(await p.evaluate(() => {
    const out = []
    for (const el of document.querySelectorAll('#ui *')) {
      const t = (el.textContent || '').trim()
      if (!/^hakk/i.test(t)) continue
      const r = el.getBoundingClientRect()
      out.push(`${el.tagName}.${el.className} [${el.parentElement.className}] l=${r.left|0} t=${r.top|0} ${r.width|0}x${r.height|0}`)
    }
    return out.join('\n')
  }))
  await b.close()
})()
