---
title: The Certainty We Never Had
date: 2026-08-21
description: Software was never as predictable as we told ourselves. AI didn't break the promise. It exposed that the promise was always fiction.
tags: software-engineering, ai, sre, reliability, operations
---

<div class="listen-box" id="listen">
  <p class="listen-label">🎧 Prefer to listen? 10:44, narrated locally on my homelab with <a href="https://github.com/nonatofabio">LVNA</a>.</p>
  <audio id="post-audio" controls preload="none" style="width:100%;">
    <source src="../artifacts/the-certainty-we-never-had.mp3" type="audio/mpeg">
    Your browser doesn't support audio playback.
    <a href="../artifacts/the-certainty-we-never-had.mp3">Download the MP3</a>.
  </audio>
</div>

<style>
.listen-box{scroll-margin-top:2rem;border:1px solid rgba(128,128,128,.25);border-radius:.6rem;padding:1rem 1.1rem;margin:1.5rem 0;}
.listen-box .listen-label{margin:0 0 .6rem;font-size:.95rem;opacity:.8;}
</style>

<script>
(function(){
  var a=document.getElementById('post-audio');
  if(!a||typeof gtag!=='function')return;
  var fired={};
  function once(n){if(fired[n])return;fired[n]=true;gtag('event',n,{post:'certainty_we_never_had',surface:'post'});}
  a.addEventListener('play',function(){once('audio_play');});
  a.addEventListener('timeupdate',function(){
    if(!a.duration)return;
    var p=a.currentTime/a.duration;
    if(p>=.25)once('audio_25');
    if(p>=.5)once('audio_50');
    if(p>=.75)once('audio_75');
  });
  a.addEventListener('ended',function(){once('audio_complete');});
  // Arriving via #listen (e.g. the audio link on LinkedIn) should land on the
  // player rather than the top of a 1,400-word essay.
  if(location.hash==='#listen'){
    a.preload='metadata';
    setTimeout(function(){a.scrollIntoView({block:'center'});},0);
  }
})();
</script>

There's a story our industry tells itself: traditional software is deterministic, therefore predictable, therefore safe. And AI, because it samples from a probability distribution, is none of those things.

The story is comforting. It's also wrong on both ends. It flatters conventional software with a certainty it never had, and it condemns AI against a baseline that exists only in textbooks.

A note on where I'm arguing from. I've spent a long time on the operations side of large-scale cloud systems, and most of what convinced me of this sits in incident reviews I can't quote. So I'm not going to pretend a citation is doing work that experience is doing. What follows is grounded in public literature wherever the literature will carry it, and flagged as my own judgment where it won't. You should discount the second part accordingly, but I'd rather you discount it than have me dress it up.

## The determinism fetish

Individual machine instructions are deterministic: same state, same input, same output. But we quietly upgrade that narrow mathematical fact into a much grander claim: that the deployed system will do what people intended.

That inference doesn't hold. Determinism guarantees consistency, and a program can be consistently wrong. Deterministic malware is still malware. A deterministic deadlock reliably deadlocks. Correctness is a relationship between what the code does and what people wanted, and determinism says nothing about the second half.

This isn't new. DeMillo, Lipton, and Perlis argued in 1979 that even formal proofs of programs are social artifacts. They establish confidence, not truth. NIST's verification guidance still draws the same line: verification shows conformance to a specification. It cannot show the specification was right.

## The hidden state is people

The deeper failure is operational, and it shows up somewhere most people don't look.

Ask why cloud operations is so expensive. The intuitive answer is hardware failure and the economics of scale, things nobody ever claimed were deterministic. I used to think that too. I don't anymore, and the reason is the part I find hard to argue in public without showing you incident data I don't own.

Here's what I can say. Hardware failure is the *solved* part of operations. It has clean failure models and automated remediation; a disk dying is a scheduled inconvenience. The expensive, unautomatable part is sociotechnical: changes people make to live systems, and the reasoning behind those changes going missing.

Peter Naur named the mechanism in 1985: programming is theory building. The program is not the theory. The theory (why that timeout is thirty seconds, what invariant that strange conditional protects, which dependency breaks if you touch this) lives in the heads of the people who built it. When they leave through reorgs, layoffs, or ordinary churn, the code stays perfectly deterministic while the system becomes *less predictable*, because nobody can reconstruct the assumptions the code encodes.

The team is now operating a system whose real specification exists nowhere.

The only knowledge that survives this decay is what's been compressed into hardened, slow-moving foundations like TCP, POSIX, and retry-with-backoff, the first principles that took decades to solidify. Everything above that layer is perishable. A large fraction of operations spend is the recurring cost of that perishability.

So the hidden state that makes deployed software unpredictable isn't just timing, faults, and adversaries. It's epistemic. Retries, circuit breakers, canaries, chaos testing, on-call rotations, root-cause reviews. These aren't decorations on a certain system. They're the tribute an uncertain system pays to reality. And a good part of that uncertainty is an organization forgetting its own reasons.

## The safe-baseline fallacy

Once you see that, the standard case against AI loses its footing. That case compares the *idealized abstraction* of conventional software against the *observed production behavior* of AI. The fair comparison is observed system versus observed system, under matched tasks, authority, and safeguards.

Nancy Leveson has spent a career on the underlying point: safety is not a property of a component, human or mechanical. It's emergent from the whole sociotechnical system: architecture, environment, authority, and recovery mechanisms together. A program doesn't become safe because its source is deterministic. A human doesn't become safe because they possess judgment.

The right question is never "is this component certain?" It's "what's the probability of harm from this system, in this envelope, and is that lower or higher than what we run today?" The incumbent shouldn't win merely by being incumbent.

Richard Cook's *How Complex Systems Fail* explains why the incumbent feels safe anyway. After every incident, the team reconstructs a tidy causal chain, fixes it, and walks away feeling the event was predictable all along. It wasn't. Post-hoc explainability is not ex ante predictability. Root-cause analysis is a *selected narrative*, and its psychological side effect is renewed, unearned confidence in the deterministic story, right until the next failure arrives through a chain nobody drew.

If you've sat through enough of these, you already know the feeling I'm describing.

## Where the symmetry ends

Here's where I part ways with the enthusiastic version of my own argument. Demolishing a fake baseline doesn't make AI as safe as what it replaces. Symmetric burden of proof is not symmetric ease of proof, and three asymmetries survive the correction.

**Calibration.** We have centuries of actuarial data on how people fail, and institutions (liability, licensure, sanction) built to shape those failures. For frontier models we have evaluations that are weak proxies for deployment behavior, systems that shift under context and provider updates, and attack classes like prompt injection with no patch-and-converge story the way memory-safety bugs had. We can write the risk comparison as an equation; we can't yet measure both sides with equal confidence.

**Correlation.** Human error is buffered by cognitive diversity. A thousand engineers make a thousand different mistakes. A fleet of agents running one model can make the *same* mistake, everywhere, simultaneously, from a single update. That's monoculture risk at a scale with no good human analogue. Lamport's fault-tolerance results are a warning here, not a comfort: they hold only under explicit assumptions about how many components fail independently.

**Tempo.** AI acts faster than oversight loops built for human speeds. A bad decision that a review meeting would have caught next Tuesday can execute ten thousand times by Tuesday.

Against these stand real advantages the old system never offered: complete execution traces, cheap replay, mechanically bounded permissions, adversarial testing at scale, and replacement without an HR process.

Neither column wins by default. An AI-augmented system may be safer than the human workflow in one envelope and far more dangerous in another. Which is exactly why this gets settled empirically, per deployment, not by reference class.

## The position

Software assurance has always been probabilistic at the system level. Determinism was a property of the abstraction. The certainty was manufactured by hindsight, sustained by institutional habit, and quietly financed by an operations budget whose real job was absorbing the gap between the model and the world, a gap widened every year by the churn that carries a system's theory out the door.

AI didn't introduce uncertainty into software. It moved uncertainty somewhere we can no longer pretend not to see it.

That relocation is uncomfortable, and it should be used well. The right response is neither to bar probabilistic components from serious work by comparing them to a fiction, nor to wave every agent through because "software was never certain anyway."

It's to state, for every consequential system, whether human, deterministic, probabilistic, or mixed, the same disciplined claim: bounded probability of harm, explicit operating envelope, named assumptions, measured detection and recovery, and evidence the claim stays calibrated after deployment. Proofs, tests, monitors, and human escalation all become forms of evidence toward that claim, not talismans against needing one.

The determinism fetish gave us permission to skip that discipline for fifty years. AI has revoked the permission.

That may turn out to be its most valuable contribution to software engineering, delivered before anyone decides whether to trust it with anything else.

---

## Sources

- R. DeMillo, R. Lipton, A. Perlis, "Social Processes and Proofs of Theorems and Programs" (CACM, 1979)
- P. Naur, "Programming as Theory Building" (1985)
- N. Leveson, *Engineering a Safer World* (MIT Press, 2011)
- R. Cook, "How Complex Systems Fail" (1998)
- L. Lamport, R. Shostak, M. Pease, "The Byzantine Generals Problem" (1982)
- NIST guidance on software verification and validation

*Views are my own and don't represent my employer. Nothing here draws on non-public information.*
