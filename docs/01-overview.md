# Sure Thing: Project Overview

Working title. Backup names: Exam Debt, Odds On.
Prepared 2 October 2026.

> Your exam is the mob boss. Bet on what you know, and the board shows you what you don't.

## 1. The pitch in one paragraph

Sure Thing is a revision game that shows you what you actually know. Before every answer you bet on how sure you are. Right and confident pays well, wrong and confident hurts, and every concept in your unit becomes a peg on a plinko board. Solid pegs pay out, shaky pegs wobble, and bomb pegs mark the things you were certain about and got wrong. Your exam date is the "debt" you have to pay off. The app decides what you should study next and ends with a readiness report you can trust more than your own gut.

## 2. The problem

**Students feel prepared when they are not, so revision time goes to whatever feels comfortable and they get blindsided in the exam.**

What the research says (links and caveats are in `05-market-research.md`):

- Rereading feels like learning, but practising retrieval (testing yourself) tends to give better long-term retention. In one set of experiments, repeated testing beat repeated rereading a week later, 61% to 40% (reported by a secondary source). Students often do not realise how much testing helps.
- Students often overpredict how well they will do. In one intro biology course the bottom quartile overestimated their first exam by about 32 points on average. This area is contested, so we describe it carefully and never claim more than the evidence says.
- Confident mistakes are special. When people get clear feedback, errors made with high confidence are often corrected more easily than low-confidence errors (the hypercorrection effect). The catch is that one study found these errors tend to return after a week if the right answer is forgotten, so retesting matters.

## 3. What the app does underneath the gambling

The plinko board is the interface. The engine is a calibration-based revision system:

1. **30 second setup.** Type your unit and exam date. The AI builds a concept list. You can optionally paste a syllabus or past paper to sharpen it.
2. **Varied questions per concept.** Multiple choice for the MVP, short answer and "explain it to the Intern" as stretch.
3. **Confidence before every result.** You commit to Guess, Pretty sure or Certain before you see if you were right.
4. **A calibration profile.** Per concept and overall: accuracy against stated confidence. You see where you are overconfident and where you underrate yourself.
5. **Smart targeting.** Confident-but-wrong concepts come back first, then due and weak concepts, scheduled with simple spaced repetition and squeezed to fit your exam date.
6. **A readiness report.** Per-topic mastery, a confidence gap score, and tonight's plan.

## 4. How it fits "smarter, easier, more enjoyable"

| Word | What delivers it |
|---|---|
| Smarter | Calibration (knowing what you don't know), retrieval practice, retests of confident errors, spaced repetition |
| Easier | Zero flashcard making, no decision about what to study next, 8 minute Shifts, works without uploading anything |
| More enjoyable | A plinko roguelike with a funny premise, real stakes on each bet, and a board that visibly improves as you learn |

## 5. The core loop

**Draw** a concept (pick 1 of 3 offered, weighted towards your weak spots)
-> **Bet** (answer, then choose Guess, Pretty sure or Certain)
-> **Reveal** (right or wrong, plus why the tempting wrong answer is tempting)
-> **Drop** (balls fall through your knowledge board and earn chips)
-> **Shop** (spend chips on board upgrades and study tools)
-> repeat for 3 Shifts, then **Exam Day** (a mock exam boss) and the **Readiness Report**.

## 6. What it is not

- Not a flashcard clone. Flashcard apps generate cards from your notes. Sure Thing measures your confidence against your accuracy.
- Not a casino. No real money, no purchasable currency, no cash-out. See `08-risks-and-guardrails.md`.
- Not an assignment writer. It helps you revise. It does not write or answer your assessments.
- Not a grade predictor. We call it a readiness estimate and say so.

## 7. Why this should score well

The seven hackathon winners your friend found share a pattern: one narrow problem, you do something instead of reading, a visible feedback loop, entertainment around the learning, AI as a character or quiet engine, and a demo that works in 30 seconds. Sure Thing maps to it:

| Winner pattern | Sure Thing |
|---|---|
| Narrow problem | Feeling prepared when you are not |
| You do something | Bet, answer, drop balls, shop |
| Visible feedback loop | The board: bombs appear and get defused (like Type Evolve's heat map) |
| Entertainment wrapper | Plinko roguelike with The Collector as the antagonist |
| AI as character or engine | Question writer, explainer, and The Collector's voice |
| 30 second demo | "95% sure and wrong" -> bomb planted -> board changes |

Rubric mapping is in `07-demo-script-and-rubric.md`.

## 8. Inspiration and originality

- **John Gleep** (unreleased, Steam lists Nov 11 2026) mixes two screens, pegs from a gacha machine and a debt to the mob. We borrow the structure: debt countdown, pegs as the board you customise, upgrades between rounds. We do not borrow its art, names, characters or audio.
- Plinko roguelikes are a proven genre (Nubby's Number Factory, Plinko Panic, and the Balatro wave). Our twist is that the board is a map of your knowledge.
- **Cookie Clicker** for progression: upgrades get more expensive as you earn more chips, so there is always a next thing to save for. This is a requirement for the next build (`10-progression-and-inspiration.md`, section 1).
- **Peggle** for board feel: target pegs to clear, a sliding free-ball bucket, power pegs and style-shot bonuses are all candidates (`10-progression-and-inspiration.md`, section 2).
- **Casino and gambling games** for minigames and bonuses. The build already has Roulette and Blackjack pegs. More ideas (Keno-style calibration bets, bingo cards of concepts, double or nothing on a knowledge question) are listed with a guardrail check, and the tactics we will not use are named (`10-progression-and-inspiration.md`, section 3).

## 9. Assumptions

- Hackathon length is about 48 hours. Scale the plan in `02-mvp-plan.md` if it is shorter.
- Team of 2 to 3 people (frontend and game, backend and AI, design and pitch).
- Web app, mobile-first layout, demoed on desktop.
- One seeded demo unit so the demo never depends on live AI.

## 10. Decisions

Still open:

1. Final name (Sure Thing is the working pick).
2. Is the "Explain it to the Intern" teach round in or out? (Not built.)
3. Hosting and submission format (check the hackathon rules).
4. **Casino imagery.** The build added Roulette, Blackjack and a MEGA HIT flash, against the original guardrails. Keep, reskin or cut (`08-risks-and-guardrails.md`, section 1).
5. **How far to take Peggle and casino mechanics** (`10-progression-and-inspiration.md`).

Settled by the build (see `09-build-status.md`):

- Demo unit: Databases 101, plus two more hand-checked offline units (Materials Chemistry and Soil Properties (Chemistry)).
- Calm mode shipped in the MVP.
- Look: Windows 95 / early-web "Retro 95" skin by default, with an optional MAXIMUM CHAOS skin and a seal mascot.
- Progression: shop prices will rise as you earn, Cookie Clicker style (requirement, not built yet).

## 11. Glossary

| Term | Meaning |
|---|---|
| Chip | Soft currency earned only from ball drops and spent only in the Shop. No cash value, cannot be bought |
| Peg | One concept on the board. Colour and shape show its state |
| Solid, Shaky, Cold, Bomb | Peg states: known, learning, not attempted yet, confidently wrong |
| Shift | One short play session, about 8 questions |
| The Draw | The pick-1-of-3 concept offer between questions |
| The Collector | The antagonist who "collects" your debt on exam day |
| Debt | Mastery you still owe before exam day |
| Exam Day | A final mock exam round that produces the readiness report |
| Streak | Correct answers in a row. Multiplies that answer's drop chips, up to x3 |
| Chute | One of 7 drop points above the board. The player aims each ball by picking one |
| Shop peg | A permanent special peg bought in the Shop (Roulette, Blackjack, Pop Quiz, Splitter, Black Hole, Bumper) |
| Shift mod | A one-Shift board modifier (Magnet, MEGA BUCKET, Earthquake) |
| Skin | The look of the app: Retro 95 or MAXIMUM CHAOS. Calm mode overrides both |
| MEGA HIT | The celebration for any payout of x5 or more |

## 12. Document index

1. `01-overview.md` (this file)
2. `02-mvp-plan.md`
3. `03-tech-spec.md`
4. `04-business-model-canvas.md`
5. `05-market-research.md`
6. `06-design.md`
7. `07-demo-script-and-rubric.md`
8. `08-risks-and-guardrails.md`
9. `09-build-status.md` (what the first build ships and how it differs from these plans)
10. `10-progression-and-inspiration.md` (Cookie Clicker progression requirement, Peggle and casino ideas)
