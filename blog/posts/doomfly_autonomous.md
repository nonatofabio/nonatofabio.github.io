---
title: A Fruit Fly Brain Plays Doom. I Barely Touched the Keyboard.
date: 2026-09-21
description: A network wired like a fruit fly's brain plays five Doom scenarios. The Strands harness built it, ran the GPU fleet, and reported two negative results. My part of the transcript is a dozen sentences.
tags: ai, agents, strands, ml, reinforcement-learning
image: /assets/doomfly/doomfly_reel_poster.jpg
---

<figure>
  <video src="../../assets/doomfly/doomfly_reel.mp4"
         poster="../../assets/doomfly/doomfly_reel_poster.jpg"
         autoplay muted loop playsinline preload="metadata"
         data-missing="Reel not available yet.">
  </video>
  <figcaption>A network wired like a fruit fly's brain plays the five ViZDoom scenarios. Each clip is the median episode of ten, so this is typical play and not a highlight reel.</figcaption>
</figure>

The thing playing up there is not a fly, but its wiring diagram comes from one. It is a recurrent network built on a real fruit fly connectome: 49,393 neurons and 9 million synapses, all frozen, with one learned gain per synapse. An ordinary conv stem feeds it and an ordinary MLP reads it out, and those two hold two thirds of the parameters. So read every score in this post as "a network constrained to the fly connectome" and never as "a fly". I'll come back to why that sentence matters.

Here is the confession, same as in the [pixel art post](./pixel_art_build_system.html): I did not write this. The connectome ETL, the sparse recurrent op, the five PPO teachers, the distillation trainer and the GRPO fine-tuner came out of the [Strands harness](https://pypi.org/project/strands-harness/). So did the CDK stack that ran a GPU fleet in three AWS regions, the footage and the write-ups. It took five days and 28 commits, about 3,300 lines of Python and shell, twelve fine-tuning runs and four control runs.

## What I actually typed

The harness keeps its own session state on disk, so I went back and read my side of the transcript. It is short. Across seven sessions, this is most of what I said:

> Go for it!
>
> Can you check how are we doing on the training of doomfly?
>
> Do you have suggestions to speed up the training process?
>
> how do I use tb to see all the runs so far?
>
> Let's stop and revert all this we should not pursue this anymore
>
> Sorry, wrong session!

The last one is me pasting a request meant for a different agent. The one before it is me killing an easter egg I had asked for an hour earlier. I wanted a Doom mod with a fly paw for the player's hand and the Strands frog as the enemies. The harness reverted the whole thing, previews and tests included, and went back to the training run.

Everything else in the transcript is the harness at work. There are hundreds of tool calls and a couple hundred large results moved out of context and pulled back when needed. There are background tasks, and a summary carried from one session into the next. I could close the laptop at night and pick up in the morning where it left off.

## What the harness gave me

The [Strands harness](https://github.com/strands-agents/harness-sdk) is the batteries-included agent from the Strands Agents team at AWS. It is open source and it is one call, and what you get back is a plain Strands agent you can change:

```python
from strands_harness import create_harness

agent = create_harness()
agent("Train a network constrained to the fruit fly connectome to play Doom")
```

That one call is why a five-day, multi-region GPU project fit in a chat window. Sessions did the most work. Each one persisted to disk and the next one started from a summary of the last, so seven sessions over five days behaved like one long conversation. Context management came second: long tool outputs left the context and came back on demand, and without that the logs from day one alone would have ended the project.

Background tasks paid off on the last day. While a two-hour evaluation ran on my Mac, the same agent widened the model's action head and wrote nine tests for it. It also confirmed that the converted checkpoint was bit-identical on the old scenarios. Interventions kept me in the loop. The repo has an `AGENTS.md` that says never push, launch, terminate or delete without being told. The harness asked every time, and "Go for it!" was me answering. It also loaded my own skills for writing and verification and the MCP tools I already use, which is why the docs it produced read like mine.

## The part I trust

An agent that returns a plausible positive result is worth nothing. This one returned two negative results, with the run prefixes and standard deviations attached, because its rules say that negative results go in `docs/` and not in the bin.

First, the fine-tuning method the project was built to test does not work. Twelve GRPO runs, one knob changed per run, and not one beats the distilled student outside eval noise. The KL penalty that stops the policy from drifting is the same setting that stops it from improving.

Second, and this one stings, the connectome does nothing measurable. The harness built two controls. One keeps the same graph but shuffles its edges, so every neuron keeps its degree and its sign and the biology is gone. The other removes the neuron layer entirely.

| Backbone | Parameters | Training speed | Doom scores |
|---|---|---|---|
| Real connectome | 48.2 M | 646 steps/s | baseline |
| Shuffled edges, two seeds | 48.2 M | 1,454 steps/s | same, within noise |
| No connectome at all | 27.7 M | 14,686 steps/s | same, within noise |

The fly wiring makes training 22 times slower and buys nothing on these five scenarios. That is why the caption says "wired like a fruit fly's brain" and not "a fruit fly's brain". The harness wrote that vocabulary rule into `AGENTS.md` on day two, before either result existed. It would have been an expensive rule to write after.

## What's next

The five scenarios are saturated, so the next test is a real level. The student already plays Freedoom II MAP01 zero-shot. With its aiming prior it survives twice as long as random and picks up items. It still dies in eight of ten episodes and never leaves the first two rooms. The head surgery for a 23rd action and a sixth scenario embedding is done and tested. Next comes GRPO on that map with all three backbones: real, shuffled and none. If the wiring is ever going to matter, it will be where the policy has to learn rather than imitate. If that learns, the plan is fly versus fly in a duel.

The code is public at [nonatofabio/doomfly-rl](https://github.com/nonatofabio/doomfly-rl), and the trained checkpoints are on [Hugging Face](https://huggingface.co/nonatofabio/doomfly-rl) with the connectome file they need. If you want to watch a network shaped like a fly lose a pistol duel, start there.

---

*Thanks for reading.*

*Keep it Awesome!*
