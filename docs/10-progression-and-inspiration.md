# Sure Thing: Progression and Game Inspiration

Two directions for the next build: a Cookie Clicker style price curve (a requirement), and ideas borrowed from Peggle and from casino and gambling games (options to explore, each checked against the guardrails in doc 08).

## 1. Requirement: Cookie Clicker style progression

### 1.1 What we want

**As you earn more chips, upgrades get more expensive.** Today every shop item has one flat price (doc 09, section 4), so after a few Shifts a player can afford everything and the shop stops mattering. Cookie Clicker solves this with prices that grow every time you buy, while your income grows too, so there is always a next thing just out of reach.

Goals:

1. There is always something worth saving for.
2. Early purchases come fast (inside the first one or two Shifts). Later ones take longer but never feel impossible.
3. Income grows with real learning (more Solid pegs, longer streaks, fewer bombs), so the fastest way up the curve is to know more and bet honestly.
4. The price curve never gates learning. Every retest stays free through the Draw.

### 1.2 Rules as built (October 2026, replaces the first proposal)

The first proposal multiplied every price by `tier(lifetime chips earned)`. That makes prices rise faster than income, so faster learners pay more. It was dropped. Prices now come from what you bought, not how much you earned (doc 11 has the reasoning):

- **Study tools** (Second Chance, Defuser): `base * (1 + 0.1 * usesThisShift)`, back to base every Shift, never above 3x base. Retests stay free through the Draw.
- **Consumable boosts** (Magnet, MEGA BUCKET, Earthquake): `ceil(base * 1.12 ^ boughtThisRun)`.
- **Permanent pegs**: `ceil(baseTier * 1.15 ^ copies)`, up to 3 copies of each. Tiers 2, 3 and 4 unlock at 25%, 50% and 75% of concepts Solid. Tier t costs the tier 1 base times 1, 1.6, 2.4 or 3.5, and pays +(t - 1) chips every time it fires (+(t - 1) on every Prize Wheel segment).
- **Income index** (applied to boosts and pegs only): `min(2, sqrt(avgIncomeLast3Shifts / firstShiftIncome))`. It uses income, never lifetime totals, and it falls when income falls.
- **Interest**: at the end of a Shift, +1 chip per 10 held, capped at +3.
- **Reroll** the 3 crazy offers for 2 chips, +1 per reroll, reset each Shift.
- Shop cards show the current price, the next price and the reason in plain words.

Base prices were raised to match the new bet payouts (a Shift now pays about 50 chips): Second Chance 12, Defuser 15, Magnet 55, MEGA BUCKET 75, Earthquake 45, Prize Wheel 90, 21 Quiz 95, Pop Quiz 70, Splitter 75, Black Hole 80, Bumper 55. All in `lib/economy.ts`.

### 1.3 Income has to keep up

If prices grow and income does not, the shop turns into a wall. Income should rise through:

- Board quality: Solid pegs yield +2, so a better board pays more per ball.
- Streak multiplier: up to x3 on a run of correct answers.
- Owned pegs: specials raise the average ball value (the tuning sim already checks a fully loaded board pays more).
- New income upgrades that scale with learning, for example "+1 base value per ball for every 3 Solid pegs".

### 1.4 Acceptance criteria

- [x] Shop cards show the current price, the next price and the reason in plain words.
- [x] `boughtThisRun`, copies owned, `usesThisShift`, rerolls and recent Shift income persist, with a save migration.
- [x] `tests/tuning.test.ts` simulates 1,000 honest students at 70% accuracy over 14 days at 1 to 2 Shifts a day. At least 95% of the gaps between their first 10 purchases fall between 0.4 and 3 Shifts (the mean gap is about 1 Shift).
- [x] An overconfident policy never out-earns the honest one: lower expected Ledger net for every simulated student, and lower on average on the actual rolls. Measured in Ledger net, because debt never touches chips (see doc 11).
- [x] Defuser and Second Chance never cost more than 3x base.
- [x] Odds and prices stay visible before purchase. Nothing is bought with money.

### 1.5 Further ideas from idle games (optional)

- **Prestige.** Passing Exam Day or starting a new unit converts lifetime chips into a small permanent perk (a free Second Chance per Shift, for example), the way Cookie Clicker's heavenly chips do.
- **Milestones.** Unlocks at lifetime chip thresholds (new skins, new peg types, new Collector lines).
- **Achievements** tied to learning, not grinding: "Defused 5 bombs", "Calibrated within 5 points over 20 answers".

## 2. Ideas from Peggle

Peggle is the closest relative of our board: aim, shoot, bounce, clear target pegs. Mechanics worth borrowing:

| Peggle mechanic | Sure Thing version | Guardrail fit |
|---|---|---|
| Orange pegs you must clear | Built: a ball hitting a bomb peg arms its retest in the next Draw. Mastery stays tied to answers, the board only pays chips | Good |
| Multiplier rises as targets clear | Built: x2 at 5 or fewer bombs standing in a drop, x3 at 2 or fewer, only on boards with 6 or more bombs | Good, a comeback that does not lift luck on ordinary boards |
| Free Ball bucket that slides along the bottom | A moving bucket that returns the ball for another drop | Good |
| Purple peg that moves each shot | A "hot concept" peg that changes each drop and pays double, ideally on a due concept | Good |
| Green power pegs and Master powers (Super Guide, Spooky Ball, Multiball, Flippers) | Power pegs that grant one-drop powers. Super Guide (a trajectory preview) is a natural reward for mastery | Good |
| Style shots (Long Shot, Off the Wall, Bank Shot) | Small chip bonuses for skilful aiming with the chutes, or a free-angle launcher replacing the 7 chutes | Good |
| Extreme Fever (slow motion and zoom on the last orange peg, then bonus buckets) | Built: defusing the last bomb turns that drop into a Fever round with five Fever buckets. No slow motion or zoom at all. Calm mode and reduced motion get a plain summary | Good |
| Pegs vanish after a shot | Built: hit pegs flash and dim for the rest of that drop | Good |

## 3. Ideas from casino and gambling games

The build already has Roulette and Blackjack pegs. More options, sorted by how well they fit the "honest confidence wins" rule:

### 3.1 Good fits (they reward knowing things)

| Source | Idea |
|---|---|
| Keno | Before a Shift, pick which concepts you expect to get right. Pays for accurate predictions, which is a calibration bet |
| Bingo | A 3x3 card of concepts. Turning a full row Solid pays a bonus |
| Double or nothing | After a win, double the chips by answering one more question at Certain. A knowledge bet, never a coin flip |
| Progressive jackpot | Built as the Ledger Pot: +5 per bomb planted, half a bomb's share paid when it is defused a Shift or more later, the rest on Exam Day by readiness. It never costs chips |
| Poker hands (the Balatro approach) | One ball's peg hits form a "hand" (three Solid pegs in a row, all five states) with a named bonus |
| VIP or loyalty tiers | Tiers by lifetime chips earned, which pairs with the price tiers in section 1.2 |

### 3.2 Pure chance (fine as spice, keep them rare)

| Source | Idea |
|---|---|
| Scratch cards | A scratch card at the end of a Shift, with odds shown |
| Slot style bonus rounds and free spins | One ball hitting 3 Solid pegs triggers a short bonus drop |
| Wheel spins | Already built as the Roulette Peg |
| Craps, baccarat, other card games | More capture-peg popups like Blackjack |

These add variety but teach nothing, so they should never pay more on average than answering well does.

### 3.3 Do not use

These are well-documented ways gambling products keep people playing against their interest, and they would break guardrails in doc 08:

- **Near-miss effects** (reels or balls stopping just short of a jackpot, "so close!"). Breaks guardrail 5.
- **Losses disguised as wins** (celebrating a payout smaller than what was staked).
- **Chasing prompts** ("win it back!" after a loss).
- **Daily login rewards that you lose by missing a day.** Breaks guardrail 11.
- **Insurance or side bets that make Certain safe.** These break the honest-confidence maths in doc 02, section 4.1.
- **Anything bought with money**, including chip packs and paid spins. Breaks guardrails 1 and 2.

## 4. Before building any of this

1. Settle the open casino imagery decision in doc 08, section 1. Sections 2 and 3 move the game further towards a casino look.
2. Every new chance mechanic shows its odds before the player commits, and is skipped (same result, no animation) in Calm mode and with reduced motion, like the existing capture pegs.
3. Add each new payout to the tuning sim before it ships.
