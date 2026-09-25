import type { ProfileFacts, ProjectFacts } from './types'

/** Verified, locale-independent. Nothing here may be invented, and nothing here is translated. */
export const profile: ProfileFacts = {
  name: 'Emrah Yücel',
  email: 'info@yucelemrah.com',
  phone: '+90 506 519 96 91',
  tel: '+905065199691',
  links: [
    { id: 'github', label: 'GitHub', href: 'https://github.com/emrahYucel0' },
    { id: 'linkedin', label: 'LinkedIn', href: 'https://www.linkedin.com/in/emrah-yucel/' },
  ],
  cv: null, // no real CV PDF exists yet — nothing is exposed until one does
}

/** PageSpeed Insights values are facts: stored once, identical in every locale. */
export const projects: ProjectFacts[] = [
  {
    id: 'istanbul',
    name: 'İstanbul Şehir İçi',
    url: 'https://istanbulsehirici.com/',
    host: 'istanbulsehirici.com',
    ink: '#8e3a17',
    rhythm: 'authored',
    stack: 'Nuxt SSR · project-served fonts · custom image pipeline · SVG illustration',
    psi: { mobile: [98, 100, 100, 100], desktop: [100, 100, 100, 100] },
    media: {
      hero: { file: 'istanbul-sehir-ici-hero.png', shade: 'light' },
      landing: { file: 'istanbul-sehir-ici-landing.png', shade: 'dark' },
      mobile: { file: 'istanbul-sehir-ici-mobile.png', shade: 'light' },
      tablet: { file: 'istanbul-sehir-ici-ipad.png', shade: 'light' },
    },
  },
  {
    id: 'ege',
    name: 'Ege Eşya',
    url: 'https://egeesya.com/',
    host: 'egeesya.com',
    ink: '#6a1f1c',
    rhythm: 'scale',
    stack: 'Nuxt 3 · Vue 3 · Tailwind CSS · GSAP · Prisma · REST API',
    psi: { mobile: [null, null, 100, 100], desktop: [null, null, 100, 100] },
    media: {
      hero: { file: 'ege-esya-hero.png', shade: 'light' },
      landing: { file: 'ege-esya-landing-page.png', shade: 'light' },
      mobile: { file: 'ege-esya-mobile.png', shade: 'light' },
      tablet: { file: 'ege-esya-ipad.png', shade: 'light' },
    },
  },
  {
    id: 'evden',
    name: 'Evden Eve Nakliyat',
    url: 'https://evenakliyatevden.com/',
    host: 'evenakliyatevden.com',
    ink: '#274237',
    rhythm: 'system',
    stack: 'Nuxt 4 · Vue · TypeScript · Tailwind CSS · Prisma 7',
    psi: { mobile: [94, 100, 100, 100], desktop: [95, 97, 100, 100] },
    media: {
      hero: { file: 'evden-eve-nakliyat-hero.png', shade: 'dark' },
      admin: { file: 'evden-eve-nakliyat-admin.png', shade: 'light' },
      mobile: { file: 'evden-eve-nakliyat-mobile-2.png', shade: 'dark' },
      tablet: { file: 'evden-eve-nakliyat-ipad-2.png', shade: 'light' },
    },
  },
]

/** The three studies the Lab bench registers. Each is an experiment, not a recording: it has no media. */
export const studies = ['weight', 'line', 'tone'] as const
