#!/bin/sh
# THE FLAG-OFF GATE. Everything the published site is checked against, in one pass.
#
#   sh run6.sh                 current build on 4500, baseline build on 4600
#   sh run6.sh 4500 4600       ...or name both ports
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
L=out/final6.log
mkdir -p out

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
  node sv.cjs "$BASELINE_DIR" $BASE --wk >> out/baseline-server.log 2>&1 &
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
node cspboot.cjs $CUR chrome  2>&1 | tail -4 >> $L
node cspboot.cjs $CUR webkit  2>&1 | tail -4 >> $L
say "RETIRED LAB — TR NORMAL";  MSYS_NO_PATHCONV=1 node labflash.cjs $CUR normal  tr 2>&1 | tail -7 >> $L
say "RETIRED LAB — TR REDUCED"; MSYS_NO_PATHCONV=1 node labflash.cjs $CUR reduced tr 2>&1 | tail -7 >> $L
say "RETIRED LAB — EN NORMAL";  MSYS_NO_PATHCONV=1 node labflash.cjs $CUR normal  en 2>&1 | tail -7 >> $L
say "DESKTOP SPINE";            node spine.cjs $CUR          2>&1 | tail -34 >> $L
# tail -4 used to cut the reason off: the log said "SPINE: FAIL (1)" with nothing above it
say "DESKTOP SPINE REDUCED";    node spine.cjs $CUR reduced  2>&1 | tail -34 >> $L
say "ONE GESTURE = ONE STOP";   MSYS_NO_PATHCONV=1 node gesture2.cjs $CUR 2>&1 | tail -4 >> $L
say "INITIAL LOAD webkit";      MSYS_NO_PATHCONV=1 node boot.cjs $CUR webkit /tr 2>&1 | tail -11 >> $L
say "INITIAL LOAD chrome";      MSYS_NO_PATHCONV=1 node boot.cjs $CUR chrome /tr 2>&1 | tail -11 >> $L
say "BOOT RESPONSIVE webkit";   MSYS_NO_PATHCONV=1 node bootresp.cjs $CUR webkit 2>&1 | tail -3 >> $L
say "PROJECT TRANSITIONS";      MSYS_NO_PATHCONV=1 node proj.cjs $CUR 2>&1 | tail -7 >> $L
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
MSYS_NO_PATHCONV=1 node panelfit.cjs $CUR gate 1920x1080,1440x900,1280x720 tr,en 1,2 2>&1 | tail -12 >> $L
say "LAB SHELL / RESPONSIVE";   node shell.cjs $CUR          2>&1 | tail -10 >> $L
say "LAB A11Y";                 node labaxe.cjs $CUR         2>&1 | tail -3  >> $L
say "JOURNEY TR NORMAL";        node journey.cjs $CUR tr     2>&1 | tail -5  >> $L
say "JOURNEY EN REDUCED";       node journey.cjs $CUR en reduced 2>&1 | tail -5 >> $L
say "NON-LAB NORMAL (baseline $BASE)";  node nonlab.cjs $BASE $CUR    2>&1 | tail -13 >> $L
say "NON-LAB REDUCED (baseline $BASE)"; node nonlabred.cjs $BASE $CUR 2>&1 | tail -13 >> $L
echo "" >> $L; echo "RUN6 DONE" >> $L
