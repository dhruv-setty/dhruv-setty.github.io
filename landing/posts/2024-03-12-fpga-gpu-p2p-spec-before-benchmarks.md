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

## Acceptance criteria

Tail latency is defined as p50, p99, p99.9 and maximum, not the mean, so that the favourable figure cannot be selected after the fact. Forty failure cases are defined across five suites: malformed input, GPU overload, SMMU negative DMA, recovery and security.

## Expected outcomes and current status

At the time of writing, the architecture, test matrices and acceptance limits are specified. The evidence that would confirm them, namely benchmark data, FPGA counter dumps, PMU traces, SMMU fault logs and a platform manifest, does not yet exist. The register therefore records 40 defined cases and 0 verified outcomes, and every KPI reads PENDING or LIMITED rather than PASS. The starting disposition is conditional, and host staged transfer remains the required fallback until evidence supports the direct path.

## Principles carried forward

- Define acceptance criteria before measurement.
- Permit fallbacks, but never silent ones.
- Keep "designed" and "demonstrated" as separate states in every report.
- Treat PCIe topology as a property to be verified, not an assumption, because peer-to-peer capability depends on the hierarchy, the ACS settings and the SMMU.

The [specification and evidence register](https://www.dropbox.com/scl/fi/lrntb1t05v04yb1wz4ei8/CBLT-2-1cf710990566.pdf?rlkey=rp2c40yxcu7wo0m9yqnl13ckc&st=1x4jym61&dl=0) and the [case study](/case-studies/fpga-gpu-p2p/) contain the full detail.
