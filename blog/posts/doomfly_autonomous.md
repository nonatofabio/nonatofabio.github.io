---
title: I Didn't Write the Fly Brain That Plays Doom
date: 2026-09-21
description: A connectome-constrained network, five ViZDoom scenarios, and a multi-region GPU fleet, built end to end in about 24 hours by an agent harness. The code generation was never the hard part.
tags: ai, agents, ml, reinforcement-learning, infrastructure
---

<!-- DRAFT NOTES - resolve before publishing, then delete this block
  1. nonatofabio/doomfly-rl is currently PRIVATE. The GitHub link at the bottom
     (and the repo references throughout) will 404 for readers. Either make the
     repo public before publishing or cut the link.
  2. No Doom scores are published here on purpose - no eval numbers exist in the
     repo yet, and AGENTS.md requires every number to trace to a real checkpoint.
     The "What I don't have yet" section says so explicitly. If runs finish before
     you publish, that section is the one to rewrite.
  3. The harness is described only as "an agentic coding harness we develop
     internally on top of Strands Agents". No internal details are in this draft:
     no Midway, no Slack channels, no AWS account ids, no private repo internals.
     Check with your team before naming the harness more specifically.
  4. No hero image. Every other post has one except certainty_we_never_had. A
     tutorial screenshot or a frame of MaleCNS footage would fit; add "image" to
     the posts.json entry if you want a social preview card.
-->

There is a repo on my GitHub called `doomfly-rl`. It wires a neural network like a fruit fly's brain and trains it to play Doom. It has connectome ETL, a sparse recurrent model, five PPO teachers, a distillation trainer, a GRPO fine-tuner, a CDK stack that runs a GPU fleet in AWS, and a self-contained tutorial page with hover-to-play footage.

I wrote almost none of it.

It was built by an agentic coding harness we develop internally on top of [Strands Agents](https://strandsagents.com/), running without me at the keyboard. I set the goal and the constraints. The harness did the connectome ETL, the model code, the infrastructure, the fleet operations, the debugging, and the write-ups. Seventeen commits, first to last, span about twenty-three hours.

I'm disclaiming that up front because the interesting part is not that an agent wrote working Python. We know agents write working Python. The interesting part is everything that was not Python.

## What the thing actually is

The model is called `FlyNet`, and it borrows its recipe from [mlabonne/chessfly](https://huggingface.co/mlabonne/chessfly). The recurrent core is a real connectome: FlyWire FAFB v783, 138,639 neurons and 15,091,983 edges carrying about 54.5 million synapses. The wiring is frozen. So is the sign of every connection, excitatory or inhibitory, which the biology already decided. Training learns one gain per synapse and nothing else about the graph.

Around that core sit ordinary learned modules. A conv stem takes a 4-frame stack of 72x96 grayscale Doom and turns it into input currents on the 10,855 visual sensory neurons. The network unrolls five steps. A readout takes the 33,788 central, descending and motor neurons down to 512 units, then to one of 22 actions, with a legality mask per scenario.

Here are the parameter counts, which matter more than anything else in the post:

| Component | Parameters |
|---|---|
| Synaptic log-gains (the connectome) | 15,091,983 |
| Homeostatic scale/shift | 1,386,390 |
| Stem, decoder, policy and value heads | 34,538,493 |
| **Total** | **51,016,866** |

Two thirds of the model is a conv net and an MLP. A conv net and an MLP can learn to play Doom with no fly involved at all. Any claim about "the fly brain playing Doom" has to be read net of those 34.5 million parameters, and mostly it does not survive the reading.

So the first rule I had the harness write into its own `AGENTS.md` was a vocabulary rule: write "a network constrained to the fly connectome," never "a fly." A second backbone, a 49,393-neuron MaleCNS subgraph, trains as an ablation for exactly this reason. If the small brain and the big brain score the same, the connectome is upholstery.

## The code was the easy part. Again.

I wrote in [the pixel art post](./pixel_art_build_system.html) that the 95k lines of GDScript were the easy part and keeping four pictures of the same orc consistent was not. Same shape of finding here, different axis.

Writing a sparse recurrent op, a distillation loop, and a PPO teacher wrapper is well-trodden ground. PyTorch, Stable-Baselines3 and ViZDoom are heavily represented in training data. The model code landed early and mostly worked.

What consumed the run was operations. Read the commit log as a list of things that went wrong.

The sparse connectome matmul ran under bf16 autocast and produced garbage, because cuSPARSE ships no mixed-dtype kernels; the fix forces fp32 for the spmm and sddmm specifically and leaves the rest of the model in bf16. The pipeline read GPU memory through `nvidia-smi | head`, which lies on multi-GPU boxes: under `set -o pipefail` the SIGPIPE from `head` mangled the output, so the batch size got chosen from a corrupted string. The AWS Deep Learning AMI's activate script references an unset `LD_LIBRARY_PATH`, so a bootstrap running with unset-variable checking on dies at the first line of the venv activation.

Then two that are not bugs at all. PPO collapsed to a single action on `basic` and `deadly_corridor`, which pay plus or minus 100 per event; SB3's PPO with clip 0.1 read that as saturating and settled on one button forever, until rewards were scaled by 0.01 before the learner, the same thing Sample Factory does. And there were no GPUs. us-west-2 had no L40S capacity, so the harness wrote a mixed-instances ASG with a capacity probe, then a second script that walks instance types across availability zones in other regions until something launches.

Not one of those is a coding problem. They are a CUDA kernel limitation, a shell signal semantic, a vendor AMI bug, an RL scaling pathology, and a cloud capacity shortage. Four of the five are invisible until you run the thing on real hardware and watch it fail.

This is the hill I'll die on: we are benchmarking coding agents on the wrong axis. The SWE-bench-shaped question, can it produce a correct patch, is close enough to solved for work like this. The question that actually gates autonomy is whether the agent can operate what it built. Ship code to S3, launch a fleet, notice that the fleet did not come up, go shopping for capacity in another region, tail its own logs, recognize a corrupted GPU memory string as the cause of a wrong batch size, and fix it. Every one of those steps is a place where a harness quietly stalls and waits for a human, and none of them show up in a coding benchmark.

## The most useful file is the one with the rules in it

The artifact I keep coming back to is not the model. It is `AGENTS.md`, the constraints file the harness works under and maintains.

It says what the project is for, and it says what it is not. No claims about biology. Every number in the README or the tutorial has to trace to a checkpoint that exists, with the exact `evaluate.py` invocation next to it. Two training boxes never share an S3 prefix. Checkpoints and footage never get committed. Change one thing per GRPO run and name the run after what changed. Negative results get written down, with the run prefix, rather than dropped.

That last one is the whole game. An agent optimizing for a satisfied user will hand you the good runs. A rule that says negative results are results, written down before any results exist, is a commitment device. It is cheap to write at the start and expensive to write once you have a number you dislike.

The other half of `AGENTS.md` is a findings log. Every time the harness hits a gap, a missing script, a step that needs a human, a result that cannot be reproduced from S3, it records that as a finding about the harness rather than working around it silently. The project is instrumentation. Doom is the load.

## There is another doomfly, and it is the better science

Partway through, we found [nftechie/doomfly](https://github.com/nftechie/doomfly). Same name, same premise, opposite design, and I think their version asks the sharper question.

They simulate the full MaleCNS graph, 166,700 neurons and 25.6 million edges, no pruning, as leaky integrate-and-fire spiking neurons with biological time constants in an event-driven C++ kernel. Pixels map onto R1-R6/R8 photoreceptors through inferred ommatidia. Actions come off named descending neurons: a DNp20 rate difference turns, DNpe017 moves and fires. Nothing on the input or output side is learned. The only plastic synapses are 4,184 KC to MBON11 connections, updated by a dopamine-gated anti-Hebbian rule with two PPL101 cells driven by in-game damage.

Their contract forbids exactly what we do: no cropping circuits, no pruning edges, no "replacing the network with a game policy." And they publish their negative results. Their v6 candidate did not pass its own survival gates, and the repo says so.

That refusal is the point. If you let in a learned conv stem, a learned readout, a free gain on every synapse and a value head, you can no longer claim the wiring did anything, because the conv net could have done it alone. Their "no learning demonstrated" is a real result precisely because they left themselves no way to fake a good one.

We ask the ML question instead. Treat the connectome as a structural prior, let gradient descent in, and see what the prior is worth. Theirs tells you what the wiring does on its own. Ours tells you what the wiring buys you as an inductive bias. Neither one invalidates the other, and a `doomfly-rl` score should be read as "connectome-constrained RL agent," never as "a fly."

## What I don't have yet

Scores.

The pipeline runs: PPO teachers on five ViZDoom scenarios, epsilon-greedy rollouts at 300k frames per scenario, distillation into both backbones, then optional GRPO. The GRPO fine-tuner is written and the reasoning behind it is sound. FlyNet's value head is 64 bins bolted onto a sparse readout, it is the weakest part of the model, and PPO's GAE leans on it hard. Group-relative policy optimization throws the critic away and baselines against sibling episodes that share a ViZDoom seed, so the same monsters spawn in the same places and the return difference is the policy's fault rather than the map's.

Whether that actually beats distillation on a connectome-constrained network, I cannot tell you. The runs are not finished and the comparison table is empty. The rule in `AGENTS.md` says every published number traces to a checkpoint, and I would rather hold the post than launder a partial run into a claim.

So treat this as a report on the builder, not on the fly. The harness took a research-shaped goal, built the ETL, the model, the fleet, the training pipeline, the evaluation, the footage and the tutorial, hit five real failures in CUDA, bash, a vendor AMI, an RL optimizer and AWS capacity, fixed all five, and wrote down its own rules for staying honest about the results. That happened in about a day, and the only thing I did was say what I wanted and what it was not allowed to claim.

The scores are the next post. If GRPO does nothing for the fly, that is what the next post will say.

**[GitHub: nonatofabio/doomfly-rl](https://github.com/nonatofabio/doomfly-rl)**

---

*Thanks for reading.*

*Keep it Awesome!*
