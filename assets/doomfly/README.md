# doomfly clips

`doomfly_reel.mp4` is the MaleCNS-49k hero reel from doomfly-rl
(`checkpoints/malecns49k_v2_final`, step 60k, median-of-ten episode per scenario,
built by `scripts/make_clips.sh` there), re-encoded for the web:

    ffmpeg -i doomfly_malecns49k_reel_web.mp4 -vf scale=480:-2 -c:v libx264 -crf 30 \
        -preset slow -pix_fmt yuv420p -movflags +faststart -an doomfly_reel.mp4

`doomfly_reel_poster.jpg` is a frame from it and doubles as the post's social preview.
