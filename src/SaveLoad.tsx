import { useState } from "react";
import { supabase } from "./supabaseClient";
import { useAuth } from "./useAuth";
import type { Comp, Wire } from "./logic";

type Row = { id: string; name: string; created_at: string };

export default function SaveLoad({
  comps, wires, note, onLoad,
}: {
  comps: Comp[]; wires: Wire[]; note: string;
  onLoad: (comps: Comp[], wires: Wire[], note: string) => void;
}) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  if (!user) {
    return <span className="save-hint">Sign in to save your circuits (Pro feature — free while in beta)</span>;
  }

  async function save() {
    const name = window.prompt("Name this circuit:", "My Circuit");
    if (!name) return;
    setSaving(true);
    setMsg(null);
    const { error } = await supabase.from("circuits").insert({
      user_id: user!.id,
      name,
      comps_json: comps,
      wires_json: wires,
      note,
    });
    setSaving(false);
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
    if (!window.confirm("Delete this saved circuit?")) return;
    await supabase.from("circuits").delete().eq("id", id);
    setRows((r) => r?.filter((x) => x.id !== id) ?? null);
  }

  return (
    <div className="saveload">
      <button className="save-btn" onClick={save} disabled={saving}>{saving ? "Saving…" : "💾 Save Circuit"}</button>
      <div className="load-wrap">
        <button className="save-btn" onClick={openList}>📂 My Circuits {listOpen ? "▲" : "▼"}</button>
        {listOpen && (
          <div className="load-list">
            {busy && <p className="load-empty">Loading…</p>}
            {!busy && rows && rows.length === 0 && <p className="load-empty">No saved circuits yet.</p>}
            {!busy && rows?.map((r) => (
              <div key={r.id} className="load-row" onClick={() => load(r.id)}>
                <span>{r.name}</span>
                <button className="load-del" onClick={(e) => remove(r.id, e)} title="Delete">✕</button>
              </div>
            ))}
          </div>
        )}
      </div>
      {msg && <span className="save-msg">{msg}</span>}
    </div>
  );
}
