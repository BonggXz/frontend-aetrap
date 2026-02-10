import React, { useState } from "react";
import { 
  Microscope, Activity, Shield, HelpCircle, ChevronDown, 
  CheckCircle2, AlertTriangle, Lightbulb, Target, Bug, Circle, 
  Zap, FlaskConical, Eye, Droplets, Home, Trash2, ScanLine, 
  Thermometer, Wind, Timer, Beaker, MapPin, Info, X, Maximize2
} from "lucide-react";
import { GlassCard, SectionTitle, MiniCard } from "../components/Cards.jsx";

const JENTIK_DATA = [
  {
    id: "aedes",
    title: "Aedes aegypti",
    subtitle: "Vektor Utama DBD, Zika, Chikungunya",
    desc: "Larva fotofobik (takut cahaya), sensitif terhadap getaran. Siphon pendek gemuk berwarna gelap. Menggantung miring di permukaan air.",
    danger: "BAHAYA TINGGI",
    features: ["Sudut 45° (Miring)", "Siphon Hitam Pendek", "Gerakan Zig-zag Agresif", "Gigi Pecten Jelas"],
    color: "#ef4444",
    icon: <Target size={22} color="#ef4444" />,
    bio: "Berkembang biak di air jernih, suka tempat gelap. Telur menempel di dinding wadah di atas garis air.",
    image: "https://i.ibb.co.com/cSsGsLMk/Whats-App-Image-2026-02-10-at-00-22-47-1.jpg ",
    imageCaption: "Larva Aedes aegypti dengan karakteristik siphon pendek"
  },
  {
    id: "culex",
    title: "Culex spp.",
    subtitle: "Vektor Filariasis & Japanese Encephalitis",
    desc: "Siphon sangat panjang dan ramping dengan banyak bulu. Ditemukan dalam koloni besar di air kotor atau limbah rumah tangga.",
    danger: "RISIKO SEDANG",
    features: ["Sudut 90° (Tegak)", "Siphon Panjang Ramping", "Bulu Siphon Lebat", "Gerakan Lambat"],
    color: "#06b6d4",
    icon: <Bug size={22} color="#06b6d4" />,
    bio: "Toleran terhadap air tercemar, limbah organik, dan saluran air kotor (got).",
    image: "https://i.ibb.co.com/nNrXMMF1/Whats-App-Image-2026-02-10-at-00-22-47.jpg ",
    imageCaption: "Larva Culex dengan siphon panjang yang khas"
  },
  {
    id: "anopheles",
    title: "Anopheles spp.",
    subtitle: "Vektor Malaria",
    desc: "Unik: tidak memiliki siphon. Bernapas melalui spirakel di punggung. Posisi sejajar sempurna dengan permukaan air (180°).",
    danger: "BAHAYA MALARIA",
    features: ["Sudut 180° (Sejajar)", "Tanpa Siphon", "Palmate Hairs (Bulu Kipas)", "Gerakan Menggelitik"],
    color: "#8b5cf6",
    icon: <Circle size={22} color="#8b5cf6" />,
    bio: "Menyukai air tawar jernih berlumut, rawa, sawah, dan kolam terbuka.",
    image: "https://i.ibb.co.com/4RmBHS73/Whats-App-Image-2026-02-10-at-00-22-46-1.jpg ",
    imageCaption: "Larva Anopheles sejajar permukaan air (tanpa siphon)"
  }
];

const LIFE_CYCLE = [
  { 
    stage: "Telur", 
    time: "1-2 Hari", 
    detail: "Aedes: diletakkan satu per satu di dinding wadah di atas garis air. Culex: dalam rakit mengapung. Anopheles: di permukaan air individually. Telur Aedes tahan kering 6-12 bulan (desikasi).",
    icon: <Circle size={18} />,
    notes: "Toleran kering: Hanya Aedes",
    image: "https://i.ibb.co.com/gFSPVbYS/Whats-App-Image-2026-02-10-at-00-22-46.jpg ",
    imageCaption: "Telur nyamuk yang menempel di dinding wadah"
  },
  { 
    stage: "Larva (Jentik)", 
    time: "5-7 Hari", 
    detail: "Fase pertumbuhan aktif dengan 4 instar (L1-L4). Makan mikroorganisme, detritus, dan plankton. Pada fase L4 paling aktif makan sebelum moulting menjadi pupa.",
    icon: <Activity size={18} />,
    notes: "Fase paling krusial untuk kontrol",
    image: "https://i.ibb.co.com/Kxdc5Z3B/Whats-App-Image-2026-02-10-at-00-22-48-1.jpg ",
    imageCaption: "Larva nyamuk aktif berenang di air"
  },
  { 
    stage: "Pupa", 
    time: "1-2 Hari", 
    detail: "Fase kepompong (tumbler) tidak makan tapi sangat aktif bergerak (tumbling) saat terganggu. Berisi developing adult yang siap emerge.",
    icon: <Zap size={18} />,
    notes: "Tahan terhadap insektisida permukaan",
    image: "https://i.ibb.co.com/cp8prfj/Whats-App-Image-2026-02-10-at-00-22-48.jpg ",
    imageCaption: "Pupa nyamuk (kepompong) di permukaan air"
  },
  { 
    stage: "Imago (Dewasa)", 
    time: "2-4 Minggu", 
    detail: "Nyamuk keluar dari kulit pupa melalui split dorsal. Hanya betina yang menghisap darah (protein untuk maturasi telur). Jantan hanya minum nektar.",
    icon: <Bug size={18} />,
    notes: "Hanya betina yang menggigit",
    image: "https://i.ibb.co.com/93BggYmk/Whats-App-Image-2026-02-10-at-00-22-47-2.jpg ",
    imageCaption: "Nyamuk dewasa (imago) siap terbang"
  }
];

const FAQ_DATABASE = [
  { 
    q: "Mengapa jentik Aedes sulit ditemukan saat inspeksi?", 
    a: "Larva Aedes sangat fotofobik (takut cahaya) dan sensitif terhadap getaran/bayangan. Saat merasa terancam, mereka langsung menyelam ke dasar wadah yang gelap (negative thigmotaxis). Disarankan inspeksi dengan cahaya redup, gerakan pelan, dan amati dari atas tanpa bayangan." 
  },
  { 
    q: "Apakah semua genangan air pasti ada jentiknya?", 
    a: "Tidak. Nyamuk sangat selektif (stenogamous). Aedes aegypti suka air jernih dalam wadah buatan. Culex quinquefasciatus toleran air kotor/limbah. Anopheles sunderaicus prefer air tawar berlumut. Faktor pH (6.5-7.5), suhu (25-30°C), dan paparan sinar menentukan." 
  },
  { 
    q: "Berapa lama jentik bisa hidup tanpa air?", 
    a: "Larva tidak bisa hidup tanpa air dan akan mati dalam 10-30 menit jika kekeringan (desikasi). Namun, telur Aedes (terutama Ae. aegypti dan Ae. albopictus) memiliki chorion tebal yang bisa survive kering 6-12 bulan menunggu musim hujan." 
  },
  { 
    q: "Apa itu teknik Ovitrap dan bagaimana cara kerjanya?", 
    a: "Ovitrap adalah jebakan telur menggunakan wadah gelap hitam berisi air hayati (infusion). Nyamuk betina Aedes tertarik warna gelap untuk oviposisi. Kertas kasa/kayu di dalamnya menampung telur. Jumlah telur mengindikasikan kepadatan populasi dan oviposition activity." 
  },
  { 
    q: "Mengapa fogging tidak efektif menekan populasi jangka panjang?", 
    a: "Fogging ULV (Ultra Low Volume) hanya membunuh nyamuk dewasa terbang (adulticide). Tidak menyentuh jentik di air (larvicide), telur menempel di dinding, nyamuk di tempat gelap (resting site), atau flying range rendah. Efek temporer (3-7 hari). Resistensi pyrethroid juga meningkat." 
  },
  { 
    q: "Apakah larva nyamuk bisa menjadi vektor langsung?", 
    a: "Tidak. Larva tidak menularkan penyakit (non-vector). Virus/pathogen diperoleh saat nyamuk betina menghisap darah penderita (viremic), kemudian ditransmisikan saat gigitan berikutnya setelah virus berkembang di saluran pencernaan (extrinsic incubation period/EIP) selama 7-14 hari." 
  },
  { 
    q: "Bagaimana membedakan larva nyamuk dengan larva serangga air lain?", 
    a: "Larva nyamuk (Culicidae) memiliki siphon posterior (kecuali Anopheles) untuk respirasi di permukaan. Tubuh silindris dengan gerakan berkelok (S-shape). Larva kumbang air (Dytiscidae) memiliki kaki renang, kepala sclerotized. Larva kepik (Notonectidae) berenang terbalik." 
  },
  { 
    q: "Apakah ada predator alami jentik yang efektif?", 
    a: "Ya. Ikan pemakan jentik: Poecilia reticulata (guppy), Betta splendens (cupang), dan Gambusia affinis (mosquito fish). Biolarvasida: Bacillus thuringiensis israelensis (BTI) dan Bacillus sphaericus (Bs) spesifik membunuh larva tanpa merusak ekosistem akuatik (target specific)." 
  },
  { 
    q: "Mengapa jentik sering muncul kembali setelah pembersihan?", 
    a: "Telur nyamuk (terutama Aedes) menempel sangat kuat di dinding wadah seperti lem (glue-like substance) dan tahan terhadap pengurasan. Jika dinding tidak disikat/brushed saat 3M, telur tetap viable dan hatch saat terkena air lagi. Sikat dinding wadah adalah kunci sukses PSN." 
  },
  { 
    q: "Apakah larva bisa hidup di air asin atau tercemar kimia?", 
    a: "Sebagian besar vektor (Aedes, Anopheles) memerlukan air tawar (freshwater). Culex quinquefasciatus bisa toleran brackish water (salinitas 5-10 ppt). Larva umumnya mati di air dengan klorin >1 ppm, detergen, atau minyak (monomolecular film) yang menghambat respirasi di siphon." 
  }
];

export default function Education() {
  const [tab, setTab] = useState("identifikasi");
  const [expandedFaq, setExpandedFaq] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);

  const tabs = [
    { id: "identifikasi", label: "Identifikasi Larva", icon: <Microscope size={16} /> },
    { id: "siklus", label: "Siklus Hidup", icon: <Activity size={16} /> },
    { id: "pencegahan", label: "Protokol 3M Plus", icon: <Shield size={16} /> },
    { id: "faq", label: "FAQ & Mitos", icon: <HelpCircle size={16} /> }
  ];

  const openImageModal = (imgSrc, caption) => {
    setSelectedImage({ src: imgSrc, caption });
  };

  return (
    <div>
      <GlassCard>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <FlaskConical size={14} color="var(--accent)" />
          <span style={{ color: "var(--accent)", fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1 }}>
            Entomology Knowledge Base
          </span>
        </div>
        
        <SectionTitle kicker="" title="Ensiklopedia Vektor" />
        
        <div style={{ color: "var(--muted)", marginTop: 8, marginBottom: 24, fontSize: 14, lineHeight: 1.6 }}>
          Pusat edukasi digital AE-TRAP untuk identifikasi morfologi jentik nyamuk dan pemahaman siklus hidup vektor penyakit.
        </div>

        {/* Tab Navigation */}
        <div style={{ display: "flex", gap: 10, marginBottom: 24, flexWrap: "wrap" }}>
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                padding: "10px 16px",
                borderRadius: 12,
                border: "1px solid var(--stroke)",
                background: tab === t.id ? "var(--accent)" : "var(--card2)",
                color: tab === t.id ? "white" : "var(--text)",
                fontWeight: 700,
                fontSize: 13,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 8,
                transition: "all 160ms ease"
              }}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* TAB 1: IDENTIFIKASI */}
        {tab === "identifikasi" && (
          <div>
            <div style={{ 
              background: "rgba(59, 130, 246, 0.08)", 
              border: "1px solid rgba(59, 130, 246, 0.2)", 
              borderRadius: 16, 
              padding: 20, 
              marginBottom: 24 
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <Eye size={18} color="#3b82f6" />
                <div style={{ fontWeight: 800, fontSize: 16, color: "var(--text)" }}>
                  Analisis Morfologi Larva
                </div>
              </div>
              <div style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.7 }}>
                Identifikasi visual dengan membandingkan <strong style={{ color: "var(--text)" }}>Siphon</strong> (alat napas) dan <strong style={{ color: "var(--text)" }}>Sudut Istirahat</strong> jentik di permukaan air. Klik gambar untuk memperbesar.
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {JENTIK_DATA.map((item) => (
                <div key={item.id} style={{ 
                  background: "var(--card2)", 
                  border: "1px solid var(--stroke)", 
                  borderRadius: 20, 
                  overflow: "hidden"
                }}>
                  <div style={{ position: "relative", height: 280, overflow: "hidden" }}>
                    <img 
                      src={item.image} 
                      alt={item.title}
                      style={{ 
                        width: "100%", 
                        height: "100%", 
                        objectFit: "cover",
                        transition: "transform 300ms ease"
                      }}
                      onMouseEnter={(e) => e.target.style.transform = "scale(1.05)"}
                      onMouseLeave={(e) => e.target.style.transform = "scale(1)"}
                    />
                    <div style={{
                      position: "absolute",
                      top: 12,
                      left: 12,
                      background: item.color,
                      color: "white",
                      padding: "6px 12px",
                      borderRadius: 20,
                      fontSize: 11,
                      fontWeight: 800,
                      letterSpacing: 0.5
                    }}>
                      {item.danger}
                    </div>
                    <button
                      onClick={() => openImageModal(item.image, item.imageCaption)}
                      style={{
                        position: "absolute",
                        bottom: 12,
                        right: 12,
                        background: "rgba(0,0,0,0.7)",
                        backdropFilter: "blur(10px)",
                        border: "1px solid rgba(255,255,255,0.2)",
                        borderRadius: 10,
                        padding: 8,
                        cursor: "pointer",
                        color: "white",
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        fontSize: 12,
                        fontWeight: 600
                      }}
                    >
                      <Maximize2 size={14} />
                      Perbesar
                    </button>
                    <div style={{
                      position: "absolute",
                      bottom: 0,
                      left: 0,
                      right: 0,
                      padding: "40px 16px 12px",
                      background: "linear-gradient(to top, rgba(0,0,0,0.8), transparent)",
                      color: "white",
                      fontSize: 13
                    }}>
                      {item.imageCaption}
                    </div>
                  </div>

                  <div style={{ padding: 20 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ 
                          padding: 10, 
                          background: "var(--card)", 
                          borderRadius: 10,
                          border: "1px solid var(--stroke)"
                        }}>
                          {item.icon}
                        </div>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: 20, color: "var(--text)" }}>{item.title}</div>
                          <div style={{ fontSize: 12, color: "var(--accent)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>
                            {item.subtitle}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div style={{ fontSize: 15, color: "var(--muted)", lineHeight: 1.7, marginBottom: 16 }}>
                      {item.desc}
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 8, marginBottom: 16 }}>
                      {item.features.map((f, i) => (
                        <div key={i} style={{ 
                          display: "flex", 
                          alignItems: "center", 
                          gap: 8, 
                          fontSize: 13, 
                          color: "var(--muted2)",
                          background: "rgba(255,255,255,0.03)",
                          padding: "10px 12px",
                          borderRadius: 8,
                          border: "1px solid var(--stroke)"
                        }}>
                          <div style={{ width: 4, height: 4, borderRadius: "50%", background: item.color }}></div>
                          {f}
                        </div>
                      ))}
                    </div>

                    <div style={{ 
                      padding: 12, 
                      background: "rgba(255,255,255,0.02)", 
                      borderRadius: 8, 
                      border: "1px dashed var(--stroke)",
                      fontSize: 13,
                      color: "var(--muted)",
                      lineHeight: 1.5
                    }}>
                      <span style={{ color: "var(--accent)", fontWeight: 700 }}>Habitat: </span>
                      {item.bio}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: SIKLUS HIDUP */}
        {tab === "siklus" && (
          <div>
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontWeight: 800, fontSize: 20, marginBottom: 6, color: "var(--text)" }}>Metamorfosis Holometabola</div>
              <div style={{ color: "var(--muted)", fontSize: 14 }}>Siklus hidup sempurna dengan 4 tahap berbeda morfologi dan fisiologi</div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
              {LIFE_CYCLE.map((step, i) => (
                <div key={i} style={{ 
                  background: "var(--card2)", 
                  border: "1px solid var(--stroke)", 
                  borderRadius: 20, 
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column"
                }}>
                  <div style={{ position: "relative", height: 200, overflow: "hidden" }}>
                    <img 
                      src={step.image} 
                      alt={step.stage}
                      style={{ 
                        width: "100%", 
                        height: "100%", 
                        objectFit: "cover",
                        transition: "transform 300ms ease"
                      }}
                      onMouseEnter={(e) => e.target.style.transform = "scale(1.05)"}
                      onMouseLeave={(e) => e.target.style.transform = "scale(1)"}
                    />
                    <div style={{
                      position: "absolute",
                      top: 12,
                      left: 12,
                      width: 40,
                      height: 40,
                      borderRadius: "50%",
                      background: "var(--accent)",
                      color: "white",
                      display: "grid",
                      placeItems: "center",
                      fontWeight: 800,
                      fontSize: 16,
                      border: "3px solid var(--card)"
                    }}>
                      {i + 1}
                    </div>
                    <button
                      onClick={() => openImageModal(step.image, step.imageCaption)}
                      style={{
                        position: "absolute",
                        bottom: 12,
                        right: 12,
                        background: "rgba(0,0,0,0.7)",
                        border: "none",
                        borderRadius: 8,
                        padding: 6,
                        cursor: "pointer",
                        color: "white"
                      }}
                    >
                      <Maximize2 size={16} />
                    </button>
                  </div>

                  <div style={{ padding: 16, flex: 1, display: "flex", flexDirection: "column" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <div style={{ fontWeight: 800, fontSize: 17, color: "var(--text)" }}>{step.stage}</div>
                      <div style={{ 
                        fontSize: 11, 
                        color: "var(--accent)", 
                        fontWeight: 800,
                        background: "rgba(59, 130, 246, 0.1)",
                        padding: "4px 10px",
                        borderRadius: 20
                      }}>
                        <Timer size={12} style={{ display: "inline", marginRight: 4 }} />
                        {step.time}
                      </div>
                    </div>
                    
                    <div style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.6, marginBottom: 8, flex: 1 }}>
                      {step.detail}
                    </div>
                    
                    <div style={{ 
                      fontSize: 11, 
                      color: "#f59e0b", 
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "8px 10px",
                      background: "rgba(245, 158, 11, 0.1)",
                      borderRadius: 8
                    }}>
                      <Info size={12} />
                      {step.notes}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ 
              marginTop: 24, 
              padding: 20, 
              background: "rgba(245, 158, 11, 0.08)", 
              border: "1px solid rgba(245, 158, 11, 0.2)", 
              borderRadius: 16 
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <Thermometer size={18} color="#f59e0b" />
                <div style={{ fontWeight: 800, color: "#f59e0b" }}>Fakta Kritis Entomologi</div>
              </div>
              <div style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.7 }}>
                Siklus hidup dari telur hingga nyamuk dewasa berlangsung <strong style={{ color: "var(--text)" }}>8-10 hari</strong> pada suhu optimal 28-30°C. 
                Setiap kenyamanan betina dapat menghasilkan 100-200 telur per oviposisi.
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: PENCEGAHAN */}
        {tab === "pencegahan" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
              <MiniCard>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
                  <Shield size={20} color="#10b981" />
                  <div style={{ fontWeight: 800, fontSize: 17, color: "#10b981" }}>Protokol 3M Plus</div>
                </div>
                
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {[
                    { n: "1", t: "Menguras", d: "Buang air tergenang dan SIKAT dinding wadah agar telur hancur", icon: <Droplets size={16} /> },
                    { n: "2", t: "Menutup", d: "Tutup rapat semua penampungan air agar nyamuk tidak bisa bertelur", icon: <Home size={16} /> },
                    { n: "3", t: "Mendaur Ulang", d: "Singkirkan barang bekas penampung air hujan", icon: <Trash2 size={16} /> },
                    { n: "+", t: "AE-TRAP Monitor", d: "Scan AI seminggu sekali untuk deteksi dini", icon: <ScanLine size={16} /> }
                  ].map((step, i) => (
                    <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                      <div style={{ 
                        width: 32, height: 32, borderRadius: "50%", 
                        background: "rgba(16, 185, 129, 0.15)", 
                        color: "#10b981",
                        display: "grid", placeItems: "center",
                        fontWeight: 800, fontSize: 13, flexShrink: 0,
                        border: "1px solid rgba(16, 185, 129, 0.3)"
                      }}>
                        {step.n}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text)", marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
                          {step.icon}
                          {step.t}
                        </div>
                        <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.5 }}>{step.d}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </MiniCard>

              <MiniCard>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
                  <AlertTriangle size={20} color="#ef4444" />
                  <div style={{ fontWeight: 800, fontSize: 17, color: "#ef4444" }}>Zona Risiko Tinggi</div>
                </div>
                
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {[
                    { icon: <Droplets size={14} />, text: "Bak mandi terbuka tanpa tutup rapat" },
                    { icon: <Home size={14} />, text: "Vas bunga dengan air tergenang >3 hari" }, 
                    { icon: <Wind size={14} />, text: "Talang air tersumbat dengan daun kering" },
                    { icon: <Trash2 size={14} />, text: "Ban bekas di luar rumah terkena hujan" },
                    { icon: <MapPin size={14} />, text: "Kolam ikan tanpa predator (lele/cupang)" },
                    { icon: <Beaker size={14} />, text: "Wadah kosong di dalam rumah" }
                  ].map((item, i) => (
                    <div key={i} style={{ 
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "12px 14px",
                      background: "rgba(239, 68, 68, 0.05)",
                      border: "1px solid rgba(239, 68, 68, 0.2)",
                      borderRadius: 10,
                      fontSize: 13,
                      color: "var(--muted)"
                    }}>
                      <span style={{ color: "#ef4444" }}>{item.icon}</span>
                      {item.text}
                    </div>
                  ))}
                </div>
              </MiniCard>
            </div>

            <div style={{ 
              marginTop: 20, 
              padding: 20, 
              background: "var(--card2)", 
              border: "1px solid var(--stroke)", 
              borderRadius: 16 
            }}>
              <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 12, color: "var(--text)", display: "flex", alignItems: "center", gap: 8 }}>
                <Lightbulb size={18} color="#f59e0b" />
                Tips Inspeksi Mingguan (10 Menit)
              </div>
              <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.6 }}>
                <strong style={{ color: "var(--text)" }}>Indoor:</strong> Cek vas bunga, tempat minum hewan, dispenser air, dan wadah di dapur/kamar mandi.
                <br /><br />
                <strong style={{ color: "var(--text)" }}>Outdoor:</strong> Periksa talang air, kolam terbuka, ban bekas, dan genangan air di pekarangan.
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: FAQ */}
        {tab === "faq" && (
          <div>
            <div style={{ display: "grid", gap: 12 }}>
              {FAQ_DATABASE.map((item, i) => (
                <div key={i} style={{ 
                  background: "var(--card2)", 
                  border: "1px solid var(--stroke)", 
                  borderRadius: 16, 
                  overflow: "hidden"
                }}>
                  <button
                    onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
                    style={{
                      width: "100%",
                      border: "none",
                      background: "transparent",
                      color: "var(--text)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                      cursor: "pointer",
                      padding: 16,
                      fontWeight: 750,
                      fontSize: 15,
                      textAlign: "left"
                    }}
                  >
                    <span style={{ flex: 1, lineHeight: 1.4 }}>{item.q}</span>
                    <ChevronDown
                      size={18}
                      style={{
                        transform: expandedFaq === i ? "rotate(180deg)" : "rotate(0deg)",
                        transition: "transform 200ms ease",
                        opacity: 0.7,
                        flexShrink: 0,
                        color: "var(--muted)"
                      }}
                    />
                  </button>
                  
                  {expandedFaq === i && (
                    <div style={{ 
                      padding: "0 16px 16px 16px",
                      color: "var(--muted)", 
                      lineHeight: 1.8,
                      fontSize: 14
                    }}>
                      <div style={{ paddingTop: 12, borderTop: "1px solid var(--stroke)" }}>
                        {item.a}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div style={{ 
              marginTop: 24, 
              padding: 20, 
              background: "rgba(239, 68, 68, 0.08)", 
              border: "1px solid rgba(239, 68, 68, 0.2)", 
              borderRadius: 16,
              display: "flex",
              gap: 12,
              alignItems: "flex-start"
            }}>
              <AlertTriangle size={22} color="#ef4444" style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <div style={{ fontWeight: 800, fontSize: 12, color: "#ef4444", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Mitos vs Fakta
                </div>
                <div style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.7, fontStyle: "italic" }}>
                  "Fogging hanya membunuh nyamuk dewasa yang terbang (adulticide). Selama jentik di air tidak dibasmi (larvicide) dan telur menempel di dinding tidak disikat, besok pagi nyamuk-nyamuk baru akan lahir kembali."
                </div>
              </div>
            </div>

            <div style={{ 
              marginTop: 16, 
              padding: 20, 
              background: "rgba(16, 185, 129, 0.08)", 
              border: "1px solid rgba(16, 185, 129, 0.2)", 
              borderRadius: 16,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 12
            }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 14, color: "#10b981", marginBottom: 4 }}>
                  Checklist PSN Mingguan
                </div>
                <div style={{ fontSize: 13, color: "var(--muted)" }}>
                  Download panduan inspeksi lengkap untuk tim surveillance
                </div>
              </div>
              <button style={{
                padding: "10px 20px",
                background: "#10b981",
                color: "white",
                border: "none",
                borderRadius: 10,
                fontWeight: 700,
                cursor: "pointer",
                fontSize: 13,
                display: "flex",
                alignItems: "center",
                gap: 8
              }}>
                <CheckCircle2 size={16} />
                Download PDF
              </button>
            </div>
          </div>
        )}
      </GlassCard>

      {/* Image Modal */}
      {selectedImage && (
        <div 
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.9)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
            backdropFilter: "blur(10px)"
          }}
          onClick={() => setSelectedImage(null)}
        >
          <div style={{ position: "relative", maxWidth: 900, width: "100%" }}>
            <button
              onClick={() => setSelectedImage(null)}
              style={{
                position: "absolute",
                top: -50,
                right: 0,
                background: "transparent",
                border: "none",
                color: "white",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 14
              }}
            >
              <X size={20} />
              Tutup
            </button>
            <img 
              src={selectedImage.src} 
              alt={selectedImage.caption}
              style={{ 
                width: "100%", 
                borderRadius: 12,
                boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)"
              }}
            />
            <div style={{ 
              color: "white", 
              textAlign: "center", 
              marginTop: 16, 
              fontSize: 14,
              opacity: 0.9
            }}>
              {selectedImage.caption}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
