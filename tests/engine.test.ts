import { describe, expect, it } from "vitest";
import {
  rng, updateState, newConceptState, pegState, priority, calibration, drawOffer,
  pickQuestion, readiness, daysUntil, type Attempt, type ConceptState, type Confidence,
} from "@/lib/engine";
import bank from "@/data/databases-101.json";
import { SEEDED, loadUnit } from "@/lib/loadUnit";
import type { Question } from "@/lib/engine";
import { bestBet, betOutcome, breakEven, calibrationGap, calibrationGrade, evNet } from "@/lib/economy";

const now = new Date("2026-10-02T10:00:00");
const fresh = (id = "c") => newConceptState(id, now);
const play = (s: ConceptState, confidence: Confidence, correct: boolean) => updateState(s, { confidence, correct }, 9, now);

describe("scoring", () => {
  it("pays chips and adds debt per the table", () => {
    expect(betOutcome("guess", true)).toEqual({ chips: 2, debt: 0, balls: 1, plantBomb: false });
    expect(betOutcome("pretty", true)).toEqual({ chips: 4, debt: 0, balls: 1, plantBomb: false });
    expect(betOutcome("certain", true)).toEqual({ chips: 6, debt: 0, balls: 1, plantBomb: false });
    expect(betOutcome("guess", false)).toEqual({ chips: 0, debt: 0, balls: 0, plantBomb: false });
    expect(betOutcome("pretty", false)).toEqual({ chips: 0, debt: 2, balls: 0, plantBomb: false });
    expect(betOutcome("certain", false)).toEqual({ chips: 0, debt: 12, balls: 0, plantBomb: true });
  });
  it("expected values are Guess 2p, Pretty sure 6p - 2, Certain 18p - 12", () => {
    for (const p of [0, 0.3, 0.5, 0.8, 1]) {
      expect(evNet("guess", p)).toBeCloseTo(2 * p);
      expect(evNet("pretty", p)).toBeCloseTo(6 * p - 2);
      expect(evNet("certain", p)).toBeCloseTo(18 * p - 12);
    }
  });
  it("break-evens sit at 50% and about 83%", () => {
    expect(breakEven("guess", "pretty")).toBeCloseTo(0.5);
    expect(breakEven("pretty", "certain")).toBeCloseTo(5 / 6);
  });
  it("honest confidence is the best strategy", () => {
    expect(bestBet(0.3)).toBe("guess");
    expect(bestBet(0.49)).toBe("guess");
    expect(bestBet(0.51)).toBe("pretty");
    expect(bestBet(0.8)).toBe("pretty");
    expect(bestBet(0.85)).toBe("certain");
  });
  it("the bonus ball and the multiplier never move a break-even", () => {
    // a ball worth v on every correct answer, and a multiplier m on gains and debts alike
    for (const v of [0, 1, 1.25, 3])
      for (const m of [1, 1.5, 3, 10]) {
        const ev = (c: Confidence, p: number) => {
          const w = betOutcome(c, true, m), l = betOutcome(c, false, m);
          return p * (w.chips + w.balls * v * m) - (1 - p) * l.debt;
        };
        const best = (p: number) => (["guess", "pretty", "certain"] as Confidence[]).reduce((b, c) => (ev(c, p) > ev(b, p) + 1e-9 ? c : b), "guess" as Confidence);
        expect(best(0.49)).toBe("guess");
        expect(best(0.51)).toBe("pretty");
        expect(best(0.82)).toBe("pretty");
        expect(best(0.84)).toBe("certain");
      }
  });
  it("an overclaiming bettor earns less than an honest one at the same accuracy", () => {
    const rand = rng(7);
    let honest = 0, over = 0, always = 0;
    const up = (c: Confidence): Confidence => (c === "guess" ? "pretty" : "certain");
    for (let i = 0; i < 20000; i++) {
      const p = 0.4 + rand() * 0.6; // mean 70% accuracy
      const right = rand() < p;
      const net = (c: Confidence) => { const o = betOutcome(c, right); return o.chips - o.debt; };
      honest += net(bestBet(p));
      over += net(up(bestBet(p)));
      always += net("certain");
    }
    expect(over).toBeLessThan(honest);
    expect(always).toBeLessThan(honest);
  });
});

describe("calibration grade", () => {
  const at = (confidence: Confidence, correct: boolean): Attempt => ({ id: "", questionId: "", conceptId: "", chosen: "A", confidence, correct, ms: 0, at: "" });
  it("gap is abs(mean stated probability - accuracy) over the last 20 answers", () => {
    const old = Array.from({ length: 30 }, () => at("certain", false));
    const recent = [...Array.from({ length: 13 }, () => at("pretty", true)), ...Array.from({ length: 7 }, () => at("pretty", false))];
    expect(calibrationGap([...old, ...recent])).toBeCloseTo(2); // 67% stated, 65% right
    expect(calibrationGrade(calibrationGap([...old, ...recent]))).toBe(3);
  });
  it("grades 3, 2, 1, 0 at 5, 10, 15 points", () => {
    expect([0, 5, 5.1, 10, 15, 15.1].map(calibrationGrade)).toEqual([3, 3, 2, 2, 1, 0]);
    expect(calibrationGrade(null)).toBe(0);
  });
});

describe("mastery", () => {
  it("lucky guesses don't move the box", () => expect(play(fresh(), "guess", true).box).toBe(1));
  it("confident correct moves up, capped at 5", () => {
    let s = fresh();
    for (let i = 0; i < 7; i++) s = play(s, "certain", true);
    expect(s.box).toBe(5);
    expect(pegState(s)).toBe("solid");
  });
  it("certain and wrong plants a bomb and drops to box 1", () => {
    let s = play(play(play(fresh(), "pretty", true), "pretty", true), "certain", false);
    expect(s.box).toBe(1);
    expect(s.bombActive).toBe(true);
    expect(pegState(s)).toBe("bomb");
    s = play(s, "pretty", true);
    expect(s.bombActive).toBe(false);
    expect(s.box).toBe(2);
  });
  it("a guess can't defuse a bomb", () => expect(play(play(fresh(), "certain", false), "guess", true).bombActive).toBe(true));
  it("wrong drops one box, never below 1", () => {
    expect(play(fresh(), "pretty", false).box).toBe(1);
    expect(play(play(fresh(), "pretty", true), "guess", false).box).toBe(1);
  });
  it("intervals are capped at half the days to exam", () => {
    let s = fresh();
    for (let i = 0; i < 4; i++) s = updateState(s, { confidence: "certain", correct: true }, 4, now);
    expect(new Date(s.dueAt).getTime() - now.getTime()).toBe(2 * 86_400_000);
  });
  it("cold pegs until attempted", () => expect(pegState(fresh())).toBe("cold"));
});

describe("targeting", () => {
  it("bombs outrank everything", () => {
    const bomb = play(fresh(), "certain", false);
    const cold = fresh();
    expect(priority(bomb, 9, now)).toBeGreaterThan(priority(cold, 9, now));
  });
  it("draw skips the last two concepts, so a bomb returns ~3 questions later", () => {
    const states = ["a", "b", "c", "d", "e"].map(fresh);
    states[0] = play(states[0], "certain", false);
    expect(drawOffer(states, ["a"], 9, 5, 3, now)).not.toContain("a");
    expect(drawOffer(states, ["a", "b", "c"], 9, 5, 3, now)[0]).toBe("a");
  });
  it("first draw follows unit order", () => {
    expect(drawOffer(["a", "b", "c", "d"].map(fresh), [], 9, 0, 3, now)).toEqual(["a", "b", "c"]);
  });
  it("retest uses a different question on the concept", () => {
    const qs = bank.questions as Question[];
    const a: Attempt = { id: "1", questionId: "nulls-1", conceptId: "nulls", chosen: "A", confidence: "certain", correct: false, ms: 1, at: "" };
    expect(pickQuestion(qs, "nulls", [], [])!.id).toBe("nulls-1");
    expect(pickQuestion(qs, "nulls", [a], [])!.id).toBe("nulls-2");
    expect(pickQuestion(qs, "nulls", [], ["nulls-1", "nulls-2", "nulls-3", "nulls-4"])).toBeUndefined();
  });
});

describe("calibration and readiness", () => {
  const at = (confidence: Confidence, correct: boolean): Attempt => ({ id: "", questionId: "", conceptId: "", chosen: "A", confidence, correct, ms: 0, at: "" });
  it("reports overconfidence as a positive gap", () => {
    const c = calibration([at("certain", false), at("certain", true)])!;
    expect(c.accuracy).toBe(0.5);
    expect(c.gapPoints).toBe(42);
  });
  it("empty is null", () => expect(calibration([])).toBeNull());
  it("readiness counts bombs and untried as zero and blends the exam", () => {
    const solid = { ...fresh(), attempts: 3, box: 5 as const };
    expect(readiness([solid, fresh()])).toBe(50);
    expect(readiness([solid, fresh()], { correct: 10, total: 10, at: "" })).toBe(75);
  });
  it("days until exam", () => expect(daysUntil("2026-10-11", now)).toBe(9));
});

describe.each(SEEDED.map((s) => [s.bank.unit.name, s.bank] as const))("seeded bank: %s", (_, b) => {
  it("12 concepts, 4 well-formed questions each, every wrong option explained", () => {
    expect(b.concepts).toHaveLength(12);
    expect(new Set(b.questions.map((q) => q.id)).size).toBe(b.questions.length);
    for (const c of b.concepts) {
      expect(c.unitId).toBe(b.unit.id);
      const qs = (b.questions as Question[]).filter((q) => q.conceptId === c.id);
      expect(qs).toHaveLength(4);
      for (const q of qs) {
        expect(q.options.map((o) => o.id)).toEqual(["A", "B", "C", "D"]);
        for (const o of q.options) expect(Boolean(o.misconception)).toBe(o.id !== q.correct);
      }
    }
    const correct = (b.questions as Question[]).map((q) => q.correct);
    for (const k of ["A", "B", "C", "D"]) expect(correct.filter((c) => c === k).length).toBeGreaterThanOrEqual(6); // answer position varies
  });
});

describe("unit picking", () => {
  it("routes names to the right offline unit, never sending them to the network", async () => {
    expect((await loadUnit("materials chemistry", "2026-10-11", () => {})).unit.id).toBe("materials-chemistry");
    expect((await loadUnit("Materials Chem 2", "2026-10-11", () => {})).unit.id).toBe("materials-chemistry");
    expect((await loadUnit("Databases 101", "2026-10-11", () => {})).unit.id).toBe("databases-101");
    expect((await loadUnit("soil properties (chemistry)", "2026-10-11", () => {})).unit.id).toBe("soil-chemistry");
    expect((await loadUnit("Soil Chem", "2026-10-11", () => {})).unit.id).toBe("soil-chemistry");
  });
});
