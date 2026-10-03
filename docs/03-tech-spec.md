# Sure Thing: Technical Spec

> This was the plan before the build. Where the code differs (no Tailwind, no `/api/grade`, a different `/api/questions` body, one `lib/engine.ts` instead of several files), `09-build-status.md` section 7 describes what was built. The game maths in section 5 below matches the code.

## 1. Principles

1. **Local-first.** Game state lives in the browser. No accounts needed for the MVP. Fewer moving parts means fewer demo failures.
2. **AI generates content, code does the maths.** Scoring, mastery, scheduling and calibration are deterministic code. The model writes questions and explanations and (stretch) grades short answers.
3. **Always have a fallback.** If the model call fails or returns bad JSON, use the seeded question bank.
4. **Verify before you trust.** Generated questions go through an independent solve check before they are shown.

## 2. Stack

| Layer | Choice | Why |
|---|---|---|
| App | Next.js (App Router) + TypeScript. Built with plain CSS, not Tailwind | Fast to build, easy deploy, API routes in the same repo |
| State | Zustand with localStorage persistence | Simple, survives reloads |
| Physics | Matter.js (2D, circles and sensors) | Mature, small, good fit for plinko |
| Rendering | Custom canvas draw loop over Matter bodies | Full control of the look (matters for the Design score) |
| AI | Anthropic API, server-side only | Question generation, verification, explanations, grading |
| Optional DB | Supabase (Postgres) for shared question banks and sync | Only if time allows |
| Hosting | Vercel | One click, env vars for keys |
| Validation | zod | Reject malformed model output |
| Tests | vitest | Fast unit tests for the game maths |

Models: use `claude-sonnet-5-5` for question generation and `claude-haiku-4-5-20251001` for fast grading and verification. Confirm the current model strings and pricing at https://docs.claude.com before you build. As built, `lib/ai.ts` uses `claude-sonnet-5-5` and the `claude-haiku-4-5` alias, with structured outputs through the SDK's zod helper.

## 3. Architecture

```
Browser (Next.js client)
  - Zustand store: unit, concepts, conceptState, attempts, chips, shop, settings
  - Game engine: scoring.ts, mastery.ts, priority.ts, calibration.ts (pure functions)
  - Board: Matter.js world + canvas renderer
        |
        | fetch (only when needed)
        v
Next.js API routes (server)
  - POST /api/unit        -> concept list for a unit name
  - POST /api/questions   -> verified questions for given concepts
  - POST /api/grade       -> short answer grading (stretch)
  - rate limit + zod validation + cache
        |
        v
Anthropic API         Seeded JSON bank (fallback)         Supabase (optional cache)
```

## 4. Data model

```ts
export type Confidence = "guess" | "pretty" | "certain";
export type PegState = "cold" | "shaky" | "solid" | "bomb";
export type Box = 1 | 2 | 3 | 4 | 5;

export interface Concept {
  id: string;
  unitId: string;
  name: string;
  summary: string;        // one line shown on the Draw card
}

export interface Option {
  id: "A" | "B" | "C" | "D";
  text: string;
  misconception?: string; // present on wrong options: why people pick it
}

export interface Question {
  id: string;
  conceptId: string;
  stem: string;
  options: Option[];
  correct: "A" | "B" | "C" | "D";
  explanation: string;    // why the right answer is right
  difficulty: 1 | 2 | 3;
  verified: boolean;      // true after human or independent-solve check
}

export interface Attempt {
  id: string;
  questionId: string;
  conceptId: string;
  chosen: "A" | "B" | "C" | "D";
  confidence: Confidence;
  correct: boolean;
  ms: number;             // time taken
  at: string;             // ISO timestamp
}

export interface ConceptState {
  conceptId: string;
  box: Box;
  attempts: number;
  correctCount: number;
  confidentWrong: number;
  bombActive: boolean;
  lastSeen: string | null;
  dueAt: string;
}
```

Optional Postgres tables (only if you add Supabase): `units`, `concepts`, `questions` (shared bank), `attempts` and `concept_state` (per user, needs auth). For the MVP the shared bank can just be a JSON file in the repo.

## 5. Game maths (reference code)

```ts
const CONF_P: Record<Confidence, number> = { guess: 0.4, pretty: 0.7, certain: 0.9 };
const INTERVAL_DAYS: Record<Box, number> = { 1: 0, 2: 1, 3: 3, 4: 7, 5: 14 };

export function betOutcome(confidence: Confidence, correct: boolean) {
  const balls = { guess: 1, pretty: 2, certain: 3 }[confidence];
  const penalty = { guess: 0, pretty: 1, certain: 4 }[confidence];
  return correct
    ? { balls, chipPenalty: 0, plantBomb: false }
    : { balls: 0, chipPenalty: penalty, plantBomb: confidence === "certain" };
}

export function updateState(
  s: ConceptState,
  a: { confidence: Confidence; correct: boolean },
  daysToExam: number,
  now = new Date()
): ConceptState {
  let { box, bombActive, confidentWrong } = s;

  if (a.correct) {
    if (a.confidence !== "guess") {
      box = Math.min(5, box + 1) as Box;
      if (bombActive) {
        bombActive = false;
        box = Math.max(box, 2) as Box;
      }
    }
  } else if (a.confidence === "certain") {
    box = 1;
    bombActive = true;
    confidentWrong += 1;
  } else {
    box = Math.max(1, box - 1) as Box;
  }

  const cap = Math.max(1, Math.floor(daysToExam / 2));
  const days = Math.min(INTERVAL_DAYS[box], cap);
  const dueAt = new Date(now.getTime() + days * 86_400_000).toISOString();

  return {
    ...s,
    box,
    bombActive,
    confidentWrong,
    attempts: s.attempts + 1,
    correctCount: s.correctCount + (a.correct ? 1 : 0),
    lastSeen: now.toISOString(),
    dueAt,
  };
}

export function pegState(s?: ConceptState): PegState {
  if (!s || s.attempts === 0) return "cold";
  if (s.bombActive) return "bomb";
  return s.box >= 4 ? "solid" : "shaky";
}

export function priority(s: ConceptState, daysToExam: number, now = new Date()): number {
  const mastery = (s.box - 1) / 4;
  const dueNow = new Date(s.dueAt) <= now ? 1 : 0;
  const urgency = daysToExam <= 3 ? 1.25 : 1;
  return urgency * (3 * (s.bombActive ? 1 : 0) + 2 * dueNow + 1.5 * (1 - mastery) + (s.confidentWrong > 0 ? 1 : 0));
}

export function calibration(attempts: Attempt[]) {
  if (attempts.length === 0) return null;
  const n = attempts.length;
  const accuracy = attempts.filter(a => a.correct).length / n;
  const meanConf = attempts.reduce((sum, a) => sum + CONF_P[a.confidence], 0) / n;
  const brier = attempts.reduce((sum, a) => sum + (CONF_P[a.confidence] - (a.correct ? 1 : 0)) ** 2, 0) / n;
  return {
    accuracy,
    meanConfidence: meanConf,
    gapPoints: Math.round((meanConf - accuracy) * 100), // positive means overconfident
    brier,
  };
}
```

Show `gapPoints` as the headline ("You were 18 points overconfident") and Brier only as a secondary detail.

## 6. The board (Matter.js sketch)

```ts
import Matter from "matter-js";

type PegSpec = { x: number; y: number; state: PegState | "neutral"; conceptId?: string };

export function buildBoard(pegs: PegSpec[], multipliers: number[], width: number, height: number) {
  const engine = Matter.Engine.create({ gravity: { x: 0, y: 1 } });

  for (const p of pegs) {
    Matter.Composite.add(
      engine.world,
      Matter.Bodies.circle(p.x, p.y, 7, {
        isStatic: true,
        restitution: 0.5,
        label: `peg:${p.state}:${p.conceptId ?? "none"}`,
      })
    );
  }

  const slotW = width / multipliers.length;
  multipliers.forEach((m, i) => {
    Matter.Composite.add(
      engine.world,
      Matter.Bodies.rectangle(i * slotW + slotW / 2, height - 10, slotW - 4, 20, {
        isStatic: true,
        isSensor: true,
        label: `bucket:${i}:${m}`,
      })
    );
  });

  Matter.Events.on(engine, "collisionStart", (e) => {
    for (const { bodyA, bodyB } of e.pairs) {
      const [ball, other] = bodyA.label === "ball" ? [bodyA, bodyB] : [bodyB, bodyA];
      if (ball.label !== "ball") continue;
      // peg hit: add yield to the ball's running total
      // bucket hit: apply multiplier, bank the chips, remove the ball
    }
  });

  return engine;
}
```

Notes:
- Cap active balls at about 12. Use a fixed timestep (1000 / 60).
- Seed the peg layout and the ball start jitter so demo runs are repeatable.
- Draw with your own canvas loop, not `Matter.Render`, so the style matches the design doc.
- Add a **Skip animation** button that resolves the drop instantly using the same logic.
- Respect `prefers-reduced-motion` by shortening or skipping the drop.

## 7. API routes

All routes are server-side, validate input and output with zod, and never expose the API key.

| Route | Input | Output | Notes |
|---|---|---|---|
| `POST /api/unit` | `{ unitName, topics? }` | `Concept[]` (10 to 14) | Cached by normalised unit name. Falls back to seeded unit |
| `POST /api/questions` | `{ unitName, concepts: [{ id, name, summary }], perConcept }` | `{ questions: Question[] }` | Runs generation, then independent-solve verification. Drops any question that fails. 1 to 4 concepts and 1 to 4 questions per concept per request |
| `POST /api/grade` (stretch, not built) | `{ questionStem, rubric, answer }` | `{ score, feedback }` | Fast model, strict JSON |

Protection: simple per-IP rate limit (built: 30 requests per minute, in memory), request size limits, and a hard cap on questions per request. Both routes return 503 on failure and the client falls back to the seeded unit.

## 8. Prompts

### 8.1 Concept map

```
You are a university tutor. Given a unit title and an optional topic list, list 10 to 14
core, testable concepts a student must understand for an exam.
Return JSON only: {"concepts":[{"name":string,"summary":string}]}
Rules: concepts must be distinct and not overlap, each summary is one plain sentence,
no concept is just a definition of a term, prefer concepts students commonly get wrong.
Unit: {{unitName}}
Topics (optional): {{topics}}
```

### 8.2 Question generation

```
Write {{n}} multiple choice questions testing the concept "{{concept}}" in the unit
"{{unit}}" at university level.
Rules:
- Exactly 4 options (A to D), exactly one unambiguously correct answer.
- Every wrong option must be a believable specific misconception. Name that misconception
  in the "misconception" field in one short sentence (why a student would pick it).
- No "all of the above", no "none of the above", no trick wording, no negatives like "which is NOT".
- Vary difficulty from 1 to 3. Vary the position of the correct answer.
- The explanation says why the correct answer is right and why the most tempting wrong
  answer is wrong, in 2 to 3 sentences.
Return JSON only matching:
{"questions":[{"stem":string,"options":[{"id":"A","text":string,"misconception":string|null},...],
"correct":"A"|"B"|"C"|"D","explanation":string,"difficulty":1|2|3}]}
```

### 8.3 Independent solve check (verification)

Send each question to a different call with the key and explanation removed:

```
Answer this multiple choice question. Return JSON only:
{"answer":"A"|"B"|"C"|"D","confidence":0 to 1,"ambiguous":boolean,"reason":string}
{{stem and options only}}
```

Keep a question only if the verifier agrees with the key, is not flagged `ambiguous`, and reports confidence of at least 0.7. Mark it `verified: true`. Seeded questions must also be checked by a human.

### 8.4 Short answer grading (stretch)

```
You grade a student's short answer. Be fair and strict about facts.
Return JSON only: {"score":0 to 1,"missing":string[],"wrong":string[],"feedback":string}
Question: {{stem}}
Marking points: {{points}}
Student answer: {{answer}}
```

## 9. Quality, caching and fallbacks

- **Question bank first.** Shared per-unit bank means one student's generation helps the next (cost and speed).
- **Cache key:** unit + concept + prompt version. Bump the version when prompts change.
- **Pre-generate** the next 10 questions when a Shift starts so there is no wait between answers.
- **On failure:** retry once, then fall back to the seeded bank and show nothing scary to the user.
- **Flag button** on every question: "This looks wrong". Store flags and exclude flagged questions from future draws.
- **Do not use AI generation for demo day.** Demo from the seeded, hand-verified unit.

## 10. Security and privacy

- API key only in server env vars (`ANTHROPIC_API_KEY`). Never in client code.
- Store attempts locally by default. Do not collect names, emails or student IDs in the MVP.
- If you add accounts later, keep calibration history minimal and get proper advice on Australian privacy obligations before a public launch (not legal advice from this doc).
- Sanitise any user-typed unit names or pasted syllabus text before putting them in prompts, and treat pasted text as data, not instructions.

## 11. Performance targets

- First bet within 60 seconds of opening the app.
- Question to question under 1 second (pre-generated).
- Drop animation under 6 seconds per Shift summary, with a skip button.
- 60 fps on a mid-range phone with up to 12 balls.

## 12. Repo layout

As built:

```
/app
  page.tsx (client-only), layout.tsx, globals.css
  /api/unit/route.ts, /api/questions/route.ts
/components
  App.tsx (all core screens), Board.tsx (canvas), Shop.tsx, Report.tsx
  Mods.tsx (shop item copy, Roulette, Blackjack and Pop Quiz popups, MEGA HIT)
  Chaos.tsx (MAXIMUM CHAOS skin layer), Seal.tsx (mascot), ui.tsx (Win95 primitives)
/lib
  engine.ts (pure maths), board.ts (Matter.js sim), minigames.ts (roulette, blackjack, quiz curve)
  store.ts (Zustand game loop), ai.ts (generation and checks), loadUnit.ts (seeded routing and fallback)
  copy.ts (Collector lines, Calm mode terms), sound.ts (synthesized sound)
/data
  databases-101.json, materials-chemistry.json, soil-chemistry.json
/tests
  engine.test.ts, golden.test.ts, minigames.test.ts, tuning.test.ts
```

Original suggestion:

```
/app
  /(game)/hub, draw, play, board, shop, report
  /api/unit, /api/questions, /api/grade
/lib
  scoring.ts, mastery.ts, priority.ts, calibration.ts
  board.ts, render.ts
  prompts.ts, schemas.ts
/data
  databases-101.concepts.json
  databases-101.questions.json
/tests
  scoring.test.ts, mastery.test.ts, calibration.test.ts
```

## 13. Seeded demo unit: Databases 101 (suggested concepts)

Primary keys, foreign keys and referential integrity, normalisation (1NF to 3NF), INNER vs LEFT JOIN, WHERE vs HAVING, GROUP BY and aggregates, NULL handling, indexes, transactions and ACID, isolation levels, ER diagrams and cardinality, views.

Two sample questions to show the target quality:

1. `SELECT COUNT(*) FROM orders WHERE customer_id = NULL;` returns what?
   Correct: 0 (comparing to NULL with `=` is never true). Tempting wrong: "the number of orders with no customer" (misconception: NULL behaves like a normal value).
2. Which clause filters groups after aggregation?
   Correct: HAVING. Tempting wrong: WHERE (misconception: WHERE can filter on aggregate results).

## 14. Progression data (as built)

Pricing lives in `lib/economy.ts` (`priceOf(item, ctx)`), pure so the tuning sim tests it. The store persists a `shop` slice and peg copies with tiers; `mergeSave()` migrates older `sure-thing-v1` saves:

```ts
shop: {
  boughtThisRun: Partial<Record<ShopItem, number>>;
  usesThisShift: Partial<Record<ShopItem, number>>;  // study tools, reset each Shift
  rerolls: number;                                    // this Shift
  shiftIncome: number[];                              // per finished Shift, for the income index
};
inventory.pegs: { kind: SpecialKind; tier: number }[]; // up to 3 copies per kind
```

## 15. Environment variables

```
ANTHROPIC_API_KEY=
NEXT_PUBLIC_APP_NAME=Sure Thing
# optional
SUPABASE_URL=
SUPABASE_ANON_KEY=
```
