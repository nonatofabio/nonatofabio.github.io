---
title: I Co-Authored a Research Paper With an AI Agent
date: 2026-02-04
description: How I ran an ML research project with an AI agent as my collaborator - from hypothesis to published paper.
tags: ai, ml, research, agents, collaboration
---

Look, I'm going to be honest with you. This whole thing started as an experiment within an experiment.

The *official* research question was: "Can a language model learn continuously from human conversations without forgetting everything it already knows?" But the *real* experiment? Whether I could run an entire ML research project - from hypothesis to paper - with an AI agent as my co-pilot. Not as a fancy autocomplete. As an actual collaborator.

Spoiler: It worked. [We wrote a paper](./artifacts/paper.pdf). And the process was, aham, *weird*.

## The Setup: Human + Agent = ???

Here's how it worked. I'm a scientist with 15+ years in ML. I had some research intuition, the domain knowledge, and access to 8x A100 GPUs on a remote server. What I didn't have was infinite time to write boilerplate code, babysit training runs, and manually parse log files at 2am.

Enter the agent.

My AI collaborator could execute bash commands, write and modify code, SSH into the training server, run experiments, parse results, and—critically: *remember context across our entire conversation*. It wasn't just answering questions. It was maintaining state. Tracking what we'd tried. Suggesting next steps.

The workflow looked like this:

```
Me: "Let's try reducing the GaLore rank to 64 and see if it helps with forgetting"
Agent: *writes config file*
Agent: *SSHs to server*
Agent: *launches training run*
Agent: *monitors logs*
Agent: "Training complete. MMLU dropped 3.0% vs 4.8% before. Want me to run holdout eval?"
Me: "Yes"
Agent: *runs eval, parses results, updates experiment notes*
```

I was the advisor. The agent was the grad student who never sleeps and never complains about running "just one more ablation."

## Day 1: The Naive Approach (We Both Got It Wrong)

Our first attempt was embarrassingly simple. Train a 0.5B model on conversation data. Check if it learned. Check if it forgot. The agent set everything up: data pipelines, training loop, GaLore optimizer. I reviewed the code, made some suggestions, and we kicked off a 500-step run.

The training loss looked beautiful. Smooth curves. Decreasing numbers. Then we ran the benchmarks.

```
MMLU: 48.26% → 43.45% (-4.8%)
Holdout perplexity: +14% to +22% WORSE
```

**The model got dumber.** Classic overfitting. We'd both missed it.

Here's the thing: the agent didn't try to hide the failure or spin it. It just... reported the results and asked what we should try next. No ego. No defensiveness. Just "well, that didn't work. Here are some hypotheses." That's when I realized this collaboration might actually work.



## The Design of Experiments: Where the Agent Earned Its Keep

I decided we needed a proper factorial experiment. Three hyperparameters, eight combinations, run in parallel. The kind of thing that's conceptually simple but logistically annoying.

Me: "Let's do a 2³ DOE. Factors are rank reduction, LR scheduler, and weight decay." The agent:
1. Generated all 8 config files
2. Wrote a bash script to launch them in parallel across GPUs
3. Wrote an eval script to benchmark all 8 models
4. Created a results table in our experiment notes
5. Ran the whole thing while I went to get coffee

[Insert Code Snippet: The DOE launch script the agent wrote in about 30 seconds - please, Claude Intern 1.0, fix this!]

When I came back, I had this:

| Config | Rank | Scheduler | Weight Decay | MMLU | Verdict |
|--------|------|-----------|--------------|------|---------|
| 3.0 | 128 | ❌ | 0.1 | 44.15% | Baseline |
| 3.1 | **64** | ❌ | 0.1 | **45.26%** | **WINNER** |
| ... | ... | ... | ... | ... | ... |
| 3.6 | 128 | ✅ | 0.2 | 43.90% | Worst |
| ... | ... | ... | ... | ... | ... |

The agent had already identified the pattern: **rank was the dominant factor**. Scheduler hurt. Weight decay did nothing. *I didn't have to parse a single log file.*



## The Scaling Crisis: When We Hit a Wall

Feeling confident, we tried the winning config on bigger models. TinyLlama (1.1B) worked perfectly. Then Gemma-2 (2.6B) broke everything.

```
MMLU drop: -5.67%
```

The agent flagged it immediately: "This exceeds the 5% threshold. The rank-64 setting may be too permissive for larger models." This is where the human-agent dynamic got interesting. The agent had the data. I had the intuition. Together, we hypothesized that bigger models need *lower* rank, meaning more constraint, not less.

Me: "Try rank=32 on Gemma"
Agent: *runs experiment*
Agent: "MMLU now -3.85%. Within threshold."

We'd discovered a "scaling law": `rank ∝ 1/√params`. The agent helped me formalize it into a table:

| Model Size | Optimal Rank |
|------------|--------------|
| 0.5B-1.1B | 64 |
| 2B-3B | 32 |
| 8B | 8 |

Neither of us would have gotten there alone. I needed the agent to run the experiments fast enough to iterate. The agent needed me to recognize the pattern and propose the hypothesis.



## The 8B Moment: When It Actually Worked

Time for the real test. Qwen3-8B. 8.2 billion parameters. Rank=8. 1000 training steps. The agent ran it overnight. I woke up to this message:

```
Training complete. 5:40 duration, 775 tokens/sec.
MMLU: 74.93% → 75.07% (+0.14%)
Holdout PPL: 5.34 → 4.87 (-8.8%)
```

Wait. **The model got smarter?** I didn't believe it. I asked the agent to run a statistical significance test.

```
Paired t-test: t=7.12, p<0.0001
Significant: True
```

It was real. The model learned from conversations *and* improved on benchmarks. Not just "acceptable forgetting", it got net positive knowledge transfer. The agent's response: "This proves the core hypothesis. Want me to update the experiment notes and commit?"

Yes. Yes I did.



## The LoRA Showdown: A Plot Twist

I had a nagging question: how does this compare to LoRA, the thing everyone actually uses? The agent ran the comparison. Same model, same data, same steps, same rank.

**Efficiency:**
- LoRA: 22GB VRAM, 982 tokens/sec ✅
- GaLore: 39GB VRAM, 775 tokens/sec

**Learning quality:**
- LoRA holdout PPL: +530% (catastrophic failure)
- GaLore holdout PPL: -8.8% (genuine learning)

LoRA was faster and lighter. It also *completely failed to learn anything generalizable*. The model memorized training data and forgot how to generalize. The agent's analysis was spot-on: "LoRA freezes base weights and only trains adapters. It can't integrate new knowledge—only patch outputs. GaLore projects gradients but updates all weights, enabling genuine learning."

That insight made it into the paper almost verbatim.



## Writing the Paper: The Final Boss

After six phases of experiments, we had results. Now we needed a paper. This is where I expected the collaboration to break down. Writing is *hard*. It requires judgment, narrative, argumentation. Surely an AI can't...

The agent drafted the abstract in one shot. It was... good? Like, actually good. It captured the key findings, the methodology, the implications. I edited maybe 20%.

We went section by section:
- I'd outline what needed to be said
- The agent would draft it
- I'd revise and push back
- The agent would incorporate feedback

The related work section was particularly impressive. The agent pulled relevant citations, summarized them, and positioned our work in the literature. I added a few papers it missed, but the structure was solid.

If you look at my `git log`:

```
eda30d8 exp006: Add statistical significance test - p<0.0001, t=7.12
0151460 exp006 Phase 3: GaLore vs LoRA comparison - GaLore wins
53a2c88 exp006 Phase 2: Add learning measurement
9b1e689 exp006 Phase 2: Extended training shows +0.14% MMLU improvement
f385da7 Update paper with exp006 8B validation
```

Every commit was a collaboration. Every result was verified. Every claim was backed by an experiment we'd run together.


## What I Learned About Human-Agent Collaboration

**1. The agent is a force multiplier, not a replacement.**

I couldn't have run this many experiments this fast alone. But the agent couldn't have designed the experiments or recognized the patterns without me. We were genuinely complementary.

**2. Context is everything.**

The agent remembered our entire conversation, every failed experiment, every hypothesis, every decision. It could say "remember when we tried X and it didn't work because Y?" That continuity was invaluable.

**3. The agent has no ego.**

When experiments failed, the agent just... moved on. No defensiveness. No excuses. Just "that didn't work, here's what we could try next." It's weirdly refreshing.

**4. Trust but verify.**

I checked every result. Every claim. Every number. The agent made mistakes, small ones, big ones. But the verification loop kept us honest.

**5. The meta-irony is not lost on me.**

We built a system for AI to learn from human conversations. We did it *through* human-AI conversation. The research method mirrored the research question.


## The Takeaway

The paper's conclusion is about GaLore and continuous learning. But my conclusion is different.

**We're entering an era where research itself can be collaborative between humans and AI agents.** Not AI replacing researchers. Not humans doing everything manually. Something in between - a partnership where each side contributes what they're good at.

I brought intuition, judgment, and experience. The agent brought speed, memory, and tireless execution. Together, we wrote a paper that neither of us could have written alone.

The answer to "Can AI learn continuously from human conversations?" turned out to be yes.

But the more interesting answer? "Can humans and AI agents do research together?"

Also yes.



*[The paper is available here](./artifacts/paper.pdf). The code is version controlled in a private (for now) GitHub. And I'm going to go touch grass now, something my co-author will never need to do.*

*Thanks for reading.*

*Keep it Awesome!*
