---
title: "Zero Trust Starts in the Silicon: Cobalt 200, Neoverse V3 and GDPR"
date: 2025-12-09
summary: My view on Cobalt 200 and Arm Neoverse CSS V3. Memory encryption by default and hardware isolation from the hypervisor move the zero-trust boundary below the host, but they become evidence under GDPR only once each property is read from the platform, enabled for the workload and attested.
---

## The boundary I care about

This post sets out my view of the engineering, prompted by Microsoft's announcement of Cobalt 200 on 18 November 2025. It is an opinion, not a measurement. Zero trust is usually applied to users, devices and networks: trust is never granted because of location, every access is verified, and breach is assumed. In my view the interesting question sits one layer lower. Beneath every workload there is a component that has historically been trusted without verification: the cloud host, its hypervisor and its operators. If the host can read a virtual machine's memory, the workload is trusting the host, whether or not anyone decided that it should.

I find it most useful to draw the boundary before discussing any product:

```
 Conventional VM                 Cobalt 200 with Arm CCA
 ---------------                 -----------------------
 +---------------------------+   +---------------------------+
 | Guest VM (personal data)  |   | Realm VM (personal data)  |  trusted
 +---------------------------+   +===========================+  hardware boundary
 | Hypervisor / host OS      |   | Hypervisor / host OS      |  verified, not trusted
 | trusted                   |   |                           |
 +---------------------------+   +---------------------------+
 | Operator access           |   | Operator access           |  no view of realm memory
 | trusted                   |   |                           |
 +---------------------------+   +---------------------------+
 | DRAM (plaintext)          |   | DRAM (encrypted, default) |
 +---------------------------+   +---------------------------+
```

On the left, the hypervisor and the operator are trusted by assumption. On the right, the claim is that one hardware boundary replaces them. My position is that the right-hand diagram is a hypothesis about a specific platform until it has been checked on that platform.

## What the platform is

[Cobalt 200](https://techcommunity.microsoft.com/blog/azureinfrastructureblog/announcing-cobalt-200-azure%E2%80%99s-next-cloud-native-cpu/4469807) is Microsoft's second Arm server CPU, built on Arm Neoverse Compute Subsystems V3 (CSS V3), with 132 active cores, 3 MB of L2 cache per core, 192 MB of L3 system cache and a TSMC 3 nm process. The first production servers operate in Microsoft's datacentres, and wider rollout and customer availability were announced for 2026.

## Three design choices that I think move the boundary

### Memory encryption by default

A custom memory controller enables memory encryption by default, with what Microsoft describes as negligible performance impact. The words I would underline are "by default". From an engineering perspective, a control that cannot be omitted is a control that does not drift, and a control that does not drift does not need to be audited for drift. That is a stronger property than any configuration standard I could write for a team to follow.

### The hypervisor stops being trusted

Cobalt 200 implements Arm's Confidential Compute Architecture (CCA), which provides hardware isolation of VM memory from the hypervisor and host OS. I read this as zero trust applied to the software stack itself: the operator's software becomes something to verify rather than something to assume. It is the same principle as no implicit trust by network location, moved down to the privilege level of the host.

### Cryptography without a cost argument

Microsoft's modelling found compression, decompression and encryption heavily used in over 30% of cloud workloads, so Cobalt 200 includes dedicated accelerators for them. My view is that this matters more for design reviews than for benchmarks. When encryption is inexpensive in hardware, the argument for leaving something unencrypted gets weaker, and the expected baseline rises.

## The assumptions I would not skip

I would treat each of the following as a test to run, not a statement to accept:

- **Architecture is not implementation.** CCA is defined by Arm's architecture, so the isolation model is not a single-vendor invention. A shared architecture does not imply a shared implementation. Cobalt 100 (Neoverse N2) and Cobalt 200 (Neoverse V3) are not interchangeable, and the features available to a guest should be read from the host's own ID registers rather than inferred from a product name.
- **Supported is not enabled.** The announcement describes CCA support and default memory encryption. Whether a specific VM size exposes them to a specific guest has to be confirmed, recorded and re-checked periodically.
- **Isolation requires attestation.** Hardware isolation provides assurance only when attestation evidence shows what the platform is and how it booted.

This is the same discipline I apply in my own projects: a claim counts once it is read back from the system that enforces it.

## How I map it to GDPR

GDPR does not accept an unverified trust boundary. Article 32 requires measures "appropriate to the risk", naming encryption and the ongoing confidentiality and integrity of processing systems, and weighs "the state of the art" and "the costs of implementation". Article 25 requires data protection by design and by default. This is how I would connect the platform to those obligations, and the column I consider most important is the last one:

| Article | Requirement                         | What Cobalt 200 contributes                               | Evidence I would want                |
|---------|-------------------------------------|-----------------------------------------------------------|--------------------------------------|
| 25      | Protection by design and by default | Encryption enabled by default                             | SKU configuration record             |
| 28      | Processor obligations               | Hardware limits on what the processor's software can see  | Contract plus attestation            |
| 32      | Security of processing              | Encryption and hardware isolation as technical measures   | Attestation report per workload      |
| 34      | Communication of a breach           | Data unintelligible to unauthorised parties               | Proof encryption was active          |
| 35      | Impact assessment                   | Reduced host-access risk in the assessment                | Documented assumptions and checks    |

## Where I land

Hardware isolation does not make a workload compliant. It does not determine the lawful basis, retention periods or international transfers. What it changes is the evidence that can exist: encryption by default and hardware isolation are concrete technical measures rather than policy statements. In my view zero trust previously ended at the hypervisor, and on Cobalt 200 and Neoverse V3 it can extend to the memory controller. The engineering work that remains is the part I find most interesting: showing, per workload, that it actually did.

*This is an opinion on the engineering, not legal advice.*
