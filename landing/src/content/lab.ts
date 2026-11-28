// Service desk home lab work samples, shown as icon cards on Home.
// Each card opens the full-size postcard (public/lab/*.png). Copy follows the bau-home-lab README.
export const LAB = {
  title: "Service Desk Home Lab",
  intro: "Everyday service desk tasks, practised on a Samba Active Directory test domain and written up as runbooks. Lab only, not a production environment.",
  href: "https://github.com/dhruv-setty/bau-home-lab",
  linkText: "View the lab on GitHub",
};

export type LabIcon = "directory" | "joiner" | "leaver" | "audit" | "endpoint";
export type LabItem = { slug: string; title: string; summary: string; icon: LabIcon; cover: string; png: string };

export const LAB_ITEMS: readonly LabItem[] = [
  {
    slug: "directory-services-baseline",
    title: "Directory setup",
    summary: "Organisational units and role-based security groups for Sales and Finance, ready for day-one access.",
    icon: "directory",
    cover: "/lab/postcard-01-domain-setup.webp",
    png: "/lab/postcard-01-domain-setup.png",
  },
  {
    slug: "joiner-mover-provisioning",
    title: "Joiner and mover",
    summary: "Two new starters given the same baseline, then one moved from Sales to Finance. Old access removed before new access added.",
    icon: "joiner",
    cover: "/lab/postcard-02-joiner-mover.webp",
    png: "/lab/postcard-02-joiner-mover.png",
  },
  {
    slug: "leaver-offboarding-credential-reset",
    title: "Leaver and password reset",
    summary: "Account disabled, groups removed and moved to the Leavers OU. Temporary password with a forced change at next sign-in.",
    icon: "leaver",
    cover: "/lab/postcard-03-leaver-reset.webp",
    png: "/lab/postcard-03-leaver-reset.png",
  },
  {
    slug: "access-verification-audit-log",
    title: "Access check and audit log",
    summary: "Account state, group membership and the change log checked after every action, so each ticket closes with evidence.",
    icon: "audit",
    cover: "/lab/postcard-04-report.webp",
    png: "/lab/postcard-04-report.png",
  },
  {
    slug: "intune-endpoint-policies",
    title: "Intune device policies",
    summary: "Windows compliance and device restriction policies in Microsoft Graph format, covering BitLocker, Secure Boot, TPM and Defender.",
    icon: "endpoint",
    cover: "/lab/postcard-06-intune-policies.webp",
    png: "/lab/postcard-06-intune-policies.png",
  },
];
