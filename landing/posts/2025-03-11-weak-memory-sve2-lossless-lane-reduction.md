---
title: "Weak Memory on Arm: Litmus Tests, Models and the TLB Shootdown"
date: 2025-03-11
summary: Fifteen litmus allow and forbid outcomes under SC, TSO and a relaxed model; one Neoverse V2 run with MP and SB reordering removed by DMB ISH and STLR/LDAR; Sail TLBI by-VA operand assertions; TLA+ shootdown model; four entry TLB in simulation.
---

## Context

The Arm memory model permits another observer to see plain loads and stores to different addresses out of order unless a barrier, acquire and release semantics, or a dependency forbids it; x86-TSO permits only store-to-load reordering. An ordering claim shall therefore be stated as a model, checked against the model, and then checked on silicon.

The IATO repository covers this in two features. The cache coherence and memory models feature pairs TLA+ and Python litmus models with a hardware litmus program for Arm Neoverse V2. The MMU and TLB shootdown feature carries the ordering obligation into hardware: after an unmap, no core shall retain a translation to the freed frame. The repository publishes captured figures for the RTL only; the litmus and model results are reported in tabular form as the repository states them.

## Design rationale

### Litmus models

`memory-models/litmus.py` encodes the litmus tests and checks 15 expected allow or forbid results under sequential consistency, TSO and a simplified relaxed model. The model fixes the allowed and forbidden outcomes before execution, so that a silicon result is a measurement against a stated expectation.

### Architectural encodings

`spec/sail/` is typechecked and compiled to C, with 14 executable assertions. These include the TLBI by-VA operand layout from DDI0487K, which a hypervisor or kernel shall encode correctly for any invalidate to have its architected effect.

### Hardware litmus program

`memory-models/hw/litmus_hw.c` executes each test 2,000,000 times on two threads, with plain `LDR` and `STR`, with `DMB ISH`, or with `LDAR` and `STLR`.

### Shootdown model

`spec/tlb/TLBShootdown.tla` states the property that no core retains a translation to a freed frame. The frame shall be freed only after every core has acknowledged the invalidate.

### TLB

The TLB is fully associative with a parallel compare, so a lookup examines every entry in one cycle and a stale entry is detected if present. A round robin victim pointer selects the replaced entry on fill. Invalidate by VPN and invalidate all are the terminal points of a shootdown, reached by a remote core's TLBI or IPI handler.

## Results

### Models

All 15 litmus outcomes hold. The 14 Sail assertions pass. `TLBShootdown.tla` holds when the frame is freed after every core acknowledges the invalidate, and fails when the frame is freed before every IPI acknowledgement.

### Silicon

Host: Arm Neoverse V2 (MIDR part `0xd4f`) under Linux. Run dated 2026-11-14.

| Test | Relaxed outcome | Seen in 2,000,000 |
|---|---|---|
| SB | `r0=0, r1=0` | 10,576 |
| SB+dmb | `r0=0, r1=0` | 0 |
| MP | `r0=1, r1=0` | 181 |
| MP+dmb | `r0=1, r1=0` | 0 |
| MP+stlr+ldar | `r0=1, r1=0` | 0 |
| LB | `r0=1, r1=1` | 0 |

### TLB

<figure class="cs-figure"><img src="/journal/weak-memory-sve2-lossless-lane-reduction/schematic_tlb.png" alt="Yosys and netlistsvg schematic of the four entry TLB" width="3200" height="1963" loading="lazy" decoding="async" /><figcaption><span class="cs-figure__label">Figure 1 · tlb schematic, ENTRIES = 4</span> After Yosys <code class="ic">proc</code>, <code class="ic">opt -full</code> and <code class="ic">clean</code>, before technology mapping. VPN and PPN registers, the parallel compare driving <code class="ic">hit</code> and selecting <code class="ic">ppn</code>, the round robin victim pointer, and the invalidate by VPN and invalidate all paths.</figcaption></figure>

<figure class="cs-figure"><img src="/journal/weak-memory-sve2-lossless-lane-reduction/testbench_1-tb_tlb.png" alt="Geany with tb_tlb.sv open and the Icarus simulation log below" width="1600" height="1000" loading="lazy" decoding="async" /><figcaption><span class="cs-figure__label">Figure 2 · tb_tlb testbench</span> <code class="ic">tb_tlb.sv</code>, instantiated with <code class="ic">ENTRIES(4)</code>: fill, refill in place, eviction, invalidate by VPN and invalidate all. Icarus Verilog 12.0 prints <code class="ic">PASS tb_tlb</code>.</figcaption></figure>

The monitor at lines 14 to 21 compares every pair of valid entries on every clock edge after reset and counts an error if two map the same VPN. A duplicate VPN is the hardware manifestation of a stale translation coexisting with its replacement; the invariant is checked continuously, not at end of test.

<figure class="cs-figure"><img src="/journal/weak-memory-sve2-lossless-lane-reduction/waveform_tb_tlb.png" alt="GTKWave view of tb_tlb with fill, lookup, hit, invalidate and errors signals" width="1600" height="616" loading="lazy" decoding="async" /><figcaption><span class="cs-figure__label">Figure 3 · tb_tlb waveform</span> <code class="ic">tb_tlb</code>: fills, an in-place refill, a fifth fill evicting the round robin victim, invalidate by VPN and invalidate all. No <code class="ic">timescale</code> is set; GTKWave labels simulator time steps as seconds.</figcaption></figure>

Trace sequence: VPN `00010` filled with PPN `A0010`; lookup of `00011` misses; `00010` refilled with `B0010` and lookup returns `B0010`, an in-place update with no duplicate. Fills of `00020` to `00050` exceed four entries, and the fifth distinct VPN evicts the round robin victim. `inv_en` with `inv_vpn = 00050` removes that entry, and lookup of `00050` ceases to hit. `errors` remains 0 throughout.

## Observations

- SB: both threads read the initial value 10,576 times; `DMB ISH` between store and load removed the outcome in this run.
- MP: flag observed set with stale data 181 times. This is the producer and consumer failure pattern. Both a full barrier on each side and the `STLR` and `LDAR` pairing removed it in this run.
- LB: architecturally allowed and not observed, which is usual on current cores. Zero observations in one run is not proof of absence.
- CI asserts only that fenced variants never exhibit the relaxed outcome. That is the property on which code depends, and it shall not regress.

## Limitations

| Claim | Evidence | Limit |
|---|---|---|
| Fifteen litmus outcomes hold under SC, TSO and a relaxed model | `litmus.py` | The relaxed model is simplified |
| MP and SB reorder on Neoverse V2, and the fences remove it | One silicon run, 2026-11-14 | Counts vary run to run; LB not observed is not proof of absence |
| TLBI by-VA operand layout matches DDI0487K | Sail, 14 assertions in total | Architectural encoding, not an implementation |
| No core keeps a translation to a freed frame | `TLBShootdown.tla` | Model only |
| The TLB fills, refills, evicts and invalidates as specified | `tb_tlb`, Figures 1 to 3 | Simulation only, no physical FPGA |

The CI workflow runs on the GitHub `ubuntu-24.04` runner; its hardware litmus step exercises the runner's CPU, not the Neoverse V2 host.

Source: [framework repository on GitHub](https://github.com/dhruv-setty/pcie-dma-and-tlb-hardware-with-formal-checks)
