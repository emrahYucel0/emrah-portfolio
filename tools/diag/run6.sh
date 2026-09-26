#!/bin/sh
# THE FLAG-OFF GATE. Everything the published site is checked against, in one pass.
#
#   sh run6.sh            current build on 4500, baseline build on 4700
#
# The servers must already be running and must have been restarted since the last build — the CSP in .htaccess
# carries a hash of the HTML, so a server started before a rebuild will block the inline script and every test
# will fail in the same confusing way.
#
# Needs axe.min.js at the served root for the a11y section:
#   cp tools/diag/node_modules/axe-core/axe.min.js .output/public/
L=out/final6.log
mkdir -p out
: > $L
say(){ echo "" >> $L; echo "########## $1 ##########" >> $L; }
say "RETIRED LAB — TR NORMAL";  MSYS_NO_PATHCONV=1 node labflash.cjs 4500 normal  tr 2>&1 | tail -7 >> $L
say "RETIRED LAB — TR REDUCED"; MSYS_NO_PATHCONV=1 node labflash.cjs 4500 reduced tr 2>&1 | tail -7 >> $L
say "RETIRED LAB — EN NORMAL";  MSYS_NO_PATHCONV=1 node labflash.cjs 4500 normal  en 2>&1 | tail -7 >> $L
say "DESKTOP SPINE";            node spine.cjs 4500          2>&1 | tail -8  >> $L
say "DESKTOP SPINE REDUCED";    node spine.cjs 4500 reduced  2>&1 | tail -4  >> $L
say "ONE GESTURE = ONE STOP";   MSYS_NO_PATHCONV=1 node gesture2.cjs 4500 2>&1 | tail -4 >> $L
say "INITIAL LOAD webkit";      MSYS_NO_PATHCONV=1 node boot.cjs 4500 webkit /tr 2>&1 | tail -11 >> $L
say "INITIAL LOAD chrome";      MSYS_NO_PATHCONV=1 node boot.cjs 4500 chrome /tr 2>&1 | tail -11 >> $L
say "BOOT RESPONSIVE webkit";   MSYS_NO_PATHCONV=1 node bootresp.cjs 4500 webkit 2>&1 | tail -3 >> $L
say "PROJECT TRANSITIONS";      MSYS_NO_PATHCONV=1 node proj.cjs 4500 2>&1 | tail -5 >> $L
say "WEIGHT CLIPPING";          node edge.cjs 4500 webkit    2>&1 | tail -3  >> $L
say "LAB SHELL / RESPONSIVE";   node shell.cjs 4500          2>&1 | tail -8  >> $L
say "LAB A11Y";                 node labaxe.cjs 4500         2>&1 | tail -3  >> $L
say "JOURNEY TR NORMAL";        node journey.cjs 4500 tr     2>&1 | tail -4  >> $L
say "JOURNEY EN REDUCED";       node journey.cjs 4500 en reduced 2>&1 | tail -4 >> $L
say "NON-LAB NORMAL";           node nonlab.cjs 4700 4500    2>&1 | tail -4  >> $L
say "NON-LAB REDUCED";          node nonlabred.cjs 4700 4500 2>&1 | tail -4  >> $L
echo "" >> $L; echo "RUN6 DONE" >> $L
