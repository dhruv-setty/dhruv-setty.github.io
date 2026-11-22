import { Link, useParams } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import BlogSidebar from "../components/BlogSidebar";
import LinkCard from "../components/LinkCard";
import { domainOf } from "../content/links";
import NotFound from "./NotFound";
import { POSTS, findPost, formatDate } from "../content/posts";
import { SITE } from "../content/site";

export default function PostPage() {
  const { slug } = useParams();
  const post = slug ? findPost(slug) : undefined;
  if (!post) return <NotFound />;
  const i = POSTS.indexOf(post);
  const newer = POSTS[i - 1];
  const older = POSTS[i + 1];
  return (
    <>
      <Header />
      <div className="blog-shell fade-in" id="main">
        <main className="blog-main">
          <article className="prose-article section panel journal-panel">
            <header className="post-header">
              <h1>{post.title}</h1>
              <div className="byline byline--post">
                <img src="/dhruv.webp" alt="" width="40" height="40" />
                <span>
                  <strong>{SITE.name}</strong>
                  <span className="byline__meta">
                    <time dateTime={post.date}>{formatDate(post.date)}</time> · {post.minutes} min read
                    {post.medium ? (
                      <>
                        {" · "}
                        <a href={post.medium}>Read on Medium</a>
                      </>
                    ) : null}
                  </span>
                </span>
              </div>
            </header>
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
          </article>
          <nav className="post-nav" aria-label="More posts">
            {older ? (
              <Link to={`/blog/${older.slug}/`} className="post-nav__item">
                <span className="post-nav__label">Previous</span>
                <span>{older.title}</span>
              </Link>
            ) : <span />}
            {newer ? (
              <Link to={`/blog/${newer.slug}/`} className="post-nav__item post-nav__item--next">
                <span className="post-nav__label">Next</span>
                <span>{newer.title}</span>
              </Link>
            ) : <span />}
          </nav>
        </main>
        <BlogSidebar current={post.slug} />
      </div>
      <Footer />
    </>
  );
}
