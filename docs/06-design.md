# Sure Thing: Design Doc (UI, UX and Game Feel)

## 1. Design goals

1. **One thing to look at.** The board is both the game and the feedback screen. If someone can read the board, they can read their knowledge.
2. **Honesty feels good.** The interface should make saying "I'm not sure" feel smart, not weak.
3. **Fast to start, easy to stop.** First bet inside 60 seconds. A Shift takes about 8 minutes.
4. **Funny, never shaming.** Mistakes are material for jokes, not punishment.
5. **Not a casino.** Playful pachinko parlour, not slot machine. See the guardrails.

How each goal maps to the prompt: Smarter (1, 2), Easier (3), More enjoyable (4, 5).

## 2. Visual identity

**Mood:** study lamp meets pachinko parlour. A tired bureaucrat (The Collector) is chasing you for a pass. Warm lamp light on a dark desk, bouncy neon pegs.

**Avoid:** slot reels, playing cards, dollar signs, lucky sevens, flashing jackpot lights, anything that reads as a real casino brand.

### Palette (CSS tokens)

```css
:root {
  --bg: #0e1224;          /* ink navy */
  --surface: #171c36;     /* cards */
  --surface-2: #20274a;
  --text: #f3f1ea;        /* warm white */
  --muted: #9aa0c2;
  --lamp: #ffb547;        /* amber: primary accent, Shaky pegs */
  --solid: #4be3b0;       /* mint: Solid pegs, correct */
  --bomb: #ff5c6c;        /* coral: Bomb pegs, wrong */
  --violet: #8b7bff;      /* UI highlight, chips */
  --cold: #6b7194;        /* grey: Cold pegs */
}
```

Check text contrast against `--bg` and `--surface` for WCAG AA before locking colours.

### Typography

- Display and headings: Space Grotesk (or Bricolage Grotesque).
- Numbers, chips, odds table: JetBrains Mono.
- Body: Inter.
All three are on Google Fonts. Minimum body size 16px.

### Peg shapes (never rely on colour alone)

| State | Shape | Colour |
|---|---|---|
| Solid | filled circle | mint |
| Shaky | ring (hollow circle) | amber |
| Cold | small hollow dot | grey |
| Bomb | diamond with an X | coral |

## 3. The Collector (antagonist and narrator)

A dry, tired debt collector with a ledger. Short lines, deadpan.

| Moment | Line |
|---|---|
| Setup | "Databases 101. Exam in 9 days. You owe me a pass." |
| Certain and right | "Hm. Annoyingly correct." |
| Pretty sure and wrong | "Close enough to hurt, not close enough to count." |
| Certain and wrong | "Interesting. You were sure. I'll make a note." |
| Bomb planted | "I've put a little something on Joins. We'll revisit." |
| Bomb defused | "Defused. I'm taking that off the ledger." |
| End of Shift | "Debt down 14%. Don't get comfortable." |
| Daily cap hit | "Enough for today. Your brain files things while you sleep. See you tomorrow." |

Tone rules: never insult the player, never mock effort, never guilt about missing a day.

## 4. Information architecture and flow

```
Setup -> Hub -> The Draw -> Question and Bet -> Reveal -> Board and Drop -> (next question or Shift end)
                  ^                                                              |
                  |                                                              v
                  +------------------ Shop <------------- Shift summary ---------+
                                                           |
                                                           v
                                              Exam Day -> Readiness Report
Settings (Calm mode, daily cap, sound) reachable from anywhere
```

## 5. Screens and wireframes

### 5.1 Setup (under 30 seconds)

```
+------------------------------------------+
|  SURE THING                              |
|  Know what you don't know.               |
|                                          |
|  What's the unit?                        |
|  [ Databases 101                     ]   |
|  When's the exam?                        |
|  [ 11 Oct 2026 ]    (9 days)             |
|                                          |
|  [ Build my board ]                      |
|  Using the demo unit offline             |
+------------------------------------------+
```

After tapping, pegs pop onto the board one by one as concept names appear. The Collector delivers the opening line.

### 5.2 Hub

```
+------------------------------------------+
| 9 days to exam            Chips: 12      |
| DEBT  [########--------] 62% to go       |
+------------------------------------------+
|  [ mini board preview with peg colours ] |
|                                          |
|  Weakest: Joins, Isolation levels        |
|  Bombs: 1                                |
|                                          |
|  [ Start a Shift (8 questions) ]         |
|  [ Shop ]   [ Report ]                   |
+------------------------------------------+
```

### 5.3 The Draw

Three concept cards. Each shows the concept name, a one-line summary and a small badge: Bomb, Due, New or Shaky. The player picks one. Tapping a card flips it into the first question. Never show a paid option here.

### 5.4 Question and Bet

```
+------------------------------------------+
| Shift 2   Q4 of 8                Chips 14|
+------------------------------------------+
| Joins                                    |
|                                          |
| SELECT COUNT(*) FROM orders              |
| WHERE customer_id = NULL;                |
| What does this return?                   |
|                                          |
| ( ) A  The orders with no customer       |
| ( ) B  0                                 |
| ( ) C  An error                          |
| ( ) D  The total number of orders        |
+------------------------------------------+
| How sure are you?                        |
| [ Guess ]   [ Pretty sure ]  [ Certain ] |
|   1 ball        2 balls        3 balls   |
|   lose 0        lose 1         lose 4    |
|                                          |
|            [ Lock it in ]                |
+------------------------------------------+
```

Rules: the player must pick an option and a confidence level before **Lock it in** enables. Keyboard: A to D for options, 1 to 3 for confidence, Enter to lock. The odds line is always visible (transparent odds).

### 5.5 Reveal

**Correct:** mint flash, the Collector line, "Balls earned: 2".

**Wrong and not Certain:** coral edge, short explanation, "Lose 1 chip".

**Wrong and Certain (the hero moment):**

```
+------------------------------------------+
|  BOMB PLANTED on NULL handling           |
|  You were certain. It was B.             |
|                                          |
|  Why A is tempting:                      |
|  It feels like NULL is just a value you  |
|  can compare with =.                     |
|                                          |
|  The idea:                               |
|  NULL means unknown, so = NULL is never  |
|  true. Use IS NULL instead.              |
|                                          |
|  Confident mistakes are often the        |
|  easiest to fix. We'll retest this soon. |
|                                          |
|  [ Got it ]                              |
+------------------------------------------+
```

The copy says "often the easiest to fix", not "always", because the research effect is not guaranteed.

### 5.6 Board and Drop

Portrait board with about 30 pegs, 12 of them scoring pegs labelled on tap or hover with the concept name. Balls drop from the top. Each scoring peg hit shows a small floating "+2" or "-2". Buckets at the bottom show multipliers. A **Skip** button resolves instantly. Chip counter ticks up with a soft sound. New bombs appear with a short fuse-spark animation.

Tapping any peg opens a small card: concept name, state, box level, last result.

### 5.7 Shop

Three offers shown per visit, drawn at random from the item list (roguelike feel). Each shows name, effect, price in chips and a one-line joke. Nothing is purchasable with money. A Defuser card previews which bombs it can defuse.

### 5.8 Readiness Report

```
+------------------------------------------+
| READINESS: 72%  (estimate)               |
| Confidence gap: +18 pts (overconfident)  |
+------------------------------------------+
| Topic              Mastery   Flag        |
| Primary keys       ########  Solid       |
| Normalisation      ######    Shaky       |
| Joins              ##        BOMB        |
| Isolation levels   -         Not tried   |
+------------------------------------------+
| Where you were sure and wrong:           |
|  Joins (2), NULL handling (1)            |
|                                          |
| Tonight's plan (25 min)                  |
|  1. Joins: defuse the bomb               |
|  2. Isolation levels: first look         |
|  3. Normalisation: one retest            |
|                                          |
| [ Start tonight's Shift ]  [ Share ]     |
+------------------------------------------+
```

Always label the score as an estimate and show how many questions it is based on. A calibration chart (stated confidence on the x axis, actual accuracy on the y axis, with a diagonal "perfectly calibrated" line) is the optional deep-dive view.

### 5.9 Settings

- Calm mode (renames chips to points, bets to confidence levels, swaps the parlour skin for a plain board, turns off sound)
- Daily Shift cap (default 6)
- Sound on or off
- Reduced motion
- "How scoring works" (the odds table)

## 6. Motion, sound and feel

- Soft clicks and wooden tick sounds for pegs. No reel spins, no coin showers, no jackpot jingles.
- No near-miss effects: no "so close!" audio or slow-motion on almost-big buckets.
- Drop animation capped at about 6 seconds per Shift summary and always skippable.
- The bomb moment is the one place for a bigger effect (a small "tick, tick" then a thud), because it is a learning moment.
- Defusing a bomb gets a satisfying "snip" and a mint ring on the peg.
- Respect `prefers-reduced-motion`.

## 7. Accessibility

- Colour is never the only signal: shapes differ per peg state.
- Contrast at WCAG AA or better. Text scales to 200%.
- Full keyboard play. Visible focus rings.
- Screen reader labels for options, confidence buttons, and board events ("Bomb planted on Joins").
- Tap targets at least 44 px.
- Plain-language explanations, short sentences, no gaming jargon in the core flow.
- Calm mode and reduced motion are both reachable in two taps.

## 8. Responsive layout

- **Mobile first:** portrait board at 9:16, bet buttons within thumb reach at the bottom.
- **Desktop:** two columns during play (question on the left, live mini board on the right). The board goes full width for drops.
- Test at 360 px width and at 1280 px.

## 9. Onboarding (3 steps, under 30 seconds)

1. Type a unit and exam date.
2. Watch the board build and meet The Collector.
3. A single guided question that explains the bet: "Right and sure pays more. Wrong and sure costs more. Be honest."

No tutorial modals after that. The odds table stays one tap away.

## 10. Microcopy rules

- Say "confidence" in explanations and "bet" in game text. Calm mode swaps "bet" for "confidence level".
- Never "you failed", "you lost" or "wrong again". Use "not this time" and "bomb planted".
- Always give a next step after a mistake ("We'll retest this in 3 questions").
- Keep the odds visible near the bet, in plain numbers.

## 11. Design checks before the demo

- [ ] A stranger can say what the pegs mean after one Shift, without being told
- [ ] The bomb moment fits in one screen with no scrolling
- [ ] The readiness report is readable in 10 seconds
- [ ] Calm mode looks intentional, not like a broken page
- [ ] Nothing in the UI resembles a real casino, slot machine or betting brand
