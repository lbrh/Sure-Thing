# Sure Thing: Business Model Canvas

Everything marked **(hypothesis)** is a guess to be tested, not a fact. Market figures and competitor prices come from `05-market-research.md`, where sources and caveats are listed.

## 1. Canvas at a glance

| Block | Summary |
|---|---|
| Customer segments | University students in exam-heavy units (primary). Lecturers and course coordinators, and universities (secondary, later) |
| Value propositions | Know what you actually know before exam day. Know what to study tonight. Make revision short and fun |
| Channels | Student clubs and Discords, short video clips, lecturer referrals, exam-season pushes |
| Customer relationships | Self-serve app, community question flagging, pilot partnerships with lecturers |
| Revenue streams | Student Exam Season Pass and yearly plan (freemium). Course licences for class insight (later) |
| Key resources | Question banks, calibration engine, board game engine, LLM access, learning-science credibility |
| Key activities | Question generation and verification, game tuning, community and lecturer outreach |
| Key partners | Lecturers, student unions and clubs, university learning-support teams, a gambling-harm advisor, LLM provider |
| Cost structure | LLM usage, hosting, content verification, design, legal and compliance review, support |

## 2. Customer segments

**Primary: university students facing exams.**
- Australia has over 1.6 million university students, with about 1.68 million enrolments reported for 2024 [market research, section 3].
- Best early adopters: first and second years in units with multiple-choice or short-answer exams (computing, science, health, business), and students who already use Quizlet, Anki, Knowt or Gizmo and feel their revision is not working.
- RMIT alone reports over 26,000 international students (about 46% of its student body), a group that often faces higher pressure and less familiarity with local assessment formats (hypothesis).

**Secondary (later): lecturers and course coordinators.** They want to know which concepts their class is confidently wrong about, before the exam.

**Tertiary (later): universities.** Interested in retention, wellbeing and learning support. Long sales cycle, so start with free pilots.

**Not targeted at launch:** under-18 students. See `08-risks-and-guardrails.md` for why.

## 3. Value propositions

| For | Pain | Gain |
|---|---|---|
| Students | "I felt ready and wasn't." Revision feels productive but isn't | An honest map of what you know and what you are fooling yourself about, plus a plan for tonight |
| Students | Decision fatigue about what to study | The app picks the next concept and schedules retests |
| Students | Revision is boring, so it gets postponed | A short, funny, game-like session that you start without willpower |
| Lecturers (later) | They only find out what students misunderstand after the exam | A class-level view of confident misconceptions before the exam |

Positioning line: **know what you don't know.**

## 4. Channels

1. **Short video clips.** The "95% sure and wrong" moment is made for a 10 second clip.
2. **Student communities.** Course Discords, club networks, orientation and exam-season events.
3. **Lecturer referrals.** A lecturer who shares a link in the exam-prep announcement is the best channel there is (hypothesis).
4. **Student unions and learning-support teams.** Position as study-skills support.
5. **App stores and search** later, once there is a mobile build.

Timing: exam season is the moment of peak need. Plan launches and pilots around the weeks before exam blocks.

## 5. Customer relationships

- Self-serve with no onboarding call.
- A "This question looks wrong" button, which doubles as quality control and a way for students to feel ownership.
- Pilot partnerships: offer one lecturer a free class dashboard in exchange for feedback and a unit's question bank.
- Honest framing: we publish what we know and do not know about whether calibration games improve exam scores.

## 6. Revenue streams

All prices are **hypotheses to test** with a pre-launch survey and landing page.

**Student (B2C), freemium:**

| Tier | What you get | Price idea |
|---|---|---|
| Free | One unit, full core loop, readiness report, safe play controls | A$0 |
| Exam Season Pass | Unlimited units, AI-generated units from your own syllabus, advanced readiness report, sync | About A$9.99 for 8 weeks |
| Yearly | Everything above for the year | About A$29 per year |

Anchors: Quizlet Plus is reported at US$35.99 per year (or US$7.99 per month) and Plus Unlimited at US$44.99 per year. Gizmo prices vary by source, with weekly plans reported between roughly US$6.99 and US$13.99 and student discounts mentioned. Knowt is largely free with paid tiers whose reported prices disagree between sources.

Principles we hold to, because they are also differentiators:
- No lives, timers or paywalls triggered by wrong answers. Gizmo's free tier limits wrong answers through daily lives, which conflicts with our learning-first stance.
- No ads. No sale of chips. No real-money mechanics of any kind.

**Course licences (B2B, later):** a per-course, per-semester licence for a class insight dashboard (confident-misconception heatmap, readiness distribution). Price unknown (hypothesis). Start free in pilots.

**University licences (later):** site licence bundled with learning-support services. Long cycle, not a hackathon-stage focus.

## 7. Key resources

- Verified, per-unit question banks (the main asset over time).
- The calibration engine and per-student confidence history.
- The board and game feel (design, physics tuning, sound).
- LLM access for generation and verification.
- Credibility: advisory input from a learning scientist or learning-support staff, and from a gambling-harm advisor.

## 8. Key activities

- Generate, verify and maintain question banks.
- Tune the game economy so honest confidence is always the best strategy.
- Run pilots and measure learning and behaviour outcomes honestly.
- Moderate and fix flagged questions.
- Outreach to lecturers and student groups.

## 9. Key partners

- **Lecturers and course coordinators:** content validation and distribution.
- **Student unions, clubs and learning-support teams:** trust and reach.
- **A gambling-harm reduction advisor:** review of mechanics and copy before any public launch.
- **LLM provider:** generation and verification (a single provider is a dependency risk).

## 10. Cost structure

| Cost | Driver | Notes |
|---|---|---|
| LLM usage | Questions generated and verified, short answers graded | Shared per-unit banks mean the marginal cost of an extra student on the same unit is close to zero for generation. Grading short answers is the main per-student cost |
| Hosting | Traffic | Low at pilot scale |
| Content verification | Human time per unit | The real cost of quality. Lecturer partnerships reduce it |
| Design and audio | One-off, then updates | |
| Legal and compliance | Classification, privacy, advertising claims | Get proper advice before a public launch |
| Support | Flag handling, student queries | |
| App store fees | If a mobile app is released | |

Unit economics formula to fill in once you have real numbers:

`LLM cost per active student per month = (new questions generated per student * cost per question * (1 - bank reuse rate)) + (short answers graded * cost per grading call)`

Look up current prices at docs.claude.com. The main lever is the bank reuse rate.

## 11. Rough revenue scenarios (illustrative arithmetic only)

Assume A$29 per paying student per year and 1.6 million Australian university students (the market research gives the source of that figure):

| Share of students who pay | Paying students | Yearly revenue |
|---|---|---|
| 0.1% | 1,600 | about A$46,400 |
| 1% | 16,000 | about A$464,000 |
| 3% | 48,000 | about A$1.39 million |

These are not forecasts. They show that the idea needs a small share of one national market to be a real small business, and that conversion rate and retention after exam season are the numbers to test first.

## 12. Why it is hard to copy (and where it is not)

- **Not defensible:** "AI generates quiz questions". Many apps do this.
- **More defensible:** (1) the calibration mechanic and honest-confidence economy, (2) per-student calibration history, (3) lecturer-verified per-unit question banks, (4) a distinctive game identity and tone.
- Gizmo already proves students like game mechanics in study apps (leaderboards, streaks, lives, friend challenges). Our difference is that our mechanic is the learning method, not decoration.

## 13. Key risks to the model

1. **Seasonality.** Usage spikes before exams and drops afterwards. The Exam Season Pass fits this, and weekly low-stakes retests across the semester are the retention play.
2. **Willingness to pay.** Free alternatives exist, including a free-tier-heavy Knowt and open-source Anki.
3. **Regulatory perception.** Gambling-style mechanics attract scrutiny in Australia. See `08-risks-and-guardrails.md`.
4. **Learning evidence.** Confidence-based marking has evidence of student appreciation and better self-awareness, but one formative study found no improvement in summative exam scores. We must measure our own outcomes.
5. **Platform dependency** on a single LLM provider.

## 14. Assumptions to validate first

| # | Assumption | Cheap test |
|---|---|---|
| 1 | Students recognise "I felt ready and wasn't" as their problem | 10 short interviews and a 5 question survey |
| 2 | They would try a bet-on-your-confidence game for revision | Landing page with a 30 second video, count sign-ups |
| 3 | They would use it again within 3 days | Pilot with one class, track repeat Shifts |
| 4 | The confidence gap shrinks after 3 Shifts | Before and after calibration scores in the pilot |
| 5 | At least some would pay around A$10 for an exam season | Survey price ladder, then a pre-order test |
| 6 | A lecturer would share it with a class | Ask 3 lecturers directly |

## 15. Go-to-market sketch

1. **Now to exam block:** pilot with one course and one lecturer. Measure sessions, calibration gap and retests.
2. **Next exam block:** open to a few courses, add class insight dashboard for pilot lecturers.
3. **Following semester:** exam season pass, mobile-friendly PWA, student ambassador network.
4. **Later:** institutional conversations backed by pilot data.

Metrics to track: activation (first bet within 60 seconds), Shifts per user in the 14 days before an exam, confidence gap change, retest success on bombed concepts, conversion, and share of users who report knowing what to study tonight.
