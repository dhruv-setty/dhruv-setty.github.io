import Header from "../components/Header";
import Footer from "../components/Footer";
import BlogSidebar from "../components/BlogSidebar";
import PostPreview from "../components/PostPreview";
import { POSTS } from "../content/posts";

export default function BlogIndex() {
  return (
    <>
      <Header />
      <div className="blog-shell fade-in" id="main">
        <main className="blog-main">
          <section className="section panel journal-panel" aria-labelledby="journal-h">
            <header className="panel__head">
              <h1 id="journal-h" className="section__title">Journal</h1>
            </header>
            {POSTS.length === 0 ? (
              <p>No posts yet.</p>
            ) : (
              <div className="preview-feed">
                {POSTS.map((p) => (
                  <PostPreview key={p.slug} post={p} listen />
                ))}
              </div>
            )}
          </section>
        </main>
        <BlogSidebar listen />
      </div>
      <Footer />
    </>
  );
}
