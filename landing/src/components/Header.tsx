import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { SITE } from "../content/site";

// No nav bar: a single floating drawer button (top right) opens a slide-in menu with Home and Resume.
export default function Header() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);
  return (
    <header className="site-drawer">
      <a className="skip-link" href="#main">Skip to content</a>
      <button
        type="button"
        className={"drawer-btn" + (open ? " is-open" : "")}
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        aria-controls="site-drawer-panel"
        onClick={() => setOpen((o) => !o)}
      >
        <span /><span /><span />
      </button>
      <div className={"drawer-scrim" + (open ? " is-open" : "")} onClick={() => setOpen(false)} aria-hidden="true" />
      <nav id="site-drawer-panel" className={"drawer-panel" + (open ? " is-open" : "")} aria-label="Site" aria-hidden={!open}>
        <Link to="/" tabIndex={open ? 0 : -1} aria-current={pathname === "/" ? "page" : undefined} onClick={() => { setOpen(false); window.scrollTo({ top: 0 }); }}>Home</Link>
        {SITE.resume ? <a href={SITE.resume} tabIndex={open ? 0 : -1}>Resume</a> : null}
      </nav>
    </header>
  );
}
