import { Link } from "react-router-dom";
import { formatShortDate, recentPosts } from "../content/posts";
import Icon from "./Icon";

// Side panel for the Journal: the three most recent posts, newest first, leaving out the one
// being read, each with a small cover thumbnail. Sticky on desktop; a disclosure on small screens.
export default function BlogSidebar({ current, title = "Recent" }: { current?: string; title?: string }) {
  const recent = recentPosts(3, current);
  if (recent.length === 0) return null;
  return (
    <aside className="blog-side" aria-label="Recent posts">
      <details className="blog-side__box" open>
        <summary className="blog-side__title">{title}</summary>
        <ol className="blog-side__list">
          {recent.map((p) => (
            <li key={p.slug} className="blog-side__item blog-side__item--thumb">
              <span className="icon-tile icon-tile--sm" aria-hidden="true"><Icon name="post" /></span>
              <span className="blog-side__text">
                <Link to={`/blog/${p.slug}/`} className="blog-side__link">
                  <span className="blog-side__name">{p.title}</span>
                </Link>
                <span className="blog-side__meta">
                  {formatShortDate(p.date)} · {p.minutes} min read
                </span>
              </span>
            </li>
          ))}
        </ol>
        <p className="blog-side__more"><Link to="/blog/" className="learn-more"><span>Learn more</span><span aria-hidden="true">↗</span></Link></p>
      </details>
    </aside>
  );
}
