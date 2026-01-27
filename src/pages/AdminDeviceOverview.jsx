// src/pages/AdminDeviceOverview.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { GlassCard, SectionTitle, MiniCard, IconButton, Badge } from "../components/Cards.jsx";
import { api } from "../lib/api.js";
import { useToast } from "../ui/Toast.jsx";
import { downloadTextFile } from "../lib/download.js";
import { FiDownload, FiRefreshCw } from "react-icons/fi";

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

function safeDate(ts) {
  const d = new Date(ts);
  return Number.isNaN(d.getTime()) ? null : d;
}
function fmt(ts) {
  const d = safeDate(ts);
  return d ? d.toLocaleString() : "-";
}
function fmtLabel(ts) {
  const d = safeDate(ts);
  if (!d) return "-";
  return d.toLocaleString([], { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
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

// ✅ theme detector (data-theme="light" | "dark")
function useThemeMode() {
  const [mode, setMode] = useState(() => {
    if (typeof document === "undefined") return "dark";
    return document.documentElement.getAttribute("data-theme") || "dark";
  });

  useEffect(() => {
    if (typeof document === "undefined") return;

    const onCustom = (e) => {
      const next = e?.detail || document.documentElement.getAttribute("data-theme") || "dark";
      setMode(next);
    };
    window.addEventListener("aetrap-theme", onCustom);

    const obs = new MutationObserver(() => {
      const next = document.documentElement.getAttribute("data-theme") || "dark";
      setMode(next);
    });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    return () => {
      window.removeEventListener("aetrap-theme", onCustom);
      obs.disconnect();
    };
  }, []);

  return mode === "light" ? "light" : "dark";
}

export default function AdminDeviceOverview() {
  const { deviceId } = useParams();
  const toast = useToast();
  const isMobile = useIsMobile(820);
  const themeMode = useThemeMode();

  const [rangeDays, setRangeDays] = useState(7);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(false);
  const [ov, setOv] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const data = await api.getDeviceOverview(deviceId, {
        rangeDays,
        from: from ? new Date(from).toISOString() : undefined,
        to: to ? new Date(to).toISOString() : undefined
      });
      setOv(data);
    } catch (e) {
      toast.error(e.message || "Gagal load overview.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deviceId, rangeDays]);

  async function onExport() {
    try {
      const res = await api.exportDeviceData(deviceId, {
        rangeDays,
        from: from ? new Date(from).toISOString() : undefined,
        to: to ? new Date(to).toISOString() : undefined
      });
      downloadTextFile(res.filename, res.csv);
      toast.success("Download data dimulai.");
    } catch (e) {
      toast.error(e.message || "Gagal export.");
    }
  }

  const readings = useMemo(() => (ov?.readings || []).filter((r) => r && r.ts), [ov]);
  const labels = useMemo(() => readings.map((r) => fmtLabel(r.ts)), [readings]);

  /**
   * ✅ FIX: backend biasanya ngirim
   * ov.larvaDaily = { deviceId, days, series: [{date,totalLarva,images}, ...] }
   * sebelumnya kamu cek Array.isArray(ov.larvaDaily) -> selalu false -> []
   */
  const larvaSeries = useMemo(() => {
    const ld = ov?.larvaDaily;
    if (Array.isArray(ld)) return ld; // support kalau suatu saat backend kirim array langsung
    if (Array.isArray(ld?.series)) return ld.series;
    return [];
  }, [ov]);

  const larvaLabels = useMemo(() => larvaSeries.map((x) => x.date), [larvaSeries]);

  // ✅ theme colors
  const colors = useMemo(() => {
    const isLight = themeMode === "light";
    return {
      line: isLight ? "rgba(10,20,40,0.95)" : "rgba(255,255,255,0.95)",
      tick: isLight ? "rgba(10,20,40,0.70)" : "rgba(255,255,255,0.65)",
      grid: isLight ? "rgba(10,20,40,0.08)" : "rgba(255,255,255,0.06)",
      legend: isLight ? "rgba(10,20,40,0.78)" : "rgba(255,255,255,0.75)",
      barBg: isLight ? "rgba(10,20,40,0.18)" : "rgba(255,255,255,0.22)",
      barBorder: isLight ? "rgba(10,20,40,0.55)" : "rgba(255,255,255,0.55)"
    };
  }, [themeMode]);

  // ===== Line style =====
  const lineDatasetBase = useMemo(
    () => ({
      tension: 0.15,
      borderWidth: 1.2,
      pointRadius: 0,
      pointHitRadius: 10,
      borderColor: colors.line
    }),
    [colors.line]
  );

  const tempData = useMemo(() => {
    return {
      labels,
      datasets: [
        {
          ...lineDatasetBase,
          label: "Temperature (°C)",
          data: readings.map((x) => (Number.isFinite(Number(x.temperature)) ? Number(x.temperature) : null))
        }
      ]
    };
  }, [labels, readings, lineDatasetBase]);

  const humData = useMemo(() => {
    return {
      labels,
      datasets: [
        {
          ...lineDatasetBase,
          label: "Humidity (%)",
          data: readings.map((x) => (Number.isFinite(Number(x.humidity)) ? Number(x.humidity) : null))
        }
      ]
    };
  }, [labels, readings, lineDatasetBase]);

  // ✅ Larva Daily Bar from larvaSeries
  const larvaDailyBarData = useMemo(() => {
    return {
      labels: larvaLabels,
      datasets: [
        {
          label: "Larva Count (Daily)",
          data: larvaSeries.map((x) => Number(x.totalLarva) || 0),
          backgroundColor: colors.barBg,
          borderColor: colors.barBorder,
          borderWidth: 1
        }
      ]
    };
  }, [larvaLabels, larvaSeries, colors.barBg, colors.barBorder]);

  const commonScales = useMemo(
    () => ({
      x: {
        ticks: { autoSkip: true, maxTicksLimit: 8, maxRotation: 0, color: colors.tick },
        grid: { color: colors.grid }
      },
      y: {
        ticks: { color: colors.tick, precision: 0 },
        grid: { color: colors.grid }
      }
    }),
    [colors.tick, colors.grid]
  );

  const lineOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: true, labels: { color: colors.legend } },
        tooltip: { enabled: true }
      },
      scales: { ...commonScales, y: { ...commonScales.y, beginAtZero: false } }
    }),
    [commonScales, colors.legend]
  );

  const barOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: true, labels: { color: colors.legend } },
        tooltip: { enabled: true }
      },
      scales: {
        ...commonScales,
        y: { ...commonScales.y, beginAtZero: true, suggestedMax: Math.max(3, ...larvaSeries.map((x) => Number(x.totalLarva) || 0)) }
      }
    }),
    [commonScales, colors.legend, larvaSeries]
  );

  const chartH = isMobile ? 250 : 290;

  return (
    <div>
      <GlassCard>
        <SectionTitle
          kicker="Admin"
          title={`Overview • ${deviceId}`}
          right={
            <div className="ov-actions">
              <IconButton icon={FiRefreshCw} variant="ghost" onClick={load} disabled={loading}>
                {loading ? "Loading" : "Refresh"}
              </IconButton>
              <IconButton icon={FiDownload} onClick={onExport}>
                Download Data
              </IconButton>
            </div>
          }
        />

        {ov?.device ? (
          <MiniCard>
            <div className="ov-head">
              <div>
                <div style={{ fontWeight: 950, fontSize: 18 }}>{ov.device.name || ov.device.device_id}</div>
                <div style={{ color: "var(--muted2)", fontSize: 12, marginTop: 6, lineHeight: 1.35 }}>
                  Location: {ov.device.location || "-"} • Last seen: {fmt(ov.device.lastSeen)}
                </div>
              </div>
              <Badge tone={ov.device.active ? "good" : "warn"}>{ov.device.active ? "Aktif" : "Inactive"}</Badge>
            </div>

            <div className="ov-filters">
              <RangeButton value={rangeDays} onChange={setRangeDays} />

              <div className="ov-date-row">
                <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={inputStyle(isMobile, themeMode)} />
                <input type="date" value={to} onChange={(e) => setTo(e.target.value)} style={inputStyle(isMobile, themeMode)} />
                <IconButton icon={FiRefreshCw} variant="ghost" onClick={load}>
                  Apply
                </IconButton>
              </div>
            </div>
          </MiniCard>
        ) : null}

        <div className="ov-grid" style={{ marginTop: 14 }}>
          <MiniCard>
            <div style={{ fontWeight: 950, marginBottom: 10 }}>Temperature (Line)</div>
            <div style={{ height: chartH }}>
              <Line data={tempData} options={lineOptions} />
            </div>
          </MiniCard>

          <MiniCard>
            <div style={{ fontWeight: 950, marginBottom: 10 }}>Humidity (Line)</div>
            <div style={{ height: chartH }}>
              <Line data={humData} options={lineOptions} />
            </div>
          </MiniCard>

          <MiniCard>
            <div style={{ fontWeight: 950, marginBottom: 10 }}>Larva Count (Daily Bar)</div>
            <div style={{ height: chartH }}>
              <Bar data={larvaDailyBarData} options={barOptions} />
            </div>

            {/* debug kecil biar keliatan kalau series kosong */}
            {larvaSeries.length === 0 ? (
              <div style={{ marginTop: 10, color: "var(--muted2)", fontSize: 12, lineHeight: 1.35 }}>
                (Tidak ada data larva harian untuk range ini — pastikan image sudah <b>processed: true</b> dan <b>larva_count</b> ada)
              </div>
            ) : null}

          </MiniCard>

          <MiniCard>
            <div style={{ fontWeight: 950, marginBottom: 10 }}>Summary</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 10 }}>
              <Kpi label="Avg Temp" value={`${ov?.summary?.avgTemp ?? "-"}°C`} />
              <Kpi label="Avg Hum" value={`${ov?.summary?.avgHum ?? "-"}%`} />
              <Kpi label="Larva Total" value={`${ov?.summary?.larvaTotal ?? "-"}`} />
              <Kpi label="Data Points" value={`${ov?.summary?.dataPoints ?? "-"}`} />
            </div>

            <div style={{ marginTop: 12, color: "var(--muted2)", fontSize: 12, lineHeight: 1.35 }}>
              From: {fmt(ov?.from)} <br />
              To: {fmt(ov?.to)}
            </div>
          </MiniCard>
        </div>

        <style>{`
          .ov-actions{
            display:flex;
            gap:10px;
            flex-wrap:wrap;
            justify-content:flex-end;
          }
          .ov-head{
            display:flex;
            justify-content:space-between;
            gap:12px;
            align-items:flex-start;
            flex-wrap:wrap;
          }
          .ov-filters{
            display:flex;
            gap:10px;
            flex-wrap:wrap;
            margin-top:12px;
            align-items:center;
          }
          .ov-date-row{
            display:flex;
            gap:10px;
            flex-wrap:wrap;
            align-items:center;
          }
          .ov-grid{
            display:grid;
            grid-template-columns: repeat(2, minmax(0,1fr));
            gap: 14px;
          }
          @media (max-width: 820px){
            .ov-grid{ grid-template-columns: 1fr; }
            .ov-actions{ justify-content:flex-start; }
            .ov-date-row > *{ width: 100%; }
          }
        `}</style>
      </GlassCard>
    </div>
  );
}

function RangeButton({ value, onChange }) {
  const items = [
    { k: 1, label: "24H" },
    { k: 7, label: "7D" },
    { k: 14, label: "14D" },
    { k: 30, label: "30D" }
  ];
  return (
    <div className="ov-range">
      {items.map((it) => (
        <button
          key={it.k}
          onClick={() => onChange(it.k)}
          type="button"
          style={{
            borderRadius: 12,
            border: "1px solid var(--stroke)",
            background: value === it.k ? "rgba(120,120,255,0.18)" : "rgba(255,255,255,0.03)",
            color: "var(--text)",
            padding: "8px 10px",
            fontWeight: 950,
            cursor: "pointer",
            fontSize: 12,
            minHeight: 34
          }}
        >
          {it.label}
        </button>
      ))}

      <style>{`
        .ov-range{ display:flex; gap:8px; flex-wrap:wrap; }
        @media (max-width: 520px){
          .ov-range > button{ flex: 1 1 calc(25% - 8px); text-align:center; }
        }
      `}</style>
    </div>
  );
}

function Kpi({ label, value }) {
  return (
    <div style={{ border: "1px solid var(--stroke)", borderRadius: 14, padding: "10px 12px", background: "rgba(255,255,255,0.02)" }}>
      <div style={{ color: "var(--muted2)", fontSize: 12, fontWeight: 900 }}>{label}</div>
      <div style={{ fontWeight: 950, fontSize: 18, marginTop: 6 }}>{value}</div>
    </div>
  );
}

const inputStyle = (isMobile, themeMode) => {
  const isLight = themeMode === "light";
  return {
    borderRadius: 12,
    border: "1px solid var(--stroke)",
    background: isLight ? "rgba(0,0,0,0.04)" : "rgba(0,0,0,0.12)",
    color: "var(--text)",
    padding: "10px 12px",
    outline: "none",
    height: 34,
    fontSize: 12,
    width: isMobile ? "100%" : 170
  };
};
