// src/pages/AdminAccountSettings.jsx
import React, { useEffect, useState } from "react";
import { api } from "../lib/api.js";
import { useToast } from "../ui/Toast.jsx";
import { GlassCard } from "../components/Cards.jsx";
import { FiUser, FiLock, FiSave, FiRefreshCw } from "react-icons/fi";

const inputStyle = {
  borderRadius: 14,
  border: "1px solid var(--stroke)",
  background: "rgba(0,0,0,0.12)",
  color: "var(--text)",
  padding: "12px 14px",
  outline: "none",
  width: "100%"
};

const btnStyle = {
  borderRadius: 14,
  border: "1px solid var(--stroke)",
  background: "rgba(255,255,255,0.08)",
  color: "var(--text)",
  padding: "12px 14px",
  fontWeight: 900,
  cursor: "pointer"
};

const ghostBtnStyle = { ...btnStyle, background: "transparent" };

export default function AdminAccountSettings() {
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPw, setSavingPw] = useState(false);

  const [me, setMe] = useState(null);

  const [form, setForm] = useState({ username: "", email: "" });
  const [pw, setPw] = useState({ currentPassword: "", newPassword: "", confirm: "" });

  async function loadProfile() {
    setLoading(true);
    try {
      const u = await api.getMyProfile();
      setMe(u);
      setForm({ username: u?.username || "", email: u?.email || "" });
    } catch (e) {
      toast.error(e?.message || "Gagal load profile");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSaveProfile() {
    const username = form.username.trim();
    const email = form.email.trim();
    if (!username || !email) return toast.warn("Username & email wajib diisi.");

    setSavingProfile(true);
    try {
      const res = await api.updateMyProfile({ username, email });
      toast.success(res?.message || "Profile updated");
      await loadProfile();
    } catch (e) {
      toast.error(e?.message || "Gagal update profile");
    } finally {
      setSavingProfile(false);
    }
  }

  async function onChangePassword() {
    if (!pw.currentPassword || !pw.newPassword) return toast.warn("Isi current & new password.");
    if (pw.newPassword.length < 8) return toast.warn("Password baru minimal 8 karakter.");
    if (pw.newPassword !== pw.confirm) return toast.warn("Konfirmasi password tidak sama.");

    setSavingPw(true);
    try {
      const res = await api.changeMyPassword(pw.currentPassword, pw.newPassword);
      toast.success(res?.message || "Password updated");
      setPw({ currentPassword: "", newPassword: "", confirm: "" });
    } catch (e) {
      toast.error(e?.message || "Gagal ganti password");
    } finally {
      setSavingPw(false);
    }
  }

  return (
    <div style={{ padding: 18 }}>
      <div style={{ maxWidth: 980, margin: "0 auto", display: "grid", gap: 12 }}>
        {/* Header */}
        <div
          className="aetrap-header"
          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}
        >
          <div>
            <div style={{ fontWeight: 950, letterSpacing: -0.2, fontSize: 18 }}>Account Settings</div>
            <div style={{ color: "var(--muted2)", fontSize: 12 }}>
              Ubah username/email dan password akun yang sedang login.
            </div>
          </div>

          <button
            className="aetrap-refresh"
            onClick={loadProfile}
            disabled={loading}
            style={{
              ...ghostBtnStyle,
              display: "inline-flex",
              gap: 10,
              alignItems: "center",
              opacity: loading ? 0.7 : 1
            }}
          >
            <FiRefreshCw /> Refresh
          </button>
        </div>

        {/* Grid 12 col desktop, 1 col mobile */}
        <div
          className="aetrap-grid"
          style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(12, minmax(0, 1fr))" }}
        >
          {/* Profile */}
          <GlassCard className="aetrap-profile" style={{ gridColumn: "span 7", padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <FiUser />
              <div style={{ fontWeight: 950 }}>Profile</div>
            </div>

            {loading ? (
              <div style={{ color: "var(--muted2)" }}>Loading...</div>
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ color: "var(--muted2)", fontWeight: 900, fontSize: 12 }}>Username</span>
                  <input
                    value={form.username}
                    onChange={(e) => setForm((s) => ({ ...s, username: e.target.value }))}
                    style={inputStyle}
                    placeholder="Username"
                    autoComplete="username"
                  />
                </label>

                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ color: "var(--muted2)", fontWeight: 900, fontSize: 12 }}>Email</span>
                  <input
                    value={form.email}
                    onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
                    style={inputStyle}
                    placeholder="Email"
                    autoComplete="email"
                    inputMode="email"
                  />
                </label>

                <div className="aetrap-actions" style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button
                    onClick={onSaveProfile}
                    disabled={savingProfile}
                    style={{
                      ...btnStyle,
                      display: "inline-flex",
                      gap: 10,
                      alignItems: "center",
                      opacity: savingProfile ? 0.7 : 1
                    }}
                  >
                    <FiSave /> {savingProfile ? "Saving..." : "Save Profile"}
                  </button>
                </div>

                <div style={{ color: "var(--muted2)", fontSize: 12 }}>
                  Role: <b style={{ color: "var(--text)" }}>{me?.role || "-"}</b>
                </div>
              </div>
            )}
          </GlassCard>

          {/* Password */}
          <GlassCard className="aetrap-password" style={{ gridColumn: "span 5", padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <FiLock />
              <div style={{ fontWeight: 950 }}>Change Password</div>
            </div>

            <div style={{ display: "grid", gap: 12 }}>
              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ color: "var(--muted2)", fontWeight: 900, fontSize: 12 }}>Current Password</span>
                <input
                  value={pw.currentPassword}
                  onChange={(e) => setPw((s) => ({ ...s, currentPassword: e.target.value }))}
                  style={inputStyle}
                  type="password"
                  placeholder="Current password"
                  autoComplete="current-password"
                />
              </label>

              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ color: "var(--muted2)", fontWeight: 900, fontSize: 12 }}>New Password</span>
                <input
                  value={pw.newPassword}
                  onChange={(e) => setPw((s) => ({ ...s, newPassword: e.target.value }))}
                  style={inputStyle}
                  type="password"
                  placeholder="New password (min 8)"
                  autoComplete="new-password"
                />
              </label>

              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ color: "var(--muted2)", fontWeight: 900, fontSize: 12 }}>
                  Confirm New Password
                </span>
                <input
                  value={pw.confirm}
                  onChange={(e) => setPw((s) => ({ ...s, confirm: e.target.value }))}
                  style={inputStyle}
                  type="password"
                  placeholder="Confirm new password"
                  autoComplete="new-password"
                />
              </label>

              <button onClick={onChangePassword} disabled={savingPw} style={{ ...btnStyle, opacity: savingPw ? 0.7 : 1 }}>
                {savingPw ? "Saving..." : "Update Password"}
              </button>

              <div style={{ color: "var(--muted2)", fontSize: 12, lineHeight: 1.35 }}>
                Catatan: backend kamu cek minimal 8 karakter (dan harus isi current password benar).
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Responsive rules */}
        <style>{`
          /* Tablet & mobile: stack cards */
          @media (max-width: 980px){
            .aetrap-grid{
              grid-template-columns: 1fr !important;
            }
            .aetrap-profile,
            .aetrap-password{
              grid-column: 1 / -1 !important;
            }
          }

          /* Small mobile: header & buttons full width */
          @media (max-width: 480px){
            .aetrap-header{
              flex-direction: column;
              align-items: stretch;
            }
            .aetrap-refresh{
              width: 100%;
              justify-content: center;
            }
            .aetrap-actions{
              justify-content: stretch !important;
            }
            .aetrap-actions > button{
              width: 100%;
              justify-content: center;
            }
          }
        `}</style>
      </div>
    </div>
  );
}
