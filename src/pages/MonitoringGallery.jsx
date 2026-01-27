// src/pages/MonitoringGallery.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { GlassCard, SectionTitle, MiniCard, IconButton } from "../components/Cards.jsx";
import { api, API_BASE } from "../lib/api.js";
import { useToast } from "../ui/Toast.jsx";
import { getTheme as getThemePref } from "../lib/storage.js";
import {
  FiRefreshCw,
  FiSearch,
  FiTrash2,
  FiEye,
  FiDownload,
  FiX,
  FiZoomIn,
  FiZoomOut,
  FiMaximize2,
  FiRotateCcw
} from "react-icons/fi";

/* ===================== helpers ===================== */
function safeDate(ts) {
  const d = new Date(ts);
  return Number.isNaN(d.getTime()) ? null : d;
}
function fmt(ts) {
  const d = safeDate(ts);
  return d ? d.toLocaleString() : "-";
}
function absUrl(u) {
  if (!u) return "";
  if (String(u).startsWith("http")) return u;
  return `${API_BASE}${u}`;
}
function pickImageUrl(it) {
  const u =
    it?.displayUrl ||
    it?.display_url ||
    it?.url ||
    it?.imageUrl ||
    it?.src ||
    it?.thumbUrl ||
    it?.thumbnail ||
    it?.image ||
    "";
  return absUrl(u);
}
function pickAnalysis(it) {
  const pd = it?.processedData || {};
  const summary = pd?.summary || {};
  const det = Array.isArray(pd?.detections) ? pd.detections : [];

  const larva_count = it?.larva_count ?? summary?.larva_count ?? 0;
  const objects_detected = it?.objects_detected ?? summary?.objects_detected ?? det.length ?? 0;

  const avg_confidence =
    it?.avg_confidence ??
    summary?.avg_confidence ??
    (det.length
      ? Math.round(
          (det.reduce((a, x) => a + (Number(x?.confidence) || Number(x?.conf) || 0), 0) / det.length) * 100
        ) / 100
      : null);

  const processedAt = it?.processedAt ?? pd?.processedAt ?? pd?.processed_at ?? summary?.processedAt ?? null;
  const latency_ms = it?.latency_ms ?? summary?.latency_ms ?? pd?.latency_ms ?? null;

  return { larva_count, objects_detected, avg_confidence, processedAt, latency_ms };
}

async function downloadImageSmart(url, filename) {
  if (!url) return;
  try {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) throw new Error("Fetch failed");
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = filename || "image.jpg";
    document.body.appendChild(a);
    a.click();
    a.remove();

    setTimeout(() => URL.revokeObjectURL(blobUrl), 2500);
  } catch {
    // fallback open
    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noreferrer";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
}

/* ===================== THEME (SELF CONTAINED like AdminDevices) ===================== */
function getModalTheme(isDark) {
  if (isDark) {
    return {
      isDark: true,
      text: "#E7EEF9",
      muted: "rgba(231,238,249,0.70)",
      muted2: "rgba(231,238,249,0.55)",

      overlay: "rgba(0,0,0,0.62)",
      panel: "#0B1220",
      panel2: "#0F1930",

      border: "rgba(255,255,255,0.10)",
      border2: "rgba(255,255,255,0.14)",
      shadow: "0 26px 80px rgba(0,0,0,0.55)",

      inputBg: "#0F1930",
      inputBorder: "rgba(255,255,255,0.12)",

      btnBg: "rgba(255,255,255,0.07)",
      btnBgHover: "rgba(255,255,255,0.11)",

      viewerBg: "#08101E"
    };
  }

  return {
    isDark: false,
    text: "#0F172A",
    muted: "rgba(15,23,42,0.68)",
    muted2: "rgba(15,23,42,0.52)",

    overlay: "rgba(2,6,23,0.35)",
    panel: "#FFFFFF",
    panel2: "#F7FAFF",

    border: "rgba(2,6,23,0.10)",
    border2: "rgba(2,6,23,0.14)",
    shadow: "0 20px 60px rgba(2,6,23,0.18)",

    inputBg: "#F8FAFC",
    inputBorder: "rgba(2,6,23,0.14)",

    btnBg: "rgba(2,6,23,0.05)",
    btnBgHover: "rgba(2,6,23,0.09)",

    viewerBg: "#0B1220"
  };
}

function readIsDarkFromAppTheme() {
  try {
    const t = getThemePref?.() || "dark";
    return String(t).toLowerCase() === "dark";
  } catch {
    const attr = document.documentElement.getAttribute("data-theme") || "dark";
    return String(attr).toLowerCase() === "dark";
  }
}

/* ===================== main page ===================== */
export default function MonitoringGallery() {
  const toast = useToast();

  const [items, setItems] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(null);

  // ✅ modal theme like AdminDevices
  const [isDark, setIsDark] = useState(() => readIsDarkFromAppTheme());
  const theme = useMemo(() => getModalTheme(isDark), [isDark]);

  useEffect(() => {
    const onTheme = (e) => {
      const t = e?.detail || document.documentElement.getAttribute("data-theme") || "dark";
      setIsDark(String(t).toLowerCase() === "dark");
    };
    window.addEventListener("aetrap-theme", onTheme);

    const el = document.documentElement;
    const obs = new MutationObserver(() => {
      const t = el.getAttribute("data-theme") || "dark";
      setIsDark(String(t).toLowerCase() === "dark");
    });
    obs.observe(el, { attributes: true, attributeFilter: ["data-theme"] });

    setIsDark(readIsDarkFromAppTheme());

    return () => {
      window.removeEventListener("aetrap-theme", onTheme);
      obs.disconnect();
    };
  }, []);

  async function load() {
    setLoading(true);
    try {
      const merged = await api.getGalleryMerged({ limit: 60, page: 1, deviceId: "" });
      setItems(Array.isArray(merged) ? merged : []);
    } catch (e) {
      toast.error(e?.message || "Gagal load gallery.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = (query || "").trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) => String(it.deviceId || it.device_id || "").toLowerCase().includes(q));
  }, [items, query]);

  async function onDelete(it) {
    if (it?.__type === "citizen") return toast.error("Delete citizen report belum ada endpoint.");
    if (!confirm("Hapus image ini?")) return;

    try {
      await api.deleteImage(it._id);
      toast.success("Image terhapus.");
      setItems((prev) => prev.filter((x) => x._id !== it._id));
      if (open?._id === it._id) setOpen(null);
    } catch (e) {
      toast.error(e?.message || "Gagal hapus image.");
    }
  }

  return (
    <div>
      <GlassCard>
        <SectionTitle
          kicker="Admin"
          title="Gallery"
          right={
            <div className="gal-topbar">
              <div className="gal-search">
                <FiSearch />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Filter device_id (AE-01 / CITIZEN)"
                  className="gal-search-input"
                />
              </div>

              <IconButton icon={FiRefreshCw} variant="ghost" onClick={load} disabled={loading}>
                {loading ? "Loading" : "Refresh"}
              </IconButton>
            </div>
          }
        />

        <MiniCard>
          <div className="gal-grid">
            {filtered.map((it) => {
              const src = pickImageUrl(it);
              const device = it.deviceId || it.device_id || "-";
              const isCitizen = it.__type === "citizen";

              return (
                <div
                  key={it._id}
                  className="gal-item"
                  role="button"
                  tabIndex={0}
                  onClick={() => setOpen(it)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") setOpen(it);
                  }}
                  style={{
                    borderRadius: 18,
                    border: "1px solid var(--stroke)",
                    overflow: "hidden",
                    background: "rgba(255,255,255,0.02)"
                  }}
                >
                  <div className="gal-thumb">
                    <img
                      src={src}
                      alt=""
                      loading="lazy"
                      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                    />

                    {/* Label kecil (desktop/tablet). Di mobile akan disembunyikan via CSS biar "gambar doang" */}
                    <div className="gal-badge">
                      {device} {isCitizen ? "(Citizen)" : ""}
                    </div>
                  </div>

                  {/* Desktop/tablet: info + buttons */}
                  <div className="gal-meta">
                    <div style={{ fontWeight: 950 }}>
                      {device} {isCitizen ? "(Citizen)" : ""}
                    </div>
                    <div style={{ opacity: 0.72, fontSize: 12, marginTop: 6 }}>
                      {fmt(it.capturedAt || it.createdAt || it.timestamp)}
                    </div>

                    <div className="gal-actions">
                      <IconButton
                        icon={FiEye}
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpen(it);
                        }}
                      >
                        Lihat
                      </IconButton>

                      <IconButton
                        icon={FiDownload}
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadImageSmart(src, `AE-TRAP_${device}_${it._id}.jpg`);
                        }}
                      >
                        Download
                      </IconButton>

                      <IconButton
                        icon={FiTrash2}
                        size="sm"
                        disabled={isCitizen}
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(it);
                        }}
                      >
                        Hapus
                      </IconButton>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {filtered.length === 0 && (
            <div style={{ opacity: 0.75, padding: 14 }}>Belum ada data (atau filter tidak cocok).</div>
          )}
        </MiniCard>
      </GlassCard>

      {open ? (
        <ModalSelf
          theme={theme}
          title={`Gallery Detail • ${open.deviceId || open.device_id || "-"}`}
          onClose={() => setOpen(null)}
          footer={
            <>
              <button type="button" onClick={() => setOpen(null)} style={btnGhost(theme)}>
                <FiX /> Tutup
              </button>

              <button
                type="button"
                onClick={() =>
                  downloadImageSmart(
                    pickImageUrl(open),
                    `AE-TRAP_${open.deviceId || open.device_id || "DEVICE"}_${open._id}.jpg`
                  )
                }
                style={btnGhost(theme)}
              >
                <FiDownload /> Download
              </button>

              <button
                type="button"
                onClick={() => onDelete(open)}
                disabled={open.__type === "citizen"}
                style={btnDanger(theme, open.__type === "citizen")}
              >
                <FiTrash2 /> Delete
              </button>
            </>
          }
        >
          <GalleryModalBody theme={theme} item={open} />
        </ModalSelf>
      ) : null}

      {/* ✅ responsive CSS (benar2 kepake karena ada className) */}
      <style>{`
        .gal-topbar{
          display:flex;
          gap:10px;
          align-items:center;
          flex-wrap:wrap;
          justify-content:flex-end;
        }
        .gal-search{
          display:flex;
          gap:8px;
          align-items:center;
          border:1px solid var(--stroke);
          border-radius:12px;
          padding:0 10px;
          height:34px;
          background:rgba(255,255,255,0.03);
          min-width:260px;
        }
        .gal-search-input{
          border:none;
          outline:none;
          background:transparent;
          color:var(--text);
          width:100%;
          font-size:12px;
        }

        .gal-grid{
          display:grid;
          grid-template-columns:repeat(3, minmax(0, 1fr));
          gap:12px;
        }
        .gal-thumb{
          aspect-ratio:16/10;
          border-bottom:1px solid var(--stroke);
          background:rgba(0,0,0,0.12);
          position:relative;
        }
        .gal-badge{
          position:absolute;
          left:10px;
          bottom:10px;
          font-size:12px;
          font-weight:900;
          padding:6px 8px;
          border-radius:12px;
          border:1px solid var(--stroke);
          background:rgba(0,0,0,0.35);
          color:var(--text);
          backdrop-filter: blur(8px);
        }
        .gal-meta{
          padding:12px;
        }
        .gal-actions{
          display:flex;
          gap:10px;
          flex-wrap:wrap;
          margin-top:12px;
        }
        .gal-item{
          cursor:pointer;
        }

        /* Tablet: 2 kolom biar lega */
        @media (max-width: 980px){
          .gal-grid{ grid-template-columns:repeat(2, minmax(0,1fr)); }
          .gal-search{ min-width:220px; }
        }

        /* Mobile: 3 kolom, TILE = GAMBAR DOANG */
        @media (max-width: 560px){
          .gal-grid{
            grid-template-columns:repeat(3, minmax(0,1fr));
            gap:8px;
          }
          .gal-meta{ display:none; }     /* ✅ info & tombol hilang */
          .gal-badge{ display:none; }    /* ✅ label juga hilang: bener2 gambar doang */
          .gal-thumb{
            aspect-ratio: 1 / 1;         /* ✅ jadi kotak biar rapi 3 kolom */
            border-bottom:none;
          }

          .gal-topbar{
            justify-content:stretch;
          }
          .gal-search{
            flex:1 1 auto;
            min-width:0;
          }
        }
      `}</style>
    </div>
  );
}

/* ===================== modal body (viewer + analysis) ===================== */
function GalleryModalBody({ theme, item }) {
  const src = pickImageUrl(item);
  const a = pickAnalysis(item);

  return (
    <div
      className="gal-modal-grid"
      style={{
        display: "grid",
        gridTemplateColumns: "1.2fr 0.8fr",
        gap: 12,
        alignItems: "start"
      }}
    >
      {/* viewer LEFT: zoom + pan */}
      <div
        style={{
          borderRadius: 16,
          border: `1px solid ${theme.border}`,
          overflow: "hidden",
          background: theme.viewerBg,
          minHeight: 420,
          display: "flex",
          flexDirection: "column"
        }}
      >
        <ZoomPanImage theme={theme} src={src} />

        {/* meta bawah */}
        <div style={{ borderTop: `1px solid ${theme.border}`, padding: 12, background: theme.panel2 }}>
          <MetaRow theme={theme} k="Captured" v={fmt(item.capturedAt || item.createdAt || item.timestamp)} />
          <MetaRow theme={theme} k="Source" v={item.__type === "citizen" ? "Citizen Report" : "Device Image"} />
          <MetaRow theme={theme} k="Processed" v={item.processed ? "Yes" : "No"} />
        </div>
      </div>

      {/* right panel */}
      <div
        style={{
          borderRadius: 16,
          border: `1px solid ${theme.border}`,
          padding: 12,
          background: theme.panel2
        }}
      >
        <div style={{ fontWeight: 950, marginBottom: 10, color: theme.text }}>Analysis Results</div>

        <KV theme={theme} k="device" v={item.deviceId || item.device_id || "-"} />
        <KV theme={theme} k="processedAt" v={fmt(a.processedAt)} />
        <KV theme={theme} k="larva_count" v={a.larva_count ?? "-"} />
        <KV theme={theme} k="objects_detected" v={a.objects_detected ?? "-"} />
        <KV theme={theme} k="avg_confidence" v={a.avg_confidence ?? "-"} />
        <KV theme={theme} k="latency_ms" v={a.latency_ms ?? "-"} />

        <div style={{ marginTop: 10, color: theme.muted, fontSize: 12, lineHeight: 1.35 }}>
          Tips: Scroll untuk zoom, drag untuk geser gambar.
        </div>
      </div>

      <style>{`
        @media (max-width: 980px){
          .gal-modal-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

/* ===================== Zoom/Pan viewer ===================== */
function ZoomPanImage({ theme, src }) {
  const wrapRef = useRef(null);
  const imgRef = useRef(null);

  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [drag, setDrag] = useState(null); // {x,y,ox,oy}

  useEffect(() => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
    const img = imgRef.current;
    if (!img) return;

    const onLoad = () => fit();
    img.addEventListener("load", onLoad);
    return () => img.removeEventListener("load", onLoad);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  function clampScale(v) {
    return Math.max(0.4, Math.min(6, v));
  }

  function fit() {
    const wrap = wrapRef.current;
    const img = imgRef.current;
    if (!wrap || !img) return;

    const cw = wrap.clientWidth;
    const ch = wrap.clientHeight;

    const iw = img.naturalWidth || 1;
    const ih = img.naturalHeight || 1;

    const s = Math.min(cw / iw, ch / ih);
    const target = clampScale(s);

    setScale(target);
    setOffset({ x: 0, y: 0 });
  }

  function reset() {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }

  function zoomBy(delta, cx = null, cy = null) {
    const wrap = wrapRef.current;
    if (!wrap) return;

    const next = clampScale(scale * delta);

    if (cx == null || cy == null) {
      setScale(next);
      return;
    }

    const rect = wrap.getBoundingClientRect();
    const x = cx - rect.left - rect.width / 2 - offset.x;
    const y = cy - rect.top - rect.height / 2 - offset.y;

    const ratio = next / scale;

    setOffset((p) => ({
      x: p.x - x * (ratio - 1),
      y: p.y - y * (ratio - 1)
    }));
    setScale(next);
  }

  function onWheel(e) {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    zoomBy(delta, e.clientX, e.clientY);
  }

  function onDown(e) {
    const p = { x: e.clientX ?? e.touches?.[0]?.clientX, y: e.clientY ?? e.touches?.[0]?.clientY };
    if (p.x == null || p.y == null) return;
    setDrag({ x: p.x, y: p.y, ox: offset.x, oy: offset.y });
  }
  function onMove(e) {
    if (!drag) return;
    const p = { x: e.clientX ?? e.touches?.[0]?.clientX, y: e.clientY ?? e.touches?.[0]?.clientY };
    if (p.x == null || p.y == null) return;
    const dx = p.x - drag.x;
    const dy = p.y - drag.y;
    setOffset({ x: drag.ox + dx, y: drag.oy + dy });
  }
  function onUp() {
    setDrag(null);
  }

  return (
    <div style={{ position: "relative", flex: "1 1 auto" }}>
      <div
        style={{
          position: "absolute",
          zIndex: 2,
          top: 10,
          right: 10,
          display: "flex",
          gap: 8,
          flexWrap: "wrap"
        }}
      >
        <button type="button" onClick={() => zoomBy(1.15)} style={toolBtn(theme)} title="Zoom In">
          <FiZoomIn />
        </button>
        <button type="button" onClick={() => zoomBy(0.87)} style={toolBtn(theme)} title="Zoom Out">
          <FiZoomOut />
        </button>
        <button type="button" onClick={fit} style={toolBtn(theme)} title="Fit">
          <FiMaximize2 />
        </button>
        <button type="button" onClick={reset} style={toolBtn(theme)} title="Reset">
          <FiRotateCcw />
        </button>
      </div>

      <div
        ref={wrapRef}
        onWheel={onWheel}
        onMouseDown={onDown}
        onMouseMove={onMove}
        onMouseUp={onUp}
        onMouseLeave={onUp}
        onTouchStart={onDown}
        onTouchMove={onMove}
        onTouchEnd={onUp}
        style={{
          height: "min(70vh, 520px)",
          display: "grid",
          placeItems: "center",
          overflow: "hidden",
          cursor: drag ? "grabbing" : "grab",
          padding: 12
        }}
      >
        <img
          ref={imgRef}
          src={src}
          alt=""
          draggable={false}
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            transformOrigin: "center center",
            maxWidth: "100%",
            maxHeight: "100%",
            userSelect: "none",
            borderRadius: 12,
            boxShadow: theme.isDark ? "0 18px 50px rgba(0,0,0,0.55)" : "0 18px 50px rgba(2,6,23,0.18)"
          }}
        />
      </div>
    </div>
  );
}

/* ===================== UI bits ===================== */
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
          width: "min(1100px, 96vw)",
          maxHeight: "92vh",
          borderRadius: 18,
          border: `1px solid ${theme.border}`,
          background: theme.panel,
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

          <button onClick={onClose} type="button" style={closeBtn(theme)} title="Close">
            ✕
          </button>
        </div>

        <div style={{ padding: 14, overflow: "auto", maxHeight: "calc(92vh - 64px - 72px)" }}>{children}</div>

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

function KV({ theme, k, v }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 12,
        padding: "10px 12px",
        borderRadius: 14,
        border: `1px solid ${theme.border}`,
        background: theme.panel,
        marginTop: 8,
        alignItems: "center"
      }}
    >
      <span style={{ color: theme.muted2, fontWeight: 900, fontSize: 12 }}>{k}</span>
      <b style={{ color: theme.text }}>{v}</b>
    </div>
  );
}

function MetaRow({ theme, k, v }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 12,
        padding: "8px 10px",
        borderRadius: 12,
        border: `1px solid ${theme.border}`,
        background: theme.panel,
        marginTop: 8,
        alignItems: "center",
        fontSize: 12
      }}
    >
      <span style={{ color: theme.muted2, fontWeight: 900 }}>{k}</span>
      <b style={{ color: theme.text }}>{v}</b>
    </div>
  );
}

function toolBtn(t) {
  return {
    width: 38,
    height: 38,
    borderRadius: 12,
    border: `1px solid ${t.border2}`,
    background: t.btnBg,
    color: t.text,
    cursor: "pointer",
    display: "grid",
    placeItems: "center"
  };
}

function closeBtn(t) {
  return {
    width: 40,
    height: 40,
    borderRadius: 14,
    border: `1px solid ${t.border}`,
    background: t.btnBg,
    color: t.text,
    cursor: "pointer",
    fontWeight: 900
  };
}

function btnGhost(t) {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    border: `1px solid ${t.border2}`,
    padding: "10px 12px",
    background: t.btnBg,
    color: t.text,
    cursor: "pointer",
    fontWeight: 900,
    fontSize: 12
  };
}

function btnDanger(t, disabled) {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    border: `1px solid rgba(239,68,68,0.40)`,
    padding: "10px 12px",
    background: disabled ? "rgba(239,68,68,0.12)" : "rgba(239,68,68,0.16)",
    color: disabled ? "rgba(239,68,68,0.55)" : "rgba(239,68,68,0.95)",
    cursor: disabled ? "not-allowed" : "pointer",
    fontWeight: 900,
    fontSize: 12,
    opacity: disabled ? 0.7 : 1
  };
}
