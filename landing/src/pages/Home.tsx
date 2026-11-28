import Icon from "../components/Icon";
import LearnMore from "../components/LearnMore";
import { useState } from "react";
import Footer from "../components/Footer";
import ContactForm from "../components/ContactForm";
import { PROJECTS, SITE } from "../content/site";
import { GREETING, STORY } from "../content/story";
import ProjectPreview from "../components/ProjectPreview";
import { LAB, LAB_ITEMS } from "../content/lab";

const IDENTITY_TAGS = ["IAM", "IGA", "BAU", "Homelab"];
import BlogSidebar from "../components/BlogSidebar";
import HopGreeting from "../components/HopGreeting";
import Reveal from "../components/Reveal";

export default function Home() {
  const story = STORY.trim();
  const [showAllOther, setShowAllOther] = useState(false);
  const other = PROJECTS.filter((p) => !IDENTITY_TAGS.includes(p.tag));
  return (
    <>
      <main id="main" className="page page--home fade-in">
        <Reveal />
        <section className="hero hero--plain phase phase--one" aria-labelledby="hero-h">
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
                  {PROJECTS.filter((p) => IDENTITY_TAGS.includes(p.tag)).map((p) => <ProjectPreview key={p.slug} project={p} />)}
                </div>
                <div className="lab-block" role="region" aria-labelledby="lab-h">
                  <h3 id="lab-h" className="home-projects__sub">{LAB.title}</h3>
                  <p className="home-projects__intro">{LAB.intro}</p>
                  <div className="x-projects">
                    {LAB_ITEMS.map((item) => (
                      <figure key={item.slug} className="x-project">
                        <a className="x-project__frame" href={item.cover.replace(/\.webp$/, ".png")} target="_blank" rel="noopener" aria-label={`Open full size: ${item.title}`} title="Open full size"><Icon name={item.icon} /></a>
                        <figcaption><h4>{item.title}</h4><p>{item.summary}</p><LearnMore title={item.title} icon={item.icon} kicker="Service Desk Home Lab" body={item.summary} links={[{ label: "Open full size", href: item.png }, { label: "View the lab on GitHub", href: LAB.href }]} /></figcaption>
                      </figure>
                    ))}
                  </div>
                  <p className="lab-block__link"><a className="btn" href={LAB.href} target="_blank" rel="noopener">{LAB.linkText}</a></p>
                </div>
                <h3 className="home-projects__sub">Other work</h3>
                <p className="home-projects__intro">Research outside my day-to-day support work: ARM hardware and formal verification, where the core question is still who can reach what.</p>
                <div className="preview-feed" id="other-work-feed">
                  {(showAllOther ? other : other.slice(0, 1)).map((p) => <ProjectPreview key={p.slug} project={p} />)}
                </div>
                {!showAllOther && other.length > 1 ? (
                  <button type="button" className="home-projects__more" onClick={() => setShowAllOther(true)} aria-label={`Show ${other.length - 1} more`} aria-expanded="false" aria-controls="other-work-feed">
                    <span aria-hidden="true">&middot;&middot;&middot;</span>
                  </button>
                ) : null}
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
