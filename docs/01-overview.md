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

## 9. Assumptions

- Hackathon length is about 48 hours. Scale the plan in `02-mvp-plan.md` if it is shorter.
- Team of 2 to 3 people (frontend and game, backend and AI, design and pitch).
- Web app, mobile-first layout, demoed on desktop.
- One seeded demo unit so the demo never depends on live AI.

## 10. Decisions still open

1. Final name (Sure Thing is the working pick).
2. Demo unit subject (suggest Databases 101, since your team can verify answers fast).
3. Is the "Explain it to the Intern" teach round in or out?
4. Hosting and submission format (check the hackathon rules).
5. Whether to ship a "Calm mode" skin in the MVP (recommended, small effort).

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

## 12. Document index

1. `01-overview.md` (this file)
2. `02-mvp-plan.md`
3. `03-tech-spec.md`
4. `04-business-model-canvas.md`
5. `05-market-research.md`
6. `06-design.md`
7. `07-demo-script-and-rubric.md`
8. `08-risks-and-guardrails.md`
