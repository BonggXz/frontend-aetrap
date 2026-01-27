import React, { useState } from "react";
import { GlassCard, SectionTitle, MiniCard } from "../components/Cards.jsx";
import { Icons } from "../ui/Icons.jsx";

const FAQ = [
  {
    q: "Apa itu jentik nyamuk dan kenapa penting?",
    a: "Jentik berkembang di air tergenang. Deteksi & eliminasi lebih cepat membantu mencegah penyebaran DBD."
  },
  {
    q: "Bagaimana YOLOv8 membantu deteksi?",
    a: "YOLOv8 mengenali pola jentik pada foto, lalu menghasilkan count dan bounding box untuk verifikasi."
  },
  {
    q: "Apa itu “risk zone” di peta GIS?",
    a: "Area prioritas berdasarkan deteksi, riwayat data, dan kondisi perangkat. Tujuannya: aksi cepat di lapangan."
  },
  {
    q: "Apakah laporan masyarakat bisa salah?",
    a: "Bisa. Karena itu sistem fokus ke foto + GPS. Admin bisa review untuk validasi dan tindak lanjut."
  },
  {
    q: "Kalau saya menemukan jentik, apa yang harus dilakukan?",
    a: "Buang air tergenang, sikat wadah, tutup penampungan air, dan laporkan melalui fitur Report agar petugas bisa follow-up."
  }
];

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ display: "block" }}>
      <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function Education() {
  const tips = [
    "Menguras penampungan air secara rutin.",
    "Menutup rapat wadah air.",
    "Mendaur ulang barang bekas yang berpotensi menampung air.",
    "Plus: gunakan anti-nyamuk & periksa lingkungan sekitar."
  ];

  return (
    <div>
      <GlassCard>
        <SectionTitle kicker="Edukasi" title="Panduan pencegahan DBD" />

        <div className="aetrap-edu-grid">
          <MiniCard>
            <div className="edu-card-title">Checklist 3M Plus</div>

            <div className="edu-checklist">
              {tips.map((t, i) => (
                <div key={i} className="edu-check-item">
                  <div className="edu-check-icon">
                    <CheckIcon />
                  </div>
                  <div className="edu-check-text">{t}</div>
                </div>
              ))}
            </div>
          </MiniCard>

          <MiniCard>
            <div className="edu-card-title" style={{ marginBottom: 8 }}>
              Kenapa GPS penting?
            </div>
            <div className="edu-paragraph">
              Lokasi membantu pemetaan zona risiko & mempercepat respon lapangan. Maka fitur Report mewajibkan GPS aktif.
            </div>
          </MiniCard>

          <MiniCard>
            <div className="edu-card-title" style={{ marginBottom: 8 }}>
              Tanda bahaya DBD
            </div>
            <div className="edu-paragraph">
              Waspadai demam tinggi, nyeri otot/sendi, bintik merah, mimisan, atau lemas berat. Jika gejala memburuk,
              segera ke faskes.
            </div>
          </MiniCard>

          <MiniCard>
            <div className="edu-card-title" style={{ marginBottom: 8 }}>
              Tips cepat inspeksi mingguan
            </div>
            <div className="edu-paragraph">
              10 menit: cek talang, vas/pot, dispenser, tempat minum hewan, dan bak mandi. Buang air tergenang + sikat
              permukaan.
            </div>
          </MiniCard>
        </div>

        <div style={{ marginTop: 16 }}>
          <div className="edu-faq-title">FAQ</div>
          <div className="edu-faq-sub">Pertanyaan yang sering ditanya</div>

          <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
            {FAQ.map((f, i) => (
              <FaqItem key={i} {...f} />
            ))}
          </div>
        </div>

        <style>{`
          .aetrap-edu-grid{
            display:grid;
            grid-template-columns: 1.1fr 0.9fr;
            gap: 14px;
          }

          .edu-card-title{
            font-weight: 800;
            font-size: 16px;
            margin-bottom: 10px;
          }

          .edu-paragraph{
            color: var(--muted);
            line-height: 1.6;
          }

          .edu-checklist{
            display:grid;
            gap: 10px;
          }

          .edu-check-item{
            display:flex;
            gap: 10px;
            align-items:flex-start;
          }

          .edu-check-icon{
            width: 22px;
            height: 22px;
            border-radius: 8px;
            border: 1px solid var(--stroke);
            background: rgba(255,255,255,0.03);
            display:grid;
            place-items:center;
            margin-top: 2px;
            color: var(--accent);
            flex: 0 0 auto;
          }

          .edu-check-text{
            color: var(--muted);
            line-height: 1.55;
          }

          .edu-faq-title{
            font-weight: 800;
            font-size: 22px;
            letter-spacing: -0.3px;
          }

          .edu-faq-sub{
            color: var(--muted2);
            margin-top: 6px;
          }

          /* Mobile */
          @media (max-width: 980px){
            .aetrap-edu-grid{ grid-template-columns: 1fr; }
            .edu-faq-title{ font-size: 20px; }
            .edu-card-title{ font-size: 15px; }
          }
        `}</style>
      </GlassCard>
    </div>
  );
}

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  const Chevron = Icons.ChevronDown;

  return (
    <div style={{ background: "var(--card2)", border: "1px solid var(--stroke)", borderRadius: 18, padding: 14 }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%",
          border: "none",
          background: "transparent",
          color: "var(--text)",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
          cursor: "pointer",
          padding: 0
        }}
      >
        <div style={{ fontWeight: 750, fontSize: 15, textAlign: "left", lineHeight: 1.35 }}>{q}</div>
        <Chevron
          size={18}
          style={{
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 160ms ease",
            opacity: 0.9,
            marginTop: 2,
            flex: "0 0 auto"
          }}
        />
      </button>

      {open && <div style={{ marginTop: 10, color: "var(--muted)", lineHeight: 1.6 }}>{a}</div>}
    </div>
  );
}
