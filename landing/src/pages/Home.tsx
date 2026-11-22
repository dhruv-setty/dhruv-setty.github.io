import Header from "../components/Header";
import Footer from "../components/Footer";
import ContactForm from "../components/ContactForm";
import { PROJECTS, SITE } from "../content/site";
import { GREETING, STORY } from "../content/story";
import { rich } from "../lib/rich";
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
            <span className="hero__word hero__first animate__animated animate__fadeIn" aria-hidden="true">{SITE.name.split(" ")[0]}</span>{" "}
            <span className="hero__word hero__last animate__animated animate__fadeIn" aria-hidden="true">{SITE.name.split(" ").slice(1).join(" ")}</span>
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

        <section id="about" className="section panel about" aria-labelledby="about-h">
          <header className="panel__head"><h2 id="about-h" className="section__title">About</h2></header>
          <div className="about__story">
            {GREETING ? <HopGreeting text={GREETING} /> : null}
            {story ? story.split("\n\n").map((para) => (
              <p key={para.slice(0, 24)}>
                {para.split(/(asking why)/).map((part, i) => (part === "asking why" ? <span key={i}>asking <em className="about__why">why</em></span> : part))}
              </p>
            )) : null}
          </div>
        </section>

        <section id="work" className="section panel" aria-labelledby="work-h">
          <header className="panel__head"><h2 id="work-h" className="section__title">Projects</h2></header>
          <div className="project-list">
            {PROJECTS.map((p) => (
              <article key={p.slug} className="project" aria-labelledby={`project-${p.slug}`}>
                <figure className="project__figure">
                  <img src={p.image.src} alt={p.image.alt} width={p.image.width} height={p.image.height} loading="lazy" decoding="async" />
                </figure>
                <div className="project__body">
                  <p className="card__tag">{p.tag}</p>
                  <h3 id={`project-${p.slug}`} className="project__title">{p.name}</h3>
                  <p className="project__summary">{rich(p.summary)}</p>
                  {p.points ? (
                    <ul className="project__points">
                      {p.points.map((pt) => <li key={pt.slice(0, 32)}>{rich(pt)}</li>)}
                    </ul>
                  ) : null}
                  {p.stack ? (
                    <ul className="card__chips" aria-label="Technology stack">
                      {p.stack.map((t) => <li key={t}><code className="ic">{t}</code></li>)}
                    </ul>
                  ) : null}
                  <div className="project__links">
                    <a className="button button--ghost" href={p.href} target="_blank" rel="noopener" aria-label={`Learn More: ${p.name}`}>Learn More</a>
                    {p.extra?.map((x) => (
                      <a key={x.href} className="button button--ghost" href={x.href} target="_blank" rel="noopener" aria-label={`${x.label}: ${p.name}`}>{x.label}</a>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section id="contact" className="section panel contact" aria-labelledby="contact-h">
          <header className="panel__head"><h2 id="contact-h" className="section__title">Get in touch</h2></header>
          <div className="contact__body">
            <ContactForm />
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
