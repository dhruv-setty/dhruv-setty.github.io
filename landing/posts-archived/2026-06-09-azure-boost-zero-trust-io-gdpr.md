---
title: "Azure Boost and the Zero-Trust I/O Path Under GDPR"
date: 2026-06-09
summary: Opinion. Next-generation Azure Boost: Cerberus-attested firmware, an ARM SoC control plane isolated from the data path, and TDISP over IDE-encrypted PCIe eliminating the confidential VM bounce buffer; GDPR evidence only when confirmed per VM size and the attestation is retained.
---

## Position

This is an opinion on the engineering of the I/O path. It is not a measurement and not legal advice.

The weakest segment of a confidential workload lies between data at rest and data in transit: egress from guest memory through the host to storage or the network. Under a zero-trust model, that segment is attack surface; under GDPR, it is processing the controller is obliged to secure. The [next generation of Azure Boost](https://techcommunity.microsoft.com/blog/azurecompute/announcing-the-general-availability-of-the-next-generation-of-azure-boost/4519136), generally available since 2026-05-07, targets that segment. Attested devices and the elimination of the bounce buffer address it directly, and shall count as evidence only once confirmed per VM size with the attestation retained.

## Rationale

### Trust boundaries of the card

Azure Boost offloads virtualisation, networking and storage from the host to dedicated hardware. The new generation is a PCIe card built around a single ASIC with three parts:

```
 +--------------------------------------------------------------------+
 |                        Azure Boost card                            |
 |                                                                    |
 |  +---------------------------+   +-------------------------------+ |
 |  | ASIC + FPGA data path     |   | MANA network adapter          | |
 |  | storage acceleration,     |   | up to 400 Gbps                | |
 |  | vNet and storage crypto   |   +-------------------------------+ |
 |  +---------------------------+                                     |
 |                                                                    |
 |  +--------------------------------------------------------------+  |
 |  | ARM SoC control plane: physically isolated from the customer |  |
 |  | VM and from the data path                                    |  |
 |  +--------------------------------------------------------------+  |
 |                                                                    |
 |  Root of trust: Cerberus (NIST SP 800-193), firmware attested      |
 +--------------------------------------------------------------------+
```

The separation of the ARM SoC control plane from the data path is the decisive property. A management component without visibility of customer data has a bounded compromise, and that bound shall be the first design objective.

Cobalt 200 systems include the latest Boost capabilities. Against Cobalt 100, Microsoft reports 20% higher remote storage IOPS and 15% higher network bandwidth for Cobalt 200 VMs.

### Zero-trust principles as controls

Each row is a control that can, in principle, be tested.

| Principle                     | Implementation in Azure Boost                                                            |
|-------------------------------|------------------------------------------------------------------------------------------|
| Verify before trust           | Cerberus measures and attests firmware; the card does not start if measurement fails     |
| Verify continuously           | Azure Attestation Service re-checks devices; failing devices leave service automatically |
| Separate control from data    | The ARM SoC manages the card without access to customer data                             |
| Isolate tenants               | Per-tenant cryptographic separation on the data path                                     |
| Minimise privileged software  | The host runs a smaller, hardened stack; critical components are memory safe             |

### Bounce buffer elimination

In current confidential computing, guest memory is encrypted with a key inaccessible to devices, so every I/O shall be staged through a shared bounce buffer before a NIC or storage controller can consume it.

```
 Today (confidential VM)
   private memory --decrypt/copy--> shared bounce buffer --> device --> network / storage
                                    (outside protected memory)

 Azure Boost Confidential Device
   private memory ==IDE-encrypted PCIe==> attested device (TDISP) --> network / storage
                    (no staging copy)
```

The cost is measured in the literature. The CVM-IO tax, composed mainly of the bounce buffer mechanism and in-guest packet processing, can occupy more than 50% of vCPU cycles in network-intensive workloads [1]. On AMD SEV-SNP and Intel TDX, bounce-buffered default I/O stacks produce up to a 60% performance drop for heavy network processing under high CPU utilisation [2].

The bounce buffer also places a staging area outside protected memory. The staging area is the more serious defect: on every I/O, data resides in a form the confidential VM no longer protects. The host-facing I/O interface is itself a vulnerability surface; confidential I/O interfaces have been shown to fail on both performance and security when confronted with interface vulnerabilities and host observability [3].

### Device attestation and the trusted device path

With the Boost Confidential Device, the confidential VM attests Boost hardware and firmware via TDISP (PCI-SIG) and then permits the attested device to read encrypted guest memory directly over IDE-encrypted PCIe links. TDISP uses SPDM to attest the device and establish a secure connection, and PCIe IDE for encrypted and integrity-protected communication at the transaction layer, which permits the trusted device to DMA directly into CVM private memory [2]. The trust boundary contains only the attested ASIC, FPGA and real-time firmware; the ARM SoC remains outside it.

SPDM inherits requirements and design from TLS 1.3, but its state machines and transcript handling are substantially more complex [4]. A device attestation claim shall therefore rest on an SPDM implementation of a formally analysed protocol version, not on the presence of the protocol name.

Microsoft reports near parity with general-purpose VMs for attested offloads. The design removes the copy rather than securing it.

### Countervailing view

Trusted I/O is not uniformly beneficial. For network I/O, CVM traffic is already encrypted under the CVM threat model, so PCIe-level encryption is redundant, and trusted I/O expands the TCB to include the device; a software path on off-the-shelf CPUs has been shown to come within 6% of an optimal trusted I/O configuration [5]. Admission of the device to the TCB shall be justified per I/O class, with storage and network evaluated separately.

### DMA trust

A device admitted to the TCB holds DMA authority over guest memory. IOMMU protection has been bypassed within seconds by malicious DMA-capable peripherals on vulnerable macOS, FreeBSD and Linux systems [6]. Admission therefore shall be conditioned on attestation of the device identity and firmware, not on IOMMU configuration alone.

### GDPR mapping

| Article  | Obligation                              | Contribution                                                       |
|----------|-----------------------------------------|--------------------------------------------------------------------|
| 5(2)     | Accountability                          | Attestation allows compliance to be demonstrated cryptographically |
| 25       | Protection by design and by default     | Default remote storage encryption                                  |
| 32       | Security of processing                  | Per-tenant isolation and encrypted PCIe on the I/O path            |
| 32(1)(d) | Regular testing of security measures    | Continuous attestation with automatic removal from service         |
| 34       | Communication of a breach               | Data remains unintelligible along the whole I/O path               |

## Observations

- The hardware foundation ships on every card. VM sizes using the confidential device enter preview on Intel first and AMD afterwards. ARM-based families will also ship on this generation; confidential I/O on ARM shall not be assumed until available for a given size.
- Remote storage encryption by default has been signalled as this generation spreads across VM families. It shall be confirmed per SKU.
- Attestation evidence is of use to a controller only if retained in the controller's own records.
- Any fallback to a software or bounce-buffer path shall be reported when it occurs. A fast path that can degrade silently is not a control.
- Zero trust extends here from the network to the host and the I/O device: the card is trusted with data only after proving its identity, and data is not copied beyond where it must go. Under GDPR, this moves secure I/O from contractual assurance towards verifiable evidence, conditional on the checks above being run per workload and the attestation being retained.

*This is an opinion on the engineering, not legal advice.*

## References

[1] D. Li, Z. Mi, C. Ji, Y. Tan, B. Zang, H. Guan and H. Chen. Bifrost: Analysis and Optimization of Network I/O Tax in Confidential Virtual Machines. In *2023 USENIX Annual Technical Conference (USENIX ATC 23)*, 2023. [USENIX proceedings](https://www.usenix.org/conference/atc23/presentation/li-dingji)

[2] M. Misono, D. Stavrakakis, N. Santos and P. Bhatotia. Confidential VMs Explained: An Empirical Analysis of AMD SEV-SNP and Intel TDX. *Proceedings of the ACM on Measurement and Analysis of Computing Systems* 8 (3), Article 36, 2024. [DOI 10.1145/3700418](https://doi.org/10.1145/3700418)

[3] H. Lefeuvre, D. Chisnall, M. Kogias and P. Olivier. Towards (Really) Safe and Fast Confidential I/O. In *Proceedings of the 19th Workshop on Hot Topics in Operating Systems (HotOS 2023)*, pp. 214-222, 2023. [DOI 10.1145/3593856.3595913](https://doi.org/10.1145/3593856.3595913)

[4] C. Cremers, A. Dax and A. Naska. Formal Analysis of SPDM: Security Protocol and Data Model version 1.2. In *32nd USENIX Security Symposium (USENIX Security 23)*, 2023. [USENIX proceedings](https://www.usenix.org/conference/usenixsecurity23/presentation/cremers-spdm)

[5] M. Li, S. Srivastava and M. Yan. Bridge the Future: High-Performance Networks in Confidential VMs without Trusted I/O devices. arXiv preprint, 2024. [arXiv:2403.03360](https://arxiv.org/abs/2403.03360)

[6] A. T. Markettos, C. Rothwell, B. F. Gutstein, A. Pearce, P. G. Neumann, S. W. Moore and R. N. M. Watson. Thunderclap: Exploring Vulnerabilities in Operating System IOMMU Protection via DMA from Untrustworthy Peripherals. In *Network and Distributed System Security Symposium (NDSS)*, 2019. [DOI 10.14722/ndss.2019.23194](https://doi.org/10.14722/ndss.2019.23194)
