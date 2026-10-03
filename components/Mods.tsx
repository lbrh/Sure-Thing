"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Window } from "./ui";
import { useGame, type ShopItem } from "@/lib/store";
import { rng, type Question } from "@/lib/engine";
import { wheelResult, type Hold, type HoldResult } from "@/lib/board";
import { PRIZE_WHEEL, q21Bonus, Q21_TARGET, q21Worth, quizMultiplier, QUIZ_FAST_MS, QUIZ_SLOW_MS, wheelOdds } from "@/lib/minigames";
import { sfx } from "@/lib/sound";

/** Every shop item: copy, the popup's window name, and the odds shown before you buy. */
export const ITEM_INFO: Record<ShopItem | "alumni", { name: string; effect: string; joke: string; odds?: string; kind: "tool" | "shift" | "peg" }> = {
  secondChance: { kind: "tool", name: "Second Chance", effect: "Your next wrong answer costs nothing and you get one retry.", joke: "Everyone deserves one. Just the one." },
  defuser: { kind: "tool", name: "Defuser", effect: "Pick a bomb and retest it now. Right with Pretty sure or Certain defuses it.", joke: "Snip the red wire. It's always the red wire." },
  magnet: { kind: "shift", name: "Magnet Peg", effect: "Next Shift: solid pegs pull in balls that pass close by.", joke: "Knowledge is attractive. Literally, this once." },
  mega: { kind: "shift", name: "MEGA BUCKET", effect: "Next Shift: the centre bucket pays x10 instead of x3.", joke: "The middle path, but make it absurd.", odds: "Centre bucket x10. Others unchanged." },
  quake: { kind: "shift", name: "Earthquake", effect: "Next Shift: gravity sways side to side. Total chaos, same odds for everyone.", joke: "The board is having a day." },
  wheel: { kind: "peg", name: "Prize Wheel Peg", effect: "Catches the ball and spins the PRIZE WHEEL for bonus chips. The ball keeps its value and drops back in. Nothing is at stake. Segments grow +1 per tier, and +1 at a x2 streak (+2 at x3).", joke: "Big money! No money. Just chips.", odds: wheelOdds(PRIZE_WHEEL) },
  quiz21: { kind: "peg", name: "21 Quiz Peg", effect: "Catches the ball for a quick quiz. Each question is worth 2 to 10 by difficulty, shown first. After each right answer, hit for another or stand. Go over 21 or miss one and only the hand bonus is lost. Every right answer still pays 1.", joke: "Pontoon, but it's a pop quiz.", odds: "Bonus = hand / 3, rounded. Exactly 21 doubles it. No chance involved once you see the next question's value." },
  quiz: { kind: "peg", name: "Pop Quiz Peg", effect: "Catches the ball and fires a question from your unit. The faster you get it right, the bigger the multiplier.", joke: "Even the chaos makes you revise. Quickly.", odds: `Right within ${QUIZ_FAST_MS / 1000}s x10, sliding to x2 by ${QUIZ_SLOW_MS / 1000}s · Wrong keeps the ball at x1. No mastery change.` },
  splitter: { kind: "peg", name: "Splitter Peg", effect: "Splits a ball into three. The copies keep what the original had earned so far. With a Black Hole installed, the copies converge on the centre and warps land mid-board.", joke: "Mitosis, but for points." },
  blackhole: { kind: "peg", name: "Black Hole", effect: "Sucks nearby balls in and warps them back to the top for another run, +1 peg value for the trip.", joke: "Spaghettification sold separately." },
  alumni: { kind: "peg", name: "Alumni Peg", effect: "A rare peg for a weak concept from an earlier unit. Catches the ball and asks one of its questions. Right pays the ball x3, wrong keeps it at x1. Never for sale.", joke: "Old debts, new ledger.", odds: "Right x3 · Wrong x1. No chance involved." },
  bumper: { kind: "peg", name: "Bumper", effect: "A big pinball bumper. BOING. With the Magnet on, it fires balls at the nearest bomb peg.", joke: "Some pegs just want to be loud." },
};

/* ---------- popups for captured balls ---------- */

const TITLES = { wheel: "PRIZE_WHEEL.EXE", quiz21: "21_QUIZ.EXE", quiz: "POPQUIZ.EXE", alumni: "ALUMNI.EXE" } as const;

export function HoldModal({ hold, onDone, sound, reduced }: { hold: Hold; onDone: (r: HoldResult) => void; sound: boolean; reduced: boolean }) {
  const title = TITLES[hold.kind];
  return (
    <div className="modal-scrim" role="dialog" aria-modal="true" aria-label={title}>
      <Window title={title} tone={hold.kind === "wheel" ? "alert" : "ok"}>
        <p className="counter">BALL WORTH {hold.ballValue} · {hold.kind === "quiz" || hold.kind === "alumni" ? "PAYOUT = BALL × MULTIPLIER" : "KEEPS ITS VALUE, BONUS ON TOP"}</p>
        {hold.kind === "wheel" && <PrizeWheel hold={hold} onDone={onDone} sound={sound} reduced={reduced} />}
        {hold.kind === "quiz21" && <Quiz21 seed={hold.seed} onDone={onDone} sound={sound} />}
        {hold.kind === "quiz" && <Quiz seed={hold.seed} onDone={(m) => onDone({ mult: m })} worth={hold.ballValue} />}
        {hold.kind === "alumni" && <Quiz seed={hold.seed} onDone={(m) => onDone({ mult: m })} worth={hold.ballValue} alumni />}
      </Window>
    </div>
  );
}

const WHEEL_COLORS = ["#0000ff", "#00aa00", "#ff00ff", "#ff8000", "#008080", "#800080", "#ff0000", "#808000"];

function PrizeWheel({ hold, onDone, sound, reduced }: { hold: Hold; onDone: (r: HoldResult) => void; sound: boolean; reduced: boolean }) {
  const segs = hold.segments;
  const prize = wheelResult(hold); // same outcome Skip would give
  const slot = segs.indexOf(prize);
  const n = segs.length;
  const [angle, setAngle] = useState(0);
  const [stopped, setStopped] = useState(reduced);
  const gradient = `conic-gradient(${segs.map((_, i) => `${WHEEL_COLORS[i % WHEEL_COLORS.length]} ${(i * 360) / n}deg ${((i + 1) * 360) / n}deg`).join(",")})`;

  useEffect(() => {
    if (reduced) return setAngle(-(slot * 360) / n - 180 / n);
    const id = requestAnimationFrame(() => setAngle(360 * 6 - (slot * 360) / n - 180 / n));
    const ticks = sound ? Array.from({ length: 18 }, (_, i) => setTimeout(sfx.tick, 2400 * (1 - (1 - i / 18) ** 2))) : [];
    const stop = setTimeout(() => setStopped(true), 2500);
    return () => {
      cancelAnimationFrame(id);
      ticks.forEach(clearTimeout);
      clearTimeout(stop);
    };
  }, [slot, n, sound, reduced]);

  return (
    <>
      <div className="wheel-wrap">
        <div className="pointer" />
        <div className="wheel" style={{ background: gradient, transform: `rotate(${angle}deg)` }}>
          {segs.map((m, i) => {
            const a = ((i + 0.5) * 2 * Math.PI) / n;
            return (
              <span key={i} style={{ transform: `translate(${Math.sin(a) * 84}px, ${-Math.cos(a) * 84}px)` }}>
                <b>+{m}</b>
              </span>
            );
          })}
          <div className="hub-dot" />
        </div>
      </div>
      <p className="odds-list">ODDS: {wheelOdds(segs)}</p>
      {stopped ? (
        <>
          <p className="result-big">+{prize} BONUS</p>
          <button className="btn success big" onClick={() => onDone({ bonus: prize })} autoFocus>
            OK
          </button>
        </>
      ) : (
        <p className="center mono">SPINNING...</p>
      )}
    </>
  );
}

/** Questions for popups: from concepts you've seen, never flagged ones. */
function usePopupPool() {
  const questions = useGame((s) => s.questions);
  const attempts = useGame((s) => s.attempts);
  const flagged = useGame((s) => s.flagged);
  return useMemo(() => {
    const seen = new Set(attempts.map((a) => a.conceptId));
    return questions.filter((x) => !flagged.includes(x.id) && (seen.size === 0 || seen.has(x.conceptId)));
  }, [questions, attempts, flagged]);
}

function Quiz21({ seed, onDone, sound }: { seed: number; onDone: (r: HoldResult) => void; sound: boolean }) {
  const pool = usePopupPool();
  // the whole draw is fixed by the seed, so the next question's value is known before you hit
  const draws = useMemo(() => {
    const rand = rng(seed);
    const order = pool.map((q) => ({ q, r: rand() })).sort((a, b) => a.r - b.r).map((x) => x.q);
    return order.slice(0, 8).map((q: Question) => ({ q, worth: q21Worth(q.difficulty, rand()) }));
  }, [pool, seed]);
  const [i, setI] = useState(0);
  const [hand, setHand] = useState<number[]>([]);
  const [right, setRight] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [end, setEnd] = useState<"stand" | "bust" | null>(null);
  const total = hand.reduce((a, b) => a + b, 0);

  if (draws.length === 0) return <button className="btn big" onClick={() => onDone({})} autoFocus>OK</button>;
  const cur = draws[i];
  const answer = (id: string) => {
    if (picked) return;
    setPicked(id);
    if (sound) sfx.tick();
    if (id !== cur.q.correct) return setEnd("bust");
    const next = [...hand, cur.worth];
    const t = next.reduce((a, b) => a + b, 0);
    setHand(next);
    setRight((r) => r + 1);
    if (t > Q21_TARGET) setEnd("bust");
    else if (t === Q21_TARGET || i + 1 >= draws.length) setEnd("stand");
  };
  const hit = () => {
    setI(i + 1);
    setPicked(null);
  };
  const bonus = q21Bonus(total, end === "bust");
  const nextWorth = draws[i + 1]?.worth;

  return (
    <>
      <p className="odds-list">{ITEM_INFO.quiz21.odds}</p>
      <div className="row between">
        <div className="q21-hand" aria-label={`Hand ${total}`}>
          {hand.map((w, k) => (
            <span key={k} className="q21-chip">{w}</span>
          ))}
        </div>
        <span className="counter big"><span className="lbl">HAND</span>{total}/21</span>
      </div>
      {!end && (
        <>
          <p className="mono">THIS QUESTION IS WORTH {cur.worth} (DIFFICULTY {cur.q.difficulty})</p>
          <p className="stem">{cur.q.stem}</p>
          <div className="options">
            {cur.q.options.map((o) => (
              <button key={o.id} role="radio" aria-checked={picked === o.id} disabled={picked !== null} className="btn option" onClick={() => answer(o.id)}>
                <span className="letter">{o.id}</span>
                <span>{o.text}</span>
              </button>
            ))}
          </div>
          {picked && (
            <>
              <p className="small">Right! +1. {nextWorth !== undefined && `Next question is worth ${nextWorth}${total + nextWorth > Q21_TARGET ? `, which would take you over ${Q21_TARGET}` : ""}.`}</p>
              <div className="row">
                <button className="btn primary" style={{ flex: 1 }} onClick={hit} autoFocus>Hit</button>
                <button className="btn" style={{ flex: 1 }} onClick={() => setEnd("stand")}>Stand</button>
              </div>
            </>
          )}
        </>
      )}
      {end && (
        <>
          <p className="result-big">
            {end === "bust" ? "HAND BONUS BUSTED" : total === Q21_TARGET ? "EXACTLY 21! BONUS DOUBLED" : "STOOD"}
          </p>
          {picked && picked !== cur.q.correct && (
            <p className="answer-line">Answer: <strong>{cur.q.correct}. {cur.q.options.find((o) => o.id === cur.q.correct)?.text}</strong></p>
          )}
          <p className="mono center">+{right} FOR RIGHT ANSWERS · +{bonus} HAND BONUS</p>
          <button className="btn success big" onClick={() => onDone({ skill: right, bonus })} autoFocus>OK</button>
        </>
      )}
    </>
  );
}

const pays = (worth: number, m: number) => ` = +${Math.round(worth * m)}`;

function Quiz({ seed, onDone, worth, alumni }: { seed: number; onDone: (m: number) => void; worth: number; alumni?: boolean }) {
  const seen = usePopupPool();
  const questions = useGame((s) => s.questions);
  const flagged = useGame((s) => s.flagged);
  const alumniIds = useGame((s) => s.meta.alumni.map((a) => a.concept.id).join(","));
  const pool = useMemo(
    () => (alumni ? questions.filter((q) => !flagged.includes(q.id) && alumniIds.split(",").includes(q.conceptId)) : seen),
    [seen, questions, flagged, alumni, alumniIds]
  );
  const q = useMemo(() => pool[Math.floor(rng(seed)() * pool.length)], [pool, seed]);
  const [picked, setPicked] = useState<string | null>(null);
  const [took, setTook] = useState(0); // ms on the clock: live until you answer, then frozen
  const started = useRef(0);
  useEffect(() => {
    if (picked) return;
    started.current ||= performance.now();
    const id = setInterval(() => setTook(performance.now() - started.current), 100);
    return () => clearInterval(id);
  }, [picked]);

  if (!q) return <button className="btn big" onClick={() => onDone(1)} autoFocus>OK</button>;
  const right = picked === q.correct;
  const bonus = alumni ? 3 : quizMultiplier(took); // Alumni: a flat x3, no clock
  const mult = picked ? (right ? bonus : 1) : bonus;
  const drained = Math.min(1, Math.max(0, (took - QUIZ_FAST_MS) / (QUIZ_SLOW_MS - QUIZ_FAST_MS)));
  const answer = (id: string) => {
    if (picked) return;
    setTook(performance.now() - started.current);
    setPicked(id);
  };
  return (
    <>
      <p className="odds-list">{ITEM_INFO[alumni ? "alumni" : "quiz"].odds}</p>
      <div className="row between">
        <span className={`counter big ${!picked && bonus >= 8 ? "blink" : ""}`} aria-live="off">
          <span className="lbl">{alumni ? "BONUS" : "SPEED BONUS"}</span>x{right || !picked ? bonus : 1}
        </span>
        <span className="mono">{(took / 1000).toFixed(1)}s</span>
      </div>
      <div hidden={alumni} className="progress quiz-timer" role="progressbar" aria-label="Speed bonus left" aria-valuenow={Math.round((1 - drained) * 100)} aria-valuemin={0} aria-valuemax={100}>
        <div style={{ width: `${(1 - drained) * 100}%` }} />
      </div>
      <p className="stem">{q.stem}</p>
      <div className="options">
        {q.options.map((o) => (
          <button
            key={o.id}
            role="radio"
            aria-checked={picked === o.id}
            disabled={picked !== null}
            className="btn option"
            onClick={() => answer(o.id)}
            style={picked && o.id === q.correct ? { background: "#00ff00", color: "#000", textDecoration: "none" } : undefined}
          >
            <span className="letter">{o.id}</span>
            <span>{o.text}</span>
          </button>
        ))}
      </div>
      {picked && (
        <>
          <p className={`result-big ${right ? "rainbow" : ""}`}>
            {right ? `CORRECT IN ${(took / 1000).toFixed(1)}s! x${mult}${pays(worth, mult)}` : `NOT THIS TIME. BALL KEEPS x1${pays(worth, 1)}`}
          </p>
          {!right && (
            <p className="answer-line">
              Answer: <strong>{q.correct}. {q.options.find((o) => o.id === q.correct)?.text}</strong>
            </p>
          )}
          <p className="small">{q.explanation}</p>
          <button className="btn success big" onClick={() => onDone(mult)} autoFocus>
            OK
          </button>
        </>
      )}
    </>
  );
}

/* ---------- Cheer: sized to the payout, never for an outcome no better than what you had ---------- */

const CHEER = ["", "NICE!", "SUPER DROP!", "MEGA HIT!"];

export function CheerOverlay({ level, value, chips }: { level: 1 | 2 | 3; value: number; chips: string }) {
  return (
    <div className={`cheer lvl${level}`} role="status" aria-live="polite">
      <p className="cheer-text">
        {CHEER[level]}
        <small>+{value} {chips}</small>
      </p>
    </div>
  );
}
