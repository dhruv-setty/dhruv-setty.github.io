---
title: "Weak Memory, SVE2 and Lossless Lane Reduction on Armv9.0-A"
date: 2025-03-11
summary: Modelling Neoverse N2 and Cortex-X3 concurrency so the state space stays flat as SVE2 vectors grow, losing no observable behaviour.
---

## Motivation

Can a formal model of concurrency on Arm Neoverse N2 and Cortex-X3 keep its state space flat as SVE2 vectors grow, without losing a single observable behaviour? Yes, provided the abstraction keeps two things intact: single-copy atomicity boundaries and cross-lane dependencies.

<figure class="cs-figure"><img src="/case-studies/armv9-overview.png" alt="Two Armv9.0-A cores, each with SVE2 registers and a store buffer, connected through a cache-coherent interconnect to shared memory holding data x and flag f" width="1036" height="660" loading="lazy" decoding="async" /><figcaption><span class="cs-figure__label">Figure 1 · Where the races live</span> Each core runs one hardware thread, so there is no contention between sibling threads inside a core. The races that matter happen between cores, through the coherent interconnect. Ordering between them is set by the architecture, not the pipeline: barriers (<code class="ic">DMB</code>, <code class="ic">DSB</code>) and acquire/release (<code class="ic">LDAR</code>, <code class="ic">STLR</code>) are the only levers. </figcaption></figure>

## Method

### Why x86 intuition does not transfer

<p> On x86, the TSO model lets a store be delayed past a later load and little else. Armv9.0-A is weaker: normal loads and stores to different addresses may be reordered in any combination unless an address, data or control dependency, a barrier, or acquire/release semantics forbids it. The model is other-multi-copy-atomic, so once a store is visible to one other core it is visible to all of them. That guarantee is what makes the problem tractable to formalise. </p>
<p> Because these cores reorder aggressively, reasoning from the pipeline is a trap. The study works from the architectural memory model, axiomatic and operational, so every conclusion holds for any conforming Armv9.0-A implementation, not just the two cores named here. </p>

### Single-copy atomicity boundaries

<figure class="cs-figure"><img src="/case-studies/armv9-atomicity-boundaries.png" alt="Byte ruler of a 128-bit vector showing scalar 64-bit atomic accesses, predicated 32-bit lane accesses each atomic, an inactive lane with no access, and unpredicated LDR Z as 16 byte accesses" width="1656" height="466" loading="lazy" decoding="async" /><figcaption><span class="cs-figure__label">Figure 2 · What is atomic inside a vector access</span> An SVE2 vector access is never single-copy atomic as a whole. A predicated <code class="ic">LD1W</code> or <code class="ic">ST1W</code> is a sequence of element accesses, and each aligned element is single-copy atomic on its own. Inactive lanes do not touch memory. Unpredicated <code class="ic">LDR Z</code> and <code class="ic">STR Z</code> are a stream of byte accesses with no atomicity guarantee above one byte. The optional 64-byte <code class="ic">FEAT_LS64</code> accesses are a different mechanism and the model does not assume them. </figcaption></figure>

### The bug this exposes

<figure class="cs-figure"><img src="/case-studies/armv9-litmus-mp.png" alt="Message-passing litmus test: with plain accesses a reader can see the flag set while vector lanes are still old; with release and acquire that outcome is forbidden" width="999" height="740" loading="lazy" decoding="async" /><figcaption><span class="cs-figure__label">Figure 3 · Message passing with a vector payload</span> The classic message-passing test, with the payload in a vector. With plain accesses, a reader can see the flag set and still read stale lanes, and the lanes can disagree with each other. A release store on the flag and an acquire load on the reader forbid that outcome. This is the shape of most real vector concurrency bugs on Arm: torn, partially updated vectors that never appear on x86. </figcaption></figure>

### State space against vector length

<figure class="cs-figure"><img src="/case-studies/armv9-state-space.png" alt="Plot of log2 lane observations per racing access against vector length: explicit lanes grow from 4 to 64, lane reduction stays flat at 1 or 3" width="1008" height="549" loading="lazy" decoding="async" /><figcaption><span class="cs-figure__label">Figure 4 · Why per-lane modelling explodes</span> Because each lane is its own atomic access, a racing vector of <code class="ic">L</code> lanes can be observed in <code class="ic">2^L</code> old/new combinations. N2 and X3 run at 128 bits, so <code class="ic">L = 4</code> for 32-bit elements, but SVE code is vector-length agnostic and the architecture allows up to 2048 bits. A model that enumerates lanes explicitly reaches <code class="ic">2^64</code> at the top of that range. Parametric lane reduction keeps one symbolic lane for lane-wise code, plus only the <code class="ic">k</code> lanes that cross-lane operations actually couple, so the count stays flat whatever the vector length. </figcaption></figure>

### When the reduction is lossless

<figure class="cs-figure"><img src="/case-studies/armv9-lossless-reduction.png" alt="Commuting diagram: vector-length fibres linked by embeddings, each mapped by a reduction into a reduced state space, which maps to the observation domain and the quotient" width="1080" height="964" loading="lazy" decoding="async" /><figcaption><span class="cs-figure__label">Figure 5 · The formal trade-off</span> Each vector length is a fibre <code class="ic">S_λ</code>, linked by embeddings <code class="ic">ι</code> that preserve observation. The reduction <code class="ic">ρ_λ</code> maps every fibre into one reduced space. It is lossless exactly when <code class="ic">O ∘ ρ_λ = O</code>, and that holds only if it keeps per-element atomicity boundaries and every cross-lane dependency: permutes, reductions, predicate generation and gather addresses. Drop either and the model silently forgets a reachable bug. </figcaption></figure>

## The underlying correctness framework

<p> The formal side builds on the draft preprint behind this framework. States are observed through a function <code class="ic">O</code>, and two states are equivalent when they look the same: <code class="ic">s₁ ≈ s₂ ⇔ O(s₁) = O(s₂)</code>. The quotient <code class="ic">Q = S/≈</code> is the system the proofs reason about. </p>
<p> Its closure theorem says <code class="ic">Q</code> is a well-defined quotient transition system when four conditions hold: equivalence is a congruence over transitions, the observation order is a preorder, embeddings preserve observation, and migration preserves observation. Six lemmas carry it, from transition congruence to migration identity, where <code class="ic">[mig(s)] = [s]</code>. Lane reduction is one more observation-preserving map in the same family, which is why it can shrink the state space without changing what the proofs can see. </p>

## Limitations

<p> This is a model and a draft preprint, not a measured result. The atomicity rules come from the Arm Architecture Reference Manual. The reduction has not yet been checked against the published Armv9 memory-model tooling or run as litmus tests on Neoverse N2 or Cortex-X3 hardware, so its claims stay conditional until it is. </p>

## References

<ul class="cs-refs">
<li><a href="https://support.arm.com/documentation/ddi0487/mc/-Part-B-The-AArch64-Application-Level-Architecture/-Chapter-B2-The-AArch64-Application-Level-Memory-Model/-B2-2-Atomicity-in-the-Arm-architecture/-B2-2-1-Requirements-for-single-copy-atomicity">Arm Architecture Reference Manual, B2.2.1 Requirements for single-copy atomicity</a></li>
<li><a href="https://arxiv.org/abs/2508.04115">Su and Colvin, Weak Memory Model Formalisms: Introduction and Survey</a></li>
<li><a href="https://en.wikipedia.org/wiki/ARM_Neoverse">Arm Neoverse overview</a></li>
</ul>
