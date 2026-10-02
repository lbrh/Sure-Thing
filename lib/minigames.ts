// Pure mini-game logic for the board pegs. The UI animates; outcomes come from here.
// Nothing here takes a stake: a captured ball keeps its value and these only ever add a bonus.

/** Prize Wheel: 7 segments, chips added to the captured ball. No zero, no stake. Expected value 24/7. */
export const PRIZE_WHEEL = [1, 2, 2, 3, 3, 5, 8];
export const wheelSlot = (roll: number, n = PRIZE_WHEEL.length) => Math.min(n - 1, Math.floor(roll * n));
export const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
/** Calm mode pays this instead of spinning. */
export const wheelEV = (segments = PRIZE_WHEEL) => Math.round(mean(segments));
/** Odds line printed next to the wheel and on the shop card. */
export function wheelOdds(segments = PRIZE_WHEEL) {
  const counts = new Map<number, number>();
  for (const s of segments) counts.set(s, (counts.get(s) ?? 0) + 1);
  const parts = [...counts].sort((a, b) => a[0] - b[0]).map(([v, n]) => `+${v} (${n} in ${segments.length})`);
  return `${parts.join(", ")}. Average +${mean(segments).toFixed(2)}`;
}

/** 21 Quiz: each question is worth 2 to 10 by difficulty, shown before you answer. */
export const Q21_TARGET = 21;
export const q21Worth = (difficulty: 1 | 2 | 3, roll: number) => 2 + (difficulty - 1) * 3 + Math.min(2, Math.floor(roll * 3));
/** Hand bonus in chips. Over 21 or a wrong answer busts it to 0; exactly 21 doubles it. */
export function q21Bonus(hand: number, bust: boolean) {
  if (bust || hand > Q21_TARGET) return 0;
  const b = Math.round(hand / 3);
  return hand === Q21_TARGET ? 2 * b : b;
}

/** Pop Quiz speed bonus for a right answer: x10 within 4s, sliding to x2 at 20s and after. Wrong keeps the ball at x1. */
export const QUIZ_FAST_MS = 4000;
export const QUIZ_SLOW_MS = 20000;
export function quizMultiplier(ms: number): number {
  const t = Math.min(1, Math.max(0, (ms - QUIZ_FAST_MS) / (QUIZ_SLOW_MS - QUIZ_FAST_MS)));
  return Math.round(10 - 8 * t);
}

/**
 * Celebration size for a payout. Never fires unless the outcome beats what the ball already had,
 * and grows with the ratio so a small bonus gets a small cheer.
 */
export function celebration(outcome: number, had: number): 0 | 1 | 2 | 3 {
  if (outcome <= had || outcome < 3) return 0;
  const r = outcome / Math.max(1, had);
  return r >= 8 ? 3 : r >= 4 ? 2 : r >= 2 ? 1 : 0;
}
