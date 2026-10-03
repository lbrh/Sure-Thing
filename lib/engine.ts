// Pure game maths. Everything deterministic lives here; the model only writes content. Economy maths: lib/economy.ts.
import { CAL_P } from "./economy";

export type Confidence = "guess" | "pretty" | "certain";
export type PegState = "cold" | "shaky" | "solid" | "bomb";
export type Box = 1 | 2 | 3 | 4 | 5;
export type OptionId = "A" | "B" | "C" | "D";

export interface Concept {
  id: string;
  unitId: string;
  name: string;
  summary: string;
}

export interface Option {
  id: OptionId;
  text: string;
  misconception?: string | null;
}

export interface Question {
  id: string;
  conceptId: string;
  stem: string;
  options: Option[];
  correct: OptionId;
  explanation: string;
  difficulty: 1 | 2 | 3;
  verified: boolean;
}

export interface Attempt {
  id: string;
  questionId: string;
  conceptId: string;
  chosen: OptionId;
  confidence: Confidence;
  correct: boolean;
  ms: number;
  at: string;
  exam?: boolean;
  shift?: number; // shiftsDone when answered, for spacing (older saves: missing)
}

export interface ConceptState {
  conceptId: string;
  box: Box;
  attempts: number;
  correctCount: number;
  confidentWrong: number;
  bombActive: boolean;
  lastSeen: string | null;
  dueAt: string;
}

export const CONF_P = CAL_P;
const INTERVAL_DAYS: Record<Box, number> = { 1: 0, 2: 1, 3: 3, 4: 7, 5: 14 };
const DAY = 86_400_000;

export function newConceptState(conceptId: string, now = new Date()): ConceptState {
  return {
    conceptId,
    box: 1,
    attempts: 0,
    correctCount: 0,
    confidentWrong: 0,
    bombActive: false,
    lastSeen: null,
    dueAt: now.toISOString(),
  };
}

export function updateState(
  s: ConceptState,
  a: { confidence: Confidence; correct: boolean; defusable?: boolean }, // a bomb only defuses once it has waited a Shift
  daysToExam: number,
  now = new Date()
): ConceptState {
  let { box, bombActive, confidentWrong } = s;

  if (a.correct) {
    if (a.confidence !== "guess") {
      box = Math.min(5, box + 1) as Box;
      if (bombActive && a.defusable !== false) {
        bombActive = false;
        box = Math.max(box, 2) as Box;
      }
    }
  } else if (a.confidence === "certain") {
    box = 1;
    bombActive = true;
    confidentWrong += 1;
  } else {
    box = Math.max(1, box - 1) as Box;
  }

  const cap = Math.max(1, Math.floor(daysToExam / 2));
  const days = Math.min(INTERVAL_DAYS[box], cap);
  return {
    ...s,
    box,
    bombActive,
    confidentWrong,
    attempts: s.attempts + 1,
    correctCount: s.correctCount + (a.correct ? 1 : 0),
    lastSeen: now.toISOString(),
    dueAt: new Date(now.getTime() + days * DAY).toISOString(),
  };
}

export function pegState(s?: ConceptState): PegState {
  if (!s || s.attempts === 0) return "cold";
  if (s.bombActive) return "bomb";
  return s.box >= 4 ? "solid" : "shaky";
}

export function priority(s: ConceptState, daysToExam: number, now = new Date()): number {
  const mastery = (s.box - 1) / 4;
  const dueNow = new Date(s.dueAt) <= now ? 1 : 0;
  const urgency = daysToExam <= 3 ? 1.25 : 1;
  return urgency * (3 * (s.bombActive ? 1 : 0) + 2 * dueNow + 1.5 * (1 - mastery) + (s.confidentWrong > 0 ? 1 : 0));
}

export function calibration(attempts: Attempt[]) {
  if (attempts.length === 0) return null;
  const n = attempts.length;
  const accuracy = attempts.filter((a) => a.correct).length / n;
  const meanConf = attempts.reduce((sum, a) => sum + CONF_P[a.confidence], 0) / n;
  const brier = attempts.reduce((sum, a) => sum + (CONF_P[a.confidence] - (a.correct ? 1 : 0)) ** 2, 0) / n;
  return { n, accuracy, meanConfidence: meanConf, gapPoints: Math.round((meanConf - accuracy) * 100), brier };
}

/** Accuracy per confidence level, for the calibration chart. */
export function calibrationByLevel(attempts: Attempt[]) {
  return (Object.keys(CONF_P) as Confidence[]).map((c) => {
    const at = attempts.filter((a) => a.confidence === c);
    return { confidence: c, stated: CONF_P[c], n: at.length, accuracy: at.length ? at.filter((a) => a.correct).length / at.length : null };
  });
}

export function daysUntil(examDate: string, now = new Date()): number {
  const exam = new Date(examDate + "T00:00:00");
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.max(0, Math.round((exam.getTime() - today.getTime()) / DAY));
}

/** Small seeded PRNG so draws and drops repeat exactly for the demo. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

export type Badge = "Bomb" | "Due" | "New" | "Shaky" | "Solid";

export function badge(s: ConceptState, now = new Date()): Badge {
  if (s.bombActive) return "Bomb";
  if (s.attempts === 0) return "New";
  if (new Date(s.dueAt) <= now) return "Due";
  return s.box >= 4 ? "Solid" : "Shaky";
}

/**
 * The Draw: top concepts by priority with a little seeded jitter, skipping concepts
 * seen in the last 2 questions of this Shift (so a bomb comes back ~3 questions later).
 * With no attempts yet the jitter is off, so the first offer follows unit order.
 */
export function drawOffer(
  states: ConceptState[],
  recent: string[],
  daysToExam: number,
  seed: number,
  count = 3,
  now = new Date()
): string[] {
  const rand = rng(seed);
  const fresh = seed === 0;
  const blocked = new Set(recent.slice(-2));
  const scored = states.map((s, i) => ({
    id: s.conceptId,
    score: priority(s, daysToExam, now) + (fresh ? -i * 1e-6 : rand() * 0.6),
  }));
  let pool = scored.filter((s) => !blocked.has(s.id));
  if (pool.length < count) pool = scored;
  return pool.sort((a, b) => b.score - a.score).slice(0, count).map((s) => s.id);
}

/** Least-asked unflagged question on the concept (bank order on ties), never the one just asked on it. */
export function pickQuestion(questions: Question[], conceptId: string, attempts: Attempt[], flagged: string[]): Question | undefined {
  const pool = questions.filter((q) => q.conceptId === conceptId && !flagged.includes(q.id));
  if (pool.length === 0) return undefined;
  const mine = attempts.filter((a) => a.conceptId === conceptId);
  const last = mine[mine.length - 1]?.questionId;
  const asked = (id: string) => mine.filter((a) => a.questionId === id).length;
  const candidates = pool.length > 1 ? pool.filter((q) => q.id !== last) : pool;
  return candidates.reduce((best, q) => (asked(q.id) < asked(best.id) ? q : best));
}

/** 0..1 mastery used by the report and readiness. Bombs and untried concepts count as 0. */
export function mastery(s?: ConceptState): number {
  if (!s || s.attempts === 0 || s.bombActive) return 0;
  return s.box / 5;
}

export interface ExamResult {
  correct: number;
  total: number;
  at: string;
  potPaid?: number; // Ledger Pot paid on Exam Day
  debt?: number; // Ledger debt at Exam Day
  earned?: number; // chips earned from Shifts this unit
}

/** Readiness estimate (0-100). Never a grade prediction. */
export function readiness(states: ConceptState[], exam?: ExamResult | null): number {
  if (states.length === 0) return 0;
  const m = states.reduce((sum, s) => sum + mastery(s), 0) / states.length;
  const r = exam && exam.total > 0 ? 0.5 * m + 0.5 * (exam.correct / exam.total) : m;
  return Math.round(r * 100);
}

export interface PlanItem {
  conceptId: string;
  action: string;
}

export function tonightsPlan(states: ConceptState[], daysToExam: number, now = new Date()): PlanItem[] {
  return [...states]
    .filter((s) => !(s.box === 5 && !s.bombActive))
    .sort((a, b) => priority(b, daysToExam, now) - priority(a, daysToExam, now))
    .slice(0, 3)
    .map((s) => ({
      conceptId: s.conceptId,
      action: s.bombActive ? "defuse the bomb" : s.attempts === 0 ? "first look" : s.box <= 2 ? "two retests" : "one retest",
    }));
}

/** Concept picks for Exam Day: weighted towards weak and bombed concepts. */
export function examConcepts(states: ConceptState[], n: number, seed: number): string[] {
  const rand = rng(seed);
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    const weights = states.map((s) => (s.bombActive ? 4 : 1) + 2 * (1 - mastery(s)) - (out.includes(s.conceptId) ? 1.5 : 0));
    const total = weights.reduce((a, b) => a + Math.max(0.1, b), 0);
    let r = rand() * total;
    let pick = states[0].conceptId;
    for (let j = 0; j < states.length; j++) {
      r -= Math.max(0.1, weights[j]);
      if (r <= 0) {
        pick = states[j].conceptId;
        break;
      }
    }
    out.push(pick);
  }
  return out;
}

/** Multiplier for a run of correct answers: x1, x1.5, x2, x2.5, then capped at x3. Scales gains and debts equally. */
export const STREAK_CAP = 3;
export function streakMultiplier(streak: number): number {
  return streak <= 1 ? 1 : Math.min(STREAK_CAP, 1 + 0.5 * (streak - 1));
}

/**
 * Readiness Odds: a live estimate of the Exam Day score from per-concept accuracy (Laplace smoothed: right + 1 over tries + 2).
 * Always shown as an estimate with the number of answers behind it. Never a prediction.
 */
export function examForecast(states: ConceptState[], examLength = 10) {
  if (states.length === 0) return { expected: 0, of: examLength, answers: 0 };
  const p = states.reduce((s, c) => s + (c.correctCount + 1) / (c.attempts + 2), 0) / states.length;
  return { expected: Math.round(p * examLength), of: examLength, answers: states.reduce((s, c) => s + c.attempts, 0) };
}
