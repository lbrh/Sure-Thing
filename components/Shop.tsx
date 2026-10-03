"use client";

import { useMemo } from "react";
import { Counter, Window } from "./ui";
import { ITEM_INFO } from "./Mods";
import { inProgress, priceCtx, sessionName, useDerived, useGame, SHIFT_MODS, SPECIALS, type ShopItem, type Skin } from "@/lib/store";
import { MAX_COPIES, priceOf, rerollCost, secondChanceMax, stakeHas } from "@/lib/economy";

const SKINS: { id: Skin; file: string; name: string; blurb: string; swatch: string[] }[] = [
  { id: "retro", file: "RETRO_95.SKN", name: "Retro 95", blurb: "Bevelled grey windows, navy title bars, hit counters. 1997, tastefully.", swatch: ["#c0c0c0", "#000080", "#1084d0", "#ffffcc", "#00ff00"] },
  { id: "chaos", file: "MAXIMUM_CHAOS.SKN", name: "MAXIMUM CHAOS", blurb: "Pop-ups nobody asked for, confetti, floating 3D words, fake RealPlayer, emoji buttons everywhere. A web designer's worst nightmare.", swatch: ["#ff00ff", "#00ff00", "#0000ff", "#ffff00", "#00ffff"] },
];
import { rng } from "@/lib/engine";
import { terms } from "@/lib/copy";

const OFFERS = 3;

export default function Shop() {
  const g = useGame();
  const { bombs } = useDerived();
  const t = terms(g.settings.calm);
  const name = (id: string) => g.concepts.find((c) => c.id === id)?.name ?? id;
  const paused = inProgress(g.session);

  const ctx = priceCtx(g);
  // roguelike rotation: 3 crazy offers per visit, stable until you answer more questions or reroll
  const offers = useMemo(() => {
    const pool: ShopItem[] = [...SHIFT_MODS.filter((k) => !(k === "quake" && stakeHas(g.settings.calm ? 1 : g.run.stake, 7))), ...SPECIALS.filter((k) => (ctx.copies[k] ?? 0) < MAX_COPIES)];
    const rand = rng(g.attempts.length * 31 + g.shiftsDone + 7 + g.shop.rerolls * 977);
    return pool.map((k) => ({ k, r: rand() })).sort((a, b) => a.r - b.r).slice(0, OFFERS).map((x) => x.k);
  }, [g.attempts.length, g.shiftsDone, g.shop.rerolls, JSON.stringify(ctx.copies)]); // eslint-disable-line react-hooks/exhaustive-deps
  const reroll = rerollCost(g.shop.rerolls);

  const card = (id: ShopItem) => {
    const info = ITEM_INFO[id];
    const { price, next, reason } = priceOf(id, ctx);
    const capped = id === "secondChance" && g.inventory.secondChance >= secondChanceMax(g.settings.calm ? 1 : g.run.stake);
    const broke = g.chips < price;
    const active = (SHIFT_MODS as string[]).includes(id) && g.inventory[id as "magnet" | "mega" | "quake"];
    return (
      <Window key={id} title={`${info.name.toUpperCase().replace(/ /g, "_")}.${info.kind === "peg" ? "PEG" : info.kind === "shift" ? "MOD" : "EXE"}`}>
        <div className="row between">
          <strong>{info.name}</strong>
          {info.kind === "peg" && <span className="badge hot pulse-glow">HOT!</span>}
          {info.kind === "shift" && <span className="badge new blink">NEW!</span>}
        </div>
        <div className="row">
          <Counter label={t.Chips.toUpperCase()} value={price} digits={3} />
          <span className="mono small">NEXT {next}</span>
          {info.kind === "peg" && <span className="badge new">TIER {ctx.tier}</span>}
        </div>
        <p className="small mono">{reason}</p>
        <p>{info.effect}</p>
        {info.odds && <p className="odds-list">ODDS: {info.odds}</p>}
        <p className="small"><em>{info.joke}</em></p>
        {id === "defuser" ? (
          paused ? (
            <p className="small">Finish your {g.session?.kind === "exam" ? "Exam Day" : "Shift"} first. Bombs also come back free in the Draw.</p>
          ) : bombs.length ? (
            bombs.map((b) => (
              <button key={b} className="btn danger" disabled={broke} onClick={() => g.buy("defuser", b)}>
                Defuse {name(b)}
              </button>
            ))
          ) : (
            <p className="small">No bombs on your board. Nice.</p>
          )
        ) : (
          <button className="btn primary" disabled={broke || Boolean(active) || capped} onClick={() => g.buy(id)}>
            {active ? "Active ✓" : id === "secondChance" && g.inventory.secondChance ? `Buy another (have ${g.inventory.secondChance})` : info.kind === "peg" ? "Install on board" : "Buy"}
          </button>
        )}
        {capped && <p className="small mono">HOLDING THE MAXIMUM ({g.inventory.secondChance})</p>}
        {broke && !active && !(id === "defuser" && paused) && <p className="small mono">NEED {price - g.chips} MORE</p>}
      </Window>
    );
  };

  return (
    <section>
      <div className="row between">
        <h2 className="rainbow">The Shop</h2>
        <Counter label={t.Chips.toUpperCase()} value={g.chips} big />
      </div>
      <p className="construction">
        <span className="construction-label">
          {t.Chips} only come from the board. Never bought, never cashed out. Every retest here is also free in the Draw.
        </span>
      </p>
      <h3>Skins</h3>
      <div className="shop">
        {SKINS.map((k) => {
          const on = g.settings.skin === k.id;
          return (
            <Window key={k.id} title={k.file} tone={k.id === "chaos" ? "alert" : undefined}>
              <div className="row between">
                <strong>{k.name}</strong>
                {k.id === "chaos" && <span className="badge hot pulse-glow">HOT!</span>}
              </div>
              <div className="swatch" aria-hidden="true">
                {k.swatch.map((c) => (
                  <i key={c} style={{ background: c }} />
                ))}
              </div>
              <p>{k.blurb}</p>
              <p className="odds-list">FREE · SWITCH ANY TIME</p>
              <button className={`btn ${on ? "" : "success"}`} disabled={on} aria-pressed={on} onClick={() => g.updateSettings({ skin: k.id })}>
                {on ? "Equipped ✓" : "Equip"}
              </button>
              {on && g.settings.calm && <p className="small mono">CALM MODE IS ON, SO THE CHAOS IS PAUSED</p>}
            </Window>
          );
        })}
      </div>
      <hr />
      <h3>Study tools</h3>
      <div className="shop">{(["secondChance", "defuser"] as ShopItem[]).map(card)}</div>
      <hr />
      <div className="row between">
        <h3>Today&apos;s crazy offers</h3>
        <button className="btn small" disabled={g.chips < reroll} onClick={g.reroll}>
          Reroll offers ({reroll} {t.chips})
        </button>
      </div>
      <p className="small">Rerolls cost 2, then 1 more each time, back to 2 next Shift. Interest: at the end of a Shift you get +1 per 10 {t.chips} held, up to +3.</p>
      <div className="shop">{offers.map(card)}</div>
      {g.inventory.pegs.length > 0 && (
        <p className="panel small">
          <strong>Installed on your board:</strong> {g.inventory.pegs.map((k) => `${ITEM_INFO[k.kind].name} T${k.tier}`).join(", ")}
        </p>
      )}
      <p className="small">New offers after your next few answers. Odds are always shown before you buy.</p>
      <div className="row">
        {paused && (
          <button className="btn success" onClick={g.resume}>
            Resume {g.session ? sessionName(g.session) : "Shift"}: Q{Math.min((g.session?.answered ?? 0) + (g.session?.pendingBalls ? 0 : 1), g.session?.total ?? 0)} of {g.session?.total}
          </button>
        )}
        <button className="btn" onClick={() => g.go("hub")}>
          Back to hub
        </button>
      </div>
    </section>
  );
}
