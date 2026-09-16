import type { LocaleCopy } from '../types'

export const en = {
  meta: {
    home: {
      title: 'Emrah Yücel — Creative Developer & Full-Stack Developer',
      description:
        'Emrah Yücel is a Creative Developer and Full-Stack Developer in Istanbul: interaction, frontend engineering, backend systems, CMS, performance and technical SEO.',
    },
    about: {
      title: 'About — Emrah Yücel',
      description:
        'From chemistry and industrial production to creative development and full-stack systems — how Emrah Yücel works, and what he builds.',
    },
    imageAlt: 'Emrah Yücel — Creative Developer and Full-Stack Developer. The name set in horizontal rows of ink on paper.',
  },
  nav: { skip: 'Skip to plain navigation', label: 'Portfolio', work: 'Work', about: 'About', lab: 'Lab', contact: 'Contact' },
  roles: { creative: 'Creative Developer', fullStack: 'Full-Stack Developer', and: 'and' },
  identity: {
    city: 'Istanbul',
    location: 'Istanbul, Türkiye',
    status: 'Available for selected freelance work',
    positioning: ['I build the surface you touch', 'and the system underneath it.'],
  },
  home: {
    intro:
      'I’m Emrah Yücel, a Creative Developer and Full-Stack Developer based in Istanbul. I design expressive digital experiences and engineer the systems behind them.',
    positioning: 'I design how it moves and engineer what it runs on.',
    more: 'More about me',
    workHeading: 'Work',
    labHeading: 'Lab',
  },
  about: {
    heading: 'About',
    intro:
      'I’m Emrah Yücel, a Creative Developer and Full-Stack Developer based in Istanbul. I build digital experiences end to end — from interaction and frontend engineering to backend systems, CMS, performance and production.',
    background:
      'My path into software began in chemistry and industrial production. Working with formulation, quality control and technical constraints trained me to think in systems, test assumptions, measure what matters and care about repeatability.',
    transition:
      'That mindset stayed with me when I moved into software. I still work the same way: understand the system, work with its constraints, then refine the result until the visual and technical parts feel like one thing.',
    current:
      'Today I work across creative development, frontend, full-stack systems, CMS/admin architecture, performance and technical SEO.',
    status: 'Available for selected freelance projects.',
    capabilitiesHeading: 'Capabilities',
    capabilities: [
      'Creative Development', 'Motion & Interaction', 'Frontend Engineering',
      'Full-Stack Development', 'CMS / Admin Systems', 'Performance & Technical SEO',
    ],
    back: 'Back',
  },
  faces: {
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
  },
  work: {
    heading: 'Work',
    intro: 'Three production sites for service businesses — each designed and built end to end.',
    open: 'Hold the image to open it',
    visit: 'Visit',
    allWork: 'All work',
    next: 'Next',
    again: 'Again',
    projectNav: 'Project',
    projects: {
      istanbul: {
        strength: 'Original digital direction',
        line: 'A conventional service category treated as an authored digital experience — custom visual language, technical illustration and a very lean SSR build.',
        role: 'Original visual direction, creative frontend engineering and high-performance production.',
        facts: ['Custom visual language and technical illustration', '39-district content approach', 'Bounded price calculator', 'Admin / CMS'],
        captions: { illustration: 'Technical illustration', landing: 'Type-led landing' },
        alts: { hero: "İstanbul Şehir İçi homepage on desktop, with a technical illustration of a move between two buildings.", landing: "İstanbul Şehir İçi dark, type-led landing section on desktop.", mobile: "İstanbul Şehir İçi website on mobile.", tablet: "İstanbul Şehir İçi district page on tablet, showing its 39-district map." },
      },
      ege: {
        strength: 'SEO at scale',
        line: 'An SEO-heavy service platform built around structured content, SSR and a database-driven publishing system.',
        role: 'SEO architecture, scalable content structure and systematic publishing.',
        facts: ['968 sitemap URLs', '15 admin editing surfaces', 'Server-rendered region and service content', 'Database-driven publishing'],
        captions: { structure: 'Publishing architecture' },
        alts: { hero: "Ege Eşya homepage displayed on desktop.", landing: "Ege Eşya services page on desktop.", mobile: "Ege Eşya website on mobile.", tablet: "Ege Eşya published service article on tablet." },
      },
      evden: {
        strength: 'The system behind the service',
        line: 'A full-stack service platform where the public experience and the management system were designed as one product.',
        role: 'CMS/admin system, full-stack architecture and production performance.',
        facts: ['Admin / CMS', 'SSR SEO architecture — sitemap, robots, metadata', 'Responsive mobile interface', 'Production deployment and maintenance'],
        captions: { admin: 'The management system behind the public site · Admin / CMS', production: 'In production' },
        alts: { hero: "Evden Eve Nakliyat homepage displayed on desktop.", admin: "Evden Eve Nakliyat admin panel for managing service regions.", mobile: "Evden Eve Nakliyat website on mobile.", tablet: "Evden Eve Nakliyat service page on tablet." },
      },
    },
  },
  lab: {
    title: 'Lab',
    line: 'Hold to make room. The rest of the surface has to give it.',
    heading: 'Lab studies',
    studies: {
      '01': 'Typographic magnification study',
      '02': 'Diagonal slab study',
      '03': 'Condensed vertical type study',
      '04': 'Single-line drawing study',
      '05': 'Row-smear type study',
    },
  },
  contact: { heading: 'Contact', emailLabel: 'Email', phoneLabel: 'Phone' },
  psi: {
    head: 'PageSpeed Insights', mobile: 'Mobile', desktop: 'Desktop',
    labels: ['Performance', 'Accessibility', 'Best Practices', 'SEO'],
    short: ['PERF', 'A11Y', 'BP', 'SEO'],
  },
  hints: {
    quietSeparator: ' · ',
    open: 'press and hold', openTouch: 'hold between the names',
    face: 'hold', faceTouch: 'squeeze with two fingers',
    work: 'scroll · hold the image', workTouch: 'slide sideways · hold the image',
    lab: 'hold anywhere', world: 'scroll',
  },
  a11y: {
    plainNav: 'Plain navigation', selectedWork: 'Selected work', labStudies: 'Lab studies',
    aboutRegion: 'About', aboutDetail: 'About Emrah Yücel', capabilities: 'Capabilities',
    projectImages: 'Images in this project:',
    keys: 'Use the arrow keys, or Page Up and Page Down, to move through the portfolio.',
    workKeys: 'Left and right arrow keys choose a project; Enter opens it.',
    worldKeys: 'Arrow keys move through the project; Escape returns to all work.',
    labKeys: 'Press Enter to make a room; each room shows the next study.',
    newTab: '(opens in a new tab)',
    openProject: 'Open project',
    openHint: 'Activate with keyboard or screen reader.',
  },
  localeSwitch: { label: 'Language', to: 'Türkçe', short: 'TR', hreflang: 'tr-TR' },
  entry: {
    title: 'Emrah Yücel — Creative Developer & Full-Stack Developer',
    description: 'Creative Developer and Full-Stack Developer in Istanbul. Choose a language.',
    choose: 'Choose a language',
  },
  notFound: { title: 'Not found', message: 'This page does not exist.' },
} satisfies LocaleCopy
