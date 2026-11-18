export const SITE = {
  name: "Dhruv Setty",
  positioning: "IAM Practitioner. IGA and IAM control assurance.",
  focus: "I build access controls across hybrid Entra ID and Active Directory, with evidence an auditor can check.",
  url: "https://whatheheckisthis.github.io",
  description:
    "Dhruv Setty is an IAM practitioner in New Zealand working in identity governance and access management across Microsoft Entra ID and Active Directory.",
  contact: [
    { label: "GitHub", text: "GitHub", href: "https://github.com/whatheheckisthis", icon: "/icons/github.svg" },
    { label: "LinkedIn", text: "LinkedIn", href: "https://www.linkedin.com/in/its-dhruv-setty", icon: "/icons/linkedin.png" },
    { label: "Buy me a coffee", text: "Buy me a coffee", href: "https://buymeacoffee.com/dhruvsetty", icon: "/icons/bmc.svg" },
  ],
  location: "",
  // Cloudflare Worker that relays the contact form to Resend. Empty disables sending.
  contactEndpoint: "https://dhruv-contact.itsdhruvsetty.workers.dev/",
  photo: { src: "/dhruv.webp", alt: "Dhruv Setty", width: 400, height: 400 },
  // Dropbox shared link to the resume (opens Dropbox preview). Empty hides the link.
  resume: "https://www.dropbox.com/scl/fi/9sueshghjttlbs9xoei3j/Dhruv_Setty_Resume.pdf?rlkey=wvw71mzpaxlpa36zf4mhr5pu9&st=l9ptoclv&dl=0",
  // Supabase Realtime for the avatar stack. Publishable key only; empty hides other readers.
  supabaseUrl: "https://gsluekbphbusnaguqeol.supabase.co",
  supabaseKey: "sb_publishable_LfQ_ECqRy0NFRcYTvarw5A_lrAdimGS",
  // Buy Me a Coffee or Ko-fi page. Empty hides the button.
  coffee: "https://buymeacoffee.com/dhruvsetty",
  // Existing MkDocs pages, served from the same site. Plain links, not router links.
  docs: [
    { text: "Overview", href: "/overview/" },
    { text: "Architecture & Auth", href: "/architecture/" },
    { text: "CLI & Schema Reference", href: "/reference/" },
    { text: "Deployment & Hardening", href: "/deployment/" },
  ],
} as const;

export const FOCUS = [
  {
    title: "Identity governance",
    lead: "Access that follows the role, not the history.",
    body: "Joiner, mover and leaver workflows, periodic access certification and role-based access design, so entitlements are granted, adjusted and revoked as people change roles instead of accumulating over time.",
    refs: ["ISO 27001 A.5.16", "A.5.18"],
  },
  {
    title: "Access control assurance",
    lead: "Evidence first, conclusions second.",
    body: "Controls are tested against system evidence rather than assumption. Each finding is traced to its source, mapped to the requirement it tests and documented so an auditor can sample it and reach the same result.",
    refs: ["ISO 27001 A.5.15", "A.5.35"],
  },
  {
    title: "Hybrid identity",
    lead: "One directory model across cloud and on-premises.",
    body: "Entra ID and on-premises Active Directory governed as one hybrid directory, with every account and privileged role mapped in a controls crosswalk and every exception tracked in the risk register.",
    refs: ["ISO 27001 A.5.16", "A.8.2"],
  },
] as const;

export const FEATURED = {
  summary: "Entra ID sign in for Debian hosts through the SSSD `idp` provider, managed by `iato`, a self contained C# (.NET 8) command line tool. Users log in over SSH with the OAuth 2.0 Device Authorization Grant (RFC 8628), so MFA and Conditional Access apply at every login, and `access_provider = simple` limits access to one Entra group. POSIX UIDs and GIDs are derived from Entra object IDs, with no ID mapping kept by hand. `iato register-app` creates the app registration and admin consent through Microsoft Graph with only `User.Read.All` and `GroupMember.Read.All`; `iato check --host` validates the rendered `sssd.conf` against the installed SSSD before the service starts. Shipped as signed `.deb` packages for amd64 and arm64 with published checksums.",
  name: "Entra ID sign in for Debian with SSSD",
  thumb: { src: "/thumbs/thumb-sssd.png", alt: "SSH login on a Debian host through pam_sss and the SSSD idp provider, the device code and token endpoints of the Microsoft identity platform, sign in with MFA and Conditional Access on another device, and users and groups from Microsoft Graph" },
  fullName: "Intent-Auditable Trust Object V2",
  repo: "https://github.com/whatheheckisthis/Intent-Auditable-Trust-Object-V2",
  stack: ["Entra ID", "SSSD", "OAuth 2.0", "C#"],
  readmeText: "Learn More",
  status: "Released. Packages for amd64 and arm64.",
  readme: "https://github.com/whatheheckisthis/Intent-Auditable-Trust-Object-V2",
} as const;

// More projects, shown under the featured card. A link with an empty href is hidden.
export const PROJECTS = [
  {
    name: "Stage 2 translation and TLB maintenance",
    stack: ["Sail", "TLA+", "SystemVerilog", "Verilator"],
    thumb: { src: "/thumbs/thumb-stage2.png", alt: "Two-stage translation VA to IPA to PA with the Stage 2 table walk, a VMID tagged TLB, and the break-before-make TLBI unmap sequence" },
    tag: "Virtualisation",
    summary:
      "Part of my Correctness Framework for Heterogeneous Accelerator Architectures. Specifies, verifies and implements `Stage 2` address translation and TLB maintenance for a hypervisor at `EL2`, with a 4 KiB granule and 48 bit IPA. A Sail model is the reference for the table walk and its translation, access flag and permission faults. A TLA+ specification checks the unmap sequence across two cores, where both incorrect orderings break `NoUseAfterFree`. The SystemVerilog walker and the VMID and ASID tagged TLB match the reference across 10,000 random probes with no mismatches.",
    links: [{ text: "Learn More", href: "https://github.com/whatheheckisthis/Intent-to-Auditable-Trust-Object-v7" }],
  },
  {
    name: "AArch64 virtualisation study",
    stack: ["Lean 4", "KVM", "QEMU", "Arm Neoverse"],
    thumb: { src: "/thumbs/thumb-aarch64.png", alt: "AArch64 exception levels EL0 to EL3 with Stage 1 and Stage 2 translation, an accelerator behind SMMUv3, and observational equivalence between host and offloaded traces" },
    tag: "Virtualisation",
    summary:
      "Part of my Correctness Framework for Heterogeneous Accelerator Architectures. A 22 page formal review of `EL2` hypervisor configuration, `Stage 2` translation and the KVM vCPU lifecycle on Microsoft Cobalt 100 and 200, built on Arm Neoverse N2 and V3. The results are formalised in Lean 4: observational equivalence, refinement and migration preservation, Stage 2 denial dominance and the SVE finalisation gate. Each claim is checked against the Arm Architecture Reference Manual, Linux KVM and QEMU, then graded as a correction, a precision defect, conformant or a verification gap.",
    links: [
      { text: "Learn More", href: "https://www.dropbox.com/scl/fi/nfrnwf5lten7b74ud1fbn/A64-CBLT-STUDY-001-eca7fe16806a.pdf?rlkey=rl6pegel190x12yx8mhkpbn7s&st=kjv0iqll&dl=0" },
    ],
  },
  {
    name: "FPGA to GPU peer-to-peer pipeline",
    stack: ["PCIe", "DMA", "SMMUv3", "VFIO"],
    thumb: { src: "/thumbs/thumb-p2p.png", alt: "PCIe topology: host SoC with root complex and SMMUv3, a PCIe switch, and peer-to-peer TLPs from the FPGA endpoint to the GPU BAR1 aperture" },
    tag: "HPC",
    summary:
      "Part of my Correctness Framework for Heterogeneous Accelerator Architectures. Designed and evaluated low-latency FPGA GPU `PCIe P2P` memory access paths, optimising `DMA`, `IOMMU/SMMU` address translation, and cache coherence across heterogeneous interconnects.",
    links: [{ text: "Learn More", href: "https://www.dropbox.com/scl/fi/lrntb1t05v04yb1wz4ei8/CBLT-2-1cf710990566.pdf?rlkey=rp2c40yxcu7wo0m9yqnl13ckc&st=1x4jym61&dl=0" }],
  },
  {
    name: "Split SPDE-GMRF inference for lane perception",
    stack: ["cuDSS", "cuSPARSE", "CMSIS-NN", "Cortex-M4F"],
    thumb: { src: "/thumbs/thumb-spde.png", alt: "Host NVIDIA GPU assembles the sparse SPDE precision and factorises it with cuDSS; a sparse projector lifts the field estimate to sensor sites; an Arm Cortex-M4F runs the int8 forward filter each sample, with periodic re-estimation off the latency path" },
    tag: "HPC",
    summary:
      "Splits inference for lane perception between host and device. A GPU path built with `cuSPARSE` and `cuDSS` factorises the sparse SPDE precision to estimate the spatial field, and an int8 forward filter on `Cortex-M4F` tracks the driver's behavioural mode in 40 MACs per sample and 1,998 bytes of flash. Reordering cuts factor fill-in by about 74%, and the int8 filter matches the float reference on 99.66% of samples.",
    links: [{ text: "Learn More", href: "https://github.com/whatheheckisthis/android-opencv-lanedetection-master" }],
  },
] as const;

// ICT labs subsection on Home. Each card shows an architecture diagram of the lab.
export const LABS = [
  {
    tag: "IAM",
    name: "Cloud Identity Federation for Linux Workloads",
    summary:
      "Federates Debian Linux hosts with Microsoft Entra ID through SSSD, extending Conditional Access and MFA to every server login and removing local account sprawl.",
    points: [
      "Service principal provisioning via Microsoft Graph with least privilege permissions",
      "OAuth 2.0 Device Authorization Grant at the PAM layer",
      "Deterministic POSIX identity mapping and group based RBAC",
      "Signed packages through a CI/CD release pipeline",
    ],
    stack: ["Entra ID", "Microsoft Graph", "OAuth 2.0", "SSSD", "PAM", "C#"],
    preview: {
      src: "/thumbs/thumb-lab-federation.png",
      alt: "Architecture: a release pipeline builds signed Debian packages; Microsoft Graph provisions a least privilege service principal in Entra ID; Debian hosts sign in through SSSD and PAM with a device code token, with Conditional Access and MFA on every login and Entra groups mapped to POSIX IDs and RBAC",
    },
    href: "https://github.com/whatheheckisthis/Intent-Auditable-Trust-Object-V2",
  },
  {
    tag: "IGA",
    name: "Identity Governance for Legacy Unstructured Data",
    summary:
      "A SailPoint IdentityIQ solution that governs legacy Linux file shares across the Joiner, Mover, Leaver lifecycle, from access request to closed loop remediation.",
    points: [
      "HR authoritative source with correlation and identity refresh",
      "Entitlement catalogue, role model and approval workflow",
      "Segregation of Duties policy and access certification campaigns",
      "Attestation evidence that revoked access is removed on disk",
    ],
    stack: ["SailPoint IdentityIQ", "Java", "JBoss EAP", "POSIX ACLs", "NFS", "Azure Files"],
    preview: {
      src: "/thumbs/thumb-lab-governance.png",
      alt: "Architecture: HR and host inventory feed SailPoint IdentityIQ; the identity cube drives Joiner, Mover, Leaver, access request and approval, SoD and certification into a revoke before grant change plan; a host executor applies POSIX groups, ACLs and NFS exports, verified as attestation evidence and reaggregated",
    },
    href: "https://github.com/whatheheckisthis/Intent-Auditable-Trust-Object-V3",
  },
];
