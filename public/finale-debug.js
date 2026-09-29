/*
  ?debug=1 on /[locale]/contact — a diagnostics panel for devices without a web inspector (the iPhone 7 Plus on
  iOS 15.8 the site is validated on, driven from a Windows machine). Loaded ONLY with the flag, by one inline line in
  the page head; a normal visit never fetches it. Classic script in plain ES5 on purpose: it must run, and report,
  even when the app bundle fails to parse. It collects uncaught errors, rejected promises, the reasons the finale
  took a poorer path (engine/lab/finale/debug.js), feature probes for the iOS 15.4 floor, and the touch detection.
  Tap the panel to fold it. Not linked from anywhere; robots.txt disallows it.
*/
(function () {
  if (window.__dbg) return
  var d = window.__dbg = { errors: [], fallbacks: [], info: [], started: false, render: function () {} }
  function push(list, m) { if (list.indexOf(m) < 0) list.push(m); d.render() }
  window.addEventListener('error', function (e) {
    var t = e.target
    var m = e.message || (t && (t.src || t.href) ? 'resource failed: ' + (t.src || t.href) : 'error')
    if (e.filename) m += ' @ ' + e.filename.split('/').pop() + ':' + e.lineno + ':' + e.colno
    push(d.errors, m)
  }, true)
  window.addEventListener('unhandledrejection', function (e) {
    var r = e.reason
    push(d.errors, 'unhandled rejection: ' + (r && r.message ? r.message : String(r)))
  })
  function probe(name, fn) { var ok; try { ok = !!fn() } catch (x) { ok = false } d.info.push(name + ': ' + (ok ? 'yes' : 'NO')) }
  function mm(q) { try { return matchMedia(q).matches } catch (x) { return 'n/a' } }
  probe('Array.prototype.at (Safari 15.4+)', function () { return [].at })
  probe('regex lookbehind (Safari 16.4+)', function () { return new RegExp('(?<=a)b') })
  probe('structuredClone (15.4+)', function () { return window.structuredClone })
  probe('Object.hasOwn (15.4+)', function () { return Object.hasOwn })
  probe('document.fonts', function () { return document.fonts })
  probe('Path2D', function () { return window.Path2D })
  d.info.push('pointer coarse / any-pointer coarse / hover none: ' + mm('(pointer: coarse)') + ' / ' + mm('(any-pointer: coarse)') + ' / ' + mm('(hover: none)'))
  d.info.push('maxTouchPoints: ' + navigator.maxTouchPoints + ' · ontouchstart: ' + ('ontouchstart' in window))
  d.info.push('viewport: ' + innerWidth + 'x' + innerHeight + ' @' + devicePixelRatio)
  d.info.push('UA: ' + navigator.userAgent)
  // notes the engine made before this file arrived
  var q = window.__dbgQueue || []
  for (var i = 0; i < q.length; i++) push(q[i][0] === 'fallback' ? d.fallbacks : q[i][0] === 'error' ? d.errors : d.info, q[i][1])
  window.__dbgQueue = []
  var el, open = true
  d.render = function () {
    if (!document.body) return
    if (window.__finaleStarted) d.started = true
    if (!el) {
      el = document.createElement('div')
      el.setAttribute('aria-hidden', 'true')
      el.style.cssText = 'position:fixed;left:6px;right:6px;top:6px;z-index:99999;max-height:46vh;overflow:auto;' +
        'background:rgba(255,255,255,.95);color:#111;font:11px/1.35 ui-monospace,Menlo,monospace;padding:8px 10px;' +
        'border:1px solid #111;white-space:pre-wrap;word-break:break-word'
      el.addEventListener('click', function () { open = !open; d.render() })
      document.body.appendChild(el)
    }
    var s = 'DEBUG · finale ' + (d.started ? 'RUNNING' : 'NOT STARTED') + ' · errors ' + d.errors.length + ' · fallbacks ' + d.fallbacks.length + '  (tap to ' + (open ? 'fold' : 'open') + ')'
    if (open) {
      s += '\n\nERRORS\n' + (d.errors.join('\n') || '—')
      s += '\n\nFALLBACKS (why a poorer path was taken)\n' + (d.fallbacks.join('\n') || '—')
      s += '\n\nINFO\n' + d.info.join('\n')
    }
    el.textContent = s
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', d.render); else d.render()
  setTimeout(function () {
    if (!d.started && !window.__finaleStarted) push(d.fallbacks, 'the finale did not start within 6 s — the page stays on its plain DOM layer (see ERRORS)')
    d.render()
  }, 6000)
})()
