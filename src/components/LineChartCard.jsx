// src/components/LineChartCard.jsx
import React, { useMemo } from "react";
import { MiniCard } from "./Cards.jsx";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

// ✅ theme detector (data-theme="light" | "dark")
function useThemeMode() {
  const get = () => {
    if (typeof document === "undefined") return "dark";
    return document.documentElement.getAttribute("data-theme") || "dark";
  };

  const [mode, setMode] = React.useState(get);

  React.useEffect(() => {
    if (typeof document === "undefined") return;

    const onCustom = (e) => setMode(e?.detail || get());
    window.addEventListener("aetrap-theme", onCustom);

    const obs = new MutationObserver(() => setMode(get()));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    return () => {
      window.removeEventListener("aetrap-theme", onCustom);
      obs.disconnect();
    };
  }, []);

  return mode === "light" ? "light" : "dark";
}

export default function LineChartCard({
  title = "Trend",
  latestLabel = "Latest",
  latestValue = "-",
  labels = [],
  values = [],
  ySuffix = "",
  height = 160,
  // optional override
  theme: themeProp
}) {
  const themeMode = themeProp || useThemeMode();
  const isLight = themeMode === "light";

  const colors = useMemo(() => {
    return {
      // ✅ hitam saat light
      line: isLight ? "rgba(0,0,0,0.92)" : "rgba(255,255,255,0.92)",
      tick: isLight ? "rgba(0,0,0,0.70)" : "rgba(255,255,255,0.65)",
      grid: isLight ? "rgba(0,0,0,0.10)" : "rgba(255,255,255,0.06)",
      fill: isLight ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.08)"
    };
  }, [isLight]);

  const data = useMemo(() => {
    const nums = Array.isArray(values) ? values : [];
    const lab = Array.isArray(labels) ? labels : [];

    return {
      labels: lab,
      datasets: [
        {
          label: title,
          data: nums.map((v) => (Number.isFinite(Number(v)) ? Number(v) : null)),
          borderColor: colors.line,
          backgroundColor: colors.fill,
          borderWidth: 1.6,
          tension: 0.18,
          pointRadius: 0,
          pointHitRadius: 12,
          fill: true
        }
      ]
    };
  }, [labels, values, title, colors.line, colors.fill]);

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          enabled: true,
          callbacks: {
            label: (ctx) => {
              const v = ctx?.parsed?.y;
              if (v == null) return "-";
              return `${v}${ySuffix}`;
            }
          }
        }
      },
      scales: {
        x: {
          ticks: {
            autoSkip: true,
            maxTicksLimit: 6,
            maxRotation: 0,
            color: colors.tick
          },
          grid: { color: colors.grid }
        },
        y: {
          ticks: {
            color: colors.tick,
            precision: 0,
            callback: (v) => `${v}${ySuffix}`
          },
          grid: { color: colors.grid },
          beginAtZero: false
        }
      }
    }),
    [colors.tick, colors.grid, ySuffix]
  );

  return (
    <MiniCard>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
        <div style={{ fontWeight: 800 }}>{title}</div>
        <div style={{ color: "var(--muted2)", fontSize: 12 }}>
          {latestLabel}: <span style={{ fontWeight: 900, color: "var(--text)" }}>{latestValue}</span>
        </div>
      </div>

      <div style={{ height, marginTop: 10 }}>
        <Line data={data} options={options} />
      </div>
    </MiniCard>
  );
}
