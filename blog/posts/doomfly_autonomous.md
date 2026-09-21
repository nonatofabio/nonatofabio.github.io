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
  <figcaption>A network wired like a fruit fly's brain, 49,393 neurons and 9 million synapses, playing all five ViZDoom scenarios. One episode per scenario, each the median of ten by return, so this is typical play and not a highlight reel.</figcaption>
</figure>

That is not a fly. It is a recurrent network whose wiring diagram is a real fruit fly connectome, frozen, with one learned gain per synapse. Around it sit an ordinary conv stem and an ordinary MLP readout, and they hold two thirds of the parameters. Read every score below as "a network constrained to the fly connectome," never as "a fly." I'll come back to why that sentence matters.

Here is the confession, same as the [pixel art post](./pixel_art_build_system.html). I did not write this. Not the connectome ETL, not the sparse recurrent op, not the five PPO teachers, not the distillation trainer, not the GRPO fine-tuner, not the CDK stack that ran a GPU fleet across three AWS regions, not the evaluation footage, not the write-ups. Five days, 28 commits, about 3,300 lines of Python and shell, twelve fine-tuning runs and four control runs. All of it came out of the [Strands harness](https://pypi.org/project/strands-harness/).

## What I actually typed

The harness keeps its own session state, so I went back and read my side of the transcript. It is short. Across seven sessions this is most of what I said:

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

That last one was me pasting a request meant for a different agent. The one before it was me killing an easter egg I had asked for an hour earlier, a Doom mod with a fly paw for the player's hand and the Strands frog as the enemies. It reverted the whole thing cleanly, previews and tests included, and got back to the training run.

The rest of the transcript is the harness working. Hundreds of tool calls, a couple hundred large results moved out of context and fetched back when needed, background tasks running while it did something else, and a conversation summary carried from one session into the next so I could close the laptop overnight and pick up where it left off.

## What the harness gave me

The [Strands harness](https://github.com/strands-agents/harness-sdk) is the batteries-included agent from the Strands Agents team at AWS. It is open source, it is one call, and what you get back is a plain Strands agent you can change:

```python
from strands_harness import create_harness

agent = create_harness()
agent("Train a network constrained to the fruit fly connectome to play Doom")
```

That one call is why a five-day, multi-region GPU project fit in a chat window. The pieces I leaned on, in the order they saved me:

- **Sessions.** Every session persisted to disk, and a new one started from a summary of the last. Seven sessions over five days behaved like one long conversation.
- **Context management.** Long tool outputs left the context and came back on demand. Without that the first day's logs alone would have ended the project.
- **Background tasks.** While a two-hour evaluation ran on my Mac, the same agent widened the model's action head, wrote nine tests for it, and checked the converted checkpoint was bit-identical on the old scenarios.
- **Interventions.** The repo has an `AGENTS.md` with rules: never push, launch, terminate or delete without being told. It asked each time. "Go for it!" was me answering.
- **Skills and MCP.** It pulled in my own writing and verification skills and the tools I already use, so the docs it produced read like mine.

## The part I trust

An agent that returns a plausible positive result is worth nothing. This one returned two negative results, with the run prefixes and standard deviations attached, because its rules say negative results go in `docs/` and not in the bin.

First, the fine-tuning method the project was built to test does not work. Twelve GRPO runs, one knob changed per run, and none beats the distilled student outside eval noise. The KL penalty that stops the policy from drifting is the same setting that stops it from improving.

Second, and this is the one that stings, the connectome does nothing measurable. The harness built two controls: the same graph with its edges shuffled so every neuron keeps its degree and sign but the biology is gone, and a model with the neuron layer removed entirely.

| Backbone | Parameters | Training speed | Doom scores |
|---|---|---|---|
| Real connectome | 48.2 M | 646 steps/s | baseline |
| Shuffled edges, two seeds | 48.2 M | 1,454 steps/s | same, within noise |
| No connectome at all | 27.7 M | 14,686 steps/s | same, within noise |

The fly wiring makes training 22 times slower and buys nothing on these five scenarios. That is why the caption on the video says "wired like a fruit fly's brain" and not "a fruit fly's brain." The harness put the vocabulary rule in `AGENTS.md` on day two, before either result existed. It would have been expensive to write after.

## What's next

The five scenarios are saturated, so the next test is a real level. The student already plays Freedoom II MAP01 zero-shot: with its aiming prior it survives twice as long as random and picks up items, but it still dies in eight of ten episodes and never leaves the first two rooms. Head surgery for a 23rd action and a sixth scenario embedding is done and verified. Next is GRPO on that map with all three backbones, real, shuffled and none, because if the wiring is ever going to matter it will be where the policy has to learn rather than imitate. If that learns, the plan is fly versus fly in a duel.

The code is public now at [nonatofabio/doomfly-rl](https://github.com/nonatofabio/doomfly-rl), and the trained checkpoints are on [Hugging Face](https://huggingface.co/nonatofabio/doomfly-rl) with the connectome file they need. If you want to watch a network shaped like a fly lose a pistol duel, that is where to start.

---

*Thanks for reading.*

*Keep it Awesome!*
