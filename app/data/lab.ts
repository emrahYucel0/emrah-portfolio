import type { StudyClip } from './media'

export const STUDY_IDS = ['01', '02', '03', '04', '05'] as const
export type StudyId = (typeof STUDY_IDS)[number]

export interface Study {
  readonly id: StudyId
  /** filled in when the Lab is migrated; the clips stay out of the production repo until then */
  readonly clip?: StudyClip
}

export const studies: readonly Study[] = STUDY_IDS.map((id) => ({ id }))
