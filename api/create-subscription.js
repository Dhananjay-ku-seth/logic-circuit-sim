// Creates a Razorpay subscription for the signed-in Supabase user and hands
// the subscription_id back to the client to open in Razorpay Checkout.
// The caller's identity is verified server-side via their Supabase access
// token — never trust a user_id sent directly by the client.

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "method not allowed" });
  }

  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: "missing bearer token" });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  const planId = process.env.RAZORPAY_PLAN_ID;

  if (!supabaseUrl || !supabaseAnonKey || !keyId || !keySecret || !planId) {
    console.error("create-subscription: missing required env vars");
    return res.status(500).json({ error: "server not configured" });
  }

  const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${token}`, apikey: supabaseAnonKey },
  });
  if (!userRes.ok) {
    return res.status(401).json({ error: "invalid session" });
  }
  const user = await userRes.json();

  const razorpayRes = await fetch("https://api.razorpay.com/v1/subscriptions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Basic " + Buffer.from(`${keyId}:${keySecret}`).toString("base64"),
    },
    body: JSON.stringify({
      plan_id: planId,
      total_count: 120,
      quantity: 1,
      customer_notify: 1,
      notes: { user_id: user.id, app: "logic-circuit-sim" },
    }),
  });

  const sub = await razorpayRes.json();
  if (!razorpayRes.ok) {
    console.error("Razorpay subscription create failed:", sub);
    return res.status(502).json({ error: sub.error?.description || "subscription create failed" });
  }

  return res.status(200).json({ subscription_id: sub.id, email: user.email });
}
