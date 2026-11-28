import { SITE } from "../content/site";
import PlaneTrails from "./PlaneTrails";

export default function Footer({ icons = true }: { icons?: boolean }) {
  const [first, ...rest] = SITE.name.split(" ");
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <p className="site-footer__copy">© {new Date().getFullYear()} {first} <span className="site-footer__accent">{rest.join(" ")}</span></p>
        {icons ? (
        <ul className="site-footer__links">
          {SITE.contact.map((c) => (
            <li key={c.label}><a className="icon-link" href={c.href} aria-label={c.label} title={c.label}><img src={c.icon} alt="" width="22" height="22" /></a></li>
          ))}
        </ul>
        ) : null}
        <p className="site-footer__credit"><a href="https://hark.com" target="_blank" rel="noopener">Theme by Hark Labs<span className="visually-hidden"> (opens in a new tab)</span></a></p>
      </div>
      <PlaneTrails />
    </footer>
  );
}
