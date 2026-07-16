import { useState } from "react";
import { supabase } from "./supabaseClient";
import { useAuth } from "./useAuth";
import { useProfile } from "./useProfile";
import UpgradeButton from "./UpgradeButton";
import type { Comp, Wire } from "./logic";

type Row = { id: string; name: string; created_at: string };

export default function SaveLoad({
  comps, wires, note, onLoad,
}: {
  comps: Comp[]; wires: Wire[]; note: string;
  onLoad: (comps: Comp[], wires: Wire[], note: string) => void;
}) {
  const { user } = useAuth();
  const { isPro, loading: proLoading, refetch: refetchProfile } = useProfile();
  const [saving, setSaving] = useState(false);
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("My Circuit");
  const [listOpen, setListOpen] = useState(false);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  if (!user) {
    return <span className="save-hint">Sign in to save your circuits (Pro feature)</span>;
  }

  if (proLoading) {
    return <span className="save-hint">Checking Pro status…</span>;
  }

  if (!isPro) {
    return <UpgradeButton onUpgraded={refetchProfile} />;
  }

  async function save(e?: React.FormEvent) {
    e?.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setMsg(null);
    const { error } = await supabase.from("circuits").insert({
      user_id: user!.id,
      name: name.trim(),
      comps_json: comps,
      wires_json: wires,
      note,
    });
    setSaving(false);
    setNaming(false);
    setMsg(error ? `Save failed: ${error.message}` : "Saved!");
    setTimeout(() => setMsg(null), 3000);
  }

  async function openList() {
    setListOpen((o) => !o);
    if (rows) return;
    setBusy(true);
    const { data, error } = await supabase
      .from("circuits")
      .select("id, name, created_at")
      .order("created_at", { ascending: false });
    setBusy(false);
    if (!error) setRows(data as Row[]);
  }

  async function load(id: string) {
    setBusy(true);
    const { data, error } = await supabase.from("circuits").select("*").eq("id", id).single();
    setBusy(false);
    if (!error && data) {
      onLoad(data.comps_json, data.wires_json, data.note || "");
      setListOpen(false);
    }
  }

  async function remove(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (confirmId !== id) {
      // first click arms a confirmation on this specific row; clicking anything
      // else, or this button again, is what actually deletes it (no native dialog)
      setConfirmId(id);
      return;
    }
    setConfirmId(null);
    await supabase.from("circuits").delete().eq("id", id);
    setRows((r) => r?.filter((x) => x.id !== id) ?? null);
  }

  return (
    <div className="saveload">
      {naming ? (
        <form className="save-name-form" onSubmit={save}>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Escape") setNaming(false); }}
            placeholder="Circuit name"
          />
          <button type="submit" className="save-btn on" disabled={saving}>{saving ? "…" : "✓"}</button>
          <button type="button" className="save-btn" onClick={() => setNaming(false)}>✕</button>
        </form>
      ) : (
        <button className="save-btn" onClick={() => setNaming(true)}>💾 Save Circuit</button>
      )}
      <div className="load-wrap">
        <button className="save-btn" onClick={openList}>📂 My Circuits {listOpen ? "▲" : "▼"}</button>
        {listOpen && (
          <div className="load-list">
            {busy && <p className="load-empty">Loading…</p>}
            {!busy && rows && rows.length === 0 && <p className="load-empty">No saved circuits yet.</p>}
            {!busy && rows?.map((r) => (
              <div key={r.id} className="load-row" onClick={() => load(r.id)}>
                <span>{r.name}</span>
                <button
                  className={"load-del" + (confirmId === r.id ? " confirm" : "")}
                  onClick={(e) => remove(r.id, e)}
                  onMouseLeave={() => confirmId === r.id && setConfirmId(null)}
                  title={confirmId === r.id ? "Click again to confirm" : "Delete"}
                >
                  {confirmId === r.id ? "Delete?" : "✕"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      {msg && <span className="save-msg">{msg}</span>}
    </div>
  );
}
