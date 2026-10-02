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

### 1.2 Proposed rules (starting values, tune in playtest)

Track lifetime chips earned from the board (`chipsEarnedTotal`, never reduced by spending or penalties).

```
price(item) = ceil( base(item) * 1.15 ^ bought(item) * tier(chipsEarnedTotal) )

tier(e) = 1 + 0.25 * floor(e / 50)     // +25% on every price for each 50 chips earned, all time
```

- `base(item)` is today's flat price (doc 09, section 4).
- `bought(item)` counts purchases of that item, the Cookie Clicker part (each building costs 15% more than the last).
- `tier()` is the "as you earn more, things cost more" part. It rises in visible steps so the player can see it coming.
- **Study tools are capped.** Second Chance and Defuser use the same formula but never go above 3x their base price, because they are learning tools. Every other item has no cap.
- Permanent pegs can only be bought once each today. To give the curve somewhere to go, allow a second and third copy of each peg (each placed on the next free neutral peg) and add peg upgrade levels (a Roulette Peg level 2 with a better wheel, for example).

### 1.3 Income has to keep up

If prices grow and income does not, the shop turns into a wall. Income should rise through:

- Board quality: Solid pegs yield +2, so a better board pays more per ball.
- Streak multiplier: up to x3 on a run of correct answers.
- Owned pegs: specials raise the average ball value (the tuning sim already checks a fully loaded board pays more).
- New income upgrades that scale with learning, for example "+1 base value per ball for every 3 Solid pegs".

### 1.4 Acceptance criteria

- [ ] Shop cards show the current price, the next price and the reason it rose ("Price rises 15% each time you buy it, and 25% for every 50 chips you have earned").
- [ ] `chipsEarnedTotal` and per-item purchase counts persist, with a save migration (default to 0 for older saves).
- [ ] Extend `tests/tuning.test.ts` with a multi-Shift player sim (honest bettor at 70% accuracy) that checks the gap between purchases stays between about 1 and 3 Shifts for the first 10 Shifts.
- [ ] A player who bets honestly reaches the next purchase faster than one who always bets Certain at the same accuracy.
- [ ] Defuser and Second Chance never cost more than 3x base.
- [ ] Odds and prices stay visible before purchase. Nothing is bought with money (guardrails 1 and 2 still hold).

### 1.5 Further ideas from idle games (optional)

- **Prestige.** Passing Exam Day or starting a new unit converts lifetime chips into a small permanent perk (a free Second Chance per Shift, for example), the way Cookie Clicker's heavenly chips do.
- **Milestones.** Unlocks at lifetime chip thresholds (new skins, new peg types, new Collector lines).
- **Achievements** tied to learning, not grinding: "Defused 5 bombs", "Calibrated within 5 points over 20 answers".

## 2. Ideas from Peggle

Peggle is the closest relative of our board: aim, shoot, bounce, clear target pegs. Mechanics worth borrowing:

| Peggle mechanic | Sure Thing version | Guardrail fit |
|---|---|---|
| Orange pegs you must clear | Bomb and Shaky pegs light up when hit. Light all bombs in one Shift for a bonus. Mastery stays tied to answers, the board only pays chips | Good |
| Multiplier rises as targets clear | The bucket multiplier steps up as more of your concepts reach Solid | Good, rewards learning |
| Free Ball bucket that slides along the bottom | A moving bucket that returns the ball for another drop | Good |
| Purple peg that moves each shot | A "hot concept" peg that changes each drop and pays double, ideally on a due concept | Good |
| Green power pegs and Master powers (Super Guide, Spooky Ball, Multiball, Flippers) | Power pegs that grant one-drop powers. Super Guide (a trajectory preview) is a natural reward for mastery | Good |
| Style shots (Long Shot, Off the Wall, Bank Shot) | Small chip bonuses for skilful aiming with the chutes, or a free-angle launcher replacing the 7 chutes | Good |
| Extreme Fever (slow motion and zoom on the last orange peg, then bonus buckets) | A finale when the last bomb on the board is defused | Careful: slow motion as the ball nears a target is a near-miss effect (guardrail 5). Trigger it only after the hit lands, never before |
| Pegs vanish after a shot | Hit pegs flash and dim for the rest of that drop | Good |

## 3. Ideas from casino and gambling games

The build already has Roulette and Blackjack pegs. More options, sorted by how well they fit the "honest confidence wins" rule:

### 3.1 Good fits (they reward knowing things)

| Source | Idea |
|---|---|
| Keno | Before a Shift, pick which concepts you expect to get right. Pays for accurate predictions, which is a calibration bet |
| Bingo | A 3x3 card of concepts. Turning a full row Solid pays a bonus |
| Double or nothing | After a win, double the chips by answering one more question at Certain. A knowledge bet, never a coin flip |
| Progressive jackpot | A "ledger pot" that grows a little with every chip lost to a penalty, paid out when you defuse a bomb |
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
