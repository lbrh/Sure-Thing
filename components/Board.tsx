"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { autoResult, BUCKET_TOP, CHUTE_BOTTOM, CHUTES, createDrop, WALL_PEG_R, WALL_PEGS_Y, H, MEGA_MULTIPLIERS, MULTIPLIERS, W, type Drop, type Hold, type HoldResult, type PegSpec, type SpecialKind } from "@/lib/board";
import type { PegState } from "@/lib/engine";
import { sfx } from "@/lib/sound";

const STEP = 1000 / 60;
// pure early-web colours on a black CRT
const C = {
  solid: "#00ff00",
  shaky: "#ffff00",
  bomb: "#ff0000",
  cold: "#808080",
  neutral: "#000080",
  neutralEdge: "#1084d0",
  white: "#ffffff",
  magenta: "#ff00ff",
  cyan: "#00ffff",
  orange: "#ff8000",
};
const BUCKET_COLOR = (m: number) => (m >= 10 ? null : m >= 3 ? "#ff0000" : m >= 2 ? "#00aa00" : m >= 1 ? "#0000ff" : "#808080");

export interface BoardProps {
  pegs: PegSpec[];
  states: Record<string, PegState>;
  drop?: { balls: number; seed: number; magnet: boolean; mega: boolean; quake: boolean; fever?: boolean; streakMult?: number; wheelExtra?: number[] } | null;
  showMega?: boolean; // static preview of next Shift's mega bucket
  onDone?: (chips: number, skill: number, armed: string[]) => void;
  /** Captured ball: show a popup, then call release(result). Leave unset to auto-play. Calm mode pays the wheel's expected value without asking. */
  onHold?: (hold: Hold, release: (r: HoldResult) => void) => void;
  onCheer?: (level: 1 | 2 | 3, value: number) => void;
  onPegClick?: (peg: PegSpec) => void;
  spark?: string[]; // concept ids whose pegs get a fuse-spark / defuse ring
  popIn?: boolean;
  calm?: boolean;
  sound?: boolean;
  reducedMotion?: boolean;
  label: string;
}

export default function Board(props: BoardProps) {
  const { pegs, states, drop, popIn, reducedMotion, label, onPegClick, showMega } = props;
  const canvas = useRef<HTMLCanvasElement>(null);
  const sim = useRef<Drop | null>(null);
  const doneRef = useRef(false);
  const [running, setRunning] = useState(false);
  const [left, setLeft] = useState(0);
  const [boardMult, setBoardMult] = useState(1);
  const hover = useRef(-1);
  const live = useRef(props);
  live.current = props;

  const statesKey = JSON.stringify(states);
  const frozenStates = useMemo(() => states, [statesKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const dropKey = drop ? `${drop.balls}:${drop.seed}:${drop.magnet}:${drop.mega}:${drop.quake}:${drop.fever}:${drop.streakMult}:${drop.wheelExtra}` : "";

  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const c = el.getContext("2d")!;
    let raf = 0;
    let frame = 0;
    let seenEvents = 0;
    let askedHold = -1;
    let last = performance.now();
    let acc = STEP;
    doneRef.current = false;
    // you aim every ball yourself, unless reduced motion asks for an instant result
    sim.current = drop && drop.balls > 0 ? createDrop(pegs, frozenStates, { ...drop, manual: !reducedMotion, calm: props.calm }) : null;
    setRunning(Boolean(sim.current));
    setLeft(sim.current?.remaining ?? 0);
    setBoardMult(1);

    const finish = () => {
      if (doneRef.current) return;
      doneRef.current = true;
      setRunning(false);
      live.current.onDone?.(sim.current?.chips ?? 0, sim.current?.skill ?? 0, sim.current?.armed ?? []);
    };
    if (drop && drop.balls === 0) queueMicrotask(finish);
    if (sim.current && reducedMotion) sim.current.resolve();

    const render = () => {
      const p = live.current;
      const dpr = window.devicePixelRatio || 1;
      const cssW = el.clientWidth;
      if (el.width !== Math.round(cssW * dpr)) {
        el.width = Math.round(cssW * dpr);
        el.height = Math.round(cssW * (H / W) * dpr);
      }
      c.setTransform((dpr * cssW) / W, 0, 0, (dpr * cssW) / W, 0, 0);
      c.fillStyle = "#000";
      c.fillRect(0, 0, W, H);
      const s = sim.current;
      const calm = p.calm ?? false;

      // captured balls: hand the popup to the parent, or auto-play it
      if (s?.holds.length) {
        const h = s.holds[0];
        if (!p.onHold || (calm && h.kind === "wheel")) s.release(h.id, autoResult(h, calm));
        else if (askedHold !== h.id) {
          askedHold = h.id;
          p.onHold(h, (r) => s.release(h.id, r));
        }
      }
      // fixed 60Hz timestep, catching up (max 8 steps) when frames are slow; paused while a popup is open
      const now = performance.now();
      acc = Math.min(acc + now - last, 8 * STEP);
      last = now;
      for (; acc >= STEP; acc -= STEP) if (s && !s.done && !s.holds.length && !reducedMotion) s.tick();

      if (s && s.events.length > seenEvents) {
        let pegSound = false;
        for (; seenEvents < s.events.length; seenEvents++) {
          const e = s.events[seenEvents];
          if (e.type === "cheer") {
            p.onCheer?.(e.level, e.value);
            if (p.sound && e.level >= 2) sfx.mega();
          } else if (e.type === "boardMult") setBoardMult(e.mult);
          else if (e.type === "armed") continue;
          else if (!pegSound && p.sound) {
            pegSound = true; // at most one tick per frame
            sfx.peg(e.state);
          }
        }
      }

      if (s) drawChutes(c, s.remaining, hover.current, frame, calm);

      // buckets
      const mult = s?.mult ?? (showMega ? MEGA_MULTIPLIERS : MULTIPLIERS);
      const slotW = W / mult.length;
      mult.forEach((m, i) => {
        const col = BUCKET_COLOR(m);
        c.fillStyle = col ?? (calm ? "#ff0000" : `hsl(${(frame * 8) % 360} 100% 50%)`);
        c.fillRect(i * slotW + 3, BUCKET_TOP + 2, slotW - 6, H - BUCKET_TOP - 4);
        c.strokeStyle = "#fff";
        c.lineWidth = 2;
        c.strokeRect(i * slotW + 3, BUCKET_TOP + 2, slotW - 6, H - BUCKET_TOP - 4);
        c.font = `900 ${m >= 10 ? 16 : 13}px "Courier New", monospace`;
        c.textAlign = "center";
        c.fillStyle = "#000";
        c.fillText(`x${m}`, i * slotW + slotW / 2 + 1, H - 13);
        c.fillStyle = "#fff";
        c.fillText(`x${m}`, i * slotW + slotW / 2, H - 14);
      });

      // wall half-pegs: visible so nothing bounces off thin air
      c.fillStyle = C.neutral;
      c.strokeStyle = C.neutralEdge;
      c.lineWidth = 1;
      for (const y of WALL_PEGS_Y)
        for (const [x, a0] of [[0, -Math.PI / 2], [W, Math.PI / 2]] as const) {
          c.beginPath();
          c.arc(x, y, WALL_PEG_R, a0, a0 + Math.PI);
          c.fill();
          c.stroke();
        }

      // pegs
      const visible = popIn ? Math.min(pegs.length, Math.floor(frame / 3)) : pegs.length;
      for (let i = 0; i < visible; i++) {
        const pg = pegs[i];
        const flash = s?.flashes.get(i) ?? 0;
        // hit pegs flash, then stay dimmed for the rest of the drop
        c.globalAlpha = !flash && s?.fallen.has(i) ? 0.35 : 1;
        if (pg.special) drawSpecial(c, pg.x, pg.y, pg.special, frame, calm);
        else drawPeg(c, pg.x, pg.y, pg.conceptId ? frozenStates[pg.conceptId] ?? "cold" : "neutral");
        c.globalAlpha = 1;
        if (flash) {
          c.strokeStyle = C.white;
          c.lineWidth = 2;
          c.strokeRect(pg.x - 12, pg.y - 12, 24, 24);
        }
        if (pg.conceptId && p.spark?.includes(pg.conceptId)) {
          // fuse spark on a new bomb, ring on a defuse; settles after ~2s
          const t = Math.min(1, frame / 120);
          c.globalAlpha = 1 - t;
          c.strokeStyle = frame % 10 < 5 ? C.shaky : C.white;
          c.lineWidth = 2;
          c.strokeRect(pg.x - 14 - (frame % 20) / 3, pg.y - 14 - (frame % 20) / 3, 28 + ((frame % 20) * 2) / 3, 28 + ((frame % 20) * 2) / 3);
          c.globalAlpha = 1;
        }
      }

      // balls
      if (s)
        for (const b of s.balls) {
          if (b.done || b.held) continue;
          c.beginPath();
          c.arc(b.body.position.x, b.body.position.y, 7, 0, Math.PI * 2);
          c.fillStyle = b.child ? C.cyan : C.white;
          c.fill();
          c.strokeStyle = "#000";
          c.lineWidth = 1;
          c.stroke();
        }

      // floating numbers
      if (s)
        for (const t of s.texts) {
          if (t.age > 50) continue;
          const wild = t.kind === "wild";
          c.font = wild ? `900 15px "Arial Black", Impact, sans-serif` : `900 ${t.kind === "bucket" ? 18 : 13}px "Courier New", monospace`;
          const y = t.y - t.age * 0.6;
          c.fillStyle = "#000";
          c.fillText(t.text, t.x + 2, y + 2);
          c.fillStyle = wild ? (calm ? C.white : `hsl(${(frame * 20 + t.x) % 360} 100% 55%)`) : t.kind === "minus" ? C.bomb : t.kind === "bucket" ? C.shaky : C.solid;
          c.fillText(t.text, t.x, y);
        }

      frame++;
      if (s?.done && !doneRef.current) {
        if (p.sound) sfx.bucket();
        finish();
      }
      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
  }, [pegs, frozenStates, dropKey, popIn, reducedMotion, showMega]); // eslint-disable-line react-hooks/exhaustive-deps

  const drop1 = (chute: number) => {
    const s = sim.current;
    if (!s || s.remaining <= 0) return;
    setLeft(s.dropAt(chute));
    if (live.current.sound) sfx.tick();
  };

  // keys 1-7 drop down that chute
  useEffect(() => {
    if (!running) return;
    const key = (e: KeyboardEvent) => {
      const n = Number(e.key);
      if (n >= 1 && n <= CHUTES) drop1(n - 1);
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [running]); // eslint-disable-line react-hooks/exhaustive-deps

  const toBoard = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H };
  };

  const click = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = toBoard(e);
    if (sim.current && y < CHUTE_BOTTOM + 30) return drop1(Math.floor(x / (W / CHUTES)));
    if (!onPegClick) return;
    const hit = pegs.find((p) => (p.conceptId || p.special) && Math.hypot(p.x - x, p.y - y) < 18);
    if (hit) onPegClick(hit);
  };

  return (
    <div className={`board-wrap ${running && drop?.quake ? "quaking" : ""}`}>
      {running && (
        <div className="board-bar">
          <span className="counter" aria-live="polite">
            <span className="lbl">BALLS</span>
            {left}
          </span>
          {boardMult > 1 && (
            <span className="counter" aria-live="polite">
              <span className="lbl">BOARD</span>x{boardMult}
            </span>
          )}
          {drop?.fever && <span className="badge hot">FEVER</span>}
          <button className="btn small" onClick={() => sim.current?.resolve()}>
            Skip
          </button>
        </div>
      )}
      <canvas
        ref={canvas}
        className="board"
        onClick={click}
        onMouseMove={(e) => {
          const { x, y } = toBoard(e);
          hover.current = sim.current && y < CHUTE_BOTTOM + 30 ? Math.floor(x / (W / CHUTES)) : -1;
        }}
        onMouseLeave={() => (hover.current = -1)}
        role="img"
        aria-label={running ? `${label}. ${left} balls left. Press 1 to 7 to drop down a chute.` : label}
      />
    </div>
  );
}

const CHUTE_COLORS = ["#ff00ff", "#ff0000", "#ff8000", "#ffff00", "#00ff00", "#00ffff", "#0000ff"];

function drawChutes(c: CanvasRenderingContext2D, remaining: number, hover: number, frame: number, calm: boolean) {
  const w = W / CHUTES;
  for (let i = 0; i < CHUTES; i++) {
    const x0 = i * w;
    const cx = x0 + w / 2;
    c.beginPath();
    c.moveTo(x0 + 3, 4);
    c.lineTo(x0 + w - 3, 4);
    c.lineTo(cx + 11, CHUTE_BOTTOM);
    c.lineTo(cx - 11, CHUTE_BOTTOM);
    c.closePath();
    c.fillStyle = remaining > 0 ? (calm ? "#808080" : CHUTE_COLORS[(i + Math.floor(frame / 30)) % CHUTES]) : "#202020";
    c.fill();
    c.lineWidth = hover === i ? 3 : 1;
    c.strokeStyle = hover === i ? "#ffffff" : "#000";
    c.stroke();
    c.fillStyle = "#000";
    c.font = `900 13px "Courier New", monospace`;
    c.textAlign = "center";
    c.fillText(String(i + 1), cx, 22);
    if (remaining > 0 && hover === i) {
      c.fillStyle = "#fff";
      c.fillText("▼", cx, CHUTE_BOTTOM + 14 + (calm ? 0 : (frame % 20) / 5));
    }
  }
}

function drawPeg(c: CanvasRenderingContext2D, x: number, y: number, st: PegState | "neutral") {
  c.lineWidth = 3;
  c.beginPath();
  if (st === "solid") {
    c.fillStyle = C.solid;
    c.arc(x, y, 8, 0, Math.PI * 2);
    c.fill();
  } else if (st === "shaky") {
    c.strokeStyle = C.shaky;
    c.arc(x, y, 7, 0, Math.PI * 2);
    c.stroke();
  } else if (st === "cold") {
    c.strokeStyle = C.cold;
    c.lineWidth = 2;
    c.arc(x, y, 5, 0, Math.PI * 2);
    c.stroke();
  } else if (st === "bomb") {
    c.fillStyle = C.bomb;
    c.moveTo(x, y - 10);
    c.lineTo(x + 10, y);
    c.lineTo(x, y + 10);
    c.lineTo(x - 10, y);
    c.closePath();
    c.fill();
    c.strokeStyle = "#000";
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(x - 4, y - 4);
    c.lineTo(x + 4, y + 4);
    c.moveTo(x + 4, y - 4);
    c.lineTo(x - 4, y + 4);
    c.stroke();
  } else {
    c.fillStyle = C.neutral;
    c.strokeStyle = C.neutralEdge;
    c.lineWidth = 1;
    c.arc(x, y, 6, 0, Math.PI * 2);
    c.fill();
    c.stroke();
  }
}

function drawSpecial(c: CanvasRenderingContext2D, x: number, y: number, k: SpecialKind, frame: number, calm: boolean) {
  const spin = calm ? 0 : frame * 0.06;
  c.lineWidth = 2;
  c.textAlign = "center";
  c.textBaseline = "middle";
  if (k === "wheel") {
    // game show prize wheel: seven bright segments and a bulb rim
    const cols = [C.cyan, C.solid, C.magenta, C.orange, C.shaky, "#0000ff", C.white];
    for (let i = 0; i < 7; i++) {
      c.beginPath();
      c.moveTo(x, y);
      c.arc(x, y, 12, spin + (i * 2 * Math.PI) / 7, spin + ((i + 1) * 2 * Math.PI) / 7);
      c.fillStyle = cols[i];
      c.fill();
    }
    c.beginPath();
    c.arc(x, y, 12, 0, Math.PI * 2);
    c.setLineDash([2, 3]);
    c.strokeStyle = C.shaky;
    c.stroke();
    c.setLineDash([]);
  } else if (k === "quiz21") {
    // quiz show buzzer with the target on it
    c.beginPath();
    c.arc(x, y, 12, 0, Math.PI * 2);
    c.fillStyle = C.cyan;
    c.fill();
    c.strokeStyle = C.white;
    c.stroke();
    c.fillStyle = "#000";
    c.font = `900 10px "Arial Black", sans-serif`;
    c.fillText("21?", x, y + 1);
  } else if (k === "quiz" || k === "alumni") {
    c.fillStyle = k === "alumni" ? C.orange : C.magenta;
    c.fillRect(x - 10, y - 10, 20, 20);
    c.strokeStyle = C.white;
    c.strokeRect(x - 10, y - 10, 20, 20);
    c.fillStyle = "#000";
    c.font = `900 14px "Arial Black", sans-serif`;
    c.fillText(k === "alumni" ? "A" : "?", x, y + 1);
  } else if (k === "splitter") {
    c.beginPath();
    c.moveTo(x - 11, y - 9);
    c.lineTo(x + 11, y - 9);
    c.lineTo(x, y + 11);
    c.closePath();
    c.fillStyle = C.cyan;
    c.fill();
    c.strokeStyle = C.white;
    c.stroke();
  } else if (k === "blackhole") {
    for (let r = 0; r < 3; r++) {
      c.beginPath();
      c.arc(x, y, 6 + r * 4, spin * (r + 1), spin * (r + 1) + Math.PI * 1.3);
      c.strokeStyle = r % 2 ? C.cyan : C.magenta;
      c.stroke();
    }
    c.beginPath();
    c.arc(x, y, 5, 0, Math.PI * 2);
    c.fillStyle = "#000";
    c.fill();
    c.strokeStyle = C.white;
    c.stroke();
  } else {
    c.beginPath();
    c.arc(x, y, 10, 0, Math.PI * 2);
    c.fillStyle = C.orange;
    c.fill();
    c.strokeStyle = C.white;
    c.stroke();
    c.fillStyle = "#000";
    c.font = `900 13px "Arial Black", sans-serif`;
    c.fillText("!", x, y + 1);
  }
  c.textBaseline = "alphabetic";
}
