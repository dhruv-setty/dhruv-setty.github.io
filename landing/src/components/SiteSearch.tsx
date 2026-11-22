import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { POSTS } from "../content/posts";
import { PROJECTS } from "../content/site";

type Hit = { key: string; title: string; kind: string; text: string; to?: string; href?: string };

const strip = (h: string) => h.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

// Words of a text, lower case, split on anything that is not a letter or digit.
const toks = (t: string) => Array.from(new Set(t.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean)));
const MIN = 2;
// A query word matches a whole word, or the start or end of a word, never the middle.
const hit = (hay: string[], w: string) => hay.some((t) => t === w || t.startsWith(w) || t.endsWith(w));

const INDEX: (Hit & { hay: string[] })[] = [
  ...POSTS.map((p) => ({
    key: "post-" + p.slug, title: p.title, kind: "Journal", text: p.summary, to: `/blog/${p.slug}/`,
    hay: toks([p.title, p.summary, p.kicker ?? "", strip(p.html)].join(" ")),
  })),
  ...PROJECTS.map((p) => ({
    key: "proj-" + p.slug, title: p.name, kind: "Project", text: p.summary,
    href: p.private ? undefined : p.href, to: p.private ? "/#work" : undefined,
    hay: toks([p.name, p.tag, p.summary, ...(p.points ?? []), ...(p.stack ?? [])].join(" ")),
  })),
];

// Keyword search across journal posts and projects (Dhruv, 2026-11-23): starts after 2 letters; each word
// must match a whole word or the start or end of one.
export default function SiteSearch({ onPick, tabIndex }: { onPick?: () => void; tabIndex?: number }) {
  const [q, setQ] = useState("");
  const hits = useMemo(() => {
    const words = q.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((w) => w.length >= MIN);
    if (!words.length) return [];
    return INDEX.filter((h) => words.every((w) => hit(h.hay, w))).slice(0, 8);
  }, [q]);
  return (
    <div className="site-search" role="search">
      <input
        type="search"
        className="site-search__input"
        placeholder="Search keywords"
        aria-label="Search posts and projects"
        value={q}
        tabIndex={tabIndex}
        onChange={(e) => setQ(e.target.value)}
      />
      {q.trim().length >= MIN ? (
        <ul className="site-search__results" aria-live="polite">
          {hits.length === 0 ? <li className="site-search__empty">No matches</li> : hits.map((h) => (
            <li key={h.key}>
              {h.to ? (
                <Link to={h.to} onClick={() => { setQ(""); onPick?.(); }} tabIndex={tabIndex}>
                  <span className="site-search__kind">{h.kind}</span>{h.title}
                </Link>
              ) : (
                <a href={h.href} target="_blank" rel="noopener" tabIndex={tabIndex}>
                  <span className="site-search__kind">{h.kind}</span>{h.title}
                </a>
              )}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
