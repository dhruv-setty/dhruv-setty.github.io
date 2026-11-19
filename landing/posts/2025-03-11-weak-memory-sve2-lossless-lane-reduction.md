---
title: "Weak Memory on Arm: Litmus Tests, Models and the TLB Shootdown"
date: 2025-03-11
summary: What the IATO repository establishes about Arm weak memory: fifteen litmus outcomes under SC, TSO and a relaxed model, one silicon run on Neoverse V2 where message passing reordered and both fixes removed it, Sail assertions for the TLBI operand, and a four entry TLB whose fill and invalidate behaviour is shown in simulation.
---

## Why weak memory needs evidence, not intuition

On x86 the memory model lets a store be delayed past a later load and little else. Arm is weaker: plain loads and stores to different addresses may be observed out of order by another core unless a barrier, acquire and release, or a dependency forbids it. Reasoning from intuition about one core's pipeline does not survive that. The only defensible statement about ordering is one that is written down as a model, tested against the model, and then tested on silicon.

The IATO repository does all three in one place. Its first feature, cache coherence and memory models, pairs written specifications (TLA+ and Python litmus models) with a litmus program that runs on an Arm Neoverse V2 host. Its fourth feature, the MMU and TLB shootdown, carries the same ordering question into hardware: when a page is unmapped, no core may keep a translation to the freed frame.

The repository publishes captured figures for its RTL, and the figures in this post are those for the TLB. The litmus and model results have no screenshot in the repository; they are reported below as the README states them, in tables.

## The models: fifteen expected outcomes

`memory-models/litmus.py` encodes litmus tests and checks 15 expected allow or forbid results under three models: sequential consistency, TSO, and a simplified relaxed model. All 15 hold. The value of a model here is that it fixes, before any hardware is run, which outcomes are allowed and which are forbidden. A silicon result is then a measurement against a stated expectation rather than a surprise.

The Sail side covers the architectural encodings. `spec/sail/` is typechecked and compiled to C, and its 14 executable assertions pass. Among them is the TLBI by-VA operand layout from DDI0487K, the encoding a hypervisor or kernel must get right before any invalidate can mean what it is meant to mean.

## The silicon: one run on Neoverse V2

`memory-models/hw/litmus_hw.c` runs each test 2,000,000 times on two threads, with plain `LDR` and `STR`, with `DMB ISH`, or with `LDAR` and `STLR`. The host is an Arm Neoverse V2 (MIDR part `0xd4f`) under Linux, and the run is dated 14 November 2026.

| Test | Relaxed outcome | Seen in 2,000,000 |
|---|---|---|
| SB | `r0=0, r1=0` | 10,576 |
| SB+dmb | `r0=0, r1=0` | 0 |
| MP | `r0=1, r1=0` | 181 |
| MP+dmb | `r0=1, r1=0` | 0 |
| MP+stlr+ldar | `r0=1, r1=0` | 0 |
| LB | `r0=1, r1=1` | 0 |

Read as engineering evidence:

- **Store buffering (SB).** Both threads read the old value 10,576 times. A `DMB ISH` between the store and the load removed it in this run.
- **Message passing (MP).** The reader saw the flag set and the data stale 181 times. This is the pattern behind most real producer and consumer bugs. Both fixes removed it in this run: a full barrier on each side, and the cheaper release store with acquire load (`STLR` and `LDAR`).
- **Load buffering (LB).** Allowed by the architecture and not observed. The README is careful here, and so is this post: zero observations in one run is not proof that it cannot happen, which is usual on current cores.

The limits are stated plainly in the repository. The counts come from one run and vary from run to run. The CI workflow runs on the GitHub `ubuntu-24.04` runner, so its hardware litmus step exercises the runner's CPU, not the Neoverse V2 host, and CI asserts only that the fenced variants never show the relaxed outcome. That assertion is the right one to automate: it is the property code depends on, and it is the one that must never regress.

## From ordering to a freed frame

Ordering stops being abstract when memory is reclaimed. `spec/tlb/TLBShootdown.tla` states the property: no core keeps a translation to a freed frame. The model holds when the frame is freed after every core has acknowledged the invalidate, and freeing before every IPI acknowledgement fails. The hardware side of that property is a TLB that actually forgets what it is told to forget, and the figures that follow are that TLB.

<figure class="cs-figure"><img src="/journal/weak-memory-sve2-lossless-lane-reduction/schematic_tlb.png" alt="Yosys and netlistsvg schematic of the four entry TLB" width="3200" height="1963" loading="lazy" decoding="async" /><figcaption><span class="cs-figure__label">Figure 1 · tlb schematic, ENTRIES = 4</span> Fully associative TLB with four entries: VPN and PPN registers, the parallel compare that drives <code class="ic">hit</code> and selects <code class="ic">ppn</code>, the round robin victim pointer, and the invalidate by VPN and invalidate all paths.</figcaption></figure>

The netlist is taken after Yosys `proc`, `opt -full` and `clean`, before technology mapping, so each cell corresponds to an RTL operator or register. Three structures are worth reading from it. The parallel compare means a lookup checks every entry in one cycle, so a stale entry is found if it exists. The round robin victim pointer decides which entry a new fill replaces. The two invalidate paths, by VPN and all, are the hardware end of a shootdown: they are what a remote core's TLBI or IPI handler finally reaches.

<figure class="cs-figure"><img src="/journal/weak-memory-sve2-lossless-lane-reduction/testbench_1-tb_tlb.png" alt="Geany with tb_tlb.sv open and the Icarus simulation log below" width="1600" height="1000" loading="lazy" decoding="async" /><figcaption><span class="cs-figure__label">Figure 2 · tb_tlb testbench</span> <code class="ic">tb_tlb.sv</code> open in the editor: fill, refill in place, eviction, invalidate by VPN and invalidate all, with a monitor that fails the run if two valid entries ever map the same VPN. Icarus Verilog 12.0 prints <code class="ic">PASS tb_tlb</code>.</figcaption></figure>

The monitor at lines 14 to 21 is the important part of the testbench. On every clock edge after reset it compares every pair of valid entries and counts an error if two map the same VPN. A duplicate VPN is the hardware form of a stale translation surviving beside a new one, so this is an invariant checked continuously rather than a result checked once at the end. The testbench instantiates the TLB with `ENTRIES(4)`, the same configuration as the schematic above.

<figure class="cs-figure"><img src="/journal/weak-memory-sve2-lossless-lane-reduction/waveform_tb_tlb.png" alt="GTKWave view of tb_tlb with fill, lookup, hit, invalidate and errors signals" width="1600" height="616" loading="lazy" decoding="async" /><figcaption><span class="cs-figure__label">Figure 3 · tb_tlb waveform</span> <code class="ic">tb_tlb</code>: fills, a refill that updates in place, a fifth fill that evicts the round robin victim, invalidate by VPN and invalidate all. <code class="ic">errors</code> stays at 0. The testbench sets no <code class="ic">timescale</code>, so GTKWave labels simulator time steps as seconds.</figcaption></figure>

The trace reads left to right as the testbench's sequence. VPN `00010` is filled with PPN `A0010`; a lookup of `00011` misses; `00010` is filled again with `B0010` and a lookup returns `B0010`, so the refill updated the entry in place instead of creating a duplicate that the monitor would have caught. Fills of `00020` to `00050` then take the TLB past four entries, so the fifth distinct VPN evicts the round robin victim. Finally `inv_en` with `inv_vpn = 00050` removes that entry, and the lookup of `00050` stops hitting. Throughout, `errors` is 0.

## What this does and does not establish

| Claim | Evidence | Limit |
|---|---|---|
| Fifteen litmus outcomes hold under SC, TSO and a relaxed model | `litmus.py` | The relaxed model is simplified |
| MP and SB reorder on Neoverse V2, and the fences remove it | One silicon run, 14 November 2026 | Counts vary run to run; LB not observed is not proof of absence |
| TLBI by-VA operand layout matches DDI0487K | Sail, 14 assertions in total | Architectural encoding, not an implementation |
| No core keeps a translation to a freed frame | `TLBShootdown.tla` | Model only |
| The TLB fills, refills, evicts and invalidates as specified | `tb_tlb`, Figures 1 to 3 | Simulation only, no physical FPGA |

The method is the point: write the allowed outcomes down first, then let the model, the silicon and the simulator each disagree with them if they can.

Source on GitHub: [the IATO repository](https://github.com/whatheheckisthis/Intent-Auditable-Trust-Object).
