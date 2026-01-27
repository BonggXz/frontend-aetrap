// src/pages/MonitoringMap.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { GlassCard, SectionTitle, MiniCard, ShimmerButton, Badge } from "../components/Cards.jsx";
import { Icons } from "../ui/Icons.jsx";
import { useToast } from "../ui/Toast.jsx";
import { api } from "../lib/api.js";

function useIsMobile(breakpoint = 980) {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= breakpoint);
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= breakpoint);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [breakpoint]);
  return isMobile;
}

function levelColor(level) {
  const v = String(level || "").toLowerCase();
  if (v === "tinggi") return "#ff6b8a";
  if (v === "sedang") return "#ffd36b";
  return "#59ffa8";
}

function createPinIcon(level = "sedang") {
  const c = levelColor(level);

  const svg = `
  <svg width="34" height="42" viewBox="0 0 34 42" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
        <feDropShadow dx="0" dy="6" stdDeviation="6" flood-color="rgba(0,0,0,0.45)" />
      </filter>
    </defs>

    <path filter="url(#shadow)"
      d="M17 41c7-10 14-17 14-25C31 7.7 24.7 1 17 1S3 7.7 3 16c0 8 7 15 14 25z"
      fill="${c}" />

    <circle cx="17" cy="16" r="7.6" fill="rgba(255,255,255,0.92)"/>
    <circle cx="17" cy="16" r="4.6" fill="rgba(0,0,0,0.22)"/>

    <path d="M7 14c2-6 9-10 16-6" stroke="rgba(255,255,255,0.35)" stroke-width="3" stroke-linecap="round" fill="none"/>
  </svg>`;

  return L.divIcon({
    className: "aetrap-pin",
    html: svg,
    iconSize: [34, 42],
    iconAnchor: [17, 41],
    popupAnchor: [0, -36]
  });
}

// focus dibaca dari query (?focus=lat,lng)
function getFocusFromQuery() {
  try {
    const sp = new URLSearchParams(window.location.search || "");
    const focus = sp.get("focus");
    if (!focus) return null;
    const [lat, lng] = focus.split(",").map(Number);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
    return null;
  } catch {
    return null;
  }
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

// ====== Spatial utils (cluster) ======
function toRad(x) {
  return (x * Math.PI) / 180;
}
function haversineMeters(a, b) {
  const R = 6371000;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const s1 = Math.sin(dLat / 2);
  const s2 = Math.sin(dLng / 2);

  const h = s1 * s1 + Math.cos(lat1) * Math.cos(lat2) * s2 * s2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function riskFromAvgPerDay(avgPerDay) {
  if (!Number.isFinite(avgPerDay)) return "rendah";
  if (avgPerDay >= 18) return "tinggi";
  if (avgPerDay >= 10) return "sedang";
  return "rendah";
}

/**
 * Cluster by distance threshold (simple BFS). O(n^2) tapi aman untuk <= 200 titik.
 * points: [{lat,lng, weightLarva, kind:'device'|'report', ...}]
 */
function clusterPoints(points, radiusM = 1800) {
  const n = points.length;
  const used = new Array(n).fill(false);
  const clusters = [];

  for (let i = 0; i < n; i++) {
    if (used[i]) continue;

    // start BFS cluster
    const q = [i];
    used[i] = true;
    const idxs = [];

    while (q.length) {
      const cur = q.shift();
      idxs.push(cur);

      for (let j = 0; j < n; j++) {
        if (used[j]) continue;
        const d = haversineMeters(points[cur], points[j]);
        if (d <= radiusM) {
          used[j] = true;
          q.push(j);
        }
      }
    }

    clusters.push(idxs.map((k) => points[k]));
  }

  return clusters;
}

function centroid(list) {
  if (!list.length) return { lat: 0, lng: 0 };
  const s = list.reduce(
    (acc, p) => {
      acc.lat += p.lat;
      acc.lng += p.lng;
      return acc;
    },
    { lat: 0, lng: 0 }
  );
  return { lat: s.lat / list.length, lng: s.lng / list.length };
}

function maxDistFromCenter(center, list) {
  let m = 0;
  for (const p of list) {
    m = Math.max(m, haversineMeters(center, p));
  }
  return m;
}

export default function MonitoringMap() {
  const toast = useToast();
  const isMobile = useIsMobile(980);

  const mapRef = useRef(null);
  const mapElRef = useRef(null);
  const youMarkerRef = useRef(null);

  // layers: zones + top markers + you
  const layersRef = useRef({
    zones: { circles: [], circleMarkers: [] },
    topMarkers: { markers: [] }
  });

  const [devices, setDevices] = useState([]);
  const [reports, setReports] = useState([]);

  const DAYS_WINDOW = 14;

  // ====== tuning cluster behavior ======
  const CLUSTER_RADIUS_M = 1800; // <-- ubah ini: 1200-2500 biasanya enak (gabungan "sekitar 2km")
  const MIN_ZONE_RADIUS = 450; // minimum radius zona biar kelihatan
  const EXTRA_RADIUS = 180; // tambahan radius buffer zona

  const MAP_H = useMemo(() => {
    if (!isMobile) return 560;
    const vh = Math.max(520, Math.min(window.innerHeight || 720, 920));
    return Math.max(320, Math.min(420, Math.round(vh * 0.46)));
  }, [isMobile]);

  // ✅ Load risk-map gabungan (devices + reports)
  useEffect(() => {
    (async () => {
      try {
        const data = await api.getPublicRiskMap({
          days: DAYS_WINDOW,
          deviceLimit: 80,
          reportLimit: 80,
          tz: "Asia/Jakarta"
        });

        const dev = Array.isArray(data?.devices) ? data.devices : [];
        const rep = Array.isArray(data?.reports) ? data.reports : [];

        setDevices(dev);
        setReports(rep);

        if (!dev.length && !rep.length) toast.info("Belum ada data device/report untuk risk map.");
      } catch (e) {
        console.error(e);
        toast.error("Gagal load Risk Map (devices + reports).");
        setDevices([]);
        setReports([]);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // init map once
  useEffect(() => {
    if (mapRef.current || !mapElRef.current) return;

    const focus = getFocusFromQuery();
    const start = focus || { lat: -6.2, lng: 106.816666 };

    const map = L.map(mapElRef.current, { zoomControl: true, preferCanvas: true }).setView(
      [start.lat, start.lng],
      focus ? 14 : 11
    );

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors"
    }).addTo(map);

    const legend = L.control({ position: "bottomleft" });
    legend.onAdd = () => {
      const div = L.DomUtil.create("div", "aetrap-legend");
      div.innerHTML = `
        <div style="font-weight:800;margin-bottom:6px">Zona Risiko</div>
        <div style="display:grid;gap:6px;font-size:12px;opacity:.92">
          <div><span style="display:inline-block;width:10px;height:10px;border-radius:999px;background:${levelColor(
            "tinggi"
          )};margin-right:8px"></span> Tinggi</div>
          <div><span style="display:inline-block;width:10px;height:10px;border-radius:999px;background:${levelColor(
            "sedang"
          )};margin-right:8px"></span> Sedang</div>
          <div><span style="display:inline-block;width:10px;height:10px;border-radius:999px;background:${levelColor(
            "rendah"
          )};margin-right:8px"></span> Rendah</div>
        </div>
      `;
      return div;
    };
    legend.addTo(map);

    mapRef.current = map;
  }, []);

  // ====== TOP markers (fix position) ======
  const deviceList = useMemo(() => {
    const arr = Array.isArray(devices) ? [...devices] : [];
    arr.sort((a, b) => Number(b.score || 0) - Number(a.score || 0));
    return arr;
  }, [devices]);

  const reportList = useMemo(() => {
    const arr = Array.isArray(reports) ? [...reports] : [];
    arr.sort((a, b) => Number(b.score || 0) - Number(a.score || 0));
    return arr;
  }, [reports]);

  const topDevices = useMemo(() => deviceList.slice(0, 5), [deviceList]);
  const topReports = useMemo(() => reportList.slice(0, 5), [reportList]);

  // ====== Build points for zoning (devices + reports) ======
  const zonePoints = useMemo(() => {
    const pts = [];

    // Devices: weight pakai totalLarva kalau ada, fallback avgPerDay * days
    for (const d of devices || []) {
      if (!Number.isFinite(d?.lat) || !Number.isFinite(d?.lng)) continue;

      const totalLarva =
        Number.isFinite(Number(d.totalLarva)) ? Number(d.totalLarva) : Number.isFinite(Number(d.avgPerDay)) ? Number(d.avgPerDay) * DAYS_WINDOW : 0;

      pts.push({
        lat: Number(d.lat),
        lng: Number(d.lng),
        kind: "device",
        name: d.name || d.device_id || "Device",
        raw: d,
        // kontribusi ke zona:
        weightLarva: Math.max(0, totalLarva),
        // beberapa info:
        score: d.score ?? null,
        level: String(d.level || "").toLowerCase() || null
      });
    }

    // Reports: jika processed => larva_count ikut, jika belum processed => kontribusi kecil (1) biar tetap ngaruh sedikit
    for (const r of reports || []) {
      if (!Number.isFinite(r?.lat) || !Number.isFinite(r?.lng)) continue;

      let w = 0;
      if (r.processed) {
        w = Number.isFinite(Number(r.larva_count)) ? Number(r.larva_count) : 0;
      } else {
        w = 1; // kontribusi kecil: ada laporan di area tsb
      }

      pts.push({
        lat: Number(r.lat),
        lng: Number(r.lng),
        kind: "report",
        name: r.name ? `Report • ${r.name}` : "Citizen Report",
        raw: r,
        weightLarva: Math.max(0, w),
        score: r.score ?? null,
        level: String(r.level || "").toLowerCase() || null
      });
    }

    return pts;
  }, [devices, reports]);

  // ====== Compute zones (clusters) ======
  const zones = useMemo(() => {
    const pts = zonePoints;
    if (!pts.length) return [];

    const clusters = clusterPoints(pts, CLUSTER_RADIUS_M);

    const z = clusters.map((list, idx) => {
      const c = centroid(list);
      const totalLarva = list.reduce((a, p) => a + (Number(p.weightLarva) || 0), 0);
      const avgPerDay = totalLarva / DAYS_WINDOW;

      const devicesN = list.filter((x) => x.kind === "device").length;
      const reportsN = list.filter((x) => x.kind === "report").length;

      const spread = maxDistFromCenter(c, list);
      // radius zona = sebaran cluster + buffer, clamp biar stabil
      const radius = clamp(Math.round(spread + EXTRA_RADIUS), MIN_ZONE_RADIUS, 1600);

      const level = riskFromAvgPerDay(avgPerDay);

      // score zone: pakai totalLarva + bonus report count sedikit
      const score = totalLarva + reportsN * 2;

      return {
        id: `zone_${idx}`,
        center: c,
        radius,
        totalLarva: Math.round(totalLarva),
        avgPerDay: Math.round(avgPerDay * 10) / 10,
        devicesN,
        reportsN,
        level,
        score,
        items: list
      };
    });

    // sort: paling berisiko dulu
    z.sort((a, b) => Number(b.score || 0) - Number(a.score || 0));
    return z;
  }, [zonePoints]);

  // ====== Render ZONES (one circle per cluster) ======
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const old = layersRef.current.zones;
    old.circles.forEach((x) => map.removeLayer(x));
    old.circleMarkers.forEach((x) => map.removeLayer(x));
    layersRef.current.zones = { circles: [], circleMarkers: [] };

    zones.forEach((z) => {
      const lvl = String(z.level || "sedang").toLowerCase();

      const zone = L.circle([z.center.lat, z.center.lng], {
        radius: z.radius,
        color: levelColor(lvl),
        weight: 2,
        opacity: 0.95,
        fillColor: levelColor(lvl),
        fillOpacity: 0.14
      }).addTo(map);

      const cm = L.circleMarker([z.center.lat, z.center.lng], {
        radius: 7,
        color: levelColor(lvl),
        weight: 2,
        fillColor: "rgba(255,255,255,0.85)",
        fillOpacity: 0.18
      }).addTo(map);

      const popup = `
        <div style="font-weight:900;margin-bottom:6px">Zona Risiko</div>
        <div style="opacity:.9;line-height:1.35">
          <div>Level: <b>${lvl}</b></div>
          <div>Total larva (window ${DAYS_WINDOW}d): <b>${z.totalLarva}</b></div>
          <div>Avg / hari: <b>${z.avgPerDay}</b></div>
          <div>Devices: <b>${z.devicesN}</b> • Reports: <b>${z.reportsN}</b></div>
          <div style="margin-top:6px;font-size:12px;opacity:.85">
            Radius zona: ${z.radius}m • Cluster radius: ${CLUSTER_RADIUS_M}m
          </div>
        </div>
      `;

      zone.bindPopup(popup);
      zone.on("click", () => zone.openPopup());

      layersRef.current.zones.circles.push(zone);
      layersRef.current.zones.circleMarkers.push(cm);
    });
  }, [zones]);

  // ====== Render TOP markers only (devices + reports) ======
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const old = layersRef.current.topMarkers;
    old.markers.forEach((x) => map.removeLayer(x));
    layersRef.current.topMarkers = { markers: [] };

    // top device pins
    topDevices.forEach((p) => {
      if (!Number.isFinite(p?.lat) || !Number.isFinite(p?.lng)) return;

      const lvl = String(p.level || "sedang").toLowerCase();
      const m = L.marker([p.lat, p.lng], { icon: createPinIcon(lvl) }).addTo(map);

      const popup = `
        <div style="font-weight:900;margin-bottom:4px">${p.name || p.device_id}</div>
        <div style="opacity:.88">
          <div>Type: <b>Device (Top)</b></div>
          <div>Level: <b>${lvl}</b> • Score: <b>${p.score ?? "-"}</b></div>
          <div>Avg/hari: <b>${p.avgPerDay ?? "-"}</b> • Total: <b>${p.totalLarva ?? "-"}</b></div>
          <div style="margin-top:6px;font-size:12px;opacity:.85">Marker ini hanya highlight Top 5, tapi tetap masuk hitungan zona.</div>
        </div>
      `;
      m.bindPopup(popup);
      layersRef.current.topMarkers.markers.push(m);
    });

    // top report pins
    topReports.forEach((r) => {
      if (!Number.isFinite(r?.lat) || !Number.isFinite(r?.lng)) return;

      const lvl = String(r.level || "sedang").toLowerCase();
      const m = L.marker([r.lat, r.lng], { icon: createPinIcon(lvl) }).addTo(map);

      const larvaTxt = r.processed ? (Number.isFinite(Number(r.larva_count)) ? String(r.larva_count) : "0") : "Belum diproses";

      const popup = `
        <div style="font-weight:900;margin-bottom:4px">Citizen Report (Top)</div>
        <div style="opacity:.88">
          <div>Nama: <b>${(r.name || "Anonim").replace(/</g, "&lt;")}</b></div>
          <div>Level: <b>${lvl}</b> • Score: <b>${r.score ?? "-"}</b></div>
          <div>Larva: <b>${larvaTxt}</b></div>
          <div style="margin-top:6px;font-size:12px;opacity:.85">Marker ini hanya highlight Top 5, tapi tetap masuk hitungan zona.</div>
        </div>
      `;
      m.bindPopup(popup);
      layersRef.current.topMarkers.markers.push(m);
    });
  }, [topDevices, topReports]);

  // fix resizing
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const t = setTimeout(() => map.invalidateSize(), 120);
    return () => clearTimeout(t);
  }, [isMobile, MAP_H]);

  function focusLatLng(lat, lng, zoom = 14) {
    const map = mapRef.current;
    if (!map) return;
    map.setView([lat, lng], zoom);
  }

  function locate() {
    if (!navigator.geolocation) return toast.error("Browser kamu tidak mendukung GPS.");

    toast.info("Mencari lokasi kamu...");
    navigator.geolocation.getCurrentPosition(
      (g) => {
        const p = { lat: g.coords.latitude, lng: g.coords.longitude };
        const map = mapRef.current;

        if (map) {
          map.setView([p.lat, p.lng], 15);

          if (youMarkerRef.current) {
            youMarkerRef.current.setLatLng([p.lat, p.lng]);
          } else {
            youMarkerRef.current = L.circleMarker([p.lat, p.lng], {
              radius: 10,
              color: "rgba(139,210,255,0.95)",
              weight: 2,
              fillColor: "rgba(139,210,255,0.25)",
              fillOpacity: 0.35
            }).addTo(map);
            youMarkerRef.current.bindPopup("Posisi kamu");
          }
          youMarkerRef.current.openPopup();
        }

        toast.success("Lokasi berhasil didapatkan.");
      },
      (err) => toast.error(err.message || "Gagal mengambil lokasi."),
      { enableHighAccuracy: true, timeout: 12000 }
    );
  }

  const RightActions = (
    <div className="map-actions-stack map-actions-raise">
      <div className="map-badge-row">
        <Badge>
          <Icons.Map size={14} />
          <span>GPS</span>
        </Badge>
      </div>

      <ShimmerButton onClick={locate} className="map-locate-btn">
        <span className="map-locate-inner">
          <Icons.Crosshair size={16} /> Lokasi Saya
        </span>
      </ShimmerButton>
    </div>
  );

  // list: show zones (top 20), plus Top 5 pins section
  const zoneList = useMemo(() => zones.slice(0, 20), [zones]);

  return (
    <div>
      <GlassCard>
        <SectionTitle kicker="Peta" title="Risk Map" right={!isMobile ? RightActions : null} />
        {isMobile ? <div className="map-actions-mobile">{RightActions}</div> : null}

        <div className="aetrap-map-wrap">
          <div className="map-left">
            <div
              ref={mapElRef}
              style={{
                width: "100%",
                height: MAP_H,
                borderRadius: 18,
                overflow: "hidden"
              }}
            />
          </div>

          <MiniCard style={{ height: isMobile ? "auto" : MAP_H }}>
            <div className="map-side-head">
              <div style={{ fontWeight: 900 }}>Ringkasan</div>
              <div style={{ color: "var(--muted2)", fontSize: 12 }}>
                {zones.length} zona • {devices.length} device • {reports.length} report
              </div>
            </div>

            <div className="map-side-desc">
              Klik tombol untuk fokus ke zona. Zona di tentukan berdasarkan jumlah pertumbuhan jentik.
            </div>

            <div
              style={{
                display: "grid",
                gap: 10,
                marginTop: 12,
                overflowY: isMobile ? "visible" : "auto",
                height: isMobile ? "auto" : MAP_H - 110,
                paddingRight: 2
              }}
            >
              {/* ZONES */}
              <div style={{ marginTop: 2, fontWeight: 900, opacity: 0.9 }}>Zona Risiko</div>
              {!zoneList.length ? (
                <div style={{ color: "var(--muted2)", fontSize: 13, lineHeight: 1.45, padding: 8 }}>
                  Belum ada zona. Pastikan device/report punya lat/lng.
                </div>
              ) : (
                zoneList.map((z, idx) => (
                  <div key={z.id} className="map-risk-item">
                    <div className="map-risk-row">
                      <div className="map-risk-title">{idx + 1}. Zona</div>
                      <Badge tone={z.level === "tinggi" ? "bad" : z.level === "sedang" ? "warn" : "good"}>
                        {String(z.level || "").toLowerCase()}
                      </Badge>
                    </div>

                    <div className="map-risk-sub">
                      {Number(z.center.lat).toFixed(4)}, {Number(z.center.lng).toFixed(4)} • Radius: <b>{z.radius}m</b>
                      <br />
                      Total larva: <b>{z.totalLarva}</b> • Avg/hari: <b>{z.avgPerDay}</b>
                      <br />
                      Devices: <b>{z.devicesN}</b> • Reports: <b>{z.reportsN}</b>
                    </div>

                    <div style={{ marginTop: 10 }}>
                      <ShimmerButton onClick={() => focusLatLng(z.center.lat, z.center.lng, 13)} className="map-open-btn">
                        Open Zone
                      </ShimmerButton>
                    </div>
                  </div>
                ))
              )}

              <div style={{ marginTop: 2, fontWeight: 900, opacity: 0.9 }}>Top 5 Devices</div>
              {!topDevices.length ? (
                <div style={{ color: "var(--muted2)", fontSize: 13, lineHeight: 1.45, padding: 8 }}>Tidak ada device.</div>
              ) : (
                topDevices.map((p, idx) => (
                  <div key={p.id || `${p.device_id}_${idx}`} className="map-risk-item">
                    <div className="map-risk-row">
                      <div className="map-risk-title">
                        {idx + 1}. {p.name || p.device_id}
                      </div>
                      <Badge tone={p.level === "tinggi" ? "bad" : p.level === "sedang" ? "warn" : "good"}>
                        {String(p.level || "").toLowerCase()}
                      </Badge>
                    </div>
                    <div className="map-risk-sub">
                      {Number(p.lat).toFixed(4)}, {Number(p.lng).toFixed(4)} • Score: <b>{p.score ?? "-"}</b>
                    </div>
                    <div style={{ marginTop: 10 }}>
                      <ShimmerButton onClick={() => focusLatLng(p.lat, p.lng, 14)} className="map-open-btn">
                        Open Marker
                      </ShimmerButton>
                    </div>
                  </div>
                ))
              )}

              <div style={{ marginTop: 8, fontWeight: 900, opacity: 0.9 }}>Top 5 Reports</div>
              {!topReports.length ? (
                <div style={{ color: "var(--muted2)", fontSize: 13, lineHeight: 1.45, padding: 8 }}>Tidak ada report.</div>
              ) : (
                topReports.map((r, idx) => (
                  <div key={r.id || `${r.report_id}_${idx}`} className="map-risk-item">
                    <div className="map-risk-row">
                      <div className="map-risk-title">{idx + 1}. Report • {r.name || "Anonim"}</div>
                      <Badge tone={r.level === "tinggi" ? "bad" : r.level === "sedang" ? "warn" : "good"}>
                        {String(r.level || "").toLowerCase()}
                      </Badge>
                    </div>
                    <div className="map-risk-sub">
                      {Number(r.lat).toFixed(4)}, {Number(r.lng).toFixed(4)} • Score: <b>{r.score ?? "-"}</b> • Larva:{" "}
                      <b>{r.processed ? (Number.isFinite(Number(r.larva_count)) ? r.larva_count : 0) : "Belum diproses"}</b>
                    </div>
                    <div style={{ marginTop: 10 }}>
                      <ShimmerButton onClick={() => focusLatLng(r.lat, r.lng, 14)} className="map-open-btn">
                        Open Marker
                      </ShimmerButton>
                    </div>
                  </div>
                ))
              )}
            </div>
          </MiniCard>
        </div>

        <style>{`
          .aetrap-pin{ background: transparent !important; border: none !important; }

          .aetrap-legend{
            padding:10px 12px;
            border-radius:14px;
            border:1px solid rgba(255,255,255,0.14);
            background: rgba(10,18,32,0.65);
            color: rgba(255,255,255,0.92);
            backdrop-filter: blur(10px);
            box-shadow: 0 18px 60px rgba(0,0,0,0.35);
          }
          html[data-theme="light"] .aetrap-legend{
            background: rgba(255,255,255,0.75);
            color: rgba(10,20,40,0.92);
            border:1px solid rgba(10,20,40,0.12);
          }

          .map-actions-stack{
            display:flex;
            flex-direction: column;
            align-items:flex-end;
            gap: 8px;
            white-space: nowrap;
          }
          .map-actions-raise{ margin-top: -10px; }
          .map-badge-row{ display:flex; justify-content:flex-end; width: 100%; }

          .map-locate-btn{
            padding: 8px 10px !important;
            min-height: 34px;
            border-radius: 14px;
          }
          .map-locate-inner{
            display:inline-flex;
            align-items:center;
            gap:8px;
            font-weight: 900;
            font-size: 12px;
            line-height: 1;
          }

          .aetrap-map-wrap{
            display:grid;
            grid-template-columns: 1.25fr 0.75fr;
            gap: 14px;
            align-items: stretch;
            margin-top: 14px;
          }

          .map-left{ display:grid; grid-template-rows: auto 1fr; }
          .map-note{
            color: var(--muted2);
            font-size: 12px;
            margin-top: 10px;
            line-height: 1.4;
          }

          .map-side-head{
            display:flex;
            align-items:baseline;
            justify-content:space-between;
            gap: 10px;
            margin-bottom: 6px;
          }
          .map-side-desc{
            color: var(--muted);
            font-size: 13px;
            line-height: 1.45;
          }

          .map-risk-item{
            border: 1px solid var(--stroke);
            background: rgba(255,255,255,0.03);
            border-radius: 16px;
            padding: 12px;
          }
          .map-risk-row{
            display:flex;
            justify-content:space-between;
            gap:10px;
            align-items:center;
          }
          .map-risk-title{
            font-weight: 900;
            min-width: 0;
            line-height: 1.25;
          }
          .map-risk-sub{
            color: var(--muted2);
            font-size: 12px;
            margin-top: 6px;
            line-height: 1.35;
          }
          .map-open-btn{
            width: 100%;
            padding: 10px 12px !important;
            min-height: 36px;
            font-weight: 900;
            font-size: 12px;
          }

          .map-actions-mobile{
            margin-top: 10px;
            display:flex;
            justify-content:flex-end;
          }
          .map-actions-mobile .map-actions-raise{ margin-top: 0; }

          @media (max-width: 980px){
            .aetrap-map-wrap{ grid-template-columns: 1fr; }
          }

          @media (max-width: 520px){
            .map-actions-mobile{ justify-content:stretch; }
            .map-actions-stack{ width: 100%; align-items: stretch; }
            .map-badge-row{ justify-content:flex-start; }
            .map-locate-btn{ width: 100%; }
          }
        `}</style>
      </GlassCard>
    </div>
  );
}
