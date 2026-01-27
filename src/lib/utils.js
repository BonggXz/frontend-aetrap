export function clsx(...arr) {
  return arr.filter(Boolean).join(" ");
}

export function formatTime(ts) {
  try {
    const d = new Date(ts);
    return d.toLocaleString("id-ID", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "-";
  }
}

export function formatDateTime(ts) {
  try {
    const d = new Date(ts);
    return d.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return "-";
  }
}

export function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

export function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
