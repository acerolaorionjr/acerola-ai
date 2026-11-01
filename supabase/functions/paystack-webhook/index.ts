const corsHeaders = { "Content-Type": "application/json" };

function hex(bytes: Uint8Array) {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function hmacSha512(secret: string, payload: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-512" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return hex(new Uint8Array(signature));
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

function getSubscriptionCode(data: any): string {
  return data?.subscription?.subscription_code ||
    data?.subscription_code ||
    data?.subscription?.code ||
    "";
}

async function dbRequest(path: string, serviceKey: string, init: RequestInit = {}) {
  const url = Deno.env.get("SUPABASE_URL");
  if (!url) throw new Error("SUPABASE_URL is missing");
  return await fetch(url + "/rest/v1/" + path, {
    ...init,
    headers: {
      apikey: serviceKey,
      Authorization: "Bearer " + serviceKey,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
}

async function findByReference(reference: string, serviceKey: string) {
  const result = await dbRequest(
    "acerola_memberships?select=id,user_id,tier,amount,plan_code,status,reference,paystack_subscription_code,next_payment_date&reference=eq." + encodeURIComponent(reference) + "&limit=1",
    serviceKey,
  );
  if (!result.ok) throw new Error("Membership reference lookup failed: " + await result.text());
  const rows = await result.json();
  return rows[0] || null;
}

async function findBySubscription(code: string, serviceKey: string) {
  if (!code) return null;
  const result = await dbRequest(
    "acerola_memberships?select=id,user_id,tier,amount,plan_code,status,reference,paystack_subscription_code,next_payment_date&paystack_subscription_code=eq." + encodeURIComponent(code) + "&limit=1",
    serviceKey,
  );
  if (!result.ok) throw new Error("Subscription lookup failed: " + await result.text());
  const rows = await result.json();
  return rows[0] || null;
}

async function findCurrentByCustomer(email: string, planCode: string, serviceKey: string) {
  if (!email || !planCode) return null;
  const result = await dbRequest(
    "acerola_memberships?select=id,user_id,tier,amount,plan_code,status,reference,paystack_subscription_code,next_payment_date&email=eq." + encodeURIComponent(email) + "&plan_code=eq." + encodeURIComponent(planCode) + "&status=in.(active,non_renewing,attention)&order=created_at.desc&limit=1",
    serviceKey,
  );
  if (!result.ok) throw new Error("Customer membership lookup failed: " + await result.text());
  const rows = await result.json();
  return rows[0] || null;
}

async function updateMembership(id: string, patch: Record<string, unknown>, serviceKey: string) {
  const result = await dbRequest("acerola_memberships?id=eq." + encodeURIComponent(id), serviceKey, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify(patch),
  });
  if (!result.ok) throw new Error("Membership update failed: " + await result.text());
}

async function processMembershipEvent(event: any, secret: string, serviceKey: string) {
  const data = event.data || {};
  const eventName = String(event.event || "");
  const reference = String(data.reference || "");
  const subscriptionCode = getSubscriptionCode(data);

  if (eventName === "subscription.create") {
    const customerEmail = String(data.customer?.email || data.customer?.customer_email || "").trim().toLowerCase();
    const planCode = String(data.plan?.plan_code || data.plan_code || "");
    if (!customerEmail || !planCode || !subscriptionCode) return;
    const identity = "acerola_memberships?select=id&email=eq." + encodeURIComponent(customerEmail) +
      "&plan_code=eq." + encodeURIComponent(planCode) + "&paystack_subscription_code=is.null&order=created_at.desc&limit=1";
    // Prefer a membership already activated by charge.success. This prevents an
    // abandoned, newer pending checkout from stealing the subscription link.
    let lookup = await dbRequest(identity + "&status=in.(active,non_renewing)", serviceKey);
    if (!lookup.ok) throw new Error("Active membership lookup failed: " + await lookup.text());
    let rows = await lookup.json();
    if (!rows.length) {
      lookup = await dbRequest(identity + "&status=eq.pending", serviceKey);
      if (!lookup.ok) throw new Error("Pending membership lookup failed: " + await lookup.text());
      rows = await lookup.json();
    }
    if (rows[0]?.id) {
      await updateMembership(rows[0].id, {
        paystack_subscription_code: subscriptionCode,
        paystack_customer_code: data.customer?.customer_code || null,
        paystack_email_token: data.email_token || data.subscription?.email_token || null,
        next_payment_date: data.next_payment_date || data.subscription?.next_payment_date || null,
        metadata: { webhook_event: eventName, subscription_attached_at: new Date().toISOString() },
      }, serviceKey);
    }
    return;
  }

  if (eventName === "charge.success") {
    if (!reference && !subscriptionCode) return;
    const customerEmail = String(data.customer?.email || data.customer?.customer_email || "").trim().toLowerCase();
    const eventPlanCode = String(data.plan?.plan_code || data.plan_code || "");
    let membership = reference ? await findByReference(reference, serviceKey) : null;
    if (!membership && subscriptionCode) membership = await findBySubscription(subscriptionCode, serviceKey);
    // Recurring charge references differ from the first checkout reference.
    // If Paystack omits the subscription code, resolve only the current exact plan.
    if (!membership && customerEmail && eventPlanCode) membership = await findCurrentByCustomer(customerEmail, eventPlanCode, serviceKey);
    if (!membership) return;

    // Never grant access from a webhook payload alone: independently verify
    // the transaction with Paystack and compare it with the stored plan amount.
    if (!reference) throw new Error("Membership charge has no transaction reference");
    const verification = await fetch("https://api.paystack.co/transaction/verify/" + encodeURIComponent(reference), {
      headers: { Authorization: "Bearer " + secret },
    });
    const verified = await verification.json();
    const tx = verified?.data;
    if (!verification.ok || !verified?.status || tx?.status !== "success" ||
        Number(tx?.amount) !== Number(membership.amount) || tx?.currency !== "NGN") {
      console.error("Membership transaction did not pass verification", { reference, status: tx?.status });
      return;
    }
    const verifiedPlan = tx?.plan_object?.plan_code || tx?.plan?.plan_code || "";
    if (verifiedPlan && verifiedPlan !== membership.plan_code) {
      console.error("Membership plan mismatch", { reference, verifiedPlan });
      return;
    }
    await updateMembership(membership.id, {
      status: "active",
      last_payment_at: tx.paid_at || new Date().toISOString(),
      paystack_subscription_code: subscriptionCode || membership.paystack_subscription_code,
      paystack_customer_code: data.customer?.customer_code || null,
      next_payment_date: data.subscription?.next_payment_date || data.next_payment_date || membership.next_payment_date,
      metadata: { last_verified_reference: reference, last_webhook_event: eventName },
    }, serviceKey);
    return;
  }

  if (eventName === "invoice.payment_failed" || eventName === "invoice.update") {
    const invoiceStatus = String(data.status || data.invoice?.status || "").toLowerCase();
    if (eventName === "invoice.update" && !["failed", "failure", "overdue"].includes(invoiceStatus)) return;
    const membership = await findBySubscription(subscriptionCode, serviceKey);
    if (membership) await updateMembership(membership.id, {
      status: "attention",
      metadata: { last_webhook_event: eventName, invoice_status: invoiceStatus || "failed" },
    }, serviceKey);
    return;
  }

  if (eventName === "subscription.not_renew") {
    const membership = await findBySubscription(subscriptionCode, serviceKey);
    if (membership) await updateMembership(membership.id, {
      status: "non_renewing",
      next_payment_date: data.next_payment_date || membership.next_payment_date,
      metadata: { last_webhook_event: eventName },
    }, serviceKey);
    return;
  }

  if (eventName === "subscription.disable") {
    const membership = await findBySubscription(subscriptionCode, serviceKey);
    if (membership) await updateMembership(membership.id, {
      status: String(data.status || "").toLowerCase() === "complete" ? "expired" : "disabled",
      cancelled_at: new Date().toISOString(),
      metadata: { last_webhook_event: eventName },
    }, serviceKey);
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return response({ error: "Method not allowed" }, 405);
  try {
    const secret = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!secret) {
      console.error("PAYSTACK_SECRET_KEY is missing");
      return response({ error: "Webhook not configured" }, 500);
    }
    const rawBody = await req.text();
    const suppliedSignature = req.headers.get("x-paystack-signature") || "";
    const expectedSignature = await hmacSha512(secret, rawBody);
    if (!suppliedSignature || !safeEqual(suppliedSignature, expectedSignature)) {
      return response({ error: "Invalid signature" }, 401);
    }

    const event = JSON.parse(rawBody);
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!serviceKey) return response({ error: "Membership processing is not configured" }, 500);

    await processMembershipEvent(event, secret, serviceKey);
    console.log("Paystack webhook accepted:", {
      event: event.event,
      reference: event.data?.reference || null,
      subscription: getSubscriptionCode(event.data),
    });
    return response({ received: true });
  } catch (error) {
    console.error("Paystack webhook processing error:", error);
    return response({ error: "Webhook processing failed" }, 500);
  }
});
