import { useEffect, useState, type KeyboardEvent, type MouseEvent } from "react";
import { useNavigate } from "react-router-dom";
import type { Post } from "../content/posts";
import * as narrator from "../lib/narrator";

// Read-aloud icon for the Journal post list: a speaker glyph that sits in the meta line as one more item
// after the reading time. It opens the post and reads it there. Speech starts inside the tap (iOS and Safari
// only allow speech from a user gesture) with the same chunks the post page speaks; the post page's Listen
// player then adopts that narration, so it carries on with highlighting and scroll instead of restarting.
// Opened in a new tab or with a full load, ?listen=1 asks the post page to start where the browser allows.

export const LISTEN_FLAG = "listen";

// "main" sits in the flex meta line of a preview (separators are their own items); "side" sits in the
// side list's plain text meta, where items are joined by " · ".
export default function ListenIcon({ post, variant = "main" }: { post: Post; variant?: "main" | "side" }) {
  // null until mounted, so the server render and the first client render match.
  const [supported, setSupported] = useState<boolean | null>(null);
  const navigate = useNavigate();
  const to = `/blog/${post.slug}/`;

  useEffect(() => {
    setSupported(narrator.speechSupported());
  }, []);

  const open = () => {
    if (narrator.speechSupported()) {
      narrator.play(narrator.openerOwner(post.slug), narrator.postChunks(post), 0, {
        settings: () => ({ voiceURI: narrator.savedVoiceURI(), rate: narrator.savedRate() }),
      });
    }
    navigate(to, { state: { [LISTEN_FLAG]: true } });
  };

  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    // A modified click (new tab or window) keeps the browser default and uses the ?listen=1 fallback.
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    open();
  };

  // Enter activates a link natively (as a click); Space is added so the control answers both keys.
  const onKeyDown = (e: KeyboardEvent<HTMLAnchorElement>) => {
    if (e.key !== " ") return;
    e.preventDefault();
    open();
  };

  const hidden = supported === false;
  return (
    <span className={`listen-item listen-item--${variant}`} data-hidden={hidden ? "" : undefined} aria-hidden={hidden || undefined}>
      <span className="listen-item__sep" aria-hidden="true">
        {variant === "side" ? " · " : "·"}
      </span>
      <a
        href={`${to}?${LISTEN_FLAG}=1`}
        className="listen-icon"
        onClick={onClick}
        onKeyDown={onKeyDown}
        aria-label={`Open and listen to ${post.title}`}
        title="Open and listen"
        tabIndex={hidden ? -1 : undefined}
      >
        <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
          <g fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2.5 6h2.2L8 3.3v9.4L4.7 10H2.5z" />
            <path d="M10.6 5.8a3 3 0 0 1 0 4.4" />
            <path d="M12.5 4a5.6 5.6 0 0 1 0 8" />
          </g>
        </svg>
      </a>
    </span>
  );
}
