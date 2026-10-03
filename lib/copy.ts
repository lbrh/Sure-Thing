// The Collector's lines and Calm mode wording. Tone: dry, never insulting, never about effort.

export const LINES = {
  setup: (unit: string, days: number) => `${unit}. Exam in ${days} day${days === 1 ? "" : "s"}. You owe me a pass.`,
  certainRight: "Hm. Annoyingly correct.",
  prettyRight: "Fine. That one's yours.",
  guessRight: "A lucky guess. I'll allow it, but it doesn't count as knowing.",
  guessWrong: "Not this time. At least you were honest about it.",
  prettyWrong: "Close enough to hurt, not close enough to count.",
  certainWrong: "Interesting. You were sure. I'll make a note.",
  bombPlanted: (concept: string) => `I've put a little something on ${concept}. We'll revisit.`,
  bombDefused: (paid: number) => (paid > 0 ? `Defused. Half that bomb's share of the pot is yours: ${paid}. I'm taking it off the ledger.` : "Defused. I'm taking that off the ledger."),
  bombWaiting: "Right. But that bomb needs a night's sleep before it comes off the ledger. Get it again next Shift.",
  pot: (pot: number) => (pot > 0 ? `The pot's at ${pot}. Defuse your bombs and it's yours. Exam Day pays the rest.` : ""),
  examPot: (paid: number, debt: number) => `Exam Day settles the ledger: ${paid} from the pot${debt > 0 ? `, trimmed by your ${debt} debt` : ""}.`,
  secondChance: "Second Chance. That one's on the house. Try again.",
  endShift: (drop: number) => (drop > 0 ? `Readiness up ${drop} points. Don't get comfortable.` : "Readiness holding steady. The ledger is patient."),
  cap: "Enough for today. Your brain files things while you sleep. See you tomorrow.",
  exam: "Exam Day. No chips, no shop. Just you and the ledger.",
  hub: "Back again. The ledger's open.",
};

export function terms(calm: boolean) {
  return calm
    ? { chip: "point", chips: "points", Chips: "Points", bet: "confidence level", Bet: "Confidence level" }
    : { chip: "chip", chips: "chips", Chips: "Chips", bet: "bet", Bet: "Bet" };
}

export const CONF_LABEL = { guess: "Guess", pretty: "Pretty sure", certain: "Certain" } as const;
