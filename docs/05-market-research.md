# Sure Thing: Market Research

Research done 2 October 2026 from web sources. Many competitor figures come from review blogs and app listings that may be biased, out of date or disagree with each other. Where that is the case, it is flagged. Treat numbers as indicative and re-check before using them in anything official.

## 1. Summary

- **Problem is real and well studied.** Retrieval practice beats rereading, students are often poorly calibrated, and confident errors are both common and fixable with feedback. Evidence on specific effects is mixed in places and noted below.
- **The market is crowded but not on this angle.** Quizlet, Anki, Knowt and Gizmo dominate AI flashcards. In the sources I read, none describe confidence betting or calibration as a feature (I have not audited the apps themselves).
- **Gamified study apps have traction.** Gizmo reports over 13 million users and a US$22 million Series A in April 2026, and leans on game mechanics.
- **Plinko roguelikes are a hot genre.** Balatro passed 5 million sales and Nubby's Number Factory was widely compared to it.
- **Gambling-style mechanics carry real regulatory and ethical risk in Australia.** Classification rules treat simulated gambling in games as R18+, and Australian research links simulated gambling games to later real gambling. This is the biggest strategic risk and is covered in section 7.

## 2. The problem in the research

### 2.1 Rereading versus retrieval

- Retrieval practice tends to beat restudying for long-term retention, across many materials and age groups [11][12].
- In Roediger and Karpicke's 2006 experiments, repeated testing beat repeated rereading one week later, 61% to 40% (as reported by a secondary source) [13].
- Students often lack awareness of the benefits of testing, and rereading creates an "illusion of competence" because familiarity feels like knowing [11][14].
- Caveat: the evidence that retrieval practice transfers to a different knowledge domain is thinner, and part of the benefit may come from feedback exposure [12].

### 2.2 Calibration and overconfidence

- Students often overpredict exam performance, with the lowest performers typically overpredicting most, and this can persist across tests in a semester [15].
- In an intro biology course, bottom-quartile students overestimated exam 1 by about 32 points on average, falling to about 6 points by the final exam in a section with opportunities for self-evaluation [16].
- Another study found many of the lowest performers kept overestimating despite practice test feedback, suggesting extra intervention may be needed for them [17].
- **Contested:** other work argues the classic Dunning-Kruger pattern partly reflects statistical artefacts and found low performers were not more overconfident when measured a different way [18][19]. We should say "students are often poorly calibrated" and avoid grand claims.

### 2.3 Hypercorrection of confident errors

- Errors made with high confidence are often corrected more easily than low-confidence errors after clear feedback (Butterfield and Metcalfe, 2001) [20].
- This has been replicated in a real classroom context, not only in lab trivia questions [21].
- The effect is strongest with immediate corrective feedback [22].
- **Important caveat:** one study found the effect persists after a week but high-confidence errors were also more likely to be reproduced on the delayed test if the right answer was forgotten [23]. This is why Sure Thing retests bombed concepts later in the Shift and again the next day.

### 2.4 Confidence-based marking (CBM)

- CBM asks students how certain they are and rewards calibrated certainty. A classic scheme gives 3, 2 or 1 points for correct answers and 0, -2 or -6 for wrong ones depending on confidence [24].
- In a physiology implementation, 72.7% found the certainty-based negative marking fair, and most agreed it made them think more critically and be more aware of their learning [25].
- The same table suggests a majority also agreed it added unnecessary stress (the excerpt's columns were not fully clear, so check the paper). This is why our penalties only cost chips, floor at zero and never block learning.
- A formative-assessment study found CBM improved course appreciation but **not** summative exam scores [26]. We have no evidence yet that our version raises exam marks. The pilot must measure it.

## 3. Market context (Australia)

| Metric | Figure | Source |
|---|---|---|
| Total university enrolments, 2024 | about 1.68 million (1,676,077) | [1] |
| Domestic / onshore international, 2024 | 1,086,789 / 481,851 | [1] |
| Students at universities, as of 2023 | over 1.6 million, about 30% international | [2] |
| International university enrolments, 2025 | about 545,000, a record | [3] |
| RMIT international students | over 26,000, around 46% of RMIT | [4] |

Caveats: figures come from news and aggregator pages, enrolments and head counts differ between sources, and international caps (National Planning Level of 295,000 new commencements for 2026) are changing the mix. Use the "about 1.6 million students" headline and cite the source.

### AI use among students

- Turnitin reported that 53.6% of Australian tertiary submissions run through its system used some form of AI between October 2025 and April 2026 [5].
- An Australian student guide cites a 2025 survey saying 92% of students use AI in some form (up from 66%). I could not confirm the original survey, so treat it as indicative [6].
- A survey of 337 Australian university students found more than a third had used a chatbot for assistance with an assessment [7].
- Implication: students are already comfortable with AI tools, but there is anxiety about integrity. Position Sure Thing as a study tool that never writes assessments.

### Market size claims

Blogs quote the global AI in education market at about US$8.3 billion in 2025, growing over 30% a year [8]. These are low-quality sources, so use it only as a "the category is growing" signal.

## 4. Competitor landscape

| Product | What it is | Scale signals | Price signals | Game mechanics | Notes |
|---|---|---|---|---|---|
| Quizlet | Flashcards and study sets, AI features (Q-Chat, Magic Notes) | 300 million+ registered learners reported [9]. Acquired Coconote in Feb 2026 [10] | Plus about US$35.99 per year or US$7.99 per month, Plus Unlimited about US$44.99 per year [27] | Games and live play | Free tier increasingly capped |
| Knowt | Free-leaning Quizlet alternative with AI | 7 million+ students reported [9] | Free core. Paid tier prices disagree by source (about US$5 per month versus US$24.99 per month or US$149.99 per year) [28][29] | Kahoot-style play mode | Strong on price and AI card generation |
| Gizmo | Gamified AI flashcards and quizzes | 13 million+ users in 120+ countries, US$22 million Series A, April 2026 [30] | Plans vary by source, from about US$6.99 up to US$13.99 per week, with student discounts mentioned [31][32] | Streaks, XP, lives, leaderboards, friend challenges [30][31] | Free tier uses daily lives where wrong answers cost a life [31] |
| Anki | Open-source spaced repetition | Strong among medical students (about 70% of first-year medical students at one US school in one study, per a blog) [33] | Free on desktop | None | Power-user tool with a steep setup curve |
| General chatbots | Ask for questions or explanations | A 2025 survey cited by a blog says 80%+ of college students use AI tools for academic work [34] | Free or subscription | None | The real "why not just use ChatGPT?" alternative |

### What competitors do well
- Fast content creation from notes, PDFs, slides and videos.
- Big libraries and strong mobile apps.
- Spaced repetition (Anki and Gizmo).
- Habit design with streaks.

### Gaps and angles
- **Calibration is not the core mechanic.** In the sources I read, none feature confidence betting or a calibration report.
- **Streak and life pressure is a documented complaint.** One competitor's review (written by a rival app builder, so biased) says streaks can become a second source of stress on top of the exam [35]. Our design avoids punishing absence or wrong answers.
- **Upload dependency.** Most tools start from your notes. Sure Thing can start from a unit name, which is easier but needs good question verification.
- **Exam-date awareness.** Our "debt countdown" drives scheduling around the actual exam date.

## 5. Positioning

Two axes that explain the whitespace:

```
                 Learning-science depth (calibration, retrieval, spacing)
                                  ^
                                  |
                  Anki            |           (Sure Thing target)
                                  |
   Low  ----------------------------------------------------------> High
   game feel                      |                          game feel
                                  |
                  Quizlet / Knowt |        Gizmo
                                  |
```

Message: **"Flashcard apps help you remember. Sure Thing shows you what you only think you remember."**

## 6. Gamified learning and genre signals

- Gizmo's growth supports the idea that game mechanics help students keep studying [30].
- Balatro, a poker-themed roguelike deckbuilder, passed 5 million sales, and its early sales were fast (1 million within a month) [36][37].
- Nubby's Number Factory, a plinko-style roguelike, drew Balatro comparisons and strong early ratings [38].
- Plinko Panic is another plinko roguelike on Steam, showing the mechanic is established [39].
- John Gleep is an unreleased game that combines UFO piloting with a pachinko roguelike and lists a planned release of 11 November 2026 on Steam [40]. It is the inspiration for the debt and upgrade structure, not for any copied content.
- Hackathon precedent (from your friend's research, not re-verified by me): LeetCourt, Type Evolve, Chorus, OfficeMinutes, SATistics, Dialogues Through Time and Rizzing Up Invasive Species. Common thread: narrow problem, doing instead of reading, visible feedback loop, humour, AI as a character, and a 30 second demo.

## 7. Regulatory and ethical context (important)

I am not a lawyer. This section collects facts to take to proper advice before any public launch.

- **Classification rules.** From 22 September 2024, Australian guidelines give video games with simulated gambling (such as social casino games) a minimum R18+ classification, and games with paid chance-based loot boxes a minimum M [41][42]. Titles with chance-based mechanics that do not involve real-world currency or interactive gambling elements were described as exempt from the stricter rules, and non-interactive gambling imagery or themes also remain exempt [42]. Whether a betting-and-plinko study game counts as "simulated gambling" is a question for a classification expert, not something to assume either way.
- **Why it matters.** The government cited research linking in-game purchases, loot boxes and simulated gambling to gambling harm, including an AIFS finding that young people who played simulated gambling games were 40% more likely to spend real money on gambling as young adults [41].
- **More reform.** The Interactive Gambling Amendment (Gambling Reform) Bill 2026 was introduced on 2 July 2026. I have not reviewed what it covers [43].
- **Where this leaves us.** A hackathon prototype is very unlikely to be a distributed commercial game, but judges, lecturers and universities will notice the theme. The mitigations in `08-risks-and-guardrails.md` (no real money, no purchasable currency, no near-miss effects, Calm mode, 18+ for any public release, transparent odds) are designed to turn this from a weakness into a talking point. They reduce risk. They do not remove it.

## 8. Willingness-to-pay anchors

| Anchor | Figure | Source |
|---|---|---|
| Quizlet Plus | US$35.99 per year, US$7.99 per month | [27] |
| Quizlet Plus Unlimited | US$44.99 per year | [27] |
| Gizmo Unlimited | listed from US$6.99 in the US App Store, with various plan prices | [31][32] |
| Knowt paid tier | disagreeing figures (about US$5 per month versus US$24.99 per month) | [28][29] |
| Anki | free on desktop | [33] |

A student exam-season price of about A$10 for 8 weeks or about A$29 a year sits within this range. It is a hypothesis to test.

## 9. Customer discovery plan

### 9.1 Five question survey (5 minutes, aim for 50 to 100 responses)

1. In your last exam, how did your confidence before the exam compare with your result? (Much higher, a bit higher, about right, lower)
2. What do you do most when you revise? (Reread notes, flashcards, practice questions, past papers, ChatGPT, other)
3. How do you decide what to study next? (Free text)
4. Have you ever been "sure" about something in an exam and been wrong? What was it?
5. Which of these would you try? (A: flashcards from my notes, B: a game where I bet on how sure I am, C: a coach that plans my last 7 days, D: none)

### 9.2 Interview prompts (10 interviews, 20 minutes)

- Walk me through your last week of exam revision.
- Tell me about a time you were surprised by a result.
- What have you paid for, or refused to pay for, in study tools?
- (Show the 30 second demo) What do you expect this to do? What would stop you using it?

### 9.3 Landing page test

One page, 30 second video, "join the exam season beta" sign-up. Success means 15%+ sign-up from targeted visitors (a rough target, not a benchmark).

### 9.4 Pilot design

One course, one lecturer, 2 weeks before an exam. Measure Shifts per user, confidence gap before and after, retest success, and self-reported readiness. Compare with a short control survey where possible.

## 10. Limits of this research

- Competitor details come from review blogs and listings. Some authors build competing apps. Prices and user counts differ between sources.
- Australian enrolment figures come from aggregator pages.
- I did not audit competitor apps directly, so "no one does calibration" means "not in the sources I read".
- Learning-science claims come from a mix of primary papers and teaching blogs. Check the primary papers before citing them in a submission.
- I could not verify the hackathon winners list your friend compiled.

## 11. Sources

Numbers match the bracketed references above.

1. Enrolment trends: https://www.academicjobs.com/research-publication-news/university-enrolment-trends-australia-4361
2. Future Campus: https://futurecampus.com.au/2025/05/01/a-shrinking-future-declining-local-enrolments-and-international-caps-threaten-unis/
3. International enrolments 2025: https://www.ibtimes.com.au/record-545000-international-students-enrolled-australian-universities-2025-amid-policy-caps-for-2026-1866335
4. RMIT international numbers: https://www.universityrankings.com.au/international-student-numbers/
5. Turnitin and AI in Australian submissions (UTS): https://www.uts.edu.au/news/2026/07/more-than-50-of-australian-university-assignments-used-ai.-how-should-unis-respond
6. AI use survey cited by a student guide: https://www.switchliving.com.au/student-guide/how-ai-will-change-university-learning-in-2026/
7. Australian student chatbot survey: https://www.sciencedirect.com/science/article/pii/S2666920X24000766
8. AI in education market claims: https://www.mindomax.com/flashcard-app-with-ai-2026 and https://notesxp.app/blog/best-ai-tools-for-studying-2026/
9. Knowt vs Quizlet: https://www.timtis.com/blog/knowt-vs-quizlet-which-study-app-is-better-in-2026/
10. Quizlet history: https://en.wikipedia.org/wiki/Quizlet
11. Karpicke, Butler and Roediger, retrieval and metacognition: https://learninglab.psych.purdue.edu/downloads/2009/2009_Karpicke_Butler_Roediger.pdf
12. Testing effect and far transfer: https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5183614/
13. Retrieval practice summary (61% vs 40%): https://yukaichou.com/gamification-analysis/retrieval-practice-testing-effect-roediger-karpicke-learning/
14. Fluency illusion: https://www.structural-learning.com/post/fluency-illusions-students-think-they-know
15. Low performers overpredict: https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10607382/
16. Calibration in intro biology: https://www.lifescied.org/doi/10.1187/cbe.18-10-0202
17. Persistent miscalibration despite practice tests: https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8442020/
18. Frontiers study on second-order judgments: https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2024.1252520/full
19. TIMSS 2023 confidence study: https://link.springer.com/article/10.1186/s40536-026-00304-y
20. Hypercorrection overview: https://www.structural-learning.com/post/hypercorrection-effect-teachers-guide
21. Hypercorrection in the classroom: https://www.tandfonline.com/doi/full/10.1080/09658211.2018.1477164
22. Hypercorrection and immediate feedback: https://www.innerdrive.co.uk/blog/hypercorrection-effect/
23. Persists over a week but errors return: https://scholars.duke.edu/publication/736161
24. CBM scoring scheme: https://files.eric.ed.gov/fulltext/EJ1043247.pdf
25. CBM in physiology with an AI assistant: https://journals.physiology.org/doi/full/10.1152/advan.00087.2025
26. CBM and summative scores: https://pmc.ncbi.nlm.nih.gov/articles/PMC6544949/
27. Quizlet pricing: https://nibble-app.com/blog/quizlet-cost and https://aiflowreview.com/quizlet-pro-pricing/
28. Knowt pricing (Studr): https://studr.app/blog/best-ai-note-taking-app-for-students/
29. Knowt pricing (Mindomax): https://www.mindomax.com/best-ai-study-apps
30. Gizmo funding and users (TechCrunch): https://techcrunch.com/2026/04/15/ai-learning-app-gizmo-levels-up-with-13m-users-and-a-22m-investment/
31. Gizmo review and pricing: https://www.toolsforhumans.ai/ai-tools/gizmo
32. Gizmo App Store listing: https://apps.apple.com/us/app/gizmo-ai-tutor/id1610516671
33. AI flashcard roundup (Anki claims): https://www.mindomax.com/flashcard-app-with-ai-2026
34. AI study tools guide: https://tikonote.app/blogs/best-ai-study-tools/
35. Gizmo review by a rival builder: https://imprimo.app/blog/gizmo-ai-flashcards-review
36. Balatro 5 million: https://www.gematsu.com/2025/01/balatro-sales-top-five-million
37. Balatro 1 million: https://www.avclub.com/balatro-roguelike-deckbuilder-one-million-sales
38. Nubby's Number Factory: https://en.wikipedia.org/wiki/Nubby%27s_Number_Factory
39. Plinko Panic: https://store.steampowered.com/app/1794400/Plinko_Panic/
40. John Gleep on Steam: https://store.steampowered.com/app/4739500/JOHN_GLEEP/
41. Government classification announcement: https://minister.infrastructure.gov.au/rowland/media-release/stronger-classifications-protect-children-gambling-content-video-games
42. Classification change details: https://agbrief.com/news/australia/20/09/2024/australia-tightens-regulations-on-loot-boxes-and-gambling-features-in-video-games/
43. Gambling reform bill 2026: https://ministers.dss.gov.au/media-releases/19071
