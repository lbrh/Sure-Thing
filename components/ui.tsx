// Win95 primitives shared by every screen. The Standard skin renders them without the 1997 touches.
import type { ReactNode } from "react";
import { useGame } from "@/lib/store";

const usePlain = () => useGame((s) => s.settings.skin === "plain");

/** "THE_DRAW.EXE - SHIFT 1 - Q1 OF 8" -> "The draw - shift 1 - Q1 of 8" */
export function plainTitle(title: string) {
  const words = title.replace(/\.(EXE|TXT|XLS|DOC|GIF|WAV|PEG|MOD|SKN)\b/g, "").replace(/_/g, " ").split(" ");
  return words.map((w, i) => (/\d/.test(w) || w !== w.toUpperCase() ? w : i === 0 ? w[0] + w.slice(1).toLowerCase() : w.toLowerCase())).join(" ");
}

export function Window({
  title,
  children,
  body = "sunken",
  tone,
  className = "",
}: {
  title: string;
  children: ReactNode;
  body?: "sunken" | "note" | "plain";
  tone?: "alert" | "ok";
  className?: string;
}) {
  const shown = usePlain() ? plainTitle(title) : title;
  return (
    <section className={`win ${className}`} aria-label={shown}>
      <div className={`win-title ${tone ?? ""}`}>
        <span>{shown}</span>
        <span className="win-ctrls" aria-hidden="true">
          <i>_</i>
          <i>□</i>
          <i>×</i>
        </span>
      </div>
      <div className={`win-body ${body === "plain" ? "" : body}`}>{children}</div>
    </section>
  );
}

export function Counter({ label, value, digits = 4, big }: { label: string; value: number | string; digits?: number; big?: boolean }) {
  const plain = usePlain();
  const v = typeof value === "number" ? (plain ? String(Math.max(0, value)) : String(Math.max(0, value)).padStart(digits, "0")) : value;
  return (
    <span className={`counter ${big ? "big" : ""}`} aria-label={`${label}: ${value}`}>
      <span className="lbl" aria-hidden="true">{plain ? plainTitle(label) : label}</span>
      <span aria-hidden="true">{v}</span>
    </span>
  );
}

const SQUARES = ["#ff0000", "#00ff00", "#0000ff", "#ffff00", "#ff00ff", "#00ffff"];
export function ColorSquares() {
  return (
    <div className="squares" aria-hidden="true">
      {SQUARES.map((c) => (
        <i key={c} style={{ background: c }} />
      ))}
    </div>
  );
}

export function Marquee({ items }: { items: [string, string][] }) {
  return (
    <div className="marquee" aria-hidden="true">
      <div className="marquee-track">
        {items.map(([text, color], i) => (
          <b key={i} style={{ color }}>
            ★ {text}
          </b>
        ))}
      </div>
    </div>
  );
}
