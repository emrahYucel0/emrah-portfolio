export interface FinaleItem {
  id: 'email' | 'phone' | 'github' | 'linkedin' | 'location'
  kind: 'mail' | 'tel' | 'link' | 'fact'
  /** the plotted label (hidden for the links: the short name IS the word) */
  label: string
  /** the full fact the DOM carries (and the clipboard copies, for the email) */
  text: string
  /** what the pen WRITES */
  word: string
  /** the narrow sheet may set the value on these lines (the email, the location) */
  lines?: string[]
  /** the DOM fallback line's text when it differs from `word` (the links drop the pen's arrow) */
  valText?: string
  /** the links' accessible name */
  sr?: string
  href?: string
  /** default share of the area */
  amp: number
  /** narrow sheet, attended: one horizontal scale for pen and face (the phone) */
  condense?: number
  /** false: never soaks on the narrow sheet (the phone) */
  narrowSoak?: boolean
}

export interface FinaleStrings {
  contact: { heading: string }
  finale: { copy: string; copied: string; ink: string; inkOut: string; revision: string }
  labTitle: string
  registered: string
}

export interface Finale {
  /** jump to the settled state (the menu / #contact arrival) */
  arrive(): void
  /** where the reader is on the track, 0…1 */
  progress(): number
  /** back to a track position, 0…1 */
  goTo(f: number): void
  destroy(): void
}

export declare function createFinale(o: {
  track: HTMLElement
  paper: HTMLCanvasElement
  ink: HTMLCanvasElement
  contact: HTMLElement
  status: HTMLElement
  footLeft: HTMLElement
  footRight: HTMLElement
  items: FinaleItem[]
  strings: FinaleStrings
  lang: 'tr' | 'en'
  /** at p = 0, a gesture UP — the way back to the Lab */
  onTopUp?: () => void
}): Finale
