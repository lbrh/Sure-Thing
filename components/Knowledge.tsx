"use client";
// Knowledge mechanics: Concept Bingo, Calibration Keno, Readiness Odds, Go Deeper, Mystery Facts and the Shift Report Card.

import { useState, type ReactNode } from "react";
import { Window } from "./ui";
import { useGame } from "@/lib/store";
import { examForecast, hashString } from "@/lib/engine";
import { bingoCard, bingoLines, bingoMarked, BINGO_LINE, DEEPER_CHIPS, FACT_ODDS, FREE, KENO_RULE, kenoBreakEven } from "@/lib/economy";
import { terms } from "@/lib/copy";

export function BingoCard() {
  const g = useGame();
  const card = bingoCard(g.concepts.map((c) => c.id), hashString(g.unit?.id ?? ""));
  const marked = bingoMarked(g.attempts);
  const name = (id: string) => g.concepts.find((c) => c.id === id)?.name ?? id;
  const lines = bingoLines(card, marked);
  return (
    <Window title="CONCEPT_BINGO.XLS">
      <div className="bingo" role="grid" aria-label={`Concept Bingo, ${lines} lines`}>
        {card.map((id, i) => {
          const on = id === FREE || marked.has(id);
          return (
            <span key={i} role="gridcell" className={`bingo-cell ${on ? "on" : ""}`} aria-label={`${id === FREE ? "Free" : name(id)}${on ? ", marked" : ""}`}>
              {id === FREE ? "FREE" : name(id)}
            </span>
          );
        })}
      </div>
      <p className="small">
        A square marks after 2 right answers (Pretty sure or Certain) in different Shifts. {lines} of 12 lines done. Each new line pays +{BINGO_LINE} at the end of its Shift.
      </p>
    </Window>
  );
}

export function KenoPanel() {
  const g = useGame();
  return (
    <Window title="CALIBRATION_KENO.EXE">
      <details>
        <summary>Mark what you expect to get right next Shift ({g.kenoMarks.length} marked)</summary>
        <p className="odds-list">{KENO_RULE}</p>
        <p className="small">Marking pays when you expect to be right more than {kenoBreakEven * 100}% of the time. Optional: mark nothing and Keno is off for that Shift.</p>
        <div className="keno">
          {g.concepts.map((c) => (
            <label key={c.id} className="keno-cell">
              <input type="checkbox" checked={g.kenoMarks.includes(c.id)} onChange={() => g.toggleKeno(c.id)} /> {c.name}
            </label>
          ))}
        </div>
      </details>
    </Window>
  );
}

export function ReadinessOdds() {
  const g = useGame();
  const f = examForecast(g.concepts.map((c) => g.conceptState[c.id]).filter(Boolean));
  return (
    <p className="small mono">
      EXAM DAY ESTIMATE: ABOUT {f.expected}/{f.of} RIGHT, FROM {f.answers} ANSWER{f.answers === 1 ? "" : "S"}. AN ESTIMATE, NOT A PREDICTION.
    </p>
  );
}

/** One harder follow-up, offered only after a right answer. */
export function GoDeeper() {
  const g = useGame();
  const r = g.reveal;
  const t = terms(g.settings.calm);
  if (!r || !r.correct || r.secondChance || g.session?.kind === "exam") return null;
  if (!r.deeper)
    return (
      <button className="btn" onClick={g.goDeeper}>
        Go Deeper: one harder question on this concept, +{DEEPER_CHIPS} {t.chips} if right. No bet, nothing to lose
      </button>
    );
  const q = g.questions.find((x) => x.id === r.deeper!.questionId);
  if (!q) return null;
  return (
    <div className="panel">
      <p className="mono small">GO DEEPER (DIFFICULTY {q.difficulty})</p>
      <p className="stem">{q.stem}</p>
      <div className="options">
        {q.options.map((o) => (
          <button key={o.id} className="btn option" disabled={Boolean(r.deeper!.chosen)} aria-pressed={r.deeper!.chosen === o.id} onClick={() => g.answerDeeper(o.id)}>
            <span className="letter">{o.id}</span>
            <span>{o.text}</span>
          </button>
        ))}
      </div>
      {r.deeper.chosen && (
        <p className="small">
          {r.deeper.correct ? `Right! +${DEEPER_CHIPS} ${t.chips}. ` : `Not this time. The answer is ${q.correct}. Nothing lost. `}
          {q.explanation}
        </p>
      )}
    </div>
  );
}

export function MysteryFact({ fact }: { fact?: string }) {
  if (!fact) return null;
  return (
    <Window title="MYSTERY_FACT.TXT" body="note">
      <strong>Unlocked:</strong> {fact}
      <p className="small">Right Certain answers unlock a fact {FACT_ODDS === 0.5 ? "1 time in 2" : `${FACT_ODDS * 100}% of the time`}. In Calm mode, every second one.</p>
    </Window>
  );
}

/** Scratch-style reveal of the Shift summary. The content is fixed before you scratch; Calm mode and reduced motion show it all at once. */
export function ScratchRows({ rows, instant }: { rows: [string, ReactNode][]; instant: boolean }) {
  const [shown, setShown] = useState<number[]>([]);
  const all = instant || shown.length >= rows.length;
  return (
    <>
      <table>
        <tbody>
          {rows.map(([label, value], i) => (
            <tr key={label}>
              <td>{label}</td>
              <td className="mono">
                {all || shown.includes(i) ? (
                  value
                ) : (
                  <button className="scratch" onClick={() => setShown([...shown, i])} aria-label={`Scratch to reveal ${label}`}>
                    SCRATCH
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!all && (
        <button className="btn small" onClick={() => setShown(rows.map((_, i) => i))}>
          Reveal all
        </button>
      )}
    </>
  );
}
