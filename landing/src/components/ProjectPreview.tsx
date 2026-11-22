import { Link } from "react-router-dom";
import type { Project } from "../content/site";

// A project as a Journal-style preview: tag kicker, title, two-line summary, where the link goes,
// and the project's designed 16:9 cover. The whole entry opens the project's href; links off the
// site open in a new tab.
export default function ProjectPreview({ project: p }: { project: Project }) {
  const external = /^https?:\/\//.test(p.href);
  const locked = !!p.private || !p.href;
  const where = external ? new URL(p.href).hostname.replace(/^www\./, "") : "Journal";
  const titleId = `project-${p.slug}`;
  return (
    <article className="preview preview--post preview--project" aria-labelledby={titleId}>
      <div className="preview__text">
        <p className="preview__kicker">{p.tag}</p>
        <h3 id={titleId} className="preview__title">
          {locked ? (
            <span>{p.name}</span>
          ) : external ? (
            <a href={p.href} target="_blank" rel="noopener" className="preview__link">
              {p.name}
              <span className="visually-hidden"> (opens in a new tab)</span>
            </a>
          ) : (
            <Link to={p.href} className="preview__link">{p.name}</Link>
          )}
        </h3>
        <p className="preview__summary">{p.summary.replace(/`/g, "")}</p>
        {p.meta?.length ? (
          <p className="preview__meta preview__meta--links">
            {p.meta.map((m) => (
              <a key={m.href} href={m.href} target="_blank" rel="noopener" className="preview__meta-link">
                {m.label}
                <span aria-hidden="true"> ↗</span>
                <span className="visually-hidden"> on Hugging Face (opens in a new tab)</span>
              </a>
            ))}
          </p>
        ) : (
          <p className="preview__meta">
            <span>{locked ? "Private repository" : where}</span>
            {external && !locked ? <span aria-hidden="true">↗</span> : null}
          </p>
        )}
      </div>
      <span className="preview__thumb" aria-hidden="true">
        <img src={p.cover} alt="" loading="lazy" decoding="async" width="800" height="450" />
      </span>
    </article>
  );
}
