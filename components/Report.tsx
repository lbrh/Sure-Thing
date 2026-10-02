"use client";

import { useState } from "react";
import { useDerived, useGame } from "@/lib/store";
import { calibration, calibrationByLevel, mastery, pegState, tonightsPlan, type PegState } from "@/lib/engine";
import { CONF_LABEL } from "@/lib/copy";
import { brier, calibrationGap, calibrationGrade, CAL_WINDOW } from "@/lib/economy";
import { Counter, Window } from "./ui";

const FLAG: Record<PegState, string> = { solid: "Solid", shaky: "Shaky", cold: "Not tried", bomb: "BOMB" };

export default function Report() {
  const g = useGame();
  const { ready, days, states } = useDerived();
  const [copied, setCopied] = useState(false);
  const cal = calibration(g.attempts);
  const recentGap = calibrationGap(g.attempts);
  const grade = calibrationGrade(recentGap);
  const brierAll = brier(g.attempts);
  const name = (id: string) => g.concepts.find((c) => c.id === id)?.name ?? id;
  const sureWrong = states.filter((s) => s.confidentWrong > 0).sort((a, b) => b.confidentWrong - a.confidentWrong);
  const plan = tonightsPlan(states, days);
  const gap = cal?.gapPoints ?? 0;
  const gapText = !cal ? "No answers yet" : Math.abs(gap) <= 5 ? `${gap > 0 ? "+" : ""}${gap} pts (well calibrated)` : gap > 0 ? `+${gap} pts (overconfident)` : `${gap} pts (underconfident)`;

  const share = async () => {
    const worst = sureWrong[0];
    const text = worst
      ? `I was certain about ${name(worst.conceptId)}. I was wrong. Readiness ${ready}% (estimate) on Sure Thing.`
      : `Readiness ${ready}% (estimate), confidence gap ${gapText}, on Sure Thing.`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      prompt("Copy this:", text);
    }
  };

  return (
    <section className="report">
      <Window title="READINESS_REPORT.DOC">
        <div className="row between">
          <h2 className="rainbow">Readiness</h2>
          <Counter label="ESTIMATE %" value={ready} digits={3} big />
        </div>
        <p className="mono">CONFIDENCE GAP: {gapText.toUpperCase()}</p>
        <p className="mono">
          CALIBRATION GRADE {grade}/3
          {recentGap !== null && ` (GAP ${recentGap.toFixed(1)} PTS OVER LAST ${Math.min(CAL_WINDOW, g.attempts.length)})`}
          {brierAll !== null && ` · BRIER ${brierAll.toFixed(2)} (LOWER IS BETTER)`}
        </p>
        <p className="small">Grade 3: within 5 points. 2: within 10. 1: within 15. Guess counts as 35% sure, Pretty sure 67%, Certain 92%.</p>
        <p className="mono">LEDGER DEBT {g.debt}</p>
        <p className="small">
          Based on {g.attempts.length} answer{g.attempts.length === 1 ? "" : "s"}
          {g.exam ? `, including Exam Day (${g.exam.correct}/${g.exam.total})` : ""}. An estimate to guide revision, not a grade prediction.
        </p>
      </Window>

      <div className="grid2">
        <Window title="TOPICS.XLS" body="plain">
          <table>
            <thead>
              <tr><th>Topic</th><th>Mastery</th><th>Flag</th></tr>
            </thead>
            <tbody>
              {g.concepts.map((c) => {
                const s = g.conceptState[c.id];
                const ps = pegState(s);
                return (
                  <tr key={c.id}>
                    <td>{c.name}</td>
                    <td>
                      {ps === "cold" ? (
                        <span className="mono">-</span>
                      ) : (
                        <span className="bar" aria-label={`${Math.round(mastery(s) * 100)}%`}><span style={{ width: `${mastery(s) * 100}%` }} /></span>
                      )}
                    </td>
                    <td className={`flag ${ps}`}>{FLAG[ps]}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Window>

        <div>
          <Window title="SURE_AND_WRONG.TXT" tone="alert">
            <p>{sureWrong.length ? sureWrong.map((s) => `${name(s.conceptId)} (${s.confidentWrong})`).join(", ") : "Nowhere yet. Keep betting honestly."}</p>
          </Window>
          <Window title={`TONIGHTS_PLAN.TXT - ${Math.max(1, plan.length) * 8} MIN`} body="note">
            <ol>
              {plan.map((p) => (
                <li key={p.conceptId}>
                  <strong>{name(p.conceptId)}</strong>: {p.action}
                </li>
              ))}
            </ol>
            <div className="row">
              <button className="btn success" onClick={g.startShift}>Start tonight&apos;s Shift</button>
              <button className="btn" onClick={share}>{copied ? "Copied" : "Share"}</button>
              <button className="btn" onClick={() => g.go("hub")}>Hub</button>
            </div>
          </Window>
          <Window title="CALIBRATION.GIF">
            <details>
              <summary>Calibration chart</summary>
              <CalibrationChart />
              <p className="small">Dashed line: perfectly calibrated. Dots below it mean you were more sure than right.</p>
              {cal && <p className="small mono">BRIER SCORE {cal.brier.toFixed(2)} (LOWER IS BETTER)</p>}
            </details>
          </Window>
        </div>
      </div>
    </section>
  );
}

function CalibrationChart() {
  const attempts = useGame((s) => s.attempts);
  const rows = calibrationByLevel(attempts);
  const S = 220;
  const P = 32;
  const T = 24; // headroom for labels above a 100% dot
  const x = (v: number) => P + v * (S - P - 16);
  const y = (v: number) => S - P - v * (S - P - T);
  return (
    <svg viewBox={`0 0 ${S} ${S}`} className="calchart" role="img" aria-label={rows.map((r) => `${CONF_LABEL[r.confidence]}: ${r.accuracy === null ? "no answers" : `${Math.round(r.accuracy * 100)}% right from ${r.n}`}`).join(". ")}>
      <line x1={x(0)} y1={y(0)} x2={x(1)} y2={y(1)} className="diag" />
      <line x1={x(0)} y1={y(0)} x2={x(1)} y2={y(0)} className="axis" />
      <line x1={x(0)} y1={y(0)} x2={x(0)} y2={y(1)} className="axis" />
      <text x={x(0.5)} y={S - 6} textAnchor="middle">how sure you said</text>
      <text x={10} y={y(0.5)} textAnchor="middle" transform={`rotate(-90 10 ${y(0.5)})`}>how often right</text>
      {rows.map((r) =>
        r.accuracy === null ? null : (
          <g key={r.confidence}>
            <circle cx={x(r.stated)} cy={y(r.accuracy)} r={4 + Math.min(8, r.n)} className={`dot ${r.confidence}`} />
            <text x={x(r.stated)} y={y(r.accuracy) - 12} textAnchor="middle">{CONF_LABEL[r.confidence]}</text>
          </g>
        )
      )}
    </svg>
  );
}
