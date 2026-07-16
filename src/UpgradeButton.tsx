import { useState } from "react";
import { supabase } from "./supabaseClient";

declare global {
  interface Window {
    Razorpay: new (opts: Record<string, unknown>) => { open: () => void };
  }
}

let scriptPromise: Promise<void> | null = null;
function loadCheckoutScript() {
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://checkout.razorpay.com/v1/checkout.js";
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("Could not load payment widget"));
      document.body.appendChild(s);
    });
  }
  return scriptPromise;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export default function UpgradeButton({ onUpgraded }: { onUpgraded: () => Promise<boolean> }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function upgrade() {
    setBusy(true);
    setMsg(null);
    try {
      await loadCheckoutScript();
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("Please sign in first.");

      const res = await fetch("/api/create-subscription", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Could not start checkout.");

      const rz = new window.Razorpay({
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        subscription_id: body.subscription_id,
        name: "LabBench Pro",
        description: "Cloud save for Logic Circuit Simulator",
        prefill: { email: body.email },
        theme: { color: "#22d3ee" },
        handler: async () => {
          setMsg("Payment received — activating Pro…");
          for (let i = 0; i < 8; i++) {
            await sleep(2000);
            if (await onUpgraded()) {
              setMsg("Pro activated!");
              setBusy(false);
              return;
            }
          }
          setMsg("Payment received. Activation may take a minute — refresh shortly.");
          setBusy(false);
        },
        modal: { ondismiss: () => setBusy(false) },
      });
      rz.open();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Something went wrong.");
      setBusy(false);
    }
  }

  return (
    <span className="upgrade-wrap">
      <button className="save-btn upgrade" onClick={upgrade} disabled={busy}>
        {busy ? "…" : "⭐ Upgrade to Pro — ₹29/mo"}
      </button>
      {msg && <span className="save-msg">{msg}</span>}
    </span>
  );
}
