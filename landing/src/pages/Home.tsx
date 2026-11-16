import Header from "../components/Header";
import Footer from "../components/Footer";
import ContactForm from "../components/ContactForm";
import { FEATURED, FOCUS, PROJECTS, SITE, LABS } from "../content/site";
import { GREETING, STORY } from "../content/story";
import { rich } from "../lib/rich";
import HopGreeting from "../components/HopGreeting";

export default function Home() {
  const story = STORY.trim();
  return (
    <>
      <Header />
      <main id="main" className="page fade-in">
        <section className="hero" aria-labelledby="hero-h">
          {SITE.location ? <p className="eyebrow">{SITE.location}</p> : null}
          <h1 id="hero-h" className="hero__name" aria-label={SITE.name}>
            <span className="hero__word hero__first animate__animated animate__fadeIn" aria-hidden="true">{SITE.name.split(" ")[0]}</span>{" "}
            <span className="hero__word hero__last animate__animated animate__fadeIn" aria-hidden="true">{SITE.name.split(" ").slice(1).join(" ")}</span>
          </h1>
          <p className="hero__positioning">{SITE.positioning}</p>
          <p className="hero__focus">{SITE.focus}</p>
          <div className="actions">
            <a className="button" href="#contact">Get in touch</a>
            <a className="button button--ghost" href="#work">Recent Projects</a>
            {SITE.resume ? (
              <a className="button button--ghost" href={SITE.resume} target="_blank" rel="noopener">View resume</a>
            ) : null}
          </div>
        </section>

        <section id="about" className="section about" aria-labelledby="about-h">
          <h2 id="about-h" className="section__title">About</h2>
          <div className="about__grid">
            <figure className="portrait">
              <div className="portrait__frame">
                <img className="portrait__img" src={SITE.photo.src} srcSet={`${SITE.photo.src} 1x, /dhruv@2x.webp 2x`} alt="Portrait of Dhruv Setty" width={SITE.photo.width} height={SITE.photo.height} loading="lazy" decoding="async" />
              </div>
            </figure>
            <div className="about__story">
              {GREETING ? <HopGreeting text={GREETING} /> : null}
              {story ? story.split("\n\n").map((para) => (
                <p key={para.slice(0, 24)}>
                  {para.split(/(asking why)/).map((part, i) => (part === "asking why" ? <span key={i}>asking <em className="about__why">why</em></span> : part))}
                </p>
              )) : null}
            </div>
          </div>
        </section>

        <section id="focus" className="section" aria-labelledby="focus-h">
          <h2 id="focus-h" className="section__title">What I focus on</h2>
          <div className="card-grid">
            {FOCUS.map((f, i) => (
              <article key={f.title} className="card focus-card">
                <span className="focus-card__index" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="card__title">{f.title}</h3>
                <p className="focus-card__lead">{f.lead}</p>
                <p className="focus-card__body">{f.body}</p>
                <ul className="focus-card__refs" aria-label="Control references">
                  {f.refs.map((r) => <li key={r}><code className="ic">{r}</code></li>)}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section id="work" className="section" aria-labelledby="work-h">
          <h2 id="work-h" className="section__title">Recent Projects</h2>
          <div className="card-grid card-grid--two">
            <article className="card">
              <figure className="card__thumb"><img src={FEATURED.thumb.src} alt={FEATURED.thumb.alt} width="1600" height="900" loading="lazy" decoding="async" /></figure>
              <p className="card__tag">Assurance</p>
              <h3 className="card__title">{FEATURED.name}</h3>
              <p className="card__summary">{rich(FEATURED.summary)}</p>
              <div className="actions card__links">
                <a className="text-link" href={FEATURED.readme}>{FEATURED.readmeText}</a>
              </div>
            </article>
            {PROJECTS.map((p) => (
              <article key={p.name} className="card">
                {p.thumb && <figure className="card__thumb"><img src={p.thumb.src} alt={p.thumb.alt} width="1600" height="900" loading="lazy" decoding="async" /></figure>}
                <p className="card__tag">{p.tag}</p>
                <h3 className="card__title">{p.name}</h3>
                <p className="card__summary">{rich(p.summary)}</p>
                <div className="actions card__links">
                  {p.links.filter((l) => l.href && !l.href.startsWith("__")).map((l) => (
                    <a key={l.text} className="text-link" href={l.href}>{l.text}</a>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section id="labs" className="section" aria-labelledby="labs-h">
          <h2 id="labs-h" className="section__title">ICT Labs</h2>
          <div className="card-grid card-grid--two">
            {LABS.map((l, i) => (
              <article key={l.name} className="card">
                <figure className="card__thumb"><img src={l.preview.src} alt={l.preview.alt} width="1200" height="600" loading="lazy" decoding="async" /></figure>
                <p className="card__tag">Lab {String(i + 1).padStart(2, "0")} · {l.tag}</p>
                <h3 className="card__title">{l.name}</h3>
                <p className="card__summary">{l.summary}</p>
                <ul className="card__chips" aria-label="Technology stack">
                  {l.stack.slice(0, 4).map((t) => <li key={t}><code className="ic">{t}</code></li>)}
                </ul>
                <div className="actions card__links">
                  <a className="text-link" href={l.href}>Learn More</a>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section id="contact" className="section contact" aria-labelledby="contact-h">
          <h2 id="contact-h" className="section__title">Get in touch</h2>
          <div className="contact__grid">
            <div>
              <p className="contact__lede">Hiring for identity or access work, or want to compare notes? Send a message and I'll reply within two working days.</p>
              <ul className="inline-list">
                {SITE.contact.map((c) => (
                  <li key={c.label}><a className="icon-link" href={c.href} aria-label={c.label} title={c.label}><img src={c.icon} alt="" width="22" height="22" /></a></li>
                ))}
              </ul>
            </div>
            <ContactForm />
          </div>
        </section>
      </main>
      <Footer icons={false} />
    </>
  );
}
