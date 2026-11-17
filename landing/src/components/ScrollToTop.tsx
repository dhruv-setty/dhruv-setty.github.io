import { useLayoutEffect } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

// Opens every new page (a Journal entry, a case study) at the top. Back and forward keep the browser's saved position, and in-page anchors (#about, #contact) are left to the browser.
export default function ScrollToTop() {
  const { pathname, hash } = useLocation();
  const navType = useNavigationType();
  useLayoutEffect(() => {
    if (navType === "POP" || hash) return;
    window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname, hash, navType]);
  return null;
}
