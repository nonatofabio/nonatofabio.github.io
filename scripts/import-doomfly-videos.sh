#!/usr/bin/env bash
# Import doomfly-rl gameplay clips into the blog and generate their poster frames.
#
#   scripts/import-doomfly-videos.sh [backbone] [source-dir]
#
#   backbone    default malecns49k. Names the slot files: <backbone>_<scenario>.mp4
#   source-dir  default ../doomfly-rl/tutorial/assets/videos
#
# Footage is gitignored in doomfly-rl and lives in S3, so produce it there first:
#
#   python -m doomfly.evaluate --ckpt <ckpt> --connectome data/processed/<npz> \
#       --episodes 10 --gif-dir assets/videos/<tag>/episodes --tics --pick all \
#       --fmt mp4 --device cpu > assets/videos/<tag>/eval_all.json
#   REEL_SLOT=1 scripts/make_clips.sh assets/videos/<tag> <backbone>
#
# then run this from the blog repo root. Needs ffmpeg/ffprobe on PATH.
#
# The post embeds MEDIAN-return episodes (what make_clips.sh picks) and the
# captions say so. pull_videos.sh emits BEST-of-10 instead - if you import
# those, fix the captions in blog/posts/doomfly_autonomous.md first.
set -euo pipefail

BACKBONE=${1:-malecns49k}
SRC=${2:-../doomfly-rl/tutorial/assets/videos}
ROOT=$(cd "$(dirname "$0")/.." && pwd)
DEST=$ROOT/assets/doomfly
SCENARIOS="basic defend_the_center defend_the_line health_gathering deadly_corridor"
REEL=doomfly_${BACKBONE}_reel_web.mp4

command -v ffmpeg  >/dev/null || { echo "!! ffmpeg not on PATH"; exit 1; }
command -v ffprobe >/dev/null || { echo "!! ffprobe not on PATH"; exit 1; }
[[ -d $SRC ]] || { echo "!! source dir not found: $SRC"; exit 1; }
mkdir -p "$DEST"

# GitHub Pages serves from the repo, so keep an eye on what we are committing.
poster() {  # poster <mp4> -- grab a frame with something on screen, not frame 0
  local mp4=$1 jpg=${1%.mp4}.jpg dur
  dur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$mp4" 2>/dev/null || echo 0)
  local at
  at=$(awk -v d="$dur" 'BEGIN{ t=d*0.35; if (t<0.1 || t!=t) t=0.1; printf "%.2f", t }')
  ffmpeg -hide_banner -loglevel error -y -ss "$at" -i "$mp4" -frames:v 1 -q:v 3 "$jpg"
  echo "   poster $(basename "$jpg")  @${at}s"
}

copied=0
for g in $SCENARIOS; do
  f=$SRC/${BACKBONE}_$g.mp4
  if [[ ! -f $f ]]; then
    echo "!! missing $(basename "$f") - the post will show a placeholder for $g"
    continue
  fi
  cp "$f" "$DEST/${BACKBONE}_$g.mp4"
  echo "   $g  $(du -h "$DEST/${BACKBONE}_$g.mp4" | cut -f1)"
  poster "$DEST/${BACKBONE}_$g.mp4"
  copied=$((copied + 1))
done

# Side-by-side student vs GRPO clips (scripts/compare_clips.sh in doomfly-rl).
# Only defend_the_center is embedded in the post today; import the rest anyway so
# swapping which one the post shows is a caption edit, not another render.
for g in $SCENARIOS; do
  f=$SRC/${BACKBONE}_student_vs_grpo_$g.mp4
  [[ -f $f ]] || continue
  cp "$f" "$DEST/${BACKBONE}_student_vs_grpo_$g.mp4"
  echo "   compare $g  $(du -h "$DEST/${BACKBONE}_student_vs_grpo_$g.mp4" | cut -f1)"
  poster "$DEST/${BACKBONE}_student_vs_grpo_$g.mp4"
  copied=$((copied + 1))
done
[[ -f $SRC/${BACKBONE}_student_vs_grpo_defend_the_center.mp4 ]] || \
  echo "!! missing ${BACKBONE}_student_vs_grpo_defend_the_center.mp4 - the post embeds this one; build it with scripts/compare_clips.sh"

if [[ -f $SRC/$REEL ]]; then
  cp "$SRC/$REEL" "$DEST/$REEL"
  echo "   reel $(du -h "$DEST/$REEL" | cut -f1)"
  poster "$DEST/$REEL"
  copied=$((copied + 1))
else
  echo "!! missing $REEL - rebuild with REEL_SLOT=1 scripts/make_clips.sh ..."
fi

TOTAL=$(du -sh "$DEST" | cut -f1)
echo
echo "✓ imported $copied file(s) into assets/doomfly ($TOTAL total)"
echo
echo "  GitHub blocks files over 100 MB and Pages soft-caps the repo around 1 GB."
echo "  If $TOTAL is uncomfortable, re-encode harder (REEL_CRF=32 in make_clips.sh)"
echo "  or host the clips off-repo and swap the src= URLs in the post."
echo
echo "  next:  npm run build && git add assets/doomfly && git commit"
