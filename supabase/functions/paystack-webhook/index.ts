const corsHeaders = {
  "Content-Type": "application/json",
};

function hex(bytes: Uint8Array) {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hmacSha512(secret: string, payload: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payload),
  );

  return hex(new Uint8Array(signature));
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: corsHeaders,
    });
  }

  try {
    const secret = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!secret) {
      console.error("PAYSTACK_SECRET_KEY is missing");
      return new Response(JSON.stringify({ error: "Webhook not configured" }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    const rawBody = await req.text();
    const suppliedSignature = req.headers.get("x-paystack-signature") || "";
    const expectedSignature = await hmacSha512(secret, rawBody);

    if (!suppliedSignature || !safeEqual(suppliedSignature, expectedSignature)) {
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    const event = JSON.parse(rawBody);

    console.log("Verified Paystack webhook:", {
      event: event.event,
      reference: event.data?.reference || null,
      amount: event.data?.amount || null,
      currency: event.data?.currency || null,
    });

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: corsHeaders,
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(JSON.stringify({ error: "Webhook processing failed" }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
