import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const ORIGIN = "https://acerolaorionjr.github.io";
const cors = {
  "Access-Control-Allow-Origin": ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};
function send(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: cors });
}
async function getUser(req: Request) {
  const authorization = req.headers.get("Authorization") || "";
  const url = Deno.env.get("SUPABASE_URL") || "";
  const key = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY") || "";
  if (!authorization.startsWith("Bearer ") || !url || !key) return null;
  const response = await fetch(url + "/auth/v1/user", { headers: { Authorization: authorization, apikey: key } });
  return response.ok ? await response.json() : null;
}
async function db(path: string, serviceKey: string, init: RequestInit = {}) {
  const url = Deno.env.get("SUPABASE_URL");
  if (!url) throw new Error("SUPABASE_URL is missing");
  return await fetch(url + "/rest/v1/" + path, {
    ...init,
    headers: { apikey: serviceKey, Authorization: "Bearer " + serviceKey, "Content-Type": "application/json", ...(init.headers || {}) },
  });
}
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return send({ error: "Method not allowed" }, 405);
  try {
    const user = await getUser(req);
    if (!user?.id) return send({ error: "Sign in to manage your Acerola membership.", code: "AUTH_REQUIRED" }, 401);
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const secret = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!serviceKey || !secret) return send({ error: "Membership management is not configured." }, 500);
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "status");
    const lookup = await db(
      "acerola_memberships?select=id,tier,amount,status,created_at,last_payment_at,next_payment_date,paystack_subscription_code,paystack_email_token&user_id=eq." +
      encodeURIComponent(user.id) + "&order=created_at.desc&limit=10",
      serviceKey,
    );
    if (!lookup.ok) throw new Error("Could not load membership: " + await lookup.text());
    const rows = await lookup.json();
    const now = Date.now();
    const membership = rows.find((row: any) =>
      row.status === "active" ||
      (row.status === "non_renewing" && row.next_payment_date && Date.parse(row.next_payment_date) > now)
    ) || rows[0] || null;

    if (action === "status") {
      if (!membership) return send({ success: true, membership: null });
      const entitled = membership.status === "active" ||
        (membership.status === "non_renewing" && membership.next_payment_date && Date.parse(membership.next_payment_date) > now);
      return send({
        success: true,
        membership: {
          tier: membership.tier,
          amount: membership.amount / 100,
          status: membership.status,
          entitled,
          next_payment_date: membership.next_payment_date,
          last_payment_at: membership.last_payment_at,
          created_at: membership.created_at,
          can_cancel: Boolean(membership.paystack_subscription_code && membership.paystack_email_token && membership.status === "active"),
        },
      });
    }

    if (!membership || !membership.paystack_subscription_code) {
      return send({ error: "No manageable recurring membership was found." }, 404);
    }
    if (action === "cancel") {
      if (membership.status === "non_renewing") {
        return send({ success: true, message: "Your membership is already set not to renew." });
      }
      if (!membership.paystack_email_token) {
        return send({ error: "Paystack cancellation details are not available yet. Please try again shortly." }, 409);
      }
      const cancelled = await fetch("https://api.paystack.co/subscription/disable", {
        method: "POST",
        headers: { Authorization: "Bearer " + secret, "Content-Type": "application/json" },
        body: JSON.stringify({ code: membership.paystack_subscription_code, token: membership.paystack_email_token }),
      });
      const result = await cancelled.json();
      if (!cancelled.ok || !result.status) {
        console.error("Paystack cancellation failed:", result.message || "unknown");
        return send({ error: result.message || "Paystack could not cancel this subscription." }, 502);
      }
      const update = await db("acerola_memberships?id=eq." + encodeURIComponent(membership.id), serviceKey, {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ status: "non_renewing", metadata: { cancel_requested_at: new Date().toISOString(), cancellation_source: "acerola-account" } }),
      });
      if (!update.ok) throw new Error("Cancellation succeeded at Paystack but local status update failed: " + await update.text());
      return send({ success: true, message: "Auto-renewal has been turned off. Your access remains until the paid-through date.", next_payment_date: membership.next_payment_date });
    }

    if (action === "update-payment") {
      const response = await fetch("https://api.paystack.co/subscription/" + encodeURIComponent(membership.paystack_subscription_code) + "/manage/link", {
        headers: { Authorization: "Bearer " + secret },
      });
      const result = await response.json();
      if (!response.ok || !result.status || !result.data?.link) return send({ error: result.message || "Could not create a secure payment update link." }, 502);
      return send({ success: true, url: result.data.link });
    }
    return send({ error: "Unsupported membership action." }, 400);
  } catch (error) {
    console.error("Membership management error:", error);
    return send({ error: "Unable to manage your membership right now." }, 500);
  }
});
