import React, { useEffect, useState } from "react";
import { GlassCard, SectionTitle, MiniCard, ShimmerButton } from "../components/Cards.jsx";
import { useToast } from "../ui/Toast.jsx";
import { api } from "../lib/api.js";

export default function AdminSettings() {
  const toast = useToast();
  const [s, setS] = useState(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const data = await api.getSystemSettings();
      setS(data);
    } catch (e) {
      toast.error(e.message || "Gagal load settings.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function save() {
    try {
      await api.updateSystemSettings(s);
      toast.success("Settings tersimpan.");
    } catch (e) {
      toast.error(e.message || "Gagal simpan settings.");
    }
  }

  if (!s) return <div style={{ color: "var(--muted)" }}>Loading...</div>;

  return (
    <div>
      <GlassCard>
        <SectionTitle
          kicker="Admin"
          title="System Settings"
          right={
            <div style={{ display: "flex", gap: 10 }}>
              <ShimmerButton variant="ghost" onClick={load} style={{ padding: "10px 14px" }}>
                {loading ? "Loading..." : "Refresh"}
              </ShimmerButton>
              <ShimmerButton onClick={save} style={{ padding: "10px 14px" }}>
                Simpan
              </ShimmerButton>
            </div>
          }
        />

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 14 }}>
          <MiniCard>
            <div style={{ fontWeight: 950, marginBottom: 10 }}>Alert Thresholds</div>

            <div style={{ display: "grid", gap: 10 }}>
              <Row label="Suhu min" value={s.alertThresholds.temperature.min} onChange={(v) => setS((p) => ({ ...p, alertThresholds: { ...p.alertThresholds, temperature: { ...p.alertThresholds.temperature, min: Number(v) } } }))} />
              <Row label="Suhu max" value={s.alertThresholds.temperature.max} onChange={(v) => setS((p) => ({ ...p, alertThresholds: { ...p.alertThresholds, temperature: { ...p.alertThresholds.temperature, max: Number(v) } } }))} />
              <Row label="Humidity min" value={s.alertThresholds.humidity.min} onChange={(v) => setS((p) => ({ ...p, alertThresholds: { ...p.alertThresholds, humidity: { ...p.alertThresholds.humidity, min: Number(v) } } }))} />
              <Row label="Humidity max" value={s.alertThresholds.humidity.max} onChange={(v) => setS((p) => ({ ...p, alertThresholds: { ...p.alertThresholds, humidity: { ...p.alertThresholds.humidity, max: Number(v) } } }))} />
            </div>
          </MiniCard>

          <MiniCard>
            <div style={{ fontWeight: 950, marginBottom: 10 }}>Storage & Mode</div>

            <Row
              label="Retention (hari)"
              value={s.storageRetentionDays}
              onChange={(v) => setS((p) => ({ ...p, storageRetentionDays: Number(v) }))}
            />

            <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 10 }}>
              <input
                type="checkbox"
                checked={!!s.notificationsEnabled}
                onChange={(e) => setS((p) => ({ ...p, notificationsEnabled: e.target.checked }))}
              />
              <div style={{ fontWeight: 900 }}>Notifications Enabled</div>
            </div>

            <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 10 }}>
              <input
                type="checkbox"
                checked={!!s.maintenanceMode}
                onChange={(e) => setS((p) => ({ ...p, maintenanceMode: e.target.checked }))}
              />
              <div style={{ fontWeight: 900 }}>Maintenance Mode</div>
            </div>

            <div style={{ marginTop: 12, color: "var(--muted2)", fontSize: 12 }}>
              Settings ini mempengaruhi threshold alert dan kebijakan retensi penyimpanan.
            </div>
          </MiniCard>
        </div>
      </GlassCard>
    </div>
  );
}

function Row({ label, value, onChange }) {
  return (
    <label style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
      <div style={{ color: "var(--muted)", fontWeight: 900 }}>{label}</div>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: 160,
          borderRadius: 14,
          border: "1px solid var(--stroke)",
          background: "rgba(0,0,0,0.12)",
          color: "var(--text)",
          padding: "10px 12px",
          outline: "none"
        }}
      />
    </label>
  );
}
