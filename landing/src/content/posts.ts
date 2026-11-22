import { cardify, domainOf, type LinkPreview } from "./links";

export interface Post {
  slug: string;
  title: string;
  date: string; // YYYY-MM-DD
  summary: string;
  html: string;
  minutes: number; // estimated reading time
  medium?: string; // optional Medium URL (front matter `medium:`)
  substack?: string; // optional Substack URL (front matter `substack:`), shown as a preview card
  kicker?: string; // short topic label above the title (front matter `kicker:`)
  cover?: string; // designed 16:9 cover PNG (front matter `cover:`), shown at the top of the post
  coverAlt?: string;
  thumb?: string; // list and card thumbnail: front matter `thumb:`, else the cover's WebP, else the first figure
}

interface Compiled {
  data: Record<string, string>;
  html: string;
}

// Compiled at build time by the markdown-posts plugin in vite.config.ts.
const files = import.meta.glob<Compiled>("../../posts/*.md", { import: "default", eager: true });

function toPost(path: string, { data, html }: Compiled): Post {
  const slug = (path.split("/").pop() ?? "").replace(/\.md$/, "").replace(/^\d{4}-\d{2}-\d{2}-/, "");
  const { title, date, summary, medium, substack, thumb, cover, kicker } = data;
  if (!title || !date || !summary || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error(`${path}: front matter needs title, date (YYYY-MM-DD) and summary`);
  }
  const words = html.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.round(words / 230));
  const firstImg = /<img[^>]+src="(\/[^"]+)"/.exec(html)?.[1];
  return {
    slug,
    title,
    date,
    summary,
    html,
    minutes,
    medium: medium || undefined,
    substack: substack || undefined,
    kicker: kicker || undefined,
    cover: cover || undefined,
    coverAlt: cover ? `Cover image: ${kicker ? kicker.toLowerCase() + ", " : ""}${title}` : undefined,
    thumb: thumb || (cover ? cover.replace(/\.png$/, ".webp") : undefined) || firstImg || undefined,
  };
}

const sorted: Post[] = Object.entries(files)
  .map(([path, mod]) => toPost(path, mod))
  .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

// Journal post URL -> preview card data, for links between posts.
export function postPreview(href: string): LinkPreview | undefined {
  const m = /^(?:https:\/\/dhruv-setty\.github\.io)?\/blog\/([^/]+)\/?$/.exec(href);
  const post = m ? sorted.find((p) => p.slug === m[1]) : undefined;
  if (!post) return undefined;
  return {
    href: `/blog/${post.slug}/`,
    title: post.title,
    description: post.summary,
    domain: domainOf("/"),
    image: post.thumb,
  };
}

// Newest first. Links to work inside each post render as preview cards.
// Tables are wrapped so they scroll inside the reading column instead of the page.
const wrapTables = (html: string) =>
  html.replace(/<table>/g, '<div class="table-wrap"><table>').replace(/<\/table>/g, "</table></div>");
export const POSTS: Post[] = sorted.map((p) => ({ ...p, html: wrapTables(cardify(p.html, postPreview)) }));

// The n most recent posts, newest first, leaving out `exclude`.
export function recentPosts(n: number, exclude?: string): Post[] {
  return POSTS.filter((p) => p.slug !== exclude).slice(0, n);
}

export function findPost(slug: string): Post | undefined {
  return POSTS.find((p) => p.slug === slug);
}

export function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1)).toLocaleDateString("en-NZ", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function formatShortDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1)).toLocaleDateString("en-NZ", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}
