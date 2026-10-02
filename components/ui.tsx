// Win95 primitives shared by every screen.
import type { ReactNode } from "react";

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
  return (
    <section className={`win ${className}`} aria-label={title}>
      <div className={`win-title ${tone ?? ""}`}>
        <span>{title}</span>
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
  const v = typeof value === "number" ? String(Math.max(0, value)).padStart(digits, "0") : value;
  return (
    <span className={`counter ${big ? "big" : ""}`} aria-label={`${label}: ${value}`}>
      <span className="lbl" aria-hidden="true">{label}</span>
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
