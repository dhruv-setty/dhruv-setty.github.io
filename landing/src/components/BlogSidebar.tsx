import { Link } from "react-router-dom";
import { formatShortDate, recentPosts } from "../content/posts";

// Side panel for the Journal: the three most recent posts, newest first, leaving out the one
// being read. Collapses to a disclosure on small screens.
export default function BlogSidebar({ current }: { current?: string }) {
  const recent = recentPosts(3, current);
  if (recent.length === 0) return null;
  return (
    <aside className="blog-side" aria-label="Recent posts">
      <details className="blog-side__box" open>
        <summary className="blog-side__title">Recent</summary>
        <ol className="blog-side__list">
          {recent.map((p) => (
            <li key={p.slug} className="blog-side__item">
              <Link to={`/blog/${p.slug}/`} className="blog-side__link">
                <span className="blog-side__name">{p.title}</span>
              </Link>
              <span className="blog-side__meta">
                {formatShortDate(p.date)} · {p.minutes} min read
              </span>
            </li>
          ))}
        </ol>
      </details>
    </aside>
  );
}
