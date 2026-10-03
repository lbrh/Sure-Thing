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

/* ---------- Shop pricing (replaces the old lifetime-chips tier, doc 10 section 1.2) ---------- */

export type StudyTool = "secondChance" | "defuser";
export type Boost = "magnet" | "mega" | "quake";
export type PegKind = "wheel" | "quiz21" | "quiz" | "splitter" | "blackhole" | "bumper";
export type Item = StudyTool | Boost | PegKind;

/** Base prices, tuned with the multi-Shift sim in tests/tuning.test.ts against the income a Shift now pays. */
export const STUDY_BASE: Record<StudyTool, number> = { secondChance: 12, defuser: 15 };
export const BOOST_BASE: Record<Boost, number> = { magnet: 55, mega: 75, quake: 45 };
export const PEG_BASE: Record<PegKind, number> = { wheel: 90, quiz21: 95, quiz: 70, splitter: 75, blackhole: 80, bumper: 55 };
/** Tier t's base price is the tier 1 base times this. Each tier is a stronger peg. */
export const TIER_MULT = [1, 1.6, 2.4, 3.5];
export const MAX_COPIES = 3;
export const STUDY_CAP = 3; // study tools never cost more than 3x base
export const isStudy = (i: Item): i is StudyTool => i in STUDY_BASE;
export const isBoost = (i: Item): i is Boost => i in BOOST_BASE;
export const isPeg = (i: Item): i is PegKind => i in PEG_BASE;

/** Study tools: base * (1 + 0.1 * usesThisShift), resets every Shift, never above 3x base. */
export const studyPrice = (base: number, usesThisShift: number) => Math.min(STUDY_CAP * base, Math.ceil((base * (10 + usesThisShift)) / 10));
/** Consumable boosts: ceil(base * 1.12 ^ boughtThisRun). */
export const boostPrice = (base: number, boughtThisRun: number, index = 1) => Math.ceil(base * 1.12 ** boughtThisRun * index);
/** Permanent pegs: ceil(baseTier * 1.15 ^ copies). */
export const pegBase = (kind: PegKind, tier: number) => Math.round(PEG_BASE[kind] * TIER_MULT[Math.max(1, Math.min(4, tier)) - 1]);
export const pegPrice = (kind: PegKind, tier: number, copies: number, index = 1) => Math.ceil(pegBase(kind, tier) * 1.15 ** copies * index);

/** Tiers 2, 3 and 4 unlock at 25%, 50% and 75% of concepts mastered. */
export const tierUnlocked = (masteredShare: number) => 1 + [0.25, 0.5, 0.75].filter((t) => masteredShare >= t).length;

/**
 * Optional income index: min(2, sqrt(avg income of the last 3 Shifts / first Shift income)).
 * Computed from income, never lifetime totals, and it can fall. Applies to boosts and pegs, never study tools.
 */
export function incomeIndex(shiftIncome: number[]) {
  if (shiftIncome.length < 2 || shiftIncome[0] <= 0) return 1;
  const last = shiftIncome.slice(-3);
  return Math.min(2, Math.sqrt(last.reduce((a, b) => a + b, 0) / last.length / shiftIncome[0]));
}

/** End of a Shift: +1 chip per 10 held, capped at +3. */
export const interest = (chips: number) => Math.min(3, Math.floor(Math.max(0, chips) / 10));
/** Rerolling the 3 crazy offers: 2 chips, +1 per reroll, resets each Shift. */
export const rerollCost = (rerollsThisShift: number) => 2 + rerollsThisShift;

export interface PriceCtx {
  boughtThisRun: Partial<Record<Item, number>>;
  usesThisShift: Partial<Record<Item, number>>;
  copies: Partial<Record<PegKind, number>>;
  tier: number; // highest peg tier unlocked
  index: number; // income index
}

/** Current price, the price after one more purchase, and why, in plain words. */
export function priceOf(item: Item, c: PriceCtx): { price: number; next: number; reason: string } {
  if (isStudy(item)) {
    const u = c.usesThisShift[item] ?? 0;
    return {
      price: studyPrice(STUDY_BASE[item], u),
      next: studyPrice(STUDY_BASE[item], u + 1),
      reason: `Study tool: +10% for each one bought this Shift (${u} so far), back to ${STUDY_BASE[item]} next Shift, never above ${STUDY_CAP * STUDY_BASE[item]}.`,
    };
  }
  const idx = c.index !== 1 ? ` Income index x${c.index.toFixed(2)} (your recent Shifts against your first; it falls if they do).` : "";
  if (isBoost(item)) {
    const n = c.boughtThisRun[item] ?? 0;
    return { price: boostPrice(BOOST_BASE[item], n, c.index), next: boostPrice(BOOST_BASE[item], n + 1, c.index), reason: `+12% each time you buy it this unit (${n} so far).${idx}` };
  }
  const n = c.copies[item] ?? 0;
  return {
    price: pegPrice(item, c.tier, n, c.index),
    next: pegPrice(item, c.tier, n + 1, c.index),
    reason: `Tier ${c.tier} peg. +15% for each copy you own (${n} of ${MAX_COPIES}).${c.tier < 4 ? " Master more concepts to unlock a stronger tier." : ""}${idx}`,
  };
}

/* ---------- Ledger Pot ---------- */

/** Every bomb planted adds 5 chips to the pot. The pot never costs the player chips and is separate from debt. */
export const POT_PER_BOMB = 5;
/** Defusing a bomb (right at Pretty sure or Certain, different question, at least one Shift later) pays 50% of its share. */
export const DEFUSE_SHARE = 0.5;
export const defusePayout = (share: number) => Math.round(share * DEFUSE_SHARE);
/**
 * Exam Day pays out the rest in proportion to readiness, settled against Ledger debt:
 * the payout is scaled by earned / (earned + debt), so debt shrinks it but can never make it cost anything.
 */
export function examPotPayout(pot: number, readiness: number, earned: number, debt: number) {
  const gross = pot * Math.max(0, Math.min(100, readiness)) / 100;
  const honesty = earned + debt > 0 ? earned / (earned + debt) : 1;
  return Math.max(0, Math.round(gross * honesty));
}
