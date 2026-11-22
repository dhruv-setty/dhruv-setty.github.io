import { useEffect, useRef } from "react";

// Hero name set in Archivo variable (width + weight axes). Letters rise out of a mask on load,
// then on fine pointers each letter swells in width and weight as the cursor nears it, and the
// whole name drifts with the pointer for depth. Scrolling eases the name back and fades it.
// Reduced motion: static, no reveal, no tracking.
export default function HeroName({ name }: { name: string }) {
  const ref = useRef<HTMLHeadingElement>(null);
  const [first = "", ...rest] = name.split(" ");
  const last = rest.join(" ");

  useEffect(() => {
    const h = ref.current;
    if (!h) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    h.classList.add("is-ready");
    if (reduce) return;

    const letters = Array.from(h.querySelectorAll<HTMLSpanElement>(".hn__l"));
    const fine = false; // cursor-reactive type removed to keep the brand type steady
    let px = -9999, py = -9999, raf = 0, active = false;

    const frame = () => {
      raf = 0;
      const r = h.getBoundingClientRect();
      const reach = Math.max(r.height * 1.6, 220);
      for (const l of letters) {
        const b = l.getBoundingClientRect();
        const d = Math.hypot(px - (b.left + b.width / 2), py - (b.top + b.height / 2));
        const t = active ? Math.max(0, 1 - d / reach) : 0;
        const e = t * t * (3 - 2 * t);
        l.style.setProperty("--w", String(Math.round(700 + e * 200)));
        l.style.setProperty("--s", String(Math.round(100 + e * 25)));
        l.style.setProperty("--y", `${(-e * 0.06).toFixed(3)}em`);
      }
      if (active) {
        const cx = (px - (r.left + r.width / 2)) / window.innerWidth;
        const cy = (py - (r.top + r.height / 2)) / window.innerHeight;
        h.style.setProperty("--rx", `${(-cy * 8).toFixed(2)}deg`);
        h.style.setProperty("--ry", `${(cx * 10).toFixed(2)}deg`);
      } else {
        h.style.setProperty("--rx", "0deg");
        h.style.setProperty("--ry", "0deg");
      }
    };
    const queue = () => { if (!raf) raf = requestAnimationFrame(frame); };
    const onMove = (ev: PointerEvent) => { px = ev.clientX; py = ev.clientY; active = true; queue(); };
    const onLeave = () => { active = false; queue(); };
    const onScroll = () => {
      const p = Math.min(1, Math.max(0, window.scrollY / (window.innerHeight * 0.8)));
      h.style.setProperty("--sp", p.toFixed(3));
    };

    if (fine) {
      window.addEventListener("pointermove", onMove, { passive: true });
      document.addEventListener("pointerleave", onLeave);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  let i = 0;
  const word = (w: string, cls: string) => (
    <span className={`hn__word ${cls}`} aria-hidden="true">
      {Array.from(w).map((ch) => {
        const n = i++;
        return (
          <span className="hn__mask" key={n}>
            <span className="hn__l" style={{ ["--i" as string]: n }}>{ch}</span>
          </span>
        );
      })}
    </span>
  );

  return (
    <h1 id="hero-h" ref={ref} className="hero__name hn" aria-label={name}>
      <span className="hn__stage">
        {word(first, "hero__first")}
        {last ? word(last, "hero__last") : null}
      </span>
    </h1>
  );
}
