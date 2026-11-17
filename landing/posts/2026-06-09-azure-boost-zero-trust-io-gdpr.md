---
title: "Azure Boost and the Zero-Trust I/O Path Under GDPR"
date: 2026-06-09
summary: How the next generation of Azure Boost moves storage and networking onto attested hardware, why removing bounce buffers matters for confidential data, and what must be verified before it counts as GDPR evidence.
---

## Motivation

Considerable effort goes into encrypting data at rest and in transit. The weaker point is usually between the two: the moment data leaves a virtual machine's memory and passes through the host on its way to storage or the network. In a zero-trust model that path is part of the attack surface, and under GDPR it is part of the processing the controller is responsible for securing.

The [next generation of Azure Boost](https://techcommunity.microsoft.com/blog/azurecompute/announcing-the-general-availability-of-the-next-generation-of-azure-boost/4519136), generally available since 7 May 2026, addresses that path directly.

## Objectives of this analysis

1. Describe how Azure Boost changes the I/O trust boundary.
2. Explain why the removal of bounce buffers matters for confidential workloads.
3. Map the design to GDPR obligations and identify what must be verified before relying on it.

## The platform

Azure Boost offloads virtualisation, networking and storage from the host onto dedicated hardware. The new generation is a PCIe card built around a single ASIC with three parts:

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
 |  | Arm SoC control plane: physically isolated from the customer |  |
 |  | VM and from the data path                                    |  |
 |  +--------------------------------------------------------------+  |
 |                                                                    |
 |  Root of trust: Cerberus (NIST SP 800-193), firmware attested      |
 +--------------------------------------------------------------------+
```

Cobalt 200 systems include the latest Boost capabilities. Against Cobalt 100, Microsoft reports 20% higher remote storage IOPS and 15% higher network bandwidth for Cobalt 200 VMs.

## How the design applies zero trust

| Principle                     | Implementation in Azure Boost                                                         |
|-------------------------------|----------------------------------------------------------------------------------------|
| Verify before trust           | Cerberus measures and attests firmware; the card does not start if measurement fails  |
| Verify continuously           | Azure Attestation Service re-checks devices; failing devices leave service automatically |
| Separate control from data    | The Arm SoC manages the card without access to customer data                          |
| Isolate tenants               | Per-tenant cryptographic separation on the data path                                 |
| Minimise privileged software  | The host runs a smaller, hardened stack; critical components are memory safe          |

## The bounce-buffer problem

In current confidential computing, a VM's memory is encrypted with a key that devices cannot access. Every I/O operation must therefore be copied into a shared bounce buffer before a network card or storage controller can use it.

```
 Today (confidential VM)
   private memory --decrypt/copy--> shared bounce buffer --> device --> network / storage
                                    (outside protected memory)

 Azure Boost Confidential Device
   private memory ==IDE-encrypted PCIe==> attested device (TDISP) --> network / storage
                    (no staging copy)
```

The bounce buffer costs an extra copy and an extra encryption cycle on every operation, and it creates a staging area outside the VM's protected memory. With the Boost Confidential Device, a confidential VM attests the Boost hardware and firmware using TDISP, a PCI-SIG standard, and then permits the attested device to read encrypted VM memory directly over IDE-encrypted PCIe links. Only the attested ASIC, FPGA and real-time firmware are inside the trust boundary; the Arm SoC remains outside it. Microsoft reports that attested offloads perform at near parity with general-purpose VMs.

## Assumptions and conditions

- The hardware foundation ships on every card. VM sizes that use the confidential device enter preview on Intel first and AMD afterwards. Arm-based families will also ship on this generation, but confidential I/O on Arm should not be assumed until it is available for a given size.
- Remote storage encryption by default has been signalled as this generation spreads across VM families. It must be confirmed per SKU.
- Attestation evidence is only useful to a controller if it can be retained in the controller's own records.

## Mapping to GDPR

| Article  | Obligation                              | Contribution                                                      |
|----------|-----------------------------------------|-------------------------------------------------------------------|
| 5(2)     | Accountability                          | Attestation allows compliance to be demonstrated cryptographically |
| 25       | Protection by design and by default     | Default remote storage encryption                                 |
| 32       | Security of processing                  | Per-tenant isolation and encrypted PCIe on the I/O path          |
| 32(1)(d) | Regular testing of security measures    | Continuous attestation with automatic removal from service       |
| 34       | Communication of a breach               | Data remains unintelligible along the whole I/O path             |

## Verification checklist

- Which VM sizes run on the new Boost generation, and which confidential I/O features they expose today.
- Whether remote storage encryption is enabled by default for the specific SKU in use.
- Whether attestation evidence can be exported into the controller's records.
- Whether any fallback to a software or bounce-buffer path is reported when it occurs.

## Outcome

Zero trust originally meant not trusting the network. Azure Boost extends it to the host and to the I/O device itself: the card is trusted with data only after it proves its identity, and data is not copied anywhere it does not need to go. Under GDPR, that moves secure I/O from a contractual assurance to verifiable evidence.

*This is a technical analysis, not legal advice.*
