# Sure Thing: Risks and Guardrails

This doc is deliberately blunt. The biggest risks are not technical.

I am not a lawyer or a gambling-harm specialist. Where this doc touches law or harm, treat it as a list of facts and questions to take to proper advice before any public launch.

## 1. The biggest risk: gambling-style mechanics

### What we know

- Australian classification guidelines updated on 22 September 2024 give video games with simulated gambling (such as social casino games) a minimum R18+ classification, and games with paid chance-based loot boxes a minimum M. Reports at the time described games with chance-based mechanics that involve no real-world currency or interactive gambling elements as exempt from the stricter rules, and non-interactive gambling imagery or themes as exempt. [1][2]
- The government cited research linking in-game purchases, loot boxes and simulated gambling to gambling harm, including an AIFS finding that young people who played simulated gambling games were 40% more likely to spend real money on gambling as young adults. [1]
- A gambling reform bill was introduced to Parliament on 2 July 2026. I have not reviewed its content. [3]

### What we do not know

- Whether a bet-and-plinko study game with no money involved would be treated as "simulated gambling" under the guidelines. That is a classification question, not something to assume either way.
- Whether a hackathon prototype would ever be classified. It probably is not distributed as a commercial game, but judges, lecturers and universities will notice the theme.

### Why our design is different from gambling (and where it is not)

Different:
- No money in, none out. Chips cannot be purchased, cashed out or transferred.
- The "bet" is on your own knowledge, and honest confidence is the best strategy by design. In a casino the odds are against you. Here the scoring rewards accuracy about yourself.
- Randomness only affects physics and which concept you see, never something you can buy.

Not so different:
- Variable rewards, plinko drops and betting language borrow the look and feel of gambling. That is exactly what makes it engaging and exactly what warrants care.

### Hard guardrails (non-negotiable)

1. **No real money, ever.** No purchasable chips, no cash-out, no transfer, no prizes with cash value.
2. **No loot boxes or paid randomness.** Nothing random is for sale.
3. **Learning is never locked behind losses.** Wrong answers do not cost lives, start timers or block content.
4. **Chips never go negative, and penalties never come out of chips.** A wrong bet adds Ledger debt, a separate account that only touches the Ledger Pot payout and the Exam Day summary. Defusing a bomb never refunds the debt. Wrong answers never reduce mastery beyond normal Leitner movement.
5. **No near-miss tricks, and celebrations only for real gains.** No "so close!" animations or audio, no slow motion or zoom before a hit lands, no strobing jackpot lights. A celebration fires only when a payout beats what the ball already had, and its size grows with the gain (NICE!, SUPER DROP!, MEGA HIT!). It never strobes the background, and only the biggest level shakes the screen. Off in Calm mode and with reduced motion.
6. **Game show, not casino.** No reels, playing cards or suits, felt, roulette wheels, dollar signs or lucky sevens. Chance devices are styled as TV game show props (a Prize Wheel with a bulb rim, a 21 Quiz buzzer) inside the Win95 look. A chance device never takes a stake: the Prize Wheel only spins after a ball is caught, has no zero segment and only adds chips, and its odds are printed beside it. In Calm mode every chance device pays its expected value instantly.
7. **Transparent odds.** The scoring table is on screen near every bet and in Settings.
8. **Daily Shift cap** (default 6) with a friendly learning-science message (sleep and spaced retests help).
9. **Calm mode.** Renames bets and chips, removes the parlour skin and sound, same mechanics.
10. **Age.** Any public release is 18+ until it has been reviewed by relevant experts. A school-age version would not use betting mechanics at all.
11. **No streak punishment.** Missing a day never takes anything away.
12. **A harm-reduction advisor reviews the mechanics and copy before any public launch.**

### Where the build stands (October 2026): decided, reskin

The team chose option 2 of the earlier open decision: keep the mechanics, drop the casino look.

- **Roulette Peg became the Prize Wheel Peg.** Seven segments worth 1, 2, 2, 3, 3, 5 and 8 chips (average 24/7, about 3.43), no zero. It spins only after a ball is caught, adds its prize on top, and the ball drops back in with its value intact. The odds are printed under the wheel and on the shop card.
- **Blackjack Peg became the 21 Quiz Peg.** No cards or suits. You answer questions from your unit worth 2 to 10 by difficulty, each value shown before you answer, and choose hit or stand after each right answer. A wrong answer or going over 21 busts only the hand bonus. Every right answer still pays 1 chip. Exactly 21 doubles the bonus.
- **MEGA HIT is now proportional.** See rule 5.
- **Pop Quiz** no longer zeroes the ball on a wrong answer. The ball keeps its value.

What holds: no money in or out, chips cannot be bought, odds are shown on every shop card and popup, randomness is never sold for money, retests stay free in the Draw, and chips never go negative. The "never use" list in doc 10, section 3.3 applies.

### Pre-launch actions

- Take the classification question to someone qualified.
- Ask a gambling-harm reduction advisor to review the language and mechanics.
- Run the pilot with adults only and ask participants explicitly how the betting framing felt.
- Be ready to ship the Calm skin as the default if feedback or advice says so.

## 2. Learning-evidence risk

| Risk | What we know | Mitigation |
|---|---|---|
| We have no proof yet that this raises exam results | A formative-assessment study of confidence-based marking found better course appreciation but no improvement in summative exam scores [4] | Pilot with before and after calibration and exam outcomes. Say "we will measure" in the pitch |
| Confident errors may return | One study found hypercorrected errors can come back after a week if the right answer is forgotten [5] | Retest bombed concepts in the same Shift and again the next day, and compress intervals before the exam |
| Calibration research is contested | Some studies find the classic Dunning-Kruger pattern partly statistical artefact [6] | Use careful language: "students are often poorly calibrated" |
| Lowest performers may not self-correct | Some students kept overestimating despite practice tests [7] | Pair the confidence gap with concrete next steps and plan |
| A readiness score could be taken as a grade prediction | Scores are based on a handful of questions | Label as estimate, show question count, never use the word "predict" |

## 3. Student wellbeing risks

| Risk | Mitigation |
|---|---|
| Stress from penalties. A physiology study of certainty-based marking suggests a majority agreed it added some unnecessary stress (check the paper, the excerpt's columns were not fully clear) [8] | Penalties go to Ledger debt, never chips and never marks. Soft copy. Calm mode |
| Over-studying or compulsive play | Daily Shift cap, break messages, no streak loss, no push notifications that guilt |
| Exam anxiety | Neutral tone, no ranking, readiness shown as estimate with next steps |
| Feeling judged by The Collector | Tone rules: dry, never insulting, never about effort or ability |
| Excluding students with accessibility needs | Shapes plus colours, keyboard play, reduced motion, screen reader labels, Calm mode |

## 4. AI accuracy and integrity risks

| Risk | Mitigation |
|---|---|
| Wrong questions teach wrong things | Independent solve verification, hand-verified demo unit, flag button, exclude flagged questions, show explanations |
| Prompt injection through pasted syllabus text | Treat pasted text as data, strip instructions, validate output with zod |
| Academic integrity concerns | The app does not write or answer assessments. Position it as retrieval practice. Do not market it for assignments |
| Model or API outage | Seeded bank and offline mode |
| Single-provider dependency | Keep prompts and schemas provider-agnostic, cache banks |

## 5. Privacy and data risks

- Attempts and confidence history are personal learning data. Keep them local by default.
- No names, emails or student IDs in the MVP.
- If accounts are added, collect the minimum and get proper advice on Australian privacy obligations before launch.
- Do not share individual calibration data with lecturers. Class dashboards must be aggregated and thresholded.

## 6. Competitive and business risks

| Risk | Mitigation |
|---|---|
| Quizlet, Knowt or Gizmo add a confidence feature | Our edge is the whole honest-confidence economy, per-unit verified banks and tone. Move fast on the pilot |
| Free alternatives (Knowt free tier, Anki) | Do not compete on price for card creation. Compete on calibration and the readiness plan |
| Seasonality | Exam Season Pass, weekly low-stakes retests during semester |
| Willingness to pay unknown | Survey price ladder and landing page before building billing |

## 7. Delivery risks (hackathon)

| Risk | Mitigation |
|---|---|
| Scope creep (roguelike plus AI plus physics plus economy) | Follow the cut list in `02-mvp-plan.md`. Never cut the bet, the board, bombs, retests or the report. The crazy shop, skins and mascot already went beyond the plan (doc 09), so new ideas from doc 10 wait until the core is demo-ready |
| Escalating prices (doc 10, section 1) outpace income and stall the shop | Multi-Shift player sim in the tuning tests, cap study tool prices at 3x |
| Board physics eat time | Start with a static board in the first 4 hours. Seed layouts. Add Skip |
| Economy feels bad | Reserve 30 minutes for the tuning simulation and a playtest |
| AI latency or failure on demo day | Seeded bank, pre-generation, offline mode |
| Team fatigue | Freeze features at hour 40, record video by hour 44 |

## 8. IP and originality

- John Gleep is inspiration for structure only (debt, pegs you customise, upgrades between rounds). Do not copy its art, names, characters, dialogue, audio or UI.
- Plinko roguelikes already exist (Nubby's Number Factory, Plinko Panic). Our originality is the knowledge-as-board mapping and confidence economy, so make sure the demo leads with that.
- Use only fonts, sounds and images you have rights to (Google Fonts and licensed or self-made audio).
- Do not use real brand or casino names.

## 9. Risk register

| # | Risk | Likelihood | Impact | Owner | Mitigation |
|---|---|---|---|---|---|
| 1 | Judges read the theme as predatory gambling | Medium | High | Whole team | Guardrails, Calm mode, say it out loud in the video |
| 2 | Demo breaks live | Medium | High | Backend | Offline seeded mode, backup recording |
| 3 | Questions contain errors | Medium | High | Content | Verification, hand check, flag button |
| 4 | Economy is unfun or exploitable | Medium | Medium | Game | Tuning sim, playtest |
| 5 | Board performance is poor on phones | Low | Medium | Frontend | Cap balls, Skip button |
| 6 | Learning claims are overstated | Medium | Medium | Pitch | Label estimates, cite evidence honestly |
| 7 | Scope creep | High | Medium | Lead | Cut list |
| 8 | Competitor copies the idea | Low (short term) | Medium | Lead | Pilot quickly, build bank and data |
| 9 | Privacy mistake | Low | High | Backend | Local-first, no PII |
| 10 | Student feels judged or stressed | Medium | Medium | Design | Tone rules, soft penalties, Calm mode |
| 11 | The game-show layer (Prize Wheel, 21 Quiz, cheers) still reads as a casino | Medium | High | Whole team | Reskinned in October 2026 (section 1). No stakes on chance, odds shown, expected value in Calm mode, no money |

## 10. Principles to repeat in every meeting

1. The bet is on your own knowledge, never on money.
2. Honest confidence must always be the best strategy.
3. Mistakes are material for learning, never for punishment.
4. If it would look at home in a casino, cut it.
5. Say what we know, what we do not, and what we will measure.

## 11. Sources

1. Government classification announcement: https://minister.infrastructure.gov.au/rowland/media-release/stronger-classifications-protect-children-gambling-content-video-games
2. Classification change details: https://agbrief.com/news/australia/20/09/2024/australia-tightens-regulations-on-loot-boxes-and-gambling-features-in-video-games/
3. Gambling reform bill 2026: https://ministers.dss.gov.au/media-releases/19071
4. CBM in a formative assessment: https://pmc.ncbi.nlm.nih.gov/articles/PMC6544949/
5. Hypercorrection over a week: https://scholars.duke.edu/publication/736161
6. Calibration findings that differ from Dunning-Kruger: https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2024.1252520/full
7. Persistent miscalibration despite practice tests: https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8442020/
8. CBM in physiology with an AI assistant: https://journals.physiology.org/doi/full/10.1152/advan.00087.2025
