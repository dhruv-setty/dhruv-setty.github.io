import { useEffect, useRef, useState } from "react";
import { SITE } from "../content/site";
import { AVATAR_QA, AVATAR_SCOPE, answer } from "../content/avatar";

// Bare-bones take on Supabase's Realtime Avatar Stack: Presence shows who else is reading,
// and Dhruv's avatar opens a chat answered by Claude through a Cloudflare Worker (scripted fallback).
type Peer = { id: string; hue: number };
type Msg = { from: "you" | "me"; text: string };

function usePresence(room: string) {
  const [peers, setPeers] = useState<Peer[]>([]);
  useEffect(() => {
    if (!SITE.supabaseUrl || !SITE.supabaseKey) return;
    const me = { id: Math.random().toString(36).slice(2, 10), hue: Math.floor(Math.random() * 360) };
    let stop = () => {};
    import("@supabase/realtime-js").then(({ RealtimeClient }) => {
      const ws = SITE.supabaseUrl.replace(/^http/, "ws") + "/realtime/v1";
      const client = new RealtimeClient(ws, { params: { apikey: SITE.supabaseKey } });
      const ch = client.channel(room, { config: { presence: { key: me.id } } });
      ch.on("presence", { event: "sync" }, () => {
        const state = ch.presenceState<Peer>();
        setPeers(Object.values(state).flatMap((v) => (v[0] && v[0].id !== me.id ? [{ id: v[0].id, hue: v[0].hue }] : [])));
      }).subscribe((status) => {
        if (status === "SUBSCRIBED") ch.track(me);
      });
      stop = () => { ch.unsubscribe(); client.disconnect(); };
    });
    return () => stop();
  }, [room]);
  return peers;
}

type Pos = { x: number; y: number };
const POS_KEY = "sa-pos";
const clamp = (p: Pos): Pos => ({
  x: Math.min(Math.max(8, p.x), window.innerWidth - 60),
  y: Math.min(Math.max(8, p.y), window.innerHeight - 60),
});

export default function SiteAvatar() {
  const peers = usePresence("portfolio");
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [pos, setPos] = useState<Pos | null>(null);
  const drag = useRef<{ dx: number; dy: number; sx: number; sy: number; moved: boolean } | null>(null);
  const log = useRef<HTMLDivElement>(null);
  useEffect(() => { log.current?.scrollTo(0, log.current.scrollHeight); }, [msgs, busy]);

  useEffect(() => {
    try { const v = localStorage.getItem(POS_KEY); if (v) setPos(clamp(JSON.parse(v))); } catch { /* ignore */ }
    const onResize = () => setPos((p) => (p ? clamp(p) : p));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const onDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    drag.current = { dx: e.clientX - r.left, dy: e.clientY - r.top, sx: e.clientX, sy: e.clientY, moved: false };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    if (!d) return;
    if (!d.moved && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) < 6) return;
    d.moved = true;
    setPos(clamp({ x: e.clientX - d.dx, y: e.clientY - d.dy }));
  };
  const onUp = () => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    if (d.moved) { setPos((p) => { if (p) try { localStorage.setItem(POS_KEY, JSON.stringify(p)); } catch { /* ignore */ } return p; }); }
    else setOpen((o) => !o);
  };

  const ask = async (q: string) => {
    const text = q.trim();
    if (!text || busy) return;
    const history: Msg[] = [...msgs, { from: "you", text }];
    setMsgs(history);
    setDraft("");
    if (!SITE.avatarEndpoint) { setMsgs([...history, { from: "me", text: answer(text) ?? AVATAR_SCOPE }]); return; }
    setBusy(true);
    try {
      const r = await fetch(SITE.avatarEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history.map((m) => ({ role: m.from === "me" ? "assistant" : "user", content: m.text })) }),
      });
      const j = await r.json().catch(() => ({}));
      const reply = r.ok && j.text ? j.text
        : r.status === 429 ? "That's a lot of questions for one hour. Give me a little while, or use the contact form on the home page."
        : answer(text) ?? "I couldn't answer that just now. Try again in a moment.";
      setMsgs([...history, { from: "me", text: reply }]);
    } catch {
      setMsgs([...history, { from: "me", text: answer(text) ?? "I couldn't answer that just now. Try again in a moment." }]);
    } finally { setBusy(false); }
  };

  const shown = peers.slice(0, 3);
  const extra = peers.length - shown.length;
  const top = pos ? pos.y < window.innerHeight / 2 : false;
  const left = pos ? pos.x < window.innerWidth / 2 : false;
  const style: React.CSSProperties | undefined = pos
    ? {
        left: left ? pos.x : undefined,
        right: left ? undefined : window.innerWidth - pos.x - 52,
        top: top ? pos.y : undefined,
        bottom: top ? undefined : window.innerHeight - pos.y - 52,
        flexDirection: top ? "column-reverse" : "column",
        alignItems: left ? "flex-start" : "flex-end",
      }
    : undefined;

  return (
    <div className="sa" style={style}>
      {open ? (
        <div className="sa-panel" role="dialog" aria-label="Ask Dhruv anything">
          <div className="sa-head">
            <strong>Ask me anything</strong>
            <button type="button" className="sa-x" onClick={() => setOpen(false)} aria-label="Close">×</button>
          </div>
          <div className="sa-log" ref={log} aria-live="polite">
            <p className="sa-me">Hi, I'm Dhruv's AI avatar. Ask me about identity and access, my projects, or any topic you're curious about.</p>
            {msgs.map((m, i) => <p key={i} className={m.from === "me" ? "sa-me" : "sa-you"}>{m.text}</p>)}
            {busy ? <p className="sa-me sa-typing" aria-label="Thinking"><span /><span /><span /></p> : null}
          </div>
          {msgs.length === 0 ? (
            <div className="sa-chips">
              {AVATAR_QA.slice(0, 4).map((x) => <button type="button" key={x.q} onClick={() => ask(x.q)}>{x.q}</button>)}
            </div>
          ) : null}
          <form className="sa-form" onSubmit={(e) => { e.preventDefault(); ask(draft); }}>
            <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Ask anything" maxLength={1000} aria-label="Your question" disabled={busy} />
            <button type="submit" disabled={busy}>Ask</button>
          </form>
        </div>
      ) : null}
      <div className="sa-stack">
        {shown.map((p) => (
          <span key={p.id} className="sa-peer" style={{ background: `hsl(${p.hue} 55% 55%)` }} title="Someone else reading now" />
        ))}
        {extra > 0 ? <span className="sa-peer sa-more" title={`${extra} more reading now`}>+{extra}</span> : null}
        <button type="button" className="sa-dhruv" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpen((o) => !o); } }}
          aria-expanded={open} aria-label="Ask Dhruv anything (drag to move)" title="Drag to move, tap to chat">
          <img src={SITE.photo.src} alt="" width={48} height={48} draggable={false} />
        </button>
      </div>
    </div>
  );
}
