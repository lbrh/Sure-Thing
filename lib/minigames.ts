// Pure mini-game logic for the crazy shop pegs. The UI animates; outcomes come from here.
import { rng } from "./engine";

/** 12-slot wheel, interleaved so the big ones aren't bunched. Shown in the shop as the odds. */
export const ROULETTE = [0, 1, 2, 0, 1, 3, 0, 1, 5, 0, 2, 10];
export const rouletteSlot = (roll: number) => Math.min(ROULETTE.length - 1, Math.floor(roll * ROULETTE.length));

export interface Card {
  rank: number; // 1 = ace, 11-13 = J Q K
  suit: number; // 0-3: ♠ ♥ ♦ ♣
}
export const SUITS = ["♠", "♥", "♦", "♣"];
export const RANKS = ["", "A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

export type BJResult = "blackjack" | "win" | "push" | "lose" | "bust";
export const BJ_MULT: Record<BJResult, number> = { blackjack: 5, win: 3, push: 1, lose: 0, bust: 0 };

export interface BJ {
  deck: Card[];
  player: Card[];
  dealer: Card[];
  result: BJResult | null;
}

function shuffled(seed: number): Card[] {
  const rand = rng(seed);
  const d: Card[] = [];
  for (let s = 0; s < 4; s++) for (let r = 1; r <= 13; r++) d.push({ rank: r, suit: s });
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

/** Best total, counting aces as 11 when that doesn't bust. */
export function handValue(cards: Card[]): number {
  let total = cards.reduce((s, c) => s + Math.min(10, c.rank), 0);
  let aces = cards.filter((c) => c.rank === 1).length;
  while (aces-- > 0 && total + 10 <= 21) total += 10;
  return total;
}

export function deal(seed: number): BJ {
  const deck = shuffled(seed);
  const g: BJ = { deck: deck.slice(4), player: [deck[0], deck[2]], dealer: [deck[1], deck[3]], result: null };
  if (handValue(g.player) === 21) return { ...g, result: handValue(g.dealer) === 21 ? "push" : "blackjack" };
  return g;
}

export function hit(g: BJ): BJ {
  if (g.result) return g;
  const next = { ...g, player: [...g.player, g.deck[0]], deck: g.deck.slice(1) };
  return handValue(next.player) > 21 ? { ...next, result: "bust" } : next;
}

export function stand(g: BJ): BJ {
  if (g.result) return g;
  let { dealer, deck } = g;
  while (handValue(dealer) < 17) [dealer, deck] = [[...dealer, deck[0]], deck.slice(1)];
  const p = handValue(g.player);
  const d = handValue(dealer);
  return { ...g, dealer, deck, result: d > 21 || p > d ? "win" : p === d ? "push" : "lose" };
}

/** Headless play (Skip, Calm mode): hit below 17, then stand. */
export function autoplay(seed: number): BJResult {
  let g = deal(seed);
  while (!g.result && handValue(g.player) < 17) g = hit(g);
  return stand(g).result!;
}

/** Pop Quiz speed bonus for a right answer: x10 within 4s, sliding to x2 at 20s and after. Wrong is always x0. */
export const QUIZ_FAST_MS = 4000;
export const QUIZ_SLOW_MS = 20000;
export function quizMultiplier(ms: number): number {
  const t = Math.min(1, Math.max(0, (ms - QUIZ_FAST_MS) / (QUIZ_SLOW_MS - QUIZ_FAST_MS)));
  return Math.round(10 - 8 * t);
}
