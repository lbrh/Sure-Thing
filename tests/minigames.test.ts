import { describe, expect, it } from "vitest";
import { celebration, mean, PRIZE_WHEEL, q21Bonus, q21Worth, quizMultiplier, wheelEV } from "@/lib/minigames";
import { autoResult } from "@/lib/board";

describe("prize wheel", () => {
  it("has segments 1, 2, 2, 3, 3, 5, 8 with no zero and an expected value of 24/7", () => {
    expect(PRIZE_WHEEL).toEqual([1, 2, 2, 3, 3, 5, 8]);
    expect(Math.min(...PRIZE_WHEEL)).toBeGreaterThan(0);
    expect(mean(PRIZE_WHEEL)).toBeCloseTo(24 / 7, 10);
  });
  it("Calm mode resolves instantly to the expected value, rounded", () => {
    expect(wheelEV()).toBe(3);
    expect(autoResult({ kind: "wheel", seed: 5, segments: PRIZE_WHEEL }, true)).toEqual({ bonus: 3 });
  });
  it("Skip lands on a real segment, and only ever adds a bonus", () => {
    for (let s = 0; s < 200; s++) {
      const r = autoResult({ kind: "wheel", seed: s, segments: PRIZE_WHEEL });
      expect(PRIZE_WHEEL).toContain(r.bonus);
      expect(r.mult).toBeUndefined(); // the ball is never multiplied down
    }
  });
});

describe("21 quiz", () => {
  it("questions are worth 2 to 10 by difficulty", () => {
    expect(q21Worth(1, 0)).toBe(2);
    expect(q21Worth(1, 0.99)).toBe(4);
    expect(q21Worth(2, 0.5)).toBe(6);
    expect(q21Worth(3, 0.99)).toBe(10);
  });
  it("a bust only loses the hand bonus, exactly 21 doubles it", () => {
    expect(q21Bonus(15, false)).toBe(5);
    expect(q21Bonus(15, true)).toBe(0);
    expect(q21Bonus(22, false)).toBe(0);
    expect(q21Bonus(21, false)).toBe(14);
  });
});

describe("pop quiz speed bonus", () => {
  it("pays x10 when fast, slides to x2, never below", () => {
    expect(quizMultiplier(0)).toBe(10);
    expect(quizMultiplier(4000)).toBe(10);
    expect(quizMultiplier(12000)).toBe(6);
    expect(quizMultiplier(20000)).toBe(2);
    expect(quizMultiplier(90000)).toBe(2);
    for (let ms = 0; ms < 25000; ms += 500) expect(quizMultiplier(ms)).toBeGreaterThanOrEqual(quizMultiplier(ms + 500));
  });
  it("unanswered keeps the ball at x1", () => expect(autoResult({ kind: "quiz", seed: 1, segments: [] })).toEqual({ mult: 1 }));
});

describe("celebration", () => {
  it("never fires for an outcome no bigger than what the player had", () => {
    expect(celebration(4, 4)).toBe(0);
    expect(celebration(2, 4)).toBe(0);
    expect(celebration(0, 0)).toBe(0);
  });
  it("is proportional to the gain", () => {
    expect(celebration(4, 2)).toBe(1);
    expect(celebration(8, 2)).toBe(2);
    expect(celebration(16, 2)).toBe(3);
  });
});
