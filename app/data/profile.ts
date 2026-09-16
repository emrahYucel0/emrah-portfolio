// Verified data only. Nothing here may be invented — no CV, no social accounts that do not exist.
export const profile = {
  name: 'Emrah Yücel',
  email: 'info@yucelemrah.com',
  phone: { display: '+90 506 519 96 91', href: 'tel:+905065199691' },
  links: [
    { id: 'github', label: 'GitHub', href: 'https://github.com/emrahYucel0' },
    { id: 'linkedin', label: 'LinkedIn', href: 'https://www.linkedin.com/in/emrah-yucel/' },
  ],
  /** No verified PDF exists yet. When one does, this becomes its public path — never a placeholder. */
  cv: null as string | null,
} as const

export type ProfileLink = (typeof profile.links)[number]
