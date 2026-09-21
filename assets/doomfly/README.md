# doomfly clips

Gameplay footage for `blog/posts/doomfly_autonomous.md`. Not committed from
doomfly-rl directly: footage is gitignored there and backed up to S3.

Populate with:

    scripts/import-doomfly-videos.sh malecns49k ../doomfly-rl/tutorial/assets/videos

Expected files (poster `.jpg` beside each `.mp4`, written by the script):

    doomfly_malecns49k_reel_web.mp4     hero reel, five scenarios back to back
    malecns49k_basic.mp4
    malecns49k_defend_the_center.mp4
    malecns49k_defend_the_line.mp4
    malecns49k_health_gathering.mp4
    malecns49k_deadly_corridor.mp4

The post captions describe these as median-return episodes, which is what
`make_clips.sh` selects. `pull_videos.sh` selects best-of-10 instead; if you
import from that path, update the captions.
