// Golden path (MVP plan section 8): setup -> Shift 1 -> shop -> Shift 2 -> Exam Day -> report, through the real store.
import { describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  const m = new Map<string, string>();
  globalThis.localStorage = { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) } as Storage;
});
import { useGame, SHIFT_LENGTH } from "@/lib/store";
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
    expect(g().chips).toBe(1);
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
    expect(asked.slice(3)).toContain("nulls"); // retested in the same Shift
    expect(g().conceptState.nulls.bombActive).toBe(false); // and defused with a different question
    expect(g().session!.bombsDefused).toContain("nulls");
    expect(g().screen).toBe("summary");
    expect(g().shiftsDone).toBe(1);
    expect(g().chips).toBeGreaterThan(1);
    expect(g().chips).toBeGreaterThanOrEqual(10); // enough for a Defuser, as in the demo script

    // Shop: earn enough, then buy a Second Chance; chips never go negative
    useGame.setState({ chips: 20 });
    g().buy("secondChance");
    expect(g().inventory.secondChance).toBe(1);
    expect(g().chips).toBe(12);

    // Shift 2: Second Chance absorbs the first miss (no penalty, no bomb, retry)
    g().startShift();
    g().choose(g().session!.offer[0]);
    const q = g().questions.find((x) => x.id === g().session!.questionId)!;
    const chipsBefore = g().chips;
    g().answer(wrongOf(q.correct), "certain");
    expect(g().reveal!.secondChance).toBe(true);
    expect(g().chips).toBe(chipsBefore);
    expect(g().conceptState[q.conceptId].bombActive).toBe(false);
    g().continueReveal();
    expect(g().screen).toBe("question");
    answer("certain");
    drop();
    for (let i = 1; i < SHIFT_LENGTH; i++) {
      g().choose(g().session!.offer[0]);
      answer(i % 2 ? "certain" : "guess", i !== 3);
      drop();
    }
    expect(g().shiftsDone).toBe(2);

    // Defuser: plant a bomb in Shift 3, then buy a retest from the shop
    playShift(true);
    const bomb = g().concepts.find((c) => g().conceptState[c.id].bombActive)!;
    useGame.setState({ chips: 10 });
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
    expect(g().chips).toBe(chips);
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

  it("correct answers build the streak, it multiplies drop chips, and a miss resets it", async () => {
    await fresh();
    g().startShift();
    for (let i = 1; i <= 3; i++) {
      g().choose(g().session!.offer[0]);
      right();
      expect(g().streak).toBe(i);
      expect(g().reveal!.streak).toBe(i);
      const before = g().chips;
      g().finishDrop(10); // pretend the board paid 10
      expect(g().chips - before).toBe(Math.round(10 * [1, 1.5, 2][i - 1]));
    }
    g().choose(g().session!.offer[0]);
    const q = g().questions.find((x) => x.id === g().session!.questionId)!;
    g().answer(q.correct === "A" ? "B" : "A", "guess");
    expect(g().streak).toBe(0);
    expect(g().reveal!.lostStreak).toBe(3);
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
