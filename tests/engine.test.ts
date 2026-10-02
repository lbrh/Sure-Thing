import { describe, expect, it } from "vitest";
import {
  betOutcome, updateState, newConceptState, pegState, priority, calibration, drawOffer,
  pickQuestion, readiness, daysUntil, type Attempt, type ConceptState, type Confidence,
} from "@/lib/engine";
import bank from "@/data/databases-101.json";
import { SEEDED, loadUnit } from "@/lib/loadUnit";
import type { Question } from "@/lib/engine";

const now = new Date("2026-10-02T10:00:00");
const fresh = (id = "c") => newConceptState(id, now);
const play = (s: ConceptState, confidence: Confidence, correct: boolean) => updateState(s, { confidence, correct }, 9, now);

describe("scoring", () => {
  it("pays and penalises per the table", () => {
    expect(betOutcome("guess", true)).toEqual({ balls: 1, chipPenalty: 0, plantBomb: false });
    expect(betOutcome("pretty", false)).toEqual({ balls: 0, chipPenalty: 1, plantBomb: false });
    expect(betOutcome("certain", false)).toEqual({ balls: 0, chipPenalty: 4, plantBomb: true });
  });
  it("honest confidence is the best strategy", () => {
    const ev = (c: Confidence, p: number) => { const w = betOutcome(c, true), l = betOutcome(c, false); return p * w.balls - (1 - p) * l.chipPenalty; };
    const best = (p: number) => (["guess", "pretty", "certain"] as Confidence[]).sort((a, b) => ev(b, p) - ev(a, p))[0];
    expect(best(0.3)).toBe("guess");
    expect(best(0.65)).toBe("pretty");
    expect(best(0.9)).toBe("certain");
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
    expect(c.gapPoints).toBe(40);
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
