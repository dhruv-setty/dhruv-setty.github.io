import { tileIcon, type LinkPreview } from "../content/links";

// React twin of cardHtml() in content/links.ts: a featured-article style preview card.
export default function LinkCard({ preview }: { preview: LinkPreview }) {
  const { href, title, description, domain, image } = preview;
  return (
    <a className="link-card" href={href}>
      <span className={image ? "link-card__thumb" : "link-card__thumb link-card__thumb--tile"}>
        <img src={image ?? tileIcon(domain)} alt="" loading="lazy" decoding="async" />
      </span>
      <span className="link-card__body">
        <span className="link-card__title">{title}</span>
        <span className="link-card__desc">{description}</span>
        <span className="link-card__domain">{domain}</span>
      </span>
    </a>
  );
}
