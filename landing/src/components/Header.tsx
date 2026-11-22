import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { SITE } from "../content/site";

// Drawer nav (Dhruv, 2026-11-23): one floating button opens a slide-in panel with Home, Journal and Resume.
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
  const close = () => { setOpen(false); window.scrollTo({ top: 0 }); };
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
        <Link to="/" tabIndex={open ? 0 : -1} aria-current={pathname === "/" ? "page" : undefined} onClick={close}>Home</Link>
        <Link to="/blog/" tabIndex={open ? 0 : -1} aria-current={pathname.startsWith("/blog") ? "page" : undefined} onClick={close}>Journal</Link>
        {SITE.resume ? <a href={SITE.resume} target="_blank" rel="noopener" tabIndex={open ? 0 : -1}>Resume</a> : null}
      </nav>
    </header>
  );
}
