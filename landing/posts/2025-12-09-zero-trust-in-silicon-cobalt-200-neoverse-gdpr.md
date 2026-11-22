---
title: "Zero Trust Starts in the Silicon: Cobalt 200, Neoverse V3 and GDPR"
date: 2025-12-09
summary: Opinion. Cobalt 200 on Neoverse CSS V3: default memory encryption and Arm CCA realm isolation relocate the zero-trust boundary below the hypervisor; under GDPR Articles 25 and 32 they constitute evidence only when read from ID registers, enabled per VM size and attested.
kicker: SECURITY
cover: /journal/covers/zero-trust-in-silicon-cobalt-200-neoverse-gdpr.png
---

## Position

This is an opinion on the engineering, prompted by Microsoft's announcement of Cobalt 200 on 2025-11-18. It is not a measurement and not legal advice.

The host, its hypervisor and its operators constitute an implicitly trusted layer beneath every workload. Where the host can read guest memory, the workload trusts the host irrespective of policy. Default memory encryption and Arm CCA realm isolation relocate the zero-trust boundary below that layer. The relocated boundary shall be treated as a hypothesis about a specific platform until it is read from that platform, enabled for the workload and attested.

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

## Rationale

### Platform

[Cobalt 200](https://techcommunity.microsoft.com/blog/azureinfrastructureblog/announcing-cobalt-200-azure%E2%80%99s-next-cloud-native-cpu/4469807) is Microsoft's second Arm server CPU, built on Arm Neoverse Compute Subsystems V3 (CSS V3): 132 active cores, 3 MB of L2 per core, 192 MB of L3 system cache, TSMC 3 nm. First production servers operate in Microsoft datacentres; wider rollout and customer availability were announced for 2026.

### Realm isolation from the hypervisor

Cobalt 200 implements Arm CCA, which isolates VM memory from the hypervisor and host OS in hardware. The isolation model is published and has been subjected to verification. Realms are enforced in a separate physical address space, the Realm world; untrusted system software retains dynamic allocation of memory to Realms but cannot access Realm memory contents, even when executing at a higher privilege level, and the firmware that manages Realms has been formally verified for security and correctness [1]. The Realm Management Monitor specification and implementation have been developed alongside a formal verification methodology, which exposed inconsistencies, errors and imprecision in both during design [2].

The host software stack therefore becomes an object of verification rather than of assumption: the principle of no implicit trust by network location, applied at the privilege level of the host.

### Memory encryption by default

A custom memory controller enables memory encryption by default, with what Microsoft describes as negligible performance impact. A control that cannot be omitted does not drift and does not require drift audit. That property is stronger than any configuration baseline that relies on operator adherence.

Default encryption is necessary and not sufficient. Brief physical access to the SPD chip of a DIMM can induce physical address aliasing that circumvents CPU access control and breaks the memory integrity guarantee of AMD SEV-SNP; the same work challenges the trust assumptions underlying scaled-up memory encryption, the direction it identifies across AMD SEV-SNP, Intel TDX and Arm CCA [3]. The threat model of a memory encryption claim shall therefore state whether physical access to the memory subsystem is in scope.

### Cryptographic offload

Microsoft's modelling found compression, decompression and encryption heavily used in over 30% of cloud workloads; Cobalt 200 includes dedicated accelerators for them. Where encryption is inexpensive in hardware, a design that leaves data unencrypted carries a weaker justification, and the expected baseline in design review rises accordingly.

Vendor overhead characterisations shall be confirmed per platform and per workload. On AMD SEV-SNP and Intel TDX, an empirical study measured up to a 92% increase in the initial memory allocation of confidential VMs and up to a 60% performance drop for heavy network processing under high CPU utilisation, attributed to bounce-buffered I/O stacks [4].

### Attestation

Hardware isolation provides assurance only with attestation evidence of platform identity and boot state. The architecturally defined attestation mechanisms of Arm CCA and Intel TDX have been formally specified across provisioning, initialisation and the attestation protocol [5]. A controller relying on CCA shall consume Realm and platform evidence as specified, not a product-level assertion of support.

### GDPR mapping

Article 32 requires measures "appropriate to the risk", names encryption and the ongoing confidentiality and integrity of processing systems, and weighs "the state of the art" and "the costs of implementation". Article 25 requires data protection by design and by default. The evidence column is normative: absent that evidence, the contribution shall not be claimed.

| Article | Requirement                         | What Cobalt 200 contributes                               | Evidence I would want                |
|---------|-------------------------------------|-----------------------------------------------------------|--------------------------------------|
| 25      | Protection by design and by default | Encryption enabled by default                             | SKU configuration record             |
| 28      | Processor obligations               | Hardware limits on what the processor's software can see  | Contract plus attestation            |
| 32      | Security of processing              | Encryption and hardware isolation as technical measures   | Attestation report per workload      |
| 34      | Communication of a breach           | Data unintelligible to unauthorised parties               | Proof encryption was active          |
| 35      | Impact assessment                   | Reduced host-access risk in the assessment                | Documented assumptions and checks    |

## Observations

- **Architecture is not implementation.** CCA is an Arm architectural feature, not a single-vendor mechanism, but a shared architecture does not imply a shared implementation. Cobalt 100 (Neoverse N2) and Cobalt 200 (Neoverse V3) are not interchangeable. Guest-visible features shall be read from the host ID registers, not inferred from a product name.
- **Supported is not enabled.** The announcement describes CCA support and default memory encryption. Exposure to a specific guest on a specific VM size shall be confirmed, recorded and periodically re-verified.
- **Verified is not unconditional.** Verification results [1], [2], [5] hold for the specified models and threat models. Physical attacks on the memory subsystem [3] lie outside the guarantees that memory encryption alone provides.
- **Isolation is not compliance.** It does not determine lawful basis, retention periods or international transfers. It changes the evidence that can exist: encryption by default and hardware isolation are technical measures, not policy statements.
- A claim counts once it is read back from the system that enforces it. On Cobalt 200 and Neoverse V3, zero trust can extend from the hypervisor to the memory controller; per-workload demonstration that it did remains outstanding.

*This is an opinion on the engineering, not legal advice.*

## References

[1] X. Li, X. Li, C. Dall, R. Gu, J. Nieh, Y. Sait and G. Stockwell. Design and Verification of the Arm Confidential Compute Architecture. In *16th USENIX Symposium on Operating Systems Design and Implementation (OSDI 22)*, pp. 465–484, 2022. [USENIX proceedings](https://www.usenix.org/conference/osdi22/presentation/li)

[2] A. C. J. Fox, G. Stockwell, S. Xiong, H. Becker, D. P. Mulligan, G. Petri and N. Chong. A Verification Methodology for the Arm Confidential Computing Architecture: From a Secure Specification to Safe Implementations. *Proceedings of the ACM on Programming Languages* 7 (OOPSLA1), Article 88, 2023. [DOI 10.1145/3586040](https://doi.org/10.1145/3586040)

[3] J. De Meulemeester, L. Wilke, D. Oswald, T. Eisenbarth, I. Verbauwhede and J. Van Bulck. BadRAM: Practical Memory Aliasing Attacks on Trusted Execution Environments. In *2025 IEEE Symposium on Security and Privacy (S&P)*, 2025. [DOI 10.1109/SP61157.2025.00104](https://doi.org/10.1109/SP61157.2025.00104)

[4] M. Misono, D. Stavrakakis, N. Santos and P. Bhatotia. Confidential VMs Explained: An Empirical Analysis of AMD SEV-SNP and Intel TDX. *Proceedings of the ACM on Measurement and Analysis of Computing Systems* 8 (3), Article 36, 2024. [DOI 10.1145/3700418](https://doi.org/10.1145/3700418)

[5] M. U. Sardar, T. Fossati, S. Frost and S. Xiong. Formal Specification and Verification of Architecturally-Defined Attestation Mechanisms in Arm CCA and Intel TDX. *IEEE Access* 12, pp. 361–381, 2024. [DOI 10.1109/ACCESS.2023.3346501](https://doi.org/10.1109/ACCESS.2023.3346501)
