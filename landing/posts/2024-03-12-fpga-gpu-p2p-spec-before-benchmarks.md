---
title: "Writing the Specification Before the Benchmarks: An FPGA to GPU Peer-to-Peer Pipeline on Arm"
date: 2024-03-12
summary: The motivation, objectives, assumptions and acceptance criteria for a low-latency FPGA to GPU peer-to-peer data path on Arm Neoverse, specified before the first benchmark runs.
---

## Motivation

Moving data between accelerators appears simple until the path is examined. A frame arrives at an FPGA, is parsed, and must reach GPU memory. The conventional route passes through the CPU twice: once into host memory and once again to the GPU. Each copy adds latency, consumes memory bandwidth and creates a place where data can be held longer than intended.

Peer-to-peer (P2P) DMA removes the CPU from the payload path: the FPGA writes directly into GPU memory over PCIe. Arm announced Neoverse V3 and the Neoverse CSS V3 compute subsystem on 21 February 2024, which makes this an appropriate moment to define what an accelerator data path on Neoverse must guarantee.

This project forms part of my Correctness Framework for Heterogeneous Accelerator Architectures. It is scheduled from 6 April 2024 to 30 January 2025.

## Objectives

1. Deliver an ultra-low-latency FPGA to GPU pipeline on a virtualised Arm Neoverse N2 or V3 platform, using QEMU/KVM and VFIO for device isolation and AF_XDP for control.
2. Guarantee zero CPU payload copies in direct mode.
3. Make every fallback to a slower path visible and accounted for.
4. Define acceptance criteria and failure cases before any benchmark is run.

## Assumptions

- The platform is a dedicated bare-metal N2 or V3 host. Cloud firmware may not expose the required PCIe routing or Access Control Services (ACS) behaviour.
- The GPU driver supports peer memory registration.
- SMMU and VFIO privileges, and PMU counter access, are available to the test environment.
- Several of these remain unconfirmed at the outset and are recorded as unknown rather than assumed true.

## Approach

### Two tracks

The central design decision separates control from payload.

```
                  control track (small, CPU-visible)
   +--------+   descriptors, doorbells via write-combined MMIO   +--------+
   |  CPU   | -------------------------------------------------> |  FPGA  |
   +--------+                                                    +---+----+
                                                                     |
                  payload track (bulk, no CPU copy)                  |
                     PCIe peer-to-peer DMA                           v
                                                               +-----------+
                                                               | GPU peer  |
                                                               |  memory   |
                                                               +-----------+

   fallback (visible, never silent):  FPGA --> pinned host buffer --> GPU
```

The control track carries bounded metadata only. The payload track carries data directly from the FPGA to GPU peer memory, and the CPU is not permitted to touch it. Pinned host staging is the fallback. Any switch to it must be reported; a silent fallback is treated as a test failure, because a pipeline that becomes slower without notice cannot be reasoned about.

### A descriptor that cannot misrepresent its state

Each unit of work is a 64-byte descriptor:

```
 +-----+--------+-------+--------+--------+--------+--------+-----+-------+------------+
 | ABI | opcode | queue | tenant | target | offset | length | seq | epoch | completion |
 +-----+--------+-------+--------+--------+--------+--------+-----+-------+------------+
   reserved bits must be zero; address within a registered range; length non-zero and bounded
```

The sequence number and epoch address stale completions. If a late completion from an earlier run could recycle a buffer that is now in use, data would be corrupted without any error. A buffer is therefore reused only after its epoch and sequence are verified, and every reset increments the epoch.

### Order of priorities

The requirements are ranked: DMA safety, then ownership correctness, then tail latency, then throughput. The hard-fail conditions follow from that order:

- any DMA outside the active registered region;
- any malformed frame reaching payload memory after the parser has rejected it;
- any buffer reuse before completion and generation are validated;
- any silent switch from direct P2P to a staged or CPU copy path.

### Isolation and teardown

Isolation is provided by the Arm SMMU and VFIO. Each device mapping is a tuple of stream ID, domain, address range, permission, tenant and epoch. Negative tests attempt DMA below the base, beyond the end, into read-only memory, through stale addresses after unmap, and into an adjacent tenant. Teardown follows a fixed sequence:

```
 stop admission --> drain in-flight --> disable bus mastering --> unmap (SMMU) --> reset, epoch + 1
```

### Accounting under overload

When the GPU cannot keep pace, the pipeline drops at the ingress edge or throttles the source. Every frame must be accounted for:

```
 ingress = accepted + dropped(parser) + dropped(overload) + dropped(recovery) + residual
                                                                  residual must equal 0
```

## Data path in detail

<p>Taking the CPU out of the data path by opening a direct channel between an FPGA and a GPU across the PCI Express fabric, on a virtualised Arm Neoverse N2/V3 platform.</p>

<figure class="cs-figure"><img src="/case-studies/p2p-overview.png" alt="Arm coordinator sends WC MMIO writes to the FPGA parser and doorbells to the GPU runtime, while the payload moves FPGA to GPU over PCIe P2P" width="1488" height="414" loading="lazy" decoding="async" /><figcaption><span class="cs-figure__label">Figure 1 · System overview</span> An Arm coordinator running <code class="ic">AF_XDP</code> control drives both devices with small writes only: write-combined MMIO to the FPGA parser and doorbells to the GPU runtime. The payload itself never visits the coordinator. It travels FPGA to GPU as PCIe peer-to-peer traffic. </figcaption></figure>

### Bypassing host memory: zero-copy P2P

<figure class="cs-figure"><img src="/case-studies/p2p-two-track-datapath.png" alt="Two-track datapath: coordinator descriptor control above, bulk payload moving FPGA parser plus DMA to GPU peer memory with no CPU copy" width="1498" height="355" loading="lazy" decoding="async" /><figcaption><span class="cs-figure__label">Figure 2 · Two-track datapath</span> Instead of staging data through CPU RAM, the system exposes the physical memory space, the PCIe Base Address Registers (<code class="ic">BAR</code>), of one device so the other can initiate direct read and write transactions across the bus. Control and payload are split: the CPU touches only descriptors and doorbells, while bulk payload moves straight into GPU peer memory. The invariant is <code class="ic">N_cpu_payload_copies = 0</code> in direct mode, and any fallback to host staging is exported as telemetry, never taken silently. </figcaption></figure>

### DMA and bus mastering

<figure class="cs-figure"><img src="/case-studies/p2p-dma-sequence.png" alt="Sequence: CPU registers handle, publishes descriptor, rings WC doorbell; FPGA issues translated P2P DMA to GPU; GPU completes; completion record and reap" width="1130" height="570" loading="lazy" decoding="async" /><figcaption><span class="cs-figure__label">Figure 3 · Transaction sequence</span> Either the FPGA or the GPU acts as the bus master and orchestrates the movement. Here the CPU's role ends at step 3, the doorbell. The FPGA's <code class="ic">DMA</code> engine then issues translated P2P writes into GPU memory (step 4), the GPU signals completion (step 5), and the buffer is only reaped once its sequence and epoch check out. Large streams move across the interconnect asynchronously without consuming CPU cycles. </figcaption></figure>

### IOMMU/SMMU address translation

<figure class="cs-figure"><img src="/case-studies/p2p-topology-smmu.png" alt="Topology: Neoverse coordinator core, CMN and memory controllers, PCIe root complex, FPGA and GPU requesters with stream IDs, P2P TLP route, and Arm SMMU domains" width="1469" height="683" loading="lazy" decoding="async" /><figcaption><span class="cs-figure__label">Figure 4 · Topology and SMMU domains</span> Devices work in their own virtual address spaces. The IOMMU, on Arm the System MMU, translates device-visible addresses into physical host-bus addresses. Each requester carries its own stream ID (<code class="ic">s_f</code>, <code class="ic">s_g</code>) and SMMU domain (<code class="ic">D_f</code>, <code class="ic">D_g</code>), which gives memory-access protection, tenant isolation and valid routing across the PCIe root complex. Under <code class="ic">VFIO</code>, a DMA outside the active tenant mapping must fault, not land. </figcaption></figure>
<figure class="cs-figure"><img src="/case-studies/p2p-smmu-teardown.png" alt="Teardown order: stop admission, drain, disable bus master, unmap, reset and sanitise" width="1404" height="108" loading="lazy" decoding="async" /><figcaption><span class="cs-figure__label">Figure 5 · Teardown order</span> Isolation also has to survive shutdown. Mappings come down in a fixed order: stop admission, drain, disable bus mastering, unmap, then reset and sanitise, so no in-flight DMA can reach memory that has already been handed back. </figcaption></figure>

### The underlying correctness framework

<p> The pipeline sits inside a broader Correctness Framework for Heterogeneous Accelerator Architectures. Its formal side is a draft preprint, <em>A Coinductive Bisimulation Characterisation of Parameterised SVE State under Virtualisation-Structured Dynamics</em>. It treats hardware and hypervisor internals (<code class="ic">EL2</code>, <code class="ic">MMU</code>, <code class="ic">VMID</code>, scheduling) as an abstract, correctness-preserving environment and models only what can be observed. </p>
<p> Configurations pair vector state indexed by SVE vector length (<code class="ic">VL ::= 128 | 256 | 512</code>) with an architectural projection. Execution, migration and reconfiguration are labelled transitions, and an embedding between vector-length spaces preserves observation. The main theorem, migration preservation, says that if <code class="ic">C_H ⊑ C_G</code> then <code class="ic">O(mig(C_H)) = O(mig(C_G))</code>: if one configuration refines another, migrating both yields the same observable behaviour. It rests on lemmas for embedding preservation, refinement stability, migration invariance, trace stability and commutativity. </p>
<p> The same habit runs through the pipeline spec: define what must be observably true first, then measure against it. </p>

## Acceptance criteria

Tail latency is defined as p50, p99, p99.9 and maximum, not the mean, so that the favourable figure cannot be selected after the fact. Forty failure cases are defined across five suites: malformed input, GPU overload, SMMU negative DMA, recovery and security.

## Expected outcomes and current status

At the time of writing, the architecture, test matrices and acceptance limits are specified. The evidence that would confirm them, namely benchmark data, FPGA counter dumps, PMU traces, SMMU fault logs and a platform manifest, does not yet exist. The register therefore records 40 defined cases and 0 verified outcomes, and every KPI reads PENDING or LIMITED rather than PASS. The starting disposition is conditional, and host staged transfer remains the required fallback until evidence supports the direct path.

<p> The specification defines 40 failure cases across five suites: malformed input, GPU overload, SMMU negative tests, fault recovery and security negative tests. Raw benchmark logs, FPGA counter dumps and SMMU fault logs are not attached, so those cases are marked pending rather than passed. Unconditional direct P2P is not yet qualified, and host pinned staging remains the operational fallback. </p>

## Principles carried forward

- Define acceptance criteria before measurement.
- Permit fallbacks, but never silent ones.
- Keep "designed" and "demonstrated" as separate states in every report.
- Treat PCIe topology as a property to be verified, not an assumption, because peer-to-peer capability depends on the hierarchy, the ACS settings and the SMMU.

The [specification and evidence register](https://www.dropbox.com/scl/fi/lrntb1t05v04yb1wz4ei8/CBLT-2-1cf710990566.pdf?rlkey=rp2c40yxcu7wo0m9yqnl13ckc&st=1x4jym61&dl=0) contains the full detail.
