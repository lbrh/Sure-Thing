"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Window } from "./ui";
import { useGame, type ShopItem } from "@/lib/store";
import { rng } from "@/lib/engine";
import type { Hold } from "@/lib/board";
import { BJ_MULT, deal, handValue, hit, quizMultiplier, QUIZ_FAST_MS, QUIZ_SLOW_MS, RANKS, ROULETTE, rouletteSlot, stand, SUITS, type BJ, type Card } from "@/lib/minigames";
import { sfx } from "@/lib/sound";

/** Every shop item: copy, the popup's window name, and the odds shown before you buy. */
export const ITEM_INFO: Record<ShopItem, { name: string; effect: string; joke: string; odds?: string; kind: "tool" | "shift" | "peg" }> = {
  secondChance: { kind: "tool", name: "Second Chance", effect: "Your next wrong answer costs nothing and you get one retry.", joke: "Everyone deserves one. Just the one." },
  defuser: { kind: "tool", name: "Defuser", effect: "Pick a bomb and retest it now. Right with Pretty sure or Certain defuses it.", joke: "Snip the red wire. It's always the red wire." },
  magnet: { kind: "shift", name: "Magnet Peg", effect: "Next Shift: solid pegs pull in balls that pass close by.", joke: "Knowledge is attractive. Literally, this once." },
  mega: { kind: "shift", name: "MEGA BUCKET", effect: "Next Shift: the centre bucket pays x10 instead of x3.", joke: "The middle path, but make it absurd.", odds: "Centre bucket x10. Others unchanged." },
  quake: { kind: "shift", name: "Earthquake", effect: "Next Shift: gravity sways side to side. Total chaos, same odds for everyone.", joke: "The board is having a day." },
  roulette: { kind: "peg", name: "Roulette Peg", effect: "Grabs the ball and spins ROULETTE.EXE. The wheel sets that ball's multiplier.", joke: "Round and round she goes.", odds: `12 slots: x0 ×4, x1 ×3, x2 ×2, x3, x5, x10. Average x${(ROULETTE.reduce((a, b) => a + b) / 12).toFixed(2)}` },
  blackjack: { kind: "peg", name: "Blackjack Peg", effect: "Grabs the ball and deals you a hand of BLACKJACK.EXE. Win and the ball drops back in multiplied, still scoring pegs, and the multiplier stacks with its bucket.", joke: "The dealer stands on 17. The dealer is also a peg.", odds: "Ball x5 for blackjack · x3 for a win · x1 push · x0 lose or bust. Applied when it lands." },
  quiz: { kind: "peg", name: "Pop Quiz Peg", effect: "Grabs the ball and fires a question from your unit. The faster you get it right, the bigger the multiplier.", joke: "Even the chaos makes you revise. Quickly.", odds: `Right within ${QUIZ_FAST_MS / 1000}s x10, sliding to x2 by ${QUIZ_SLOW_MS / 1000}s · Wrong x0. No mastery change.` },
  splitter: { kind: "peg", name: "Splitter Peg", effect: "Splits a ball into three. The copies keep what the original had earned so far.", joke: "Mitosis, but for points." },
  blackhole: { kind: "peg", name: "Black Hole", effect: "Sucks nearby balls in and warps them back to the top for another run, +2 for the trip.", joke: "Spaghettification sold separately." },
  bumper: { kind: "peg", name: "Bumper", effect: "A big pinball bumper. BOING.", joke: "Some pegs just want to be loud." },
};

/* ---------- popups for captured balls ---------- */

export function HoldModal({ hold, onDone, sound }: { hold: Hold; onDone: (mult: number) => void; sound: boolean }) {
  const title = hold.kind === "roulette" ? "ROULETTE.EXE" : hold.kind === "blackjack" ? "BLACKJACK.EXE" : "POPQUIZ.EXE";
  return (
    <div className="modal-scrim" role="dialog" aria-modal="true" aria-label={title}>
      <Window title={title} tone={hold.kind === "quiz" ? "ok" : "alert"}>
        <p className="counter">
          {hold.kind === "blackjack" ? "WIN AND THE BALL DROPS ON, MULTIPLIED" : `BALL WORTH ${hold.ballValue} · PAYOUT = BALL × MULTIPLIER`}
        </p>
        {hold.kind === "roulette" && <Roulette seed={hold.seed} onDone={onDone} sound={sound} worth={hold.ballValue} />}
        {hold.kind === "blackjack" && <Blackjack seed={hold.seed} onDone={onDone} sound={sound} worth={hold.ballValue} />}
        {hold.kind === "quiz" && <Quiz seed={hold.seed} onDone={onDone} worth={hold.ballValue} />}
      </Window>
    </div>
  );
}

const WHEEL_COLORS: Record<number, string> = { 0: "#000000", 1: "#0000ff", 2: "#00aa00", 3: "#ff0000", 5: "#ff00ff", 10: "#ff8000" };

const pays = (worth: number, m: number) => ` = +${Math.round(worth * m)}`;

function Roulette({ seed, onDone, sound, worth }: { seed: number; onDone: (m: number) => void; sound: boolean; worth: number }) {
  const slot = rouletteSlot(rng(seed)()); // same outcome Skip would give
  const n = ROULETTE.length;
  const [angle, setAngle] = useState(0);
  const [stopped, setStopped] = useState(false);
  const gradient = `conic-gradient(${ROULETTE.map((m, i) => `${WHEEL_COLORS[m]} ${(i * 360) / n}deg ${((i + 1) * 360) / n}deg`).join(",")})`;

  useEffect(() => {
    const id = requestAnimationFrame(() => setAngle(360 * 6 - (slot * 360) / n - 180 / n));
    const ticks = sound ? Array.from({ length: 18 }, (_, i) => setTimeout(sfx.tick, 2400 * (1 - (1 - i / 18) ** 2))) : [];
    const stop = setTimeout(() => setStopped(true), 2500);
    return () => {
      cancelAnimationFrame(id);
      ticks.forEach(clearTimeout);
      clearTimeout(stop);
    };
  }, [slot, n, sound]);

  return (
    <>
      <div className="wheel-wrap">
        <div className="pointer" />
        <div className="wheel" style={{ background: gradient, transform: `rotate(${angle}deg)` }}>
          {ROULETTE.map((m, i) => {
            const a = ((i + 0.5) * 2 * Math.PI) / n;
            return (
              <span key={i} style={{ transform: `translate(${Math.sin(a) * 88}px, ${-Math.cos(a) * 88}px)` }}>
                <b>x{m}</b>
              </span>
            );
          })}
          <div className="hub-dot" />
        </div>
      </div>
      <p className="odds-list">{ITEM_INFO.roulette.odds}</p>
      {stopped ? (
        <>
          <p className="result-big rainbow">x{ROULETTE[slot]}!{pays(worth, ROULETTE[slot])}</p>
          <button className="btn success big" onClick={() => onDone(ROULETTE[slot])} autoFocus>
            OK
          </button>
        </>
      ) : (
        <p className="center mono blink">SPINNING...</p>
      )}
    </>
  );
}

function CardFace({ card, hidden }: { card: Card; hidden?: boolean }) {
  if (hidden) return <div className="card-face back" aria-label="Face-down card" />;
  const red = card.suit === 1 || card.suit === 2;
  return (
    <div className={`card-face ${red ? "red" : ""}`} aria-label={`${RANKS[card.rank]} ${SUITS[card.suit]}`}>
      {RANKS[card.rank]}
      {SUITS[card.suit]}
    </div>
  );
}

const BJ_TEXT = { blackjack: "BLACKJACK!!!", win: "YOU WIN!", push: "PUSH.", lose: "DEALER WINS.", bust: "BUST!" };

function Blackjack({ seed, onDone, sound, worth }: { seed: number; onDone: (m: number) => void; sound: boolean; worth: number }) {
  const [g, setG] = useState<BJ>(() => deal(seed));
  const act = (f: (b: BJ) => BJ) => {
    if (sound) sfx.card();
    setG(f);
  };
  return (
    <>
      <p className="caps">Dealer {g.result ? `(${handValue(g.dealer)})` : ""}</p>
      <div className="cards">
        {g.dealer.map((c, i) => (
          <CardFace key={i} card={c} hidden={i === 1 && !g.result} />
        ))}
      </div>
      <p className="caps">You ({handValue(g.player)})</p>
      <div className="cards">
        {g.player.map((c, i) => (
          <CardFace key={i} card={c} />
        ))}
      </div>
      <p className="odds-list">{ITEM_INFO.blackjack.odds}</p>
      {g.result ? (
        <>
          <p className={`result-big ${g.result === "blackjack" || g.result === "win" ? "rainbow" : ""}`}>
            {BJ_TEXT[g.result]} BALL x{BJ_MULT[g.result]}
          </p>
          <p className="small center">{BJ_MULT[g.result] ? "It drops back in and keeps scoring. The multiplier stacks with its bucket." : "The ball drops on, worth nothing."}</p>
          <button className="btn success big" onClick={() => onDone(BJ_MULT[g.result!])} autoFocus>
            OK
          </button>
        </>
      ) : (
        <div className="row">
          <button className="btn primary" style={{ flex: 1 }} onClick={() => act(hit)} autoFocus>
            Hit
          </button>
          <button className="btn danger" style={{ flex: 1 }} onClick={() => act(stand)}>
            Stand
          </button>
        </div>
      )}
    </>
  );
}

function Quiz({ seed, onDone, worth }: { seed: number; onDone: (m: number) => void; worth: number }) {
  const questions = useGame((s) => s.questions);
  const attempts = useGame((s) => s.attempts);
  const flagged = useGame((s) => s.flagged);
  const q = useMemo(() => {
    const seen = new Set(attempts.map((a) => a.conceptId));
    const pool = questions.filter((x) => !flagged.includes(x.id) && (seen.size === 0 || seen.has(x.conceptId)));
    return pool[Math.floor(rng(seed)() * pool.length)];
  }, [questions, attempts, flagged, seed]);
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
  const bonus = quizMultiplier(took);
  const mult = picked ? (right ? bonus : 0) : bonus;
  const drained = Math.min(1, Math.max(0, (took - QUIZ_FAST_MS) / (QUIZ_SLOW_MS - QUIZ_FAST_MS)));
  const answer = (id: string) => {
    if (picked) return;
    setTook(performance.now() - started.current);
    setPicked(id);
  };
  return (
    <>
      <p className="odds-list">{ITEM_INFO.quiz.odds}</p>
      <div className="row between">
        <span className={`counter big ${!picked && bonus >= 8 ? "blink" : ""}`} aria-live="off">
          <span className="lbl">SPEED BONUS</span>x{right || !picked ? bonus : 0}
        </span>
        <span className="mono">{(took / 1000).toFixed(1)}s</span>
      </div>
      <div className="progress quiz-timer" role="progressbar" aria-label="Speed bonus left" aria-valuenow={Math.round((1 - drained) * 100)} aria-valuemin={0} aria-valuemax={100}>
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
            {right ? `CORRECT IN ${(took / 1000).toFixed(1)}s! x${mult}${pays(worth, mult)}` : "NOPE. x0"}
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

/* ---------- MEGA HIT: shake + strobe ---------- */

export function MegaOverlay({ mult, value, chips }: { mult: number; value: number; chips: string }) {
  return (
    <div className="mega" role="status" aria-live="assertive">
      <p className="mega-text">
        MEGA HIT!!!
        <small>
          x{mult} · +{value} {chips}
        </small>
      </p>
    </div>
  );
}
