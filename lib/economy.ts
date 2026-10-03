// Pure economy maths: bets, Ledger debt, calibration, skill share. Tested by tests/engine.test.ts and tests/tuning.test.ts.
import { rng, type Attempt, type Confidence } from "./engine"; // rng is only called inside functions, so the import cycle with engine.ts is safe

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
export const BOOST_BASE: Record<Boost, number> = { magnet: 80, mega: 110, quake: 65 };
export const PEG_BASE: Record<PegKind, number> = { wheel: 140, quiz21: 150, quiz: 100, splitter: 120, blackhole: 130, bumper: 75 };
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

/* ---------- Peg Hands: chips x mult ---------- */

export type HandName = "Flush" | "Straight" | "Full House";
/**
 * Built only from correct answers in the current Shift. Checked with tests/tuning.test.ts: hands usually land late
 * in a Shift, so they add a few chips a Shift and an overclaimer still nets about half what an honest player does.
 */
export const HANDS: { name: HandName; mult: number; rule: string }[] = [
  { name: "Full House", mult: 5, rule: "3 right at Certain plus 2 right at Pretty sure" },
  { name: "Straight", mult: 4, rule: "right answers on 5 concepts in a row in unit order" },
  { name: "Flush", mult: 3, rule: "5 right in one section of the unit" },
];
export const SECTIONS = 3; // a unit's concepts split into 3 sections, in unit order

export interface HandCard {
  index: number; // concept position in the unit
  confidence: Confidence;
}

/** Best Peg Hand completed by this Shift's correct answers so far, or null. */
export function pegHand(cards: HandCard[], conceptCount: number): (typeof HANDS)[number] | null {
  const n = (c: Confidence) => cards.filter((x) => x.confidence === c).length;
  const fullHouse = n("certain") >= 3 && n("pretty") >= 2;
  const idx = new Set(cards.map((c) => c.index));
  const straight = [...idx].some((i) => [1, 2, 3, 4].every((k) => idx.has(i + k)));
  const size = Math.ceil(conceptCount / SECTIONS);
  const perSection = new Map<number, number>();
  for (const c of cards) perSection.set(Math.floor(c.index / size), (perSection.get(Math.floor(c.index / size)) ?? 0) + 1);
  const flush = [...perSection.values()].some((v) => v >= 5);
  return HANDS.find((h) => (h.name === "Full House" ? fullHouse : h.name === "Straight" ? straight : flush)) ?? null;
}

/** The multiplier an answer plays at: streak times Peg Hand, capped at x10. Scales gains and debts alike. */
export const answerMult = (streakMult: number, hand: { mult: number } | null) => Math.min(MULT_CAP, streakMult * (hand?.mult ?? 1));

/* ---------- Knowledge mechanics ---------- */

/** Concept Bingo: 5x5, free centre. Concepts fill the 24 squares in a seeded order, repeating when a unit has fewer than 24. */
export const FREE = "FREE";
export function bingoCard(conceptIds: string[], seed: number): string[] {
  if (conceptIds.length === 0) return [];
  const rand = rng(seed);
  const cells = Array.from({ length: 24 }, (_, i) => conceptIds[i % conceptIds.length]).map((c) => ({ c, r: rand() }));
  const order = cells.sort((a, b) => a.r - b.r).map((x) => x.c);
  return [...order.slice(0, 12), FREE, ...order.slice(12)];
}
/** A square marks after 2 correct retrievals (Pretty sure or Certain) in different Shifts. */
export function bingoMarked(attempts: Pick<Attempt, "conceptId" | "correct" | "confidence" | "shift">[]): Set<string> {
  const shifts = new Map<string, Set<number>>();
  for (const a of attempts)
    if (a.correct && a.confidence !== "guess") shifts.set(a.conceptId, (shifts.get(a.conceptId) ?? new Set()).add(a.shift ?? 0));
  return new Set([...shifts].filter(([, s]) => s.size >= 2).map(([c]) => c));
}
const LINES5 = [
  ...[0, 1, 2, 3, 4].map((r) => [0, 1, 2, 3, 4].map((c) => r * 5 + c)),
  ...[0, 1, 2, 3, 4].map((c) => [0, 1, 2, 3, 4].map((r) => r * 5 + c)),
  [0, 6, 12, 18, 24],
  [4, 8, 12, 16, 20],
];
export const bingoLines = (card: string[], marked: Set<string>) => LINES5.filter((l) => l.every((i) => card[i] === FREE || marked.has(card[i]))).length;
export const BINGO_LINE = 5; // chips per completed line, paid at the end of the Shift it completes in

/** Calibration Keno: marked and right +2, marked and wrong +2 debt, unmarked and wrong +1, unmarked and right 0. */
export const KENO_RULE = "Marked and right +2. Marked and wrong +2 debt. Unmarked and wrong +1. Unmarked and right 0.";
export const kenoScore = (marked: boolean, correct: boolean) =>
  marked ? (correct ? { chips: 2, debt: 0 } : { chips: 0, debt: 2 }) : { chips: correct ? 0 : 1, debt: 0 };
/** Marking pays when you expect to be right more than 60% of the time: 4p - 2 beats 1 - p. */
export const kenoBreakEven = 0.6;

/** Mystery Fact: a right Certain answer unlocks a short fact 1 time in 2. Calm mode skips the roll and unlocks every second one. */
export const FACT_ODDS = 0.5;
export const factUnlocked = (roll: number, calm: boolean, certainRightCount: number) => (calm ? certainRightCount % 2 === 0 : roll < FACT_ODDS);

/** Go Deeper: one harder follow-up after a right answer only. Flat chips, no bet, no mastery change. */
export const DEEPER_CHIPS = 3;


/* ---------- Between runs: Mastery Marks, Legacy Draft, Stakes ---------- */

/** M = 3 * conceptsMastered + 2 * bombsDefused + 10 * calibrationGrade + examPercent / 5, marks = floor(2 * sqrt(M)). Chips and time played never count. */
export function masteryMarks(r: { conceptsMastered: number; bombsDefused: number; calibrationGrade: number; examPercent: number }) {
  const M = 3 * r.conceptsMastered + 2 * r.bombsDefused + 10 * r.calibrationGrade + r.examPercent / 5;
  return Math.floor(2 * Math.sqrt(Math.max(0, M)));
}

export type RelicId = "seal" | "oldLedger" | "spacedOut" | "cartographer";
export const RELICS: Record<RelicId, { name: string; effect: string }> = {
  seal: { name: "Seal of Approval", effect: "Your first right Certain answer each Shift adds a +5 segment to every Prize Wheel for the rest of that Shift." },
  oldLedger: { name: "Old Ledger", effect: "Start each unit with 10 chips already in the Ledger Pot." },
  spacedOut: { name: "Spaced Out", effect: "Bombs become defusable a Shift earlier: a right answer on a different question in the same Shift defuses them." },
  cartographer: { name: "Cartographer", effect: "The hub previews the concepts your next Shift's Draw will offer." },
};
export const RELIC_IDS = Object.keys(RELICS) as RelicId[];
export const RELIC_COST = 3; // Marks to take a relic
export const MAX_RELICS = 3;
export const SEAL_SEGMENT = 5;
/** Legacy Draft rerolls cost 2 Marks, rising by 1. */
export const draftRerollCost = (rerolls: number) => 2 + rerolls;
/** 3 relic offers you don't already carry (fewer if the pool runs out), seeded so a reroll is a fresh draw. */
export function draftOffers(carried: RelicId[], seed: number): RelicId[] {
  const rand = rng(seed);
  return RELIC_IDS.filter((r) => !carried.includes(r))
    .map((r) => ({ r, k: rand() }))
    .sort((a, b) => a.k - b.k)
    .slice(0, 3)
    .map((x) => x.r);
}

/** Stakes: opt-in, each unlocked by finishing the one before at calibration grade 2 or better. Off in Calm mode. */
export const MAX_STAKE = 8;
export const STAKES: Record<number, string> = {
  1: "Standard rules.",
  2: "Certain costs 14 debt when wrong, not 12.",
  3: "One fewer Second Chance: you can hold at most 2.",
  4: "Collector's Audits draw from bombs only.",
  5: "Exam Day mixes in concepts from your previous unit.",
  6: "Pretty sure costs 3 debt when wrong, not 2.",
  7: "No Earthquake in the shop.",
  8: "All of the above.",
};
/** Stakes 2 to 7 each add one rule; stake 8 has all of them. */
export const stakeHas = (stake: number, rule: number) => (stake >= MAX_STAKE ? rule > 1 : stake === rule);
export function stakeTable(stake: number): BetTable {
  return {
    gain: GAIN,
    debt: { guess: 0, pretty: stakeHas(stake, 6) ? 3 : DEBT.pretty, certain: stakeHas(stake, 2) ? 14 : DEBT.certain },
  };
}
export const SECOND_CHANCE_MAX = 3;
export const secondChanceMax = (stake: number) => (stakeHas(stake, 3) ? SECOND_CHANCE_MAX - 1 : SECOND_CHANCE_MAX);

/** Learning achievements only: never time played or streak length. */
export type AchievementId = "calibrated20" | "defused5" | "fullBingo" | "stake3Exam80";
export const ACHIEVEMENTS: Record<AchievementId, string> = {
  calibrated20: "Calibrated within 5 points over 20 answers",
  defused5: "Defused 5 bombs",
  fullBingo: "Completed a full Concept Bingo card",
  stake3Exam80: "Exam Day above 80% at Stake 3 or higher",
};

/** Collector's Audit: a boss round every 3 to 4 days of a run, with one visible modifier. */
export const AUDIT_LENGTH = 5;
export const AUDIT_CLEAR = 4; // right answers to clear it
export const AUDIT_POT_SHARE = 0.25; // clearing pays this share of the Ledger Pot
export type AuditMod = "hard" | "double" | "noSecondChance";
export const AUDIT_MODS: Record<AuditMod, string> = {
  hard: "Hardest questions only.",
  double: "Double stakes: every gain and every debt x2.",
  noSecondChance: "No Second Chance.",
};
export const auditEvery = (seed: number) => 3 + (seed % 2);
