import { Link } from "react-router-dom";
import { POSTS, formatShortDate } from "../content/posts";
import ListenIcon from "./ListenIcon";

// Side panel for the blog: every post, newest first, with the one being read marked. Collapses to a disclosure on small screens.
// With `listen` (the Journal index), each entry carries a read-aloud icon after its reading time. A button cannot sit
// inside a link, so the title link is stretched over the whole entry and the icon sits above it.
export default function BlogSidebar({ current, listen = false }: { current?: string; listen?: boolean }) {
  return (
    <aside className="blog-side" aria-label="All posts">
      <details className="blog-side__box" open>
        <summary className="blog-side__title">
          All posts <span className="blog-side__count">{POSTS.length}</span>
        </summary>
        <ol className="blog-side__list">
          {POSTS.map((p) => (
            <li key={p.slug} className="blog-side__item" data-current={p.slug === current ? "" : undefined}>
              <Link
                to={`/blog/${p.slug}/`}
                className="blog-side__link"
                aria-current={p.slug === current ? "page" : undefined}
              >
                <span className="blog-side__name">{p.title}</span>
              </Link>
              <span className="blog-side__meta">
                {formatShortDate(p.date)} · {p.minutes} min read
                {listen ? <ListenIcon post={p} className="listen-icon--side" /> : null}
              </span>
            </li>
          ))}
        </ol>
      </details>
    </aside>
  );
}
