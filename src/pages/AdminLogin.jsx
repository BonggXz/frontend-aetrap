// src/pages/AdminLogin.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { setAuth } from "../lib/storage.js";
import { useToast } from "../ui/Toast.jsx";
import { GlassCard } from "../components/Cards.jsx";
import { api } from "../lib/api.js";

export default function AdminLogin() {
  const nav = useNavigate();
  const toast = useToast();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();

    const u = username.trim();
    if (!u || !password) return toast.warn("Username dan password wajib diisi.");

    setLoading(true);
    try {
      // ✅ FIX: api.login() butuh (username, password) — bukan object
      const res = await api.login(u, password);

      if (!res?.token) throw new Error("Token tidak ditemukan dari server.");

      setAuth({
        token: res.token,
        user: res.user
      });

      toast.success("Login berhasil.");
      nav("/admin/devices");
    } catch (err) {
      toast.error(err?.message || "Login gagal.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="aetrap-login-wrap">
      <GlassCard className="aetrap-login-card" style={{ width: "min(520px, 96vw)" }}>
        <div style={{ fontWeight: 950, fontSize: 26, marginBottom: 8 }}>Admin Login</div>
        <div style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.45, marginBottom: 14 }}>
          Masuk menggunakan akun yang tersimpan di database.
        </div>

        <form onSubmit={onSubmit} className="aetrap-login-form">
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ color: "var(--muted2)", fontWeight: 900, fontSize: 12 }}>Username</span>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Masukkan username"
              style={inputStyle}
              autoComplete="username"
            />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ color: "var(--muted2)", fontWeight: 900, fontSize: 12 }}>Password</span>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              placeholder="Masukkan password"
              style={inputStyle}
              autoComplete="current-password"
            />
          </label>

          <button
            disabled={loading}
            style={{
              borderRadius: 14,
              border: "1px solid var(--stroke)",
              background: "rgba(255,255,255,0.08)",
              color: "var(--text)",
              padding: "12px 16px",
              fontWeight: 900,
              cursor: "pointer",
              opacity: loading ? 0.7 : 1,
              width: "100%"
            }}
          >
            {loading ? "Loading..." : "Login"}
          </button>

          <button
            type="button"
            onClick={() => nav("/landing")}
            style={{
              borderRadius: 14,
              border: "1px solid var(--stroke)",
              background: "transparent",
              color: "var(--text)",
              padding: "12px 16px",
              fontWeight: 900,
              cursor: "pointer",
              width: "100%"
            }}
          >
            Kembali ke Landing
          </button>
        </form>

        <style>{`
          .aetrap-login-wrap{
            min-height: calc(100vh - 120px);
            display: grid;
            place-items: center;
            padding: 16px 0;
          }
          @supports (height: 100dvh){
            .aetrap-login-wrap{ min-height: calc(100dvh - 120px); }
          }
          .aetrap-login-form{ display: grid; gap: 12px; }

          @media (max-width: 520px){
            .aetrap-login-wrap{
              place-items: start;
              padding: 12px;
              min-height: auto;
            }
            .aetrap-login-card{
              width: 100% !important;
              padding: 16px !important;
            }
          }
        `}</style>
      </GlassCard>
    </div>
  );
}

const inputStyle = {
  borderRadius: 14,
  border: "1px solid var(--stroke)",
  background: "rgba(0,0,0,0.12)",
  color: "var(--text)",
  padding: "12px 14px",
  outline: "none",
  width: "100%"
};
