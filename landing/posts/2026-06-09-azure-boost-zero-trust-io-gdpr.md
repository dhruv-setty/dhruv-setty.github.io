---
title: "Azure Boost and the Zero-Trust I/O Path Under GDPR"
date: 2026-06-09
summary: My view on the next generation of Azure Boost. The I/O path between a virtual machine and its storage or network is where confidential data is weakest, attested devices and the removal of bounce buffers address it directly, and none of it counts as GDPR evidence until it is confirmed per VM size and the attestation can be kept.
---

## The weak point, as I see it

This post sets out my view of the engineering of the I/O path. It is an opinion, not a measurement. Considerable effort goes into encrypting data at rest and in transit. In my view the weaker point is usually between the two: the moment data leaves a virtual machine's memory and passes through the host on its way to storage or the network. In a zero-trust model that path is part of the attack surface, and under GDPR it is part of the processing the controller is responsible for securing. The [next generation of Azure Boost](https://techcommunity.microsoft.com/blog/azurecompute/announcing-the-general-availability-of-the-next-generation-of-azure-boost/4519136), generally available since 7 May 2026, is aimed at exactly that path, which is why I think it deserves an engineering reading rather than a product one.

## The hardware, reduced to its trust boundaries

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

The part of this diagram I find most significant is the separation of the Arm SoC control plane from the data path. A component that manages the card but cannot see customer data is a component whose compromise is bounded, and that is the property I would design for first.

Cobalt 200 systems include the latest Boost capabilities. Against Cobalt 100, Microsoft reports 20% higher remote storage IOPS and 15% higher network bandwidth for Cobalt 200 VMs.

## Zero trust principles, read as engineering controls

This is how I map the design to zero-trust principles. Each row is a control that can, in principle, be tested:

| Principle                     | Implementation in Azure Boost                                                            |
|-------------------------------|------------------------------------------------------------------------------------------|
| Verify before trust           | Cerberus measures and attests firmware; the card does not start if measurement fails     |
| Verify continuously           | Azure Attestation Service re-checks devices; failing devices leave service automatically |
| Separate control from data    | The Arm SoC manages the card without access to customer data                             |
| Isolate tenants               | Per-tenant cryptographic separation on the data path                                     |
| Minimise privileged software  | The host runs a smaller, hardened stack; critical components are memory safe             |

## Why I think the bounce buffer is the real story

In current confidential computing, a VM's memory is encrypted with a key that devices cannot access. Every I/O operation must therefore be copied into a shared bounce buffer before a network card or storage controller can use it.

```
 Today (confidential VM)
   private memory --decrypt/copy--> shared bounce buffer --> device --> network / storage
                                    (outside protected memory)

 Azure Boost Confidential Device
   private memory ==IDE-encrypted PCIe==> attested device (TDISP) --> network / storage
                    (no staging copy)
```

The bounce buffer costs an extra copy and an extra encryption cycle on every operation, and it creates a staging area outside the VM's protected memory. From a data path perspective I regard that staging area as the more serious problem of the two: it is a place where data is held in a form the confidential VM no longer protects, on every I/O.

With the Boost Confidential Device, a confidential VM attests the Boost hardware and firmware using TDISP, a PCI-SIG standard, and then permits the attested device to read encrypted VM memory directly over IDE-encrypted PCIe links. Only the attested ASIC, FPGA and real-time firmware are inside the trust boundary; the Arm SoC remains outside it. Microsoft reports that attested offloads perform at near parity with general-purpose VMs. My reading is that this removes the copy rather than securing it, which is the better engineering outcome.

## What I would verify before relying on it

- The hardware foundation ships on every card. VM sizes that use the confidential device enter preview on Intel first and AMD afterwards. Arm-based families will also ship on this generation, but I would not assume confidential I/O on Arm until it is available for a given size.
- Remote storage encryption by default has been signalled as this generation spreads across VM families. I would confirm it per SKU.
- Attestation evidence is only useful to a controller if it can be retained in the controller's own records.
- Any fallback to a software or bounce-buffer path should be reported when it occurs. A fast path that can silently degrade is not a control.

## How I map it to GDPR

| Article  | Obligation                              | Contribution                                                       |
|----------|-----------------------------------------|--------------------------------------------------------------------|
| 5(2)     | Accountability                          | Attestation allows compliance to be demonstrated cryptographically |
| 25       | Protection by design and by default     | Default remote storage encryption                                  |
| 32       | Security of processing                  | Per-tenant isolation and encrypted PCIe on the I/O path            |
| 32(1)(d) | Regular testing of security measures    | Continuous attestation with automatic removal from service         |
| 34       | Communication of a breach               | Data remains unintelligible along the whole I/O path               |

## Where I land

Zero trust originally meant not trusting the network. In my view Azure Boost extends it to the host and to the I/O device itself: the card is trusted with data only after it proves its identity, and data is not copied anywhere it does not need to go. Under GDPR, I think that moves secure I/O from a contractual assurance towards verifiable evidence, provided the checks above are run for the workload in question and the attestation is kept.

*This is an opinion on the engineering, not legal advice.*
