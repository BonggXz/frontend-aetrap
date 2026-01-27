import React, { createContext, useContext, useMemo, useRef, useState } from "react";
import { Icons } from "./Icons.jsx";

const ToastCtx = createContext(null);

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);

  const api = useMemo(() => {
    function push({ title, message, type = "info", ms = 2600 }) {
      const id = Math.random().toString(16).slice(2);
      const toast = { id, title, message, type };
      setItems((prev) => [toast, ...prev].slice(0, 4));
      setTimeout(() => {
        setItems((prev) => prev.filter((t) => t.id !== id));
      }, ms);
    }

    return {
      success: (m, t) => push({ type: "success", title: t || "Berhasil", message: m }),
      error: (m, t) => push({ type: "error", title: t || "Gagal", message: m, ms: 3400 }),
      warn: (m, t) => push({ type: "warn", title: t || "Peringatan", message: m, ms: 3200 }),
      info: (m, t) => push({ type: "info", title: t || "Info", message: m })
    };
  }, []);

  return (
    <ToastCtx.Provider value={api}>
      {children}
      <ToastViewport items={items} />
    </ToastCtx.Provider>
  );
}

export function useToast() {
  return useContext(ToastCtx);
}

function ToastViewport({ items }) {
  return (
    <div
      style={{
        position: "fixed",
        top: 18,
        right: 18,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        width: 360,
        maxWidth: "calc(100vw - 24px)"
      }}
    >
      {items.map((t) => (
        <ToastItem key={t.id} t={t} />
      ))}
    </div>
  );
}

function ToastItem({ t }) {
  const isLight = document.documentElement.getAttribute("data-theme") === "light";
  const base = {
    background: "var(--card)",
    border: "1px solid var(--stroke)",
    backdropFilter: "blur(var(--blur))",
    borderRadius: 16,
    boxShadow: "var(--shadow)",
    padding: "12px 12px",
    display: "flex",
    gap: 10,
    alignItems: "flex-start",
    animation: "toastIn 160ms ease-out"
  };

  const Icon =
    t.type === "success" ? Icons.Success : t.type === "error" ? Icons.Error : t.type === "warn" ? Icons.Warn : Icons.Shield;

  const color =
    t.type === "success" ? "var(--good)" : t.type === "error" ? "var(--bad)" : t.type === "warn" ? "var(--warn)" : "var(--accent)";

  return (
    <div style={base}>
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: 12,
          display: "grid",
          placeItems: "center",
          background: isLight ? "rgba(10,20,40,0.06)" : "rgba(255,255,255,0.06)",
          border: "1px solid var(--stroke)"
        }}
      >
        <Icon size={18} color={color} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 2 }}>{t.title}</div>
        <div style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.35 }}>{t.message}</div>
      </div>

      <style>{`
        @keyframes toastIn {
          from { transform: translateY(-6px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
