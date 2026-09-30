import { C2_ARRIVE } from './useC2Engine'

/** a place on the runtime's index the Lab can leave for — Work above it, and the name the chrome carries (Contact,
 *  below it, is a route of its own: useContactSeam) */
export type LabExit = 'name' | 'work'

/**
 * LEAVING THE LAB FOR THE RUNTIME. The Lab is the fifth destination. Work, above it, belongs to the C2 runtime, which
 * lives on the locale route (Contact, below it, is a route of its own — useContactSeam). So leaving the Lab upwards
 * is a navigation back to that route carrying one thing: which place the visitor was heading for. It rides on the history entry,
 * not in the URL, so Back and Forward carry it without the address ever naming an internal state.
 */
export function useLabHandoff() {
  const router = useRouter()
  const { path } = useLocale()

  const leave = (to: LabExit) => router.push({ path: path('/'), state: { [C2_ARRIVE]: to } })

  return { leave }
}
