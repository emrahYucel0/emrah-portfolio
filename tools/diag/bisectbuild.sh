#!/bin/sh
# BUILD SEVERAL COMMITS INTO SEPARATE ARTIFACTS, FROM ONE WORKTREE.
#
#   sh bisectbuild.sh <sha> [<sha> ...]
#
# baseline.sh builds ONE tag and makes a fresh worktree and a fresh `npm ci` to do it. A bisect wants five
# commits, and five installs of an identical dependency tree is most of the wall clock for none of the answer:
# package-lock.json is byte-identical across 996a226..main (checked), so one worktree is installed once and then
# checked out at each commit in turn. Each artifact lands in ../../../bisect/<sha>/ and is never overwritten, so a
# re-run of this script skips what is already built.
#
# The worktree is kept, not removed: a bisect gets re-run, and `npm ci` is the slow part.
set -e
HERE=$(pwd)
REPO=$(git rev-parse --show-toplevel)
WT="$REPO/../.bisect-worktree"
DEST_ROOT="$REPO/../bisect"
LOG="$HERE/out/bisect-build.log"
mkdir -p "$HERE/out" "$DEST_ROOT"
: > "$LOG"
say(){ echo "$(date +%H:%M:%S)  $*" | tee -a "$LOG"; }

if [ ! -d "$WT" ]; then
  say "creating the build worktree at $WT"
  git -C "$REPO" worktree add --detach "$WT" "$1^{commit}" >>"$LOG" 2>&1
fi
cd "$WT"
# postinstall runs `nuxt prepare`, and modules/production-files.ts writes robots.txt into .output/public on the
# close hook; in a fresh worktree that directory does not exist and install dies with ENOENT (baseline.sh's note)
mkdir -p "$WT/.output/public"
if [ ! -d "$WT/node_modules/nuxt" ]; then
  say "npm ci (once, for every commit in this run — the lockfile is the same at all of them)"
  t=$(date +%s)
  npm ci --no-audit --no-fund >>"$LOG" 2>&1 || { say "npm ci FAILED"; tail -25 "$LOG"; exit 1; }
  say "npm ci took $(( $(date +%s) - t ))s"
fi

for sha in "$@"; do
  full=$(git -C "$REPO" rev-parse --short "$sha^{commit}")
  dest="$DEST_ROOT/$full"
  if [ -f "$dest/tr/index.html" ]; then say "$full already built at $dest — skipped"; continue; fi
  say "=== $full: $(git -C "$REPO" log -1 --format='%s' "$sha" | cut -c1-70)"
  git -C "$WT" checkout -q --detach "$sha^{commit}" >>"$LOG" 2>&1
  # the artifact of the previous commit must not survive into this one's
  rm -rf "$WT/.output" "$WT/.nuxt"; mkdir -p "$WT/.output/public"
  t=$(date +%s)
  # no NUXT_PUBLIC_LINEFIELD here: every commit is built at ITS OWN default, which is what "what did this commit
  # do" means. 996a226..6954a14 default the flag off; main defaults it on (R25).
  npm run generate >>"$LOG" 2>&1 || { say "$full: generate FAILED"; tail -30 "$LOG"; exit 1; }
  [ -f "$WT/.output/public/tr/index.html" ] || { say "$full: no tr/index.html"; exit 1; }
  mkdir -p "$dest"; rm -rf "$dest"/*
  cp -R "$WT/.output/public/." "$dest/"
  say "$full built in $(( $(date +%s) - t ))s -> $dest ($(find "$dest" -type f | wc -l) files)"
done
say "ALL DONE"
