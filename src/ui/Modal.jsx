import React from "react";

export default function Modal({ open, title, children, onClose }) {
  if (!open) return null;

  return (
    <div
      onMouseDown={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        zIndex: 9998,
        display: "grid",
        placeItems: "center",
        padding: 18
      }}
    >
      <div
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          width: "min(920px, 96vw)",
          background: "var(--card)",
          border: "1px solid var(--stroke)",
          borderRadius: 20,
          boxShadow: "var(--shadow)",
          backdropFilter: "blur(var(--blur))",
          padding: 16
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", marginBottom: 10 }}>
          <div style={{ fontWeight: 900 }}>{title}</div>
          <button
            onClick={onClose}
            style={{
              border: "1px solid var(--stroke)",
              background: "transparent",
              color: "var(--text)",
              borderRadius: 12,
              padding: "8px 10px",
              cursor: "pointer"
            }}
          >
            Tutup
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
