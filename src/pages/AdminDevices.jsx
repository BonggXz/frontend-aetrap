// src/pages/AdminDevices.jsx
import React, { useEffect, useMemo, useState } from "react";
import { GlassCard, SectionTitle, MiniCard, Badge, IconButton } from "../components/Cards.jsx";
import { api } from "../lib/api.js";
import { useToast } from "../ui/Toast.jsx";
import { formatDateTime } from "../lib/utils.js";
import { getTheme as getThemePref } from "../lib/storage.js";
import {
  FiRefreshCw,
  FiEye,
  FiSettings,
  FiSave,
  FiX,
  FiMapPin,
  FiChevronDown,
  FiChevronUp
} from "react-icons/fi";
import { useNavigate } from "react-router-dom";

function parseNum(v) {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function mapEmbedUrl(lat, lng, z = 17) {
  const q = encodeURIComponent(`${lat},${lng}`);
  return `https://www.google.com/maps?q=${q}&z=${z}&output=embed`;
}
function mapOpenUrl(lat, lng, z = 17) {
  const q = encodeURIComponent(`${lat},${lng}`);
  return `https://www.google.com/maps?q=${q}&z=${z}`;
}

/** theme SELF-CONTAINED (no CSS vars) */
function getModalTheme(isDark) {
  if (isDark) {
    return {
      isDark: true,
      text: "#E7EEF9",
      muted: "rgba(231,238,249,0.70)",
      muted2: "rgba(231,238,249,0.55)",

      overlay: "rgba(0,0,0,0.62)",
      panel: "#0B1220",     // solid
      panel2: "#0F1930",    // solid (for map box)

      border: "rgba(255,255,255,0.10)",
      border2: "rgba(255,255,255,0.14)",
      shadow: "0 26px 80px rgba(0,0,0,0.55)",

      inputBg: "#0F1930",
      inputBorder: "rgba(255,255,255,0.12)",
      inputFocus: "rgba(99,102,241,0.55)",

      btnBg: "rgba(255,255,255,0.07)",
      btnBgHover: "rgba(255,255,255,0.11)"
    };
  }

  return {
    isDark: false,
    text: "#0F172A",
    muted: "rgba(15,23,42,0.68)",
    muted2: "rgba(15,23,42,0.52)",

    overlay: "rgba(2,6,23,0.35)",
    panel: "#FFFFFF",     // solid
    panel2: "#F7FAFF",    // solid

    border: "rgba(2,6,23,0.10)",
    border2: "rgba(2,6,23,0.14)",
    shadow: "0 20px 60px rgba(2,6,23,0.18)",

    inputBg: "#F8FAFC",
    inputBorder: "rgba(2,6,23,0.14)",
    inputFocus: "rgba(37,99,235,0.45)",

    btnBg: "rgba(2,6,23,0.05)",
    btnBgHover: "rgba(2,6,23,0.09)"
  };
}

/** IMPORTANT: your app uses data-theme="dark|light" (not class .dark) */
function readIsDarkFromAppTheme() {
  try {
    // storage.js default = "dark"
    const t = getThemePref?.() || "dark";
    return String(t).toLowerCase() === "dark";
  } catch {
    const attr = document.documentElement.getAttribute("data-theme") || "dark";
    return String(attr).toLowerCase() === "dark";
  }
}

export default function AdminDevices() {
  const toast = useToast();
  const nav = useNavigate();

  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(false);

  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState(null);
  const [mapOpen, setMapOpen] = useState(true);

  // ✅ FIX: detect from data-theme / storage (NOT html.dark class)
  const [isDark, setIsDark] = useState(() => readIsDarkFromAppTheme());
  const theme = useMemo(() => getModalTheme(isDark), [isDark]);

  useEffect(() => {
    // 1) listen your custom event from storage.js
    const onTheme = (e) => {
      const t = e?.detail || document.documentElement.getAttribute("data-theme") || "dark";
      setIsDark(String(t).toLowerCase() === "dark");
    };
    window.addEventListener("aetrap-theme", onTheme);

    // 2) observe data-theme attr changes (just in case)
    const el = document.documentElement;
    const obs = new MutationObserver(() => {
      const t = el.getAttribute("data-theme") || "dark";
      setIsDark(String(t).toLowerCase() === "dark");
    });
    obs.observe(el, { attributes: true, attributeFilter: ["data-theme"] });

    // 3) initial sync
    setIsDark(readIsDarkFromAppTheme());

    return () => {
      window.removeEventListener("aetrap-theme", onTheme);
      obs.disconnect();
    };
  }, []);

  async function load() {
    setLoading(true);
    try {
      const d = await (api.getDevicesMerged ? api.getDevicesMerged() : api.getDevices());
      setDevices(Array.isArray(d) ? d : []);
    } catch (e) {
      toast.error(e?.message || "Gagal load devices.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openSettings(dev) {
    const minutes = dev.settings?.captureInterval ?? 30;
    setEditing(dev);
    setDraft({
      name: dev.name || dev.device_id,
      location: dev.location || "",
      captureInterval: minutes,
      captureUnit: "min",
      lat: dev.lat ?? "",
      lng: dev.lng ?? ""
    });
    setMapOpen(true);
  }

  function getLocation() {
    if (!navigator.geolocation) return toast.error("Browser tidak mendukung Geolocation.");
    toast.info("Mengambil lokasi... (aktifkan izin lokasi)");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setDraft((p) => ({ ...p, lat: String(lat), lng: String(lng) }));
        toast.success("Lokasi berhasil diambil.");
      },
      (err) => toast.error(err?.message || "Gagal mengambil lokasi."),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }

  async function saveSettings() {
    if (!editing || !draft) return;

    try {
      const interval = Math.max(1, Number(draft.captureInterval || 1));
      const unit = draft.captureUnit === "hour" ? "hour" : "min";
      const intervalMinutes = unit === "hour" ? interval * 60 : interval;

      const lat = parseNum(draft.lat);
      const lng = parseNum(draft.lng);

      const res = await api.updateDevice(editing.device_id, {
        name: draft.name?.trim() || editing.device_id,
        location: draft.location?.trim() || "",
        lat: lat === null ? null : lat,
        lng: lng === null ? null : lng,
        settings: { ...(editing.settings || {}), captureInterval: intervalMinutes }
      });

      toast.success("Device settings tersimpan.");

      const saved = res?.device || {};
      setDevices((prev) =>
        prev.map((x) =>
          x.device_id === editing.device_id ? { ...x, ...saved, lat: saved.lat ?? lat, lng: saved.lng ?? lng } : x
        )
      );

      await load();
      setEditing(null);
      setDraft(null);
    } catch (e) {
      toast.error(e?.message || "Gagal simpan device.");
    }
  }

  const mapOk = useMemo(() => {
    if (!draft) return false;
    const lat = parseNum(draft.lat);
    const lng = parseNum(draft.lng);
    return lat !== null && lng !== null;
  }, [draft]);

  return (
    <div>
      <GlassCard>
        <SectionTitle
          kicker="Admin"
          title="Devices"
          right={
            <IconButton icon={FiRefreshCw} variant="ghost" onClick={load} disabled={loading} title="Refresh">
              {loading ? "Loading" : "Refresh"}
            </IconButton>
          }
        />

        <div style={{ display: "grid", gap: 12 }}>
          {devices.map((d) => {
            const interval = d.settings?.captureInterval ?? 30;
            return (
              <MiniCard key={d.device_id}>
                <div className="admdev-head">
                  <div className="admdev-left">
                    <div className="admdev-title">{d.name || d.device_id}</div>

                    <div className="admdev-meta">
                      <span>Last seen: {formatDateTime(d.lastSeen)}</span>
                      <span className="dot">•</span>
                      <span>Location: {d.location || "Unknown"}</span>
                      <span className="dot">•</span>
                      <span>ID: {d.device_id}</span>
                    </div>

                    <div className="admdev-coord">
                      <span className="k">Koordinat:</span>{" "}
                      {d.lat != null && d.lng != null ? (
                        <a
                          href={mapOpenUrl(d.lat, d.lng, 18)}
                          target="_blank"
                          rel="noreferrer"
                          style={{ color: "inherit", textDecoration: "none", fontWeight: 900 }}
                          title="Buka di Google Maps"
                        >
                          {Number(d.lat).toFixed(6)}, {Number(d.lng).toFixed(6)}
                        </a>
                      ) : (
                        <span style={{ opacity: 0.72 }}>Belum di-set</span>
                      )}
                    </div>
                  </div>

                  <div className="admdev-right">
                    <Badge tone={d.active ? "good" : "warn"}>{d.active ? "Aktif" : "Tidak aktif"}</Badge>

                    <div className="admdev-actions">
                      <IconButton icon={FiEye} variant="ghost" onClick={() => nav(`/admin/overview/${d.device_id}`)}>
                        Overview
                      </IconButton>

                      <IconButton icon={FiSettings} variant="ghost" onClick={() => openSettings(d)}>
                        Settings
                      </IconButton>
                    </div>
                  </div>
                </div>

                <div className="admdev-foot">
                  <div className="admdev-interval">
                    <span className="k">Capture Interval:</span>
                    <b>{interval} min</b>
                  </div>
                  <div className="admdev-foot-hint">Ubah interval/lokasi/koordinat lewat tombol “Settings”.</div>
                </div>
              </MiniCard>
            );
          })}

          {devices.length === 0 && <div style={{ opacity: 0.75 }}>Tidak ada device.</div>}
        </div>

        <style>{`
          .admdev-head{ display:flex; justify-content:space-between; gap:12px; align-items:flex-start; }
          .admdev-title{ font-weight: 950; font-size: 16px; }
          .admdev-meta{
            opacity: .72;
            font-size: 12px;
            margin-top: 6px;
            line-height: 1.35;
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
          }
          .admdev-meta .dot{ opacity: .65; }
          .admdev-coord{ margin-top: 8px; font-size: 12px; }
          .admdev-coord .k{ opacity: .78; font-weight: 900; }

          .admdev-right{ display:flex; gap:10px; align-items:center; flex-wrap: wrap; justify-content:flex-end; }
          .admdev-actions{ display:flex; gap:10px; align-items:center; flex-wrap: wrap; }

          .admdev-foot{ display:flex; flex-direction:column; gap:6px; margin-top:12px; }
          .admdev-interval{ display:flex; gap:8px; align-items:baseline; }
          .admdev-interval .k{ opacity: .72; font-weight: 900; font-size: 13px; }
          .admdev-foot-hint{ opacity: .72; font-size: 12px; }

          @media (max-width: 720px){
            .admdev-head{ flex-direction: column; align-items: stretch; }
            .admdev-right{ justify-content:flex-start; }
            .admdev-actions > *{ flex: 1 1 140px; }
          }
        `}</style>
      </GlassCard>

      {editing && draft ? (
        <ModalSelf
          theme={theme}
          title={`Device Settings • ${editing.device_id}`}
          onClose={() => (setEditing(null), setDraft(null))}
          footer={
            <>
              <IconButton icon={FiX} variant="ghost" onClick={() => (setEditing(null), setDraft(null))}>
                Batal
              </IconButton>
              <IconButton icon={FiSave} onClick={saveSettings}>
                Simpan
              </IconButton>
            </>
          }
        >
          <div style={{ display: "grid", gap: 12 }}>
            <FieldSelf theme={theme} label="Nama device">
              <input value={draft.name} onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))} style={inputStyle(theme)} />
            </FieldSelf>

            <FieldSelf theme={theme} label="Lokasi (nama tempat)">
              <input value={draft.location} onChange={(e) => setDraft((p) => ({ ...p, location: e.target.value }))} style={inputStyle(theme)} />
            </FieldSelf>

            <FieldSelf theme={theme} label="Interval">
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <input
                  type="number"
                  min={1}
                  value={draft.captureInterval}
                  onChange={(e) => setDraft((p) => ({ ...p, captureInterval: e.target.value }))}
                  style={{ ...inputStyle(theme), width: "min(220px, 100%)" }}
                />
                <select value={draft.captureUnit} onChange={(e) => setDraft((p) => ({ ...p, captureUnit: e.target.value }))} style={selectStyle(theme)}>
                  <option value="min">Minutes</option>
                  <option value="hour">Hours</option>
                </select>
              </div>
            </FieldSelf>

            <FieldSelf theme={theme} label="Koordinat (lat, lng)">
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <input value={draft.lat} onChange={(e) => setDraft((p) => ({ ...p, lat: e.target.value }))} placeholder="Latitude" style={{ ...inputStyle(theme), flex: "1 1 220px" }} />
                <input value={draft.lng} onChange={(e) => setDraft((p) => ({ ...p, lng: e.target.value }))} placeholder="Longitude" style={{ ...inputStyle(theme), flex: "1 1 220px" }} />
                <IconButton icon={FiMapPin} variant="ghost" onClick={getLocation} title="Ambil lokasi saat ini">
                  Get Location
                </IconButton>
              </div>

              <div style={{ color: theme.muted, fontSize: 12, lineHeight: 1.35 }}>
                Isi manual atau klik <b>Get Location</b>. Koordinat disimpan ke <b>Device.lat/lng</b>.
              </div>
            </FieldSelf>

            <div style={{ display: "grid", gap: 8, marginTop: 2 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                <button type="button" onClick={() => setMapOpen((v) => !v)} style={toggleBtn(theme)}>
                  {mapOpen ? <FiChevronUp /> : <FiChevronDown />}
                  Preview di Map
                </button>

                {mapOk ? (
                  <a href={mapOpenUrl(parseNum(draft.lat), parseNum(draft.lng), 18)} target="_blank" rel="noreferrer" style={linkBtn(theme)}>
                    Buka Google Maps
                  </a>
                ) : (
                  <span style={{ color: theme.muted2, fontSize: 12 }}>Isi lat/lng dulu</span>
                )}
              </div>

              {mapOpen && (
                <>
                  <div style={mapBox(theme)}>
                    {mapOk ? (
                      <iframe
                        title="Map Preview"
                        src={mapEmbedUrl(parseNum(draft.lat), parseNum(draft.lng), 18)}
                        style={{ width: "100%", height: "100%", border: 0 }}
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                      />
                    ) : (
                      <div style={{ height: "100%", display: "grid", placeItems: "center", color: theme.muted, padding: 14, textAlign: "center" }}>
                        Masukkan koordinat atau klik “Get Location”.
                      </div>
                    )}
                  </div>

                  <div style={{ color: theme.muted, fontSize: 12, lineHeight: 1.35 }}>
                    Kalau posisi belum pas: edit lat/lng manual, preview akan update otomatis.
                  </div>
                </>
              )}
            </div>
          </div>
        </ModalSelf>
      ) : null}
    </div>
  );
}

/* ===== self-contained UI bits ===== */

function FieldSelf({ theme, label, children }) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span style={{ color: theme.muted, fontWeight: 900, fontSize: 12 }}>{label}</span>
      {children}
    </label>
  );
}

function ModalSelf({ theme, title, onClose, children, footer }) {
  return (
    <div
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        background: theme.overlay,
        display: "grid",
        justifyItems: "center",
        alignItems: "start",
        padding: 14,
        zIndex: 9999,
        overflow: "auto"
      }}
    >
      <div
        style={{
          width: "min(860px, 96vw)",
          maxHeight: "92vh",
          borderRadius: 18,
          border: `1px solid ${theme.border}`,
          background: theme.panel, // ✅ solid, no transparency
          color: theme.text,
          boxShadow: theme.shadow,
          overflow: "hidden",
          marginTop: 10
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: 14,
            borderBottom: `1px solid ${theme.border}`,
            background: theme.panel
          }}
        >
          <div style={{ fontWeight: 950 }}>{title}</div>

          <button
            onClick={onClose}
            type="button"
            style={{
              width: 40,
              height: 40,
              borderRadius: 14,
              border: `1px solid ${theme.border}`,
              background: theme.btnBg,
              color: theme.text,
              cursor: "pointer",
              fontWeight: 900
            }}
            title="Close"
          >
            ✕
          </button>
        </div>

        <div style={{ padding: 14, overflow: "auto", maxHeight: "calc(92vh - 64px - 72px)" }}>
          {children}
        </div>

        <div
          style={{
            display: "flex",
            gap: 10,
            justifyContent: "flex-end",
            flexWrap: "wrap",
            padding: 14,
            borderTop: `1px solid ${theme.border}`,
            background: theme.panel,
            position: "sticky",
            bottom: 0
          }}
        >
          {footer}
        </div>
      </div>
    </div>
  );
}

function inputStyle(t) {
  return {
    borderRadius: 14,
    border: `1px solid ${t.inputBorder}`,
    background: t.inputBg,
    color: t.text,
    padding: "12px 14px",
    outline: "none",
    width: "100%",
    boxShadow: "none"
  };
}

function selectStyle(t) {
  return {
    borderRadius: 14,
    border: `1px solid ${t.inputBorder}`,
    background: t.inputBg,
    color: t.text,
    padding: "12px 14px",
    outline: "none",
    width: "min(220px, 100%)"
  };
}

function toggleBtn(t) {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    border: `1px solid ${t.border2}`,
    padding: "8px 10px",
    background: t.btnBg,
    color: t.text,
    cursor: "pointer",
    fontWeight: 900,
    fontSize: 12
  };
}

function linkBtn(t) {
  return {
    borderRadius: 12,
    border: `1px solid ${t.border2}`,
    padding: "8px 10px",
    color: t.text,
    textDecoration: "none",
    fontWeight: 900,
    fontSize: 12,
    background: t.btnBg
  };
}

function mapBox(t) {
  return {
    borderRadius: 16,
    border: `1px solid ${t.border}`,
    overflow: "hidden",
    background: t.panel2,
    height: "clamp(180px, 32vh, 280px)"
  };
}
