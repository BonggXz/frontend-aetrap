import React, { useEffect, useMemo, useState } from "react";
import { GlassCard, SectionTitle, MiniCard, Badge, ShimmerButton } from "../components/Cards.jsx";
import { Icons } from "../ui/Icons.jsx";
import { api } from "../lib/api.js";
import { formatDateTime } from "../lib/utils.js";
import { getSocket, subscribeDevice } from "../lib/socket.js";

function riskFromLarvae(avg) {
  if (avg >= 30) return { label: "Tinggi", tone: "bad" };
  if (avg >= 12) return { label: "Sedang", tone: "warn" };
  return { label: "Rendah", tone: "good" };
}

function genSeries(days = 7, base = 26, swing = 4) {
  const arr = [];
  const now = Date.now();
  for (let i = days - 1; i >= 0; i--) {
    const t = new Date(now - i * 86400000);
    const noise = (Math.random() - 0.5) * swing;
    arr.push({ x: t.toISOString().slice(5, 10), y: Math.max(0, base + noise) });
  }
  return arr;
}

function Sparkline({ data, height = 46 }) {
  const w = 220;
  const h = height;
  const xs = data.map((d) => d.y);
  const min = Math.min(...xs);
  const max = Math.max(...xs);
  const pad = 4;

  const pts = data
    .map((d, i) => {
      const x = (i / (data.length - 1)) * (w - pad * 2) + pad;
      const y = h - pad - ((d.y - min) / (max - min || 1)) * (h - pad * 2);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} style={{ display: "block", opacity: 0.95 }}>
      <polyline fill="none" stroke="currentColor" strokeWidth="2.2" points={pts} />
      <circle
        cx={(w - pad * 2) + pad}
        cy={h - pad - ((data[data.length - 1].y - min) / (max - min || 1)) * (h - pad * 2)}
        r="3.2"
        fill="currentColor"
      />
    </svg>
  );
}

export default function MonitoringOverview() {
  const [devices, setDevices] = useState([]);
  const [selected, setSelected] = useState(null);
  const [q, setQ] = useState("");
  const [live, setLive] = useState({}); // device_id -> latest reading

  const demoDevices = useMemo(
    () => [
      {
        device_id: "AE-TRAP-001",
        name: "AE-TRAP Device",
        location: "Demo Area",
        lastSeen: new Date().toISOString(),
        active: true,
        settings: { captureInterval: 30 }
      },
      {
        device_id: "AE-TRAP-002",
        name: "AE-TRAP Device",
        location: "Kebon Jeruk",
        lastSeen: new Date(Date.now() - 50 * 60 * 1000).toISOString(),
        active: true
      },
      {
        device_id: "AE-TRAP-003",
        name: "AE-TRAP Device",
        location: "Cengkareng",
        lastSeen: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        active: false
      }
    ],
    []
  );

  useEffect(() => {
    (async () => {
      try {
        const d = await api.getDevicesPublic();
        const list = Array.isArray(d) && d.length ? d : demoDevices;
        setDevices(list);
        setSelected(list[0]?.device_id || null);
      } catch {
        setDevices(demoDevices);
        setSelected(demoDevices[0]?.device_id || null);
      }
    })();
  }, [demoDevices]);

  useEffect(() => {
    if (!selected) return;
    const s = getSocket();
    subscribeDevice(selected);

    const onSensor = (payload) => {
      setLive((prev) => ({ ...prev, [payload.device_id]: payload }));
    };

    s.on("sensor-data-update", onSensor);
    return () => s.off("sensor-data-update", onSensor);
  }, [selected]);

  const filtered = useMemo(() => {
    const key = q.trim().toLowerCase();
    if (!key) return devices;
    return devices.filter((d) => (d.device_id || "").toLowerCase().includes(key) || (d.location || "").toLowerCase().includes(key));
  }, [devices, q]);

  const selectedDevice = devices.find((d) => d.device_id === selected);
  const liveRow = selectedDevice ? live[selectedDevice.device_id] : null;

  // demo chart data (nanti bisa ganti pakai API history beneran)
  const tempSeries = useMemo(() => genSeries(7, 28, 5), [selected]);
  const humSeries = useMemo(() => genSeries(7, 72, 10), [selected]);
  const larvaeSeries = useMemo(() => genSeries(7, 14, 18), [selected]);

  const larvaeAvg = useMemo(() => {
    const avg = larvaeSeries.reduce((a, b) => a + b.y, 0) / larvaeSeries.length;
    return Math.round(avg);
  }, [larvaeSeries]);

  const risk = riskFromLarvae(larvaeAvg);

  return (
    <div>
      <GlassCard>
        <SectionTitle
          kicker="Monitoring (IoT Devices)"
          title="Device Monitoring"
          right={
            <Badge>
              <Icons.Activity size={14} />
              <span>Near real-time</span>
            </Badge>
          }
        />

        <div className="aetrap-grid-monitor" style={{ display: "grid", gap: 14 }}>
          {/* LEFT: list */}
          <MiniCard>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", marginBottom: 10 }}>
              <div style={{ fontWeight: 800 }}>Daftar perangkat</div>
              <div style={{ color: "var(--muted2)", fontSize: 12, fontWeight: 600 }}>{filtered.length} device</div>
            </div>

            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search device id / lokasi..."
              style={{
                width: "100%",
                borderRadius: 14,
                border: "1px solid var(--stroke)",
                background: "rgba(0,0,0,0.12)",
                color: "var(--text)",
                padding: "12px 14px",
                outline: "none",
                marginBottom: 12
              }}
            />

            <div style={{ display: "grid", gap: 10 }}>
              {filtered.map((d) => {
                const isActive = d.active;
                const isSel = selected === d.device_id;
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
                        <Badge tone={isActive ? "good" : "warn"}>{isActive ? "Aktif" : "Offline"}</Badge>
                      </div>
                      <div style={{ color: "var(--muted2)", fontSize: 12, marginTop: 6 }}>
                        {d.location || "Unknown"} • Last seen: {formatDateTime(d.lastSeen)}
                      </div>
                    </div>

                    <ShimmerButton onClick={() => setSelected(d.device_id)} style={{ padding: "10px 12px" }}>
                      View
                    </ShimmerButton>
                  </div>
                );
              })}
            </div>

            <div style={{ marginTop: 12, color: "var(--muted2)", fontSize: 12, lineHeight: 1.4 }}>
              Monitoring publik hanya untuk perangkat IoT. Management detail ada di admin.
            </div>
          </MiniCard>

          {/* RIGHT: overview + charts */}
          <MiniCard>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <div style={{ fontWeight: 800 }}>Ringkasan perangkat</div>
              {selectedDevice && (
                <Badge tone={risk.tone}>
                  <Icons.Alert size={14} />
                  <span>Risk: {risk.label}</span>
                </Badge>
              )}
            </div>

            {!selectedDevice ? (
              <div style={{ color: "var(--muted)" }}>Pilih perangkat di sebelah kiri.</div>
            ) : (
              <>
                <div className="aetrap-grid-2" style={{ display: "grid", gap: 12 }}>
                  <Stat title="Device" value={selectedDevice.device_id} />
                  <Stat title="Lokasi" value={selectedDevice.location || "Unknown"} />

                  <Stat title="Suhu (°C)" value={liveRow?.temperature ?? "-"} hint="Real-time (socket)" />
                  <Stat title="Kelembapan (%)" value={liveRow?.humidity ?? "-"} hint="Real-time (socket)" />

                  <Stat title="Jumlah jentik/hari" value={`${larvaeAvg}`} hint="Rata-rata 7 hari (demo)" />
                  <Stat title="Status" value={selectedDevice.active ? "Aktif" : "Offline"} />
                </div>

                <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
                  <ChartCard title="Trend Suhu (7 hari)" icon={Icons.Thermo} data={tempSeries} suffix="°C" />
                  <ChartCard title="Trend Kelembapan (7 hari)" icon={Icons.Droplet} data={humSeries} suffix="%" />
                  <ChartCard title="Trend Jentik (7 hari)" icon={Icons.Bug} data={larvaeSeries} suffix="" />
                </div>

                <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <ShimmerButton
                    onClick={() => {
                      // nanti bisa arahkan ke map focus
                      window.location.hash = "#/map";
                    }}
                    style={{ padding: "10px 14px" }}
                    variant="ghost"
                  >
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                      <Icons.Map size={16} /> Lihat di Map
                    </span>
                  </ShimmerButton>
                </div>

                <div style={{ marginTop: 10, color: "var(--muted2)", fontSize: 12 }}>
                  Chart sekarang lengkap (suhu/kelembapan/jentik). Nanti tinggal ganti sumber data ke endpoint history beneran.
                </div>
              </>
            )}
          </MiniCard>
        </div>
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
      <div style={{ color: "var(--muted2)", fontSize: 12, fontWeight: 600 }}>{title}</div>
      <div style={{ fontWeight: 800, fontSize: 18, marginTop: 6 }}>{String(value)}</div>
      {hint && <div style={{ color: "var(--muted2)", fontSize: 12, marginTop: 6 }}>{hint}</div>}
    </div>
  );
}

function ChartCard({ title, icon: Icon, data, suffix }) {
  const last = data?.[data.length - 1]?.y ?? 0;
  return (
    <div
      style={{
        border: "1px solid var(--stroke)",
        background: "rgba(255,255,255,0.03)",
        borderRadius: 18,
        padding: 12,
        display: "grid",
        gap: 10
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
          <Icon size={16} />
          <div style={{ fontWeight: 700 }}>{title}</div>
        </div>
        <div style={{ color: "var(--muted2)", fontSize: 12, fontWeight: 600 }}>
          Latest: <b style={{ color: "var(--text)" }}>{Math.round(last)}{suffix}</b>
        </div>
      </div>

      <div style={{ color: "rgba(255,255,255,0.85)" }}>
        <Sparkline data={data} />
      </div>
    </div>
  );
}
