#!/bin/sh
# BRING UP THE REVIEW SERVERS, FROM CLEARLY NAMED DIRECTORIES, AFTER A BUILD.
#
#   npm run generate && sh tools/diag/serve.sh
#
# Why this exists. sv.cjs reads .htaccess ONCE at startup and sends that CSP on every HTML response. The policy
# names each inline script by sha256, and every build produces a new hash. So a server left running across a
# rebuild serves the NEW document with the OLD policy: the browser refuses the inline script, the runtime never
# boots, and the page shows the first-paint plate and a document scrollbar. Nothing 404s, so it reads as broken
# product code. That is exactly what happened on the LAN preview while three servers shared .output/public and
# only one of them had been restarted.
#
# So: this script stops every port this repo owns, snapshots the build into a directory named after the branch,
# and serves that. Ports belonging to other projects are left alone.
#
# A SECOND SESSION, IN A SECOND WORKTREE, names its own three ports and stops only those (ROADMAP R16):
#
#   SERVE_PORTS="4910 4911 4914" sh tools/diag/serve.sh      # under test, the same on the LAN, the baseline
#   sh tools/diag/run6.sh 4910 4914
#
# With SERVE_PORTS set nothing else is stopped — not 4500-4700, which are the first session's. BUILD_DIR overrides
# the snapshot folder (by default builds/<branch>, already one per branch). Without either, nothing changes.
set -e
HERE=$(pwd)
REPO=$(git rev-parse --show-toplevel)
BRANCH=$(git -C "$REPO" branch --show-current | tr '/' '-')
BUILD=${BUILD_DIR:-"$REPO/../builds/$BRANCH"}
BASE_DIR=../../../baselines/pre-site-polish
if [ -n "$SERVE_PORTS" ]; then
  set -- $SERVE_PORTS
  [ $# -eq 3 ] || { echo "serve.sh: SERVE_PORTS takes three ports — under test, LAN, baseline — not '$SERVE_PORTS'"; exit 1; }
  P_CUR=$1; P_LAN=$2; P_BASE=$3
  OWNED="$SERVE_PORTS"
else
  P_CUR=4500; P_LAN=4501; P_BASE=4650
  OWNED="4500 4501 4502 4550 4600 4650 4700"
fi

stop_port() {
  powershell.exe -NoProfile -Command "Get-NetTCPConnection -LocalPort $1 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id \$_.OwningProcess -Force -ErrorAction SilentlyContinue }" >/dev/null 2>&1 || true
}
up() { # port dir extra-flags
  # the subshell's own descriptors are closed too: on Git Bash it lingers as the server's parent, and holding this
  # script's stdout it kept `sh serve.sh | tail` (and anything else reading the output) waiting forever
  ( cd "$HERE" && node sv.cjs "$2" "$1" $3 >> "out/server-$1.log" 2>&1 & ) </dev/null >/dev/null 2>&1
  i=0
  while [ "$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$1/tr")" != "200" ]; do
    i=$((i + 1)); [ $i -gt 40 ] && { echo "  $1 never answered 200"; return 1; }
    sleep 1
  done
  echo "  $1 -> $2"
}

echo "serve.sh: stopping the ports this session owns ($OWNED); anything else is left running"
for prt in $OWNED; do stop_port $prt; done
sleep 1

[ -f "$REPO/.output/public/tr/index.html" ] || { echo "serve.sh: no build at .output/public — run 'npm run generate' first"; exit 1; }
echo "serve.sh: snapshotting the build -> $BUILD"
mkdir -p "$BUILD"
rm -rf "$BUILD"/*
cp -R "$REPO/.output/public/." "$BUILD/"
# the a11y section reads this from the served root
[ -f "$HERE/node_modules/axe-core/axe.min.js" ] && cp "$HERE/node_modules/axe-core/axe.min.js" "$BUILD/" || true

[ -f "$BASE_DIR/tr/index.html" ] || sh baseline.sh

echo "serve.sh: starting"
up $P_CUR "$BUILD" --wk          # the build under test, for the harnesses
up $P_LAN "$BUILD" "--lan --wk"  # the same build, reachable from a phone on this network
up $P_BASE "$BASE_DIR" --wk      # the baseline, from the tag

echo "serve.sh: checking that none of them is stale"
fail=0
for prt in $P_CUR $P_LAN $P_BASE; do node cspboot.cjs --static $prt | tail -1 | sed "s/^/  $prt /" ; node cspboot.cjs --static $prt >/dev/null 2>&1 || fail=1; done
[ $fail -eq 0 ] || { echo "serve.sh: a server is serving a policy that does not match its own document"; exit 1; }
echo "serve.sh: ready."
echo "  $P_CUR  the build under test          (harnesses)"
echo "  $P_LAN  the same build, on the LAN     (open http://<this machine's 192.168.x.x>:$P_LAN/tr on a phone)"
echo "  $P_BASE  the baseline, from its tag     (nonlab comparisons:  sh run6.sh $P_CUR $P_BASE)"
