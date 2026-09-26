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
# touched. The worktree is removed afterwards whether the build succeeded or not.
set -e
TAG=${1:-baseline/pre-site-polish}
OUT=${2:-../../../baselines/pre-site-polish}
REPO=$(git rev-parse --show-toplevel)
WT="$REPO/../.baseline-worktree-$$"

git -C "$REPO" rev-parse -q --verify "$TAG^{commit}" >/dev/null || {
  echo "baseline.sh: no such tag: $TAG"
  echo "  tags available:"; git -C "$REPO" tag -l 'baseline/*' | sed 's/^/    /'
  exit 1
}
echo "baseline.sh: building $TAG ($(git -C "$REPO" rev-parse --short "$TAG^{commit}")) -> $OUT"

cleanup() { cd "$REPO" 2>/dev/null || true; git worktree remove --force "$WT" 2>/dev/null || true; }
trap cleanup EXIT INT TERM

git -C "$REPO" worktree add --detach "$WT" "$TAG^{commit}" >/dev/null
cd "$WT"
# the lockfile is what the tag pinned, so install from it rather than resolving afresh
npm ci --no-audit --no-fund >/dev/null 2>&1 || npm install --no-audit --no-fund >/dev/null 2>&1
npm run generate >/dev/null 2>&1

[ -f "$WT/.output/public/tr/index.html" ] || { echo "baseline.sh: the build produced no tr/index.html"; exit 1; }
mkdir -p "$OUT"
DEST=$(cd "$OUT" && pwd)
rm -rf "$DEST"/*
cp -R "$WT/.output/public/." "$DEST/"
echo "baseline.sh: $DEST is ready ($(find "$DEST" -type f | wc -l) files)"
echo "baseline.sh: serve it with   node sv.cjs \"$DEST\" 4600 --wk"
