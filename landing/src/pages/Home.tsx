import Header from "../components/Header";
import Footer from "../components/Footer";
import ContactForm from "../components/ContactForm";
import { PROJECTS, SITE } from "../content/site";
import { GREETING, STORY } from "../content/story";
import ProjectPreview from "../components/ProjectPreview";
import BlogSidebar from "../components/BlogSidebar";
import HopGreeting from "../components/HopGreeting";
import Reveal from "../components/Reveal";

export default function Home() {
  const story = STORY.trim();
  return (
    <>
      <Header />
      <main id="main" className="page page--home fade-in">
        <Reveal />
        <section className="hero phase phase--one" aria-labelledby="hero-h">
          {SITE.location ? <p className="eyebrow">{SITE.location}</p> : null}
          <h1 id="hero-h" className="hero__name" aria-label={SITE.name}>
            <span className="hero__word hero__first" aria-hidden="true">{SITE.name.split(" ")[0]}</span>{" "}
            <span className="hero__word hero__last" aria-hidden="true">{SITE.name.split(" ").slice(1).join(" ")}</span>
          </h1>
          <div className="hero__lede">
            <p className="hero__positioning">{SITE.positioning}</p>
          </div>
          <div className="actions">
            <a className="button" href="#contact">Get in touch</a>
            {SITE.resume ? (
              <a className="button button--ghost" href={SITE.resume} target="_blank" rel="noopener">View resume</a>
            ) : null}
          </div>
        </section>

        <div className="blog-shell home-shell">
          <div className="blog-main">
            <section id="about" className="section panel journal-panel home-panel about" aria-labelledby="about-h">
              <header className="panel__head"><h2 id="about-h" className="section__title">About</h2></header>
              <div className="about__story">
                {GREETING ? <HopGreeting text={GREETING} /> : null}
                {story ? story.split("\n\n").map((para) => (
                  <p key={para.slice(0, 24)}>
                    {para.split(/(asking why)/).map((part, i) => (part === "asking why" ? <span key={i}>asking <em className="about__why">why</em></span> : part))}
                  </p>
                )) : null}
              </div>

              <div id="work" className="home-projects" role="region" aria-labelledby="work-h">
                <header className="panel__head"><h2 id="work-h" className="section__title">Projects</h2></header>
                <div className="preview-feed">
                  {PROJECTS.map((p) => <ProjectPreview key={p.slug} project={p} />)}
                </div>
              </div>
            </section>

          </div>
          <BlogSidebar title="Recent writing" />
          <section id="contact" className="section panel journal-panel home-panel contact" aria-labelledby="contact-h">
            <header className="panel__head"><h2 id="contact-h" className="section__title">Get in touch</h2></header>
            <div className="contact__body">
              <ContactForm />
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
