"use client";

// The maximalist layer: pop-ups nobody asked for, fake media players, confetti, floating 3D words,
// flashing banners and a swarm of unlabeled emoji buttons. Calm mode and reduced motion turn it off.
// Safety ceiling: nothing flashes faster than 2 times a second (WCAG 2.3.1 allows up to 3).

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useGame } from "@/lib/store";
import { sfx } from "@/lib/sound";

export const confetti = (n = 160) => window.dispatchEvent(new CustomEvent("sure:confetti", { detail: n }));

const NEON = ["#ff00ff", "#00ff00", "#0000ff", "#ffff00", "#00ffff", "#ff0080", "#ff8000"];
const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];

const POPUPS: { title: string; text: string; buttons: string[] }[] = [
  { title: "ERROR 404", text: "SLEEP NOT FOUND. Have you tried revising?", buttons: ["OK", "ALSO OK"] },
  { title: "CONGRATULATIONS!!!", text: "You are the 1,000,000th learner! Your prize: one (1) pass. Terms: you have to study.", buttons: ["CLAIM"] },
  { title: "WARNING", text: "Your brain is 87% full. Delete song lyrics to make room?", buttons: ["YES", "YES"] },
  { title: "SURE_THING.EXE", text: "This program has performed an illegal operation: it caught you rereading. Retrieval practice instead.", buttons: ["CLOSE"] },
  { title: "THE COLLECTOR", text: "Still here. Still waiting. The ledger never sleeps.", buttons: ["UGH"] },
  { title: "ARE YOU SURE?", text: "Are you SURE sure? Bet like it.", buttons: ["YES", "NO", "MAYBE"] },
  { title: "NEW MESSAGE (1)", text: "From: Future You. Subject: thanks for doing this now.", buttons: ["READ"] },
  { title: "VIRUS SCAN COMPLETE", text: "0 viruses found. 3 misconceptions found. Quarantine them in a Shift.", buttons: ["FIX THEM"] },
  { title: "TIP OF THE DAY", text: "Honest confidence is the winning strategy. The maths says so.", buttons: ["NEAT"] },
];
const WORDS = ["WOW!!", "BIG BRAIN", "100%", "EPIC", "SO SMART", "LOL", "SURE!!", "NULL ≠ NULL", "ACID!!", "+++"];
const EMOJI = ["🎉", "🙃", "🌈", "🤡", "💾", "🔊", "🧠", "💀", "🦄", "👽", "🍕", "📟", "🔥", "✨", "🐸", "🛸"];

/* ---------- pixelated emoji: draw tiny, scale up with image-rendering: pixelated ---------- */
const pixelCache = new Map<string, string>();
function pixelEmoji(e: string) {
  if (pixelCache.has(e)) return pixelCache.get(e)!;
  const c = document.createElement("canvas");
  c.width = c.height = 12;
  const x = c.getContext("2d")!;
  x.font = "10px sans-serif";
  x.textAlign = "center";
  x.textBaseline = "middle";
  x.fillText(e, 6, 7);
  const url = c.toDataURL();
  pixelCache.set(e, url);
  return url;
}

function useEmojiActions() {
  const questions = useGame((s) => s.questions);
  const sound = useGame((s) => s.settings.sound);
  const flash = (cls: string, ms: number) => {
    const h = document.documentElement;
    h.classList.add(cls);
    setTimeout(() => h.classList.remove(cls), ms);
  };
  return useCallback(
    (e: string, spawn: (p?: Partial<Popup>) => void) => {
      if (e === "🎉" || e === "✨") return confetti(220);
      if (e === "🙃") return flash("flip", 1500);
      if (e === "🌈" || e === "🦄") return flash("huerot", 2000);
      if (e === "🤡") return document.documentElement.classList.toggle("comic");
      if (e === "💀" || e === "🛸") return flash("shake", 650);
      if (e === "🔊" || e === "📟") return sound && sfx.mega();
      if (e === "🧠" && questions.length) {
        const q = pick(questions);
        return spawn({ title: "DID YOU KNOW?", text: q.explanation, buttons: ["NEAT"] });
      }
      spawn();
    },
    [questions, sound]
  );
}

export function EmojiSwarm({ count = 10, className = "" }: { count?: number; className?: string }) {
  const act = useEmojiActions();
  const spawn = (p?: Partial<Popup>) => window.dispatchEvent(new CustomEvent("sure:popup", { detail: p }));
  const set = useMemo(() => Array.from({ length: count }, () => pick(EMOJI)), [count]);
  return (
    <div className={`emoji-swarm ${className}`}>
      {set.map((e, i) => (
        <button key={i} className="emoji-btn" aria-label={`Mystery button ${e}`} title="?" onClick={() => act(e, spawn)}>
          <img src={pixelEmoji(e)} alt="" />
        </button>
      ))}
    </div>
  );
}

/* ---------- banners ---------- */

export function Banners() {
  return (
    <div className="banners" aria-hidden="true">
      <span className="gif g1">🔥 FREE KNOWLEDGE 🔥</span>
      <span className="gif g2">YOU ARE VISITOR #001337</span>
      <span className="gif g3 construction">🚧 UNDER CONSTRUCTION 🚧</span>
      <span className="gif g4 blink">CLICK HERE!!!</span>
      <span className="gif g5">BEST VIEWED IN NETSCAPE 4.0</span>
      <span className="gif g6">⭐ HOT ⭐ HOT ⭐</span>
    </div>
  );
}

/* ---------- the overlay layer ---------- */

interface Popup {
  id: number;
  title: string;
  text: string;
  buttons: string[];
  x: number;
  y: number;
  color: string;
}

export default function Chaos({ reduced }: { reduced: boolean }) {
  const questions = useGame((s) => s.questions);
  const [popups, setPopups] = useState<Popup[]>([]);
  const [players, setPlayers] = useState({ real: true, amp: true });
  const nextId = useRef(0);

  const spawn = useCallback(
    (p?: Partial<Popup>) => {
      const base = p?.title ? p : Math.random() < 0.3 && questions.length ? { title: "DID YOU KNOW?", text: pick(questions).explanation, buttons: ["NEAT"] } : pick(POPUPS);
      const id = nextId.current++;
      setPopups((list) => [
        ...list.slice(-5), // ponytail: at most 6 on screen at once
        { id, title: base.title!, text: base.text!, buttons: base.buttons ?? ["OK"], x: 4 + Math.random() * 60, y: 10 + Math.random() * 60, color: pick(NEON) },
      ]);
      setTimeout(() => setPopups((list) => list.filter((x) => x.id !== id)), 16000);
    },
    [questions]
  );

  // unrequested pop-ups, every 7-14 seconds
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const loop = () => {
      t = setTimeout(() => {
        spawn();
        loop();
      }, 7000 + Math.random() * 7000);
    };
    loop();
    const onPopup = (e: Event) => spawn((e as CustomEvent).detail);
    window.addEventListener("sure:popup", onPopup);
    return () => {
      clearTimeout(t);
      window.removeEventListener("sure:popup", onPopup);
    };
  }, [spawn]);

  return (
    <>
      {!reduced && <Confetti />}
      {!reduced && (
        <div className="floaters" aria-hidden="true">
          {WORDS.slice(0, 7).map((w, i) => (
            <span key={w} className="float3d" style={{ left: `${(i * 37 + 5) % 92}%`, top: `${(i * 53 + 12) % 85}%`, animationDelay: `${-i * 0.9}s`, color: NEON[i % NEON.length] }}>
              {w}
            </span>
          ))}
        </div>
      )}
      {players.real && (
        <div className="player real" role="complementary" aria-label="Decorative media player">
          <div className="win-title">
            <span>RealPlayer: lofi_nulls_to_study_to.rm</span>
            <button className="x" aria-label="Close player" onClick={() => setPlayers((p) => ({ ...p, real: false }))}>×</button>
          </div>
          <div className="screen">
            <span className="dvd">SURE THING</span>
          </div>
          <div className="seek"><i /></div>
          <span className="tiny">▶ BUFFERING… 99%</span>
        </div>
      )}
      {players.amp && (
        <div className="player amp" role="complementary" aria-label="Decorative music player">
          <div className="win-title">
            <span>WinAmp: JOINS (extended mix).mp3</span>
            <button className="x" aria-label="Close player" onClick={() => setPlayers((p) => ({ ...p, amp: false }))}>×</button>
          </div>
          <div className="bars" aria-hidden="true">
            {Array.from({ length: 14 }, (_, i) => (
              <i key={i} style={{ animationDelay: `${-i * 0.13}s` }} />
            ))}
          </div>
          <span className="tiny">00:42 / ∞  ♫ ♪ ♫</span>
        </div>
      )}
      {popups.map((p) => (
        <div key={p.id} className="win popup" role="alertdialog" aria-label={p.title} style={{ left: `${p.x}%`, top: `${p.y}%` }}>
          <div className="win-title" style={{ background: `linear-gradient(90deg, ${p.color}, #0000ff, ${p.color})` }}>
            <span>{p.title}</span>
            <button className="x" aria-label="Close" onClick={() => setPopups((l) => l.filter((x) => x.id !== p.id))}>×</button>
          </div>
          <div className="win-body">
            <p>{p.text}</p>
            <div className="row">
              {p.buttons.map((b, i) => (
                <button key={i} className="btn small" onClick={() => setPopups((l) => l.filter((x) => x.id !== p.id))}>
                  {b}
                </button>
              ))}
            </div>
          </div>
        </div>
      ))}
    </>
  );
}

/* ---------- neon confetti: a steady trickle plus bursts on demand ---------- */

function Confetti() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const el = ref.current!;
    const c = el.getContext("2d")!;
    type P = { x: number; y: number; vx: number; vy: number; r: number; vr: number; s: number; col: string };
    const parts: P[] = [];
    const add = (n: number, burst: boolean) => {
      for (let i = 0; i < n; i++)
        parts.push({
          x: burst ? el.width / 2 : Math.random() * el.width,
          y: burst ? el.height / 3 : -10,
          vx: burst ? (Math.random() - 0.5) * 16 : (Math.random() - 0.5) * 1.5,
          vy: burst ? -Math.random() * 14 : 1 + Math.random() * 2,
          r: Math.random() * 6,
          vr: (Math.random() - 0.5) * 0.3,
          s: 5 + Math.random() * 7,
          col: pick(NEON),
        });
    };
    const onBurst = (e: Event) => add(Math.min(300, (e as CustomEvent).detail ?? 160), true);
    window.addEventListener("sure:confetti", onBurst);
    let raf = 0;
    const loop = () => {
      if (el.width !== innerWidth || el.height !== innerHeight) {
        el.width = innerWidth;
        el.height = innerHeight;
      }
      if (parts.length < 45 && Math.random() < 0.4) add(1, false);
      c.clearRect(0, 0, el.width, el.height);
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.vy += 0.25 * (p.vy > 3 ? 0 : 1);
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.99;
        p.r += p.vr;
        if (p.y > el.height + 20) {
          parts.splice(i, 1);
          continue;
        }
        c.save();
        c.translate(p.x, p.y);
        c.rotate(p.r);
        c.fillStyle = p.col;
        c.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
        c.restore();
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("sure:confetti", onBurst);
    };
  }, []);
  return <canvas ref={ref} className="confetti" aria-hidden="true" />;
}
