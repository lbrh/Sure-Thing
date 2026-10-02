# Sure Thing: Build Status

What the first commit (`7da60fc`, "init: initialize project with basic configuration and structure") actually ships, and where it differs from the plans in docs 01 to 08. When a plan doc and this doc disagree, this doc describes the code as it is.

Status as of 2 October 2026. `npm test` passes: 4 files, 56 tests.

## 1. Summary

The full MVP loop works end to end, offline, from three hand-checked units: setup, Draw, question and bet, reveal, ball drop, Shift summary, Shop, Exam Day and the Readiness Report. On top of the plan, the build adds a "crazy shop" of casino-style board pegs and modifiers, a correct-answer streak multiplier, aim-it-yourself ball drops, two visual skins (Retro 95 and MAXIMUM CHAOS), and a seal mascot.

The biggest departures from the plan:

1. **The look.** The planned "study lamp meets pachinko parlour" dark theme was replaced by a Windows 95 / early-web look (see section 6).
2. **Casino imagery, since reskinned.** The first commit had Roulette, Blackjack (playing cards) and a "MEGA HIT" strobe. They are now the Prize Wheel Peg, the 21 Quiz Peg and a proportional cheer (doc 08, rules 5 and 6).
3. **Shop prices are flat.** Each item has one fixed price. The new requirement is that prices rise as you earn more chips (doc 10, section 1). Not built yet.

## 2. Feature checklist against the MVP plan

| MVP item (doc 02) | Status | Notes |
|---|---|---|
| Setup: unit name plus exam date | Done | Quick-pick buttons and a datalist for the seeded units |
| Seeded demo unit | Done, x3 | Databases 101, Materials Chemistry, Soil Properties (Chemistry). 12 concepts and 48 questions each |
| Multiple choice with a three-level bet | Done | Keyboard: A to D, 1 to 3, Enter |
| Scoring and chip economy | Done, extended | Table as planned, plus a streak multiplier and 5 starting chips |
| Reveal with "why this is tempting" | Done | Answer key table, misconception line, explanation, Collector line |
| Plinko board from concept states | Done | Matter.js, 2 scoring pegs per concept, 7 buckets |
| Leitner mastery and bomb retests | Done | As specced in doc 03 section 5 |
| Shop | Done, extended | Second Chance and Defuser always on sale, plus 3 rotating "crazy offers" from 9 items |
| Readiness report | Done | Mastery bars, confidence gap, sure-and-wrong list, tonight's plan, calibration chart, Brier score, share text |
| Safe play basics | Done | Chips never go negative (penalties are Ledger debt), daily Shift cap, Calm mode, odds tables |
| Offline fallback | Done | Seeded units never touch the network. Live generation falls back to Databases 101 |
| Live unit generation | Done | `/api/unit` and `/api/questions` with an independent solve check |
| Exam Day | Done | 10 questions, unlocks after 1 Shift, no chips at stake |
| Sound | Done | Synthesized with Web Audio, no audio files |
| Mobile layout | Partial | Responsive two-column layout, some panels hide on small screens. Not tested on real phones yet |
| Teach round, short answer, syllabus paste, Supabase sync | Not built | Stretch items. `/api/unit` accepts `topics` but the UI never sends it |
| Shareable result card | Partial | Copies a one-line text to the clipboard, no image card |

## 3. Core loop as built

1. **Setup.** Type a unit (or tap a seeded one) and an exam date (defaults to 9 days out). A name matching a seeded unit loads it instantly with no network call. Anything else goes to live generation.
2. **Intro.** The board pops in peg by peg, The Collector delivers the opening line, and a README window shows the one rule and the odds table.
3. **The Draw.** Pick 1 of 3 concepts (keys 1 to 3). Badges: Bomb, Due, New, Shaky, Solid. The first offer follows unit order. Later offers use priority plus a little seeded jitter, and skip the last 2 concepts you saw, so a bomb comes back about 3 questions later.
4. **Question and bet.** Pick an option and Guess, Pretty sure or Certain, then Lock it in. A "This looks wrong" button flags the question, swaps in another one on the same concept, and excludes it from then on.
5. **Reveal and drop on one screen.** The answer, misconception and explanation sit on the left. The board sits on the right. You drop each earned ball yourself by clicking one of 7 chutes (or pressing 1 to 7). Skip drops the rest down the middle instantly using the same simulation.
6. **Shift summary.** Right count, chips won and lost, readiness before and after, bombs planted and defused. Then Shop, Report or Hub.
7. **Exam Day and Report.** A 10 question mock weighted to weak and bombed concepts. Then the Readiness Report.

You can leave a Shift mid-way (to the Shop, Report or Hub) and resume exactly where you were, including an answer whose balls have not dropped yet.

## 4. Economy as built

| Rule | Value |
|---|---|
| Starting chips | 5 |
| Shift length | 8 questions |
| Exam Day length | 10 questions |
| Bet table | Right: Guess +2, Pretty sure +4, Certain +6 chips, plus 1 bonus ball whatever the bet. Wrong: Guess nothing, Pretty sure +2 Ledger debt, Certain +12 Ledger debt and a bomb |
| Ledger debt | Separate account, no floor, never taken from chips. Shown as the DEBT hit counter. Only affects the Ledger Pot and the Exam Day summary. Defusing never refunds it |
| Peg yields | Solid +2, Shaky +1, Cold 0, Bomb -2, neutral 0 |
| Buckets | x0.5, x1, x2, x3, x2, x1, x0.5 (MEGA BUCKET makes the centre x10) |
| Ball value | `(1 + sum of peg yields) * bucket * 0.28`, rounded, floored at 0 |
| Streak multiplier | Counts correct answers only. The next answer plays at x1, x1.5, x2, x2.5, then capped at x3, applied to its gain and its debt alike, never to the bonus ball. A wrong answer resets it. Exam Day leaves it alone. Second Chance keeps it safe |
| Calibration | Guess 0.35, Pretty sure 0.67, Certain 0.92. Gap over the last 20 answers, grade 0 to 3. Each Shift ends with +3 chips per grade point. The Readiness Report shows the grade and the Brier score |
| Skill share | Shift summary meter: chips from correct answers, popup questions and calibration versus chips from buckets, the wheel and other specials. Target 80% or more |
| Daily Shift cap | Default 6, adjustable 1 to 12 |

The ball scale was tuned with `tests/tuning.test.ts` so a mixed board pays 1.0 to 1.5 chips per ball, a bomb-heavy board pays less than half a solid-heavy one, and a cold board still pays something. Measured now: cold 0.52, mixed 1.13, bomb-heavy 0.40, solid-heavy 1.82 chips per ball.

**What changed in the October 2026 rework and why.**

- **Balls per bet: 1, 2, 3 became 1 bonus ball for every right answer.** Different ball counts per bet shift the break-even points by however much a ball is worth on your board. A bonus that is the same for every bet leaves them exactly at 50% and 83%. The bet payout itself is now fixed chips.
- **Scale 0.36 became 0.28, captured balls are scaled too, and Black Hole adds +1 peg value instead of +2.** At 0.36 the board paid 1.31 chips per ball on a mixed board and an honest player at 70% accuracy took only 75% of their income from knowing things. 0.28 keeps the mixed board at 1.13, inside the 1.0 to 1.5 band.
- **The streak multiplier no longer multiplies the board.** It scales the bet payout and the debt only, so luck on the board is never multiplied. With all six shop pegs installed the share still clears 80%.
- **A calibration bonus (3 chips per grade point) was added** so calibration pays directly, as the skill-share rule assumes.

### Shop items and prices (all flat today)

| Item | Kind | Price | Effect |
|---|---|---|---|
| Second Chance | Study tool, stackable | 8 | Next wrong answer costs nothing, removes that option, retry once |
| Defuser | Study tool | 10 | Pick a bomb and retest it now. Only between sessions |
| Magnet Peg | Next-Shift mod | 15 | Solid pegs pull in balls within 30 px and count the hit |
| MEGA BUCKET | Next-Shift mod | 22 | Centre bucket x10 instead of x3 |
| Earthquake | Next-Shift mod | 6 | Gravity sways side to side |
| Prize Wheel Peg | Permanent peg | 18 | Captures the ball and spins a 7-segment wheel: +1, +2, +2, +3, +3, +5, +8 chips (average 24/7). No zero, no stake: the ball keeps its value and drops back in. Calm mode pays +3 instantly |
| 21 Quiz Peg | Permanent peg | 20 | Captures the ball for questions worth 2 to 10 by difficulty (value shown first). Hit or stand after each right answer. Each right answer pays 1. Hand bonus = hand / 3 rounded, doubled at exactly 21, lost on a wrong answer or over 21. The ball drops back in |
| Pop Quiz Peg | Permanent peg | 12 | Captures the ball and asks a question from a concept you have seen. Right within 4 s pays x10, sliding to x2 at 20 s. Wrong keeps the ball at x1. No mastery change |
| Splitter Peg | Permanent peg | 14 | Splits a ball into three. Copies keep what the original had earned. Cap 40 balls |
| Black Hole | Permanent peg | 16 | Pulls balls within 80 px, warps them back to the top once, +2 for the trip |
| Bumper | Permanent peg | 8 | Bigger peg that fires the ball away at speed |

Shop layout: Skins (free), Study tools (always), and "Today's crazy offers": 3 items drawn by seeded shuffle from the Shift mods plus any permanent pegs you do not own yet. Offers rotate as you answer more questions. Permanent pegs take over neutral pegs, most central first, in purchase order. Next-Shift mods clear at the end of a Shift.

Pop Quiz pays the ball's full value with no 0.36 scale, minimum 1, so a big multiplier feels big. A payout that beats what the ball already had gets a cheer sized to the gain (ratio 2 or more NICE!, 4 or more SUPER DROP!, 8 or more MEGA HIT!). Only MEGA HIT! shakes the screen. Nothing strobes. Off in Calm mode.

## 5. Board physics details

- Board is 360 x 550 logical px, 7 rows of pegs (6 and 5 alternating), 7 chutes and 7 buckets.
- Half-pegs on the side walls close the open lane that used to send balls straight to the x0.5 edge buckets.
- A peg only scores on a real hit. Grazes under 0.8 px per step into the peg do not count (about 1 in 6 contacts).
- Each chute adds 20 px of seeded jitter so spamming one chute does not stack identical balls.
- Max 12 active balls. A stuck-ball guard banks a ball by x position after about 15 s of sim time.
- Fixed 60 Hz timestep. The sim pauses while a capture popup is open.
- Tests check that aim matters (off-centre chutes mostly land below themselves) and that no chute sends more than a third of its balls to the edge buckets.

## 6. Look and feel as built

**Retro 95 skin (default).** Grey bevelled windows with navy title bars and fake file names (`THE_DRAW.EXE`, `READINESS_REPORT.DOC`), a scrolling marquee, digital hit counters for days, chips, streak and debt, "UNDER CONSTRUCTION" labels, HOT! and NEW! badges, rainbow headings. Fonts are system fonts: Arial Black, MS Sans Serif, Courier New and Comic Sans. No web fonts are loaded.

**MAXIMUM CHAOS skin (free, picked in the Shop).** Fake pop-ups every 7 to 14 s (at most 6 on screen, some show a real explanation from your unit as "DID YOU KNOW?"), neon confetti, floating 3D words, decorative fake RealPlayer and WinAmp windows, banner "GIFs", and a swarm of pixelated emoji buttons that flip the page, rotate hues, switch to Comic Sans, shake the screen or burst confetti. Nothing flashes faster than twice a second.

**Calm mode** always wins over the skin: no pop-ups, strobes, shakes or sound, capture popups auto-play with the same outcome as Skip, and chips are called points.

**Reduced motion** (setting or OS preference): drops resolve instantly, no shake, no floating words or confetti.

**Seal mascot.** A low-poly SVG seal in the corner rocks side to side, claps or slaps its belly every 5 to 10 s, claps on correct answers, slaps on a bomb, squeaks "GYUU!" on a MEGA HIT and when clicked. Other code cues it with `sealDo("clap" | "slap" | "gyuu")`.

**Sound.** All synthesized: peg ticks per state, bucket, correct, wrong, a tick-tick-thud bomb, a snip for defuse, wheel ticks, a boing, and a five-note arpeggio for SUPER DROP! and MEGA HIT!. Off in Calm mode.

## 7. Tech as built

| Area | Planned (doc 03) | Built |
|---|---|---|
| Framework | Next.js App Router, Tailwind | Next.js 16 App Router, plain CSS in `app/globals.css` (no Tailwind) |
| State | Zustand plus localStorage | Same. Key `sure-thing-v1`, with a merge step so older saves pick up new inventory and settings |
| Rendering | Custom canvas loop | Same. Client-only page (`ssr: false`) |
| Models | `claude-sonnet-5-5` writer, `claude-haiku-4-5-20251001` checker | `claude-sonnet-5-5` writer, `claude-haiku-4-5` checker, structured outputs via the SDK's zod helper |
| Routes | `/api/unit`, `/api/questions`, `/api/grade` | `/api/unit`, `/api/questions`. No `/api/grade` |
| `/api/questions` input | `{ unitId, conceptIds[], perConcept }` | `{ unitName, concepts: [{ id, name, summary }] (1 to 4), perConcept (1 to 4) }` |
| Cache | Unit plus concept plus prompt version | Same key, in memory per server instance |
| Rate limit | Per IP | 30 requests per minute per IP, in memory |
| Repo layout | `lib/scoring.ts`, `mastery.ts`, ... | One pure `lib/engine.ts`, see the README map |

Live generation flow: the concept list comes first, then questions in parallel batches of 3 concepts, 4 questions per concept. A concept is kept only with at least 2 verified questions, and the unit is used only with at least 6 kept concepts. Otherwise the player gets Databases 101 and a Collector line explaining why. Client timeout is 120 s per request.

Data model additions: `Attempt.exam` marks Exam Day answers. The store adds `Session` (kind, offer, plan, pending balls, drop seed, streak multiplier, resume point), `inventory` (Second Chance count, Shift mods, owned pegs), `settings.skin`, and `streak`.

## 8. Tests

| File | Covers |
|---|---|
| `tests/engine.test.ts` | Bet table, break-evens at 50% and 83%, bonus ball and multiplier never move them, overclaiming earns less, calibration grade, honest confidence is optimal, Leitner moves, interval cap, targeting, retest picks a new question, calibration, readiness, seeded bank shape, unit name routing |
| `tests/golden.test.ts` | Setup to Shift to Shop to Exam Day to Report, debt never touching chips, defusing never refunding debt, daily cap, flagging, streak multiplier, resuming mid-Shift and mid-question |
| `tests/minigames.test.ts` | Prize Wheel segments, expected value and Calm mode payout, 21 Quiz values and bonus, Pop Quiz speed curve, proportional cheers |
| `tests/tuning.test.ts` | Economy tuning, skill share of an honest player on plain and fully loaded boards, special pegs, MEGA BUCKET, click-to-drop, wall fairness, grazes |

`npm run tune` runs only the tuning sim.

## 9. Known gaps and follow-ups

1. Shop prices do not scale. See doc 10 section 1.
2. Casino imagery: decided, reskinned as game show props. See doc 08 section 1.
3. Hint and Wide Catcher (doc 02 section 4.7 stretch items) were not built. Magnet moved from "always on sale" to the rotating offers.
4. The daily cap counts Shifts started, not finished.
5. Flags are stored on the device only, so they do not improve a shared bank.
6. The in-memory cache and rate limit reset on each server instance. Fine for a demo, not for a public deploy.
7. No accessibility audit yet against the doc 06 checklist, especially the chaos skin's emoji buttons (labelled only "Mystery button").
