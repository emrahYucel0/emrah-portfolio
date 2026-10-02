#!/bin/sh
# THE FLAG-OFF GATE. Everything the published site is checked against, in one pass.
#
#   sh run6.sh                 current build on 4500, baseline build on 4600
#   sh run6.sh 4500 4600       ...or name both ports
#
# Two gates can run at once from two worktrees (ROADMAP R16): each passes its own ports (serve.sh's SERVE_PORTS)
# and writes into its own worktree's out/. GATE_LOG names the log, for a second gate in the SAME worktree.
#
# The CURRENT server must already be running and must have been restarted since the last build — the CSP in
# .htaccess carries a hash of the HTML, so a server started before a rebuild will block the inline script, the
# runtime never boots, and every test fails in the same confusing way.
#
# The BASELINE server is looked after for you: if nothing serves it, the artifact is rebuilt from the tag
# baseline/pre-site-polish (see baseline.sh) into ../../../baselines/pre-site-polish and served. The baseline used
# to be a hand-built folder, and when it vanished the server went on answering, with 404, which surfaced as
# `window.__lab.A is undefined` rather than as "your baseline is gone".
#
# Needs axe.min.js at the served root for the a11y section:
#   cp tools/diag/node_modules/axe-core/axe.min.js .output/public/
CUR=${1:-4500}
BASE=${2:-4600}
BASELINE_TAG=${BASELINE_TAG:-baseline/pre-site-polish}
BASELINE_DIR=${BASELINE_DIR:-../../../baselines/pre-site-polish}
L=${GATE_LOG:-out/final6.log}
mkdir -p out

# ── A FAILING SECTION IS NEVER TRUNCATED ───────────────────────────────────────────────────────────────────
#
# Every section below used to be piped through `tail -N` or a grep. That keeps the log readable while everything
# passes and throws the reason away exactly when it is wanted: this gate reported `GESTURE: FAIL (5)` and
# `LAB A11Y: FAIL (1)` with not one failing assertion printed under either, and the only way to learn what failed
# was to run the harness again by hand.
#
# So every section's WHOLE output is kept in out/sections/<name>.log. On success the short form is appended, as
# before. On failure the whole of it is appended instead, whatever limit the short form would have used.
SECT=out/sections
mkdir -p $SECT
sect(){
  n=$1; short=$2; shift 2
  f=$SECT/$n.log
  "$@" > $f 2>&1
  rc=$?
  if [ $rc -eq 0 ]; then
    sh -c "$short" < $f >> $L
  else
    { echo "--- $n FAILED (exit $rc) — its whole output follows, untruncated ---"; cat $f; } >> $L
  fi
  return 0
}

code_of(){ curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$1/tr"; }

# ── the current build: yours to have running, because only you know when you last rebuilt ──────────────────
c=$(code_of $CUR)
if [ "$c" != "200" ]; then
  echo "PREFLIGHT FAILED: the build under test, http://127.0.0.1:$CUR/tr, answered $c, not 200."
  [ "$c" = "404" ] && echo "  Up but serving nothing — its directory is gone. Re-serve: node sv.cjs ../../.output/public $CUR --wk"
  [ "$c" = "000" ] && echo "  Nothing is listening. Start it: node sv.cjs ../../.output/public $CUR --wk   (and restart it after every rebuild)"
  exit 1
fi

# ── the baseline: rebuilt from its tag and served if it is not there ───────────────────────────────────────
c=$(code_of $BASE)
if [ "$c" != "200" ]; then
  echo "baseline on $BASE answered $c — bringing it up from $BASELINE_TAG"
  if [ ! -f "$BASELINE_DIR/tr/index.html" ]; then
    sh baseline.sh "$BASELINE_TAG" "$BASELINE_DIR" || { echo "PREFLIGHT FAILED: could not rebuild the baseline."; exit 1; }
  else
    echo "  the artifact is already at $BASELINE_DIR; only the server was missing"
  fi
  sect sv-BASELINE-DIR-BASE-wk-out-baseline-server-log- 'tail -4' node sv.cjs "$BASELINE_DIR" $BASE --wk >> out/baseline-server.log 2>&1 &
  i=0
  while [ "$(code_of $BASE)" != "200" ]; do
    i=$((i + 1)); [ $i -gt 40 ] && { echo "PREFLIGHT FAILED: served $BASELINE_DIR on $BASE but it never answered 200."; exit 1; }
    sleep 1
  done
  echo "  baseline is up on $BASE"
fi
# ── neither may be stale ───────────────────────────────────────────────────────────────────────────────────
# sv.cjs reads .htaccess once at startup and sends that CSP forever. A server left running across a rebuild
# therefore serves the new document with the old script hash: the inline script is refused, the runtime never
# boots, nothing 404s, and every harness fails in a way that looks like broken product code. Check it here, before
# a single browser is launched, rather than spending a gate run finding out.
for prt in $CUR $BASE; do
  if ! node cspboot.cjs --static $prt > out/preflight-$prt.log 2>&1; then
    echo "PREFLIGHT FAILED: the server on $prt sends a policy that does not match the document it serves."
    sed 's/^/  /' out/preflight-$prt.log
    echo "  Restart it — or bring the whole set up cleanly with:  sh serve.sh"
    exit 1
  fi
done
echo "preflight ok: $CUR (current) and $BASE (baseline, $BASELINE_TAG) both serve /tr, and neither is stale"

: > $L
say(){ echo "" >> $L; echo "########## $1 ##########" >> $L; }
say "CSP / BOOT UNDER THE PRODUCTION POLICY"
node cspboot.cjs $CUR chrome
sect cspboot-CUR-webkit 'tail -4' node cspboot.cjs $CUR webkit
say "RETIRED LAB — TR NORMAL";  sect labflash-CUR-normal-tr 'tail -7' env MSYS_NO_PATHCONV=1 node labflash.cjs $CUR normal  tr
say "RETIRED LAB — TR REDUCED"; sect labflash-CUR-reduced-tr 'tail -7' env MSYS_NO_PATHCONV=1 node labflash.cjs $CUR reduced tr
say "RETIRED LAB — EN NORMAL";  sect labflash-CUR-normal-en 'tail -7' env MSYS_NO_PATHCONV=1 node labflash.cjs $CUR normal  en
say "DESKTOP SPINE";            sect spine-CUR 'tail -34' node spine.cjs $CUR
# tail -4 used to cut the reason off: the log said "SPINE: FAIL (1)" with nothing above it
say "DESKTOP SPINE REDUCED";    sect spine-CUR-reduced 'tail -34' node spine.cjs $CUR reduced
# GESTURE_RUNS=n repeats this section in place, under the gate's own load (docs/KNOWN-ISSUES.md: owed after F2)
g=1; while [ $g -le ${GESTURE_RUNS:-1} ]; do
  say "ONE GESTURE = ONE STOP (run $g of ${GESTURE_RUNS:-1})";   sect gesture2-CUR 'tail -4' env MSYS_NO_PATHCONV=1 node gesture2.cjs $CUR
  g=$((g + 1))
done
say "INITIAL LOAD webkit";      sect boot-CUR-webkit-tr 'tail -11' env MSYS_NO_PATHCONV=1 node boot.cjs $CUR webkit /tr
say "INITIAL LOAD chrome";      sect boot-CUR-chrome-tr 'tail -11' env MSYS_NO_PATHCONV=1 node boot.cjs $CUR chrome /tr
say "BOOT RESPONSIVE webkit";   sect bootresp-CUR-webkit 'tail -3' env MSYS_NO_PATHCONV=1 node bootresp.cjs $CUR webkit
say "PROJECT TRANSITIONS";      sect proj-CUR 'tail -7' env MSYS_NO_PATHCONV=1 node proj.cjs $CUR
# NOTE: shell.cjs and spine.cjs both end with the same two "one control back to the Lab" checks — the two were
# restored from overlapping descriptions. Duplicated coverage, not a wrong result; worth deduplicating.
# Every line of a project's identity panel, sampled through the opening, at three desktop sizes in both
# languages: inside its panel, and AA against the pixels actually behind it. This replaces titlefit.cjs, which
# measured the MEDIAN luminance under the whole block and therefore passed while one line of a description sat
# outside the panel on the cream ground with a rule through it.
# Projects 1 and 2 are the two that use the shared identity panel. `authored` sets its name in the transparent
# bottom strip over its own capture — a different mechanism, a different contract, and a real AA failure at
# 1440x900 that is recorded in docs/KNOWN-ISSUES.md and needs an art-direction decision, not a check.
say "PROJECT IDENTITY PANELS — INSIDE, AND AA AGAINST WHAT IS BEHIND"
sect panelfit-CUR-gate-1920x1080-1440x900-1280x720-tr 'tail -12' env MSYS_NO_PATHCONV=1 node panelfit.cjs $CUR gate 1920x1080,1440x900,1280x720 tr,en 1,2
say "LAB SHELL / RESPONSIVE";   sect shell-CUR 'tail -10' node shell.cjs $CUR
say "LAB A11Y";                 sect labaxe-CUR 'tail -3' node labaxe.cjs $CUR
# the Contact finale's route: a document route (no runtime), its facts as DOM with and without JS, axe, both engines
say "CONTACT ROUTE";            sect contact-CUR 'tail -12' node contact.cjs $CUR
say "CONTACT FINALE — iOS 15.4";   sect compat-ios15-CUR 'tail -1' node compat-ios15.cjs $CUR
say "CONTACT SEAM — LAB ⇄ FINALE, ARRIVALS, HISTORY";   sect seam-CUR 'grep -E "FAIL|seam:|SEAM"' node seam.cjs $CUR
say "CONTACT FINALE — A11Y, KEYBOARD, LANGUAGE, REDUCED, PHONES";   sect finale-a11y-CUR 'grep -E "FAIL|FINALE A11Y"' node finale-a11y.cjs $CUR
say "CONTACT FINALE — THE WAY IN, THE GUIDE, THE FOOT BAND";   sect beckon-CUR 'grep -E "FAIL|BECKON"' node beckon.cjs $CUR
say "JOURNEY TR NORMAL";        sect journey-CUR-tr 'grep -E "FAIL|errors|JOURNEY"' node journey.cjs $CUR tr
say "JOURNEY EN REDUCED";       sect journey-CUR-en-reduced 'grep -E "FAIL|errors|JOURNEY"' node journey.cjs $CUR en reduced
say "NON-LAB NORMAL (baseline $BASE)";  sect nonlab-BASE-CUR 'tail -13' node nonlab.cjs $BASE $CUR
say "NON-LAB REDUCED (baseline $BASE)"; sect nonlabred-BASE-CUR 'tail -13' node nonlabred.cjs $BASE $CUR
echo "" >> $L; echo "RUN6 DONE" >> $L
