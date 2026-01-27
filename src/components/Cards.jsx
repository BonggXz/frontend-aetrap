import React from "react";
import { clsx } from "../lib/utils.js";

/**
 * ShimmerButton (compat) — sekarang jadi button normal TANPA shimmer animation.
 * Biar code lama tetap jalan tanpa perlu refactor.
 */
export function ShimmerButton({
  children,
  onClick,
  style,
  className,
  disabled,
  variant = "primary",
  type = "button",
  title
}) {
  const base =
    variant === "ghost"
      ? {
          background: "transparent",
          border: "1px solid var(--stroke)",
          color: "var(--text)"
        }
      : variant === "danger"
      ? {
          background: "rgba(255, 80, 110, 0.85)",
          border: "1px solid rgba(255, 80, 110, 0.35)",
          color: "rgba(10,20,40,0.95)"
        }
      : {
          background: "rgba(255,255,255,0.88)",
          border: "1px solid rgba(255,255,255,0.40)",
          color: "rgba(10,20,40,0.95)"
        };

  return (
    <button
      type={type}
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={clsx("aetrap-btn", className)}
      style={{
        ...base,
        borderRadius: 14,
        padding: "12px 16px",
        cursor: disabled ? "not-allowed" : "pointer",
        fontWeight: 900,
        position: "relative",
        transition: "transform 120ms ease, opacity 120ms ease, background 120ms ease",
        opacity: disabled ? 0.55 : 1,
        transform: "translateZ(0)",
        ...style
      }}
    >
      {children}
      <style>{`
        .aetrap-btn:active { transform: scale(0.99); }
        .aetrap-btn:focus { outline: none; }
      `}</style>
    </button>
  );
}

/**
 * IconButton — tombol dengan icon (kiri) atau icon-only (buat toolbar/gallery)
 * Usage:
 * <IconButton icon={FiRefreshCw} variant="ghost">Refresh</IconButton>
 * <IconButton icon={FiDownload} />
 */
export function IconButton({
  icon: Icon,
  children,
  onClick,
  disabled,
  variant = "ghost",
  size = "md", // "md" | "icon"
  title,
  style,
  className,
  type = "button"
}) {
  const isIconOnly = size === "icon" || !children;

  const base =
    variant === "ghost"
      ? {
          background: "rgba(255,255,255,0.03)",
          border: "1px solid var(--stroke)",
          color: "var(--text)"
        }
      : variant === "primary"
      ? {
          background: "rgba(255,255,255,0.88)",
          border: "1px solid rgba(255,255,255,0.40)",
          color: "rgba(10,20,40,0.95)"
        }
      : variant === "danger"
      ? {
          background: "rgba(255, 80, 110, 0.85)",
          border: "1px solid rgba(255, 80, 110, 0.35)",
          color: "rgba(10,20,40,0.95)"
        }
      : {
          background: "transparent",
          border: "1px solid var(--stroke)",
          color: "var(--text)"
        };

  const pad = isIconOnly ? "10px" : "10px 14px";
  const radius = 14;

  return (
    <button
      type={type}
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={clsx("aetrap-icon-btn", className)}
      style={{
        ...base,
        borderRadius: radius,
        padding: pad,
        cursor: disabled ? "not-allowed" : "pointer",
        fontWeight: 900,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        opacity: disabled ? 0.55 : 1,
        transition: "transform 120ms ease, opacity 120ms ease, background 120ms ease",
        minWidth: isIconOnly ? 40 : undefined,
        height: isIconOnly ? 40 : undefined,
        ...style
      }}
    >
      {Icon ? <Icon size={16} /> : null}
      {children ? <span style={{ fontSize: 13, fontWeight: 900 }}>{children}</span> : null}
      <style>{`
        .aetrap-icon-btn:active { transform: scale(0.99); }
        .aetrap-icon-btn:focus { outline: none; }
      `}</style>
    </button>
  );
}

export function GlassCard({ children, style, className }) {
  return (
    <div
      className={className}
      style={{
        background: "var(--card)",
        border: "1px solid var(--stroke)",
        borderRadius: "var(--radius)",
        boxShadow: "var(--shadow)",
        backdropFilter: "blur(var(--blur))",
        padding: 18,
        ...style
      }}
    >
      {children}
    </div>
  );
}

export function MiniCard({ children, style, className }) {
  return (
    <div
      className={className}
      style={{
        background: "var(--card2)",
        border: "1px solid var(--stroke)",
        borderRadius: 18,
        padding: 14,
        ...style
      }}
    >
      {children}
    </div>
  );
}

export function Badge({ children, tone = "neutral" }) {
  const bg =
    tone === "good"
      ? "rgba(89,255,168,0.12)"
      : tone === "warn"
      ? "rgba(255,211,107,0.12)"
      : tone === "bad"
      ? "rgba(255,107,138,0.12)"
      : "rgba(139,210,255,0.10)";

  const bd =
    tone === "good"
      ? "rgba(89,255,168,0.25)"
      : tone === "warn"
      ? "rgba(255,211,107,0.25)"
      : tone === "bad"
      ? "rgba(255,107,138,0.25)"
      : "rgba(139,210,255,0.22)";

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 10px",
        borderRadius: 999,
        background: bg,
        border: `1px solid ${bd}`,
        color: "var(--text)",
        fontSize: 12,
        fontWeight: 900
      }}
    >
      {children}
    </span>
  );
}

export function SectionTitle({ kicker, title, right }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-end", marginBottom: 12 }}>
      <div>
        {kicker && <div style={{ color: "var(--muted2)", fontSize: 12, fontWeight: 900, marginBottom: 6 }}>{kicker}</div>}
        <div style={{ fontSize: 22, fontWeight: 950, letterSpacing: -0.3 }}>{title}</div>
      </div>
      {right}
    </div>
  );
}
