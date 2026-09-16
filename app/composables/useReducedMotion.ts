/**
 * Motion hook for the future C2 engine: reduced motion is an intentional state, not a disabled animation.
 * Server-side it resolves to `false` so prerendered HTML stays neutral; the client corrects it on mount.
 */
export function useReducedMotion() {
  const reduced = useState<boolean>('reduced-motion', () => false)

  onMounted(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const apply = () => {
      reduced.value = query.matches
      document.documentElement.dataset.reducedMotion = query.matches ? 'true' : 'false'
    }
    apply()
    query.addEventListener('change', apply)
    onBeforeUnmount(() => query.removeEventListener('change', apply))
  })

  return reduced
}
