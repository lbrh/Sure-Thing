"use client";
// Between runs: the Legacy Draft, the Collector's journal and learning achievements.

import { Counter, Window } from "./ui";
import { ITEM_INFO } from "./Mods";
import { useGame } from "@/lib/store";
import { ACHIEVEMENTS, draftRerollCost, MAX_RELICS, RELIC_COST, RELICS, STAKES, type RelicId } from "@/lib/economy";
import { STORY } from "@/lib/copy";

export function Draft() {
  const g = useGame();
  const m = g.meta;
  const d = m.draft;
  const full = m.relics.length >= MAX_RELICS;
  const kinds = [...new Set(g.inventory.pegs.map((p) => p.kind))].filter((k) => k !== "alumni");
  return (
    <section className="narrow">
      <Window title="LEGACY_DRAFT.EXE">
        <div className="row between">
          <h2 className="rainbow">Legacy Draft</h2>
          <Counter label="MASTERY MARKS" value={m.marks} digits={3} big />
        </div>
        {d && (
          <p className="small">
            This unit earned {d.gained} Mark{d.gained === 1 ? "" : "s"}, from concepts mastered, bombs defused, your calibration grade and Exam Day. Chips never turn into Marks, and time played never counts.
          </p>
        )}
        <h3>Pick a relic ({RELIC_COST} Marks, carry up to {MAX_RELICS})</h3>
        <div className="shop">
          {(d?.offers ?? []).map((r) => (
            <Window key={r} title={`${RELICS[r].name.toUpperCase().replace(/ /g, "_")}.RLC`}>
              <strong>{RELICS[r].name}</strong>
              <p>{RELICS[r].effect}</p>
              {full ? (
                m.relics.map((old) => (
                  <button key={old} className="btn small" disabled={m.marks < RELIC_COST} onClick={() => g.draftPick(r, old)}>
                    Take it, drop {RELICS[old].name}
                  </button>
                ))
              ) : (
                <button className="btn primary" disabled={m.marks < RELIC_COST} onClick={() => g.draftPick(r)}>
                  Take it
                </button>
              )}
            </Window>
          ))}
        </div>
        {d && (
          <button className="btn small" disabled={m.marks < draftRerollCost(d.rerolls)} onClick={g.draftReroll}>
            Reroll relics ({draftRerollCost(d.rerolls)} Marks)
          </button>
        )}
        <p className="small">Carrying: {m.relics.length ? m.relics.map((r: RelicId) => RELICS[r].name).join(", ") : "nothing yet"}.</p>

        <h3>Keep one peg</h3>
        <div className="row">
          {kinds.length === 0 && <p className="small">No shop pegs to carry this time.</p>}
          {kinds.map((k) => (
            <button key={k} className={`btn small ${m.keptPeg === k ? "primary" : ""}`} aria-pressed={m.keptPeg === k} onClick={() => g.keepPeg(m.keptPeg === k ? null : k)}>
              {ITEM_INFO[k].name}
            </button>
          ))}
        </div>
        <p className="small">It starts the next unit as a single tier 1 copy.</p>

        <h3>Stake for the next unit</h3>
        {g.settings.calm ? (
          <p className="small">Stakes are off in Calm mode.</p>
        ) : (
          <>
            <div className="row">
              {Array.from({ length: m.stakeUnlocked }, (_, i) => i + 1).map((n) => (
                <button key={n} className={`btn small ${m.stake === n ? "primary" : ""}`} aria-pressed={m.stake === n} onClick={() => g.setStake(n)}>
                  Stake {n}
                </button>
              ))}
            </div>
            <p className="small">
              Stake {m.stake}: {STAKES[m.stake]} Optional. Finish a unit at your highest stake with calibration grade 2 or better to unlock the next.
            </p>
          </>
        )}
        <hr />
        <button className="btn success big" onClick={g.newUnit}>
          Start a new unit
        </button>
      </Window>
      <Achievements />
    </section>
  );
}

export function Journal() {
  const story = useGame((s) => s.meta.story);
  if (story.length === 0) return null;
  return (
    <Window title="THE_COLLECTORS_JOURNAL.TXT" body="note">
      <ul>
        {story.map((id) => (
          <li key={id}>“{STORY[id]}”</li>
        ))}
      </ul>
    </Window>
  );
}

export function Achievements() {
  const got = useGame((s) => s.meta.achievements);
  return (
    <Window title="ACHIEVEMENTS.TXT">
      <ul>
        {(Object.keys(ACHIEVEMENTS) as (keyof typeof ACHIEVEMENTS)[]).map((a) => (
          <li key={a}>
            {got.includes(a) ? "★" : "☆"} {ACHIEVEMENTS[a]}
          </li>
        ))}
      </ul>
      <p className="small">Learning achievements only. Nothing for time played or streak length.</p>
    </Window>
  );
}
