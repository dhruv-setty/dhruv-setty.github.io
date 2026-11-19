export const SITE = {
  name: "Dhruv Setty",
  positioning: "IT Support & Identity Administration",
  focus: "I design access controls across hybrid Entra ID and Active Directory, and back every one with evidence an auditor can test.",
  url: "https://dhruv-setty.github.io",
  description:
    "Dhruv Setty works in IT support and identity administration in New Zealand, across Microsoft Entra ID and Active Directory.",
  contact: [
    { label: "GitHub", text: "GitHub", href: "https://github.com/dhruv-setty", icon: "/icons/github.svg" },
    { label: "LinkedIn", text: "LinkedIn", href: "https://www.linkedin.com/in/dhruv-setty-nz", icon: "/icons/linkedin.png" },
    { label: "Stack Overflow", text: "Stack Overflow", href: "https://stackoverflow.com/users/33327882/dhruvsetty", icon: "/icons/stackoverflow.svg" },
    { label: "Substack", text: "Substack", href: "https://substack.com/@dhruvsetty", icon: "/icons/substack.svg" },
    { label: "Kaggle", text: "Kaggle", href: "https://www.kaggle.com/dhruvsetty", icon: "/icons/kaggle.svg" },
    { label: "Hugging Face", text: "Hugging Face", href: "https://huggingface.co/itsdhruvsetty", icon: "/icons/huggingface.svg" },
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

export type Project = {
  slug: string;
  name: string;
  tag: string;
  summary: string;
  points?: readonly string[];
  stack?: readonly string[];
  image: { src: string; alt: string; width: number; height: number };
  href: string;
};

// Projects on Home. Each of the first five is drawn from its repository README, with one
// figure taken from that README (padded to 16:9, otherwise unedited).
export const PROJECTS: readonly Project[] = [
  {
    slug: "entra-sssd",
    name: "Entra ID sign in for Debian with SSSD",
    tag: "IAM",
    summary:
      "A C# (.NET 8) command line tool, `iato`, that configures Debian hosts to authenticate Microsoft Entra ID users through the SSSD `idp` provider.",
    points: [
      "Creates the Entra ID app registration through Microsoft Graph with application `User.Read.All` and `GroupMember.Read.All`, and grants admin consent.",
      "Renders `sssd.conf` for the `idp` domain; users sign in with the OAuth 2.0 Device Authorization Grant, so MFA and Conditional Access apply.",
      "Checks the configuration and the host before SSSD starts: SSSD 2.11.0 or later, `libsss_idp.so` present and file mode 0600.",
      "10 of 10 xUnit tests pass in CI, and the host check passes against SSSD 2.13.1 in Debian forky.",
    ],
    image: {
      src: "/projects/entra-sssd.png",
      alt: "Terminal output of dotnet test listing the SssdConfigTests cases as passed, ending with Total tests: 10 and Passed: 10",
      width: 1200,
      height: 675,
    },
    href: "https://github.com/dhruv-setty/Intent-Auditable-Trust-Object-V2",
  },
  {
    slug: "iiq-legacy-fs",
    name: "Identity governance for legacy Linux file shares",
    tag: "IGA",
    summary:
      "A SailPoint IdentityIQ project that brings POSIX permissions, ACLs and NFSv3 exports on legacy file servers under request, approval and certification. The configuration has not yet been imported into a running IdentityIQ instance.",
    points: [
      "Ordered, idempotent change plan with revocations first; planning again against the result yields an empty plan.",
      "Effective access computed from POSIX modes, POSIX.1e ACLs, group nesting and NFSv3 export options.",
      "Certification evidence classifies each account and path as match, excess, missing or divergent, with hygiene findings such as dangling ACL entries.",
      "115 tests pass under Maven verify, including build checks over the IdentityIQ XML and the JBoss EAP 7.4 material.",
    ],
    image: {
      src: "/projects/iiq-legacy-fs.png",
      alt: "Terminal summary of mvn verify: Surefire test counts for fsgov-core and fsgov-config-validation with no failures, errors or skips, and BUILD SUCCESS",
      width: 956,
      height: 538,
    },
    href: "https://github.com/dhruv-setty/Intent-Auditable-Trust-Object-V3",
  },
  {
    slug: "iato-pcie-dma-tlb",
    name: "PCIe, DMA and TLB hardware with formal checks",
    tag: "Hardware",
    summary:
      "RTL for a PCIe device front end, a descriptor ring DMA engine and a TLB, each paired with a written specification and checked in simulation and open tool synthesis.",
    points: [
      "PCIe TLP header decode for 3DW and 4DW requests and completions, and a Type 0 configuration space with BAR sizing.",
      "DMA engine driven by a C driver under Verilator, with every copy in the sweep verified byte for byte.",
      "Fully associative TLB with fill and invalidate, and a TLA+ shootdown model in which no core keeps a translation to a freed frame.",
      "Yosys schematics, Icarus Verilog testbenches with GTKWave waveforms, Verilator lint and nextpnr on a Lattice ECP5.",
    ],
    image: {
      src: "/projects/iato-pcie-dma-tlb.png",
      alt: "GTKWave view of the tb_tlp_hdr_decode testbench: one PCIe TLP header per step with the decoded type flags, length, attributes, requester ID, tag and address, and the errors signal at 0",
      width: 1200,
      height: 675,
    },
    href: "https://github.com/dhruv-setty/Intent-Auditable-Trust-Object",
  },
  {
    slug: "stage2-tlb",
    name: "Stage 2 translation and TLB maintenance",
    tag: "Formal",
    summary:
      "Stage 2 address translation and TLB maintenance for a hypervisor at `EL2`, specified in Sail and TLA+ and implemented in SystemVerilog.",
    points: [
      "TLA+ model of the unmap sequence: the required order holds over 74 states under TLC, and both incorrect orderings violate `NoUseAfterFree`.",
      "Stage 2 walker for a 4 KiB granule and 48 bit IPA, with 0 mismatches against the Sail reference across 10,000 random probes.",
      "TLB tagged by VMID and ASID with four broadcast TLBI scopes, checked by 8 Sail assertions and 13 directed RTL checks.",
      "Yosys and nextpnr synthesis on a Lattice ECP5, with both modules clean under Verilator lint.",
    ],
    image: {
      src: "/projects/stage2-tlb.png",
      alt: "Terminal output of TLC on S2Unmap.cfg: model checking completed with no error, 435 states generated, 74 distinct states found, depth 8",
      width: 950,
      height: 534,
    },
    href: "https://github.com/dhruv-setty/Intent-Auditable-Trust-Object-V7",
  },
  {
    slug: "spde-gmrf",
    name: "Split SPDE-GMRF inference for lane perception",
    tag: "HPC",
    summary:
      "Estimates a sparse SPDE Gaussian field on the host and runs an int8 forward filter over four driver behaviour regimes on a `Cortex-M4F`.",
    points: [
      "Python reference for FEM assembly, sparse Cholesky and the projector, with 20 pytest tests; reverse Cuthill-McKee cuts factor nonzeros from 45,258 to 11,378.",
      "Int8 filter at 40 MACs per sample in 1,802 bytes of flash; the CMSIS-NN backend is bit-exact against the Python reference under QEMU.",
      "A CUDA path with cuSPARSE and cuDSS compiles with nvcc 12.9 and has not yet been run.",
      "Lean 4 proof sketch of the structural claims, with CARLA dashcam clips bundled as sample input.",
    ],
    image: {
      src: "/projects/spde-gmrf.png",
      alt: "Forward filter plot over 600 simulated samples: lateral offset and SDLP observations, the simulated regime against the int8 mode, and the float and int8 beliefs over calm, alert, high-stress and panic",
      width: 1200,
      height: 675,
    },
    href: "https://github.com/dhruv-setty/SPDE-GMRF",
  },
];
