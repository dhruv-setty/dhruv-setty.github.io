import { useEffect } from "react";

// Doubles mouse-wheel and trackpad scroll distance so visitors move through the page
// in half the scrolls. Eases toward the target for a smooth glide. Leaves pinch zoom,
// horizontal scroll, inner scrollable panels and touch screens untouched.
const FACTOR = 2;

function canScrollInside(el: Element | null, dy: number): boolean {
  while (el && el !== document.body && el !== document.documentElement) {
    const s = getComputedStyle(el);
    if (/(auto|scroll)/.test(s.overflowY) && el.scrollHeight > el.clientHeight + 1) {
      const top = (el as HTMLElement).scrollTop;
      if (dy < 0 ? top > 0 : top + el.clientHeight < el.scrollHeight - 1) return true;
    }
    el = el.parentElement;
  }
  return false;
}

export default function FastScroll() {
  useEffect(() => {
    let target = window.scrollY;
    let frame = 0;
    const max = () => document.documentElement.scrollHeight - window.innerHeight;

    const step = () => {
      const cur = window.scrollY;
      const diff = target - cur;
      if (Math.abs(diff) < 0.5) { window.scrollTo({ top: target, behavior: "instant" as ScrollBehavior }); frame = 0; return; }
      window.scrollTo({ top: cur + diff * 0.22, behavior: "instant" as ScrollBehavior });
      frame = requestAnimationFrame(step);
    };

    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.defaultPrevented) return;
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      if (canScrollInside(e.target as Element, e.deltaY)) return;
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? window.innerHeight : 1;
      e.preventDefault();
      if (!frame) target = window.scrollY;
      target = Math.max(0, Math.min(max(), target + e.deltaY * unit * FACTOR));
      if (!frame) frame = requestAnimationFrame(step);
    };

    const sync = () => { if (!frame) target = window.scrollY; };
    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("scroll", sync, { passive: true });
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("scroll", sync);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);
  return null;
}
