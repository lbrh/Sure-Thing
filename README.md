# Sure Thing

Bet on what you know, and the board shows you what you don't. A revision game built on confidence betting, a plinko knowledge board and spaced retests. Plans and rationale live in [`docs/`](docs/01-overview.md).

## Run

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # engine maths, golden path, minigames, economy tuning sim (45 tests)
npm run tune       # just the tuning sim
```

Three seeded units work fully offline: **Databases 101**, **Materials Chemistry** and **Soil Properties (Chemistry)** (12 concepts, 48 hand-checked questions each). A unit name that matches one of them never touches the network. Any other unit name calls the model; set `ANTHROPIC_API_KEY` in `.env.local` (see `.env.example`). If generation fails for any reason, the app falls back to Databases 101.

What the build ships and how it differs from the plans: [`docs/09-build-status.md`](docs/09-build-status.md).

## Map

| Path | What |
|---|---|
| `lib/engine.ts` | Scoring, Leitner mastery, draw priority, calibration, readiness, streak multiplier (pure functions) |
| `lib/board.ts` | Matter.js board: peg layout, shop pegs, 7 aimable chutes, seeded drops, Skip resolves the same sim instantly |
| `lib/minigames.ts` | Roulette wheel, Blackjack hands, Pop Quiz speed bonus (pure, seeded) |
| `lib/store.ts` | Zustand store persisted to localStorage: the whole game loop, shop, resume mid-Shift |
| `lib/loadUnit.ts` | Routes unit names to seeded banks, otherwise live generation with fallback |
| `lib/ai.ts`, `app/api/*` | Live generation (`claude-sonnet-5-5`) plus independent solve check (`claude-haiku-4-5`), zod-validated, rate-limited |
| `lib/copy.ts`, `lib/sound.ts` | The Collector's lines and Calm mode wording; synthesized sound effects |
| `components/App.tsx` | Screens: Setup, Intro, Hub, Draw, Question and Bet, Reveal with Drop, Summary, Settings |
| `components/Shop.tsx`, `Mods.tsx`, `Report.tsx`, `Board.tsx` | Shop and skins; shop item copy and the Roulette, Blackjack and Pop Quiz popups; Readiness Report; canvas board |
| `components/Chaos.tsx`, `Seal.tsx`, `ui.tsx` | MAXIMUM CHAOS skin layer; seal mascot; Win95 window and counter primitives |
| `data/*.json` | Seeded banks |

## Crazy shop

Board pegs (permanent): **Roulette** (spins ROULETTE.EXE, 12-slot wheel x0 to x10), **Blackjack** (play a hand, win x3, blackjack x5), **Pop Quiz** (answer a question from your unit for x5), **Splitter**, **Black Hole**, **Bumper**. Next-Shift mods: **MEGA BUCKET** (centre x10), **Earthquake**, **Magnet**. Any x5+ payout shakes the screen and strobes MEGA HIT. Odds are shown before buying. Calm mode and reduced motion turn the popups, strobe and shake off (popups auto-play with the same outcomes as Skip).

## Streaks and aiming

Correct answers in a row multiply that answer's drop chips (x1, x1.5, x2, x2.5, capped at x3). You aim every ball yourself by clicking one of 7 chutes or pressing 1 to 7.

## Skins

**Retro 95** (default, Windows 95 / early-web) and **MAXIMUM CHAOS** (pop-ups, confetti, fake media players, emoji buttons), switched for free in the Shop. Calm mode turns all of it off.

## Mascot

A low-poly seal (`components/Seal.tsx`, pure SVG + CSS) lives in the corner. It wobbles side to side, claps or slaps its belly every few seconds, claps when you're right, slaps its belly when a bomb lands, and squeaks "GYUU!" when you click it (synthesized, no audio files). Other code can cue it with `sealDo("clap" | "slap" | "gyuu")`.

## Next up

- **Cookie Clicker style progression (requirement):** shop prices rise as you earn more chips, so there is always something to save for. See [`docs/10-progression-and-inspiration.md`](docs/10-progression-and-inspiration.md).
- **Ideas from Peggle and casino games:** target pegs, a free-ball bucket, power pegs, Keno-style calibration bets and more, each checked against the guardrails. Same doc.
- **Open decision:** keep, reskin or cut the Roulette and Blackjack pegs ([`docs/08-risks-and-guardrails.md`](docs/08-risks-and-guardrails.md), section 1).

## Demo path

Build the board, start a Shift, pick **NULL handling**, answer **A** with **Certain**: bomb planted. It comes back about 3 questions later for a retest with a different question. After the Shift, buy a Defuser or play on, then run Exam Day and open the Report.
