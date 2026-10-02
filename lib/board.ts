import Matter from "matter-js";
import { rng, type PegState } from "./engine";
import { celebration, PRIZE_WHEEL, wheelEV, wheelSlot } from "./minigames";

export const W = 360;
export const H = 550;
export const PEG_R = 7;
export const BALL_R = 7;
export const MULTIPLIERS = [0.5, 1, 2, 3, 2, 1, 0.5];
export const MEGA_MULTIPLIERS = [0.5, 1, 2, 10, 2, 1, 0.5];
export const YIELD: Record<PegState | "neutral", number> = { cold: 0, shaky: 1, solid: 2, bomb: -2, neutral: 0 };
// Tuned with tests/tuning.test.ts: a ball is worth (BASE + sum of peg yields) * bucket * SCALE.
export const BASE = 1;
export const SCALE = 0.36;
export const MAX_ACTIVE = 12;
export const MAX_BALLS = 40; // splitter cap
export const MAGNET_R = 30;
// Fairness knobs, checked by tests/tuning.test.ts ("aim matters, walls don't swallow balls")
export const PEG_BOUNCE = 0.3;
export const BALL_BOUNCE = 0.3;
export const AIR = 0.02;
const WALL = { restitution: 0.4, friction: 0, frictionStatic: 0 };

/** Matter.js resets static bodies to restitution 0 / friction 1, so set the surface after creating it. */
function solid<B extends Matter.Body>(body: B, surface: Partial<Pick<Matter.Body, "restitution" | "friction" | "frictionStatic">>): B {
  return Object.assign(body, surface);
}
export const WALL_PEG_R = 7;
export const MIN_IMPACT = 0.8; // px/step into the peg; below this it's a graze (~1 in 6 contacts)
export const DROP_JITTER = 20; // px; enough wobble that one chute isn't a fixed path

const ROWS = 7;
const TOP = 95;
const ROW_GAP = 52;
export const BUCKET_TOP = TOP + ROWS * ROW_GAP + 10;
/** Without these, the gap between the outer pegs and the wall is an open lane straight down to x0.5. One half-peg between each pair of rows closes it. */
export const WALL_PEGS_Y = Array.from({ length: ROWS }, (_, r) => TOP + r * ROW_GAP + ROW_GAP / 2);

/** Shop pegs. Hold pegs capture the ball and open a popup; the rest act on the physics. */
export type SpecialKind = "wheel" | "quiz21" | "quiz" | "splitter" | "blackhole" | "bumper";
export type HoldKind = "wheel" | "quiz21" | "quiz";
export const isHold = (k?: SpecialKind): k is HoldKind => k === "wheel" || k === "quiz21" || k === "quiz";

export interface PegSpec {
  x: number;
  y: number;
  conceptId?: string;
  special?: SpecialKind;
}

/** Fixed peg grid; each concept gets 2 scoring pegs, placed by a seeded shuffle. */
export function layoutPegs(conceptIds: string[], seed: number): PegSpec[] {
  const pegs: PegSpec[] = [];
  for (let r = 0; r < ROWS; r++) {
    const n = r % 2 === 0 ? 6 : 5;
    const x0 = r % 2 === 0 ? 30 : 60;
    for (let i = 0; i < n; i++) pegs.push({ x: x0 + i * 60, y: TOP + r * ROW_GAP });
  }
  const rand = rng(seed);
  const order = pegs.map((_, i) => i).sort(() => rand() - 0.5);
  conceptIds.slice(0, Math.floor(pegs.length / 2)).forEach((id, i) => {
    pegs[order[2 * i]].conceptId = id;
    pegs[order[2 * i + 1]].conceptId = id;
  });
  return pegs;
}

/** Owned specials take over neutral pegs, most central first, in purchase order. */
export function placeSpecials(pegs: PegSpec[], specials: SpecialKind[]): PegSpec[] {
  const midY = TOP + ((ROWS - 1) * ROW_GAP) / 2;
  const free = pegs
    .map((p, i) => ({ p, i }))
    .filter(({ p }) => !p.conceptId)
    .sort((a, b) => Math.abs(a.p.y - midY) + Math.abs(a.p.x - W / 2) * 0.6 - (Math.abs(b.p.y - midY) + Math.abs(b.p.x - W / 2) * 0.6))
    .map(({ i }) => i);
  const out = pegs.map((p) => ({ ...p }));
  specials.slice(0, free.length).forEach((k, n) => (out[free[n]].special = k));
  return out;
}

export interface FloatText {
  x: number;
  y: number;
  text: string;
  kind: "plus" | "minus" | "bucket" | "wild";
  age: number;
}

interface Ball {
  id: number;
  body: Matter.Body;
  total: number;
  hit: Set<number>;
  steps: number;
  done: boolean;
  held: boolean;
  child: boolean;
  warped: boolean;
}

export interface Hold {
  id: number;
  kind: HoldKind;
  peg: number;
  seed: number; // deterministic outcome source (wheel segment, quiz pick)
  ballValue: number; // chips the ball carries in; never at stake
  segments: number[]; // Prize Wheel segments for this ball
}

/** What a popup hands back. Wheel and 21 Quiz add a bonus and the ball drops on; Pop Quiz pays the ball times mult. */
export interface HoldResult {
  bonus?: number;
  skill?: number; // chips paid for correct answers inside the popup
  mult?: number;
}

export type DropEvent = { type: "peg"; state: PegState | "neutral" | SpecialKind } | { type: "cheer"; level: 1 | 2 | 3; value: number };

export interface DropOptions {
  balls: number;
  seed: number;
  magnet?: boolean;
  mega?: boolean; // centre bucket x10 for this Shift
  quake?: boolean; // gravity wobbles sideways
  manual?: boolean; // player drops each ball by picking a chute; otherwise balls auto-drop near the centre
  calm?: boolean; // chance devices resolve to their expected value
}

/** Seven drop chutes across the top, one above each bucket. */
export const CHUTES = 7;
export const CHUTE_BOTTOM = 56;
export const chuteX = (i: number) => (W / CHUTES) * (i + 0.5);

/** Popup pegs pay the ball's full value (no SCALE), min 1, so a big multiplier feels big. */
export const holdValue = (total: number) => Math.max(1, BASE + total);

/** The wheel segment a ball lands on: seeded, so Skip and the animation agree. */
export const wheelResult = (h: Pick<Hold, "seed" | "segments">) => h.segments[wheelSlot(rng(h.seed)(), h.segments.length)];

/** Outcome used when nobody plays the popup (Skip, reduced motion, tests). Calm mode pays the wheel's expected value. */
export function autoResult(h: Pick<Hold, "kind" | "seed" | "segments">, calm = false): HoldResult {
  if (h.kind === "wheel") return { bonus: calm ? wheelEV(h.segments) : wheelResult(h) };
  if (h.kind === "quiz") return { mult: 1 }; // no answer: the ball keeps its value
  return {}; // 21 Quiz: no hand played, no bonus
}

export type Drop = ReturnType<typeof createDrop>;

export function createDrop(pegs: PegSpec[], states: Record<string, PegState>, opts: DropOptions) {
  const mult = opts.mega ? MEGA_MULTIPLIERS : MULTIPLIERS;
  const rand = rng(opts.seed);
  const engine = Matter.Engine.create({ gravity: { x: 0, y: 1 } });
  const world = engine.world;
  const stateOf = (p: PegSpec): PegState | "neutral" => (p.conceptId ? states[p.conceptId] ?? "cold" : "neutral");

  pegs.forEach((p, i) =>
    Matter.Composite.add(
      world,
      solid(Matter.Bodies.circle(p.x, p.y, p.special === "bumper" ? PEG_R + 3 : PEG_R, { isStatic: true, label: `peg:${i}` }), { restitution: PEG_BOUNCE, friction: 0 })
    )
  );
  const slotW = W / mult.length;
  Matter.Composite.add(world, [
    solid(Matter.Bodies.rectangle(-10, H / 2, 20, H * 2, { isStatic: true }), WALL),
    solid(Matter.Bodies.rectangle(W + 10, H / 2, 20, H * 2, { isStatic: true }), WALL),
  ]);
  // half-pegs on the walls in the rows that would otherwise leave an open lane down the side
  for (const y of WALL_PEGS_Y) for (const x of [0, W]) Matter.Composite.add(world, solid(Matter.Bodies.circle(x, y, WALL_PEG_R, { isStatic: true, label: "wall" }), WALL));
  for (let i = 1; i < mult.length; i++)
    Matter.Composite.add(world, Matter.Bodies.rectangle(i * slotW, BUCKET_TOP + 30, 4, 60, { isStatic: true, chamfer: { radius: 2 } }));
  mult.forEach((_, i) =>
    Matter.Composite.add(
      world,
      Matter.Bodies.rectangle(i * slotW + slotW / 2, H - 8, slotW, 16, { isStatic: true, isSensor: true, label: `bucket:${i}` })
    )
  );

  const balls: Ball[] = [];
  const holds: Hold[] = [];
  const texts: FloatText[] = [];
  const flashes = new Map<number, number>(); // peg index -> frames left
  const events: DropEvent[] = [];
  const landed = mult.map(() => 0); // balls per bucket, for fairness checks
  let chips = 0;
  let skill = 0; // chips from answering popup questions, for the skill-share meter
  let spawned = 0;
  let auto = !opts.manual;
  let cooldown = 0;
  const queue: number[] = []; // x positions waiting to drop
  let step = 0;
  let nextId = 0;

  const addBall = (x: number, y: number, child = false, total = 0) => {
    const body = Matter.Bodies.circle(x, y, BALL_R, { restitution: BALL_BOUNCE, friction: 0.001, frictionAir: AIR, label: "ball" });
    Matter.Composite.add(world, body);
    const b: Ball = { id: nextId++, body, total, hit: new Set(), steps: 0, done: false, held: false, child, warped: false };
    balls.push(b);
    return b;
  };

  /** Pay chips. The cheer compares the ball's outcome with what it already had (see celebration). */
  const pay = (value: number, x: number, y: number, outcome: number, had: number) => {
    chips += value;
    const level = celebration(outcome, had);
    texts.push({ x, y, text: `+${value}`, kind: level ? "wild" : "bucket", age: 0 });
    if (level) events.push({ type: "cheer", level, value });
  };

  const payout = (b: Ball, x: number, y: number, value: number, had: number) => {
    b.done = true;
    b.held = false;
    pay(value, x, y, value, had);
    Matter.Composite.remove(world, b.body);
  };

  const bank = (b: Ball, bucket: number) => {
    if (b.done || b.held) return;
    landed[bucket]++;
    const base = Math.max(0, BASE + b.total) * SCALE;
    payout(b, bucket * slotW + slotW / 2, H - 40, Math.round(base * mult[bucket]), Math.round(base));
  };

  const say = (i: number, text: string) => texts.push({ x: pegs[i].x, y: pegs[i].y - 14, text, kind: "wild", age: 0 });

  const special = (b: Ball, i: number) => {
    const k = pegs[i].special!;
    events.push({ type: "peg", state: k });
    if (isHold(k)) {
      b.held = true;
      Matter.Composite.remove(world, b.body);
      holds.push({ id: b.id, kind: k, peg: i, seed: opts.seed * 1000 + b.id + 1, ballValue: holdValue(b.total), segments: PRIZE_WHEEL });
      say(i, k === "quiz" ? "POP QUIZ!" : k === "wheel" ? "PRIZE WHEEL!" : "21 QUIZ!");
    } else if (k === "splitter" && !b.child && balls.length < MAX_BALLS) {
      for (const dx of [-1, 1]) Matter.Body.setVelocity(addBall(pegs[i].x + dx * 12, pegs[i].y - 4, true, b.total).body, { x: dx * 2.5, y: -1.5 });
      say(i, "SPLIT!");
    } else if (k === "bumper") {
      const { x, y } = b.body.position;
      const d = Math.hypot(x - pegs[i].x, y - pegs[i].y) || 1;
      Matter.Body.setVelocity(b.body, { x: ((x - pegs[i].x) / d) * 8, y: ((y - pegs[i].y) / d) * 8 });
      say(i, "BOING!");
    }
  };

  const hitPeg = (b: Ball, i: number) => {
    if (b.hit.has(i) || b.held || b.done) return;
    b.hit.add(i);
    flashes.set(i, 18);
    if (pegs[i].special) return special(b, i);
    const st = stateOf(pegs[i]);
    const y = YIELD[st];
    b.total += y;
    events.push({ type: "peg", state: st });
    if (y !== 0) texts.push({ x: pegs[i].x, y: pegs[i].y - 12, text: y > 0 ? `+${y}` : `${y}`, kind: y > 0 ? "plus" : "minus", age: 0 });
  };

  Matter.Events.on(engine, "collisionStart", (e) => {
    for (const pair of e.pairs) {
      const { bodyA, bodyB } = pair;
      const [ballBody, other] = bodyA.label === "ball" ? [bodyA, bodyB] : [bodyB, bodyA];
      if (ballBody.label !== "ball") continue;
      const b = balls.find((x) => x.body === ballBody);
      if (!b || b.done) continue;
      const [kind, idx] = other.label.split(":");
      if (kind === "peg") {
        // a glancing skim barely changes the ball's path, so it shouldn't score (or trigger a special)
        const n = pair.collision.normal;
        if (Math.abs(ballBody.velocity.x * n.x + ballBody.velocity.y * n.y) >= MIN_IMPACT) hitPeg(b, Number(idx));
      }
      else if (kind === "bucket") bank(b, Number(idx));
    }
  });

  const solids = pegs.flatMap((p, i) => (!p.special && stateOf(p) === "solid" ? [i] : []));
  const holes = pegs.flatMap((p, i) => (p.special === "blackhole" ? [i] : []));

  function tick() {
    const active = balls.filter((b) => !b.done && !b.held).length;
    if (auto && spawned + queue.length < opts.balls && step % 14 === 0) queue.push(W / 2 + (rand() - 0.5) * 80);
    if (queue.length && cooldown <= 0 && active < MAX_ACTIVE) {
      addBall(queue.shift()!, 30);
      spawned++;
      cooldown = 5; // spam-proof: back-to-back clicks drop ~12 balls a second without stacking
    }
    cooldown--;
    if (opts.quake) engine.gravity.x = Math.sin(step / 22) * 0.45;
    for (const b of balls) {
      if (b.done || b.held) continue;
      b.steps++;
      const { x, y } = b.body.position;
      // Magnet Peg: solid pegs pull in any ball that passes close by (counts as a hit)
      if (opts.magnet) for (const i of solids) if (Math.hypot(pegs[i].x - x, pegs[i].y - y) < MAGNET_R) hitPeg(b, i);
      // Black Hole: pulls nearby balls in, then warps them back to the top once, +2 for the trip
      for (const i of holes) {
        const d = Math.hypot(pegs[i].x - x, pegs[i].y - y);
        if (b.warped || d > 80) continue;
        if (d < PEG_R + BALL_R + 2) {
          b.warped = true;
          b.total += 2;
          say(i, "WARP +2!");
          events.push({ type: "peg", state: "blackhole" });
          Matter.Body.setPosition(b.body, { x: 40 + rand() * (W - 80), y: 30 });
          Matter.Body.setVelocity(b.body, { x: 0, y: 0 });
        } else Matter.Body.applyForce(b.body, b.body.position, { x: ((pegs[i].x - x) / d) * 0.00006, y: ((pegs[i].y - y) / d) * 0.00006 });
      }
      // ponytail: stuck-ball guard; bank by x position after ~15s of sim time
      if (b.steps > 900) bank(b, Math.min(mult.length - 1, Math.max(0, Math.floor(b.body.position.x / slotW))));
    }
    Matter.Engine.update(engine, 1000 / 60);
    step++;
    for (const t of texts) t.age++;
    for (const [k, v] of flashes) v <= 1 ? flashes.delete(k) : flashes.set(k, v - 1);
  }

  /** Settle a captured ball. A bonus is added and the ball drops back in; Pop Quiz pays the ball at its multiplier. */
  function release(id: number, r: HoldResult) {
    const h = holds.findIndex((x) => x.id === id);
    if (h < 0) return;
    const [hold] = holds.splice(h, 1);
    const b = balls.find((x) => x.id === id)!;
    const p = pegs[hold.peg];
    if (hold.kind === "quiz") {
      const value = Math.round(hold.ballValue * Math.max(1, r.mult ?? 1));
      skill += value - hold.ballValue;
      return payout(b, p.x, p.y - 14, value, hold.ballValue);
    }
    const bonus = (r.bonus ?? 0) + (r.skill ?? 0);
    skill += r.skill ?? 0;
    if (bonus > 0) pay(bonus, p.x, p.y - 14, hold.ballValue + bonus, hold.ballValue);
    b.held = false;
    b.steps = 0;
    Matter.Body.setPosition(b.body, { x: p.x + (rand() - 0.5) * 6, y: p.y + PEG_R + BALL_R + 2 });
    Matter.Body.setVelocity(b.body, { x: (rand() - 0.5) * 2, y: 1.5 });
    Matter.Composite.add(world, b.body);
  }

  const finished = () => spawned >= opts.balls && holds.length === 0 && balls.every((b) => b.done);
  const remaining = () => opts.balls - spawned - queue.length;

  /** Player picked a chute. Small seeded jitter so spamming one chute doesn't stack identical balls. */
  function dropAt(chute: number) {
    if (remaining() <= 0) return 0;
    queue.push(chuteX(Math.max(0, Math.min(CHUTES - 1, chute))) + (rand() - 0.5) * DROP_JITTER);
    return remaining();
  }

  return {
    pegs,
    balls,
    holds,
    texts,
    flashes,
    events,
    stateOf,
    mult,
    landed,
    get chips() {
      return chips;
    },
    get skill() {
      return skill;
    },
    get done() {
      return finished();
    },
    tick,
    release,
    dropAt,
    get remaining() {
      return remaining();
    },
    /** Skip: run the same simulation to the end, instantly, auto-playing any popups. */
    resolve() {
      auto = true; // any balls not dropped yet go down the middle
      let guard = 0;
      while (!finished() && guard++ < 20000) {
        while (holds.length) release(holds[0].id, autoResult(holds[0], opts.calm));
        tick();
      }
      return chips;
    },
  };
}
