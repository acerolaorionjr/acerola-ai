import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const ORIGIN = "https://acerolaorionjr.github.io";
const PLANS = {
  standard: { code: "PLN_6drn57e1ub3xcu7", amount: 100000, name: "Acerola Standard" },
  premium: { code: "PLN_hk2hfjiz23kl17c", amount: 250000, name: "Acerola Premium" },
  ultimate: { code: "PLN_pf6exaeg73to1s2", amount: 500000, name: "Acerola Ultimate" },
} as const;

function headers() {
  return {
    "Access-Control-Allow-Origin": ORIGIN,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  };
}
function send(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: headers() });
}
async function getUser(req: Request) {
  const authorization = req.headers.get("Authorization");
  const url = Deno.env.get("SUPABASE_URL") || "";
  const key = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY") || "";
  if (!authorization?.startsWith("Bearer ") || !url || !key) return null;
  try {
    const response = await fetch(url + "/auth/v1/user", {
      headers: { Authorization: authorization, apikey: key },
    });
    return response.ok ? await response.json() : null;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: headers() });
  if (req.method !== "POST") return send({ error: "Method not allowed" }, 405);

  try {
    const secret = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!secret) return send({ error: "Payment service is not configured" }, 500);

    const user = await getUser(req);
    if (!user?.id || !user?.email) {
      return send({ error: "Sign in to Acerola before choosing a membership", code: "AUTH_REQUIRED" }, 401);
    }

    const body = await req.json();
    const tier = String(body.tier || "").trim().toLowerCase() as keyof typeof PLANS;
    const plan = PLANS[tier];
    if (!plan) return send({ error: "Choose a valid Acerola membership" }, 400);

    const email = String(user.email).trim().toLowerCase();
    const suppliedEmail = String(body.email || "").trim().toLowerCase();
    if (suppliedEmail && suppliedEmail !== email) {
      return send({ error: "Use the email address on your signed-in Acerola account", code: "EMAIL_MISMATCH" }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    if (!supabaseUrl || !serviceKey) {
      return send({ error: "Membership service is not configured" }, 500);
    }

    const existingResponse = await fetch(
      supabaseUrl + "/rest/v1/acerola_memberships?select=id,status,next_payment_date&user_id=eq." +
        encodeURIComponent(user.id) + "&status=in.(active,non_renewing)&limit=10",
      { headers: { apikey: serviceKey, Authorization: "Bearer " + serviceKey } },
    );
    if (!existingResponse.ok) {
      console.error("Membership lookup failed:", await existingResponse.text());
      return send({ error: "Could not check your current membership. Try again later." }, 502);
    }
    const existing = await existingResponse.json();
    const now = Date.now();
    const stillEntitled = Array.isArray(existing) && existing.some((row) =>
      row.status === "active" || (row.status === "non_renewing" && row.next_payment_date && Date.parse(row.next_payment_date) > now)
    );
    if (stillEntitled) {
      return send({ error: "You already have an active membership. Manage or cancel it before changing plans.", code: "MEMBERSHIP_EXISTS" }, 409);
    }

    const reference = "ACEROLA_MEM_" + crypto.randomUUID().replaceAll("-", "");
    const membershipHeaders = { apikey: serviceKey, Authorization: "Bearer " + serviceKey, "Content-Type": "application/json" };
    // Persist the reference before checkout so a fast webhook can resolve it.
    const pendingResponse = await fetch(supabaseUrl + "/rest/v1/acerola_memberships", {
      method: "POST",
      headers: { ...membershipHeaders, Prefer: "return=minimal" },
      body: JSON.stringify({ user_id: user.id, email, tier, plan_code: plan.code, amount: plan.amount, currency: "NGN", status: "pending", reference, metadata: { project: "Acerola", source: "acerola-core", checkout_status: "initializing" } }),
    });
    if (!pendingResponse.ok) {
      console.error("Could not create pending membership:", await pendingResponse.text());
      return send({ error: "Could not prepare your membership. Please try again." }, 502);
    }
    const paystackResponse = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: { Authorization: "Bearer " + secret, "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        amount: plan.amount,
        plan: plan.code,
        currency: "NGN",
        reference,
        metadata: {
          project: "Acerola",
          product: "membership",
          tier,
          plan_code: plan.code,
          user_id: user.id,
          source: "acerola-core",
        },
      }),
    });
    const result = await paystackResponse.json();
    if (!paystackResponse.ok || !result.status || !result.data?.access_code || !result.data?.reference) {
      console.error("Paystack membership initialization failed:", result.message || "unknown");
      await fetch(supabaseUrl + "/rest/v1/acerola_memberships?reference=eq." + encodeURIComponent(reference), {
        method: "PATCH",
        headers: { ...membershipHeaders, Prefer: "return=minimal" },
        body: JSON.stringify({ status: "cancelled", metadata: { project: "Acerola", source: "acerola-core", checkout_status: "initialization_failed" } }),
      });
      return send({ error: result.message || "Paystack could not start the membership checkout" }, 502);
    }

    return send({
      success: true,
      tier,
      plan_name: plan.name,
      amount: plan.amount / 100,
      reference: result.data.reference,
      access_code: result.data.access_code,
      authorization_url: result.data.authorization_url,
    });
  } catch (error) {
    console.error("Membership initialization error:", error);
    return send({ error: "Unable to initialize membership checkout" }, 500);
  }
});
