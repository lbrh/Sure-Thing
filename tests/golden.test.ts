// Golden path (MVP plan section 8): setup -> Shift 1 -> shop -> Shift 2 -> Exam Day -> report, through the real store.
import { describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  const m = new Map<string, string>();
  globalThis.localStorage = { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) } as Storage;
});
import { mergeSave, useGame, SHIFT_LENGTH } from "@/lib/store";
import { createDrop, layoutPegs } from "@/lib/board";
import { hashString, pegState, readiness, type OptionId } from "@/lib/engine";
import { loadUnit } from "@/lib/loadUnit";

const g = () => useGame.getState();
const wrongOf = (c: OptionId): OptionId => (c === "A" ? "B" : "A");

function drop() {
  const s = g();
  const pegs = layoutPegs(s.concepts.map((c) => c.id), hashString(s.unit!.id));
  const states = Object.fromEntries(s.concepts.map((c) => [c.id, pegState(s.conceptState[c.id])]));
  const chips = s.session!.pendingBalls ? createDrop(pegs, states, { balls: s.session!.pendingBalls, seed: s.session!.dropSeed, magnet: s.inventory.magnet }).resolve() : 0;
  g().finishDrop(chips);
}

/** Answer the current question: right unless told otherwise. */
function answer(confidence: "guess" | "pretty" | "certain", right = true) {
  const q = g().questions.find((x) => x.id === g().session!.questionId)!;
  g().answer(right ? q.correct : wrongOf(q.correct), confidence);
  expect(g().screen).toBe("reveal");
  if (g().session?.kind === "exam" || g().reveal?.secondChance) g().continueReveal(); // shifts drop right beside the reveal
}

function playShift(lastWrong: boolean) {
  g().startShift();
  for (let i = 0; i < SHIFT_LENGTH; i++) {
    expect(g().screen).toBe("draw");
    expect(g().session!.offer).toHaveLength(3);
    g().choose(g().session!.offer[0]);
    expect(g().screen).toBe("question");
    const plant = lastWrong && i === SHIFT_LENGTH - 1;
    answer(plant ? "certain" : "pretty", !plant);
    expect(g().screen).toBe("reveal"); // the board stays up beside the answer
    drop();
  }
  expect(g().screen).toBe("summary");
}

describe("golden path", () => {
  it("plays end to end from the seeded unit", async () => {
    const loaded = await loadUnit("Databases 101", "2026-10-11", () => {});
    expect(loaded.unit.live).toBe(false);
    g().setup(loaded.unit, loaded.concepts, loaded.questions);
    expect(g().screen).toBe("intro");
    expect(g().chips).toBe(5);

    // Shift 1: the hero moment first (certain and wrong on NULL handling), then honest bets
    g().startShift();
    expect(g().session!.offer[0]).toBe("nulls");
    g().choose("nulls");
    expect(g().session!.questionId).toBe("nulls-1");
    g().answer("A", "certain");
    expect(g().reveal!.bombPlanted).toBe(true);
    expect(g().chips).toBe(5); // debt never comes out of chips
    expect(g().debt).toBe(12);
    expect(g().conceptState.nulls.bombActive).toBe(true);
    drop();
    const asked: string[] = ["nulls"];
    for (let i = 1; i < SHIFT_LENGTH; i++) {
      const offer = g().session!.offer;
      if (i < 3) expect(offer).not.toContain("nulls"); // retest comes back ~3 questions later
      const pick = offer.includes("nulls") ? "nulls" : offer[0];
      asked.push(pick);
      g().choose(pick);
      answer("pretty");
      drop();
    }
    expect(asked.slice(3)).toContain("nulls"); // retested in the same Shift...
    expect(g().conceptState.nulls.bombActive).toBe(true); // ...but a bomb needs a Shift's wait before it defuses
    expect(g().pot).toBe(5);
    expect(g().screen).toBe("summary");
    expect(g().shiftsDone).toBe(1);
    expect(g().chips).toBeGreaterThanOrEqual(15); // enough for a Defuser, as in the demo script
    expect(g().debt).toBe(12); // defusing never refunds the debt
    expect(g().session!.skillChips / (g().session!.skillChips + g().session!.chanceChips)).toBeGreaterThanOrEqual(0.8);

    // Shop: earn enough, then buy a Second Chance; chips never go negative
    useGame.setState({ chips: 30 });
    g().buy("secondChance");
    expect(g().inventory.secondChance).toBe(1);
    expect(g().chips).toBe(18);
    expect(g().shop.usesThisShift.secondChance).toBe(1);
    g().buy("secondChance"); // study tools: +10% per use this Shift
    expect(g().chips).toBe(18 - 14);
    useGame.setState({ inventory: { ...g().inventory, secondChance: 1 } });
    g().reroll();
    expect(g().chips).toBe(2);
    expect(g().shop.rerolls).toBe(1);

    // Shift 2: Second Chance absorbs the first miss (no penalty, no bomb, retry)
    g().startShift();
    expect(g().session!.offer[0]).toBe("nulls"); // the waiting bomb leads the Draw
    g().choose("nulls");
    const q = g().questions.find((x) => x.id === g().session!.questionId)!;
    expect(q.id).not.toBe("nulls-1");
    const chipsBefore = g().chips;
    const debtBefore = g().debt;
    g().answer(wrongOf(q.correct), "certain");
    expect(g().reveal!.secondChance).toBe(true);
    expect(g().chips).toBe(chipsBefore);
    expect(g().debt).toBe(debtBefore);
    expect(g().pot).toBe(5); // no new bomb planted
    g().continueReveal();
    expect(g().screen).toBe("question");
    const chipsPre = g().chips;
    answer("certain");
    expect(g().reveal!.bombDefused).toBe(true);
    expect(g().reveal!.potPaid).toBe(3); // half of the bomb's 5, rounded
    expect(g().chips).toBe(chipsPre + 3);
    expect(g().pot).toBe(2);
    expect(g().debt).toBe(12); // defusing never refunds debt
    expect(g().reveal!.fever).toBe(true); // that was the last bomb on the board: Fever, after the defuse lands
    expect(g().session!.pendingBalls).toBe(1 + 3);
    const calmChips = g().chips + g().session!.pendingChips;
    g().finishDrop(0, 0, [], true); // Calm mode or reduced motion: plain summary at the expected value
    expect(g().chips).toBe(calmChips + 9);
    for (let i = 1; i < SHIFT_LENGTH; i++) {
      g().choose(g().session!.offer[0]);
      answer(i % 2 ? "certain" : "guess", i !== 3);
      drop();
    }
    expect(g().shiftsDone).toBe(2);
    expect(g().shop.usesThisShift).toEqual({}); // study tool prices reset each Shift
    expect(g().shop.rerolls).toBe(0);
    expect(g().shop.shiftIncome).toHaveLength(2);

    // Defuser: plant a bomb in Shift 3, then buy a retest from the shop
    playShift(true);
    const bomb = g().concepts.find((c) => g().conceptState[c.id].bombActive)!;
    useGame.setState({ chips: 15 });
    g().buy("defuser", bomb.id);
    expect(g().session!.kind).toBe("defuse");
    expect(g().chips).toBe(0);
    answer("pretty");
    drop();
    expect(g().conceptState[bomb.id].bombActive).toBe(false);

    // Exam Day: 10 questions, no chips at stake, result feeds the report
    const chips = g().chips;
    g().startExam();
    for (let i = 0; i < 10; i++) {
      expect(g().screen).toBe("question");
      answer("pretty", i % 3 !== 0);
    }
    expect(g().screen).toBe("report");
    expect(g().exam).toMatchObject({ total: 10, correct: 6 });
    expect(g().pot).toBe(0); // Exam Day pays out the rest, never costs anything
    expect(g().chips).toBe(chips + g().exam!.potPaid!);
    expect(g().exam!.potPaid!).toBeGreaterThanOrEqual(0);
    const states = g().concepts.map((c) => g().conceptState[c.id]);
    expect(readiness(states, g().exam)).toBeGreaterThan(0);
  });

  it("daily cap stops new Shifts", () => {
    const today = new Date().toISOString().slice(0, 10);
    useGame.setState({ shiftLog: { date: today, count: 6 }, screen: "hub" });
    g().startShift();
    expect(g().screen).toBe("hub");
    expect(g().line).toMatch(/Enough for today/);
  });

  it("flagging swaps the question and excludes it", () => {
    useGame.setState({ shiftLog: { date: "", count: 0 } });
    g().startShift();
    g().choose("views");
    const first = g().session!.questionId!;
    g().flag(first);
    expect(g().flagged).toContain(first);
    expect(g().session!.questionId).not.toBe(first);
  });
});

describe("streaks and resuming", () => {
  const fresh = async () => {
    const l = await loadUnit("Databases 101", "2026-10-11", () => {});
    g().setup(l.unit, l.concepts, l.questions);
    useGame.setState({ shiftLog: { date: "", count: 0 } });
  };
  const right = (confidence: "guess" | "pretty" | "certain" = "pretty") => {
    const q = g().questions.find((x) => x.id === g().session!.questionId)!;
    g().answer(q.correct, confidence);
  };

  it("streak multiplier: x1, x1.5, x2, x2.5, capped at x3", async () => {
    const { streakMultiplier } = await import("@/lib/engine");
    expect([0, 1, 2, 3, 4, 5, 9].map(streakMultiplier)).toEqual([1, 1, 1.5, 2, 2.5, 3, 3]);
  });

  it("correct answers build the streak, it multiplies the bet payout, and a miss resets it", async () => {
    await fresh();
    g().startShift();
    for (let i = 1; i <= 3; i++) {
      g().choose(g().session!.offer[0]);
      right();
      expect(g().streak).toBe(i);
      expect(g().reveal!.streak).toBe(i);
      const m = [1, 1.5, 2][i - 1];
      expect(g().reveal!.chips).toBe(Math.round(4 * m));
      const before = g().chips;
      g().finishDrop(10); // pretend the board paid 10
      expect(g().chips - before).toBe(Math.round(4 * m) + 10); // the board's luck is never multiplied
    }
    // the multiplier you play at scales the debt just the same
    g().choose(g().session!.offer[0]);
    const q = g().questions.find((x) => x.id === g().session!.questionId)!;
    const chips = g().chips;
    g().answer(q.correct === "A" ? "B" : "A", "certain");
    expect(g().streak).toBe(0);
    expect(g().reveal!.lostStreak).toBe(3);
    expect(g().reveal!.debt).toBe(12 * 2.5);
    expect(g().chips).toBe(chips);
  });

  it("leaving a Shift for the Shop keeps your place, including an undropped answer", async () => {
    await fresh();
    g().startShift();
    g().choose(g().session!.offer[0]);
    right();
    g().finishDrop(0);
    g().choose(g().session!.offer[0]);
    right("certain");
    expect(g().screen).toBe("reveal");
    const balls = g().session!.pendingBalls;
    g().go("shop");
    expect(g().screen).toBe("shop");
    g().go("hub");
    g().startShift(); // the big green button resumes rather than starting over
    expect(g().screen).toBe("reveal");
    expect(g().session!.answered).toBe(2);
    expect(g().session!.pendingBalls).toBe(balls);
    expect(g().shiftLog.count).toBe(1); // didn't burn a second Shift from the daily cap
  });

  it("a mid-question exit resumes on that same question", async () => {
    await fresh();
    g().startShift();
    g().choose(g().session!.offer[0]);
    const qid = g().session!.questionId;
    g().go("report");
    g().resume();
    expect(g().screen).toBe("question");
    expect(g().session!.questionId).toBe(qid);
  });
});

describe("shop pegs and old saves", () => {
  it("buys up to 3 copies of a peg at the unlocked tier, each dearer than the last", async () => {
    const l = await loadUnit("Databases 101", "2026-10-11", () => {});
    g().setup(l.unit, l.concepts, l.questions);
    useGame.setState({ chips: 1000 });
    const prices: number[] = [];
    for (let i = 0; i < 4; i++) {
      const before = g().chips;
      g().buy("bumper");
      prices.push(before - g().chips);
    }
    expect(prices.slice(0, 3)).toEqual([75, 87, 100]); // ceil(55 * 1.15 ^ copies)
    expect(prices[3]).toBe(0); // a 4th copy isn't for sale
    expect(g().inventory.pegs).toEqual([1, 1, 1].map((tier) => ({ kind: "bumper", tier })));
  });
  it("loads an old sure-thing-v1 save with renamed plain pegs and no shop state", async () => {
    const old = { chips: 7, inventory: { secondChance: 1, pegs: ["roulette", "blackjack", "bumper"] }, screen: "hub" };
    const m = mergeSave(old, { ...g(), debt: 0 });
    expect(m.chips).toBe(7);
    expect(m.debt).toBe(0);
    expect(m.inventory.pegs).toEqual([{ kind: "wheel", tier: 1 }, { kind: "quiz21", tier: 1 }, { kind: "bumper", tier: 1 }]);
    expect(m.shop).toEqual({ boughtThisRun: {}, usesThisShift: {}, rerolls: 0, shiftIncome: [] });
  });
});

describe("knowledge mechanics through the store", () => {
  const fresh = async () => {
    const l = await loadUnit("Databases 101", "2026-10-11", () => {});
    g().setup(l.unit, l.concepts, l.questions);
    useGame.setState({ shiftLog: { date: "", count: 0 } });
  };
  it("Go Deeper is offered only after a right answer and pays flat chips", async () => {
    await fresh();
    g().startShift();
    g().choose(g().session!.offer[0]);
    let q = g().questions.find((x) => x.id === g().session!.questionId)!;
    g().answer(q.correct === "A" ? "B" : "A", "guess");
    g().goDeeper();
    expect(g().reveal!.deeper).toBeUndefined(); // never after a loss
    g().finishDrop(0);
    g().choose(g().session!.offer[0]);
    q = g().questions.find((x) => x.id === g().session!.questionId)!;
    g().answer(q.correct, "pretty");
    g().goDeeper();
    const d = g().questions.find((x) => x.id === g().reveal!.deeper!.questionId)!;
    expect(d.conceptId).toBe(q.conceptId);
    expect(d.difficulty).toBeGreaterThanOrEqual(q.difficulty);
    const chips = g().chips;
    g().answerDeeper(d.correct);
    expect(g().chips).toBe(chips + 3);
    g().answerDeeper(d.correct); // once only
    expect(g().chips).toBe(chips + 3);
  });
  it("Calibration Keno marks lock in at the start of a Shift and settle at the end", async () => {
    await fresh();
    g().toggleKeno("nulls");
    g().toggleKeno("joins");
    g().toggleKeno("joins");
    expect(g().kenoMarks).toEqual(["nulls"]);
    g().startShift();
    expect(g().session!.keno).toEqual(["nulls"]);
    expect(g().kenoMarks).toEqual([]);
    g().choose("nulls");
    const q = g().questions.find((x) => x.id === g().session!.questionId)!;
    g().answer(q.correct === "A" ? "B" : "A", "guess"); // marked and wrong
    expect(g().session!.kenoDebt).toBe(2);
    expect(g().debt).toBe(0); // settled at the end of the Shift, not before
  });
  it("Calm mode unlocks a Mystery Fact on every second right Certain answer", async () => {
    await fresh();
    g().updateSettings({ calm: true });
    g().startShift();
    const facts: boolean[] = [];
    for (let i = 0; i < 4; i++) {
      g().choose(g().session!.offer[0]);
      const q = g().questions.find((x) => x.id === g().session!.questionId)!;
      g().answer(q.correct, "certain");
      facts.push(Boolean(g().reveal!.fact));
      g().finishDrop(0);
    }
    expect(facts).toEqual([false, true, false, true]);
    g().updateSettings({ calm: false });
  });
});
