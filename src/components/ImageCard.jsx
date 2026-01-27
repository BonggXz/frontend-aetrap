import React, { useState } from "react";
import Modal from "../ui/Modal.jsx";
import { formatDateTime } from "../lib/utils.js";
import { ShimmerButton, MiniCard } from "./Cards.jsx";

export default function ImageCard({ item, onDelete }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div
        style={{
          background: "var(--card2)",
          border: "1px solid var(--stroke)",
          borderRadius: 18,
          overflow: "hidden"
        }}
      >
        <div style={{ position: "relative" }}>
          <img
            src={item.displayUrl}
            alt={item.filename}
            style={{ width: "100%", height: 220, objectFit: "cover", display: "block" }}
            loading="lazy"
            onClick={() => setOpen(true)}
          />
        </div>

        <div style={{ padding: 12 }}>
          <div style={{ fontWeight: 900, fontSize: 13, marginBottom: 6 }}>{item.device_id}</div>
          <div style={{ color: "var(--muted)", fontSize: 12, marginBottom: 8 }}>{formatDateTime(item.timestamp)}</div>

          <MiniCard style={{ padding: 10 }}>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>
              Larva count: <b style={{ color: "var(--text)" }}>{item?.processedData?.summary?.larva_count ?? "-"}</b>
            </div>
          </MiniCard>

          <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
            <ShimmerButton variant="ghost" onClick={() => setOpen(true)} style={{ flex: 1 }}>
              Lihat
            </ShimmerButton>
            <ShimmerButton onClick={() => onDelete?.(item)} style={{ flex: 1 }}>
              Hapus
            </ShimmerButton>
          </div>
        </div>
      </div>

      <Modal open={open} title={`Preview: ${item.filename}`} onClose={() => setOpen(false)}>
        <img src={item.displayUrl} alt={item.filename} style={{ width: "100%", borderRadius: 16 }} />
      </Modal>
    </>
  );
}
