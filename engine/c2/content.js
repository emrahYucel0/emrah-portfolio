// Emrah Yücel — real portfolio data. Nothing in the surface is hard-wired to a work count.
// Project facts are the supplied source of truth; nothing here is inferred or invented.
// Source images stay in creative-lab/assets/img and are never shipped as they are: the site loads the AVIF/WebP
// derivatives listed in public/opt/img/manifest.json (node tools/make-derivatives.mjs).
import MANIFEST from '../../public/opt/img/manifest.json'

// M1 TRANSPLANT: the host sets the public asset base before this module loads (Nuxt serves /public at
// app.baseURL, while Vite's BASE_URL points at the build-asset directory). Standalone, nothing changes.
const BASE = globalThis.__c2Base ?? import.meta.env.BASE_URL
const opt = (f) => `${BASE}opt/img/${f}`
const img = (file, alt, shade) => {
  const m = MANIFEST[file]
  if (!m) throw new Error(`No derivative for ${file} — run node tools/make-derivatives.mjs`)
  const set = (list) => list.map(([w, f]) => `${opt(f)} ${w}w`).join(', ')
  const mid = m.webp.find(([w]) => w >= 1080) || m.webp[m.webp.length - 1]
  return { file, w: m.w, h: m.h, aspect: m.w / m.h, alt, shade, avif: set(m.avif), webp: set(m.webp), src: opt(mid[1]), toneSrc: opt(m.tone[0]) }
}

export const identity = {
  name: 'Emrah Yücel',
  primary: 'Creative Developer',
  secondary: 'Full-Stack Developer',
  city: 'Istanbul',
  location: 'Istanbul, Türkiye',
  status: 'Available for selected freelance work',
  positioning: ['I build the surface you touch', 'and the system underneath it.'],
}

export const contact = {
  email: 'info@yucelemrah.com',
  phone: '+90 506 519 96 91',
  tel: '+905065199691',
  // verified professional exits
  links: [
    { label: 'GitHub', href: 'https://github.com/emrahYucel0' },
    { label: 'LinkedIn', href: 'https://www.linkedin.com/in/emrah-yucel/' },
  ],
  cv: null, // no real CV PDF exists yet — nothing is exposed until one does
}

export const about = {
  home: {
    intro: 'I’m Emrah Yücel, a Creative Developer and Full-Stack Developer based in Istanbul. I design expressive digital experiences and engineer the systems behind them.',
    positioning: 'I design how it moves and engineer what it runs on.',
    more: 'More about me',
  },
  detail: {
    intro: 'I’m Emrah Yücel, a Creative Developer and Full-Stack Developer based in Istanbul. I build digital experiences end to end — from interaction and frontend engineering to backend systems, CMS, performance and production.',
    background: 'My path into software began in chemistry and industrial production. Working with formulation, quality control and technical constraints trained me to think in systems, test assumptions, measure what matters and care about repeatability.',
    transition: 'That mindset stayed with me when I moved into software. I still work the same way: understand the system, work with its constraints, then refine the result until the visual and technical parts feel like one thing.',
    current: 'Today I work across creative development, frontend, full-stack systems, CMS/admin architecture, performance and technical SEO.',
    status: 'Available for selected freelance projects.',
    capabilities: ['Creative Development', 'Motion & Interaction', 'Frontend Engineering', 'Full-Stack Development', 'CMS / Admin Systems', 'Performance & Technical SEO'],
  },
}

// two faces of one material: what is touched, and what holds it up
export const capabilities = {
  surface: {
    word: 'CREATIVE',
    role: 'Creative Developer',
    items: [
      { name: 'Creative development', note: 'Authored visual systems · interaction' },
      { name: 'Motion & interaction', note: 'Scroll · gesture · choreography' },
      { name: 'Frontend engineering', note: 'Vue · Nuxt · TypeScript · Tailwind CSS' },
    ],
  },
  system: {
    word: 'FULL-STACK',
    role: 'Full-Stack Developer',
    items: [
      { name: 'Full-stack development', note: 'SSR · REST APIs · Prisma · authentication' },
      { name: 'CMS / admin systems', note: 'Database-driven publishing and editing' },
      { name: 'Performance & technical SEO', note: 'Metadata · routing · sitemaps · lean builds' },
    ],
  },
  stack: 'Nuxt · Vue · TypeScript · Tailwind CSS · GSAP · Prisma',
}

export const workIntro = { line: 'Three production sites for service businesses — each designed and built end to end.' }

// PageSpeed Insights, as verified. null = not verified, never shown.
const psi = (mobile, desktop) => ({ mobile, desktop, labels: ['Performance', 'Accessibility', 'Best Practices', 'SEO'], short: ['PERF', 'A11Y', 'BP', 'SEO'] })

// rhythm: which sequence of material states the project world uses (see world.js)
const base = [
  {
    id: 'istanbul',
    name: 'İstanbul Şehir İçi',
    url: 'https://istanbulsehirici.com/',
    host: 'istanbulsehirici.com',
    strength: 'Original digital direction',
    line: 'A conventional service category treated as an authored digital experience — custom visual language, technical illustration and a very lean SSR build.',
    role: 'Design, creative direction and full-stack build',
    ink: '#8e3a17',
    rhythm: 'authored',
    facts: ['Custom visual language and technical illustration', '39-district content approach', 'Bounded price calculator', 'Admin / CMS'],
    stack: 'Nuxt SSR · project-served fonts · custom image pipeline · SVG illustration',
    psi: psi([98, 100, 100, 100], [100, 100, 100, 100]),
    media: {
      hero: img('istanbul-sehir-ici-hero.png', 'İstanbul Şehir İçi homepage on desktop, with a technical illustration of a move between two buildings.', 'light'),
      landing: img('istanbul-sehir-ici-landing.png', 'İstanbul Şehir İçi dark, type-led landing section on desktop.', 'dark'),
      mobile: img('istanbul-sehir-ici-mobile.png', 'İstanbul Şehir İçi website on mobile.', 'light'),
      tablet: img('istanbul-sehir-ici-ipad.png', 'İstanbul Şehir İçi district page on tablet, showing its 39-district map.', 'light'),
    },
  },
  {
    id: 'ege',
    name: 'Ege Eşya',
    url: 'https://egeesya.com/',
    host: 'egeesya.com',
    strength: 'SEO at scale',
    line: 'An SEO-heavy service platform built around structured content, SSR and a database-driven publishing system.',
    role: 'Full-stack build, CMS and technical SEO architecture',
    ink: '#6a1f1c',
    rhythm: 'scale',
    facts: ['968 sitemap URLs', '15 admin editing surfaces', 'Server-rendered region and service content', 'Database-driven publishing'],
    stack: 'Nuxt 3 · Vue 3 · Tailwind CSS · GSAP · Prisma · REST API',
    psi: psi([null, null, 100, 100], [null, null, 100, 100]),
    media: {
      hero: img('ege-esya-hero.png', 'Ege Eşya homepage displayed on desktop.', 'light'),
      landing: img('ege-esya-landing-page.png', 'Ege Eşya services page on desktop.', 'light'),
      mobile: img('ege-esya-mobile.png', 'Ege Eşya website on mobile.', 'light'),
      tablet: img('ege-esya-ipad.png', 'Ege Eşya published service article on tablet.', 'light'),
    },
  },
  {
    id: 'evden',
    name: 'Evden Eve Nakliyat',
    url: 'https://evenakliyatevden.com/',
    host: 'evenakliyatevden.com',
    strength: 'The system behind the service',
    line: 'A full-stack service platform where the public experience and the management system were designed as one product.',
    role: 'Full-stack build, admin / CMS and production',
    ink: '#274237',
    rhythm: 'system',
    facts: ['Admin / CMS', 'SSR SEO architecture — sitemap, robots, metadata', 'Responsive mobile interface', 'Production deployment and maintenance'],
    stack: 'Nuxt 4 · Vue · TypeScript · Tailwind CSS · Prisma 7',
    psi: psi([94, 100, 100, 100], [95, 97, 100, 100]),
    media: {
      hero: img('evden-eve-nakliyat-hero.png', 'Evden Eve Nakliyat homepage displayed on desktop.', 'dark'),
      admin: img('evden-eve-nakliyat-admin.png', 'Evden Eve Nakliyat admin panel for managing service regions.', 'light'),
      mobile: img('evden-eve-nakliyat-mobile-2.png', 'Evden Eve Nakliyat website on mobile.', 'dark'),
      tablet: img('evden-eve-nakliyat-ipad-2.png', 'Evden Eve Nakliyat service page on tablet.', 'light'),
    },
  },
]

// ?n=1 … ?n=12 is a scalability harness only: it repeats the three projects
const n = Math.max(1, Math.min(12, Number(new URLSearchParams(location.search).get('n')) || base.length))
export const works = Array.from({ length: n }, (_, i) => ({ ...base[i % base.length], index: i, key: `${base[i % base.length].id}-${i}` }))

// the preview a work is registered with: wide on a wide screen, the real mobile capture on a phone
export const previewOf = (w, portrait) => (portrait ? w.media.mobile || w.media.tablet || w.media.hero : w.media.hero)

// Lab: Emrah's own interactive studies. Each clip is an authored window of a real screen recording
// (node tools/make-lab-clips.mjs); a study only exists where a room the visitor holds open can hold it.
const clip = (n, w, h, desc) => ({ n, w, h, aspect: w / h, mp4: `${BASE}opt/lab/lab-${n}.mp4`, poster: `${BASE}opt/lab/lab-${n}.webp`, desc })
export const lab = {
  title: 'Lab',
  line: 'Hold to make room. The rest of the surface has to give it.',
  entries: [
    clip('01', 1918, 956, 'Typographic magnification study'),
    clip('02', 1918, 954, 'Diagonal slab study'),
    clip('03', 1858, 954, 'Condensed vertical type study'),
    clip('04', 1868, 956, 'Single-line drawing study'),
    clip('05', 1866, 960, 'Row-smear type study'),
  ],
}
