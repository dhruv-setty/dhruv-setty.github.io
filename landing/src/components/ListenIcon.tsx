import { useEffect, useState, useSyncExternalStore, type MouseEvent } from "react";
import type { Post } from "../content/posts";
import * as narrator from "../lib/narrator";

// Read-aloud icon for the Journal post list: sits after the reading time and reads that post in place,
// with the same engine, text and saved voice and speed as the Listen player on the post page.
// Every icon for a post (main list and side list) shares one owner, so they show the same state.

const ownerOf = (slug: string) => `list:${slug}`;
const none = () => null;

export default function ListenIcon({ post, className = "" }: { post: Post; className?: string }) {
  // null until mounted, so the server render and the first client render match.
  const [supported, setSupported] = useState<boolean | null>(null);
  const owner = ownerOf(post.slug);
  const playing = useSyncExternalStore(narrator.subscribe, narrator.activeOwner, none) === owner;

  useEffect(() => {
    setSupported(narrator.speechSupported());
  }, []);

  // Leaving the list (a route change unmounts it) stops this post.
  useEffect(() => () => void narrator.stop(owner), [owner]);

  if (supported === false) return null;

  const onClick = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!supported) return;
    if (playing) {
      narrator.stop(owner);
      return;
    }
    // Speech starts inside this handler, so iOS treats it as part of the tap.
    narrator.play(owner, narrator.postChunks(post), 0, {
      settings: () => ({ voiceURI: narrator.savedVoiceURI(), rate: narrator.savedRate() }),
    });
  };

  return (
    <button
      type="button"
      className={`listen-icon ${className}`.trim()}
      onClick={onClick}
      disabled={!supported}
      aria-label={`Listen to ${post.title}`}
      aria-pressed={playing}
      title={playing ? "Stop reading" : "Listen"}
    >
      <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true" focusable="false">
        {playing ? (
          <rect x="4" y="4" width="8" height="8" rx="1" fill="currentColor" />
        ) : (
          <g fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2.5 6h2.2L8 3.3v9.4L4.7 10H2.5z" />
            <path d="M10.6 5.8a3 3 0 0 1 0 4.4" />
            <path d="M12.5 4a5.6 5.6 0 0 1 0 8" />
          </g>
        )}
      </svg>
    </button>
  );
}
