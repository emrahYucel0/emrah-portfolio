#!/bin/sh
# THE FLAG-OFF GATE. Everything the published site is checked against, in one pass.
#
#   sh run6.sh                 current build on 4500, baseline build on 4700
#   sh run6.sh 4500 4600       ...or name both ports
#
# The servers must already be running and must have been restarted since the last build — the CSP in .htaccess
# carries a hash of the HTML, so a server started before a rebuild will block the inline script, the runtime never
# boots, and every test fails in the same confusing way. The preflight below catches the other half of that class
# of mistake: a server whose artifact directory no longer exists still answers, but answers 404, and the tests then
# fail with `window.__lab.A is undefined` instead of telling you the baseline is gone.
#
# Needs axe.min.js at the served root for the a11y section:
#   cp tools/diag/node_modules/axe-core/axe.min.js .output/public/
CUR=${1:-4500}
BASE=${2:-4700}
L=out/final6.log
mkdir -p out

for prt in $CUR $BASE; do
  code=$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$prt/tr")
  if [ "$code" != "200" ]; then
    echo "PREFLIGHT FAILED: http://127.0.0.1:$prt/tr answered $code, not 200."
    [ "$code" = "404" ] && echo "  A 404 means the server is up but its artifact directory is gone. Re-serve the build:"
    [ "$code" = "404" ] && echo "    node sv.cjs <path-to>/.output/public $prt --wk"
    [ "$code" = "000" ] && echo "  Nothing is listening on $prt. Start it with sv.cjs, and remember to restart after every rebuild."
    exit 1
  fi
done
echo "preflight ok: $CUR (current) and $BASE (baseline) both serve /tr"

: > $L
say(){ echo "" >> $L; echo "########## $1 ##########" >> $L; }
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
say "WEIGHT CLIPPING";          node edge.cjs $CUR webkit    2>&1 | tail -5  >> $L
# NOTE: shell.cjs and spine.cjs both end with the same two "one control back to the Lab" checks — the two
# were restored from overlapping descriptions. Duplicated coverage, not a wrong result; worth deduplicating.
say "LAB SHELL / RESPONSIVE";   node shell.cjs $CUR          2>&1 | tail -10 >> $L
say "LAB A11Y";                 node labaxe.cjs $CUR         2>&1 | tail -3  >> $L
say "JOURNEY TR NORMAL";        node journey.cjs $CUR tr     2>&1 | tail -4  >> $L
say "JOURNEY EN REDUCED";       node journey.cjs $CUR en reduced 2>&1 | tail -4 >> $L
say "NON-LAB NORMAL (baseline $BASE)";  node nonlab.cjs $BASE $CUR    2>&1 | tail -13 >> $L
say "NON-LAB REDUCED (baseline $BASE)"; node nonlabred.cjs $BASE $CUR 2>&1 | tail -13 >> $L
echo "" >> $L; echo "RUN6 DONE" >> $L
