/*
 * ── DELIBERATELY BROKEN CORRIDORS ───────────────────────────────────────────────────────────────────────────
 *
 * A measurement that has only ever been run against the build it is meant to approve has not been shown to
 * measure anything. Each of these is the corridor with one rule removed or restored to what it was when a fault
 * was reported, and the check that owns it must find it guilty.
 *
 * They live here rather than in the debug entry because the review now happens on the site's own path: the
 * passage is a place on the index, so its checks have to be able to reach the same broken builds there.
 * `?lfbreak=` is read only in a build where __LINEFIELD__ is true, so none of this exists in a published one.
 *
 *   dense      the field never thins: the density the WORDS need, sent whole down the corridor. What the
 *              density measure is calibrated against — it reads about 2.2x the high-frequency energy.
 *   inverse    the Newton guard drops the sign and there is no residual test — the build that drew a column of
 *              dashes and a ghost fan past the vanishing point. lfbeyond.cjs must fail on it.
 *   noextent   the field's extent is removed altogether, so every word is certainly whole. Not a fault: the
 *              reference frame lfwords.cjs compares a real frame against.
 *   extentall  the extent applied to type as well as ground — what the code did when the top of FEEL went
 *              missing in flight. lfwords.cjs must find it guilty against noextent.
 *   thinall    the thinning applied to type as well as ground: seven rows in eight taken out of every letter
 *              while it flows past, which is the thin grey ghost the revision before this one was about. This
 *              is what calibrates "every word whole" now — see the note there.
 *   nowhisker  type keeps the GROUND's whisker at the vanishing point.
 */
import { CORRIDOR_PATCH } from './corridor.js'

/*
 * A PATCH THAT CHANGES NOTHING MUST NOT BE SILENT.
 *
 * These breaks are string surgery on the shader, so a rename in the corridor turns one into a no-op: the broken
 * build becomes identical to the real one, the check that owns it finds nothing wrong, and it reports PASS — having
 * quietly stopped testing anything. That happened. lfSol(sol) replaced the smoothstep over `sol` and three of the
 * six breaks below stopped matching; the WHOLE check noticed only because it ALSO asserts that the break makes it
 * fail, which is the entire reason that assertion is there.
 *
 * So every replacement is checked, and a break that no longer matches throws by name instead of handing back an
 * unbroken corridor.
 */
const cut = (src, from, to, who) => {
  if (!src.includes(from)) throw new Error('lfbreak=' + who + ' no longer matches the shader: ' + from.slice(0, 48))
  return src.replace(from, to)
}

export function patchFor(name) {
  if (name === 'inverse') {
    return {
      ...CORRIDOR_PATCH,
      warp: cut(
        cut(CORRIDOR_PATCH.warp, 'float gg = abs(g) < 1e-4 ? (g < 0.0 ? -1e-4 : 1e-4) : g;', 'float gg = abs(g) < 1e-4 ? 1e-4 : g;', 'inverse'),
        'fade *= 1.0 - smoothstep(0.35, 1.1, res);', '', 'inverse'),
    }
  }
  if (name === 'noextent') {
    return { ...CORRIDOR_PATCH, pars: cut(CORRIDOR_PATCH.pars, '* lfExtent(r, sol)', '', 'noextent') }
  }
  if (name === 'extentall') {
    return { ...CORRIDOR_PATCH, pars: cut(CORRIDOR_PATCH.pars, 'mix(inside, 1.0, lfSol(sol))', 'inside', 'extentall') }
  }
  if (name === 'thinall') {
    return { ...CORRIDOR_PATCH, pars: cut(CORRIDOR_PATCH.pars, 'return mix(mix(1.0, kept, clamp(uLFthin.y, 0.0, 1.0)), 1.0, lfSol(sol));', 'return mix(1.0, kept, clamp(uLFthin.y, 0.0, 1.0));', 'thinall') }
  }
  if (name === 'nowhisker') {
    return { ...CORRIDOR_PATCH, pars: cut(CORRIDOR_PATCH.pars, 'lfWhiskType_cur, lfSol(sol)', 'lfWhisk_cur, lfSol(sol)', 'nowhisker') }
  }
  // `dense` is the real corridor with the thinning switched off at the uniform, not a patched program
  return CORRIDOR_PATCH
}

/** the name asked for on this page, or null */
export function breakName() {
  try { return new URLSearchParams(location.search).get('lfbreak') } catch { return null }
}
