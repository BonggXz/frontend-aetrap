import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "../ui/Toast.jsx";
import { GlassCard, SectionTitle, MiniCard, ShimmerButton, Badge } from "../components/Cards.jsx";
import { Icons } from "../ui/Icons.jsx";
import { api } from "../lib/api.js";

function useIsMobile(breakpoint = 720) {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= breakpoint);
  React.useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= breakpoint);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [breakpoint]);
  return isMobile;
}

export default function ReportsNew() {
  const toast = useToast();
  const nav = useNavigate();
  const isMobile = useIsMobile(720);

  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState(null);

  const [coords, setCoords] = useState(null);
  const [desc, setDesc] = useState("");
  const [name, setName] = useState("");
  const [wa, setWa] = useState("");
  const [loading, setLoading] = useState(false);

  const canSubmit = useMemo(() => !!photo && !!coords && desc.trim().length >= 5, [photo, coords, desc]);

  function onPickFile(file) {
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error("File harus berupa gambar.");
    if (file.size > 10 * 1024 * 1024) return toast.error("Ukuran foto maksimal 10MB.");

    setPhoto(file);
    setPreview(URL.createObjectURL(file));
  }

  function requestGPS() {
    if (!navigator.geolocation) return toast.error("Browser kamu tidak mendukung GPS.");

    toast.info("Mengambil lokasi (GPS)...");
    navigator.geolocation.getCurrentPosition(
      (g) => {
        setCoords({ lat: g.coords.latitude, lng: g.coords.longitude, acc: g.coords.accuracy });
        toast.success("GPS aktif. Lokasi berhasil didapat.");
      },
      (err) => toast.error(err.message || "Gagal mengambil lokasi."),
      { enableHighAccuracy: true, timeout: 12000 }
    );
  }

  function openOnMap() {
    if (!coords) return;
    nav(`/map?focus=${coords.lat},${coords.lng}`);
  }

  async function submit() {
    if (!canSubmit) return toast.warn("Pastikan foto + GPS aktif + deskripsi minimal 5 karakter.");

    const waClean = wa.trim().replace(/[^\d+]/g, "");
    if (waClean && waClean.length < 8) return toast.warn("Nomor WhatsApp terlalu pendek (opsional).");

    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("photo", photo); // ✅ sesuai backend: uploadCitizenReport.single('photo')
      fd.append("description", desc);
      fd.append("name", name || "Anonim");
      fd.append("whatsapp", waClean || "");
      fd.append("lat", String(coords.lat));
      fd.append("lng", String(coords.lng));
      fd.append("accuracy", String(coords.acc || ""));

      await api.submitCitizenReport(fd);

      toast.success("Laporan berhasil dikirim. Terima kasih!");

      setDesc("");
      setName("");
      setWa("");
      setPhoto(null);
      setPreview(null);
      setCoords(null);
    } catch (err) {
      toast.error(err?.message || "Gagal mengirim laporan.");
    } finally {
      setLoading(false);
    }
  }

  const embedUrl = useMemo(() => {
    if (!coords) return "";
    const pad = 0.01;
    const left = coords.lng - pad;
    const right = coords.lng + pad;
    const top = coords.lat + pad;
    const bottom = coords.lat - pad;
    return `https://www.openstreetmap.org/export/embed.html?bbox=${left}%2C${bottom}%2C${right}%2C${top}&layer=mapnik&marker=${coords.lat}%2C${coords.lng}`;
  }, [coords]);

  return (
    <div>
      <GlassCard>
        <SectionTitle
          kicker="Pelaporan Masyarakat"
          title="Report"
          right={
            <Badge>
              <Icons.Report size={14} />
              <span>Wajib GPS</span>
            </Badge>
          }
        />

        <div className="aetrap-report-grid">
          {/* LEFT */}
          <MiniCard>
            <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 10 }}>Upload foto atau buka kamera</div>

            <div className="report-actions">
              <label style={{ ...fileBtn, width: isMobile ? "100%" : "auto", justifyContent: "center" }}>
                <Icons.Upload size={16} />
                <span style={{ fontWeight: 700 }}>Pilih Foto</span>
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={(e) => onPickFile(e.target.files?.[0])}
                />
              </label>

              <label style={{ ...fileBtn, width: isMobile ? "100%" : "auto", justifyContent: "center" }}>
                <Icons.Camera size={16} />
                <span style={{ fontWeight: 700 }}>Buka Kamera</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  style={{ display: "none" }}
                  onChange={(e) => onPickFile(e.target.files?.[0])}
                />
              </label>

              <ShimmerButton
                onClick={requestGPS}
                style={{ padding: "10px 14px", width: isMobile ? "100%" : "auto", justifyContent: "center" }}
              >
                <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                  <Icons.Crosshair size={16} /> Ambil GPS
                </span>
              </ShimmerButton>
            </div>

            {preview && (
              <div style={{ marginTop: 12 }}>
                <div style={{ color: "var(--muted2)", fontWeight: 600, fontSize: 12, marginBottom: 6 }}>Preview foto</div>
                <img
                  src={preview}
                  alt="preview"
                  style={{
                    width: "100%",
                    borderRadius: 18,
                    border: "1px solid var(--stroke)",
                    maxHeight: isMobile ? 260 : 360,
                    objectFit: "cover"
                  }}
                />
              </div>
            )}
          </MiniCard>

          {/* RIGHT */}
          <MiniCard>
            <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 10 }}>Detail laporan</div>

            <label style={{ display: "grid", gap: 6, marginBottom: 10 }}>
              <span style={lbl}>Nama (opsional)</span>
              <input value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} placeholder="Contoh: Budi" />
            </label>

            <label style={{ display: "grid", gap: 6, marginBottom: 10 }}>
              <span style={lbl}>WhatsApp (opsional)</span>
              <input value={wa} onChange={(e) => setWa(e.target.value)} style={inputStyle} placeholder="Contoh: +62812xxxxxxx" />
            </label>

            <label style={{ display: "grid", gap: 6, marginBottom: 10 }}>
              <span style={lbl}>Deskripsi (wajib)</span>
              <textarea
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                style={{ ...inputStyle, minHeight: 110, resize: "vertical" }}
                placeholder="Contoh: Ada jentik di bak mandi belakang rumah..."
              />
            </label>

            <div
              style={{
                border: "1px solid var(--stroke)",
                background: "rgba(255,255,255,0.03)",
                borderRadius: 18,
                padding: 12,
                marginBottom: 12
              }}
            >
              <div style={{ fontWeight: 800, marginBottom: 6 }}>Lokasi (GPS)</div>

              {!coords ? (
                <div style={{ color: "var(--muted)", lineHeight: 1.45 }}>
                  Belum ada lokasi. Tekan tombol <b>Ambil GPS</b> (GPS harus aktif).
                </div>
              ) : (
                <>
                  <div style={{ color: "var(--muted2)", fontSize: 12, marginBottom: 8 }}>
                    {coords.lat.toFixed(6)}, {coords.lng.toFixed(6)} • Akurasi ±{Math.round(coords.acc || 0)} m
                  </div>

                  <div style={{ borderRadius: 14, overflow: "hidden", border: "1px solid var(--stroke)" }}>
                    <iframe
                      title="map"
                      src={embedUrl}
                      style={{ width: "100%", height: isMobile ? 190 : 220, border: 0, display: "block" }}
                      loading="lazy"
                    />
                  </div>

                  <div style={{ marginTop: 10 }}>
                    <ShimmerButton onClick={openOnMap} style={{ width: "100%", padding: "10px 14px" }} variant="ghost">
                      Open di Risk Map
                    </ShimmerButton>
                  </div>
                </>
              )}
            </div>

            <ShimmerButton disabled={!canSubmit || loading} onClick={submit} style={{ width: "100%" }}>
              {loading ? "Mengirim..." : "Kirim Laporan"}
            </ShimmerButton>

            <div style={{ marginTop: 10, color: "var(--muted2)", fontSize: 12, lineHeight: 1.4 }}>
              Foto + GPS diprioritaskan agar laporan valid. WhatsApp opsional untuk follow-up.
            </div>
          </MiniCard>
        </div>

        <style>{`
          .aetrap-report-grid{
            display:grid;
            grid-template-columns: 1.1fr 0.9fr;
            gap: 14px;
          }
          .report-actions{
            display:flex;
            gap:10px;
            flex-wrap:wrap;
            align-items:center;
          }

          @media (max-width: 980px){
            .aetrap-report-grid{ grid-template-columns: 1fr; }
          }

          @media (max-width: 520px){
            .report-actions{ flex-direction: column; align-items: stretch; }
          }
        `}</style>
      </GlassCard>
    </div>
  );
}

const fileBtn = {
  display: "inline-flex",
  alignItems: "center",
  gap: 10,
  padding: "10px 14px",
  borderRadius: 14,
  border: "1px solid var(--stroke)",
  background: "rgba(255,255,255,0.03)",
  cursor: "pointer",
  userSelect: "none"
};

const lbl = { color: "var(--muted2)", fontWeight: 600, fontSize: 12 };

const inputStyle = {
  borderRadius: 14,
  border: "1px solid var(--stroke)",
  background: "rgba(0,0,0,0.12)",
  color: "var(--text)",
  padding: "12px 14px",
  outline: "none",
  width: "100%"
};
