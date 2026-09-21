---
title: I Didn't Write the Fly Brain That Plays Doom
date: 2026-09-21
description: An agent harness built a connectome-constrained Doom agent, ran a 12-run GRPO sweep on it, and reported that the method did not work. The negative result is the part I trust.
tags: ai, agents, ml, reinforcement-learning, infrastructure
---

<!-- DRAFT NOTES - resolve before publishing, then delete this block
  1. nonatofabio/doomfly-rl is currently PRIVATE. The GitHub link at the bottom
     will 404 for readers. Make the repo public before publishing or cut it.
  2. VIDEOS ARE NOT IN THE REPO YET. The <video> tags point at
     assets/doomfly/*.mp4, which do not exist on this branch - footage is
     gitignored in doomfly-rl and lives in S3, and this sandbox had no AWS
     credentials or ffmpeg. Run scripts/import-doomfly-videos.sh from a machine
     that has both. Until then each slot degrades to a dashed placeholder.
  3. Scenario clips are malecns49k v2 final, MEDIAN episode of ten
     (make_clips.sh), and the captions say so. Do not swap in the flywire783
     slots: videos/README.md records those as interim step-20k BEST-of-10 GIFs,
     which would make the captions false.
  4. The side-by-side clips come from scripts/compare_clips.sh and are the same
     checkpoints as docs/grpo-study.md section 6a (left l40s-v2 student, right
     grpo-use2 base iter 300, median of 5, env seed 12345).
  5. Every number here traces to docs/grpo-study.md or docs/harness-findings.md
     as of commit 6188701. If you re-run anything before publishing, re-check
     the sweep table, the KL figures, and the wall-clock comparison.
  5b. INCONSISTENCY IN grpo-study.md, worth fixing at the source: section 5 says
     "basic reads 78.2 +/- 7.5 in every row of section 4", and section 3 says
     "78.2 +/- 7.5 (unchanged, all runs)". The section 4 table shows beta0.2 at
     74.8 +/- 13.5 (-3.4). Eleven of twelve, not twelve. This post says eleven
     and explains the exception (shared weights across the five scenarios), but
     the doc should be corrected too - or the beta0.2 basic cell re-checked, if
     the table is the thing that is wrong.
  6. Social preview: posts.json has no "image". The import script writes
     assets/doomfly/doomfly_malecns49k_reel_web.jpg - point "image" at it.
-->

There is a repo on my GitHub called `doomfly-rl`. It wires a neural network like a fruit fly's brain and trains it to play Doom. It has connectome ETL, a sparse recurrent model, five PPO teachers, a distillation trainer, a GRPO fine-tuner, a CDK stack that runs a GPU fleet in AWS, and a self-contained tutorial page with hover-to-play footage.

I wrote almost none of it.

<figure>
  <video src="../../assets/doomfly/doomfly_malecns49k_reel_web.mp4"
         poster="../../assets/doomfly/doomfly_malecns49k_reel_web.jpg"
         autoplay muted loop playsinline preload="metadata"
         data-missing="Reel not available yet.">
  </video>
  <figcaption>The MaleCNS-49k backbone playing all five ViZDoom scenarios back to back. One episode per scenario, each the median of ten by return, so this is typical play rather than a highlight reel.</figcaption>
</figure>

It was built by an agentic coding harness we develop internally on top of [Strands Agents](https://strandsagents.com/), running without me at the keyboard. I set the goal and the constraints. The harness did the connectome ETL, the model code, the infrastructure, the fleet operations, the debugging, the experiment sweep and the write-ups.

Then it ran the experiment the whole project existed to run, and reported that the method did not work.

That last part is the reason I'm writing this up.

## What the thing actually is

The model is called `FlyNet`, and it borrows its recipe from [mlabonne/chessfly](https://huggingface.co/mlabonne/chessfly). The recurrent core is a real connectome: FlyWire FAFB v783, 138,639 neurons and 15,091,983 edges carrying about 54.5 million synapses. The wiring is frozen. So is the sign of every connection, excitatory or inhibitory, which the biology already decided. Training learns one gain per synapse and nothing else about the graph.

Around that core sit ordinary learned modules. A conv stem takes a 4-frame stack of 72x96 grayscale Doom and turns it into input currents on the visual sensory neurons. The network unrolls five steps. A readout takes the central, descending and motor neurons down to 512 units, then to one of 22 actions, with a legality mask per scenario.

Here are the parameter counts, which matter more than anything else in the post:

| Component | Parameters |
|---|---|
| Synaptic log-gains (the connectome) | 15,091,983 |
| Homeostatic scale/shift | 1,386,390 |
| Stem, decoder, policy and value heads | 34,538,493 |
| **Total** | **51,016,866** |

Two thirds of the model is a conv net and an MLP. A conv net and an MLP can learn to play Doom with no fly involved at all. Any claim about "the fly brain playing Doom" has to be read net of those 34.5 million parameters, and mostly it does not survive the reading.

So the first rule I had the harness write into its own `AGENTS.md` was a vocabulary rule: write "a network constrained to the fly connectome," never "a fly." A second backbone, a 49,393-neuron MaleCNS subgraph, trains as an ablation for exactly this reason. Most of the work below runs on that smaller one.

## The five scenarios, one clip each

<div class="video-grid">
  <figure>
    <video src="../../assets/doomfly/malecns49k_basic.mp4" poster="../../assets/doomfly/malecns49k_basic.jpg" controls muted loop playsinline preload="metadata" data-missing="basic - clip not available yet."></video>
    <figcaption><code>basic</code> - one monster in an empty room, six legal actions. Strafe until lined up, then shoot. Over in four to six decisions.</figcaption>
  </figure>
  <figure>
    <video src="../../assets/doomfly/malecns49k_defend_the_center.mp4" poster="../../assets/doomfly/malecns49k_defend_the_center.jpg" controls muted loop playsinline preload="metadata" data-missing="defend_the_center - clip not available yet."></video>
    <figcaption><code>defend_the_center</code> - rooted in place, enemies close from every side, 26 rounds and no pickups. Turning is the whole policy.</figcaption>
  </figure>
  <figure>
    <video src="../../assets/doomfly/malecns49k_defend_the_line.mp4" poster="../../assets/doomfly/malecns49k_defend_the_line.jpg" controls muted loop playsinline preload="metadata" data-missing="defend_the_line - clip not available yet."></video>
    <figcaption><code>defend_the_line</code> - the same job against a wider front, and the one scenario with real headroom left.</figcaption>
  </figure>
  <figure>
    <video src="../../assets/doomfly/malecns49k_health_gathering.mp4" poster="../../assets/doomfly/malecns49k_health_gathering.jpg" controls muted loop playsinline preload="metadata" data-missing="health_gathering - clip not available yet."></video>
    <figcaption><code>health_gathering</code> - the floor is acid and the medkits are scattered. No shooting at all; the reward is just staying alive to the 2100-step timeout.</figcaption>
  </figure>
  <figure>
    <video src="../../assets/doomfly/malecns49k_deadly_corridor.mp4" poster="../../assets/doomfly/malecns49k_deadly_corridor.jpg" controls muted loop playsinline preload="metadata" data-missing="deadly_corridor - clip not available yet."></video>
    <figcaption><code>deadly_corridor</code> - seventeen legal actions and shooters down both walls. The hard one, and the one the teacher needed reward shaping and a lower difficulty to learn at all.</figcaption>
  </figure>
</div>

## The code was the easy part. Again.

I wrote in [the pixel art post](./pixel_art_build_system.html) that the 95k lines of GDScript were the easy part and keeping four pictures of the same orc consistent was not. Same shape of finding here, different axis.

Writing a sparse recurrent op, a distillation loop, and a PPO teacher wrapper is well-trodden ground. PyTorch, Stable-Baselines3 and ViZDoom are heavily represented in training data. The model code landed early and mostly worked.

What consumed the run was operations. Read the commit log as a list of things that went wrong.

The sparse connectome matmul ran under bf16 autocast and produced garbage, because cuSPARSE ships no mixed-dtype kernels; the fix forces fp32 for the spmm and sddmm specifically and leaves the rest of the model in bf16. The pipeline read GPU memory through `nvidia-smi | head`, which lies on multi-GPU boxes: under `set -o pipefail` the SIGPIPE from `head` mangled the output, so the batch size got chosen from a corrupted string. The AWS Deep Learning AMI's activate script references an unset `LD_LIBRARY_PATH`, so a bootstrap running with unset-variable checking on dies at the first line of the venv activation.

Then the ones that are not bugs at all. PPO collapsed to a single action on `basic` and `deadly_corridor`, which pay plus or minus 100 per event; SB3's PPO with clip 0.1 read that as saturating and settled on one button forever, until rewards were scaled by 0.01 before the learner, the same thing Sample Factory does. And there were no GPUs. us-west-2 had no L40S capacity, so the harness wrote a mixed-instances ASG with a capacity probe, then a second script that walks instance types across availability zones in other regions until something launches.

Later, launching the GRPO sweep, it shipped an environment variable containing a `|` into cloud-init unquoted. The shell parsed the pipe as an operator, cloud-init died with `--temperature,1.2: command not found`, and a GPU box sat there doing nothing until someone noticed. The fix is single quotes. The finding is that a box which boots and idles costs exactly as much as a box that works.

Not one of those is a coding problem. They are a CUDA kernel limitation, a shell signal semantic, a vendor AMI bug, an RL scaling pathology, a cloud capacity shortage, and a quoting error four layers deep in a launch path. Almost all of them are invisible until you run the thing on real hardware and watch it fail.

This is the hill I'll die on: we are benchmarking coding agents on the wrong axis. The SWE-bench-shaped question, can it produce a correct patch, is close enough to solved for work like this. The question that actually gates autonomy is whether the agent can operate what it built, and then whether it can run an experiment on it without fooling itself.

## The cheapest thing it did all week

Before the first GPU run of the GRPO sweep, the harness ran the fine-tuner on CPU as a smoke test, and checked one number: at iteration 1, before any gradient step, the ratio between the update policy and the sampling policy has to be exactly 1.0, the KL exactly 0, the clip fraction exactly 0. It's the same policy. It cannot be anything else.

It was not. That caught two bugs.

The per-step `BatchNorm1d` layers were being switched to `train()` for the update, so normalization statistics came from the minibatch instead of the running statistics used during sampling. The update policy and the sampling policy were quietly different networks. Separately, the rollout buffer stored a NumPy view into the vectorized environment's observation array, which the environment overwrote in place on the next step, so every stored observation was actually the final one.

Either bug would have produced a sweep that ran, converged, wrote tidy JSON, and meant nothing. Twelve runs at four to seven hours each would have burned about three GPU-days to measure a bug.

I keep coming back to this because it is the whole difference between an agent that writes code and an agent you can leave alone with a research question. Writing the fine-tuner is the easy part. Knowing that `ratio == 1.0` at iteration 1 is a load-bearing invariant, checking it on a laptop first, and refusing to launch until it holds, is the part that makes the output worth reading.

## The most useful file is the one with the rules in it

The artifact I keep coming back to is not the model. It is `AGENTS.md`, the constraints file the harness works under and maintains.

It says what the project is for, and it says what it is not. No claims about biology. Every number in the README or the tutorial has to trace to a checkpoint that exists, with the exact `evaluate.py` invocation next to it. Two training boxes never share an S3 prefix. Change one thing per run and name the run after what changed. And: negative results are results, written into `docs/` with the run prefix, not dropped.

That last rule is a commitment device. It is cheap to write before you have any results and expensive to write once you have a number you dislike. It was written first.

Here is what it bought.

## The answer is no

Twelve runs. One knob changed per run, 300 iterations each, about 1.7 million frames apiece, all on the MaleCNS-49k backbone, all starting from the same distilled student. The question was whether critic-free GRPO lets a connectome-constrained network improve past the PPO teachers it was distilled from.

It does not. No run beats the student outside eval noise on any scenario.

| Scenario | Distilled student | Best GRPO run at iteration 300 |
|---|---|---|
| `basic` | 78.2 ± 7.5 | 78.2 ± 7.5 (unchanged in 11 of 12 runs) |
| `defend_the_center` | 18.6 ± 1.8 | 21.4 ± 1.9 (`lrconn1e-4`, one seed) |
| `health_gathering` | 1728 ± 616 | 2100 ± 0 (`temp1.2`, which is the timeout ceiling) |
| `deadly_corridor` | 2280.5 ± 2.4 | 2281.8 ± 1.8 (`baselinemean`) |
| `defend_the_line` | 21.0 ± 5.9 | 24.3 ± 3.7 (`base`) |

Read the right column against the spread in the left one. Every apparent gain sits inside a single standard deviation at ten episodes. The losses do not: seven of twelve runs regress `defend_the_center` by more than two student standard deviations, and eleven of twelve finish at or below the student there. The gains are noise and the losses are real, which is the signature of a method that is not helping.

Three of the five scenarios were near their ceiling before GRPO started. `deadly_corridor` sits at 2280 to 2282 because the corridor is solved. `health_gathering`'s 2100 is the episode timeout, so the best possible result is "stopped dying." And `basic` is stranger than either.

On `basic` the group-relative advantage is exactly zero in every single run. Episodes last four to six decisions, and all eight seed-matched episodes in a group end identically, so the policy gradient from that scenario is zero. `78.2 ± 7.5` duly appears in eleven of the twelve rows, and the column looks like a copy-paste error until you understand why. It isn't a scenario where GRPO failed to help; it's one where GRPO was mathematically a no-op.

The twelfth row is the interesting one. At β = 0.2, `basic` drops to 74.8 ± 13.5 despite that zero gradient, because a single network plays all five scenarios round-robin: updates from the other four move shared weights, and a strong enough KL pull drags `basic` along with them. Zero gradient from a scenario does not mean zero change to it.

## What the KL term was actually doing

The interesting finding is not that GRPO lost. It's which knob was load-bearing.

GRPO keeps a KL penalty to a frozen reference, here the distilled student, so the policy cannot wander off. At the default strength of β = 0.05, it wanders anyway. Across every scenario the KL grows over 300 iterations, from 0.03–0.11 in the first block to 0.14–1.94 in the last, and wherever it crosses roughly 0.4 the return falls.

The `seed1` run is the clean illustration: KL climbs 0.11 → 0.11 → 0.17 → 0.46 → 1.94, and the return on `defend_the_center` follows it down, 18.8 → 19.3 → 18.4 → 15.5 → 5.3. Nothing in the loss stopped it, because at β = 0.05 a KL of 1.9 costs about 0.1 in loss units, the same order as the policy term it's supposed to restrain.

Turn the penalty up to β = 0.2 and the KL stays under 0.14 on every scenario for all 300 iterations. The policy holds still. So does the return. Turn it down to β = 0.01 and `health_gathering` collapses: entropy falls 0.44 → 0.05, the policy goes nearly deterministic, and the return drops from 1775 to 904.

So the setting that prevents the damage is the same setting that prevents any change. That is a more useful result than a leaderboard number, and it points at the obvious next experiment: an adaptive β targeting a fixed KL, rather than a constant one.

Meanwhile the knobs everyone reaches for first did nothing. Doubling the group size, doubling the number of groups, switching the baseline, tightening the clip — all four land within noise of the default. The group advantage estimate was never the limiting factor.

And there's a wall-clock problem underneath all of it. The `deadly_corridor` PPO teacher saw 8 million frames in 69 minutes. A GRPO run sees about 1.7 million frames in four to seven hours, because a 48-million-parameter recurrent net unrolled five steps over a 9-million-edge sparse matrix dominates the update. At iteration 300 the sampling takes 16.6 seconds and the gradient step takes 81.6. Frames are not the bottleneck. Any gain from this method has to be worth a roughly 20x slower loop, and there is no gain.

## Watch it lose

<figure>
  <video src="../../assets/doomfly/malecns49k_student_vs_grpo_defend_the_center.mp4"
         poster="../../assets/doomfly/malecns49k_student_vs_grpo_defend_the_center.jpg"
         controls muted loop playsinline preload="metadata"
         data-missing="Student vs GRPO comparison - clip not available yet.">
  </video>
  <figcaption>Left: the distilled student. Right: the same network after 300 GRPO iterations. Same scenario, same env seed, median-return episode of five per side. By about twenty seconds the GRPO policy has spent all 26 rounds and is standing at low health with an empty pistol, while the student still has ammo.</figcaption>
</figure>

A five-episode side-by-side agrees with the ten-episode sweep on direction for every scenario: `defend_the_center` down 6.8, `health_gathering` up 248, `defend_the_line` up 5.2, `basic` and `deadly_corridor` flat.

What the footage adds is a mechanism the table only hints at. The GRPO episodes on `defend_the_center` are shorter, 161 to 207 decisions against the student's 233 to 261, and the reason is visible: it shoots more. On a map with 26 rounds and no pickups, firing more is straightforwardly bad. On `defend_the_line`, where the front is wider, firing more may be why that one went up. Five episodes cannot confirm it, and the honest version of that sentence stays "may."

I like this clip because it is the rare case where you can watch a policy get worse and see exactly what it learned to do wrong.

## There is another doomfly, and it is the better science

Partway through, we found [nftechie/doomfly](https://github.com/nftechie/doomfly). Same name, same premise, opposite design, and I think their version asks the sharper question.

They simulate the full MaleCNS graph, 166,700 neurons and 25.6 million edges, no pruning, as leaky integrate-and-fire spiking neurons with biological time constants in an event-driven C++ kernel. Pixels map onto R1-R6/R8 photoreceptors through inferred ommatidia. Actions come off named descending neurons: a DNp20 rate difference turns, DNpe017 moves and fires. Nothing on the input or output side is learned. The only plastic synapses are 4,184 KC to MBON11 connections, updated by a dopamine-gated anti-Hebbian rule with two PPL101 cells driven by in-game damage.

Their contract forbids exactly what we do: no cropping circuits, no pruning edges, no "replacing the network with a game policy." And they publish their negative results. Their v6 candidate did not pass its own survival gates, and the repo says so.

That refusal is the point. If you let in a learned conv stem, a learned readout, a free gain on every synapse and a value head, you can no longer claim the wiring did anything, because the conv net could have done it alone. Their "no learning demonstrated" is a real result precisely because they left themselves no way to fake a good one.

We ask the ML question instead. Treat the connectome as a structural prior, let gradient descent in, and see what the prior is worth. Theirs tells you what the wiring does on its own. Ours tells you what the wiring buys you as an inductive bias. Neither one invalidates the other, and a `doomfly-rl` score should be read as "connectome-constrained RL agent," never as "a fly."

## The control that actually matters

Everything above measures GRPO. None of it measures the fly.

The distilled student plays all five scenarios at roughly its teachers' level, and that is a fact about the whole 48-million-parameter stack, not about the 9 million edges of fruit-fly wiring in the middle of it. The honest question is whether those edges are doing anything a random graph with the same shape wouldn't.

So the last thing the harness built is the control: a degree-preserving edge shuffle that keeps every neuron's exact in-degree and out-degree, keeps each neuron's sign, keeps the per-neuron input weight mass, and randomizes only *which* neuron connects to which. Same statistics, no biology. Plus a second control that removes the connectome entirely and wires the stem straight to the decoder. Same rollouts, same 60,000 steps, same batch size, one flag different.

Those runs have not happened yet, so I have nothing to report and will not pretend otherwise. But I know what the outcomes mean in advance, which is the part worth committing to in public before the numbers land. If the shuffled wiring matches the real wiring, the connectome is upholstery and everything in this project is a conv net with an expensive recurrent layer. If the no-connectome baseline matches both, it is worse than upholstery. Only if the real graph beats its own degree-preserving null does the word "connectome" earn its place in the title.

I would rather run that experiment and lose than keep publishing footage of a fly that might be a conv net.

## What I actually learned

The scores were never the point; the project is a capability test for the harness, and Doom is only the load.

What I wanted to know was whether an agent left alone with a research question comes back with something I can trust. This one built the ETL, the model, the fleet, the training pipeline, the evaluation and the footage; hit failures in CUDA, bash, a vendor AMI, an RL optimizer, AWS capacity and its own launch scripts, and fixed them; caught two bugs on a laptop that would have invalidated three GPU-days of results; ran a twelve-run sweep; and then wrote down, in its own words, that the method it was built to test does not work, with the run prefixes and the standard deviations attached.

An agent that produces a plausible positive result is easy, and it is worth nothing. The thing I did not know if I'd get, and the reason this project was worth the GPU bill, is an agent that produces a trustworthy no.

The controls run next, and if the shuffled connectome scores the same as the real one, that will be the next post and a much shorter one.

**[GitHub: nonatofabio/doomfly-rl](https://github.com/nonatofabio/doomfly-rl)**

---

*Thanks for reading.*

*Keep it Awesome!*
