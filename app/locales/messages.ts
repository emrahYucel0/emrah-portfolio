import type { ProjectId, ProjectRole } from '~/data/projects'
import type { StudyId } from '~/data/lab'

/** One shape, two languages. Neither locale is a translation layer over the other. */
export interface Messages {
  readonly meta: {
    readonly home: { readonly title: string; readonly description: string }
    readonly about: { readonly title: string; readonly description: string }
  }
  readonly nav: {
    readonly skip: string
    readonly label: string
    readonly home: string
    readonly work: string
    readonly about: string
    readonly lab: string
    readonly contact: string
  }
  readonly roles: { readonly creative: string; readonly fullStack: string }
  readonly home: {
    readonly intro: string
    readonly workHeading: string
    readonly labHeading: string
    readonly labLine: string
    readonly aboutLink: string
  }
  readonly about: {
    readonly heading: string
    readonly intro: string
    readonly background: string
    readonly transition: string
    readonly current: string
    readonly status: string
    readonly capabilitiesHeading: string
    readonly capabilities: readonly string[]
    readonly back: string
  }
  readonly work: {
    readonly lines: Readonly<Record<ProjectId, string>>
    readonly roleLabels: Readonly<Record<ProjectRole, string>>
    readonly visit: string
  }
  readonly lab: { readonly studies: Readonly<Record<StudyId, string>> }
  readonly contact: {
    readonly heading: string
    readonly location: string
    readonly status: string
    readonly emailLabel: string
    readonly phoneLabel: string
  }
  readonly localeSwitch: { readonly label: string; readonly to: string }
  readonly entry: { readonly title: string; readonly description: string; readonly choose: string }
}
