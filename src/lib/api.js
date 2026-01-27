// src/lib/api.js
import axios from "axios";
import { getAuth, clearAuth } from "./storage.js";

export const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

const http = axios.create({
  baseURL: API_BASE,
  timeout: 30000
});

// attach JWT automatically (protected routes)
http.interceptors.request.use((config) => {
  const auth = getAuth();
  if (auth?.token) config.headers.Authorization = `Bearer ${auth.token}`;
  return config;
});

// auto logout if token invalid/expired
http.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err?.response?.status;
    if (status === 401 || status === 403) {
      try {
        clearAuth();
      } catch {}
    }
    return Promise.reject(err);
  }
);

function errMsg(e, fallback = "Request gagal") {
  return e?.response?.data?.message || e?.response?.data?.error || e?.message || fallback;
}

/* ===================== AUTH ===================== */
// accept login(username,password) OR login({username,password})
async function login(a, b) {
  const username = typeof a === "object" ? a?.username : a;
  const password = typeof a === "object" ? a?.password : b;

  try {
    const { data } = await http.post("/api/login", { username, password });
    return data; // { token, user }
  } catch (e) {
    const err = new Error(errMsg(e, "Login gagal"));
    err.status = e?.response?.status;
    throw err;
  }
}

async function register(payload) {
  try {
    const { data } = await http.post("/api/register", payload);
    return data;
  } catch (e) {
    const err = new Error(errMsg(e, "Register gagal"));
    err.status = e?.response?.status;
    throw err;
  }
}

/* ===================== PUBLIC (NO AUTH) ===================== */
async function getDevicesPublic() {
  try {
    const { data } = await http.get("/api/public/devices");
    return data;
  } catch (e) {
    const err = new Error(errMsg(e, "Gagal load public devices"));
    err.status = e?.response?.status;
    throw err;
  }
}

async function getPublicSummary() {
  try {
    const { data } = await http.get("/api/public/summary");
    return data;
  } catch (e) {
    const err = new Error(errMsg(e, "Gagal load summary"));
    err.status = e?.response?.status;
    throw err;
  }
}

/**
 * Rata-rata telemetry hari ini dari DB
 * GET /api/public/telemetry/today-avg
 */
async function getTelemetryTodayAvg(params = {}) {
  try {
    const { data } = await http.get("/api/public/telemetry/today-avg", { params });
    return data;
  } catch (e) {
    const err = new Error(errMsg(e, "Gagal load telemetry hari ini"));
    err.status = e?.response?.status;
    throw err;
  }
}

async function getPublicChartData(params = {}) {
  try {
    const { data } = await http.get("/api/public/analytics/chart-data", { params });
    return data;
  } catch (e) {
    const err = new Error(errMsg(e, "Gagal load chart data"));
    err.status = e?.response?.status;
    throw err;
  }
}

async function getPublicLarvaDaily(params = {}) {
  try {
    const { data } = await http.get("/api/public/stats/jentik/daily", { params });
    return data; // { deviceId, days, series: [{date,totalLarva,images}] }
  } catch (e) {
    const err = new Error(errMsg(e, "Gagal load larva daily"));
    err.status = e?.response?.status;
    throw err;
  }
}

async function getPublicRiskTop(params = {}) {
  try {
    const { data } = await http.get("/api/public/risk/top", { params });
    return data; // { days, limit, tz, points }
  } catch (e) {
    const err = new Error(errMsg(e, "Gagal load risk top"));
    err.status = e?.response?.status;
    throw err;
  }
}

async function getPublicRiskMap(params = {}) {
  try {
    const { data } = await http.get("/api/public/risk/map", { params });
    return data; // { days, tz, devices, reports }
  } catch (e) {
    const err = new Error(errMsg(e, "Gagal load risk map"));
    err.status = e?.response?.status;
    throw err;
  }
}

async function getPublicCitizenReports(params = {}) {
  try {
    const { data } = await http.get("/api/public/citizen-reports", { params });
    return data; // { reports, totalCount, totalPages, currentPage, days }
  } catch (e) {
    const err = new Error(errMsg(e, "Gagal load citizen reports (public)"));
    err.status = e?.response?.status;
    throw err;
  }
}

/**
 * Submit citizen report
 * POST /api/public/citizen-reports
 * Bisa FormData atau JSON
 */
async function submitCitizenReport(payload) {
  try {
    const isForm = typeof FormData !== "undefined" && payload instanceof FormData;
    const { data } = await http.post("/api/public/citizen-reports", payload, {
      headers: isForm ? { "Content-Type": "multipart/form-data" } : undefined
    });
    return data;
  } catch (e) {
    const err = new Error(errMsg(e, "Gagal kirim laporan"));
    err.status = e?.response?.status;
    throw err;
  }
}

/* ===================== ADMIN (PROTECTED) ===================== */
async function getUsers(params = {}) {
  try {
    const { data } = await http.get("/api/admin/users", { params });
    return data;
  } catch (e) {
    const err = new Error(errMsg(e, "Gagal load users"));
    err.status = e?.response?.status;
    throw err;
  }
}

async function updateUser(userId, patch) {
  try {
    const { data } = await http.put(`/api/admin/users/${userId}`, patch);
    return data;
  } catch (e) {
    const err = new Error(errMsg(e, "Gagal update user"));
    err.status = e?.response?.status;
    throw err;
  }
}

async function deleteUser(userId) {
  try {
    const { data } = await http.delete(`/api/admin/users/${userId}`);
    return data;
  } catch (e) {
    const err = new Error(errMsg(e, "Gagal hapus user"));
    err.status = e?.response?.status;
    throw err;
  }
}

async function getAdminCitizenReports({ limit = 100, page = 1, processed } = {}) {
  const params = { limit, page };
  if (processed !== undefined) params.processed = processed;

  try {
    const { data } = await http.get("/api/admin/citizen-reports", { params });
    return data; // { reports, totalCount, totalPages, currentPage }
  } catch (e) {
    const err = new Error(errMsg(e, "Gagal load citizen reports"));
    err.status = e?.response?.status;
    throw err;
  }
}

/* ===================== DEVICES (PROTECTED) ===================== */
async function getDevices() {
  try {
    const { data } = await http.get("/api/devices");
    return data;
  } catch (e) {
    const err = new Error(errMsg(e, "Gagal load devices"));
    err.status = e?.response?.status;
    throw err;
  }
}

/**
 * Merge protected + public (lat/lng biasanya dari public)
 */
async function getDevicesMerged() {
  const [prot, pub] = await Promise.all([
    http.get("/api/devices").then((r) => r.data).catch(() => []),
    http.get("/api/public/devices").then((r) => r.data).catch(() => [])
  ]);

  const a = Array.isArray(prot) ? prot : [];
  const b = Array.isArray(pub) ? pub : [];

  const mapPub = new Map(b.map((x) => [x.device_id, x]));

  return a.map((x) => {
    const p = mapPub.get(x.device_id) || {};
    return {
      ...p,
      ...x,
      lat: x.lat ?? p.lat ?? null,
      lng: x.lng ?? p.lng ?? null
    };
  });
}

async function updateDevice(deviceId, patch) {
  try {
    const { data } = await http.put(`/api/devices/${deviceId}`, patch);
    return data?.device ? { ok: true, device: data.device } : { ok: true, device: data };
  } catch (e) {
    const err = new Error(errMsg(e, "Gagal update device"));
    err.status = e?.response?.status;
    throw err;
  }
}

/* ===================== IMAGES (PROTECTED) ===================== */
async function getImages(params = {}) {
  try {
    const { data } = await http.get("/api/images", { params });
    return data; // {images,...} atau array
  } catch (e) {
    const err = new Error(errMsg(e, "Gagal load images"));
    err.status = e?.response?.status;
    throw err;
  }
}

async function deleteImage(imageId) {
  try {
    const { data } = await http.delete(`/api/images/${imageId}`);
    return data;
  } catch (e) {
    const err = new Error(errMsg(e, "Gagal hapus image"));
    err.status = e?.response?.status;
    throw err;
  }
}

/* ===================== SENSOR DATA (PROTECTED) ===================== */
async function getSensorData(deviceId, params = {}) {
  try {
    const { data } = await http.get(`/api/sensor-data/${deviceId}`, { params });
    return data;
  } catch (e) {
    const err = new Error(errMsg(e, "Gagal load sensor data"));
    err.status = e?.response?.status;
    throw err;
  }
}

/* ===================== LARVA (YOLO IMAGE) (PROTECTED) ===================== */
/**
 * IMPORTANT:
 * Larva_count bukan dari sensor-data, tapi dari Image.processedData.summary.larva_count
 * Endpoint backend sudah ada:
 * GET /api/stats/jentik/daily?deviceId=...&days=...&tz=...
 */
async function getLarvaDailyProtected(params = {}) {
  try {
    const { data } = await http.get("/api/stats/jentik/daily", { params });
    return data; // { deviceId, days, series:[{date,totalLarva,images}] }
  } catch (e) {
    const err = new Error(errMsg(e, "Gagal load larva daily (protected)"));
    err.status = e?.response?.status;
    throw err;
  }
}

/* ===================== USER (SELF) SETTINGS (PROTECTED) ===================== */
async function getMyProfile() {
  try {
    const { data } = await http.get("/api/user/profile");
    return data;
  } catch (e) {
    const err = new Error(errMsg(e, "Gagal load profile"));
    err.status = e?.response?.status;
    throw err;
  }
}

async function updateMyProfile(patch) {
  try {
    const { data } = await http.put("/api/user/profile", patch);
    return data;
  } catch (e) {
    const err = new Error(errMsg(e, "Gagal update profile"));
    err.status = e?.response?.status;
    throw err;
  }
}

async function changeMyPassword(currentPassword, newPassword) {
  try {
    const { data } = await http.put("/api/user/password", { currentPassword, newPassword });
    return data;
  } catch (e) {
    const err = new Error(errMsg(e, "Gagal ganti password"));
    err.status = e?.response?.status;
    throw err;
  }
}

/* ===================== COMPOSED ===================== */
function clampInt(n, a, b) {
  const x = parseInt(n);
  if (!Number.isFinite(x)) return a;
  return Math.max(a, Math.min(b, x));
}

function daysBetweenISO(fromISO, toISO) {
  try {
    const a = new Date(fromISO);
    const b = new Date(toISO);
    const ms = Math.abs(b.getTime() - a.getTime());
    const d = Math.ceil(ms / (24 * 60 * 60 * 1000));
    return Math.max(1, Math.min(d, 120));
  } catch {
    return 7;
  }
}

/**
 * getDeviceOverview sekarang ambil:
 * - sensor readings (temp/hum) dari /api/sensor-data/:deviceId
 * - larva daily (YOLO) dari /api/stats/jentik/daily
 *
 * Jadi larva tidak lagi ngandelin readings (karena memang beda sumber).
 */
async function getDeviceOverview(deviceId, { rangeDays = 7, from, to, limit, tz = "Asia/Jakarta" } = {}) {
  try {
    const devices = await getDevices().catch(() => []);
    const dev = (Array.isArray(devices) ? devices : []).find((x) => x.device_id === deviceId) || null;

    const params = {};
    if (limit != null) params.limit = limit;

    if (from) params.from = from;
    if (to) params.to = to;

    // default window by rangeDays
    if (!from && !to && rangeDays) {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - Number(rangeDays));
      params.from = start.toISOString();
      params.to = end.toISOString();
    }

    // 1) sensor readings
    const data = await getSensorData(deviceId, params).catch(() => []);
    const readingsRaw = Array.isArray(data) ? data : data?.readings || [];

    const readings = readingsRaw
      .map((r) => ({ ...r, ts: r.ts || r.timestamp || r.createdAt || r.time }))
      .filter((r) => r.ts);

    // 2) larva daily (YOLO images)
    const larvaDays =
      from || to
        ? daysBetweenISO(params.from || new Date().toISOString(), params.to || new Date().toISOString())
        : clampInt(rangeDays, 1, 120);

    const larvaDaily = await getLarvaDailyProtected({
      deviceId,
      days: larvaDays,
      tz
    }).catch(() => ({ deviceId, days: larvaDays, series: [] }));

    const larvaSeries = Array.isArray(larvaDaily?.series) ? larvaDaily.series : [];
    const larvaTotal = larvaSeries.reduce((s, x) => s + (Number(x?.totalLarva) || 0), 0);

    const nums = (k) => readings.map((x) => Number(x[k])).filter((v) => Number.isFinite(v));
    const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);

    const avgTemp = avg(nums("temperature"));
    const avgHum = avg(nums("humidity"));

    return {
      device: dev,
      readings, // temp/hum timeseries
      larvaDaily: {
        deviceId: larvaDaily?.deviceId ?? deviceId,
        days: larvaDaily?.days ?? larvaDays,
        series: larvaSeries // [{date,totalLarva,images}]
      },
      summary: {
        avgTemp: avgTemp == null ? "-" : Math.round(avgTemp * 10) / 10,
        avgHum: avgHum == null ? "-" : Math.round(avgHum * 10) / 10,
        larvaTotal,
        dataPoints: readings.length
      },
      from: params.from || null,
      to: params.to || null
    };
  } catch (e) {
    const err = new Error(errMsg(e, "Gagal load device overview"));
    err.status = e?.response?.status;
    throw err;
  }
}

async function exportDeviceData(deviceId, { rangeDays = 7, from, to } = {}) {
  const ov = await getDeviceOverview(deviceId, { rangeDays, from, to });

  const rows = (ov.readings || []).map((r) => ({
    ts: r.ts,
    temperature: r.temperature ?? "",
    humidity: r.humidity ?? "",
    device_id: deviceId
  }));

  // larva daily (YOLO)
  const larvaRows = (ov.larvaDaily?.series || []).map((x) => ({
    date: x.date,
    totalLarva: x.totalLarva ?? 0,
    images: x.images ?? 0,
    device_id: deviceId
  }));

  const esc = (v) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const toCSV = (arr) => {
    const headers = Object.keys(arr[0] || {});
    const out = [headers.join(",")];
    for (const r of arr) out.push(headers.map((h) => esc(r[h])).join(","));
    return out.join("\n");
  };

  return {
    filename: `device_${deviceId}_${Date.now()}.zip-not-included.csv`,
    // tetap kirim 2 CSV string biar gampang dipakai
    csv_sensor: toCSV(rows.length ? rows : [{ info: "no-sensor-data" }]),
    csv_larva_daily: toCSV(larvaRows.length ? larvaRows : [{ info: "no-larva-data" }])
  };
}

/**
 * gallery merged (device images + citizen reports)
 * - deviceId filter berlaku ke keduanya (device id atau "CITIZEN")
 */
async function getGalleryMerged({ limit = 30, page = 1, deviceId, processed } = {}) {
  const [imgRes, repRes] = await Promise.all([
    getImages({ limit, page, deviceId: deviceId || undefined, processed }),
    getAdminCitizenReports({ limit, page, processed }).catch(() => ({ reports: [] }))
  ]);

  const imgs = Array.isArray(imgRes) ? imgRes : Array.isArray(imgRes?.images) ? imgRes.images : [];
  const reps = Array.isArray(repRes) ? repRes : Array.isArray(repRes?.reports) ? repRes.reports : [];

  const normImgs = imgs.map((x) => {
    const ts = x?.timestamp || x?.createdAt || x?.capturedAt || null;
    return {
      ...x,
      __type: "device",
      device_id: x.device_id ?? x.deviceId,
      deviceId: x.deviceId ?? x.device_id,
      createdAt: x?.createdAt || ts,
      capturedAt: x?.capturedAt || ts,
      timestamp: x?.timestamp || ts
    };
  });

  const normReps = reps.map((r) => {
    const ts = r?.createdAt || r?.timestamp || null;
    return {
      ...r,
      __type: "citizen",
      device_id: "CITIZEN",
      deviceId: "CITIZEN",
      createdAt: ts,
      capturedAt: ts,
      timestamp: ts
    };
  });

  const q = (deviceId || "").trim().toLowerCase();
  const merged = [...normImgs, ...normReps].filter((it) => {
    if (!q) return true;
    const did = String(it.deviceId || it.device_id || "").toLowerCase();
    return did.includes(q);
  });

  merged.sort((a, b) => {
    const ta = new Date(a.capturedAt || a.createdAt || a.timestamp || 0).getTime();
    const tb = new Date(b.capturedAt || b.createdAt || b.timestamp || 0).getTime();
    return tb - ta;
  });

  return merged;
}

export const api = {
  login,
  register,

  // public
  getDevicesPublic,
  getPublicSummary,
  getTelemetryTodayAvg,
  getPublicChartData,
  getPublicLarvaDaily,
  getPublicRiskTop,
  getPublicRiskMap,
  getPublicCitizenReports,
  submitCitizenReport,

  // admin
  getUsers,
  updateUser,
  deleteUser,
  getAdminCitizenReports,
  getReports: getAdminCitizenReports,

  // protected
  getDevices,
  getDevicesMerged,
  updateDevice,
  getImages,
  deleteImage,
  getSensorData,

  // larva (protected)
  getLarvaDailyProtected,

  // self settings
  getMyProfile,
  updateMyProfile,
  changeMyPassword,

  // composed
  getDeviceOverview,
  exportDeviceData,

  // gallery
  getGalleryMerged
};
