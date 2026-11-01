import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const ALLOWED_ORIGINS = new Set(["https://acerolaorionjr.github.io", "http://localhost:3000", "http://localhost:5173"]);
const headersFor = (origin: string | null) => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Vary": "Origin",
  };
  if (origin && ALLOWED_ORIGINS.has(origin)) headers["Access-Control-Allow-Origin"] = origin;
  return headers;
};
const json = (body: unknown, status: number, origin: string | null) =>
  new Response(JSON.stringify(body), { status, headers: headersFor(origin) });

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("Origin");
  if (origin && !ALLOWED_ORIGINS.has(origin)) return json({ error: "Origin not allowed" }, 403, origin);
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: headersFor(origin) });

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const publishableKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY");
  const authorization = req.headers.get("Authorization") || "";
  if (!url || !serviceKey || !publishableKey || !authorization.startsWith("Bearer ")) return json({ error: "Authentication required" }, 401, origin);

  const authResponse = await fetch(`${url}/auth/v1/user`, {
    headers: { Authorization: authorization, apikey: publishableKey },
  });
  if (!authResponse.ok) return json({ error: "Authentication required" }, 401, origin);
  const user = await authResponse.json();
  if (!user?.id) return json({ error: "Authentication required" }, 401, origin);

  const restHeaders = { Authorization: `Bearer ${serviceKey}`, apikey: serviceKey, "Content-Type": "application/json" };
  if (req.method === "POST") {
    let body: any;
    try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400, origin); }
    if (body?.action !== "submit") return json({ error: "Unknown action" }, 400, origin);
    const payload = body.payload && typeof body.payload === "object" ? body.payload : {};
    const message = String(payload.message || "").trim();
    if (!message || message.length > 12000) return json({ error: "Message must be 1–12000 characters" }, 400, origin);
    const attachments = Array.isArray(payload.attachments) ? payload.attachments.slice(0, 5) : [];
    let total = 0;
    for (const item of attachments) {
      const data = String(item?.data || "");
      const match = data.match(/^data:([^;,]+);base64,([A-Za-z0-9+/=\r\n]+)$/);
      if (!match) return json({ error: "One of the attachments is invalid" }, 400, origin);
      const bytes = Math.floor(match[2].replace(/\s+/g, "").length * 3 / 4);
      total += bytes;
      if (bytes > 8 * 1024 * 1024 || total > 20 * 1024 * 1024) return json({ error: "Attachment size limit exceeded" }, 413, origin);
    }
    const conversationId = String(body.conversation_id || crypto.randomUUID()).slice(0, 160);
    const created = await fetch(`${url}/rest/v1/rpc/create_acerola_chat_job`, {
      method: "POST", headers: restHeaders,
      body: JSON.stringify({
        p_user_id: user.id,
        p_conversation_id: conversationId,
        p_payload: { ...payload, agent_mode: false, available_tools: [], tool_results: [] },
        p_access_token: authorization.slice(7),
      }),
    });
    if (!created.ok) return json({ error: "Could not queue your message", detail: (await created.text()).slice(0, 250) }, 502, origin);
    const jobId = await created.json();
    return json({ ok: true, job_id: jobId, conversation_id: conversationId, status: "queued" }, 202, origin);
  }

  if (req.method === "GET") {
    const requestUrl = new URL(req.url);
    const jobId = requestUrl.searchParams.get("job_id") || "";
    if (!/^[0-9a-f-]{36}$/i.test(jobId)) return json({ error: "A valid job_id is required" }, 400, origin);
    const result = await fetch(`${url}/rest/v1/acerola_chat_jobs?id=eq.${encodeURIComponent(jobId)}&user_id=eq.${encodeURIComponent(user.id)}&select=id,status,response,error,attempts,created_at,updated_at,completed_at&limit=1`, { headers: restHeaders });
    if (!result.ok) return json({ error: "Could not read job status" }, 502, origin);
    const rows = await result.json();
    if (!rows.length) return json({ error: "Job not found" }, 404, origin);
    return json({ ok: true, job: rows[0] }, 200, origin);
  }

  return json({ error: "Method not allowed" }, 405, origin);
});
