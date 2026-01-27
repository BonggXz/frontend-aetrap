// src/lib/storage.js

const KEY = "aetrap_auth";
const THEME = "aetrap_theme";

/* ===================== AUTH ===================== */
export function setAuth(auth) {
  localStorage.setItem(KEY, JSON.stringify(auth));
}

export function getAuth() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "null");
  } catch {
    return null;
  }
}

export function clearAuth() {
  localStorage.removeItem(KEY);
}

/* ===================== THEME ===================== */
export function setTheme(theme) {
  try {
    localStorage.setItem(THEME, theme);
  } catch {}

  // apply to DOM
  document.documentElement.setAttribute("data-theme", theme);

  // notify components (fix: PublicNav re-render without reload)
  try {
    window.dispatchEvent(new CustomEvent("aetrap-theme", { detail: theme }));
  } catch {}
}

export function getTheme() {
  return (
    (function () {
      try {
        return localStorage.getItem(THEME);
      } catch {
        return null;
      }
    })() ||
    document.documentElement.getAttribute("data-theme") ||
    "dark"
  );
}

/* ===================== JWT ===================== */
export function decodeJwtPayload(token) {
  try {
    const part = token.split(".")[1];
    const base64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const json = atob(padded);
    return JSON.parse(json);
  } catch {
    return null;
  }
}
