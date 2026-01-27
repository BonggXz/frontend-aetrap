import React, { useEffect, useState } from "react";
import { GlassCard, SectionTitle, MiniCard, ShimmerButton, Badge, IconButton } from "../components/Cards.jsx";
import { api } from "../lib/api.js";
import { useToast } from "../ui/Toast.jsx";
import { FiRefreshCw } from "react-icons/fi";

export default function AdminUsers() {
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [busyId, setBusyId] = useState(null);
  const [loading, setLoading] = useState(false);
  
  
    async function load() {
      setLoading(true);
      try {
        const d = await api.getUsers();
        setUsers(Array.isArray(d) ? d : []);
      } catch (e) {
        toast.error(e.message || "Gagal load users.");
      } finally {
        setLoading(false);
      }
    }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function setRole(u, role) {
    if (!role) return;
    setBusyId(u._id);
    try {
      const res = await api.updateUser(u._id, { role });
      toast.success("Role diupdate.");
      setUsers((prev) => prev.map((x) => (x._id === u._id ? res.user : x)));
    } catch (e) {
      toast.error(e.message || "Gagal update user.");
    } finally {
      setBusyId(null);
    }
  }

  async function toggleActive(u) {
    setBusyId(u._id);
    try {
      const res = await api.updateUser(u._id, { active: !u.active });
      toast.success("Status diupdate.");
      setUsers((prev) => prev.map((x) => (x._id === u._id ? res.user : x)));
    } catch (e) {
      toast.error(e.message || "Gagal update user.");
    } finally {
      setBusyId(null);
    }
  }

  async function del(u) {
    if (!confirm("Hapus user ini?")) return;
    setBusyId(u._id);
    try {
      await api.deleteUser(u._id);
      toast.success("User terhapus.");
      setUsers((prev) => prev.filter((x) => x._id !== u._id));
    } catch (e) {
      toast.error(e.message || "Gagal hapus user.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <GlassCard>
        <SectionTitle
          kicker="Admin"
          title="Users"
          right={
            <IconButton icon={FiRefreshCw} variant="ghost" onClick={load} disabled={loading}>
              {loading ? "Loading" : "Refresh"}
            </IconButton>
          }
        />

        <div style={{ display: "grid", gap: 12 }}>
          {users.map((u) => {
            const isBusy = busyId === u._id;

            return (
              <MiniCard key={u._id}>
                {/* HEAD */}
                <div className="admusr-head">
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 950, wordBreak: "break-word" }}>{u.username}</div>
                    <div style={{ color: "var(--muted2)", fontSize: 12, marginTop: 6, wordBreak: "break-word" }}>
                      {u.email}
                    </div>
                  </div>

                  <Badge tone={u.active ? "good" : "warn"}>{u.active ? "Aktif" : "Nonaktif"}</Badge>
                </div>

                {/* ACTIONS (GRID biar ga ada space kosong) */}
                <div className="admusr-actions">
                  <div className="admusr-role-row">
                    <span className="admusr-role-label">Role</span>
                    <select
                      value={u.role || "user"}
                      disabled={isBusy}
                      onChange={(e) => setRole(u, e.target.value)}
                      style={selectStyle}
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>

                  <div className="admusr-btns">
                    <ShimmerButton
                      variant="ghost"
                      disabled={isBusy}
                      onClick={() => toggleActive(u)}
                      style={{ padding: "10px 14px", width: "100%" }}
                    >
                      {u.active ? "Nonaktifkan" : "Aktifkan"}
                    </ShimmerButton>

                    <ShimmerButton
                      disabled={isBusy}
                      onClick={() => del(u)}
                      style={{ padding: "10px 14px", width: "100%" }}
                    >
                      {isBusy ? "..." : "Hapus"}
                    </ShimmerButton>
                  </div>
                </div>

                <style>{`
                  .admusr-head{
                    display:flex;
                    justify-content:space-between;
                    gap:12px;
                    align-items:flex-start;
                    flex-wrap:wrap;
                  }

                  .admusr-actions{
                    margin-top: 12px;
                    display: grid;
                    gap: 10px;
                  }

                  .admusr-role-row{
                    display:flex;
                    align-items:center;
                    justify-content:space-between;
                    gap: 10px;
                    border: 1px solid var(--stroke);
                    background: rgba(255,255,255,0.02);
                    border-radius: 14px;
                    padding: 10px 12px;
                  }

                  .admusr-role-label{
                    color: var(--muted2);
                    font-size: 12px;
                    font-weight: 900;
                    white-space: nowrap;
                  }

                  .admusr-btns{
                    display:grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 10px;
                  }

                  /* HP kecil: tombol jadi 1 kolom */
                  @media (max-width: 420px){
                    .admusr-btns{ grid-template-columns: 1fr; }
                  }
                `}</style>
              </MiniCard>
            );
          })}

          {users.length === 0 && <div style={{ color: "var(--muted)" }}>Tidak ada user.</div>}
        </div>
      </GlassCard>
    </div>
  );
}

const selectStyle = {
  height: 34,
  borderRadius: 12,
  border: "1px solid var(--stroke)",
  background: "rgba(0,0,0,0.12)",
  color: "var(--text)",
  padding: "0 10px",
  outline: "none",
  cursor: "pointer",
  minWidth: 140
};
