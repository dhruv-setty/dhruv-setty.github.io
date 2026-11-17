---
title: "Zero Trust Starts in the Silicon: Cobalt 200, Neoverse V3 and GDPR"
date: 2025-12-09
summary: How Cobalt 200 and Arm Neoverse CSS V3 extend zero trust below the hypervisor, the assumptions that must hold, and what the change means for evidence under GDPR.
---

## Motivation

Zero trust rests on three principles: trust is never granted because of location, every access is verified, and breach is assumed. These principles are usually applied to users, devices and networks. Beneath all of them sits a component that has historically been trusted without verification: the cloud host, its hypervisor and its operators.

GDPR does not accept that gap. Article 32 requires measures "appropriate to the risk", naming encryption and the ongoing confidentiality and integrity of processing systems. Article 25 requires data protection by design and by default. If the host can read a virtual machine's memory, the controller is trusting the host, whether or not that trust was intended.

Microsoft announced Cobalt 200 on 18 November 2025. It provides a useful case for examining how far zero trust can be extended into the silicon.

## Objectives of this analysis

1. Identify which Cobalt 200 design choices change the zero-trust boundary.
2. Map each change to the GDPR articles it supports.
3. State the assumptions that must be verified before any of it counts as evidence.

## The platform

[Cobalt 200](https://techcommunity.microsoft.com/blog/azureinfrastructureblog/announcing-cobalt-200-azure%E2%80%99s-next-cloud-native-cpu/4469807) is Microsoft's second Arm server CPU, built on Arm Neoverse Compute Subsystems V3 (CSS V3), with 132 active cores, 3 MB of L2 cache per core, 192 MB of L3 system cache and a TSMC 3 nm process. The first production servers operate in Microsoft's datacentres, and wider rollout and customer availability were announced for 2026.

## Where the trust boundary moves

```
 Conventional VM                              Cobalt 200 with Arm CCA
 ---------------                              -----------------------
 +---------------------------+                +---------------------------+
 | Guest VM (personal data)  |                | Realm VM (personal data)  |  <- trusted
 +---------------------------+                +===========================+  <- hardware boundary
 | Hypervisor / host OS      |  <- trusted    | Hypervisor / host OS      |  <- verified, not trusted
 +---------------------------+                +---------------------------+
 | Operator access           |  <- trusted    | Operator access           |  <- no view of realm memory
 +---------------------------+                +---------------------------+
 | DRAM (plaintext)          |                | DRAM (encrypted, default)  |
 +---------------------------+                +---------------------------+
```

### 1. Memory encryption by default

A custom memory controller enables memory encryption by default, with what Microsoft describes as negligible performance impact. The significant term is "by default". Article 25(2) requires protection by default, not protection that must be remembered and enabled. A control that cannot be omitted is a control that does not need to be audited for drift.

### 2. The hypervisor ceases to be trusted

Cobalt 200 implements Arm's Confidential Compute Architecture (CCA), which provides hardware isolation of VM memory from the hypervisor and host OS. This applies the principle of no implicit trust by location to the software stack itself. The operator's software becomes something to be verified rather than assumed.

### 3. Cryptography without a cost argument

Microsoft's modelling found compression, decompression and encryption heavily used in over 30% of cloud workloads, so Cobalt 200 includes dedicated accelerators for them. Article 32 weighs "the state of the art" and "the costs of implementation". When encryption is inexpensive in hardware, the argument against encrypting weakens and the expected baseline rises.

## Assumptions that must be verified

- **Architecture is not implementation.** CCA is defined by Arm's architecture, so the isolation model is not a single-vendor invention. A shared architecture, however, does not imply a shared implementation. Cobalt 100 (Neoverse N2) and Cobalt 200 (Neoverse V3) are not interchangeable, and the features available to a guest must be read from the host's own ID registers rather than inferred from a product name.
- **Supported is not enabled.** The announcements describe CCA support and default memory encryption. Whether a specific VM size exposes them to a specific guest must be confirmed, recorded and periodically re-checked.
- **Isolation requires attestation.** Hardware isolation provides assurance only when attestation evidence shows what the platform is and how it booted.

## Mapping to GDPR

| Article | Requirement                         | What Cobalt 200 contributes                               | Evidence required                    |
|---------|-------------------------------------|-----------------------------------------------------------|--------------------------------------|
| 25      | Protection by design and by default | Encryption enabled by default                             | SKU configuration record             |
| 28      | Processor obligations               | Hardware limits on what the processor's software can see  | Contract plus attestation            |
| 32      | Security of processing              | Encryption and hardware isolation as technical measures   | Attestation report per workload      |
| 34      | Communication of a breach           | Data unintelligible to unauthorised parties               | Proof encryption was active          |
| 35      | Impact assessment                   | Reduced host-access risk in the assessment                | Documented assumptions and checks    |

## Outcome

Hardware isolation does not make a workload compliant. It does not determine the lawful basis, retention periods or international transfers. It does change the evidence available: encryption by default and hardware isolation are concrete technical measures rather than policy statements. Zero trust previously ended at the hypervisor; on Cobalt 200 and Neoverse V3 it can extend to the memory controller. Under GDPR, the remaining question is whether the controller can demonstrate that it did.

*This is a technical analysis, not legal advice.*
