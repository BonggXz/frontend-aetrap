// src/pages/AdminMonitoring.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import { GlassCard, SectionTitle, MiniCard, IconButton, Badge } from "../components/Cards.jsx";
import { api } from "../lib/api.js";
import { useToast } from "../ui/Toast.jsx";
import { downloadTextFile } from "../lib/download.js";

import { FiRefreshCw, FiDownload, FiActivity, FiThermometer, FiDroplet, FiHash, FiMapPin } from "react-icons/fi";

// Chart.js (react-chartjs-2)
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend
} from "chart.js";
import { Line, Bar } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend);

/* =========================
   Utils
========================= */
function safeDate(ts) {
  const d = new Date(ts);
  return Number.isNaN(d.getTime()) ? null : d;
}
function fmtShort(ts) {
  const d = safeDate(ts);
  return d ? d.toLocaleString() : "-";
}
function fmtLabelHour(ts) {
  const d = safeDate(ts);
  if (!d) return "-";
  return d.toLocaleString([], { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}
function hourKey(ts) {
  const d = safeDate(ts);
  if (!d) return "unknown";
  d.setMinutes(0, 0, 0);
  return d.toISOString();
}
function avg(arr) {
  const nums = arr.filter((x) => Number.isFinite(x));
  if (!nums.length) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}
function toCSV(rows) {
  const esc = (v) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const headers = Object.keys(rows[0] || {});
  const out = [headers.join(",")];
  for (const r of rows) out.push(headers.map((h) => esc(r[h])).join(","));
  return out.join("\n");
}
function useIsMobile(breakpoint = 820) {
  const [m, setM] = useState(() => (typeof window !== "undefined" ? window.innerWidth <= breakpoint : false));
  useEffect(() => {
    if (typeof window === "undefined") return;
    const on = () => setM(window.innerWidth <= breakpoint);
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, [breakpoint]);
  return m;
}

// ✅ Theme watcher (dark/light)
function useThemeMode() {
  const [mode, setMode] = useState(() =>
    typeof document !== "undefined" ? document.documentElement.getAttribute("data-theme") || "dark" : "dark"
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    const read = () => setMode(document.documentElement.getAttribute("data-theme") || "dark");
    window.addEventListener("aetrap-theme", read);
    window.addEventListener("storage", read);

    const mo = new MutationObserver(read);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    return () => {
      window.removeEventListener("aetrap-theme", read);
      window.removeEventListener("storage", read);
      mo.disconnect();
    };
  }, []);

  return mode;
}

/* =========================
   Range Pills
========================= */
function RangePills({ value, onChange }) {
  const items = [
    { k: 1, label: "1D" },
    { k: 7, label: "7D" },
    { k: 14, label: "14D" },
    { k: 30, label: "30D" }
  ];

  return (
    <div className="admmon-range">
      {items.map((it) => (
        <button
          key={it.k}
          onClick={() => onChange(it.k)}
          className={`admmon-pill ${value === it.k ? "active" : ""}`}
          type="button"
        >
          {it.label}
        </button>
      ))}

      <style>{`
        .admmon-range{ display:flex; gap:8px; flex-wrap:wrap; justify-content:flex-end; }
        .admmon-pill{
          border-radius: 12px;
          border: 1px solid var(--stroke);
          background: rgba(255,255,255,0.03);
          color: var(--text);
          padding: 8px 10px;
          font-weight: 900;
          font-size: 12px;
          cursor: pointer;
          line-height: 1;
          min-height: 34px;
        }
        .admmon-pill.active{
          background: rgba(120,120,255,0.18);
          border-color: var(--stroke2);
        }
        @media (max-width: 520px){
          .admmon-range{ justify-content:flex-start; width:100%; }
          .admmon-pill{ flex: 1 1 calc(25% - 8px); text-align:center; }
        }
      `}</style>
    </div>
  );
}

/* =========================
   Leaflet helpers
========================= */
function escHtml(s) {
  return String(s ?? "").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ✅ pin icon (lokasi)
function createSimplePinIcon(color = "rgba(139,210,255,0.95)") {
  const svg = `
  <svg width="28" height="36" viewBox="0 0 28 36" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <filter id="pinShadow" x="-50%" y="-50%" width="200%" height="200%">
        <feDropShadow dx="0" dy="6" stdDeviation="5" flood-color="rgba(0,0,0,0.35)" />
      </filter>
    </defs>
    <path filter="url(#pinShadow)"
      d="M14 35c6-9 12-15 12-22C26 6.9 20.6 2 14 2S2 6.9 2 13c0 7 6 13 12 22z"
      fill="${color}"/>
    <circle cx="14" cy="13" r="6.2" fill="rgba(255,255,255,0.92)"/>
    <circle cx="14" cy="13" r="3.6" fill="rgba(0,0,0,0.20)"/>
  </svg>`;

  return L.divIcon({
    className: "admmon-pin",
    html: svg,
    iconSize: [28, 36],
    iconAnchor: [14, 35],
    popupAnchor: [0, -30]
  });
}

export default function AdminMonitoring() {
  const toast = useToast();
  const isMobile = useIsMobile(820);

  const themeMode = useThemeMode();
  const isLight = themeMode === "light";

  const chartC = useMemo(() => {
    return isLight
      ? {
          line: "rgba(0,0,0,0.85)",
          tick: "rgba(0,0,0,0.65)",
          grid: "rgba(0,0,0,0.08)",
          barA: "rgba(0,0,0,0.18)",
          barB: "rgba(0,0,0,0.10)",
          barBorderA: "rgba(0,0,0,0.45)",
          barBorderB: "rgba(0,0,0,0.30)",
          legend: "rgba(0,0,0,0.75)"
        }
      : {
          line: "rgba(255,255,255,0.95)",
          tick: "rgba(255,255,255,0.65)",
          grid: "rgba(255,255,255,0.06)",
          barA: "rgba(255,255,255,0.18)",
          barB: "rgba(255,255,255,0.10)",
          barBorderA: "rgba(255,255,255,0.50)",
          barBorderB: "rgba(255,255,255,0.35)",
          legend: "rgba(255,255,255,0.75)"
        };
  }, [isLight]);

  const mapRef = useRef(null);
  const mapElRef = useRef(null);
  const layerDevicesRef = useRef(null);
  const layerReportsRef = useRef(null);

  const [rangeDays, setRangeDays] = useState(7);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const [loading, setLoading] = useState(false);

  const [devices, setDevices] = useState([]);
  // merged events:
  // - __kind: "sensor" => temp/hum points
  // - __kind: "image"  => larva_count from YOLO processed image
  const [events, setEvents] = useState([]);
  const [reports, setReports] = useState([]);
  const [windowInfo, setWindowInfo] = useState({ from: null, to: null });

  const MAP_H = useMemo(() => {
    if (!isMobile) return 360;
    if (typeof window === "undefined") return 300;
    const vh = Math.max(520, Math.min(window.innerHeight || 720, 920));
    return Math.max(260, Math.min(340, Math.round(vh * 0.34)));
  }, [isMobile]);

  /* =========================
     Load ALL data
  ========================= */
  async function loadAll() {
    setLoading(true);
    try {
      const isoFrom = from ? new Date(from).toISOString() : undefined;
      const isoTo = to ? new Date(to).toISOString() : undefined;

      // 1) devices merged (protected + public) => lat/lng aman
      const devList = await api.getDevicesMerged().catch(() => []);
      const devArr = Array.isArray(devList) ? devList : [];
      setDevices(devArr);

      // 2) per device: sensor readings + images processed (larva)
      const LIMIT_DEV = 10;
      const LIMIT_IMG = 200;
      const target = devArr.slice(0, LIMIT_DEV);

      const merged = [];

      for (const d of target) {
        // ---- sensor readings
        try {
          const ov = await api.getDeviceOverview(d.device_id, { rangeDays, from: isoFrom, to: isoTo });
          const arr = Array.isArray(ov?.readings) ? ov.readings : [];
          for (const r of arr) {
            if (!r?.ts) continue;
            merged.push({
              ...r,
              __kind: "sensor",
              sourceType: "device",
              sourceId: d.device_id || "-",
              sourceName: d.name || d.device_id || "-",
              location: d.location || "",
              lat: d.lat ?? null,
              lng: d.lng ?? null
            });
          }
        } catch {
          // ignore
        }

        // ---- images processed => larva_count
        let imgList = [];
        try {
          const imgRes = await api.getImages({
            deviceId: d.device_id,
            processed: true,
            limit: LIMIT_IMG,
            page: 1
          });
          imgList = Array.isArray(imgRes) ? imgRes : Array.isArray(imgRes?.images) ? imgRes.images : [];
        } catch {
          imgList = [];
        }

        for (const im of imgList) {
          const ts = im?.timestamp || im?.createdAt;
          if (!ts) continue;

          const lv = im?.processedData?.summary?.larva_count;
          merged.push({
            ts,
            __kind: "image",
            larva_count: Number.isFinite(Number(lv)) ? Number(lv) : 0,
            sourceType: "device",
            sourceId: d.device_id || "-",
            sourceName: d.name || d.device_id || "-",
            location: d.location || "",
            lat: d.lat ?? null,
            lng: d.lng ?? null
          });
        }
      }

      merged.sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime());
      setEvents(merged);

      // 3) admin citizen reports (optional)
      let repList = [];
      try {
        const rep = await api.getReports({ limit: 200, page: 1 }).catch(() => ({ reports: [] }));
        repList = Array.isArray(rep?.reports) ? rep.reports : Array.isArray(rep) ? rep : [];
      } catch {
        repList = [];
      }

      const normalizedReports = repList
        .map((x) => {
          const ts = x?.createdAt || x?.timestamp || x?.ts;
          const lat = x?.location?.lat ?? x?.lat ?? x?.latitude;
          const lng = x?.location?.lng ?? x?.lng ?? x?.longitude;

          const larvaFromProcessed = x?.processedData?.summary?.larva_count;
          const larva =
            x?.larva_count ?? x?.larva ?? x?.count ?? (Number.isFinite(larvaFromProcessed) ? larvaFromProcessed : 0);

          return {
            ...x,
            ts,
            sourceType: "report",
            reporterName: x?.name || x?.username || "Anon",
            larva_count: Number(larva) || 0,
            locationText: x?.description || "",
            lat,
            lng
          };
        })
        .filter((x) => x?.ts);

      normalizedReports.sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime());
      setReports(normalizedReports);

      // 4) window info
      const wFrom =
        isoFrom ||
        (merged[0]?.ts
          ? new Date(merged[0].ts).toISOString()
          : normalizedReports[0]?.ts
            ? new Date(normalizedReports[0].ts).toISOString()
            : null);
      const wTo =
        isoTo ||
        (merged.at(-1)?.ts
          ? new Date(merged.at(-1).ts).toISOString()
          : normalizedReports.at(-1)?.ts
            ? new Date(normalizedReports.at(-1).ts).toISOString()
            : null);
      setWindowInfo({ from: wFrom, to: wTo });
    } catch (e) {
      toast.error(e.message || "Gagal load monitoring (all).");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangeDays]);

  /* =========================
     Buckets per hour
  ========================= */
  const buckets = useMemo(() => {
    const m = new Map();

    // device events
    for (const r of events) {
      const k = hourKey(r.ts);
      if (!m.has(k)) {
        m.set(k, {
          ts: k,
          tempArr: [],
          humArr: [],
          larvaDevices: 0,
          larvaReports: 0,
          devicePoints: 0,
          reportPoints: 0,
          devices: new Map(),
          reporters: new Map(),
          reportLocations: new Map()
        });
      }
      const b = m.get(k);

      const did = r.sourceId || "-";
      const lv = Number(r.larva_count) || 0;

      // ✅ sensor => temp/hum + devicePoints
      if (r.__kind === "sensor") {
        b.devicePoints += 1;

        const t = Number(r.temperature);
        const h = Number(r.humidity);
        if (Number.isFinite(t)) b.tempArr.push(t);
        if (Number.isFinite(h)) b.humArr.push(h);

        const prev = b.devices.get(did) || { points: 0, larva: 0 };
        b.devices.set(did, { points: prev.points + 1, larva: prev.larva });
      }

      // ✅ image => larvaDevices
      if (r.__kind === "image") {
        b.larvaDevices += lv;

        const prev = b.devices.get(did) || { points: 0, larva: 0 };
        b.devices.set(did, { points: prev.points + 1, larva: prev.larva + lv });
      }
    }

    // citizen reports
    for (const rp of reports) {
      const k = hourKey(rp.ts);
      if (!m.has(k)) {
        m.set(k, {
          ts: k,
          tempArr: [],
          humArr: [],
          larvaDevices: 0,
          larvaReports: 0,
          devicePoints: 0,
          reportPoints: 0,
          devices: new Map(),
          reporters: new Map(),
          reportLocations: new Map()
        });
      }
      const b = m.get(k);

      b.reportPoints += 1;

      const lv = Number(rp.larva_count) || 0;
      b.larvaReports += lv;

      const who = rp.reporterName || "Anon";
      const prevR = b.reporters.get(who) || { reports: 0, larva: 0 };
      b.reporters.set(who, { reports: prevR.reports + 1, larva: prevR.larva + lv });

      const loc = (rp.locationText || "").trim();
      if (loc) b.reportLocations.set(loc, (b.reportLocations.get(loc) || 0) + 1);
    }

    return Array.from(m.values())
      .map((b) => {
        const aT = avg(b.tempArr);
        const aH = avg(b.humArr);

        const topDevices = Array.from(b.devices.entries())
          .sort((a, c) => c[1].larva - a[1].larva || c[1].points - a[1].points)
          .slice(0, 3)
          .map(([id, v]) => ({ id, points: v.points, larva: v.larva }));

        const topReporters = Array.from(b.reporters.entries())
          .sort((a, c) => c[1].larva - a[1].larva || c[1].reports - a[1].reports)
          .slice(0, 3)
          .map(([name, v]) => ({ name, reports: v.reports, larva: v.larva }));

        const topLocations = Array.from(b.reportLocations.entries())
          .sort((a, c) => c[1] - a[1])
          .slice(0, 2)
          .map(([loc, count]) => ({ loc, count }));

        return {
          ts: b.ts,
          avgTemp: aT == null ? null : Math.round(aT * 10) / 10,
          avgHum: aH == null ? null : Math.round(aH * 10) / 10,
          devicePoints: b.devicePoints,
          reportPoints: b.reportPoints,
          larvaDevices: b.larvaDevices,
          larvaReports: b.larvaReports,
          larvaTotal: b.larvaDevices + b.larvaReports,
          deviceCount: b.devices.size,
          reporterCount: b.reporters.size,
          topDevices,
          topReporters,
          topLocations
        };
      })
      .sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime());
  }, [events, reports]);

  const recentBuckets = useMemo(() => {
    return [...buckets].sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime()).slice(0, 8);
  }, [buckets]);

  const summary = useMemo(() => {
    const sensorEvents = events.filter((x) => x.__kind === "sensor");
    const imageEvents = events.filter((x) => x.__kind === "image");

    const aT = avg(sensorEvents.map((x) => Number(x.temperature)));
    const aH = avg(sensorEvents.map((x) => Number(x.humidity)));

    const larvaDevices = imageEvents.reduce((s, x) => s + (Number(x.larva_count) || 0), 0);
    const larvaReports = reports.reduce((s, x) => s + (Number(x.larva_count) || 0), 0);

    const active = devices.filter((d) => d.active).length;
    const inactive = devices.length - active;

    return {
      avgTemp: aT == null ? "-" : (Math.round(aT * 10) / 10).toFixed(1),
      avgHum: aH == null ? "-" : (Math.round(aH * 10) / 10).toFixed(1),
      larvaTotal: larvaDevices + larvaReports,
      devicePoints: sensorEvents.length,
      reportsCount: reports.length,
      devices: devices.length,
      active,
      inactive
    };
  }, [events, reports, devices]);

  /* =========================
     Charts
  ========================= */
  const labels = useMemo(() => buckets.map((b) => fmtLabelHour(b.ts)), [buckets]);

  const lineDatasetBase = useMemo(
    () => ({
      tension: 0.15,
      borderWidth: 1.1,
      pointRadius: 0,
      pointHitRadius: 10,
      borderColor: chartC.line
    }),
    [chartC.line]
  );

  const tempLineData = useMemo(
    () => ({
      labels,
      datasets: [{ ...lineDatasetBase, label: "Avg Temperature (°C)", data: buckets.map((b) => b.avgTemp) }]
    }),
    [labels, buckets, lineDatasetBase]
  );

  const humLineData = useMemo(
    () => ({
      labels,
      datasets: [{ ...lineDatasetBase, label: "Avg Humidity (%)", data: buckets.map((b) => b.avgHum) }]
    }),
    [labels, buckets, lineDatasetBase]
  );

  const larvaBarData = useMemo(
    () => ({
      labels,
      datasets: [
        {
          label: "Larva (devices)",
          data: buckets.map((b) => b.larvaDevices),
          backgroundColor: chartC.barA,
          borderColor: chartC.barBorderA,
          borderWidth: 1
        },
        {
          label: "Larva (reports)",
          data: buckets.map((b) => b.larvaReports),
          backgroundColor: chartC.barB,
          borderColor: chartC.barBorderB,
          borderWidth: 1
        }
      ]
    }),
    [labels, buckets, chartC.barA, chartC.barB, chartC.barBorderA, chartC.barBorderB]
  );

  const pointsBarData = useMemo(
    () => ({
      labels,
      datasets: [
        {
          label: "Device points",
          data: buckets.map((b) => b.devicePoints),
          backgroundColor: chartC.barA,
          borderColor: chartC.barBorderA,
          borderWidth: 1
        },
        {
          label: "Report points",
          data: buckets.map((b) => b.reportPoints),
          backgroundColor: chartC.barB,
          borderColor: chartC.barBorderB,
          borderWidth: 1
        }
      ]
    }),
    [labels, buckets, chartC.barA, chartC.barB, chartC.barBorderA, chartC.barBorderB]
  );

  const commonScales = useMemo(
    () => ({
      x: {
        ticks: { autoSkip: true, maxTicksLimit: 8, maxRotation: 0, color: chartC.tick },
        grid: { color: chartC.grid }
      },
      y: {
        ticks: { color: chartC.tick },
        grid: { color: chartC.grid }
      }
    }),
    [chartC.tick, chartC.grid]
  );

  const lineOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: true, labels: { color: chartC.legend } } },
      scales: { ...commonScales, y: { ...commonScales.y, beginAtZero: false } }
    }),
    [commonScales, chartC.legend]
  );

  const barOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: true, labels: { color: chartC.legend } } },
      scales: { ...commonScales, y: { ...commonScales.y, beginAtZero: true } }
    }),
    [commonScales, chartC.legend]
  );

  const chartH = isMobile ? 240 : 260;

  /* =========================
     Leaflet init once
  ========================= */
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (mapRef.current || !mapElRef.current) return;

    const start = { lat: -6.2, lng: 106.816666 };
    const map = L.map(mapElRef.current, { zoomControl: true, preferCanvas: true }).setView([start.lat, start.lng], 11);

    if (isMobile) {
      map.dragging?.disable();
      map.scrollWheelZoom?.disable();
      map.doubleClickZoom?.disable();
      map.boxZoom?.disable();
      map.keyboard?.disable();
      map.touchZoom?.disable();
      map.tap?.disable?.();
    }

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors"
    }).addTo(map);

    layerDevicesRef.current = L.layerGroup().addTo(map);
    layerReportsRef.current = L.layerGroup().addTo(map);

    const legend = L.control({ position: "bottomleft" });
    legend.onAdd = () => {
      const div = L.DomUtil.create("div", "admmon-legend");
      div.innerHTML = `
        <div style="font-weight:900;margin-bottom:6px">Sources</div>
        <div style="display:grid;gap:6px;font-size:12px;opacity:.92">
          <div><span style="display:inline-block;width:10px;height:10px;border-radius:999px;background:rgba(139,210,255,0.95);margin-right:8px"></span> Devices</div>
          <div><span style="display:inline-block;width:10px;height:10px;border-radius:999px;background:rgba(255,107,138,0.95);margin-right:8px"></span> Reports</div>
        </div>
      `;
      return div;
    };
    legend.addTo(map);

    mapRef.current = map;
    setTimeout(() => map.invalidateSize(), 180);
  }, [isMobile]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (isMobile) {
      map.dragging?.disable();
      map.scrollWheelZoom?.disable();
      map.doubleClickZoom?.disable();
      map.boxZoom?.disable();
      map.keyboard?.disable();
      map.touchZoom?.disable();
      map.tap?.disable?.();
    } else {
      map.dragging?.enable();
      map.scrollWheelZoom?.enable();
      map.doubleClickZoom?.enable();
      map.boxZoom?.enable();
      map.keyboard?.enable();
      map.touchZoom?.enable();
      map.tap?.enable?.();
    }

    const t = setTimeout(() => map.invalidateSize(), 220);
    return () => clearTimeout(t);
  }, [isMobile, MAP_H]);

  /* =========================
     Update markers (PIN, bukan bunder)
  ========================= */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const devLayer = layerDevicesRef.current;
    const repLayer = layerReportsRef.current;
    if (!devLayer || !repLayer) return;

    devLayer.clearLayers();
    repLayer.clearLayers();

    const DEV_PIN = "rgba(139,210,255,0.95)";
    const REP_PIN = "rgba(255,107,138,0.95)";

    for (const d of devices) {
      const lat = d?.lat ?? d?.latitude;
      const lng = d?.lng ?? d?.longitude;
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

      L.marker([lat, lng], { icon: createSimplePinIcon(DEV_PIN) })
        .addTo(devLayer)
        .bindPopup(
          `<div style="font-weight:900;margin-bottom:4px">${escHtml(d.name || d.device_id || "Device")}</div>
           <div style="opacity:.85">Device • ${escHtml(d.location || "-")}</div>`
        );
    }

    for (const r of reports) {
      const lat = r?.lat ?? r?.latitude;
      const lng = r?.lng ?? r?.longitude;
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

      const who = escHtml(r.reporterName || "Anon");
      const lv = Number(r.larva_count) || 0;

      L.marker([lat, lng], { icon: createSimplePinIcon(REP_PIN) })
        .addTo(repLayer)
        .bindPopup(
          `<div style="font-weight:900;margin-bottom:4px">Report • ${who}</div>
           <div style="opacity:.85">Larva: <b>${lv}</b></div>`
        );
    }

    const t = setTimeout(() => map.invalidateSize(), 180);
    return () => clearTimeout(t);
  }, [devices, reports]);

  function applyRange() {
    loadAll();
  }

  /* =========================
     Export ALL (fallback CSV)
  ========================= */
  async function onExportAll() {
    try {
      const rows = recentBuckets.map((b) => ({
        ts: b.ts,
        avgTemp: b.avgTemp ?? "",
        avgHum: b.avgHum ?? "",
        devicePoints: b.devicePoints,
        reportPoints: b.reportPoints,
        larvaDevices: b.larvaDevices,
        larvaReports: b.larvaReports,
        larvaTotal: b.larvaTotal,
        devices: b.deviceCount,
        reporters: b.reporterCount,
        topDevices: b.topDevices.map((x) => `${x.id}(${x.points}p/${x.larva}L)`).join(" | "),
        topReporters: b.topReporters.map((x) => `${x.name}(${x.reports}r/${x.larva}L)`).join(" | "),
        topLocations: b.topLocations.map((x) => `${x.loc}(${x.count})`).join(" | ")
      }));
      const csv = toCSV(rows.length ? rows : [{ info: "no-data" }]);
      downloadTextFile(`admin_monitoring_all_${Date.now()}.csv`, csv);
      toast.success("Export dimulai.");
    } catch (e) {
      toast.error(e.message || "Gagal export.");
    }
  }

  return (
    <div>
      <GlassCard>
        <SectionTitle
          kicker="Admin"
          title="Monitoring"
          right={
            <div className="admmon-topbar">
              <IconButton icon={FiRefreshCw} variant="ghost" onClick={loadAll} disabled={loading} title="Refresh" />
              <IconButton icon={FiDownload} onClick={onExportAll} title="Export ALL" />
            </div>
          }
        />

        <div className="admmon-top-grid">
          <MiniCard>
            <div className="admmon-range-head">
              <div className="admmon-range-left">
                <FiActivity size={18} />
                <div style={{ fontWeight: 950 }}>Range</div>
              </div>
              <RangePills value={rangeDays} onChange={setRangeDays} />
            </div>

            <div className="admmon-date">
              <div className="admmon-date-field">
                <div style={hintStyle}>From</div>
                <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="admmon-input" />
              </div>

              <div className="admmon-date-field">
                <div style={hintStyle}>To</div>
                <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="admmon-input" />
              </div>

              <div className="admmon-apply">
                <IconButton icon={FiRefreshCw} variant="ghost" onClick={applyRange}>
                  Apply
                </IconButton>
              </div>
            </div>

            <div className="admmon-kpi">
              <Kpi label="Avg Temp" value={`${summary.avgTemp}°C`} />
              <Kpi label="Avg Hum" value={`${summary.avgHum}%`} />
              <Kpi label="Larva Total" value={`${summary.larvaTotal}`} />
              <Kpi label="Device Points" value={`${summary.devicePoints}`} />
              <Kpi label="Reports" value={`${summary.reportsCount}`} />
            </div>

            <div style={{ color: "var(--muted2)", fontSize: 12, marginTop: 12, lineHeight: 1.35 }}>
              Window: {windowInfo.from ? fmtShort(windowInfo.from) : "-"} <br />
              To: {windowInfo.to ? fmtShort(windowInfo.to) : "-"} <br />
              Devices: <b>{summary.devices}</b> (Active {summary.active} / Inactive {summary.inactive})
            </div>
          </MiniCard>

          <MiniCard>
            <div className="admmon-maphead">
              <div className="ttl">
                <FiMapPin /> Risk Map (Sources)
              </div>
              <Badge tone="good">All Sources</Badge>
            </div>

            <div style={{ marginTop: 12 }}>
              <div
                ref={mapElRef}
                className="admmon-map"
                style={{
                  width: "100%",
                  height: MAP_H,
                  borderRadius: 18,
                  overflow: "hidden",
                  border: "1px solid var(--stroke)",
                  background: "rgba(0,0,0,0.12)"
                }}
              />
              <div style={{ color: "var(--muted2)", fontSize: 12, marginTop: 10, lineHeight: 1.35 }}>
                Marker muncul kalau device/report punya koordinat (lat/lng).{" "}
                {isMobile ? "Di HP: map dikunci biar scroll lancar (zoom via +/-)." : null}
              </div>
            </div>
          </MiniCard>
        </div>

        <div className="admmon-bottom-grid">
          <MiniCard>
            <div style={{ fontWeight: 950, marginBottom: 10 }}>Temperature (Line)</div>
            <div style={{ height: chartH }}>
              <Line data={tempLineData} options={lineOptions} />
            </div>
          </MiniCard>

          <MiniCard>
            <div style={{ fontWeight: 950, marginBottom: 10 }}>Humidity (Line)</div>
            <div style={{ height: chartH }}>
              <Line data={humLineData} options={lineOptions} />
            </div>
          </MiniCard>

          <MiniCard>
            <div style={{ fontWeight: 950, marginBottom: 10 }}>Larva (Bar)</div>
            <div style={{ height: chartH }}>
              <Bar data={larvaBarData} options={barOptions} />
            </div>
          </MiniCard>

          <MiniCard>
            <div style={{ fontWeight: 950, marginBottom: 10 }}>Points (Bar)</div>
            <div style={{ height: chartH }}>
              <Bar data={pointsBarData} options={barOptions} />
            </div>
          </MiniCard>

          <MiniCard className="admmon-recent-card">
            <div style={{ fontWeight: 950, marginBottom: 10 }}>Recent Buckets (Sources)</div>

            <div className="admmon-recent">
              {recentBuckets.map((b) => (
                <div key={b.ts} className="admmon-bucket">
                  <div className="admmon-bucket-head">
                    <div className="t">{fmtShort(b.ts)}</div>

                    <div className="chips">
                      <span className="chip">
                        <FiThermometer /> <b>{b.avgTemp == null ? "-" : `${b.avgTemp}°C`}</b>
                      </span>
                      <span className="chip">
                        <FiDroplet /> <b>{b.avgHum == null ? "-" : `${b.avgHum}%`}</b>
                      </span>
                      <span className="chip">
                        <FiHash /> <b>Larva {b.larvaTotal}</b>
                      </span>
                    </div>
                  </div>

                  <div className="admmon-bucket-meta">
                    <span className="chip2">Device Points {b.devicePoints}</span>
                    <span className="chip2">Report Points {b.reportPoints}</span>
                    <span className="chip2">Devices {b.deviceCount}</span>
                    <span className="chip2">Reporters {b.reporterCount}</span>
                    <span className="chip2">Larva Dev {b.larvaDevices}</span>
                    <span className="chip2">Larva Rep {b.larvaReports}</span>
                  </div>

                  <div className="admmon-bucket-cols">
                    <div className="col">
                      <div className="lbl">Top Devices</div>
                      <div className="val">
                        {b.topDevices.length
                          ? b.topDevices.map((x) => `${x.id} (${x.points}p / ${x.larva}L)`).join(", ")
                          : <span style={{ opacity: 0.7 }}>-</span>}
                      </div>
                      <div className="sub">p = points, L = larva</div>
                    </div>

                    <div className="col">
                      <div className="lbl">Top Reporters</div>
                      <div className="val">
                        {b.topReporters.length
                          ? b.topReporters.map((x) => `${x.name} (${x.reports}r / ${x.larva}L)`).join(", ")
                          : <span style={{ opacity: 0.7 }}>-</span>}
                      </div>
                      <div className="sub">r = jumlah laporan</div>
                    </div>

                    <div className="col">
                      <div className="lbl">Lokasi Report</div>
                      <div className="val">
                        {b.topLocations.length
                          ? b.topLocations.map((x) => `${x.loc} (${x.count})`).join(", ")
                          : <span style={{ opacity: 0.7 }}>-</span>}
                      </div>
                      <div className="sub">count = jumlah report</div>
                    </div>
                  </div>
                </div>
              ))}

              {!recentBuckets.length ? <div style={{ color: "var(--muted2)" }}>Belum ada data.</div> : null}
            </div>
          </MiniCard>
        </div>

        <style>{`
          .admmon-topbar{ display:flex; align-items:center; gap:10px; flex-wrap:nowrap; margin-left:auto; justify-content:flex-end; }

          .admmon-top-grid{ display:grid; grid-template-columns: 1.2fr 0.8fr; gap: 14px; align-items:start; }
          .admmon-range-head{ display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap; }
          .admmon-range-left{ display:flex; align-items:center; gap:10px; }

          .admmon-date{
            display:grid;
            grid-template-columns: 1fr 1fr auto;
            gap:10px;
            margin-top: 12px;
            align-items:end;
            min-width: 0;
          }
          .admmon-date-field{ display:grid; gap:6px; min-width: 0; }
          .admmon-input{
            border-radius: 12px;
            border: 1px solid var(--stroke);
            background: rgba(0,0,0,0.12);
            color: var(--text);
            padding: 10px 12px;
            outline: none;
            height: 34px;
            font-size: 12px;
            width: 100%;
            min-width: 0;
          }
          .admmon-apply{ display:flex; align-items:end; }

          .admmon-kpi{ display:grid; grid-template-columns: repeat(5, minmax(0,1fr)); gap:10px; margin-top:14px; }

          .admmon-maphead{ display:flex; justify-content:space-between; align-items:center; gap:12px; }
          .admmon-maphead .ttl{ font-weight: 950; display:inline-flex; align-items:center; gap:10px; min-width:0; }

          .admmon-bottom-grid{ display:grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 14px; margin-top: 14px; }

          .admmon-recent{ display:grid; gap:12px; }
          .admmon-bucket{ border: 1px solid var(--stroke); border-radius: 16px; padding: 12px; background: rgba(255,255,255,0.02); }
          .admmon-bucket-head{ display:flex; justify-content:space-between; gap:12px; align-items:flex-start; flex-wrap:wrap; }
          .admmon-bucket-head .t{ font-weight: 950; font-size: 12px; color: rgba(255,255,255,0.75); }
          html[data-theme="light"] .admmon-bucket-head .t{ color: rgba(0,0,0,0.55); }

          .admmon-bucket-head .chips{ display:flex; gap:8px; flex-wrap:wrap; justify-content:flex-end; }

          .chip{
            display:inline-flex;
            align-items:center;
            gap:8px;
            padding: 8px 10px;
            border: 1px solid var(--stroke);
            border-radius: 999px;
            background: rgba(255,255,255,0.02);
            font-weight: 900;
            font-size: 12px;
            white-space: nowrap;
          }

          .admmon-bucket-meta{ display:flex; gap:8px; flex-wrap:wrap; margin-top: 10px; }
          .chip2{
            display:inline-flex;
            align-items:center;
            gap:8px;
            padding: 7px 9px;
            border: 1px solid var(--stroke);
            border-radius: 12px;
            background: rgba(255,255,255,0.02);
            font-weight: 900;
            font-size: 12px;
            white-space: nowrap;
            opacity: .95;
          }

          .admmon-bucket-cols{ display:grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-top: 10px; }
          .admmon-bucket-cols .col{ border: 1px solid rgba(255,255,255,0.08); background: rgba(0,0,0,0.10); border-radius: 14px; padding: 10px 10px; min-width:0; }
          html[data-theme="light"] .admmon-bucket-cols .col{ border: 1px solid rgba(0,0,0,0.08); background: rgba(0,0,0,0.04); }

          .admmon-bucket-cols .lbl{ color: rgba(255,255,255,0.7); font-size: 11px; font-weight: 900; margin-bottom: 6px; }
          html[data-theme="light"] .admmon-bucket-cols .lbl{ color: rgba(0,0,0,0.55); }

          .admmon-bucket-cols .val{ font-size: 12px; font-weight: 900; line-height: 1.35; word-break: break-word; }
          .admmon-bucket-cols .sub{ margin-top: 8px; font-size: 11px; color: rgba(255,255,255,0.60); line-height: 1.25; }
          html[data-theme="light"] .admmon-bucket-cols .sub{ color: rgba(0,0,0,0.50); }

          .admmon-legend{
            padding:10px 12px;
            border-radius:14px;
            border:1px solid rgba(255,255,255,0.14);
            background: rgba(10,18,32,0.65);
            color: rgba(255,255,255,0.92);
            backdrop-filter: blur(10px);
            box-shadow: 0 18px 60px rgba(0,0,0,0.35);
          }
          html[data-theme="light"] .admmon-legend{
            background: rgba(255,255,255,0.75);
            color: rgba(10,20,40,0.92);
            border:1px solid rgba(10,20,40,0.12);
          }

          .admmon-map.leaflet-container,
          .admmon-map .leaflet-container{
            touch-action: pan-x pan-y !important;
          }

          /* ✅ pin icon container */
          .admmon-pin{ background: transparent !important; border: none !important; }

          @media (max-width: 820px){
            .admmon-topbar{ width: 100%; gap: 8px; justify-content:flex-end; }
            .admmon-top-grid{ grid-template-columns: 1fr; }
            .admmon-bottom-grid{ grid-template-columns: 1fr; }
            .admmon-kpi{ grid-template-columns: repeat(2, minmax(0,1fr)); }
            .admmon-date{ grid-template-columns: 1fr 1fr; }
            .admmon-apply{ grid-column: 1 / -1; }
            .admmon-apply > *{ width:100%; }
            .admmon-bucket-head .chips{ justify-content:flex-start; }
            .admmon-bucket-cols{ grid-template-columns: 1fr; }
          }

          @media (max-width: 520px){
            .admmon-date{ grid-template-columns: 1fr; }
          }
        `}</style>
      </GlassCard>
    </div>
  );
}

/* =========================
   Small components
========================= */
function Kpi({ label, value }) {
  return (
    <div
      style={{
        border: "1px solid var(--stroke)",
        borderRadius: 14,
        padding: "10px 12px",
        background: "rgba(255,255,255,0.02)",
        display: "flex",
        flexDirection: "column"
      }}
    >
      <div style={{ color: "var(--muted2)", fontSize: 12, fontWeight: 900, flexGrow: 1 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 950, marginTop: 6 }}>{value}</div>
    </div>
  );
}

const hintStyle = { color: "var(--muted2)", fontWeight: 900, fontSize: 12 };
