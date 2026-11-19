// Shared speech engine for the Journal: the post page Listen player and the read-aloud icons on the post list.
// One narration at a time across the whole page. Starting a new one stops the one before it.
import { extractChunks, type Chunk } from "./speech";

export const RATES = [0.9, 1, 1.25, 1.5];
export const VOICE_KEY = "journal.listen.voice";
export const RATE_KEY = "journal.listen.rate";
const PREFERRED = ["en-GB", "en-NZ", "en-AU"];

export function speechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
}

function langRank(lang: string): number {
  const l = lang.replace("_", "-").toLowerCase();
  const i = PREFERRED.findIndex((p) => l.startsWith(p.toLowerCase()));
  if (i !== -1) return i;
  if (l.startsWith("en-us")) return 3;
  if (l.startsWith("en")) return 4;
  return 5;
}

export function sortVoices(list: SpeechSynthesisVoice[]): SpeechSynthesisVoice[] {
  const english = list.filter((v) => /^en/i.test(v.lang));
  const pool = english.length ? english : list;
  return [...pool].sort((a, b) => langRank(a.lang) - langRank(b.lang) || a.name.localeCompare(b.name));
}

export function readSetting(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeSetting(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* storage unavailable: the choice lasts for this page only */
  }
}

export function savedRate(): number {
  const r = Number(readSetting(RATE_KEY));
  return RATES.includes(r) ? r : 1;
}

/** The saved voice when it is installed, else the best English voice, else "" (browser default). */
export function savedVoiceURI(list: SpeechSynthesisVoice[] = sortVoices(window.speechSynthesis.getVoices())): string {
  const saved = readSetting(VOICE_KEY);
  if (saved && list.some((v) => v.voiceURI === saved)) return saved;
  return list[0]?.voiceURI ?? "";
}

export interface Settings {
  voiceURI: string;
  rate: number;
}

export interface PlayOptions {
  /** Read before every utterance, so a change of voice or speed applies from the next block. */
  settings: () => Settings;
  onMark?: (el: HTMLElement | null) => void; // the block being spoken, null when done
  onEnd?: () => void; // reached the end
  onStop?: () => void; // stopped by someone else (another narration started, or the page was left)
  onBlocked?: () => void; // the browser refused to speak (no user gesture), so nothing will play
}

interface Active {
  owner: string;
  token: number;
  index: number;
  chunks: Chunk[];
  opts: PlayOptions;
  started: boolean; // the browser has begun speaking (onstart fired)
}

let active: Active | null = null;
let run = 0; // bumps on every start or stop, so callbacks from a cancelled utterance are ignored
let keepAlive = 0;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((fn) => fn());
}

/** For useSyncExternalStore: which narration is speaking now. */
export function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function activeOwner(): string | null {
  return active?.owner ?? null;
}

/** The block the active narration is on. */
export function position(): number {
  return active?.index ?? 0;
}

function clearKeepAlive() {
  if (keepAlive) window.clearInterval(keepAlive);
  keepAlive = 0;
}

// Chrome stops a long-running utterance after about 15 seconds; a pause and resume every 10 seconds keeps it going.
// Skipped on Android, where pause ends the utterance.
function startKeepAlive() {
  clearKeepAlive();
  if (/android/i.test(navigator.userAgent)) return;
  keepAlive = window.setInterval(() => {
    const synth = window.speechSynthesis;
    if (synth.speaking && !synth.paused) {
      synth.pause();
      synth.resume();
    }
  }, 10000);
}

function cancel() {
  run += 1;
  clearKeepAlive();
  if (speechSupported()) window.speechSynthesis.cancel();
}

/**
 * Stops the narration. With an owner, only when that owner is the one speaking.
 * Returns the block it was on, so a caller can resume from there. keepMark leaves that block highlighted (pause).
 */
export function stop(owner?: string, keepMark = false): number {
  if (owner !== undefined && active?.owner !== owner) return 0;
  const at = active?.index ?? 0;
  const was = active;
  active = null;
  cancel();
  if (!keepMark) was?.opts.onMark?.(null);
  emit();
  return at;
}

/** Speaks the chunks from block `start`. Call it straight from the click handler, so iOS sees speech start inside the tap. */
export function play(owner: string, chunks: Chunk[], start: number, opts: PlayOptions) {
  const synth = window.speechSynthesis;
  const busy = synth.speaking || synth.pending;
  const prev = active;
  if (prev) {
    active = null;
    prev.opts.onMark?.(null);
    if (prev.owner !== owner) prev.opts.onStop?.();
  }
  cancel();
  const token = run;
  const me: Active = { owner, token, index: start, chunks, opts, started: false };
  active = me;
  // me.chunks and me.opts are read on every step, so adopt() can hand a running narration to a new owner.
  const say = (i: number) => {
    if (token !== run) return;
    if (i >= me.chunks.length) {
      active = null;
      clearKeepAlive();
      me.opts.onMark?.(null);
      me.opts.onEnd?.();
      emit();
      return;
    }
    me.index = i;
    const chunk = me.chunks[i]!;
    me.opts.onMark?.(chunk.el);
    const u = new SpeechSynthesisUtterance(chunk.text);
    const { voiceURI, rate } = me.opts.settings();
    const voice = synth.getVoices().find((v) => v.voiceURI === voiceURI);
    if (voice) {
      u.voice = voice;
      u.lang = voice.lang;
    } else {
      u.lang = "en-GB";
    }
    u.rate = rate;
    u.onstart = () => {
      if (token === run) me.started = true;
    };
    u.onend = () => say(i + 1);
    u.onerror = (e) => {
      if (token !== run) return;
      if (e.error === "interrupted" || e.error === "canceled") return;
      if (e.error === "not-allowed") {
        // No user gesture behind this start: end quietly rather than skipping through every block.
        active = null;
        cancel();
        me.opts.onMark?.(null);
        me.opts.onBlocked?.();
        emit();
        return;
      }
      say(i + 1);
    };
    synth.speak(u);
  };
  startKeepAlive();
  emit();
  // Speak at once when idle, so iOS sees the call inside the tap; after a cancel, Chrome needs a moment first.
  if (busy) window.setTimeout(() => say(start), 60);
  else say(start);
}

/** True once the browser has begun speaking the active narration. */
export function started(): boolean {
  return active?.started ?? false;
}

/**
 * Hands the running narration from `from` to `to` without restarting it: the current utterance carries on,
 * later blocks come from `chunks` and callbacks go to `opts`. Used when a list icon starts a post in the tap
 * and the post page then takes it over. Refused (false) unless `from` is speaking and the texts match exactly.
 */
export function adopt(from: string, to: string, chunks: Chunk[], opts: PlayOptions): boolean {
  const me = active;
  if (!me || me.owner !== from) return false;
  if (chunks.length !== me.chunks.length || chunks.some((c, i) => c.text !== me.chunks[i]!.text)) return false;
  me.owner = to;
  me.chunks = chunks;
  me.opts = opts;
  opts.onMark?.(chunks[me.index]?.el ?? null);
  emit();
  return true;
}

/** Owner used by a list icon for the narration it starts before opening the post. */
export const openerOwner = (slug: string) => `open:${slug}`;

// Leaving the page ends any narration.
if (typeof window !== "undefined") {
  window.addEventListener("pagehide", () => {
    const was = active;
    if (!was) return;
    active = null;
    cancel();
    was.opts.onMark?.(null);
    was.opts.onStop?.();
    emit();
  });
}

/**
 * The reading order of a post exactly as its page speaks it: the same markup the post page renders
 * (an h1 with the title, then the .post-body HTML), built in a detached document so nothing loads or shows.
 */
const cache = new Map<string, Chunk[]>();
export function postChunks(post: { slug: string; title: string; html: string }): Chunk[] {
  const hit = cache.get(post.slug);
  if (hit) return hit;
  const doc = document.implementation.createHTMLDocument("");
  const article = doc.createElement("article");
  const header = doc.createElement("header");
  const h1 = doc.createElement("h1");
  h1.textContent = post.title;
  header.appendChild(h1);
  const body = doc.createElement("div");
  body.className = "post-body";
  body.innerHTML = post.html;
  article.append(header, body);
  doc.body.appendChild(article);
  const chunks = extractChunks(article as unknown as HTMLElement);
  cache.set(post.slug, chunks);
  return chunks;
}
