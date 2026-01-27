import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { GlassCard, MiniCard, ShimmerButton, Badge } from "../components/Cards.jsx";
import { Icons } from "../ui/Icons.jsx";
import { api } from "../lib/api.js";
import { getSocket, subscribeDevice } from "../lib/socket.js";

function useIsMobile(breakpoint = 720) {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= breakpoint);
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= breakpoint);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [breakpoint]);
  return isMobile;
}

export default function Landing() {
  const nav = useNavigate();
  const isMobile = useIsMobile(720);

  const [devices, setDevices] = useState([]);

  // summary backend (sudah gabungan device + reports kalau backend kamu sudah di-patch)
  const [summary, setSummary] = useState({
    totalDevices: 0,
    onlineDevices: 0,
    larvaeToday: 0,
    highRiskZones: 0,
    ts: null
  });

  // ✅ rata-rata telemetry hari ini (dari DB, bukan nunggu socket)
  const [todayAvg, setTodayAvg] = useState({
    temp: "-",
    hum: "-",
    count: 0,
    ts: null
  });

  // fetch devices + subscribe socket (masih dipakai untuk realtime hal lain kalau mau)
  useEffect(() => {
    let s;
    let offSensor;

    (async () => {
      const list = await api.getDevicesPublic();
      setDevices(Array.isArray(list) ? list : []);

      s = getSocket();
      (Array.isArray(list) ? list : []).forEach((x) => subscribeDevice(x.device_id));

      // optional: tetap denger sensor realtime (kalau nanti mau dipakai)
      const onSensor = (_payload) => {
        // no-op sekarang (biar ringan)
      };

      s.on("sensor-data-update", onSensor);
      offSensor = () => s.off("sensor-data-update", onSensor);
    })().catch((e) => {
      console.error("Landing init failed:", e);
      setDevices([]);
    });

    return () => {
      try {
        if (offSensor) offSensor();
      } catch {}
    };
  }, []);

  // fetch summary + todayAvg (db) + refresh interval
  useEffect(() => {
    let alive = true;

    const load = async () => {
      try {
        const [s, t] = await Promise.all([
          api.getPublicSummary(),
          api.getTelemetryTodayAvg()
        ]);
        if (!alive) return;

        setSummary({
          totalDevices: Number(s?.totalDevices || 0),
          onlineDevices: Number(s?.onlineDevices || 0),
          larvaeToday: Number(s?.larvaeToday || 0),
          highRiskZones: Number(s?.highRiskZones || 0),
          ts: s?.ts || new Date().toISOString()
        });

        const avgTemp = Number(t?.avgTemp);
        const avgHum = Number(t?.avgHumidity);

        setTodayAvg({
          temp: Number.isFinite(avgTemp) ? `${Math.round(avgTemp)}°C` : "-",
          hum: Number.isFinite(avgHum) ? `${Math.round(avgHum)}%` : "-",
          count: Number(t?.count || 0),
          ts: t?.ts || new Date().toISOString()
        });
      } catch (e) {
        console.error("Public summary/telemetry failed:", e);
      }
    };

    load();
    const t = setInterval(load, 30_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  return (
    <div className="landing-page">
      <GlassCard className="landing-card" style={{ padding: isMobile ? 14 : 22 }}>
        <div className="landing-grid">
          {/* Left Hero */}
          <div>
            <Badge>
              <Icons.Shield size={14} />
              <span>Stay safe from dengue</span>
            </Badge>

            <h1
              className="landing-title"
              style={{
                margin: "16px 0 10px",
                letterSpacing: -1.2,
                lineHeight: 0.95
              }}
            >
              <span className="aetrap-shiny-title">AE-TRAP</span>
            </h1>

            <div
              style={{
                color: "var(--muted)",
                fontSize: isMobile ? 14 : 18,
                lineHeight: 1.55,
                maxWidth: 620
              }}
            >
              Wujudkan kawasan bebas DBD bersama teknologi cerdas. Pantau kualitas lingkungan, lapor temuan jentik di sekitar Anda, dan pantau peta risiko wilayah secara transparan dan real-time.
            </div>

            <div className="landing-actions">
              <ShimmerButton
                onClick={() => nav("/monitoring")}
                style={{ width: isMobile ? "100%" : "auto", justifyContent: "center" }}
              >
                <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                  <Icons.Activity size={16} /> Open Monitoring
                </span>
              </ShimmerButton>

              <ShimmerButton
                onClick={() => nav("/report")}
                style={{ width: isMobile ? "100%" : "auto", justifyContent: "center" }}
              >
                <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                  <Icons.Report size={16} /> Laporkan Jentik
                </span>
              </ShimmerButton>

              <ShimmerButton
                onClick={() => nav("/map")}
                style={{ width: isMobile ? "100%" : "auto", justifyContent: "center" }}
              >
                <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                  <Icons.Map size={16} /> Open Map
                </span>
              </ShimmerButton>
            </div>

            <div className="landing-feature-grid">
              <MiniCard>
                <div style={{ fontWeight: 800, marginBottom: 6 }}>IoT Capture</div>
                <div style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.4 }}>
                  Ovitrap sensors upload images & telemetry.
                </div>
              </MiniCard>
              <MiniCard>
                <div style={{ fontWeight: 800, marginBottom: 6 }}>YOLO Detection</div>
                <div style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.4 }}>
                  Deteksi jentik + bounding boxes untuk verifikasi.
                </div>
              </MiniCard>
              <MiniCard>
                <div style={{ fontWeight: 800, marginBottom: 6 }}>GIS Mapping</div>
                <div style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.4 }}>
                  Peta zona risiko untuk aksi cepat di lapangan.
                </div>
              </MiniCard>
            </div>
          </div>

          {/* Right Live Preview */}
          <div
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid var(--stroke)",
              borderRadius: "var(--radius)",
              padding: isMobile ? 14 : 18
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 18 }}>Live Preview</div>
                <div style={{ color: "var(--muted2)", fontSize: 13, marginTop: 4 }}>
                  Real metrics
                </div>
              </div>
              <Badge>
                <span>Live</span>
              </Badge>
            </div>

            <div className="landing-stat-grid">
              <StatCard title="Total Devices" value={String(summary.totalDevices)} ts={summary.ts} />
              <StatCard title="Larvae Today" value={String(summary.larvaeToday)} ts={summary.ts} />
              <StatCard title="High-risk Zones" value={String(summary.highRiskZones)} ts={summary.ts} />
              <StatCard title="Online Devices" value={String(summary.onlineDevices)} ts={summary.ts} />
            </div>

            <div
              style={{
                marginTop: 14,
                background: "var(--card2)",
                border: "1px solid var(--stroke)",
                borderRadius: 18,
                padding: 14
              }}
            >
              <div style={{ fontWeight: 800, marginBottom: 6 }}>Average Telemetry (Today)</div>
              <div style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.35 }}>
                Rata Rata Semua Device
              </div>

              <div className="landing-telemetry-grid">
                <StatMini title="Rata-rata Suhu" value={todayAvg.temp} />
                <StatMini title="Rata-rata Kelembapan" value={todayAvg.hum} />
              </div>

              <div style={{ color: "var(--muted2)", fontSize: 12, marginTop: 10 }}>
                Sample hari ini: {todayAvg.count} • Devices terdaftar: {devices.length}
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 18 }}>
          <div style={{ color: "var(--muted2)", fontWeight: 700, fontSize: 12 }}>System Flow</div>
          <div style={{ fontSize: isMobile ? 20 : 26, fontWeight: 800, marginTop: 6, letterSpacing: -0.3 }}>
            How it works
          </div>

          <div className="landing-steps-grid">
            <MiniCard>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontWeight: 800 }}>IoT Capture</div>
                <Badge>Step 1</Badge>
              </div>
              <div style={{ color: "var(--muted)", marginTop: 8, fontSize: 13, lineHeight: 1.4 }}>
                Perangkat kirim data suhu/kelembapan & foto secara berkala.
              </div>
            </MiniCard>

            <MiniCard>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontWeight: 800 }}>YOLO Detection</div>
                <Badge>Step 2</Badge>
              </div>
              <div style={{ color: "var(--muted)", marginTop: 8, fontSize: 13, lineHeight: 1.4 }}>
                YOLO mendeteksi jentik dan menghasilkan count serta bounding box.
              </div>
            </MiniCard>

            <MiniCard>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontWeight: 800 }}>GIS Mapping</div>
                <Badge>Step 3</Badge>
              </div>
              <div style={{ color: "var(--muted)", marginTop: 8, fontSize: 13, lineHeight: 1.4 }}>
                Zona risiko divisualisasikan agar tindakan lapangan lebih cepat.
              </div>
            </MiniCard>
          </div>
        </div>

        <style>{`
          .landing-page{ padding-top: 8px; }
          .landing-title{ font-size: clamp(36px, 9vw, 58px); }
          .landing-grid{
            display: grid;
            grid-template-columns: 1.15fr 0.85fr;
            gap: 18px;
            align-items: stretch;
          }
          .landing-actions{
            display: flex;
            gap: 12px;
            flex-wrap: wrap;
            margin-top: 16px;
          }
          .landing-feature-grid{
            display: grid;
            grid-template-columns: repeat(3, minmax(0,1fr));
            gap: 12px;
            margin-top: 18px;
          }
          .landing-stat-grid{
            display: grid;
            grid-template-columns: repeat(2, minmax(0,1fr));
            gap: 12px;
            margin-top: 14px;
          }
          .landing-telemetry-grid{
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
            margin-top: 12px;
          }
          .landing-steps-grid{
            display: grid;
            grid-template-columns: repeat(3, minmax(0,1fr));
            gap: 12px;
            margin-top: 12px;
          }

          /* Mobile */
          @media (max-width: 720px){
            .landing-grid{ grid-template-columns: 1fr; gap: 14px; }
            .landing-actions{ flex-direction: column; align-items: stretch; }
            .landing-feature-grid{ grid-template-columns: 1fr; }
            .landing-steps-grid{ grid-template-columns: 1fr; }
          }

          .aetrap-shiny-title{
            display:inline-block;
            background: linear-gradient(90deg,
              rgba(255,255,255,0.95),
              rgba(139,210,255,0.95),
              rgba(124,92,255,0.95),
              rgba(255,255,255,0.95)
            );
            background-size: 220% 100%;
            -webkit-background-clip: text;
            background-clip: text;
            color: transparent;
            text-shadow: 0 10px 60px rgba(139,210,255,0.15);
            animation: aetrapShine 3.4s ease-in-out infinite;
          }
          @keyframes aetrapShine{
            0%{ background-position: 0% 50%; }
            50%{ background-position: 100% 50%; }
            100%{ background-position: 0% 50%; }
          }
        `}</style>
      </GlassCard>
    </div>
  );
}

function StatCard({ title, value, ts }) {
  const last = ts ? new Date(ts).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" }) : "-";
  return (
    <div style={{ background: "var(--card2)", border: "1px solid var(--stroke)", borderRadius: 18, padding: 14 }}>
      <div style={{ color: "var(--muted2)", fontSize: 12, fontWeight: 700 }}>{title}</div>
      <div style={{ fontSize: 28, fontWeight: 800, marginTop: 6 }}>{value}</div>
      <div style={{ color: "var(--muted2)", fontSize: 12, marginTop: 8 }}>Last refresh: {last}</div>
    </div>
  );
}

function StatMini({ title, value }) {
  return (
    <div style={{ border: "1px solid var(--stroke)", background: "rgba(255,255,255,0.03)", borderRadius: 16, padding: 12 }}>
      <div style={{ color: "var(--muted2)", fontSize: 12, fontWeight: 700 }}>{title}</div>
      <div style={{ fontSize: 22, fontWeight: 800, marginTop: 6 }}>{value}</div>
    </div>
  );
}
