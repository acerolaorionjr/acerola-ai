import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import webpush from "npm:web-push@3.6.7";

const cors = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-acerola-worker-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function reply(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: cors });
}

function normalizeReplyText(value: unknown): string {
  const raw = String(value ?? "").trim();
  const unfenced = raw.replace(/^\x60\x60\x60(?:json)?\s*/i, "").replace(/\s*\x60\x60\x60$/, "").trim();
  if (!unfenced.startsWith("{") || !unfenced.endsWith("}")) return raw;
  try {
    const parsed = JSON.parse(unfenced);
    if (parsed && typeof parsed.message === "string" && parsed.message.trim()) {
      return parsed.message.trim();
    }
  } catch { /* Keep ordinary model text unchanged when it only resembles JSON. */ }
  return raw;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST") return reply({ error: "Method not allowed" }, 405);

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const publishableKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY");
  const suppliedSecret = req.headers.get("x-acerola-worker-secret") || "";
  if (!url || !serviceKey || !publishableKey || !suppliedSecret) return reply({ error: "Worker is not configured" }, 503);

  const headers = { Authorization: `Bearer ${serviceKey}`, apikey: serviceKey, "Content-Type": "application/json" };
  const verified = await fetch(`${url}/rest/v1/rpc/verify_acerola_job_worker_secret`, {
    method: "POST", headers, body: JSON.stringify({ p_secret: suppliedSecret })
  });
  if (!verified.ok || await verified.json().catch(() => false) !== true) return reply({ error: "Unauthorized" }, 401);

  const claimed = await fetch(`${url}/rest/v1/rpc/claim_acerola_chat_jobs`, {
    method: "POST", headers, body: JSON.stringify({ p_limit: 1 })
  });
  if (!claimed.ok) return reply({ error: "Unable to claim jobs", detail: (await claimed.text()).slice(0, 300) }, 502);
  const jobs = await claimed.json();
  if (!Array.isArray(jobs) || jobs.length === 0) return reply({ ok: true, processed: 0 });

  let completed = 0;
  for (const job of jobs) {
    try {
      const payload = job.payload && typeof job.payload === "object" ? job.payload : {};
      const response = await fetch(`${url}/functions/v1/acerola-ai-gateway`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${job.access_token}`,
          apikey: publishableKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...payload,
          agent_mode: false,
          available_tools: [],
          tool_results: [],
        }),
        signal: AbortSignal.timeout(65000),
      });
      const data = await response.json().catch(() => ({}));
      if (typeof data?.reply === "string") data.reply = normalizeReplyText(data.reply);
      if (!response.ok || !data?.ok || !data?.reply) {
        const reason = String(data?.error || data?.code || `Gateway returned HTTP ${response.status}`);
        await fetch(`${url}/rest/v1/rpc/finish_acerola_chat_job`, {
          method: "POST", headers,
          body: JSON.stringify({ p_job_id: job.job_id, p_response: null, p_error: reason }),
        });
        continue;
      }
      const saved = await fetch(`${url}/rest/v1/rpc/finish_acerola_chat_job`, {
        method: "POST", headers,
        body: JSON.stringify({ p_job_id: job.job_id, p_response: data, p_error: null }),
      });
      if (!saved.ok) throw new Error("Could not save the completed reply");
      try {
        const [keyResult, subscriptionResult] = await Promise.all([
          fetch(`${url}/rest/v1/rpc/get_acerola_vapid_keys`, { method: "POST", headers, body: "{}" }),
          fetch(`${url}/rest/v1/acerola_push_subscriptions?user_id=eq.${encodeURIComponent(job.user_id)}&select=id,subscription`, { headers }),
        ]);
        const keys = keyResult.ok ? await keyResult.json() : [];
        const subscriptions = subscriptionResult.ok ? await subscriptionResult.json() : [];
        if (keys?.[0]?.public_key && keys?.[0]?.private_key && Array.isArray(subscriptions) && subscriptions.length) {
          webpush.setVapidDetails("https://acerolaorionjr.github.io/acerola-ai/", keys[0].public_key, keys[0].private_key);
          const payload = JSON.stringify({ title: "Acerola reply ready", body: String(data.reply || "Acerola has finished replying.").slice(0, 160), chatId: job.conversation_id, jobId: job.job_id });
          await Promise.allSettled(subscriptions.map(async (sub: any) => {
            try { await webpush.sendNotification(sub.subscription, payload, { TTL: 86400 }); }
            catch (error: any) {
              const status = Number(error?.statusCode || 0);
              if (status === 404 || status === 410) await fetch(`${url}/rest/v1/acerola_push_subscriptions?id=eq.${encodeURIComponent(sub.id)}`, { method: "DELETE", headers });
            }
          }));
        }
      } catch (pushError) { console.warn("Acerola push delivery skipped:", pushError); }
      completed++;
    } catch (error) {
      await fetch(`${url}/rest/v1/rpc/finish_acerola_chat_job`, {
        method: "POST", headers,
        body: JSON.stringify({ p_job_id: job.job_id, p_response: null, p_error: error instanceof Error ? error.message : "Worker failed" }),
      }).catch(() => {});
    }
  }
  return reply({ ok: true, processed: jobs.length, completed });
});
