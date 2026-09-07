---
title: AI Generated Pixel Art Needs a Build System, Not Better Prompts
date: 2026-09-07
description: I rebuilt my Pygame shooter in Godot 4 with an agent. The 95k lines of code were the easy part. Keeping four pictures of the same orc consistent was not.
tags: ai, gamedev, godot, agents, pipelines
---

I rebuilt my tiny homage to Warhammer 40k this week. The original, Hive City Rampage, was a Python/Pygame monstrosity, a top-down grimdark shooter that ran but was a prototype. Now there's a sequel, Ashgate Siege, built in Godot 4: gothic isometric, two missions, Mac and Android.

I have a confession though. The 95k lines of GDScript, 8 commits, roughly five hours, was written by an AI agent under my direction. The sprites are generated too. I'm disclaiming that up front because the interesting part is what came out of it.

## The easy part was the code

This is the simple finding. An engine port is exactly the shape of problem my agents are good at: the target is well documented, the semantics known, and correctness is checkable by running the thing. Godot 4 plus GDScript is heavily represented in training data for any model. Zero agent struggle.

## The hard part was four pictures of the same orc

Here's the hill I'm willing to die on: for AI-assisted games, 2D sprite games are harder than 3D.

That sounds backwards, so: in 3D, the engine guarantees coherence. One mesh, one material, one light rig, and every frame of animation is consistent because it's the same object being transformed. The renderer is doing the work.

In sprite based games there is no shared object. Each sprite is an independent generated map of pixels. So:

- Frame 2 of a walk cycle can be a different character than frame 1.
- The light source can move between sprites in the same scene.
- Proportions drift. Your massive size boss shrinks.
- Limbs get cropped at cell edges.

None of that is caught by anything automatically. It just ships, and the game looks odd, like a badly executed collage.

## Prompts as interface specs

The fix was to stop treating generation as commissioning art and start treating it as calling an API with a strict schema. Every prompt pins the geometry:

```
Production game sprite sheet: exactly 4 columns x 3 rows, 1536x1024 canvas,
equal cells, solid pure magenta #FF00FF background for color-key import.
NO text, shadows, smoke, or border. Every figure entirely within its own cell
with ample margin; feet centered at same baseline in each row. All figures face
screen RIGHT in three-quarter isometric view [...] Four columns are four
coherent walking-cycle poses: left foot forward, passing, right foot forward,
passing.
```

Each sentence has to do some work:

- **Magenta #FF00FF, not transparency.** Alpha comes back unreliable. A color key is deterministic to strip.
- **Explicit grid and canvas.** The importer crops on fixed coordinates. If the grid drifts, every sprite is off.
- **"feet centered at same baseline in each row."** Without it the character bobs while walking.
- **Named poses.** "Walking animation" returns four unrelated drawings. Naming the four phases is what makes them a cycle.
- **Negative constraints.** "No text, shadows, smoke, or border" because models add decoration that breaks the silhouette.

## The importer is a compiler, and tests are CI

If the prompt is a spec, something has to enforce it. Generated atlases go into `art/`, an importer crops and scales them into runtime assets, and a native test suite checks the result: 2,972 reference and combat assertions, 17,112 seam combinations, plus a 600-frame combat simulation. `make test` runs it.

The seam check is the one I lean on. It takes the belt pixels from the leg sprite, offsets them by the waist socket, and counts how many land on opaque torso pixels. Under 32 and the pose fails. Every view, every clip, every frame, every facing, every gait: 17,112 combinations.

That catches the failure mode that makes sprites look like a collage, which is a regenerated part that no longer meets the part next to it.

## So I tried to break it

Claiming you have tests is cheap. I reimplemented the audit standalone, outside the engine, then fed it deliberately corrupted atlases to find out what it actually catches.

Baseline reproduces: 17,112 combinations, zero failures.

Then the damage:

- Character 4% smaller: **FAIL, 352 bad combinations**
- Character 8% smaller: **FAIL, 6,728**
- Alpha edge eroded 2px: **FAIL, 3,036**
- Torso shifted 6px down in the cell: **PASS**

Scale drift gets caught at 4% and up, and slips through at 3%. Vertical translation is never caught. I pushed it to 14px and it still passed, because shifting the torso down actually *raises* the minimum overlap from 59 to 249. The check gets happier while the sprite gets worse.

That is a real hole, and it is the honest version of "we have tests." The seam audit measures whether two parts still meet. It says nothing about whether the assembled pair sits correctly inside its cell, because the waist socket moves with the torso. Catching that needs a different check, anchored to the cell rather than to the neighbouring sprite.

I would rather know what the test misses than assume it catches everything.

The standalone auditor is `tools/seam_audit.py` in the repo. Plain Python, PIL and numpy, no Godot required, so you can run the numbers above yourself.

## What I'd tell you to steal from my repo

- Color-key over alpha. Deterministic beats convenient.
- Pin the grid numerically in the prompt and crop on those exact numbers.
- Name every animation phase. Never say "walk cycle" and hope.
- Baseline your seams and diff them. This is the whole safety net.
- Keep source atlases and prompts in the repo. Regeneration is a build step, so its inputs are source code.

The way this generalizes: if AI generation is nondeterministic, everything downstream has to be strict. The prompt is a spec that gets compiled by the importer, and CI runs the seam tests. Without that you don't have a pipeline, at best it's a slot machine you keep pulling until the art looks okay.

## Try it

Mac and Android builds are on [GitHub Releases](https://github.com/nonatofabio/hive-city-rampage-ii). They're previews: macOS is ad-hoc signed and not notarized, Android uses a debug key, so both will warn you. Source builds with `make run` if you have Godot 4.3.

---

*Also published on [DEV](https://dev.to/nonatofabio_28/ai-generated-pixel-art-needs-a-build-system-not-better-prompts-280c).*
