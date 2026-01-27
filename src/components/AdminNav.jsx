import React, { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { clearAuth } from "../lib/storage.js";
import { FiCpu, FiBarChart2, FiUsers, FiImage, FiLogOut, FiSettings } from "react-icons/fi";

function useIsMobile(breakpoint = 900) {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= breakpoint);
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= breakpoint);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [breakpoint]);
  return isMobile;
}

function AdminItem({ to, icon: Icon, label, compact = false }) {
  return (
    <NavLink
      to={to}
      style={({ isActive }) => ({
        display: "flex",
        alignItems: "center",
        justifyContent: compact ? "center" : "flex-start",
        gap: compact ? 0 : 12,
        padding: compact ? "10px 10px" : "11px 12px",
        borderRadius: 14,
        color: "var(--text)",
        border: isActive ? "1px solid var(--stroke2)" : "1px solid transparent",
        background: isActive ? "rgba(255,255,255,0.05)" : "transparent",
        opacity: isActive ? 1 : 0.82,
        minWidth: compact ? 0 : undefined
      })}
      title={compact ? label : undefined}
    >
      <Icon size={18} />
      {!compact && <span style={{ fontWeight: 900, fontSize: 13 }}>{label}</span>}
    </NavLink>
  );
}

export default function AdminNav() {
  const nav = useNavigate();
  const isMobile = useIsMobile(900);

  const logout = () => {
    clearAuth();
    nav("/landing");
  };

  return (
    <>
      {/* Desktop Sidebar */}
      {!isMobile && (
        <div
          style={{
            position: "fixed",
            top: 18,
            left: 18,
            width: 270,
            bottom: 18,
            padding: 14,
            borderRadius: "var(--radius)",
            border: "1px solid var(--stroke)",
            background: "var(--card)",
            backdropFilter: "blur(var(--blur))",
            boxShadow: "var(--shadow)",
            zIndex: 50
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{ fontWeight: 950, letterSpacing: -0.2 }}>Admin Panel</div>
            <button
              onClick={logout}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                borderRadius: 12,
                padding: "9px 10px",
                border: "1px solid var(--stroke)",
                background: "transparent",
                color: "var(--text)",
                cursor: "pointer"
              }}
              title="Logout"
            >
              <FiLogOut size={16} />
              <span style={{ fontWeight: 900, fontSize: 12 }}>Logout</span>
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <AdminItem to="/admin/devices" icon={FiCpu} label="Devices" />
            <AdminItem to="/admin/monitoring" icon={FiBarChart2} label="Monitoring" />
            <AdminItem to="/admin/users" icon={FiUsers} label="Users" />
            <AdminItem to="/admin/gallery" icon={FiImage} label="Gallery" />
            {/* ✅ tab baru */}
            <AdminItem to="/admin/settings" icon={FiSettings} label="Settings" />
          </div>

          <div style={{ position: "absolute", left: 14, right: 14, bottom: 14, color: "var(--muted2)", fontSize: 12 }}>
          </div>
        </div>
      )}

      {/* Mobile Bottom Bar */}
      {isMobile && (
        <div
          style={{
            position: "fixed",
            left: 12,
            right: 12,
            bottom: 12,
            zIndex: 60,
            borderRadius: 18,
            border: "1px solid var(--stroke)",
            background: "var(--card)",
            backdropFilter: "blur(var(--blur))",
            boxShadow: "var(--shadow)",
            padding: 10
          }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6, minmax(0,1fr))", gap: 8, alignItems: "center" }}>
            <AdminItem to="/admin/devices" icon={FiCpu} label="Devices" compact />
            <AdminItem to="/admin/monitoring" icon={FiBarChart2} label="Monitoring" compact />
            <AdminItem to="/admin/users" icon={FiUsers} label="Users" compact />
            <AdminItem to="/admin/gallery" icon={FiImage} label="Gallery" compact />
            {/* ✅ tab baru */}
            <AdminItem to="/admin/settings" icon={FiSettings} label="Settings" compact />

            <button
              onClick={logout}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "10px 10px",
                borderRadius: 14,
                border: "1px solid transparent",
                background: "transparent",
                color: "var(--text)",
                opacity: 0.85,
                cursor: "pointer"
              }}
              title="Logout"
            >
              <FiLogOut size={18} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
