---
title: "What Has to Remain True: Formalising AArch64 Virtualisation in Lean 4"
date: 2026-01-13
summary: The motivation, research questions, assumptions and findings of a Lean 4 study of EL2, Stage-2 translation and the KVM vCPU lifecycle on Arm Neoverse servers, and the limits of what a proof certifies.
---

## Motivation

Much of my work addresses a single question: what must remain true when nobody is observing? In identity, the answer is that only the right people hold access. In a hypervisor, it is that a guest can reach only the memory it has been given, and that a virtual CPU runs only once it has been correctly configured.

This study, part of my Correctness Framework for Heterogeneous Accelerator Architectures, applies that question to AArch64 virtual machines on Cobalt-class Arm servers: Azure Cobalt 100 and 200, built on the Arm Neoverse N2 and V3 families. A proposed execution model was reviewed against primary sources, and its key results were formalised in Lean 4.

## Research questions

1. Does the chosen EL2 (hypervisor) profile give an EL1 guest a coherent trap and execution regime?
2. Do the Stage-2 translation registers, VMIDs and TLB maintenance support the isolation boundary being claimed?
3. Is the proposed KVM/arm64 vCPU state machine legal, including SVE configuration and migration?
4. Which claims are architectural, which are Linux ABI obligations, and which depend on the specific host?
5. Can every accepted claim be recorded as an auditable trust object, with its source, scope, observation and test evidence?

The sources were those that settle disputes: the Arm Architecture Reference Manual (DDI0487K), the Armv9-A supplement (DDI0608A), the Neoverse N2 and V3 technical manuals, the Linux KVM API documentation and QEMU's target/arm implementation.

## Assumptions

The formal core rests on four declared assumptions:

- transitions respect observational equivalence;
- the observation ordering is a preorder;
- embedding a state does not change what is observed;
- migrating a state does not change what is observed.

The study also separates three kinds of premise, because they are established in different ways:

```
 +---------------------------+   checked by   +-------------------------------+
 | Kernel propositions       | -------------> | Lean kernel                   |
 +---------------------------+                +-------------------------------+
 | Specification premises    | -------------> | Arm and KVM documents         |
 +---------------------------+                +-------------------------------+
 | Measured premises         | -------------> | A real host: ID registers,    |
 | (IPA width, SVE lengths,  |                | firmware, SKU                 |
 |  features, firmware)      |                |                               |
 +---------------------------+                +-------------------------------+
```

## Method

### Observational equivalence

Two machine states are equivalent if they are indistinguishable to an outside observer. A state refines another if its observation sits below the other's in the ordering. From the four assumptions the proofs derive that equivalent states take matching steps to equivalent states, that refinement is a proper preorder, and that embedding and migration remain within the equivalence class of the original state. Expressed plainly: if moving a VM does not change what can be observed, the moved VM is, for every relevant purpose, the same VM. The proof also derives the reverse direction from the symmetry of equality rather than leaving it informal.

### Stage-2 permissions

An access is permitted only if both Stage-1 (the guest's translation) and Stage-2 (the hypervisor's) permit it.

```
 guest VA --[Stage-1: guest tables]--> IPA --[Stage-2: hypervisor tables, VMID]--> PA

 allowed(access) = stage1_allows(access) AND stage2_allows(access)

 theorem stage2_denial_dominates:  stage2 denies  ==>  access denied, whatever Stage-1 says
```

### The EL2 profile

The proposed model required HCR_EL2.TGE=0 in every configuration. The proof shows this holds for the chosen non-VHE profile, and a counter-model shows it is not universal: a VHE configuration with TGE=1 is also valid.

### The vCPU lifecycle

```
 created --> configured --(KVM_ARM_VCPU_FINALIZE)--> finalised --(KVM_RUN)--> running

 configured --(KVM_RUN)--> running     no legal step
 migration restore                     lands in finalised
 SVE vector lengths                    selectable while configured, locked once finalised
```

The model proves there is no legal transition from configured directly to running, that the vector-length selection cannot change after finalisation, and that a successful migration restore returns to a finalised state.

## Findings

The model was assessed as conditionally conformant after correction.

| Type          | Finding                                                                                   |
|---------------|-------------------------------------------------------------------------------------------|
| Correction    | Cobalt 100 is Neoverse N2 and Armv9.0-A, not Armv8.5-A                                    |
| Correction    | The vCPU state machine requires an explicit finalised state before the first KVM_RUN     |
| Precision     | Setting SVE vector lengths selects them; KVM_ARM_VCPU_FINALIZE locks them                 |
| Precision     | TGE=0 belongs to the non-VHE profile, not to every configuration                          |
| Gap           | Cobalt 200 feature exposure; VMID and TLB invalidation under reuse and migration         |
| Gap           | Stage-2 memory types against the real device map; side-channel mitigations per host      |

## Limitations

Lean proves the consequences of the declared model. It does not certify a particular Azure host, kernel, QEMU build or firmware image. A proof can reject an invalid deduction, but only hardware and ABI tests can show that a real system matches the model. In addition, the environment in which the study was produced had no Lean executable. The proof source contains no `sorry`, `axiom` or `admit`, but the final kernel check is recorded as a required gate rather than claimed as complete. The disposition is "Formalised; kernel check and platform evidence pending."

## Outcomes and next steps

- Product names are not evidence. "Cobalt" covers two different cores with different features, and the reliable answer comes from the host's own ID registers.
- Small models are reviewable. A proof that a reviewer can read in one sitting is more valuable than a larger one that nobody checks.
- Unproven claims are recorded with an owner, not concealed behind confident wording.

The next steps are to run the Lean check in continuous integration, add negative lifecycle tests, collect SKU-level evidence from real N2 and V3 hosts, and carry the Stage-2 boundary forward into an executable reference model and a hardware implementation that can be compared against it. The [full study](https://www.dropbox.com/scl/fi/nfrnwf5lten7b74ud1fbn/A64-CBLT-STUDY-001-eca7fe16806a.pdf?rlkey=rl6pegel190x12yx8mhkpbn7s&st=kjv0iqll&dl=0) contains the proofs and the evidence register.
