# Sure Thing

Bet on what you know, and the board shows you what you don't. A revision game built on confidence betting, a plinko knowledge board and spaced retests. Plans and rationale live in [`docs/`](docs/01-overview.md).

## Run

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # engine maths, golden path, economy tuning sim
```

The seeded **Databases 101** unit (12 concepts, 48 hand-checked questions) works fully offline. Any other unit name calls the model; set `ANTHROPIC_API_KEY` in `.env.local` (see `.env.example`). If generation fails for any reason, the app falls back to the seeded unit.

## Map

| Path | What |
|---|---|
| `lib/engine.ts` | Scoring, Leitner mastery, draw priority, calibration, readiness (pure functions) |
| `lib/board.ts` | Matter.js board: peg layout, seeded drops, Skip resolves the same sim instantly |
| `lib/store.ts` | Zustand store persisted to localStorage: the whole game loop |
| `lib/ai.ts`, `app/api/*` | Live generation (`claude-sonnet-5-5`) plus independent solve check (`claude-haiku-4-5`), zod-validated, rate-limited |
| `components/` | Screens: Setup, Hub, Draw, Question and Bet, Reveal, Drop, Shop, Report, Settings |
| `data/databases-101.json` | Seeded bank |

## Crazy shop

Board pegs (permanent): **Roulette** (spins ROULETTE.EXE, 12-slot wheel x0 to x10), **Blackjack** (play a hand, win x3, blackjack x5), **Pop Quiz** (answer a question from your unit for x5), **Splitter**, **Black Hole**, **Bumper**. Next-Shift mods: **MEGA BUCKET** (centre x10), **Earthquake**, **Magnet**. Any x5+ payout shakes the screen and strobes MEGA HIT. Odds are shown before buying. Calm mode and reduced motion turn the popups, strobe and shake off (popups auto-play with the same outcomes as Skip).

## Mascot

A low-poly seal (`components/Seal.tsx`, pure SVG + CSS) lives in the corner. It wobbles side to side, claps or slaps its belly every few seconds, claps when you're right, slaps its belly when a bomb lands, and squeaks "GYUU!" when you click it (synthesized, no audio files). Other code can cue it with `sealDo("clap" | "slap" | "gyuu")`.

## Demo path

Build the board, start a Shift, pick **NULL handling**, answer **A** with **Certain**: bomb planted. It comes back about 3 questions later for a retest with a different question. After the Shift, buy a Defuser or play on, then run Exam Day and open the Report.
