"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Board from "./Board";
import Report from "./Report";
import Shop from "./Shop";
import { HoldModal, ITEM_INFO, MegaOverlay } from "./Mods";
import { ColorSquares, Counter, Marquee, Window } from "./ui";
import Chaos, { Banners, EmojiSwarm, confetti } from "./Chaos";
import Seal, { sealDo } from "./Seal";
import { inProgress, useDerived, useGame, SHIFT_LENGTH } from "@/lib/store";
import { layoutPegs, placeSpecials, type Hold, type PegSpec } from "@/lib/board";
import { BALLS, PENALTY, badge, hashString, pegState, streakMultiplier, type Confidence, type OptionId, type PegState } from "@/lib/engine";
import { CONF_LABEL, LINES, terms } from "@/lib/copy";
import { sfx } from "@/lib/sound";
import { loadUnit, SEEDED } from "@/lib/loadUnit";

const CONFS: Confidence[] = ["guess", "pretty", "certain"];
const STATE_LABEL: Record<PegState, string> = { solid: "Solid", shaky: "Shaky", cold: "Not tried", bomb: "BOMB" };
const MARQUEE: [string, string][] = [
  ["WELCOME TO SURE THING", "#ffff00"],
  ["BET ON WHAT YOU KNOW", "#00ff00"],
  ["NO REAL MONEY, EVER", "#ff0000"],
  ["CHIPS CAN'T BE BOUGHT", "#00ffff"],
  ["NEW! ROULETTE PEG IN THE SHOP", "#ff00ff"],
  ["HONEST CONFIDENCE ALWAYS PAYS BEST", "#ffffff"],
  ["BEST VIEWED AT 800x600", "#ffff00"],
];

export default function App() {
  const g = useGame();
  const { days, debt } = useDerived();
  const t = terms(g.settings.calm);
  const prefersReduced = usePrefersReducedMotion();
  const reduced = g.settings.reducedMotion || prefersReduced;

  const chaos = !g.settings.calm && g.settings.skin === "chaos"; // skin picked in the Shop; Calm mode always wins
  useEffect(() => {
    document.documentElement.dataset.calm = g.settings.calm ? "1" : "";
    document.documentElement.dataset.chaos = chaos ? "1" : "";
  }, [g.settings.calm, chaos]);

  if (!g.unit || g.screen === "setup")
    return (
      <>
        {chaos && <Chaos reduced={reduced} />}
        <Setup />
        <Seal />
      </>
    );

  return (
    <div className="shell">
      <Marquee items={MARQUEE} />
      {chaos && <Banners />}
      <header className="topbar">
        <button className="logo rainbow" onClick={() => g.go("hub")} aria-label="Sure Thing, go to hub">
          SURE THING
        </button>
        {chaos && <EmojiSwarm count={9} />}
        <div className="topstats">
          <Counter label="DAYS" value={days} digits={2} />
          <Counter label={t.Chips.toUpperCase()} value={g.chips} />
          <Counter label="STREAK" value={g.streak} digits={2} />
          <span className="hide-sm">
            <Counter label="DEBT" value={`${debt}%`} />
          </span>
          <button className="btn small" onClick={() => g.go("settings")}>
            Settings
          </button>
        </div>
      </header>
      <main className="main">
        <Screen reduced={reduced} />
      </main>
      {chaos && <EmojiSwarm count={24} className="footer-swarm" />}
      {chaos && <Chaos reduced={reduced} />}
      <Seal />
      <Announcer />
    </div>
  );
}

function Screen({ reduced }: { reduced: boolean }) {
  const screen = useGame((s) => s.screen);
  switch (screen) {
    case "intro":
      return <Intro reduced={reduced} />;
    case "draw":
      return <Draw />;
    case "question":
      return <QuestionScreen reduced={reduced} />;
    case "reveal":
    case "board": // older saves
      return <RevealScreen reduced={reduced} />;
    case "summary":
      return <Summary />;
    case "shop":
      return <Shop />;
    case "report":
      return <Report />;
    case "settings":
      return <SettingsScreen />;
    default:
      return <Hub reduced={reduced} />;
  }
}

/* ---------- shared bits ---------- */

function usePrefersReducedMotion() {
  const [r, setR] = useState(false);
  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    setR(m.matches);
    const on = () => setR(m.matches);
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  return r;
}

function usePegs() {
  const unit = useGame((s) => s.unit);
  const concepts = useGame((s) => s.concepts);
  const conceptState = useGame((s) => s.conceptState);
  const owned = useGame((s) => s.inventory.pegs);
  const pegs = useMemo(
    () => placeSpecials(layoutPegs(concepts.map((c) => c.id), hashString(unit?.id ?? "")), owned),
    [concepts, unit?.id, owned]
  );
  const states = useMemo(() => Object.fromEntries(concepts.map((c) => [c.id, pegState(conceptState[c.id])])), [concepts, conceptState]);
  return { pegs, states };
}

function MiniBoard({ reduced, popIn, onPeg }: { reduced: boolean; popIn?: boolean; onPeg?: (p: PegSpec) => void }) {
  const { pegs, states } = usePegs();
  const settings = useGame((s) => s.settings);
  const concepts = useGame((s) => s.concepts);
  const mega = useGame((s) => s.inventory.mega);
  const label = `Knowledge board. ${concepts.map((c) => `${c.name}: ${STATE_LABEL[states[c.id]]}`).join(". ")}.`;
  return <Board pegs={pegs} states={states} popIn={popIn && !reduced} showMega={mega} calm={settings.calm} reducedMotion={reduced} onPegClick={onPeg} label={label} />;
}

const ICONS: Record<PegState, React.ReactNode> = {
  solid: <circle cx="9" cy="9" r="6" fill="#00ff00" />,
  shaky: <circle cx="9" cy="9" r="5" fill="none" stroke="#ffff00" strokeWidth="3" />,
  cold: <circle cx="9" cy="9" r="4" fill="none" stroke="#808080" strokeWidth="2" />,
  bomb: (
    <>
      <path d="M9 1 17 9 9 17 1 9Z" fill="#ff0000" />
      <path d="M6 6l6 6M12 6l-6 6" stroke="#000" strokeWidth="2" />
    </>
  ),
};

function Legend() {
  const owned = useGame((s) => s.inventory.pegs);
  const rows: [PegState, string][] = [
    ["solid", "Solid: you know it"],
    ["shaky", "Shaky: still learning"],
    ["cold", "Not tried yet"],
    ["bomb", "Bomb: sure and wrong"],
  ];
  return (
    <>
      <ul className="legend" aria-label="Peg key">
        {rows.map(([k, text]) => (
          <li key={k}>
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">{ICONS[k]}</svg> {text}
          </li>
        ))}
      </ul>
      {owned.length > 0 && <p className="small">Installed: {owned.map((k) => ITEM_INFO[k].name).join(", ")}. Tap one to see what it does.</p>}
    </>
  );
}

export function OddsTable() {
  const calm = useGame((s) => s.settings.calm);
  const t = terms(calm);
  return (
    <table>
      <caption>How scoring works</caption>
      <thead>
        <tr>
          <th>{t.Bet}</th>
          <th>If right</th>
          <th>If wrong</th>
        </tr>
      </thead>
      <tbody>
        {CONFS.map((c) => (
          <tr key={c}>
            <td>{CONF_LABEL[c]}</td>
            <td className="mono">{BALLS[c]} ball{BALLS[c] > 1 ? "s" : ""}</td>
            <td className="mono">
              lose {PENALTY[c]} {PENALTY[c] === 1 ? t.chip : t.chips}
              {c === "certain" ? " + bomb" : ""}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Collector({ line }: { line: string }) {
  if (!line) return null;
  return (
    <Window title="THE_COLLECTOR.TXT" body="note" className="collector">
      “{line}”
    </Window>
  );
}

function Announcer() {
  const reveal = useGame((s) => s.reveal);
  const concepts = useGame((s) => s.concepts);
  const name = concepts.find((c) => c.id === reveal?.conceptId)?.name;
  const msg = !reveal ? "" : reveal.bombPlanted ? `Bomb planted on ${name}` : reveal.bombDefused ? `Bomb defused on ${name}` : reveal.correct ? "Correct" : "Not this time";
  return (
    <div className="sr-only" aria-live="polite">
      {msg}
    </div>
  );
}

function PegCard({ peg, onClose }: { peg: PegSpec; onClose: () => void }) {
  const g = useGame();
  if (peg.special) {
    const info = ITEM_INFO[peg.special];
    return (
      <Window title={`${info.name.toUpperCase()}.PEG`}>
        <p>{info.effect}</p>
        {info.odds && <p className="odds-list">ODDS: {info.odds}</p>}
        <button className="btn small" onClick={onClose}>Close</button>
      </Window>
    );
  }
  const c = g.concepts.find((x) => x.id === peg.conceptId);
  const s = c && g.conceptState[c.id];
  const last = [...g.attempts].reverse().find((a) => a.conceptId === peg.conceptId);
  if (!c || !s) return null;
  return (
    <Window title={`${c.name.toUpperCase()}.TXT`}>
      <p>{c.summary}</p>
      <p className="mono small">
        {STATE_LABEL[pegState(s)]} · BOX {s.box}/5 · {s.correctCount}/{s.attempts} RIGHT
        {last ? ` · LAST: ${last.correct ? "RIGHT" : "WRONG"} (${CONF_LABEL[last.confidence]})` : ""}
      </p>
      <button className="btn small" onClick={onClose}>Close</button>
    </Window>
  );
}

/* ---------- Setup ---------- */

function Setup() {
  const setup = useGame((s) => s.setup);
  const [name, setName] = useState("Databases 101");
  const [date, setDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 9);
    return d.toISOString().slice(0, 10);
  });
  const [busy, setBusy] = useState("");
  const dayCount = Math.max(0, Math.round((new Date(date + "T00:00:00").getTime() - new Date(new Date().toDateString()).getTime()) / 86_400_000));

  const build = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !date) return;
    const res = await loadUnit(name.trim(), date, setBusy);
    setBusy("");
    setup(res.unit, res.concepts, res.questions);
    if (res.fallback) useGame.setState({ line: res.fallback });
  };

  return (
    <main className="setup">
      <h1 className="title rainbow">SURE THING</h1>
      <p className="tagline">Know what you don&apos;t know!!</p>
      <Window title="NEW_UNIT.EXE">
        <form onSubmit={build}>
          <div className="field">
            <label htmlFor="unit">What&apos;s the unit?</label>
            <input id="unit" list="seeded-units" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} required />
            <datalist id="seeded-units">
              {SEEDED.map((s) => (
                <option key={s.bank.unit.id} value={s.bank.unit.name} />
              ))}
            </datalist>
            <div className="row">
              {SEEDED.map((s) => (
                <button key={s.bank.unit.id} type="button" className={`btn small ${name === s.bank.unit.name ? "primary" : ""}`} onClick={() => setName(s.bank.unit.name)}>
                  {s.bank.unit.name}
                </button>
              ))}
            </div>
          </div>
          <div className="field">
            <label htmlFor="exam">When&apos;s the exam?</label>
            <div className="row">
              <input id="exam" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
              <Counter label="DAYS" value={dayCount} digits={2} />
            </div>
          </div>
          <button className="btn success big" disabled={Boolean(busy)}>
            {busy || "Build my board"}
          </button>
          <p className="small">
            {SEEDED.map((s) => s.bank.unit.name).join(" and ")} are hand-checked units that work offline. Any other unit is written by AI, checked by a second AI pass, and falls back to Databases 101 if anything goes wrong.
          </p>
        </form>
      </Window>
      <ColorSquares />
      <EmojiSwarm count={18} />
      <p className="construction center">
        <span className="construction-label">No real money, ever. Chips can&apos;t be bought, sold or cashed out.</span>
      </p>
    </main>
  );
}

/* ---------- Intro (board builds, meet The Collector) ---------- */

function Intro({ reduced }: { reduced: boolean }) {
  const g = useGame();
  return (
    <div className="grid2">
      <section>
        <h2>Your board</h2>
        <p>Every concept in {g.unit?.name} is a peg. Right now they&apos;re all cold. Bet on what you know and the board changes.</p>
        <Collector line={g.line} />
        <Window title="README.TXT" body="note">
          <strong>One rule:</strong> before every answer, bet on how sure you are. Right and sure pays more. Wrong and sure costs more. <em>Be honest.</em>
          <OddsTable />
        </Window>
        <button className="btn success big" onClick={g.startShift} autoFocus>
          Start my first Shift
        </button>
      </section>
      <Window title="BOARD.EXE" body="plain">
        <MiniBoard reduced={reduced} popIn />
        <Legend />
      </Window>
    </div>
  );
}

/* ---------- Hub ---------- */

function Hub({ reduced }: { reduced: boolean }) {
  const g = useGame();
  const { days, debt, bombs, states } = useDerived();
  const [peg, setPeg] = useState<PegSpec | null>(null);
  const t = terms(g.settings.calm);
  const name = (id: string) => g.concepts.find((c) => c.id === id)?.name ?? id;
  const weakest = states
    .filter((s) => s.attempts > 0)
    .sort((a, b) => Number(b.bombActive) - Number(a.bombActive) || a.box - b.box || a.correctCount / a.attempts - b.correctCount / b.attempts)
    .slice(0, 2)
    .map((s) => name(s.conceptId));
  const capHit = g.shiftLog.date === new Date().toISOString().slice(0, 10) && g.shiftLog.count >= g.settings.dailyCap;
  const mods = [g.inventory.secondChance > 0 && `Second Chance x${g.inventory.secondChance}`, g.inventory.magnet && "Magnet", g.inventory.mega && "MEGA BUCKET", g.inventory.quake && "Earthquake"].filter(Boolean);

  return (
    <div className="grid2">
      <section>
        <Window title={`LEDGER.XLS - ${g.unit?.name}`}>
          <div className="row between">
            <h2>{g.unit?.name}</h2>
            <Counter label="DAYS TO EXAM" value={days} digits={2} />
          </div>
          <div className="row between small">
            <strong>DEBT</strong>
            <span className="mono">{debt}% TO GO</span>
          </div>
          <div className="progress" role="progressbar" aria-valuenow={100 - debt} aria-valuemin={0} aria-valuemax={100} aria-label="Debt paid off">
            <div style={{ width: `${100 - debt}%` }} />
          </div>
          <ul className="facts">
            <li>Weakest: {weakest.length ? weakest.join(", ") : "nothing tried yet"}</li>
            <li>Bombs: {bombs.length ? bombs.map(name).join(", ") : "none"}</li>
            {mods.length > 0 && <li>Ready for next Shift: {mods.join(", ")}</li>}
          </ul>
        </Window>
        <Collector line={capHit ? LINES.cap : g.line || LINES.hub} />
        <div className="stack">
          {inProgress(g.session) ? (
            <button className="btn success big pulse-glow" onClick={g.resume}>
              Resume {g.session.kind === "exam" ? "Exam Day" : g.session.kind === "defuse" ? "Defuser" : "Shift"}: Q{Math.min(g.session.answered + (g.session.pendingBalls ? 0 : 1), g.session.total)} of {g.session.total}
            </button>
          ) : (
            <button className="btn success big" onClick={g.startShift} disabled={capHit}>
              Start a Shift ({SHIFT_LENGTH} questions)
            </button>
          )}
          <div className="row">
            <button className="btn primary" onClick={() => g.go("shop")}>
              Shop <span className="badge hot pulse-glow">HOT!</span>
            </button>
            <button className="btn" onClick={() => g.go("report")}>Report</button>
            <button className="btn danger" onClick={g.startExam} disabled={g.shiftsDone < 1 || inProgress(g.session)} title={inProgress(g.session) ? "Finish what you started first" : g.shiftsDone < 1 ? "Play one Shift first" : ""}>
              Exam Day
            </button>
          </div>
          <p className="small">
            {g.shiftsDone} Shift{g.shiftsDone === 1 ? "" : "s"} played. {g.shiftsDone < 3 ? "Exam Day (a 10 question mock) works best after 3 Shifts." : "Ready for Exam Day when you are."} {t.Chips} only come from the board.
          </p>
        </div>
      </section>
      <section>
        <Window title="BOARD.EXE" body="plain">
          <MiniBoard reduced={reduced} onPeg={setPeg} />
          <Legend />
        </Window>
        {peg ? <PegCard peg={peg} onClose={() => setPeg(null)} /> : <p className="small center">Tap a peg to see what it is.</p>}
      </section>
    </div>
  );
}

/* ---------- The Draw ---------- */

function Draw() {
  const g = useGame();
  const s = g.session!;
  const first = g.attempts.length === 0;
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const i = Number(e.key) - 1;
      if (s.offer[i]) g.choose(s.offer[i]);
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [s.offer, g]);

  return (
    <section className="narrow">
      <Window title={`THE_DRAW.EXE - SHIFT ${g.shiftsDone + 1} - Q${s.answered + 1} OF ${s.total}`}>
        <h2>Pick a concept</h2>
        <p>{first ? "Three concepts to start. Pick any." : "Weighted towards your weak spots. Bombs come back here to be defused."}</p>
        <div className="draw">
          {s.offer.map((id, i) => {
            const c = g.concepts.find((x) => x.id === id)!;
            const b = badge(g.conceptState[id]);
            return (
              <button key={id} className="btn drawcard" onClick={() => g.choose(id)}>
                <span className={`badge ${b.toLowerCase()} ${b === "New" || b === "Bomb" ? "pulse-glow" : ""}`}>{b === "New" ? "NEW!" : b}</span>
                <strong>{c.name}</strong>
                <span className="small">{c.summary}</span>
                <span className="mono small">[{i + 1}]</span>
              </button>
            );
          })}
        </div>
      </Window>
    </section>
  );
}

/* ---------- Question and Bet ---------- */

function QuestionScreen({ reduced }: { reduced: boolean }) {
  const g = useGame();
  const s = g.session!;
  const q = g.questions.find((x) => x.id === s.questionId);
  const concept = g.concepts.find((c) => c.id === q?.conceptId);
  const [chosen, setChosen] = useState<OptionId | null>(null);
  const [conf, setConf] = useState<Confidence | null>(null);
  const t = terms(g.settings.calm);
  const exam = s.kind === "exam";
  const first = g.attempts.length === 0;

  useEffect(() => {
    setChosen(null);
    setConf(null);
  }, [q?.id, s.eliminated.length]);

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "BUTTON" && e.key === "Enter") return;
      const k = e.key.toUpperCase();
      if (["A", "B", "C", "D"].includes(k) && !s.eliminated.includes(k as OptionId)) setChosen(k as OptionId);
      if (["1", "2", "3"].includes(k)) setConf(CONFS[Number(k) - 1]);
      if (e.key === "Enter" && chosen && conf) {
        e.preventDefault(); // don't let the same keypress activate the next screen's button
        g.answer(chosen, conf);
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [chosen, conf, g, s.eliminated]);

  if (!q || !concept) return null;
  const header = exam ? `EXAM_DAY.EXE - Q${s.answered + 1} OF ${s.total}` : s.kind === "defuse" ? "DEFUSER.EXE" : `SHIFT_${g.shiftsDone + 1}.EXE - Q${s.answered + 1} OF ${s.total}`;

  return (
    <div className="grid2 play">
      <Window title={header} body="plain" tone={exam ? "alert" : undefined}>
        <div className="row between">
          <h2 className="concept">{concept.name}</h2>
          <button className="btn small" onClick={() => g.flag(q.id)} title="Flag this question and get a different one">
            This looks wrong
          </button>
        </div>
        <div className="panel">
          <p className="stem">{q.stem}</p>
        </div>
        <div role="radiogroup" aria-label="Answer options" className="options">
          {q.options.map((o) => (
            <button key={o.id} role="radio" aria-checked={chosen === o.id} disabled={s.eliminated.includes(o.id)} className="btn option" onClick={() => setChosen(o.id)}>
              <span className="letter">{o.id}</span>
              <span>{o.text}</span>
            </button>
          ))}
        </div>
        {first && <p className="notice">Right and sure pays more. Wrong and sure costs more. Be honest.</p>}
        <fieldset className="bet">
          <legend>How sure are you?</legend>
          <div className="confs" role="radiogroup" aria-label={t.Bet}>
            {CONFS.map((c, i) => (
              <button key={c} role="radio" aria-checked={conf === c} className={`btn conf ${c}`} onClick={() => setConf(c)}>
                <strong>{CONF_LABEL[c]}</strong>
                <span className="mono">{exam ? `~${[40, 70, 90][i]}% sure` : `${BALLS[c]} ball${BALLS[c] > 1 ? "s" : ""} · lose ${PENALTY[c]}`}</span>
              </button>
            ))}
          </div>
          {exam && <p className="small">Exam Day: no {t.chips} at stake. Your {t.bet}s feed the readiness report.</p>}
          {s.retrying && <p className="small">Second Chance: one option is out. Try again.</p>}
          {!exam && g.streak >= 1 && <p className="small mono">STREAK {g.streak}: GET THIS RIGHT FOR CHIPS x{streakMultiplier(g.streak + 1)}</p>}
          <button className="btn success big" disabled={!chosen || !conf} onClick={() => chosen && conf && g.answer(chosen, conf)}>
            Lock it in
          </button>
          <p className="small hide-sm mono">KEYS: A-D, 1-3, ENTER</p>
        </fieldset>
      </Window>
      <section className="hide-sm">
        <Window title="BOARD.EXE" body="plain">
          <MiniBoard reduced={reduced} />
        </Window>
      </section>
    </div>
  );
}

/* ---------- Reveal: the answer on the left, drop your balls on the board on the right ---------- */

function RevealScreen({ reduced }: { reduced: boolean }) {
  const g = useGame();
  const r = g.reveal;
  const s = g.session;
  const [won, setWon] = useState<number | null>(null);
  const exam = s?.kind === "exam";

  useEffect(() => {
    if (!r) return;
    if (r.correct && !r.secondChance && !g.settings.calm) confetti(r.bombDefused ? 300 : 120);
    if (r.correct && !r.secondChance) sealDo("clap");
    if (r.bombPlanted) sealDo("slap");
    if (!g.settings.sound || g.settings.calm) return;
    if (r.bombPlanted) sfx.bomb();
    else if (r.bombDefused) sfx.defuse();
    else if (r.correct) sfx.correct();
    else sfx.wrong();
  }, [r, g.settings.sound, g.settings.calm]);

  if (!r || !s) return <Hub reduced={reduced} />;
  const q = g.questions.find((x) => x.id === r.questionId)!;
  const concept = g.concepts.find((c) => c.id === r.conceptId)!;
  const t = terms(g.settings.calm);
  const tempting = q.options.find((o) => o.id === r.chosen)?.misconception;
  const optionText = (id: OptionId) => q.options.find((o) => o.id === id)?.text ?? "";
  const droppable = !r.secondChance && !exam; // Shift and Defuser answers drop right here
  const kind = r.bombPlanted ? "bomb" : r.correct && !r.secondChance ? "right" : "wrong";
  const title = r.bombPlanted ? "BOMB_PLANTED.EXE" : r.correct ? "CORRECT.WAV" : "NOT_THIS_TIME.TXT";
  const mult = s.streakMult ?? 1;
  const last = s.answered >= s.total;

  return (
    <div className="grid2 play reveal-layout">
      <section className="reveal" aria-live="polite">
        <Window title={title} tone={r.bombPlanted ? "alert" : r.correct ? "ok" : undefined}>
          <div className={`banner ${kind}`}>
            <h2>
              {r.bombPlanted
                ? `Bomb planted on ${concept.name}`
                : r.secondChance
                  ? `Not ${r.chosen}. Second Chance used`
                  : r.correct
                    ? r.bombDefused
                      ? `Defused: ${concept.name}`
                      : "Correct!"
                    : "Not this time"}
            </h2>
          </div>
          {!r.secondChance && (
            <table className="answer-key">
              <tbody>
                {!r.correct && (
                  <tr className="picked">
                    <th scope="row">{r.bombPlanted ? "You were certain" : "You said"}</th>
                    <td>
                      <span className="letter">{r.chosen}</span> {optionText(r.chosen)}
                    </td>
                  </tr>
                )}
                <tr className="right">
                  <th scope="row">Answer</th>
                  <td>
                    <span className="letter">{q.correct}</span> {optionText(q.correct)}
                  </td>
                </tr>
              </tbody>
            </table>
          )}
          {r.secondChance && <p>No {t.chips} lost, no bomb, streak safe. Have another go.</p>}
          <div className="row">
            {!exam && r.correct && !r.secondChance && <Counter label="BALLS EARNED" value={r.balls} digits={2} />}
            {!exam && r.correct && !r.secondChance && r.streak >= 2 && (
              <span className="counter streak pulse-glow" aria-label={`Streak ${r.streak}, chips times ${mult}`}>
                <span className="lbl">STREAK {r.streak}</span>x{mult}
              </span>
            )}
          </div>
          {!exam && r.chipPenalty > 0 && <p className="mono">LOSE {r.chipPenalty} {(r.chipPenalty === 1 ? t.chip : t.chips).toUpperCase()}</p>}
          {!exam && !r.correct && !r.secondChance && r.lostStreak >= 2 && <p className="mono">STREAK OF {r.lostStreak} LOST</p>}

          <Collector line={r.bombPlanted ? LINES.bombPlanted(concept.name) : r.line} />

          {!r.secondChance && (
            <>
              {!r.correct && tempting && (
                <>
                  <h3>Why {r.chosen} is tempting</h3>
                  <p>{tempting}</p>
                </>
              )}
              <h3>The idea</h3>
              <p>{q.explanation}</p>
              {r.bombPlanted && <p className="small">Confident mistakes are often the easiest to fix. We&apos;ll retest this soon.</p>}
              {!r.correct && !r.bombPlanted && !exam && <p className="small">We&apos;ll bring this back in a few questions.</p>}
              {exam && !r.correct && <p className="small">It goes on tonight&apos;s plan.</p>}
            </>
          )}

          {!droppable ? (
            <button className={`btn big ${r.bombPlanted ? "danger" : "success"}`} onClick={g.continueReveal} autoFocus>
              {r.secondChance ? "Try again" : last ? "See my report" : "Next question"}
            </button>
          ) : won === null ? (
            <p className="notice">
              → Drop your {s.pendingBalls} ball{s.pendingBalls === 1 ? "" : "s"} on the board: click a chute or press 1-7.
              {mult > 1 ? ` Streak bonus: chips x${mult}!` : ""}
            </p>
          ) : (
            <div className="row between dropdone">
              {s.pendingBalls > 0 && (
                <span className="counter big" aria-label={`Plus ${Math.round(won * mult)} ${t.chips}`}>
                  <span className="lbl">+{t.Chips.toUpperCase()}</span>
                  {mult > 1 ? `${won}×${mult}=${Math.round(won * mult)}` : won}
                </span>
              )}
              <button className={`btn big ${r.bombPlanted ? "danger" : "success"}`} onClick={() => g.finishDrop(won)} autoFocus>
                {last ? "Finish" : "Next"}
              </button>
            </div>
          )}
        </Window>
      </section>
      <section>{droppable ? <DropPanel reduced={reduced} onDone={setWon} /> : <Window title="BOARD.EXE" body="plain"><MiniBoard reduced={reduced} /></Window>}</section>
    </div>
  );
}

function DropPanel({ reduced, onDone }: { reduced: boolean; onDone: (chips: number) => void }) {
  const g = useGame();
  const s = g.session!;
  const r = g.reveal;
  const { pegs, states } = usePegs();
  const [hold, setHold] = useState<{ h: Hold; release: (m: number) => void } | null>(null);
  const [mega, setMega] = useState<{ mult: number; value: number } | null>(null);
  const megaTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const t = terms(g.settings.calm);
  const chaos = !g.settings.calm; // Calm mode: popups auto-play, no strobe, no shake
  const sound = g.settings.sound && !g.settings.calm;
  const spark = r && (r.bombPlanted || r.bombDefused) ? [r.conceptId] : [];
  const { magnet, mega: megaMod, quake } = g.inventory;
  const drop = useMemo(() => ({ balls: s.pendingBalls, seed: s.dropSeed, magnet, mega: megaMod, quake }), [s.pendingBalls, s.dropSeed, magnet, megaMod, quake]);

  const onMega = (mult: number, value: number) => {
    setMega({ mult, value });
    confetti(300);
    sealDo("gyuu");
    clearTimeout(megaTimer.current);
    megaTimer.current = setTimeout(() => setMega(null), 1700);
    if (reduced) return;
    const html = document.documentElement;
    html.classList.remove("shake");
    void html.offsetWidth; // restart the animation on back-to-back hits
    html.classList.add("shake");
    setTimeout(() => html.classList.remove("shake"), 650);
  };
  useEffect(() => () => clearTimeout(megaTimer.current), []);

  const active = [magnet && "MAGNET", megaMod && "MEGA BUCKET", quake && "EARTHQUAKE"].filter(Boolean) as string[];

  return (
    <div className="drop">
      <Window title="PLINKO.EXE" body="plain">
        <div className="row between">
          <strong className="mono">{s.pendingBalls ? `${s.pendingBalls} BALL${s.pendingBalls > 1 ? "S" : ""} TO DROP` : "NO BALLS THIS TIME"}</strong>
          {active.map((a) => (
            <span key={a} className="badge hot pulse-glow">{a}</span>
          ))}
        </div>
        <Board
          pegs={pegs}
          states={states}
          drop={drop}
          spark={spark}
          calm={g.settings.calm}
          sound={sound}
          reducedMotion={reduced}
          onHold={chaos ? (h, release) => setHold({ h, release }) : undefined}
          onMega={chaos ? onMega : undefined}
          onDone={(c) => {
            setHold(null);
            onDone(c);
          }}
          label={`Ball drop with ${s.pendingBalls} balls`}
        />
        <p className="small">Solid +2, shaky +1, bomb −2. Centre buckets multiply more. Skip drops the rest down the middle.</p>
      </Window>
      {hold && (
        <HoldModal
          key={hold.h.id}
          hold={hold.h}
          sound={sound}
          onDone={(m) => {
            hold.release(m);
            setHold(null);
          }}
        />
      )}
      {mega && <MegaOverlay mult={mega.mult} value={mega.value} chips={t.chips} />}
    </div>
  );
}

/* ---------- Shift summary ---------- */

function Summary() {
  const g = useGame();
  const s = g.session;
  const { ready } = useDerived();
  const t = terms(g.settings.calm);
  useEffect(() => {
    if (!g.settings.calm) confetti(250);
  }, [g.settings.calm]);
  if (!s) return null;
  const name = (id: string) => g.concepts.find((c) => c.id === id)?.name ?? id;
  return (
    <section className="narrow">
      <Window title={s.kind === "defuse" ? "DEFUSER_LOG.TXT" : "SHIFT_COMPLETE.TXT"}>
        <h2 className="rainbow">{s.kind === "defuse" ? "Defuser done" : "Shift complete!"}</h2>
        <Collector line={g.line} />
        <table>
          <tbody>
            <tr><td>Right</td><td className="mono">{s.correct} of {s.answered}</td></tr>
            <tr><td>From the board</td><td className="mono">+{s.chipsEarned} {t.chips}</td></tr>
            {s.chipsLost > 0 && <tr><td>From {t.bet}s</td><td className="mono">-{s.chipsLost} {t.chips}</td></tr>}
            <tr><td>Readiness (estimate)</td><td className="mono">{s.readinessBefore}% → {ready}%</td></tr>
            {s.bombsPlanted.length > 0 && <tr><td>Bombs planted</td><td>{s.bombsPlanted.map(name).join(", ")}</td></tr>}
            {s.bombsDefused.length > 0 && <tr><td>Bombs defused</td><td>{s.bombsDefused.map(name).join(", ")}</td></tr>}
          </tbody>
        </table>
        <hr />
        <div className="row">
          <button className="btn primary" onClick={() => g.go("shop")} autoFocus>Shop</button>
          <button className="btn" onClick={() => g.go("report")}>Report</button>
          <button className="btn" onClick={() => g.go("hub")}>Hub</button>
        </div>
      </Window>
    </section>
  );
}

/* ---------- Settings ---------- */

function SettingsScreen() {
  const g = useGame();
  const s = g.settings;
  return (
    <section className="narrow">
      <Window title="CONTROL_PANEL.EXE">
        <div className="stack">
          <Toggle label="Calm mode" hint="No popups, strobes, shakes or sound, whatever skin you picked in the Shop. 'Points' instead of chips. Same mechanics." on={s.calm} set={(v) => g.updateSettings({ calm: v })} />
          <Toggle label="Sound" hint="Ticks, boings and the odd arpeggio." on={s.sound} set={(v) => g.updateSettings({ sound: v })} />
          <Toggle label="Reduced motion" hint="Drops resolve instantly. No shake." on={s.reducedMotion} set={(v) => g.updateSettings({ reducedMotion: v })} />
          <label className="row between">
            <strong>Daily Shift cap</strong>
            <input type="number" min={1} max={12} value={s.dailyCap} onChange={(e) => g.updateSettings({ dailyCap: Math.max(1, Math.min(12, Number(e.target.value) || 1)) })} className="num" />
          </label>
        </div>
      </Window>
      <Window title="ODDS.TXT">
        <OddsTable />
        <p className="small">
          Guess is the best {terms(s.calm).bet} below about 50% sure, Pretty sure from 50% to 75%, Certain above 75%. Honest confidence wins. Board: solid +2, shaky +1, not tried 0, bomb −2. Buckets x0.5 to x3. Shop pegs show their odds before you buy. Nothing random is sold for money.
        </p>
      </Window>
      <div className="row">
        <button className="btn" onClick={() => g.go("hub")}>Back</button>
        <button className="btn danger" onClick={() => confirm("Start a new unit? This clears your progress on this one.") && g.reset()}>
          New unit
        </button>
      </div>
    </section>
  );
}

function Toggle({ label, hint, on, set }: { label: string; hint: string; on: boolean; set: (v: boolean) => void }) {
  return (
    <label className="row between">
      <span>
        <strong>{label}</strong>
        <br />
        <span className="small">{hint}</span>
      </span>
      <input type="checkbox" role="switch" aria-label={label} checked={on} onChange={(e) => set(e.target.checked)} />
    </label>
  );
}
