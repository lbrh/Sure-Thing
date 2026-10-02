// Headless tuning sim (MVP plan 4.4): 1000 balls per board state.
import { describe, expect, it } from "vitest";
import Matter from "matter-js";
import { CHUTES, MIN_IMPACT, createDrop, layoutPegs, placeSpecials } from "@/lib/board";
import type { PegState } from "@/lib/engine";

const ids = Array.from({ length: 12 }, (_, i) => `c${i}`);
const pegs = layoutPegs(ids, 42);
const board = (spec: PegState[]) => Object.fromEntries(ids.map((id, i) => [id, spec[i]]));

function avgPerBall(states: Record<string, PegState>, magnet = false, balls = 1000) {
  let chips = 0;
  for (let s = 0; s < balls / 10; s++) chips += createDrop(pegs, states, { balls: 10, seed: s + 1, magnet }).resolve();
  return chips / balls;
}

const fill = (counts: [PegState, number][]) => counts.flatMap(([s, n]) => Array(n).fill(s) as PegState[]);
const mixed = board(fill([["solid", 4], ["shaky", 4], ["bomb", 2], ["cold", 2]]));
const bombHeavy = board(fill([["bomb", 8], ["shaky", 4]]));
const solidHeavy = board(fill([["solid", 10], ["shaky", 2]]));
const cold = board(fill([["cold", 12]]));

const r = {
    cold: avgPerBall(cold),
    mixed: avgPerBall(mixed),
    bombHeavy: avgPerBall(bombHeavy),
    solidHeavy: avgPerBall(solidHeavy),
    mixedMagnet: avgPerBall(mixed, true),
};

describe("economy tuning", () => {

  it("mixed board pays 1.0 to 1.5 chips per ball", () => {
    expect(r.mixed).toBeGreaterThanOrEqual(1.0);
    expect(r.mixed).toBeLessThanOrEqual(1.5);
  });
  it("bomb-heavy is clearly worse than solid-heavy", () => {
    expect(r.solidHeavy).toBeGreaterThan(r.bombHeavy * 2);
  });
  it("a cold board still pays something", () => expect(r.cold).toBeGreaterThan(0.3));
  it("magnet helps", () => expect(r.mixedMagnet).toBeGreaterThan(r.mixed));
});

describe("crazy modifiers", () => {
  const wild = placeSpecials(pegs, ["wheel", "quiz21", "quiz", "splitter", "blackhole", "bumper"]);
  it("places every special on a neutral peg", () => {
    const sp = wild.filter((p) => p.special);
    expect(sp).toHaveLength(6);
    expect(sp.every((p) => !p.conceptId)).toBe(true);
  });
  it("a fully loaded chaos board always finishes and pays more", () => {
    let chips = 0, cheers = 0;
    for (let s = 1; s <= 60; s++) {
      const d = createDrop(wild, mixed, { balls: 6, seed: s, quake: true, mega: true });
      chips += d.resolve();
      expect(d.done).toBe(true);
      cheers += d.events.filter((e) => e.type === "cheer").length;
    }
    expect(chips / 360).toBeGreaterThan(r.mixed);
    expect(cheers).toBeGreaterThan(0);
  });
  it("mega bucket beats the normal centre", () => {
    let normal = 0, mega = 0;
    for (let s = 1; s <= 50; s++) {
      normal += createDrop(pegs, mixed, { balls: 10, seed: s }).resolve();
      mega += createDrop(pegs, mixed, { balls: 10, seed: s, mega: true }).resolve();
    }
    expect(mega).toBeGreaterThan(normal * 1.5);
  });
});

describe("click to drop", () => {
  const run = (chute: number, seed: number) => {
    const d = createDrop(pegs, mixed, { balls: 3, seed, manual: true });
    for (let i = 0; i < 10; i++) d.dropAt(chute); // spam: only 3 balls exist
    expect(d.remaining).toBe(0);
    let guard = 0;
    while (!d.done && guard++ < 5000) d.tick();
    expect(d.done).toBe(true);
    expect(d.balls).toHaveLength(3);
    return d.chips;
  };
  it("waits for the player, then drops exactly the balls earned", () => {
    const d = createDrop(pegs, mixed, { balls: 2, seed: 1, manual: true });
    for (let i = 0; i < 100; i++) d.tick();
    expect(d.balls).toHaveLength(0);
    expect(d.remaining).toBe(2);
    expect(d.resolve()).toBeGreaterThanOrEqual(0); // Skip auto-drops the rest
    expect(d.balls).toHaveLength(2);
  });
  it("on a cold board (multipliers only), middle chutes beat edge chutes", () => {
    const payout = (chute: number) => {
      let chips = 0;
      for (let s = 1; s <= 80; s++) {
        const d = createDrop(pegs, cold, { balls: 1, seed: s, manual: true });
        d.dropAt(chute);
        let g = 0;
        while (!d.done && g++ < 5000) d.tick();
        chips += d.chips;
      }
      return chips;
    };
    const middle = (payout(2) + payout(3) + payout(4)) / 3;
    const edge = (payout(0) + payout(6)) / 2;
    expect(middle).toBeGreaterThan(1.5 * edge);
  });
});

describe("fairness: walls don't swallow balls", () => {
  // where 150 balls land from each chute on an all-shaky board
  const landings = Array.from({ length: CHUTES }, (_, chute) => {
    const tally = new Array(7).fill(0);
    for (let s = 1; s <= 150; s++) {
      const d = createDrop(pegs, board(fill([["shaky", 12]])), { balls: 1, seed: s, manual: true });
      d.dropAt(chute);
      let g = 0;
      while (!d.done && g++ < 5000) d.tick();
      d.landed.forEach((n, i) => (tally[i] += n));
    }
    return tally;
  });
  it("no chute sends more than a third of its balls to the x0.5 edge buckets", () => {
    for (const t of landings) expect((t[0] + t[6]) / 150).toBeLessThanOrEqual(1 / 3);
  });
  it("aim matters: off-centre chutes mostly land in the bucket below them", () => {
    for (const chute of [1, 2, 4, 5]) expect(landings[chute].indexOf(Math.max(...landings[chute]))).toBe(chute);
  });
});

describe("grazes don't score", () => {
  it("a peg only scores when the ball actually hits it, not when it skims past", () => {
    let grazes = 0;
    let solidHits = 0;
    let scored = 0;
    type Pair = { bodyA: Matter.Body; bodyB: Matter.Body; collision: { normal: Matter.Vector } };
    const events = Matter.Events as unknown as { on: (o: unknown, n: string, cb: (e: { pairs: Pair[] }) => void) => void };
    const on = events.on;
    // watch every ball-peg contact and how hard it was, alongside what the game scored
    events.on = (obj, name, cb) =>
      on(obj, name, (e) => {
        if (name === "collisionStart")
          for (const p of e.pairs) {
            const [ball, other] = p.bodyA.label === "ball" ? [p.bodyA, p.bodyB] : [p.bodyB, p.bodyA];
            if (ball.label !== "ball" || !other.label.startsWith("peg:")) continue;
            const impact = Math.abs(ball.velocity.x * p.collision.normal.x + ball.velocity.y * p.collision.normal.y);
            if (impact < MIN_IMPACT) grazes++;
            else solidHits++;
          }
        cb(e);
      });
    try {
      for (let s = 1; s <= 100; s++) {
        const d = createDrop(pegs, board(fill([["shaky", 12]])), { balls: 3, seed: s });
        d.resolve();
        scored += d.events.filter((e) => e.type === "peg").length;
      }
    } finally {
      events.on = on;
    }
    expect(grazes).toBeGreaterThan(50); // grazes really happen...
    expect(scored).toBeLessThanOrEqual(solidHits); // ...but only real hits ever score
  });
});
