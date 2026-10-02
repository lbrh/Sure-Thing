# Sure Thing: MVP Plan

## 1. MVP goal

One sentence: **a player can set up a unit, play three Shifts of confidence-betting questions on a plinko board that reflects their knowledge, and finish with a readiness report, all working end to end with no failures on stage.**

Success for the hackathon is a reliable 90 second demo and a clear answer to "why is this smarter, easier and more enjoyable?".

## 2. Scope (MoSCoW)

### Must have
- Setup screen: unit name plus exam date, then a concept list appears as pegs.
- Seeded demo unit (Databases 101, 12 concepts, 4 questions each, hand-verified).
- Multiple choice questions with a three-level confidence bet.
- Scoring rules and chip economy (section 4).
- Reveal screen with explanation and the "why this is tempting" misconception line.
- Plinko board built from concept states, ball drops, chip payouts, bomb pegs.
- Mastery tracking per concept (Leitner boxes) and bomb retests.
- Shop with 3 upgrades: Second Chance, Defuser, Magnet Peg.
- Readiness report: per-concept mastery, confidence gap, overconfident topics, tonight's plan.
- Safe play basics: no real money, chips floor at zero, daily Shift cap, Calm mode toggle.
- Offline fallback (everything works from the seeded bank with no network).

### Should have
- Live unit generation from a typed unit name (with fallback to seeded bank on failure).
- Exam Day mock round as the final boss.
- Sound effects (soft, no slot jingles).
- Mobile-friendly portrait layout.

### Could have (stretch)
- "Explain it to the Intern" teach round (AI student, you explain, it reacts).
- Short answer questions graded by the model.
- Paste a syllabus or past paper to sharpen concepts.
- Shareable result card ("I was certain about Joins. I was wrong.").
- Supabase sync so progress follows you across devices.

### Won't have (this version)
- Accounts and passwords, payments, leaderboards, multiplayer, native apps, teacher dashboards.

## 3. User stories

1. As a student with an exam in 9 days, I want to be told what to study tonight so I stop guessing.
2. As a student, I want to see which topics I am confidently wrong about so I fix those first.
3. As a student, I want revision sessions that are short and a bit fun so I actually start.
4. As a student, I want to understand why a wrong answer was tempting so I do not repeat it.
5. As a student, I want to trust the readiness report more than my gut feeling.

## 4. Core rules (starting values, tune in playtest)

### 4.1 Bet and payout

| Confidence | If correct | If wrong |
|---|---|---|
| Guess | 1 ball | lose 0 chips |
| Pretty sure | 2 balls | lose 1 chip |
| Certain | 3 balls | lose 4 chips and a Bomb peg is planted on that concept |

Chips never go below zero. A wrong answer never locks content, never costs lives and never starts a timer.

**Why these numbers.** Assume an average ball is worth about 1 chip (tuned in section 4.4). Expected value per question when your chance of being right is p:

- Guess: p
- Pretty sure: 2p - (1 - p) = 3p - 1
- Certain: 3p - 4(1 - p) = 7p - 4

So Guess is the best bet when you are under about 50% likely to be right, Pretty sure between about 50% and 75%, and Certain above about 75%. Honest confidence is the winning strategy, which is the whole point.

### 4.2 Peg states and yields

| State | Meaning | Looks like | Chip yield when a ball hits it |
|---|---|---|---|
| Cold | Never attempted | grey hollow circle | 0 |
| Shaky | Attempted, box 1 to 3 | amber ring | +1 |
| Solid | Box 4 to 5 | mint filled circle | +2 |
| Bomb | Confidently wrong, unresolved | coral diamond with an X | -2 (floored at 0) |

Each concept has 2 scoring pegs on the board. The rest are neutral bumpers.

### 4.3 Bucket multipliers (bottom of the board)

x0.5, x1, x2, x3, x2, x1, x0.5 (centre is highest). Upgrades can change these.

### 4.4 Tuning step (30 minutes)

Run a headless simulation of 1000 drops across a few board states. Adjust peg yields and multipliers until the average ball is worth between 1.0 and 1.5 chips on a mixed board, and a bomb-heavy board is clearly worse than a solid-heavy board. Do this once the board physics works, before polishing anything else.

### 4.5 Mastery (Leitner boxes)

- New concepts start in box 1 with 0 attempts.
- Correct with Pretty sure or Certain: move up one box (max 5).
- Correct with Guess: stay put (a lucky guess is not proof).
- Wrong with Guess or Pretty sure: drop one box (min 1).
- Wrong with Certain: drop to box 1 and plant a Bomb.
- A bomb is defused when a different question on that concept is answered correctly with Pretty sure or Certain. The concept lands in box 2.
- Retest timing: a bombed concept returns later in the same Shift (after about 3 questions) and again the next day.

Box intervals: box 1 same Shift, box 2 one day, box 3 three days, box 4 seven days, box 5 fourteen days. Cap each interval at half the days left until the exam so everything is seen before exam day.

### 4.6 What gets drawn next

Priority score per concept:

`urgency * (3 * bomb + 2 * dueNow + 1.5 * (1 - mastery) + 1 * hadConfidentWrong)`

where urgency is 1.25 when the exam is 3 days away or less. The Draw offers the top concepts with a little randomness so it does not repeat. The player picks 1 of 3. Randomness only affects which concept you see, never anything you can buy.

### 4.7 Shop (starting prices)

| Item | Effect | Chips |
|---|---|---|
| Second Chance | Your next wrong answer costs nothing and you may retry once | 8 |
| Defuser | Pick a Bomb and take a fresh retest on it now. Correct defuses it | 10 |
| Magnet Peg | Nudges balls toward Solid pegs for one Shift | 15 |
| Hint (stretch) | Remove one wrong option, but drops are halved | 5 |
| Wide Catcher (stretch) | Edge buckets pay x1 instead of x0.5 for one Shift | 20 |

Note the Defuser: spending chips to get quizzed again on your weakest topic rewards self-testing. The same retest is also available free through the normal Draw, so chips never gate learning.

### 4.8 Exam Day (final boss)

10 questions sampled across all concepts, weighted to weak and bombed ones, bets on. The result feeds the readiness report. The label is "readiness estimate", never "predicted grade".

## 5. Screens required

1. Setup (unit, exam date)
2. Hub (countdown, debt meter, start Shift, Shop, Report)
3. The Draw (pick 1 of 3)
4. Question and Bet
5. Reveal (right, wrong, bomb planted)
6. Board and Drop
7. Shop
8. Readiness Report
9. Settings (Calm mode, daily cap, sound)

Details and wireframes are in `06-design.md`.

## 6. Build plan (48 hours, 3 people)

Roles: **A** frontend and game, **B** backend, AI and data, **C** design, content and pitch. With 2 people, B also owns content and C's tasks split between both.

| Block | Hours | A (frontend and game) | B (backend, AI, data) | C (design, content, pitch) | Done when |
|---|---|---|---|---|---|
| 0. Align | 0 to 2 | Repo, Next.js, Tailwind | Pick model strings, API key, schemas | Lock name, palette, wireframes v1 | Everyone can run the app locally |
| 1. Foundations | 2 to 10 | Matter.js board with static pegs, ball drop, bucket events | Seed bank format, generate and verify 48 questions, state functions with unit tests | Hand-check every seeded question, draft The Collector lines | A ball drops and scores on a hard-coded board |
| 2. Core loop | 10 to 20 | Question and Bet UI, Reveal, wire state to pegs | Scoring, mastery, Draw priority, retest scheduling | Reveal copy, misconception lines, onboarding copy | One full Shift plays end to end |
| 3. Economy | 20 to 28 | Shop, upgrades, bomb visuals | Chip economy and tuning simulation | Shop copy, report layout | Chips earned and spent, bombs defusable |
| 4. Report and AI | 28 to 36 | Readiness Report, charts | `/api/unit` live generation with fallback | Calm mode skin, sound picks | Report matches the underlying data |
| 5. Polish and test | 36 to 42 | Motion, mobile layout, reduced motion | Error handling, rate limits, offline fallback | Playtest with 3 classmates, fix list | No crashes on 5 clean runs |
| 6. Video and submit | 42 to 48 | Freeze build, record screens | Backup run seeded, deploy | Record video, write submission text | Submitted with buffer |

If you have only 24 hours: skip block 4's live generation and the Exam Day boss, ship 2 upgrades, and merge blocks 5 and 6.

## 7. Cut list (in order)

1. Live unit generation (keep the seeded unit)
2. Short answer questions and the Intern teach round
3. Upgrades beyond Second Chance and Defuser
4. Multi-day retest scheduling (keep same-Shift retests)
5. Sound
6. Mobile polish

**Never cut:** the confidence bet, the board drop, bomb pegs, the retest, the readiness report. Those are the product.

## 8. Test plan

- Unit tests (vitest) for scoring, mastery updates, peg state, priority and calibration maths.
- Golden path: setup -> Shift 1 -> shop -> Shift 2 -> Exam Day -> report, run 5 times with no errors.
- Question audit: two people independently check all seeded questions. Any disagreement is rewritten or dropped.
- Playtest: 3 classmates, 5 minutes each, no coaching. Note where they hesitate. Ask: "What was the board telling you?" If they cannot answer, the design failed.
- Failure drills: kill the network mid-run, send malformed AI JSON, reload mid-Shift. The app must recover from local state.

## 9. Demo readiness checklist

- [ ] Seeded run that reliably produces one dramatic "Certain and wrong" moment
- [ ] Offline mode confirmed
- [ ] Deployed URL plus local fallback build
- [ ] Screen recording of a perfect run saved as a backup
- [ ] Calm mode and safe play settings visible and working
- [ ] The scoring table is shown in the app (transparent odds)

## 10. What to measure in a pilot (post-hackathon)

- Time from open to first bet (target under 60 seconds)
- Shifts per user in the week before an exam
- Confidence gap before versus after 3 Shifts
- Retest success rate on previously bombed concepts
- Self-reported "I know what to study tonight" (1 to 5)
