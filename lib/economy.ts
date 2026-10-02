// Pure economy maths: bets, Ledger debt, calibration, skill share. Tested by tests/engine.test.ts and tests/tuning.test.ts.
import type { Attempt, Confidence } from "./engine";

export const CONFS: Confidence[] = ["guess", "pretty", "certain"];

/**
 * The bet table. Chips never go negative and penalties never come out of chips:
 * a wrong answer adds Ledger debt instead, which only touches the Ledger Pot and the Exam Day summary.
 */
export const GAIN: Record<Confidence, number> = { guess: 2, pretty: 4, certain: 6 };
export const DEBT: Record<Confidence, number> = { guess: 0, pretty: 2, certain: 12 };
/**
 * Every correct answer also drops one bonus ball, whatever the bet. A bonus that is the same for every bet
 * leaves the break-even points exactly where the table puts them (see tests/engine.test.ts).
 */
export const BONUS_BALLS = 1;
/** Cap on the answer multiplier (streak times Peg Hand). */
export const MULT_CAP = 10;

export interface BetTable {
  gain: Record<Confidence, number>;
  debt: Record<Confidence, number>;
}
export const BASE_TABLE: BetTable = { gain: GAIN, debt: DEBT };

/** Outcome of one answer. The multiplier scales gains and debts equally, so it never moves a break-even. */
export function betOutcome(confidence: Confidence, correct: boolean, mult = 1, table = BASE_TABLE) {
  return correct
    ? { chips: Math.round(table.gain[confidence] * mult), debt: 0, balls: BONUS_BALLS, plantBomb: false }
    : { chips: 0, debt: Math.round(table.debt[confidence] * mult), balls: 0, plantBomb: confidence === "certain" };
}

/** Expected Ledger net (chips minus debt) per answer at probability p of being right. Guess 2p, Pretty sure 6p - 2, Certain 18p - 12. */
export const evNet = (c: Confidence, p: number, table = BASE_TABLE) => table.gain[c] * p - table.debt[c] * (1 - p);

/** The bet an honest player makes when they think they are right with probability p. */
export const bestBet = (p: number, table = BASE_TABLE): Confidence =>
  CONFS.reduce((best, c) => (evNet(c, p, table) > evNet(best, p, table) ? c : best), "guess" as Confidence);

/** Where two adjacent bets break even. */
export function breakEven(a: Confidence, b: Confidence, table = BASE_TABLE) {
  // gA p - dA (1 - p) = gB p - dB (1 - p)  =>  p = (dB - dA) / ((gB - gA) + (dB - dA))
  const dd = table.debt[b] - table.debt[a];
  return dd / (table.gain[b] - table.gain[a] + dd);
}

/** Stated probability for each bet, for calibration and the Brier score. */
export const CAL_P: Record<Confidence, number> = { guess: 0.35, pretty: 0.67, certain: 0.92 };
export const CAL_WINDOW = 20;

/** abs(mean stated probability - accuracy) * 100 over the last 20 answers. */
export function calibrationGap(attempts: Attempt[], window = CAL_WINDOW): number | null {
  const last = attempts.slice(-window);
  if (last.length === 0) return null;
  const stated = last.reduce((s, a) => s + CAL_P[a.confidence], 0) / last.length;
  const acc = last.filter((a) => a.correct).length / last.length;
  return Math.abs(stated - acc) * 100;
}

/** 3 for a gap of 5 or less, 2 for 10 or less, 1 for 15 or less, otherwise 0. */
export function calibrationGrade(gap: number | null): 0 | 1 | 2 | 3 {
  if (gap === null) return 0;
  return gap <= 5 ? 3 : gap <= 10 ? 2 : gap <= 15 ? 1 : 0;
}

/** End-of-Shift calibration bonus: 3 chips per grade point. Skill income, so it counts toward the skill share. */
export const CAL_BONUS = 3;
export const calibrationBonus = (grade: number) => CAL_BONUS * grade;

export function brier(attempts: Attempt[]): number | null {
  if (attempts.length === 0) return null;
  return attempts.reduce((s, a) => s + (CAL_P[a.confidence] - (a.correct ? 1 : 0)) ** 2, 0) / attempts.length;
}

/** Share of a Shift's chip income that came from knowing things rather than chance. Target: 80% or more. */
export const SKILL_TARGET = 0.8;
export const skillShare = (skill: number, chance: number) => (skill + chance > 0 ? skill / (skill + chance) : 1);
