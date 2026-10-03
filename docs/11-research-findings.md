# Sure Thing: Research Findings Behind the October 2026 Upgrade

Why the progression, economy and mechanics changed (doc 09 has what was built). Each claim is marked **well supported**, **reasonably supported** or **contested**. I am not a neuroscientist or a lawyer. Treat the legal section as questions to take to proper advice, as doc 08 already says.

## 1. Dopamine, not serotonin, drives anticipation

**Claim.** The pull of an uncertain reward (the moment before a ball lands, the wheel slowing down) is mainly a dopamine story, not a serotonin one.

- **Well supported.** Midbrain dopamine neurons fire to unexpected rewards and to cues that predict them, and dip when an expected reward does not arrive. This "reward prediction error" signal is one of the most replicated findings in neuroscience (Schultz, Dayan and Montague, *Science*, 1997).
- **Well supported.** Dopamine neurons also show a sustained ramp of activity during uncertainty, highest when a reward is equally likely to come or not (Fiorillo, Tobler and Schultz, *Science*, 2003). This is the neural face of "will it, won't it" and the reason variable rewards are so gripping.
- **Reasonably supported.** Dopamine tracks *wanting* (motivation, anticipation) more than *liking* (pleasure itself), which other systems carry (Berridge and Robinson, 1998). So "dopamine is the pleasure chemical" is an oversimplification we should not repeat in the pitch.
- **Contested.** Serotonin's role is far less settled. It is linked to patience, waiting for delayed rewards and some aspects of punishment, but popular claims that serotonin drives gambling or "happiness hits" do not hold up. We make no serotonin claims.

**What it changed.** The anticipation moments in the game are the dangerous ones, so every chance device now has its odds printed beside it, never takes a stake, and is skipped (paying its expected value) in Calm mode. There is no slow motion or zoom before a hit lands (guardrail 5).

## 2. Near misses and losses disguised as wins

- **Well supported.** Near misses recruit reward circuitry and increase the urge to keep playing, even though they are losses (Clark and colleagues, *Neuron*, 2009).
- **Well supported.** On multi-line slots, players often experience "losses disguised as wins" (a payout smaller than the stake, celebrated with lights and sounds) as wins (Dixon and colleagues, *Addiction*, 2010).

**What it changed.** Celebrations fire only when the outcome beats what the ball already had and scale with the gain. No strobing background. Chance devices add a bonus and never take one away, so there is nothing to disguise.

## 3. The Australian classification test for simulated gambling

- **Reasonably supported (as a working test, check the wording).** The classification changes that took effect on 22 September 2024 give games with simulated gambling a minimum R18+ and games with paid chance-based items a minimum M (doc 08, sources 1 and 2). For design we use the working test in the brief: **simulated gambling needs a stake, a randomised outcome, and a possible loss.** The exact legal wording and how a classifier would read a study game need checking with someone qualified.
- **Contested.** Whether a no-money study game with betting language and a plinko board would count at all. Reports at the time described chance mechanics with no real-world currency as outside the stricter rules, but that is a classification judgement, not ours to make.

**What it changed.** We design every chance device to fail at least one limb of that test, and usually two:

| Device | Stake? | Random? | Possible loss? |
|---|---|---|---|
| Prize Wheel | No: spins only after a catch, the ball keeps its value | Yes | No: no zero segment, bonus only |
| 21 Quiz | No chips staked; the unbanked hand bonus can bust | The question values, shown before you choose | Only the unbanked bonus, on a knowledge decision |
| Buckets and Fever | No | Yes | No: every bucket pays something, nothing is taken |
| Mystery Fact | No | Yes | No: a fact, no chips |
| Bets on your answer | Yes (confidence) | No: your knowledge decides it | Debt, never chips |

The one place a stake and a possible loss meet is the bet on your own answer, and that outcome is not randomised. The randomness that exists (bounces, the wheel) only ever adds.

## 4. The skill-share rule

**Rule (our design rule, not a law or a published standard).** At least 80% of an honest player's chip income in a Shift must come from correct answers and calibration, not chance. The Shift summary shows the share, and `tests/tuning.test.ts` fails if an honest player at 70% accuracy drops below 80%, on a plain board and with all six shop pegs installed.

- **Reasonably supported.** Games where skill dominates outcomes are treated differently from games of chance in most gambling law, and players learn more when feedback tracks what they did (the core of retrieval practice and calibration training).
- **Contested.** The 80% figure is a judgement call. There is no agreed threshold. We picked one high enough that luck is clearly the garnish.

**What it took to hit it.** Bets now pay fixed chips, the board pays a single bonus ball per right answer, the streak and Peg Hand multipliers scale only the answer payout (never the board's luck), the ball scale dropped from 0.36 to 0.28, and calibration pays its own bonus. Measured by the tuning sim: 87% on a mixed board, 83% on a solid-heavy board, 84% with all six shop pegs installed.

## 5. Honest confidence must be optimal

- **Well supported.** A proper scoring rule makes reporting your true belief the best strategy. Certainty-based marking in education uses the same idea.
- **Built.** Expected Ledger net at probability p: Guess 2p, Pretty sure 6p - 2, Certain 18p - 12. Break-evens at 50% and about 83%. Any bonus that is the same for every bet (the bonus ball, Keno, Bingo) and any multiplier applied equally to gains and debts (streak, Peg Hand, Audit double stakes) leaves those break-evens exactly where they are. Tests prove an overclaiming bettor earns less at the same accuracy, at every Stake.
- **The catch, stated honestly.** With chips floored at zero, the old table let a broke player claim Certain for free. Moving penalties to a separate Ledger debt fixes the incentive in Ledger net, but debt still never touches chips, so in raw chip terms claiming Certain is never worse. Honesty shows up in the Ledger net, the Ledger Pot payout (scaled by earned / (earned + debt)), the calibration bonus and Mastery Marks. Playtest whether students feel that.

## 6. Price formulas

**Why the first proposal was dropped.** `price = base * 1.15^bought * tier(lifetime chips earned)` rises with income itself, so the faster a student learns, the more they pay. That punishes exactly the behaviour we want.

| Item | Formula | Cap |
|---|---|---|
| Study tools (Second Chance, Defuser) | `base * (1 + 0.1 * usesThisShift)`, reset each Shift | 3x base. Retests stay free in the Draw |
| Boosts (Magnet, MEGA BUCKET, Earthquake) | `ceil(base * 1.12 ^ boughtThisRun)` | None |
| Permanent pegs | `ceil(baseTier * 1.15 ^ copies)`, up to 3 copies, tiers 2 to 4 unlocked at 25, 50, 75% mastered | 3 copies |
| Optional income index (boosts and pegs) | `min(2, sqrt(avgIncomeLast3Shifts / firstShiftIncome))` | x2, and it falls when income falls |
| Interest | +1 per 10 chips held at the end of a Shift | +3 |
| Reroll | 2 chips, +1 per reroll, reset each Shift | None |

- **Reasonably supported.** Exponential cost curves with a growth rate a little above income growth keep "the next thing" in reach (the Cookie Clicker pattern, 1.15 per building). The square root in the income index damps it.
- **Checked by simulation, not playtest.** 1,000 simulated honest students over 14 days: at least 95% of the gaps between their first 10 purchases fall between 0.4 and 3 Shifts (mean about 1.5), and an overconfident policy never out-earns an honest one in expectation.

## 7. Prestige formula

`M = 3 * conceptsMastered + 2 * bombsDefused + 10 * calibrationGrade + examPercent / 5`, `marks = floor(2 * sqrt(M))`.

- **Reasonably supported.** Idle games use square-root prestige so the first resets feel generous and later ones do not snowball (Cookie Clicker's heavenly chips use a cube root of lifetime cookies).
- **Our choice.** Only learning counts. Chips never convert to Marks and time played never counts, so grinding does not pay. Calibration carries the biggest single weight because it is the skill the game exists to teach.
- **Untested.** The weights are a first guess. A perfect unit (12 concepts mastered, 5 bombs defused, grade 3, 100% on Exam Day) earns 19 Marks, enough for about 5 relics.

## 8. Sources

1. Schultz, Dayan and Montague (1997). A neural substrate of prediction and reward. *Science* 275.
2. Fiorillo, Tobler and Schultz (2003). Discrete coding of reward probability and uncertainty by dopamine neurons. *Science* 299.
3. Berridge and Robinson (1998). What is the role of dopamine in reward: hedonic impact, reward learning, or incentive salience? *Brain Research Reviews* 28.
4. Clark, Lawrence, Astley-Jones and Gray (2009). Gambling near-misses enhance motivation to gamble and recruit win-related brain circuitry. *Neuron* 61.
5. Dixon, Harrigan, Sandhu, Collins and Fugelsang (2010). Losses disguised as wins in modern multi-line video slot machines. *Addiction* 105.
6. Australian classification changes, September 2024: doc 08, sources 1 and 2.

Check each citation against the paper before quoting it in the pitch.
