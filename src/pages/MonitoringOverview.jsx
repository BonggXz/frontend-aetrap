// src/pages/MonitoringOverview.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { GlassCard, SectionTitle, MiniCard, Badge, ShimmerButton } from "../components/Cards.jsx";
import { Icons } from "../ui/Icons.jsx";
import { useToast } from "../ui/Toast.jsx";
import { api } from "../lib/api.js";
import { formatDateTime } from "../lib/utils.js";
import LineChartCard from "../components/LineChartCard.jsx";
import { getSocket, subscribeDevice } from "../lib/socket.js";

function riskFromLarvae(avgPerDay) {
  if (!Number.isFinite(avgPerDay)) return { label: "-", tone: "neutral" };
  if (avgPerDay >= 18) return { label: "Tinggi", tone: "bad" };
  if (avgPerDay >= 10) return { label: "Sedang", tone: "warn" };
  return { label: "Rendah", tone: "good" };
}

function safeFmt(dt) {
  try {
    return formatDateTime?.(dt) || "-";
  } catch {
    return dt ? String(dt) : "-";
  }
}

function labelFromYYYYMMDD(s) {
  // "2026-01-22" -> "22/01"
  try {
    const [y, m, d] = String(s).split("-");
    if (!y || !m || !d) return String(s);
    return `${d}/${m}`;
  } catch {
    return String(s);
  }
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

export default function MonitoringOverview() {
  const toast = useToast();
  const nav = useNavigate();
  const themeMode = useThemeMode();

  const [devices, setDevices] = useState([]);
  const [selected, setSelected] = useState(null);
  const [q, setQ] = useState("");

  const [live, setLive] = useState({}); // device_id -> {temperature, humidity}

  // chart states (REAL)
  const [labels7, setLabels7] = useState([]);
  const [temp7, setTemp7] = useState([]);
  const [hum7, setHum7] = useState([]);
  const [larva7, setLarva7] = useState([]);

  // load devices (PUBLIC DB)
  useEffect(() => {
    (async () => {
      try {
        const d = await api.getDevicesPublic();
        const list = Array.isArray(d) ? d : [];
        setDevices(list);
        setSelected(list[0]?.device_id || null);
      } catch (e) {
        console.error(e);
        setDevices([]);
        setSelected(null);
        toast.error("Gagal memuat devices (public). Cek backend.");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // subscribe socket for selected + update live
  useEffect(() => {
    if (!selected) return;

    const s = getSocket();
    subscribeDevice(selected);

    const onSensor = (payload) => {
      if (!payload?.device_id) return;
      setLive((prev) => ({
        ...prev,
        [payload.device_id]: {
          temperature: payload.temperature,
          humidity: payload.humidity
        }
      }));
    };

    s.on("sensor-data-update", onSensor);
    return () => s.off("sensor-data-update", onSensor);
  }, [selected]);

  // fetch REAL chart data (7 days) when selected changes
  useEffect(() => {
    if (!selected) return;

    let alive = true;

    (async () => {
      try {
        const [sensor, larva] = await Promise.all([
          api.getPublicChartData({ deviceId: selected, days: 7, granularity: "day" }),
          api.getPublicLarvaDaily({ deviceId: selected, days: 7, tz: "Asia/Jakarta" })
        ]);

        if (!alive) return;

        // sensor chart
        const sensorRows = Array.isArray(sensor) ? sensor : [];
        const sLabels = sensorRows.map((r) => labelFromYYYYMMDD(r.timestamp));
        const sTemp = sensorRows.map((r) => (Number.isFinite(Number(r.avgTemp)) ? Number(r.avgTemp) : 0));
        const sHum = sensorRows.map((r) => (Number.isFinite(Number(r.avgHumidity)) ? Number(r.avgHumidity) : 0));

        // larva daily
        const larvaSeries = Array.isArray(larva?.series) ? larva.series : [];
        const lLabels = larvaSeries.map((r) => labelFromYYYYMMDD(r.date));
        const lVals = larvaSeries.map((r) => Number(r.totalLarva || 0));

        // sink labels: pakai larva labels kalau sensor kosong, atau sebaliknya
        const finalLabels = lLabels.length ? lLabels : sLabels;

        setLabels7(finalLabels);
        setTemp7(sTemp.length ? sTemp : new Array(finalLabels.length).fill(0));
        setHum7(sHum.length ? sHum : new Array(finalLabels.length).fill(0));
        setLarva7(lVals.length ? lVals : new Array(finalLabels.length).fill(0));
      } catch (e) {
        console.error(e);
        toast.error("Gagal memuat trend 7 hari (DB).");
        setLabels7([]);
        setTemp7([]);
        setHum7([]);
        setLarva7([]);
      }
    })();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return devices;
    return devices.filter((d) => {
      const a = String(d?.device_id || "").toLowerCase();
      const b = String(d?.location || "").toLowerCase();
      return a.includes(t) || b.includes(t);
    });
  }, [devices, q]);

  const selectedDevice = useMemo(() => devices.find((d) => d.device_id === selected), [devices, selected]);

  const latestTemp = live[selected]?.temperature ?? (temp7.length ? temp7[temp7.length - 1] : null);
  const latestHum = live[selected]?.humidity ?? (hum7.length ? hum7[hum7.length - 1] : null);
  const latestLarva = larva7.length ? larva7[larva7.length - 1] : null;

  const avgLarva = useMemo(() => {
    if (!larva7?.length) return 0;
    const s = larva7.reduce((a, b) => a + (Number(b) || 0), 0);
    return Math.round(s / larva7.length);
  }, [larva7]);

  const risk = useMemo(() => riskFromLarvae(avgLarva), [avgLarva]);
  const AlertIcon = Icons?.AlertTriangle || Icons?.Shield || Icons?.Activity;

  return (
    <div>
      <GlassCard>
        <SectionTitle kicker="Monitoring" title="Monitoring Device" />

        <div className="mon-wrap" style={{ display: "grid", gridTemplateColumns: "0.92fr 1.08fr", gap: 14 }}>
          {/* LEFT */}
          <MiniCard>
            <div style={{ fontWeight: 800, marginBottom: 10 }}>Daftar perangkat</div>

            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search device / lokasi..."
              style={{
                width: "100%",
                borderRadius: 14,
                border: "1px solid var(--stroke)",
                background: "rgba(0,0,0,0.12)",
                color: "var(--text)",
                padding: "12px 14px",
                outline: "none",
                marginBottom: 10
              }}
            />

            <div style={{ display: "grid", gap: 10 }}>
              {filtered.map((d) => {
                const isSel = d.device_id === selected;
                const tone = d.active ? "good" : "warn";

                return (
                  <div
                    key={d.device_id}
                    style={{
                      border: "1px solid var(--stroke)",
                      background: isSel ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.03)",
                      borderRadius: 18,
                      padding: 12,
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      alignItems: "center"
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                        <div style={{ fontWeight: 800 }}>{d.device_id}</div>
                        <Badge tone={tone}>{d.active ? "Aktif" : "Offline"}</Badge>
                      </div>
                      <div style={{ color: "var(--muted2)", fontSize: 12, marginTop: 6 }}>
                        {d.location || "Unknown"} • Last seen: {safeFmt(d.lastSeen)}
                      </div>
                    </div>

                    <button
                      onClick={() => setSelected(d.device_id)}
                      style={{
                        borderRadius: 14,
                        border: "1px solid var(--stroke)",
                        background: "rgba(255,255,255,0.85)",
                        color: "rgba(10,20,40,0.95)",
                        padding: "10px 14px",
                        fontWeight: 800,
                        cursor: "pointer"
                      }}
                    >
                      View
                    </button>
                  </div>
                );
              })}
            </div>

            <div style={{ marginTop: 12, color: "var(--muted2)", fontSize: 12, lineHeight: 1.4 }}>
              Monitoring publik menampilkan ringkasan & trend dari database.
            </div>
          </MiniCard>

          {/* RIGHT */}
          <div style={{ display: "grid", gap: 12 }}>
            <MiniCard>
              <div style={{ fontWeight: 800, marginBottom: 10 }}>Ringkasan perangkat</div>

              {!selectedDevice ? (
                <div style={{ color: "var(--muted)" }}>Pilih perangkat di sebelah kiri.</div>
              ) : (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 12 }}>
                    <Stat title="Device" value={selectedDevice.device_id} />
                    <Stat title="Lokasi" value={selectedDevice.location || "Unknown"} />
                    <Stat title="Status" value={selectedDevice.active ? "Aktif" : "Offline"} />
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(3, minmax(0,1fr))",
                      gap: 12,
                      marginTop: 12
                    }}
                  >
                    <Stat title="Suhu (°C)" value={latestTemp ?? "-"} hint="Realtime" />
                    <Stat title="Kelembapan (%)" value={latestHum ?? "-"} hint="Realtime" />
                    <Stat title="Rata-rata jentik" value={avgLarva} hint="Average Today" />
                  </div>

                  <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                    <Badge tone={risk.tone}>
                      <AlertIcon size={14} />
                      <span>Risk: {risk.label}</span>
                    </Badge>

                    <ShimmerButton onClick={() => nav("/map")} style={{ padding: "10px 14px" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                        <Icons.Map size={16} /> Lihat Map
                      </span>
                    </ShimmerButton>

                    <button
                      onClick={() => toast.info("Trend 7 hari diambil dari Database (SensorData & Image processed).")}
                      style={{
                        borderRadius: 14,
                        border: "1px solid var(--stroke)",
                        background: "transparent",
                        color: "var(--text)",
                        padding: "10px 14px",
                        fontWeight: 800,
                        cursor: "pointer",
                        opacity: 0.9
                      }}
                    >
                      Info
                    </button>
                  </div>
                </>
              )}
            </MiniCard>

            {/* ✅ kirim themeMode supaya pasti konsisten */}
            <LineChartCard
              theme={themeMode}
              title="Trend Suhu (7 hari)"
              latestLabel="Latest"
              latestValue={Number.isFinite(Number(latestTemp)) ? `${latestTemp}°C` : "-"}
              labels={labels7}
              values={temp7}
              ySuffix="°C"
              height={160}
            />

            <LineChartCard
              theme={themeMode}
              title="Trend Kelembapan (7 hari)"
              latestLabel="Latest"
              latestValue={Number.isFinite(Number(latestHum)) ? `${latestHum}%` : "-"}
              labels={labels7}
              values={hum7}
              ySuffix="%"
              height={160}
            />

            <LineChartCard
              theme={themeMode}
              title="Trend Jentik (7 hari)"
              latestLabel="Latest"
              latestValue={String(latestLarva ?? "-")}
              labels={labels7}
              values={larva7}
              ySuffix=""
              height={160}
            />
          </div>
        </div>

        <style>{`
          @media (max-width: 980px) {
            .mon-wrap { grid-template-columns: 1fr !important; }
          }
        `}</style>
      </GlassCard>
    </div>
  );
}

function Stat({ title, value, hint }) {
  return (
    <div
      style={{
        border: "1px solid var(--stroke)",
        background: "rgba(255,255,255,0.03)",
        borderRadius: 18,
        padding: 12
      }}
    >
      <div style={{ color: "var(--muted2)", fontSize: 12, fontWeight: 700 }}>{title}</div>
      <div style={{ fontWeight: 800, fontSize: 18, marginTop: 6 }}>{String(value)}</div>
      {hint && <div style={{ color: "var(--muted2)", fontSize: 12, marginTop: 6 }}>{hint}</div>}
    </div>
  );
}
