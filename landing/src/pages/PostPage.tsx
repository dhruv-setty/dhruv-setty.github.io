import { Link, useParams, useNavigate } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import BlogSidebar from "../components/BlogSidebar";
import LinkCard from "../components/LinkCard";
import { domainOf } from "../content/links";
import NotFound from "./NotFound";
import { POSTS, findPost, formatDate, formatShortDate, type Post } from "../content/posts";
import { SITE } from "../content/site";

// End-of-post Prev/Next: a small preview card with the post's cover thumbnail.
function NavCard({ post, label, next }: { post: Post; label: string; next?: boolean }) {
  return (
    <Link to={`/blog/${post.slug}/`} className={next ? "post-next post-next--next" : "post-next"}>
      {post.thumb ? (
        <span className="post-next__thumb">
          <img src={post.thumb} alt="" loading="lazy" decoding="async" width="800" height="450" />
        </span>
      ) : null}
      <span className="post-next__body">
        <span className="post-next__label">{label}</span>
        <span className="post-next__title">{post.title}</span>
        <span className="post-next__meta">
          {formatShortDate(post.date)} · {post.minutes} min read
        </span>
      </span>
    </Link>
  );
}

export default function PostPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const post = slug ? findPost(slug) : undefined;
  if (!post) return <NotFound />;
  const i = POSTS.indexOf(post);
  const newer = POSTS[i - 1];
  const older = POSTS[i + 1];
  return (
    <>
      <Header />
      <div className="blog-shell blog-shell--post fade-in" id="main">
        <main className="blog-main">
          <article className="prose-article section panel journal-panel">
            <header className="post-header">
              <button
                type="button"
                className="post-back"
                onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/blog/"))}
              >
                <span aria-hidden="true">←</span> Back
              </button>
              {post.kicker ? <p className="post-kicker">{post.kicker}</p> : null}
              <h1>{post.title}</h1>
              <p className="post-standfirst">{post.summary}</p>
              <div className="post-meta">
                <span className="post-meta__name">{SITE.name}</span>
                <span className="post-meta__sep post-meta__sep--lead" aria-hidden="true">·</span>
                <span className="post-meta__info">
                  <time dateTime={post.date}>{formatDate(post.date)}</time>
                  <span className="post-meta__sep" aria-hidden="true">·</span>
                  <span>{post.minutes} min read</span>
                </span>
                {post.medium ? (
                  <>
                    <span className="post-meta__sep" aria-hidden="true">·</span>
                    <a href={post.medium}>Read on Medium</a>
                  </>
                ) : null}
              </div>
            </header>
            {post.cover ? (
              <figure className="post-cover">
                <img src={post.cover} alt={post.coverAlt ?? ""} width="1200" height="675" decoding="async" />
              </figure>
            ) : null}
            <div className="post-body" dangerouslySetInnerHTML={{ __html: post.html }} />
            {post.substack ? (
              <div className="link-cards link-cards--substack">
                <LinkCard
                  preview={{
                    href: post.substack,
                    title: post.title,
                    description: "Read on Substack",
                    domain: domainOf(post.substack),
                    image: post.thumb,
                  }}
                />
              </div>
            ) : null}
            {older || newer ? (
              <footer className="post-end">
                <p className="post-end__title">Keep reading</p>
                <nav className="post-end__grid" aria-label="More posts">
                  {older ? <NavCard post={older} label="← Previous" /> : <span className="post-next--empty" />}
                  {newer ? <NavCard post={newer} label="Next →" next /> : <span className="post-next--empty" />}
                </nav>
                <Link to="/blog/" className="post-back post-back--end">
                  <span aria-hidden="true">←</span> All posts
                </Link>
              </footer>
            ) : null}
          </article>
        </main>
        <BlogSidebar current={post.slug} />
      </div>
      <Footer />
    </>
  );
}
