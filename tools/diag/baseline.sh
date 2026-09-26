#!/bin/sh
# REBUILD THE BASELINE ARTIFACT FROM ITS TAG.
#
#   sh baseline.sh                              # baseline/pre-site-polish -> ../../../baselines/pre-site-polish
#   sh baseline.sh <tag> <dir>
#
# nonlab.cjs compares this branch against a second BUILT artifact. That artifact used to be a folder someone had
# built by hand; when the folder went away the server kept answering, with 404, and the tests failed as
# `window.__lab.A is undefined`. The tag is the durable thing — this script turns it back into a folder.
#
# It builds in a detached git worktree, so your working tree, your branch and your uncommitted changes are never
# touched. The worktree is removed afterwards whether the build succeeded or not, and the build's own output is
# kept in out/baseline-build.log — an earlier version of this script sent it to /dev/null and then reported
# success while producing nothing, which is worse than failing.
set -e
TAG=${1:-baseline/pre-site-polish}
OUT=${2:-../../../baselines/pre-site-polish}
HERE=$(pwd)
LOG="$HERE/out/baseline-build.log"
mkdir -p "$HERE/out"
REPO=$(git rev-parse --show-toplevel)
WT="$REPO/../.baseline-worktree-$$"
# resolve the destination NOW, against this script's own directory. Resolving it later, from inside the worktree,
# made a relative path climb out of the wrong tree and drop the artifact three directories from where it belonged.
mkdir -p "$OUT"
DEST=$(cd "$OUT" && pwd)

git -C "$REPO" rev-parse -q --verify "$TAG^{commit}" >/dev/null || {
  echo "baseline.sh: no such tag: $TAG"
  echo "  tags available:"; git -C "$REPO" tag -l 'baseline/*' | sed 's/^/    /'
  exit 1
}
echo "baseline.sh: building $TAG ($(git -C "$REPO" rev-parse --short "$TAG^{commit}")) -> $OUT"
echo "baseline.sh: build output goes to $LOG"

# keep the real exit status: a trap whose last command succeeds would otherwise report success
cleanup() { rc=$?; cd "$REPO" 2>/dev/null || true; git worktree remove --force "$WT" 2>/dev/null || true; exit $rc; }
trap cleanup EXIT INT TERM

die() { echo "baseline.sh: $1"; echo "  last 25 lines of $LOG:"; tail -25 "$LOG" | sed 's/^/    /'; exit 1; }

git -C "$REPO" worktree add --detach "$WT" "$TAG^{commit}" >/dev/null
cd "$WT"
: > "$LOG"
# postinstall runs `nuxt prepare`, and modules/production-files.ts writes robots.txt into .output/public on the
# close hook. In a fresh worktree that directory does not exist yet and install dies with ENOENT. Make it first.
mkdir -p "$WT/.output/public"
echo "  installing dependencies (this is the slow part)..."
# the lockfile is what the tag pinned, so install from it rather than resolving afresh
if ! npm ci --no-audit --no-fund >>"$LOG" 2>&1; then
  echo "  npm ci did not work here; falling back to npm install"
  npm install --no-audit --no-fund >>"$LOG" 2>&1 || die "could not install dependencies"
fi
echo "  generating..."
npm run generate >>"$LOG" 2>&1 || die "npm run generate failed"

[ -f "$WT/.output/public/tr/index.html" ] || die "the build produced no tr/index.html"
rm -rf "$DEST"/*
cp -R "$WT/.output/public/." "$DEST/"
echo "baseline.sh: $DEST is ready ($(find "$DEST" -type f | wc -l) files)"
echo "baseline.sh: serve it with   node sv.cjs \"$DEST\" 4650 --wk"
