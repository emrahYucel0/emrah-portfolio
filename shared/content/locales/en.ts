import type { LocaleCopy } from '../types'

/** replaced at transform time by the bundler; see the note in nuxt.config.ts */
declare const __LINEFIELD__: boolean

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
    lab: {
      title: 'Lab — Emrah Yücel',
      description:
        'The same material on something other than my name: area and share, length and structure, an image built from row weight alone.',
    },
    contact: {
      title: 'Contact — Emrah Yücel',
      description: 'Contact Emrah Yücel: email, phone, GitHub, LinkedIn. İstanbul, Türkiye.',
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
  /*
   * LINEFIELD is unreleased, so its copy leaves the published bundle with its code. The flag is a
   * build-time constant, so with it false this is `... {}` and the words are not in the file at all —
   * which is what the flag-off gate greps the built JavaScript for.
   */
  ...(typeof __LINEFIELD__ !== 'undefined' && __LINEFIELD__ ? { linefield: {
    heading: 'How I think',
    backendLabel: 'BACKEND — HOW I THINK',
    frontendLabel: 'FRONTEND — HOW I THINK',
    backendSaid: 'State, scale, failure, truth',
    frontendSaid: 'Feel, timing, friction, first paint',
  } } : {}),
  work: {
    heading: 'Work',
    intro: 'Three production sites for service businesses — each designed and built end to end.',
    open: 'Hold the image to open it',
    openTouch: 'Tap the image to open it',
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
    line: 'The same material, tried on something other than my name. Each study tests one property.',
    heading: 'Lab studies',
    registered: 'registered',
    registering: 're-registering',
    open: 'open',
    count: 'Lab · 03 studies',
    back: 'Lab',
    studies: {
      weight: {
        name: 'Weight',
        prim: 'area · partition',
        note: 'A fixed area, and words that must take room from each other. The rules move; the sheet re-shares itself.',
        question: 'Where attention goes, does the area follow?',
      },
      line: {
        name: 'Line',
        prim: 'length · structure',
        note: 'One line of fixed length. Every structure is spent from the same run; what is left waits at the edge.',
        question: 'How much structure can one line carry?',
      },
      tone: {
        name: 'Tone',
        prim: 'image · row weight',
        note: 'Tonal information carried by the weight of the rows themselves. No picture underneath — the rows are the picture.',
        question: 'Can an image be built from row weight alone?',
      },
    },
    line_states: ['taut', 'curve', 'aperture', 'gathered', 'released', 'boundary'],
    line_says: [
      'Taut — the whole run lies in one length.',
      'Curve — the same length, given one slow bend.',
      'Aperture — the line opens; structure is bought with length.',
      'Gathered — the run is wound into one close spool.',
      'Released — the same length, opened back out into the field.',
      'Boundary — the line reaches an edge it does not cross, and what is left rests on it.',
    ],
    line_spent: 'spent',
    line_held: 'still at the edge',
    tone_sources: ['photograph', 'interface', 'material'],
    tone_rows: 'rows',
    weight_holds: 'holds the page',
  },
  contact: { heading: 'Contact', emailLabel: 'Email', phoneLabel: 'Phone' },
  finale: {
    copy: 'copy', copied: 'copied', copyEmail: 'Copy the email address', locationRole: 'Location',
    revision: 'Revision', githubAria: 'GitHub profile', linkedinAria: 'LinkedIn profile',
    hintScroll: 'scroll', hintCursor: 'move your cursor', hintKeepScrolling: 'keep scrolling',
  },
  psi: {
    head: 'PageSpeed Insights', mobile: 'Mobile', desktop: 'Desktop',
    labels: ['Performance', 'Accessibility', 'Best Practices', 'SEO'],
    short: ['PERF', 'A11Y', 'BP', 'SEO'],
  },
  hints: {
    quietSeparator: ' · ',
    face: 'hold', faceTouch: 'squeeze with two fingers',
    work: 'scroll · hold the image', workTouch: 'slide sideways · tap the image',
    world: 'scroll',
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
