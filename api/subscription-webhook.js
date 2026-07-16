import crypto from "crypto";
import getRawBody from "raw-body";

// Razorpay webhook -> verify -> flip profiles.is_pro for the matching user.
// Configure in Razorpay Dashboard: Settings -> Webhooks -> Active Events:
// subscription.activated, subscription.charged, subscription.cancelled, subscription.halted

export const config = {
  api: { bodyParser: false },
};

const PRO_EVENTS = new Set(["subscription.activated", "subscription.charged"]);
const OFF_EVENTS = new Set(["subscription.cancelled", "subscription.halted", "subscription.completed"]);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "method not allowed" });
  }

  const secret = process.env.RAZORPAY_SUBSCRIPTION_WEBHOOK_SECRET;
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

  if (!secret || !supabaseUrl || !supabaseSecretKey) {
    console.error("subscription-webhook: missing required env vars");
    return res.status(500).json({ error: "server not configured" });
  }

  const rawBody = await getRawBody(req);
  const headerSignature = req.headers["x-razorpay-signature"];
  const expectedSignature = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");

  if (
    !headerSignature ||
    typeof headerSignature !== "string" ||
    headerSignature.length !== expectedSignature.length ||
    !crypto.timingSafeEqual(Buffer.from(headerSignature), Buffer.from(expectedSignature))
  ) {
    return res.status(403).json({ error: "invalid signature" });
  }

  const event = JSON.parse(rawBody.toString("utf-8"));

  if (!PRO_EVENTS.has(event.event) && !OFF_EVENTS.has(event.event)) {
    return res.status(200).json({ ok: true, skipped: "irrelevant event" });
  }

  const subscription = event.payload?.subscription?.entity;
  const userId = subscription?.notes?.user_id;
  if (!userId) {
    return res.status(200).json({ ok: true, skipped: "no user_id in subscription notes" });
  }

  const isPro = PRO_EVENTS.has(event.event);

  const upsertRes = await fetch(`${supabaseUrl}/rest/v1/profiles`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: supabaseSecretKey,
      Authorization: `Bearer ${supabaseSecretKey}`,
      Prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify({
      user_id: userId,
      is_pro: isPro,
      razorpay_subscription_id: subscription.id,
      updated_at: new Date().toISOString(),
    }),
  });

  if (!upsertRes.ok) {
    const errText = await upsertRes.text();
    console.error("Supabase profile upsert failed:", errText);
    return res.status(502).json({ error: "profile update failed" });
  }

  return res.status(200).json({ ok: true, user_id: userId, is_pro: isPro });
}
