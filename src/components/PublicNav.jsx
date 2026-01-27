import React, { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { getTheme, setTheme } from "../lib/storage.js";
import { Icons } from "../ui/Icons.jsx";

function useIsMobile(breakpoint = 720) {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= breakpoint);
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= breakpoint);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [breakpoint]);
  return isMobile;
}

function NavItem({ to, icon: Icon, label, isMobile }) {
  return (
    <NavLink
      to={to}
      style={({ isActive }) => ({
        display: "inline-flex",
        alignItems: "center",
        gap: 9,
        padding: isMobile ? "9px 10px" : "10px 12px",
        borderRadius: 999,
        color: "var(--text)",
        opacity: isActive ? 1 : 0.78,
        border: isActive ? "1px solid var(--stroke2)" : "1px solid transparent",
        background: isActive ? "rgba(255,255,255,0.04)" : "transparent",
        textDecoration: "none",
        whiteSpace: "nowrap"
      })}
    >
      <Icon size={16} />
      <span style={{ fontWeight: 600, fontSize: isMobile ? 12 : 13 }}>{label}</span>
    </NavLink>
  );
}

export default function PublicNav() {
  const nav = useNavigate();
  const isMobile = useIsMobile(720);

  const [theme, setThemeState] = useState(getTheme());

  useEffect(() => {
    const onTheme = (e) => setThemeState(e.detail || getTheme());
    window.addEventListener("aetrap-theme", onTheme);

    const onStorage = () => setThemeState(getTheme());
    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener("aetrap-theme", onTheme);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const ThemeIcon = theme === "dark" ? Icons.Moon : Icons.Sun;

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    setThemeState(next);
  }

  const shellStyle = {
    background: "var(--card)",
    border: "1px solid var(--stroke)",
    borderRadius: "var(--radius)",
    backdropFilter: "blur(var(--blur))",
    boxShadow: "var(--shadow)",
    padding: isMobile ? "12px 12px" : "12px 14px"
  };

  // =========================
  // DESKTOP: 1 row (balik normal)
  // =========================
  if (!isMobile) {
    return (
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "18px 18px 0" }}>
        <div style={{ ...shellStyle, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          {/* Brand */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ lineHeight: 1.1 }}>
              <div style={{ fontWeight: 800, letterSpacing: -0.4 }}>AE-TRAP</div>
              <div style={{ color: "var(--muted2)", fontSize: 12, fontWeight: 600 }}>NEURO TEAM</div>
            </div>
          </div>

          {/* Nav + Actions */}
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
            <NavItem to="/monitoring" icon={Icons.Activity} label="Monitoring" isMobile={false} />
            <NavItem to="/map" icon={Icons.Map} label="Map" isMobile={false} />
            <NavItem to="/report" icon={Icons.Report} label="Report" isMobile={false} />
            <NavItem to="/education" icon={Icons.Education} label="Education" isMobile={false} />

            <button
              onClick={() => nav("/admin/login")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 9,
                padding: "10px 12px",
                borderRadius: 999,
                background: "transparent",
                border: "1px solid transparent",
                color: "var(--text)",
                opacity: 0.85,
                cursor: "pointer"
              }}
              title="Admin Login"
            >
              <Icons.Login size={16} />
              <span style={{ fontWeight: 600, fontSize: 13 }}>Admin</span>
            </button>

            <button
              onClick={toggleTheme}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 9,
                padding: "10px 12px",
                borderRadius: 999,
                background: "transparent",
                border: "1px solid var(--stroke)",
                color: "var(--text)",
                cursor: "pointer"
              }}
              title="Ganti tema"
            >
              <ThemeIcon size={16} />
              <span style={{ fontWeight: 600, fontSize: 13 }}>Theme</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =========================
  // MOBILE: 2 row + scroll pills
  // =========================
  return (
    <div style={{ maxWidth: 1180, margin: "0 auto", padding: "12px 12px 0" }}>
      <div style={shellStyle}>
        {/* Row 1: brand + quick actions */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
            <div style={{ lineHeight: 1.1, minWidth: 0 }}>
              <div style={{ fontWeight: 800, letterSpacing: -0.4 }}>AE-TRAP</div>
              <div style={{ color: "var(--muted2)", fontSize: 12, fontWeight: 600 }}>NEURO TEAM</div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center", flex: "0 0 auto" }}>
            <button
              onClick={() => nav("/admin/login")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "9px 10px",
                borderRadius: 999,
                background: "transparent",
                border: "1px solid transparent",
                color: "var(--text)",
                opacity: 0.9,
                cursor: "pointer"
              }}
              title="Admin Login"
            >
              <Icons.Login size={16} />
            </button>

            <button
              onClick={toggleTheme}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "9px 10px",
                borderRadius: 999,
                background: "transparent",
                border: "1px solid var(--stroke)",
                color: "var(--text)",
                cursor: "pointer"
              }}
              title="Ganti tema"
            >
              <ThemeIcon size={16} />
            </button>
          </div>
        </div>

        {/* Row 2: scroll nav */}
        <div
          style={{
            display: "flex",
            gap: 6,
            alignItems: "center",
            marginTop: 10,
            flexWrap: "nowrap",
            overflowX: "auto",
            WebkitOverflowScrolling: "touch",
            paddingBottom: 2
          }}
        >
          <NavItem to="/monitoring" icon={Icons.Activity} label="Monitoring" isMobile />
          <NavItem to="/map" icon={Icons.Map} label="Map" isMobile />
          <NavItem to="/report" icon={Icons.Report} label="Report" isMobile />
          <NavItem to="/education" icon={Icons.Education} label="Education" isMobile />
        </div>
      </div>
    </div>
  );
}
