// THE WORDS ARE MATERIAL; THE LANGUAGE IS IN THE DOM.
//
//   node lfwords-locale.cjs <port>
//
// The eight words are English in every locale, because nothing this surface paints as material is
// language-dependent — the name, the two face words and the project captures are the same everywhere, and this
// is that. What changes with the page's language is the two half names, which are read as language, and the
// spoken alternative a screen reader gets in place of the canvas.
//
// So there are three claims, and each is checked where it lives:
//
//   the PICTURE   the rendered field on /tr and on /en must be the same picture, pixel for pixel, at both ends
//                 and in both viewports. That is the strongest possible form of "the words did not change".
//   the LABEL     the visible half name differs between the locales, and says the right thing in each
//   the SPOKEN    the accessible paragraph is present, is in the page's language, and names what the eight
//                 words mean rather than repeating letters a reader will never be given
const pw = require('playwright')
const sharp = require('sharp')
const fs = require('node:fs')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const [port = '4801'] = process.argv.slice(2)
const OUT = 'out/linefield/locale'

let pass = 0
let fail = 0
const ok = (c, m) => { if (c) { pass++; console.log(`  ok   ${m}`) } else { fail++; console.log(`  FAIL ${m}`) } }

const EXPECT = {
  tr: { back: 'BACKEND — NASIL DÜŞÜNÜRÜM', front: 'FRONTEND — NASIL DÜŞÜNÜRÜM', said: ['Durum, ölçek, hata, doğruluk', 'His, zamanlama, sürtünme, ilk kare'], lang: 'tr' },
  en: { back: 'BACKEND — HOW I THINK', front: 'FRONTEND — HOW I THINK', said: ['State, scale, failure, truth', 'Feel, timing, friction, first paint'], lang: 'en' },
}

async function open(b, w, h, locale) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, isMobile: w < 700, hasTouch: w < 700 })
  const p = await ctx.newPage()
  await p.goto(`http://127.0.0.1:${port}/${locale}`, { waitUntil: 'load', timeout: 90000 })
  await p.waitForFunction(() => !!window.__lab?.lfSet, null, { timeout: 60000 })
  await sleep(2400)
  await p.evaluate(() => window.__lab.go(window.__lab.STOP.linefield))
  await sleep(1700)
  return { ctx, p }
}

;(async () => {
  fs.mkdirSync(OUT, { recursive: true })
  const b = await pw.chromium.launch({ channel: 'chrome' })

  for (const [w, h] of [[1440, 900], [390, 844]]) {
    const shots = {}
    for (const locale of ['tr', 'en']) {
      const { ctx, p } = await open(b, w, h, locale)
      const E = EXPECT[locale]

      // ── what the page says, and in which language ──────────────────────────────────────────────────────
      const dom = await p.evaluate(() => {
        const layer = document.querySelector('#ui .layer.lf-place')
        const said = layer?.querySelector('p.sr')
        const langOf = (el) => { let n = el; while (n) { if (n.lang) return n.lang; n = n.parentElement } return document.documentElement.lang }
        return {
          heading: layer?.querySelector('h2')?.textContent?.trim() ?? '',
          back: layer?.querySelector('.lf-back')?.textContent?.trim() ?? '',
          front: layer?.querySelector('.lf-front')?.textContent?.trim() ?? '',
          said: said?.textContent?.trim() ?? '',
          saidLang: said ? langOf(said) : '',
          docLang: document.documentElement.lang,
          // the canvas itself must stay out of the tree: the words are a picture and are named by the text above
          canvasHidden: document.getElementById('surface')?.getAttribute('aria-hidden') === 'true' || !document.getElementById('surface'),
        }
      })
      ok(dom.back === E.back, `${locale} ${w}x${h}: the backend half is named in the page's language — "${dom.back}"`)
      ok(dom.front === E.front, `${locale} ${w}x${h}: and the frontend half — "${dom.front}"`)
      ok(!!dom.said, `${locale} ${w}x${h}: the words have a text alternative`)
      ok(E.said.every((t) => dom.said.includes(t)), `${locale} ${w}x${h}: and it says what they mean — "${dom.said.slice(0, 96)}…"`)
      /*
       * THE PRIMARY SUBTAG IS THE LANGUAGE. The site sets `tr-TR` on the Turkish pages and `en` on the English
       * ones — both legal BCP-47, and the region is the site's own choice, not this place's. Comparing the whole
       * tag reported a failure on a page that was labelled correctly.
       */
      ok(dom.saidLang.split('-')[0] === E.lang, `${locale} ${w}x${h}: read in the page's language (lang="${dom.saidLang}")`)
      // the English letters must not be in the accessible text: a reader is given the meaning, not the picture
      const leaked = ['STATE.', 'SCALE.', 'FAILURE.', 'TRUTH.', 'FEEL.', 'TIMING.', 'FRICTION.', 'FIRST PAINT.'].filter((t) => locale === 'tr' && dom.said.includes(t))
      ok(leaked.length === 0, `${locale} ${w}x${h}: and does not read the letters aloud${leaked.length ? ` — found ${leaked.join(', ')}` : ''}`)

      // ── the two ends, at rest ──────────────────────────────────────────────────────────────────────────
      await p.evaluate(() => document.querySelectorAll('.layer, .strip').forEach((e) => { e.style.visibility = 'hidden' }))
      /*
       * AND THE VISIT'S IMPRINT IS LET SETTLE FIRST. The sheet remembers where it has been touched, and that
       * memory fades in over a second or two after an arrival. Photographed at different points in that fade,
       * the two locales differed by a broad soft band — 28 at its worst, no letter edges anywhere in it — and
       * the check called a difference in the page's memory a difference in the type.
       */
      await p.evaluate(() => window.__lab.lfSet(0))
      await sleep(3200)
      for (const end of [0, 1]) {
        await p.evaluate((x) => window.__lab.lfSet(x), end)
        await sleep(600)
        const png = await p.screenshot()
        shots[`${locale}-${end}`] = png
        fs.writeFileSync(`${OUT}/${locale}-${w}x${h}-${end ? 'frontend' : 'backend'}.png`, png)
      }
      // and one with the site's own chrome, which is what the review looks at
      await p.evaluate(() => document.querySelectorAll('.layer, .strip').forEach((e) => { e.style.visibility = '' }))
      for (const end of [0, 1]) {
        await p.evaluate((x) => window.__lab.lfSet(x), end)
        await sleep(700)
        fs.writeFileSync(`${OUT}/${locale}-${w}x${h}-${end ? 'frontend' : 'backend'}-WITH-CHROME.png`, await p.screenshot())
      }
      await ctx.close()
    }

    /*
     * THE PICTURE IS THE SAME PICTURE. With the chrome hidden, the material on /tr and on /en is the same eight
     * words at the same size in the same places, so the two frames must be identical — not similar. Anything
     * else means the layout moved with the language, which is what this change was about.
     */
    for (const end of [0, 1]) {
      const A = await sharp(shots[`tr-${end}`]).raw().toBuffer({ resolveWithObject: true })
      const B = await sharp(shots[`en-${end}`]).raw().toBuffer({ resolveWithObject: true })
      let diff = 0
      for (let i = 0; i < A.data.length; i++) if (A.data[i] !== B.data[i]) diff++
      const side = end ? 'frontend' : 'backend'
      ok(diff === 0, `${w}x${h} ${side}: the field is the same picture on /tr and /en — ${diff} byte(s) differ`)
      if (diff) {
        await sharp(shots[`tr-${end}`]).toFile(`${OUT}/DIFF-tr-${w}x${h}-${side}.png`)
        await sharp(shots[`en-${end}`]).toFile(`${OUT}/DIFF-en-${w}x${h}-${side}.png`)
      }
    }
  }

  await b.close()
  console.log(`\n  LOCALE: ${fail === 0 ? 'PASS' : 'FAIL'} — ${pass} ok, ${fail} failed\n  stills in ${OUT}/\n`)
  process.exit(fail ? 1 : 0)
})()
