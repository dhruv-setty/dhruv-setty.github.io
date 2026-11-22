// Link-preview cards for Dhruv's work, in the style of a LinkedIn featured article or a
// Substack embed. A Journal paragraph that holds only a link to one of these URLs (or to
// another Journal post) is rendered as a card instead of a bare link. Descriptions are
// taken from copy already on the site; thumbnails come from public/ and never use the
// profile photo. A target with no image of its own gets a neutral domain tile.

export interface LinkPreview {
  href: string;
  title: string;
  description: string;
  domain: string;
  image?: string; // a public/ path; omitted means a domain tile
}

export const WORK_LINKS: Record<string, Omit<LinkPreview, "href" | "domain">> = {
  "https://github.com/dhruv-setty/entra-id-sign-in-for-debian-with-sssd": {
    title: "Entra ID sign in for Debian with SSSD",
    description: "Configures Debian hosts to authenticate Microsoft Entra ID users through the SSSD idp provider.",
  },
  "https://github.com/dhruv-setty/identity-governance-for-legacy-linux-file-shares": {
    title: "Identity governance for legacy Linux file shares",
    description:
      "Brings POSIX permissions, ACLs and NFSv3 exports on legacy file servers under request, approval and certification.",
    image: "/projects/iiq-legacy-fs.png",
  },
  "https://github.com/dhruv-setty/split-spde-gmrf-inference-for-lane-perception": {
    title: "Driver-state detection from lane keeping on a microcontroller",
    description: "Classifies driver state from lane-position data on a Cortex-M4F, with route correction computed off-device.",
    image: "/projects/spde-gmrf.png",
  },
  "https://huggingface.co/spaces/itsdhruvsetty/split-spde-gmrf-lane-perception": {
    title: "Driver-state detection: live demo",
    description: "Steps through a simulated drive.",
    image: "/journal/lifting-spde-gmrf-gpu-edge/cover.png",
  },
  "https://huggingface.co/datasets/itsdhruvsetty/spde-gmrf-lane-perception-vectors": {
    title: "spde-gmrf-lane-perception-vectors",
    description: "Hugging Face dataset with the data for the route-model fit.",
  },
};

const TILE_ICONS: Record<string, string> = {
  "github.com": "/icons/github.svg",
  "huggingface.co": "/icons/huggingface.svg",
  "linkedin.com": "/icons/linkedin.svg",
  "substack.com": "/icons/substack.svg",
};

export function domainOf(href: string, siteHost = "dhruv-setty.github.io"): string {
  if (href.startsWith("/")) return siteHost;
  try {
    return new URL(href).hostname.replace(/^www\./, "");
  } catch {
    return href;
  }
}

export function tileIcon(domain: string): string {
  if (domain.endsWith("substack.com")) return TILE_ICONS["substack.com"]!;
  for (const [d, icon] of Object.entries(TILE_ICONS)) if (domain === d || domain.endsWith("." + d)) return icon;
  return "/favicon-512.png";
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function cardHtml(p: LinkPreview): string {
  const thumb = p.image
    ? `<span class="link-card__thumb"><img src="${esc(p.image)}" alt="" loading="lazy" decoding="async" /></span>`
    : `<span class="link-card__thumb link-card__thumb--tile"><img src="${esc(tileIcon(p.domain))}" alt="" loading="lazy" decoding="async" /></span>`;
  return (
    `<a class="link-card" href="${esc(p.href)}">${thumb}<span class="link-card__body">` +
    `<span class="link-card__title">${esc(p.title)}</span>` +
    `<span class="link-card__desc">${esc(p.description)}</span>` +
    `<span class="link-card__domain">${esc(p.domain)}</span></span></a>`
  );
}

const decode = (s: string) =>
  s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");

// Replaces each <p> that holds a single link to known work with a card, and groups runs
// of adjacent cards into one block. `lookup` resolves Journal post URLs.
export function cardify(html: string, lookup: (href: string) => LinkPreview | undefined): string {
  const out = html.replace(/<p><a href="([^"]+)"[^>]*>[^<]*<\/a><\/p>/g, (whole, rawHref: string) => {
    const href = decode(rawHref);
    const known = WORK_LINKS[href];
    const preview = known ? { href, domain: domainOf(href), ...known } : lookup(href);
    return preview ? cardHtml(preview) : whole;
  });
  return out.replace(/((?:<a class="link-card"[\s\S]*?<\/a>\s*)+)/g, (run) => `<div class="link-cards">${run.trim()}</div>\n`);
}
