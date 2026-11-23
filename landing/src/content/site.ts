export const SITE = {
  name: "Dhruv Setty",
  positioning: "IT Support & Identity Administration",
  focus: "I design access controls across hybrid Entra ID and Active Directory, and back every one with evidence an auditor can test.",
  url: "https://dhruv-setty.github.io",
  description:
    "Dhruv Setty works in IT support and identity administration in New Zealand, across Microsoft Entra ID and Active Directory.",
  contact: [
    { label: "GitHub", text: "GitHub", href: "https://github.com/dhruv-setty", icon: "/icons/github.svg" },
    { label: "LinkedIn", text: "LinkedIn", href: "https://www.linkedin.com/in/dhruv--setty", icon: "/icons/linkedin.svg" },
    { label: "Substack", text: "Substack", href: "https://substack.com/@dhruvsetty", icon: "/icons/substack.svg" },
  ],
  location: "",
  // Cloudflare Worker that relays the contact form to Resend. Empty disables sending.
  contactEndpoint: "https://dhruv-contact.itsdhruvsetty.workers.dev/",
  photo: { src: "/dhruv.webp", alt: "Dhruv Setty", width: 400, height: 400 },
  // Resume PDF hosted on the site. Empty hides the link.
  resume: "/Dhruv_Setty_Resume.pdf",
  // Supabase Realtime for the avatar stack. Publishable key only; empty hides other readers.
  supabaseUrl: "https://gsluekbphbusnaguqeol.supabase.co",
  supabaseKey: "sb_publishable_LfQ_ECqRy0NFRcYTvarw5A_lrAdimGS",
  // Cloudflare Worker that relays avatar questions to Claude. Empty uses the scripted Q&A.
  avatarEndpoint: "https://dhruv-avatar.itsdhruvsetty.workers.dev/",
  // Buy Me a Coffee or Ko-fi page. Empty hides the button.
  coffee: "",
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

export type Project = {
  slug: string;
  name: string;
  tag: string;
  summary: string;
  points?: readonly string[];
  stack?: readonly string[];
  // Designed 16:9 tile (make_covers.py), shown as the preview thumbnail on Home.
  cover: string;
  href: string;
  // Private repository: title is not a link and the meta line says so.
  private?: boolean;
  extra?: { label: string; href: string }[];
  // Shown in place of the destination line on Home: each label links to its own page.
  meta?: { label: string; href: string }[];
};

// Projects on Home, each shown as a Journal-style preview that opens its href. Copy is drawn
// from each repository README; `points` and `extra` are kept as source copy, not shown on Home.
export const PROJECTS: readonly Project[] = [
  {
    slug: "entra-sssd",
    name: "Entra ID sign in for Debian with SSSD",
    tag: "IAM",
    summary:
      "A C# (.NET 8) command line tool that configures Debian hosts to authenticate Microsoft Entra ID users through the SSSD idp provider. Users sign in with the device code flow, with MFA and Conditional Access applied on every Linux sign-in.",
    points: [
      "Creates the Entra ID app registration through Microsoft Graph with application `User.Read.All` and `GroupMember.Read.All`, and grants admin consent.",
      "Renders `sssd.conf` for the `idp` domain; users sign in with the OAuth 2.0 Device Authorization Grant, so MFA and Conditional Access apply.",
      "Checks the configuration and the host before SSSD starts: SSSD 2.11.0 or later, `libsss_idp.so` present and file mode 0600.",
      "10 of 10 xUnit tests pass in CI, and the host check passes against SSSD 2.13.1 in Debian forky.",
    ],
    cover: "/journal/covers/project-entra-sssd.webp",
    href: "https://github.com/dhruv-setty/entra-id-sign-in-for-debian-with-sssd",
  },
  {
    slug: "bau-toolkit",
    name: "Single sign-on toolkit for Linux",
    tag: "BAU",
    summary:
      "Shell and Bash scripts I use day to day to configure single sign-on on Linux hosts and check who has access. Every change is tested on local VMs and in Docker before use, and recorded in a changelog.",
    cover: "/journal/covers/project-bau-toolkit.webp",
    href: "",
    private: true,
  },
  {
    slug: "bau-lab",
    name: "IT support home lab",
    tag: "Homelab",
    summary:
      "A home lab for everyday IT support tickets: Microsoft 365 joiners and leavers, Active Directory lockouts and Group Policy, and Intune enrolment and compliance. Each fix is written up as a runbook, with a CVSS analysis of CVE-2022-1388 in F5 BIG-IP.",
    cover: "/journal/covers/project-bau-lab.webp",
    href: "",
    private: true,
  },
  {
    slug: "iiq-legacy-fs",
    name: "Identity governance for legacy Linux file shares",
    tag: "IGA",
    summary:
      "A SailPoint IdentityIQ project that brings POSIX permissions, ACLs and NFSv3 exports on legacy file servers under request, approval and certification. Certification marks every account and path as match, excess, missing or divergent.",
    points: [
      "Ordered, idempotent change plan with revocations first; planning again against the result yields an empty plan.",
      "Effective access computed from POSIX modes, POSIX.1e ACLs, group nesting and NFSv3 export options.",
      "Certification evidence classifies each account and path as match, excess, missing or divergent, with hygiene findings such as dangling ACL entries.",
      "115 tests pass under Maven verify, including build checks over the IdentityIQ XML and the JBoss EAP 7.4 material.",
    ],
    cover: "/journal/covers/project-legacy-fs.webp",
    href: "https://github.com/dhruv-setty/identity-governance-for-legacy-linux-file-shares",
  },
  {
    slug: "pcie-dma-tlb",
    name: "PCIe, DMA and TLB hardware with formal checks",
    tag: "Hardware",
    summary:
      "RTL for a PCIe device front end, a descriptor ring DMA engine and a TLB, each with a written specification and synthesised on a Lattice ECP5 FPGA. A TLA+ shootdown model shows no core keeps a translation to a freed frame.",
    points: [
      "PCIe TLP header decode for 3DW and 4DW requests and completions, and a Type 0 configuration space with BAR sizing.",
      "DMA engine driven by a C driver under Verilator, with every copy in the sweep verified byte for byte.",
      "Fully associative TLB with fill and invalidate, and a TLA+ shootdown model in which no core keeps a translation to a freed frame.",
      "Yosys schematics, Icarus Verilog testbenches with GTKWave waveforms, Verilator lint and nextpnr on a Lattice ECP5.",
    ],
    cover: "/journal/covers/project-pcie-dma-tlb.webp",
    href: "https://github.com/dhruv-setty/pcie-dma-and-tlb-hardware-with-formal-checks",
  },
  {
    slug: "stage2-tlb",
    name: "Stage 2 translation and TLB maintenance",
    tag: "Formal",
    summary:
      "Stage 2 address translation and TLB maintenance for an ARM hypervisor at EL2, specified in Sail and TLA+ and built in SystemVerilog. TLC confirms the required unmap order and shows both alternatives lead to use-after-free.",
    points: [
      "TLA+ model of the unmap sequence: the required order holds over 74 states under TLC, and both incorrect orderings violate `NoUseAfterFree`.",
      "Stage 2 walker for a 4 KiB granule and 48 bit IPA, with 0 mismatches against the Sail reference across 10,000 random probes.",
      "TLB tagged by VMID and ASID with four broadcast TLBI scopes, checked by 8 Sail assertions and 13 directed RTL checks.",
      "Yosys and nextpnr synthesis on a Lattice ECP5, with both modules clean under Verilator lint.",
    ],
    cover: "/journal/covers/project-stage2-tlb.webp",
    href: "https://github.com/dhruv-setty/stage-2-translation-and-tlb-maintenance",
  },
  {
    slug: "spde-gmrf",
    name: "Driver-state detection from lane keeping on a microcontroller",
    tag: "Embedded",
    summary:
      "Classifies driver state from lane position on a Cortex-M4F in 40 multiply-accumulates per sample and 1,802 bytes of flash. A host fits the route model, and reordering its sparse solve cuts stored values from 45,258 to 11,378. Simulated data.",
    points: [
      "Int8 classifier at 40 multiply-accumulates per sample in 1,802 bytes of flash; matches the full-precision version on 99.66% of 5,000 simulated samples.",
      "Holds up under noise: at twice the sensor noise both versions fall to about 80% accuracy and stay within 0.04 points of each other.",
      "Catches 151 of 157 simulated panic episodes, typically on the first sample, with a 0.64% false-alarm rate.",
      "Route model fitted on the host from 200 sensors; reordering the sparse solve cuts stored values from 45,258 to 11,378. CUDA path compiles and has not been run on a GPU.",
    ],
    cover: "/journal/covers/project-driver-state.webp",
    href: "/blog/lifting-spde-gmrf-gpu-edge/",
    meta: [
      { label: "Dataset", href: "https://huggingface.co/datasets/itsdhruvsetty/spde-gmrf-lane-perception-vectors" },
      { label: "Model", href: "https://huggingface.co/itsdhruvsetty/spde-gmrf-lane-perception" },
    ],
    extra: [
      { label: "Live demo", href: "https://huggingface.co/spaces/itsdhruvsetty/split-spde-gmrf-lane-perception" },
      { label: "Code", href: "https://github.com/dhruv-setty/split-spde-gmrf-inference-for-lane-perception" },
    ],
  },
];
