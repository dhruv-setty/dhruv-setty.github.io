import { Link } from "react-router-dom";
import { formatShortDate, type Post } from "../content/posts";

// Substack-style post preview: topic kicker, title, one-line summary, date and length, with the
// post's designed 16:9 cover on the right. Posts without a cover get a neutral tile, never the
// profile photo.
export default function PostPreview({ post }: { post: Post }) {
  const href = `/blog/${post.slug}/`;
  return (
    <article className="preview preview--post">
      <div className="preview__text">
        {post.kicker ? <p className="preview__kicker">{post.kicker}</p> : null}
        <h2 className="preview__title">
          <Link to={href}>{post.title}</Link>
        </h2>
        <p className="preview__summary">{post.summary}</p>
        <p className="preview__meta">
          <time dateTime={post.date}>{formatShortDate(post.date)}</time>
          <span aria-hidden="true">·</span>
          <span className="preview__length">{post.minutes} min read</span>
        </p>
      </div>
      <Link to={href} className={post.thumb ? "preview__thumb" : "preview__thumb preview__thumb--tile"} tabIndex={-1} aria-hidden="true">
        <img src={post.thumb ?? "/favicon-512.png"} alt="" loading="lazy" decoding="async" width="800" height="450" />
      </Link>
    </article>
  );
}
