import { describe, expect, it } from "vitest";
import {
  examForecast, rng, updateState, newConceptState, pegState, priority, calibration, drawOffer,
  pickQuestion, readiness, daysUntil, type Attempt, type ConceptState, type Confidence,
} from "@/lib/engine";
import bank from "@/data/databases-101.json";
import { SEEDED, loadUnit } from "@/lib/loadUnit";
import type { Question } from "@/lib/engine";
import { draftOffers, masteryMarks, RELIC_IDS, stakeHas, stakeTable, bingoCard, bingoLines, bingoMarked, factUnlocked, FREE, kenoBreakEven, kenoScore, defusePayout, examPotPayout, bestBet, betOutcome, boostPrice, breakEven, calibrationGap, calibrationGrade, evNet, incomeIndex, interest, pegPrice, rerollCost, studyPrice, tierUnlocked } from "@/lib/economy";

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

describe("shop price formulas", () => {
  it("study tools: base * (1 + 0.1 * usesThisShift), never above 3x base", () => {
    expect([0, 1, 5, 19, 20, 50].map((u) => studyPrice(10, u))).toEqual([10, 11, 15, 29, 30, 30]);
  });
  it("boosts: ceil(base * 1.12 ^ boughtThisRun)", () => expect([0, 1, 2].map((n) => boostPrice(65, n))).toEqual([65, 73, 82]));
  it("pegs: ceil(baseTier * 1.15 ^ copies), stronger tiers cost more", () => {
    expect([0, 1, 2].map((n) => pegPrice("bumper", 1, n))).toEqual([75, 87, 100]);
    expect(pegPrice("bumper", 2, 0)).toBeGreaterThan(pegPrice("bumper", 1, 0));
  });
  it("tiers unlock at 25, 50 and 75% mastered", () => expect([0, 0.25, 0.5, 0.74, 0.75, 1].map(tierUnlocked)).toEqual([1, 2, 3, 3, 4, 4]));
  it("income index uses recent income against the first Shift, caps at 2 and can fall", () => {
    expect(incomeIndex([40])).toBe(1);
    expect(incomeIndex([40, 160, 160, 160])).toBe(2);
    expect(incomeIndex([40, 90, 90, 90])).toBeCloseTo(1.5);
    expect(incomeIndex([40, 90, 90, 90, 10, 10, 10])).toBeLessThan(1);
  });
  it("interest is +1 per 10 held, capped at +3; rerolls cost 2 rising by 1", () => {
    expect([0, 9, 10, 29, 300].map(interest)).toEqual([0, 0, 1, 2, 3]);
    expect([0, 1, 2].map(rerollCost)).toEqual([2, 3, 4]);
  });
});

describe("Ledger Pot", () => {
  it("defusing pays half a bomb's share", () => {
    expect(defusePayout(5)).toBe(3);
    expect(defusePayout(10)).toBe(5);
  });
  it("Exam Day pays the rest by readiness, trimmed by debt, never below zero", () => {
    expect(examPotPayout(20, 50, 100, 0)).toBe(10);
    expect(examPotPayout(20, 50, 100, 100)).toBe(5);
    expect(examPotPayout(20, 0, 100, 0)).toBe(0);
    expect(examPotPayout(0, 100, 0, 999)).toBe(0);
    for (const debt of [0, 10, 1e6]) expect(examPotPayout(30, 80, 50, debt)).toBeGreaterThanOrEqual(0);
  });
  it("a bomb that hasn't waited a Shift stays armed", () => {
    const bomb = play(fresh(), "certain", false);
    expect(updateState(bomb, { confidence: "pretty", correct: true, defusable: false }, 9, now).bombActive).toBe(true);
    expect(updateState(bomb, { confidence: "pretty", correct: true }, 9, now).bombActive).toBe(false);
  });
});

describe("knowledge mechanics", () => {
  const at = (conceptId: string, shift: number, correct = true, confidence: Confidence = "pretty") => ({ conceptId, shift, correct, confidence });
  it("Concept Bingo: 5x5 with a free centre, every square a concept", () => {
    const ids = Array.from({ length: 12 }, (_, i) => `c${i}`);
    const card = bingoCard(ids, 3);
    expect(card).toHaveLength(25);
    expect(card[12]).toBe(FREE);
    for (const id of ids) expect(card.filter((c) => c === id)).toHaveLength(2);
  });
  it("a square marks only after 2 right retrievals in different Shifts, guesses don't count", () => {
    expect(bingoMarked([at("a", 1), at("a", 1)]).has("a")).toBe(false);
    expect(bingoMarked([at("a", 1), at("a", 2, true, "guess")]).has("a")).toBe(false);
    expect(bingoMarked([at("a", 1), at("a", 2, false)]).has("a")).toBe(false);
    expect(bingoMarked([at("a", 1), at("a", 2)]).has("a")).toBe(true);
  });
  it("lines count rows, columns and diagonals through the free centre", () => {
    const card = [...Array(12).fill("x"), FREE, ...Array(12).fill("y")];
    expect(bingoLines(card, new Set())).toBe(0);
    expect(bingoLines(card, new Set(["x", "y"]))).toBe(12);
  });
  it("Calibration Keno scores per the printed rule, and honest marking is optimal", () => {
    expect(kenoScore(true, true)).toEqual({ chips: 2, debt: 0 });
    expect(kenoScore(true, false)).toEqual({ chips: 0, debt: 2 });
    expect(kenoScore(false, false)).toEqual({ chips: 1, debt: 0 });
    expect(kenoScore(false, true)).toEqual({ chips: 0, debt: 0 });
    const ev = (marked: boolean, p: number) => { const r = kenoScore(marked, true), w = kenoScore(marked, false); return p * (r.chips - r.debt) + (1 - p) * (w.chips - w.debt); };
    expect(ev(true, kenoBreakEven + 0.01)).toBeGreaterThan(ev(false, kenoBreakEven + 0.01));
    expect(ev(true, kenoBreakEven - 0.01)).toBeLessThan(ev(false, kenoBreakEven - 0.01));
  });
  it("Mystery Fact: 1 in 2 on the roll; Calm mode unlocks exactly every second one (the expected value)", () => {
    expect(factUnlocked(0.3, false, 1)).toBe(true);
    expect(factUnlocked(0.7, false, 1)).toBe(false);
    expect([1, 2, 3, 4, 5, 6].filter((n) => factUnlocked(0.99, true, n))).toHaveLength(3);
  });
  it("Readiness Odds is an estimate from the answers so far", () => {
    const s = { ...fresh(), attempts: 4, correctCount: 4 };
    expect(examForecast([fresh(), fresh()])).toEqual({ expected: 5, of: 10, answers: 0 });
    expect(examForecast([s, s]).expected).toBe(8);
  });
});

describe("between runs", () => {
  it("Mastery Marks: floor(2 * sqrt(3 * mastered + 2 * defused + 10 * grade + exam% / 5))", () => {
    expect(masteryMarks({ conceptsMastered: 0, bombsDefused: 0, calibrationGrade: 0, examPercent: 0 })).toBe(0);
    expect(masteryMarks({ conceptsMastered: 4, bombsDefused: 2, calibrationGrade: 3, examPercent: 70 })).toBe(Math.floor(2 * Math.sqrt(12 + 4 + 30 + 14)));
    expect(masteryMarks({ conceptsMastered: 12, bombsDefused: 5, calibrationGrade: 3, examPercent: 100 })).toBe(19); // M = 36 + 10 + 30 + 20 = 96
  });
  it("draft offers 3 relics you don't carry", () => {
    expect(draftOffers([], 1)).toHaveLength(3);
    expect(draftOffers(["seal", "oldLedger"], 1).sort()).toEqual(RELIC_IDS.filter((r) => r !== "seal" && r !== "oldLedger").sort());
  });
  it("stakes 2 to 7 add one rule each, 8 has them all", () => {
    expect(stakeHas(2, 2)).toBe(true);
    expect(stakeHas(3, 2)).toBe(false);
    expect([2, 3, 4, 5, 6, 7].every((r) => stakeHas(8, r))).toBe(true);
    expect(stakeTable(2).debt).toEqual({ guess: 0, pretty: 2, certain: 14 });
    expect(stakeTable(6).debt).toEqual({ guess: 0, pretty: 3, certain: 12 });
    expect(stakeTable(8).debt).toEqual({ guess: 0, pretty: 3, certain: 14 });
  });
  it("at every stake, honest confidence still wins and overclaiming earns less", () => {
    for (let stake = 1; stake <= 8; stake++) {
      const t = stakeTable(stake);
      const rand = rng(stake);
      let honest = 0, over = 0;
      for (let i = 0; i < 20000; i++) {
        const p = 0.4 + rand() * 0.6;
        const right = rand() < p;
        const net = (c: Confidence) => { const o = betOutcome(c, right, 1, t); return o.chips - o.debt; };
        const h = bestBet(p, t);
        honest += net(h);
        over += net(h === "guess" ? "pretty" : "certain");
        for (const c of ["guess", "pretty", "certain"] as Confidence[]) expect(evNet(h, p, t)).toBeGreaterThanOrEqual(evNet(c, p, t));
      }
      expect(over).toBeLessThan(honest);
    }
  });
});
