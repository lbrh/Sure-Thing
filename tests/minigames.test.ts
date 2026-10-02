import { describe, expect, it } from "vitest";
import { autoplay, BJ_MULT, deal, handValue, hit, ROULETTE, stand, type Card } from "@/lib/minigames";

const c = (...ranks: number[]): Card[] => ranks.map((rank) => ({ rank, suit: 0 }));

describe("blackjack", () => {
  it("counts aces soft then hard", () => {
    expect(handValue(c(1, 13))).toBe(21);
    expect(handValue(c(1, 1, 9))).toBe(21);
    expect(handValue(c(1, 9, 5))).toBe(15);
    expect(handValue(c(12, 13, 2))).toBe(22);
  });
  it("busting ends the hand, standing settles it", () => {
    let g = deal(3);
    while (!g.result) g = handValue(g.player) < 21 ? hit(g) : stand(g);
    expect(Object.keys(BJ_MULT)).toContain(g.result);
    expect(g.player.length + g.dealer.length + g.deck.length).toBe(52);
  });
  it("autoplay is deterministic and pays like a fair-ish bet", () => {
    expect(autoplay(42)).toBe(autoplay(42));
    let total = 0;
    for (let s = 0; s < 2000; s++) total += BJ_MULT[autoplay(s)];
    const ev = total / 2000;
    expect(ev).toBeGreaterThan(1);
    expect(ev).toBeLessThan(2.5);
  });
});

describe("roulette", () => {
  it("has 12 slots and a shown EV around 2", () => {
    expect(ROULETTE).toHaveLength(12);
    expect(ROULETTE.reduce((a, b) => a + b, 0) / 12).toBeCloseTo(2.08, 1);
  });
});

describe("pop quiz speed bonus", () => {
  it("pays x10 when fast, slides to x2, never below", async () => {
    const { quizMultiplier } = await import("@/lib/minigames");
    expect(quizMultiplier(0)).toBe(10);
    expect(quizMultiplier(4000)).toBe(10);
    expect(quizMultiplier(12000)).toBe(6);
    expect(quizMultiplier(20000)).toBe(2);
    expect(quizMultiplier(90000)).toBe(2);
    for (let ms = 0; ms < 25000; ms += 500) expect(quizMultiplier(ms)).toBeGreaterThanOrEqual(quizMultiplier(ms + 500));
  });
});
