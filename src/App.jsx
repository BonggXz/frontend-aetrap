import React from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { getAuth } from "./lib/storage.js";

import Landing from "./pages/Landing.jsx";
import MonitoringOverview from "./pages/MonitoringOverview.jsx";
import MonitoringMap from "./pages/MonitoringMap.jsx";
import ReportsNew from "./pages/ReportsNew.jsx";
import Education from "./pages/Education.jsx";

import AdminLogin from "./pages/AdminLogin.jsx";
import AdminDevices from "./pages/AdminDevices.jsx";
import AdminUsers from "./pages/AdminUsers.jsx";
import MonitoringGallery from "./pages/MonitoringGallery.jsx";
import AdminMonitoring from "./pages/AdminMonitoring.jsx";
import AdminDeviceOverview from "./pages/AdminDeviceOverview.jsx";
import AdminAccountSettings from "./pages/AdminAccountSettings.jsx";

import NotFound from "./pages/NotFound.jsx";

import PublicNav from "./components/PublicNav.jsx";
import AdminNav from "./components/AdminNav.jsx";

function RequireAdmin({ children }) {
  const auth = getAuth();
  if (!auth?.token) return <Navigate to="/admin/login" replace />;
  if (auth?.user?.role !== "admin") return <Navigate to="/landing" replace />;
  return children;
}

export default function App() {
  const loc = useLocation();
  const isAdminRoute = loc.pathname.startsWith("/admin");
  const isAdminLogin = loc.pathname === "/admin/login";

  return (
    <div style={{ minHeight: "100vh" }}>
      {/* Public nav hanya untuk non-admin route */}
      {!isAdminRoute && <PublicNav />}

      {/* Admin nav tampil di semua /admin/* kecuali login */}
      {isAdminRoute && !isAdminLogin && (
        <RequireAdmin>
          <AdminNav />
        </RequireAdmin>
      )}

      <div className={`app-wrap ${isAdminRoute && !isAdminLogin ? "app-wrap--admin" : ""}`}>
        <Routes>
          {/* Public */}
          <Route path="/" element={<Navigate to="/landing" replace />} />
          <Route path="/landing" element={<Landing />} />
          <Route path="/monitoring" element={<MonitoringOverview />} />
          <Route path="/map" element={<MonitoringMap />} />
          <Route path="/report" element={<ReportsNew />} />
          <Route path="/education" element={<Education />} />

          {/* Admin login (no nav) */}
          <Route path="/admin/login" element={<AdminLogin />} />

          {/* Admin routes (protected) */}
          <Route
            path="/admin/devices"
            element={
              <RequireAdmin>
                <AdminDevices />
              </RequireAdmin>
            }
          />

          <Route
            path="/admin/monitoring"
            element={
              <RequireAdmin>
                <AdminMonitoring />
              </RequireAdmin>
            }
          />

          <Route
            path="/admin/overview/:deviceId"
            element={
              <RequireAdmin>
                <AdminDeviceOverview />
              </RequireAdmin>
            }
          />

          <Route
            path="/admin/users"
            element={
              <RequireAdmin>
                <AdminUsers />
              </RequireAdmin>
            }
          />

          <Route
            path="/admin/gallery"
            element={
              <RequireAdmin>
                <MonitoringGallery />
              </RequireAdmin>
            }
          />

          {/* ✅ NEW: Settings tab */}
          <Route
            path="/admin/settings"
            element={
              <RequireAdmin>
                <AdminAccountSettings />
              </RequireAdmin>
            }
          />

          {/* Not found */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>

      {/* CSS kecil biar admin padding rapi di HP */}
      <style>{`
        .app-wrap{
          max-width: 1180px;
          margin: 0 auto;
          padding: 28px 18px 60px;
          transition: padding 200ms ease;
        }
        .app-wrap--admin{
          padding-left: 310px; /* desktop sidebar */
        }
        @media (max-width: 900px){
          .app-wrap--admin{
            padding-left: 18px; /* mobile: no sidebar */
            padding-bottom: 92px; /* kasih ruang bottom admin bar */
          }
        }
      `}</style>
    </div>
  );
}
