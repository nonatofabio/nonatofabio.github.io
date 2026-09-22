---
title: A Fruit Fly Brain Plays Doom
date: 2026-09-21
description: A network wired like a fruit fly's brain plays five Doom scenarios. The Strands harness built it, ran the GPU fleet, and reported two negative results. My part of the transcript is a dozen sentences.
tags: ai, agents, strands, ml, reinforcement-learning
image: /assets/doomfly/doomfly_reel_poster.jpg
---

Imagine I opened this post by telling you I got a fly to play Doom. Would you believe me?

<figure>
  <video src="../../assets/doomfly/doomfly_reel.mp4"
         poster="../../assets/doomfly/doomfly_reel_poster.jpg"
         autoplay muted loop playsinline preload="metadata"
         data-missing="Reel not available yet.">
  </video>
  <figcaption>The five ViZDoom scenarios, one clip each. Every clip is the median episode of ten, so this is typical play and not a highlight reel.</figcaption>
</figure>

You should not. The thing playing up there is not a fly, but its wiring diagram comes from one. It is a recurrent network built on a real fruit fly connectome: 49,393 neurons and 9 million synapses, all frozen, with one learned gain per synapse. An ordinary convolutional network feeds it the game frames and an ordinary MLP turns its activity into moves, and those two hold more than half of the parameters. So read every result in this post as "a network constrained to the fly connectome" and never as "a fly". Yes, the title breaks that rule. That is the hook, and the rest of the post is the correction.

Now, here is the thing: I did not write the code, the infrastructure or the first drafts of the docs. All of it came out of the [Strands harness](https://github.com/strands-agents/harness-sdk), an open-source coding agent from the Strands Agents team at AWS that you run from the terminal. It keeps its own state on disk between sessions and runs tools, tests and cloud deployments on its own. Here it wrote the pipeline that turns the fly's wiring into a network and the five ordinary Doom agents that served as teachers. It wrote the trainer that taught the fly-wired network to copy them, and the second training stage that tried to push it further. It also wrote the cloud setup that ran a GPU fleet in three AWS regions, and it recorded the footage. Five days, 28 commits, about 3,300 lines of Python and shell, twelve fine-tuning runs and three control runs.

## What I actually typed

The harness keeps its own session state on disk, so I went back and read my side of the transcript. It is short. It started with one prompt, typos and all:

> I just saw this: https://huggingface.co/mlabonne/chessfly
>
> I want to make the same thing but to play doom! Look at the skills and memory and have a set up ready for us to train it using my fnp3 aws accountl. Also create a infographic style tutorial on how it works, both the conectome model as well as the training. Use this current directory as a infra/cdk for training and training source and data ETL pipeline source. Once we complete all, we should have this is a private github repo. If you find a way to start training while I'm away, go for it!

Across the seven sessions that followed, this is most of what I said:

> Go for it!
>
> Can you check how are we doing on the training of doomfly?
>
> Do you have suggestions to speed up the training process?
>
> how do I use tb to see all the runs so far? *(tb is TensorBoard)*
>
> Let's stop and revert all this we should not pursue this anymore
>
> Sorry, wrong session!

"Let's stop and revert all this" was me killing an easter egg I had asked for an hour earlier: a Doom mod with a fly paw for the player's hand and Stan the frog, the Strands mascot, as the enemies. The harness reverted the whole thing, previews and tests included, and went back to the training run. "Sorry, wrong session!" came right after I pasted a request meant for a different agent, about a different project.

I ran all of it from the terminal with the `strands` command, and I changed the model underneath it as I went. The first sessions ran on Claude Fable 5.1 on Amazon Bedrock. By the last day the same sessions were running on GPT-6 Astra at the highest reasoning effort. The transcript does not care which model is behind it, and neither does the repo.

## Between my sentences

Everything else in the transcript is the harness at work, and reading it back showed me how much the Strands harness worked for me.

Each session persisted to disk, and the next one opened with a summary of the last. Seven sessions over five days read like one conversation, and I could close the laptop at night and pick up in the morning where it left off. Long tool outputs were paged out of the conversation as it grew and fetched back when the agent asked for them. About two hundred of those are still sitting on disk, and without that mechanism the logs from day one alone would have ended the project.

Background tasks paid off on the last day. While a two-hour evaluation ran on my Mac, the same agent widened the model's output from 22 Doom actions to 23 for the next experiment and wrote nine tests for it. It also confirmed that the widened model played the old scenarios bit-for-bit the same as before. The repo has an `AGENTS.md` that says never push, launch, terminate or delete without being told, and the harness asked every time. "Go for it!" was me answering. It also loaded my own [writing and verification skills](https://github.com/nonatofabio/claude-writing-skills) and the MCP tools I already use, which is why the docs it produced read like mine.

None of that is exotic on its own. What I had not seen before is all of it in one command, with nothing to wire up. The same agent is two lines of Python if you want it inside a script, and after this week I would not think twice about starting a project that way.

## The part I trust

An agent that returns a plausible positive result is hard to trust. This one returned two negative results, with the run prefixes and standard deviations attached, because its rules say that negative results go in `docs/` and not in the bin.

A short map of what the harness did, so the two results make sense. It first trained five ordinary Doom agents with PPO, a standard reinforcement learning method, one per scenario. Those are the teachers. It then distilled the teachers into one fly-wired network, the student, by having the student imitate their moves. The student ended up playing about as well as its teachers. The question the project was built for was whether a second stage of reinforcement learning, GRPO, could push it past that.

First, it could not. Twelve GRPO runs, one setting changed per run, and not one beat the student by more than the noise in the evaluation. GRPO keeps the new policy close to the student with a penalty. The penalty strength that stopped the policy from wandering into worse play was the same strength that stopped it from improving at all.

Second, and this one stings, the connectome does nothing measurable. The harness suggested and built two controls. One keeps the same graph but shuffles its edges, so every neuron keeps its degree and its sign and the biology is gone. The other removes the neuron layer entirely.

| Backbone | Parameters | Training steps per second | Doom scores |
|---|---|---|---|
| Real connectome | 48.2 M | 646 | baseline |
| Shuffled edges, two seeds | 48.2 M | 1,454 | same, within noise |
| No connectome at all | 27.7 M | 14,686 | same, within noise |

One scenario as an example, ten episodes each: on `defend_the_center` the real connectome scored 18.6 ± 1.8, the two shuffled graphs 19.0 and 18.4, and the model with no connectome 18.3. The other four scenarios look the same. The fly wiring makes training 22 times slower and buys nothing on these five scenarios. That is why the caption says "wired like a fruit fly's brain" and not "a fruit fly's brain". The harness wrote that vocabulary rule into `AGENTS.md` on day two, before either result existed. It would have been a hard rule to write after a result I disliked.

## What's next

Scores on the five scenarios stopped moving, and three of them sit at their ceilings, so the next test is a real level. The student already plays Freedoom II MAP01 zero-shot. With its aiming prior it survives twice as long as random and picks up items. It still dies in eight of ten episodes and never leaves the first two rooms. The wider output and a slot for a sixth scenario are done and tested. Next comes GRPO on that map with all three backbones: real, shuffled and none. If the wiring is ever going to matter, it will be where the policy has to learn rather than imitate. If the network learns anything there, the plan is fly versus fly in a duel.

The code is public at [nonatofabio/doomfly-rl](https://github.com/nonatofabio/doomfly-rl), and the trained checkpoints are on [Hugging Face](https://huggingface.co/fabiononato/doomfly-rl) with the connectome file they need. If you want to watch a network shaped like a fly play Doom, start there.

---

*Thanks for reading.*

*Keep it Awesome!*
