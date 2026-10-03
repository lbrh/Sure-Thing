// Headless tuning sim (MVP plan 4.4): 1000 balls per board state.
import { describe, expect, it } from "vitest";
import Matter from "matter-js";
import { boardMultiplier, streakTier, tierSegments, CHUTES, FEVER_FLAT, FEVER_MULTIPLIERS, MIN_IMPACT, createDrop, layoutPegs, placeSpecials } from "@/lib/board";
import { rng, streakMultiplier, type Attempt, type Confidence, type PegState } from "@/lib/engine";
import {
  answerMult, bestBet, betOutcome, evNet, pegHand, type HandCard, calibrationBonus, calibrationGap, calibrationGrade, incomeIndex, interest, isPeg, MAX_COPIES, priceOf, skillShare, SKILL_TARGET, STUDY_BASE,
  type Item, type PriceCtx,
} from "@/lib/economy";

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

describe("skill share", () => {
  // An honest player at 70% accuracy on real drops: most income must come from knowing things.
  function shareOf(states: Record<string, PegState>, board = pegs, shifts = 40) {
    const rand = rng(11);
    let skill = 0, chance = 0;
    const attempts: Attempt[] = [];
    for (let sh = 0; sh < shifts; sh++) {
      let streak = 0;
      for (let q = 0; q < 8; q++) {
        const p = 0.4 + rand() * 0.6;
        const right = rand() < p;
        attempts.push({ id: "", questionId: "", conceptId: "", chosen: "A", confidence: bestBet(p), correct: right, ms: 0, at: "" });
        const mult = streakMultiplier(streak + 1);
        const o = betOutcome(bestBet(p), right, mult);
        streak = right ? streak + 1 : 0;
        skill += o.chips;
        if (o.balls) {
          const d = createDrop(board, states, { balls: o.balls, seed: sh * 100 + q + 1 });
          const raw = d.resolve();
          const total = Math.round(raw), s = Math.round(d.skill);
          skill += s;
          chance += total - s;
        }
      }
      skill += calibrationBonus(calibrationGrade(calibrationGap(attempts)));
    }
    return skillShare(skill, chance);
  }
  it(`an honest player earns at least ${SKILL_TARGET * 100}% from knowing, on plain and fully loaded boards`, () => {
    expect(shareOf(mixed)).toBeGreaterThanOrEqual(SKILL_TARGET);
    expect(shareOf(solidHeavy)).toBeGreaterThanOrEqual(SKILL_TARGET);
    expect(shareOf(mixed, placeSpecials(pegs, ["wheel", "quiz21", "quiz", "splitter", "blackhole", "bumper"]))).toBeGreaterThanOrEqual(SKILL_TARGET);
  });
});

describe("multi-Shift shop pacing", () => {
  // 1,000 simulated students over 14 days at 1 to 2 Shifts a day. The board pays its measured mean per bonus ball.
  const BALL = 1.13;
  const items: Item[] = ["magnet", "mega", "quake", "wheel", "quiz21", "quiz", "splitter", "blackhole", "bumper"];
  function student(seed: number, policy: (p: number) => Confidence) {
    const rand = rng(seed);
    const ctx: PriceCtx = { boughtThisRun: {}, usesThisShift: {}, copies: {}, tier: 1, index: 1 };
    const attempts: Attempt[] = [];
    const income: number[] = [];
    let chips = 5, earned = 0, debt = 0, t = 0, last = 0, expected = 0;
    const gaps: number[] = [];
    const active = new Set<Item>(); // a boost stays active until its Shift ends, so it can't be bought twice in one Shift (as in the store)
    const cheapest = () => items.filter((i) => (isPeg(i) ? (ctx.copies[i] ?? 0) < MAX_COPIES : !active.has(i))).map((i) => ({ i, ...priceOf(i, ctx) })).sort((a, b) => a.price - b.price)[0];
    const shop = () => {
      for (let target = cheapest(); target && chips >= target.price && gaps.length < 10; target = cheapest()) {
        chips -= target.price;
        gaps.push(t - last);
        last = t;
        if (isPeg(target.i)) ctx.copies[target.i] = (ctx.copies[target.i] ?? 0) + 1;
        else {
          ctx.boughtThisRun[target.i] = (ctx.boughtThisRun[target.i] ?? 0) + 1;
          active.add(target.i);
        }
      }
    };
    for (let day = 0; day < 14; day++) {
      const shifts = rand() < 0.5 ? 1 : 2;
      for (let s = 0; s < shifts; s++) {
        let streak = 0, shiftIncome = 0;
        const cards: HandCard[] = [];
        for (let q = 0; q < 8; q++) {
          const p = 0.4 + rand() * 0.6;
          const right = rand() < p;
          const c = policy(p);
          const index = Math.floor(rand() * 12);
          attempts.push({ id: "", questionId: "", conceptId: "", chosen: "A", confidence: c, correct: right, ms: 0, at: "" });
          const m = answerMult(streakMultiplier(streak + 1), pegHand(cards, 12));
          const o = betOutcome(c, right, m);
          expected += m * evNet(c, p);
          if (right) cards.push({ index, confidence: c });
          streak = right ? streak + 1 : 0;
          const gain = o.chips + o.balls * BALL;
          chips += gain;
          shiftIncome += gain;
          debt += o.debt;
          t += 1 / 8;
          shop();
        }
        const bonus = calibrationBonus(calibrationGrade(calibrationGap(attempts)));
        chips += bonus + interest(chips + bonus);
        shiftIncome += bonus;
        earned += shiftIncome;
        income.push(shiftIncome);
        ctx.index = incomeIndex(income);
        active.clear();
        shop();
      }
    }
    return { gaps, net: earned - debt, expected };
  }
  const up = (c: Confidence): Confidence => (c === "guess" ? "pretty" : "certain");
  const runs = Array.from({ length: 1000 }, (_, i) => ({ honest: student(i + 1, (p) => bestBet(p)), over: student(i + 1, (p) => up(bestBet(p))) }));

  it("time to the next purchase stays between 0.4 and 3 Shifts for at least 95% of the first 10 purchases", () => {
    const gaps = runs.flatMap((r) => r.honest.gaps.slice(1)); // the first purchase is timed from a standing start
    const inBand = gaps.filter((g) => g >= 0.4 && g <= 3).length / gaps.length;
    expect(runs.filter((r) => r.honest.gaps.length >= 8).length).toBeGreaterThanOrEqual(990); // students on 1 Shift a day get about 14 Shifts
    expect(inBand).toBeGreaterThanOrEqual(0.95);
  });
  it("an overconfident policy never out-earns the honest one", () => {
    // in expectation, for every single student; on the actual dice rolls, on average and for at most 1% of students (luck on 170 answers)
    expect(runs.every((r) => r.over.expected < r.honest.expected)).toBe(true);
    const mean = (k: "honest" | "over") => runs.reduce((a, r) => a + r[k].net, 0) / runs.length;
    expect(mean("over")).toBeLessThan(mean("honest"));
    expect(runs.filter((r) => r.over.net >= r.honest.net).length).toBeLessThanOrEqual(10);
  });
  it("study tools never exceed 3x base", () => {
    for (const tool of ["secondChance", "defuser"] as const)
      for (let u = 0; u < 100; u++) expect(priceOf(tool, { boughtThisRun: {}, usesThisShift: { [tool]: u }, copies: {}, tier: 4, index: 2 }).price).toBeLessThanOrEqual(3 * STUDY_BASE[tool]);
  });
});

describe("bomb targets, board multiplier and Fever", () => {
  it("board multiplier: x2 at 5 or fewer bombs standing, x3 at 2 or fewer, on boards starting with 6 or more", () => {
    expect(boardMultiplier(0, 0)).toBe(1);
    expect(boardMultiplier(4, 3)).toBe(1); // light boards never get it
    expect(boardMultiplier(8, 0)).toBe(1);
    expect(boardMultiplier(8, 1)).toBe(1);
    expect(boardMultiplier(8, 3)).toBe(2);
    expect(boardMultiplier(8, 6)).toBe(3);
  });
  it("balls that hit bomb pegs arm their retests and every hit peg stays dimmed for the drop", () => {
    let armed = 0, raised = 0;
    for (let s = 1; s <= 40; s++) {
      const d = createDrop(pegs, bombHeavy, { balls: 3, seed: s });
      d.resolve();
      armed += d.armed.length;
      raised += d.boardMult > 1 ? 1 : 0;
      for (const b of d.balls) for (const i of b.hit) expect(d.fallen.has(i)).toBe(true);
    }
    expect(armed).toBeGreaterThan(0);
    expect(raised).toBeGreaterThan(0);
  });
  it("Fever drops land in five Fever buckets and pay more than a normal drop", () => {
    let fever = 0, normal = 0;
    for (let s = 1; s <= 40; s++) {
      const d = createDrop(pegs, mixed, { balls: 4, seed: s, fever: true });
      fever += d.resolve();
      expect(d.mult).toEqual(FEVER_MULTIPLIERS);
      normal += createDrop(pegs, mixed, { balls: 4, seed: s }).resolve();
    }
    expect(fever).toBeGreaterThan(normal * 1.5);
  });
  it("Calm mode's Fever summary pays the expected value", () => expect(FEVER_FLAT).toBe(9));
});

describe("Peg Hands", () => {
  const card = (index: number, confidence: Confidence = "pretty"): HandCard => ({ index, confidence });
  it("recognises Flush, Straight and Full House, and only from what it's given (correct answers)", () => {
    expect(pegHand([0, 1, 2, 3, 0].map((i) => card(i)), 12)?.name).toBe("Flush"); // all in section 0..3
    expect(pegHand([2, 3, 4, 5, 6].map((i) => card(i)), 12)?.name).toBe("Straight");
    expect(pegHand([...[0, 5, 9].map((i) => card(i, "certain")), card(1), card(11)], 12)?.name).toBe("Full House");
    expect(pegHand([0, 5, 9, 11].map((i) => card(i)), 12)).toBeNull();
  });
  it("chips x mult is capped at x10", () => {
    expect(answerMult(3, { mult: 5 })).toBe(10);
    expect(answerMult(1.5, null)).toBe(1.5);
  });
});

describe("peg synergies", () => {
  it("Prize Wheel segments grow with streak tier and tier", () => {
    expect(tierSegments(1, streakTier(1))).toEqual([1, 2, 2, 3, 3, 5, 8]);
    expect(tierSegments(1, streakTier(2))).toEqual([2, 3, 3, 4, 4, 6, 9]);
    expect(tierSegments(2, streakTier(3))).toEqual([4, 5, 5, 6, 6, 8, 11]);
  });
  it("Splitter plus Black Hole pulls balls toward the centre buckets", () => {
    const board = placeSpecials(pegs, ["splitter", "blackhole"]);
    const centre = (synergies: boolean) => {
      const landed = new Array(7).fill(0);
      for (let s = 1; s <= 80; s++) {
        const d = createDrop(board, mixed, { balls: 3, seed: s, synergies });
        d.resolve();
        d.landed.forEach((n, i) => (landed[i] += n));
      }
      return (landed[2] + landed[3] + landed[4]) / landed.reduce((a, b) => a + b, 0);
    };
    expect(centre(true)).toBeGreaterThan(centre(false));
  });
  it("Bumper plus Magnet sends balls at bomb pegs", () => {
    const board = placeSpecials(pegs, ["bumper"]);
    const bombHits = (synergies: boolean) => {
      let n = 0;
      for (let s = 1; s <= 80; s++) {
        const d = createDrop(board, bombHeavy, { balls: 3, seed: s, magnet: true, synergies });
        d.resolve();
        n += d.events.filter((e) => e.type === "peg" && e.state === "bomb").length;
      }
      return n;
    };
    expect(bombHits(true)).toBeGreaterThan(bombHits(false));
  });
});
