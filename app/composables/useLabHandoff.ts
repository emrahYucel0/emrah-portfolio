import { C2_ARRIVE } from './useC2Engine'

/** a place on the site's index — the two either side of the Lab, and the name the chrome carries */
export type LabExit = 'name' | 'work' | 'rest'

/**
 * LEAVING THE LAB FOR THE SITE. The Lab is the fifth destination, and the two places either side of it — Work above,
 * Contact below — belong to the C2 runtime, which lives on the locale route. So leaving the Lab is a navigation
 * back to that route carrying one thing: which place the visitor was heading for. It rides on the history entry,
 * not in the URL, so Back and Forward carry it without the address ever naming an internal state.
 */
export function useLabHandoff() {
  const router = useRouter()
  const { path } = useLocale()

  const leave = (to: LabExit) => router.push({ path: path('/'), state: { [C2_ARRIVE]: to } })

  return { leave }
}
