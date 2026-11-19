import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { useLocation } from "react-router-dom";
import { extractChunks, type Chunk } from "../lib/speech";
import * as narrator from "../lib/narrator";
import { RATES, RATE_KEY, VOICE_KEY, savedRate, savedVoiceURI, sortVoices, speechSupported, writeSetting } from "../lib/narrator";

// Journal "Listen" player: reads the live post with the browser's own voices (Web Speech API).
// No audio files and no service. Hidden where speechSynthesis is unavailable. The speech engine is shared
// with the open-and-listen icons on the post list (lib/narrator.ts), so only one narration plays at a time.
// When an icon opened this post, its narration is already running (it had to start inside the tap): the player
// adopts it rather than restarting. After a full load with ?listen=1 it starts where the browser allows, and
// otherwise puts focus on the Listen button.

type State = "idle" | "playing" | "paused";

function offscreen(el: HTMLElement): boolean {
  const r = el.getBoundingClientRect();
  const top = 64; // clears the sticky site header
  return r.top < top || r.bottom > window.innerHeight;
}

function listenRequested(state: unknown, search: string): boolean {
  const viaState = typeof state === "object" && state !== null && (state as Record<string, unknown>).listen === true;
  return viaState || new URLSearchParams(search).get("listen") === "1";
}

/** Drops ?listen=1 and the navigation flag from the address and history entry, without a router navigation. */
function clearListenFlag() {
  const url = new URL(window.location.href);
  url.searchParams.delete("listen");
  const st = window.history.state;
  const next = st && typeof st === "object" ? { ...st, usr: null } : st;
  window.history.replaceState(next, "", url.pathname + url.search + url.hash);
}

export default function ListenPlayer({ articleRef, slug }: { articleRef: RefObject<HTMLElement>; slug: string }) {
  const location = useLocation();
  const mainBtn = useRef<HTMLButtonElement>(null);
  // null until mounted, so the server render and the first client render match.
  const [supported, setSupported] = useState<boolean | null>(null);
  const [state, setState] = useState<State>("idle");
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceURI, setVoiceURI] = useState("");
  const [rate, setRate] = useState(1);

  const chunks = useRef<Chunk[]>([]);
  const index = useRef(0);
  const owner = useRef("post:" + Math.random().toString(36).slice(2));
  const current = useRef<HTMLElement | null>(null);
  const settings = useRef({ voiceURI: "", rate: 1 });
  settings.current = { voiceURI, rate };

  const mark = useCallback((el: HTMLElement | null) => {
    if (current.current && current.current !== el) current.current.classList.remove("is-reading");
    current.current = el;
    if (!el) return;
    el.classList.add("is-reading");
    if (offscreen(el)) {
      const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      el.scrollIntoView({ block: "center", behavior: smooth ? "smooth" : "auto" });
    }
  }, []);

  const options = useCallback(
    (): narrator.PlayOptions => ({
      settings: () => settings.current,
      onMark: mark,
      onEnd: () => {
        index.current = 0;
        setState("idle");
      },
      onStop: () => {
        index.current = 0;
        setState("idle");
      },
      onBlocked: () => {
        index.current = 0;
        setState("idle");
        mainBtn.current?.focus();
      },
    }),
    [mark],
  );

  const speakFrom = useCallback(
    (start: number) => {
      narrator.play(owner.current, chunks.current, start, options());
      setState("playing");
    },
    [options],
  );

  const stop = useCallback(() => {
    narrator.stop(owner.current);
    index.current = 0;
    mark(null);
    setState("idle");
  }, [mark]);

  // Feature detection, voices, saved choices, and cleanup on navigation.
  useEffect(() => {
    const ok = speechSupported();
    setSupported(ok);
    if (!ok) return;
    const synth = window.speechSynthesis;
    setRate(savedRate());
    const load = () => {
      const list = sortVoices(synth.getVoices());
      setVoices(list);
      setVoiceURI((prev) => (prev && list.some((v) => v.voiceURI === prev) ? prev : savedVoiceURI(list)));
    };
    load();
    synth.addEventListener?.("voiceschanged", load);
    const onHide = () => stop();
    window.addEventListener("pagehide", onHide);
    return () => {
      synth.removeEventListener?.("voiceschanged", load);
      window.removeEventListener("pagehide", onHide);
      stop();
    };
  }, [stop]);

  // Opened from a list icon: take over the narration it started, or start it now where the browser allows.
  const handled = useRef(false);
  useEffect(() => {
    if (!supported || handled.current) return;
    handled.current = true;
    if (!listenRequested(location.state, location.search)) return;
    clearListenFlag();
    const article = articleRef.current;
    if (!article) return;
    chunks.current = extractChunks(article);
    if (narrator.adopt(narrator.openerOwner(slug), owner.current, chunks.current, options())) {
      setState("playing");
      return;
    }
    // The icon's narration did not survive (a full page load, or a new tab): try to start, else offer the button.
    narrator.stop(narrator.openerOwner(slug));
    speakFrom(0);
    const check = window.setTimeout(() => {
      if (narrator.activeOwner() === owner.current && !narrator.started()) {
        narrator.stop(owner.current);
        index.current = 0;
        setState("idle");
        mainBtn.current?.focus();
      }
    }, 2500);
    return () => window.clearTimeout(check);
  }, [supported, slug, articleRef, location.state, location.search, options, speakFrom]);

  const toggle = () => {
    if (state === "playing") {
      // Pause by cancelling and remembering the block, which behaves the same in every browser.
      index.current = narrator.stop(owner.current, true);
      setState("paused");
      return;
    }
    if (state === "paused") {
      speakFrom(index.current);
      return;
    }
    const article = articleRef.current;
    if (!article) return;
    chunks.current = extractChunks(article);
    speakFrom(0);
  };

  const onRate = (value: number) => {
    setRate(value);
    writeSetting(RATE_KEY, String(value));
    settings.current.rate = value;
    if (state === "playing") speakFrom(narrator.position());
  };

  const onVoice = (uri: string) => {
    setVoiceURI(uri);
    writeSetting(VOICE_KEY, uri);
    settings.current.voiceURI = uri;
    if (state === "playing") speakFrom(narrator.position());
  };

  if (supported === false) return null;
  const ready = supported === true;
  const label = state === "playing" ? "Pause" : state === "paused" ? "Resume" : "Listen";
  const aria = state === "playing" ? "Pause reading" : state === "paused" ? "Resume reading" : "Listen to this post";

  return (
    <div className="listen" role="group" aria-label="Listen to this post">
      <button
        type="button"
        className="listen__btn listen__btn--main"
        ref={mainBtn}
        onClick={toggle}
        disabled={!ready}
        aria-label={aria}
        aria-pressed={state === "playing"}
      >
        <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false">
          {state === "playing" ? (
            <path d="M4 3h3v10H4zM9 3h3v10H9z" fill="currentColor" />
          ) : (
            <path d="M4.5 2.5v11l9-5.5z" fill="currentColor" />
          )}
        </svg>
        <span>{label}</span>
      </button>
      <button
        type="button"
        className="listen__btn"
        onClick={stop}
        disabled={!ready || state === "idle"}
        aria-label="Stop reading"
      >
        <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true" focusable="false">
          <rect x="3.5" y="3.5" width="9" height="9" fill="currentColor" />
        </svg>
        <span className="listen__stop-text">Stop</span>
      </button>
      <label className="listen__field">
        <span className="visually-hidden">Speed</span>
        <select
          className="listen__select listen__select--rate"
          value={String(rate)}
          onChange={(e) => onRate(Number(e.target.value))}
          disabled={!ready}
          aria-label="Reading speed"
        >
          {RATES.map((r) => (
            <option key={r} value={String(r)}>
              {r}x
            </option>
          ))}
        </select>
      </label>
      <label className="listen__field listen__field--voice">
        <span className="visually-hidden">Voice</span>
        <select
          className="listen__select listen__select--voice"
          value={voiceURI}
          onChange={(e) => onVoice(e.target.value)}
          disabled={!ready || voices.length === 0}
          aria-label="Voice"
        >
          {voices.length === 0 ? <option value="">Default voice</option> : null}
          {voices.map((v) => (
            <option key={v.voiceURI} value={v.voiceURI}>
              {v.name} ({v.lang})
            </option>
          ))}
        </select>
      </label>
      <span className="visually-hidden" aria-live="polite">
        {state === "playing" ? "Reading" : state === "paused" ? "Paused" : ""}
      </span>
    </div>
  );
}
