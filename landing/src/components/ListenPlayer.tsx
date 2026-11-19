import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { extractChunks, type Chunk } from "../lib/speech";

// Journal "Listen" player: reads the live post with the browser's own voices (Web Speech API).
// No audio files and no service. Hidden where speechSynthesis is unavailable.

const RATES = [0.9, 1, 1.25, 1.5];
const VOICE_KEY = "journal.listen.voice";
const RATE_KEY = "journal.listen.rate";
const PREFERRED = ["en-GB", "en-NZ", "en-AU"];

type State = "idle" | "playing" | "paused";

function langRank(lang: string): number {
  const l = lang.replace("_", "-").toLowerCase();
  const i = PREFERRED.findIndex((p) => l.startsWith(p.toLowerCase()));
  if (i !== -1) return i;
  if (l.startsWith("en-us")) return 3;
  if (l.startsWith("en")) return 4;
  return 5;
}

function sortVoices(list: SpeechSynthesisVoice[]): SpeechSynthesisVoice[] {
  const english = list.filter((v) => /^en/i.test(v.lang));
  const pool = english.length ? english : list;
  return [...pool].sort((a, b) => langRank(a.lang) - langRank(b.lang) || a.name.localeCompare(b.name));
}

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* storage unavailable: the choice lasts for this page only */
  }
}

function offscreen(el: HTMLElement): boolean {
  const r = el.getBoundingClientRect();
  const top = 64; // clears the sticky site header
  return r.top < top || r.bottom > window.innerHeight;
}

export default function ListenPlayer({ articleRef }: { articleRef: RefObject<HTMLElement> }) {
  // null until mounted, so the server render and the first client render match.
  const [supported, setSupported] = useState<boolean | null>(null);
  const [state, setState] = useState<State>("idle");
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceURI, setVoiceURI] = useState("");
  const [rate, setRate] = useState(1);

  const chunks = useRef<Chunk[]>([]);
  const index = useRef(0);
  const run = useRef(0); // bumps on every start or stop, so callbacks from a cancelled utterance are ignored
  const current = useRef<HTMLElement | null>(null);
  const settings = useRef({ voiceURI: "", rate: 1, voices: [] as SpeechSynthesisVoice[] });
  settings.current = { voiceURI, rate, voices };

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

  const halt = useCallback(() => {
    run.current += 1;
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
  }, []);

  const speakFrom = useCallback(
    (start: number) => {
      const synth = window.speechSynthesis;
      const busy = synth.speaking || synth.pending;
      halt();
      const token = run.current;
      const list = chunks.current;
      const say = (i: number) => {
        if (token !== run.current) return;
        if (i >= list.length) {
          index.current = 0;
          mark(null);
          setState("idle");
          return;
        }
        index.current = i;
        const chunk = list[i]!;
        mark(chunk.el);
        const u = new SpeechSynthesisUtterance(chunk.text);
        const { voiceURI: uri, rate: r, voices: vs } = settings.current;
        const voice = vs.find((v) => v.voiceURI === uri);
        if (voice) {
          u.voice = voice;
          u.lang = voice.lang;
        } else {
          u.lang = "en-GB";
        }
        u.rate = r;
        u.onend = () => say(i + 1);
        u.onerror = (e) => {
          if (token !== run.current) return;
          if (e.error === "interrupted" || e.error === "canceled") return;
          say(i + 1);
        };
        synth.speak(u);
      };
      setState("playing");
      // Speak at once when idle, so iOS sees the call inside the tap; after a cancel, Chrome needs a moment first.
      if (busy) window.setTimeout(() => say(start), 60);
      else say(start);
    },
    [halt, mark],
  );

  const stop = useCallback(() => {
    halt();
    index.current = 0;
    mark(null);
    setState("idle");
  }, [halt, mark]);

  // Feature detection, voices, saved choices, and cleanup on navigation.
  useEffect(() => {
    const ok = typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
    setSupported(ok);
    if (!ok) return;
    const synth = window.speechSynthesis;
    const savedRate = Number(read(RATE_KEY));
    if (RATES.includes(savedRate)) setRate(savedRate);
    const load = () => {
      const list = sortVoices(synth.getVoices());
      setVoices(list);
      const saved = read(VOICE_KEY);
      setVoiceURI((prev) => {
        if (prev && list.some((v) => v.voiceURI === prev)) return prev;
        if (saved && list.some((v) => v.voiceURI === saved)) return saved;
        return list[0]?.voiceURI ?? "";
      });
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

  // Chrome stops a long-running utterance after about 15 seconds; a pause and resume every 10 seconds keeps it going.
  // Skipped on Android, where pause ends the utterance.
  useEffect(() => {
    if (state !== "playing" || /android/i.test(navigator.userAgent)) return;
    const id = window.setInterval(() => {
      const synth = window.speechSynthesis;
      if (synth.speaking && !synth.paused) {
        synth.pause();
        synth.resume();
      }
    }, 10000);
    return () => window.clearInterval(id);
  }, [state]);

  const toggle = () => {
    if (state === "playing") {
      // Pause by cancelling and remembering the block, which behaves the same in every browser.
      halt();
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
    write(RATE_KEY, String(value));
    settings.current.rate = value;
    if (state === "playing") speakFrom(index.current);
  };

  const onVoice = (uri: string) => {
    setVoiceURI(uri);
    write(VOICE_KEY, uri);
    settings.current.voiceURI = uri;
    if (state === "playing") speakFrom(index.current);
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
