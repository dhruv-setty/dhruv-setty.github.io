import { useEffect, useLayoutEffect } from "react";
import { useLocation, useNavigationType } from "react-router-dom";
import { metaFor } from "../content/meta";

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

// Opens every new page (a Journal entry, a case study) at the top and keeps the tab title in step with the page. Back and forward keep the browser's saved position, and in-page anchors (#about, #contact) are left to the browser.
export default function ScrollToTop() {
  const { pathname, hash } = useLocation();
  const navType = useNavigationType();
  useIsoLayoutEffect(() => {
    document.title = metaFor(pathname).title;
    if (navType === "POP" || hash) return;
    window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname, hash, navType]);
  return null;
}
