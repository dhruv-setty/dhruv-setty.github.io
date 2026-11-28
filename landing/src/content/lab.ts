// Service desk home lab work samples, shown as framed cover cards on Home.
// Covers are the lab's postcards (public/lab/*.png, with WebP copies for the page);
// captions are the same copy used on Dhruv's Hark storefront page.
export const LAB = {
  title: "Service Desk Home Lab",
  intro: "Identity and endpoint work, built and documented in my home lab.",
  href: "https://github.com/dhruv-setty/bau-home-lab",
  linkText: "View the lab on GitHub",
};

export type LabItem = { slug: string; title: string; summary: string; cover: string; png: string };

export const LAB_ITEMS: readonly LabItem[] = [
  {
    slug: "directory-services-baseline",
    title: "Directory Services Baseline",
    summary: "Organisational units and role-based security groups provisioned on a Samba Active Directory test domain.",
    cover: "/lab/postcard-01-domain-setup.webp",
    png: "/lab/postcard-01-domain-setup.png",
  },
  {
    slug: "joiner-mover-provisioning",
    title: "Joiner and Mover Provisioning",
    summary: "New starter account created and access transferred from Sales to Finance under change tickets.",
    cover: "/lab/postcard-02-joiner-mover.webp",
    png: "/lab/postcard-02-joiner-mover.png",
  },
  {
    slug: "leaver-offboarding-credential-reset",
    title: "Leaver Offboarding and Credential Reset",
    summary: "Account disabled, access revoked, moved to the Leavers OU; temporary password with forced change at next sign-in.",
    cover: "/lab/postcard-03-leaver-reset.webp",
    png: "/lab/postcard-03-leaver-reset.png",
  },
  {
    slug: "access-verification-audit-log",
    title: "Access Verification and Audit Log",
    summary: "Account state, group membership and the change log checked after each action.",
    cover: "/lab/postcard-04-report.webp",
    png: "/lab/postcard-04-report.png",
  },
  {
    slug: "intune-endpoint-policies",
    title: "Intune Endpoint Policies",
    summary: "Compliance and device restriction policy definitions.",
    cover: "/lab/postcard-06-intune-policies.webp",
    png: "/lab/postcard-06-intune-policies.png",
  },
];
