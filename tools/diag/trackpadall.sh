#!/bin/sh
# RUN trackpad.cjs TO COMPLETION, ONE SHAPE AT A TIME.
#
#   sh trackpadall.sh <port> [engine] [runs]
#
# The gate gave this harness 1200 s and it was cut off mid-run, 101 results in, with everything it had produced
# passing. That was not a hang: trackpad reloads the page for every case (goTo does a full navigation, then waits
# 2.6 s settled, then another 2.6 s if it has to travel), so a case costs about 12 s and the whole default suite
# is 7 shapes x 5 places x 2 directions x 2 delivery modes = 140 cases per run, about 28 minutes. Three runs is
# about 87 minutes.
#
# So it is split by SHAPE. Each chunk is ~20 cases, four to five minutes, with its own timeout: one wedged chunk
# can no longer take the whole suite down with it, and a failing shape is re-runnable on its own. Per-chunk logs
# go to out/trackpad/<shape>.log; the summary lines are collected at the end.
PORT=${1:-4934}
ENGINE=${2:-chrome}
RUNS=${3:-1}
SHAPES="mac60 mac60hard mac120hard ptp ptphard coast tail"
OUT=out/trackpad
mkdir -p $OUT
export NODE_PATH="C:/Users/monster/Desktop/EmrahYucel-Portfolio/img/node_modules"
echo "== trackpad, every shape, port $PORT, $ENGINE, runs $RUNS"
for s in $SHAPES; do
  t=$(date +%s)
  # 600 s is ~2.4x the measured cost of a 20-case chunk; tail and coast have the longest streams
  timeout -k 20 700 node trackpad.cjs $PORT $ENGINE $RUNS $s > $OUT/$s.log 2>&1
  rc=$?
  n=$(grep -cE '^(ok|OVER)' $OUT/$s.log)
  echo "$(date +%H:%M:%S)  $(printf '%-11s' $s) exit $rc  $(( $(date +%s) - t ))s  $n cases  $(tail -1 $OUT/$s.log)"
done
# THE MAC SECOND SWIPE belongs to this suite: it is the same question (one gesture, one stop) for the stream a Mac
# really sends when a hand interrupts its own momentum. It reports rather than passes or fails, so its exit code is
# not consulted; read out/trackpad/mac-second-swipe.log.
t=$(date +%s)
timeout -k 20 1500 node mactrack.cjs $PORT $ENGINE > $OUT/mac-second-swipe.log 2>&1
echo "$(date +%H:%M:%S)  $(printf '%-11s' mac-2nd) exit $?  $(( $(date +%s) - t ))s  $(tail -1 $OUT/mac-second-swipe.log)"

echo "== every shape's verdict"
grep -h "TRACKPAD" $OUT/*.log
echo "== anything that did not move exactly one stop"
grep -h "^OVER" $OUT/*.log || echo "  (none)"
