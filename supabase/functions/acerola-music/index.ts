import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const ALLOWED_ORIGINS = new Set([
  "https://acerolaorionjr.github.io",
  "http://localhost:3000",
  "http://localhost:5173"
]);

function headers(origin: string | null, contentType = "application/json; charset=utf-8") {
  const h: Record<string,string> = {
    "Content-Type": contentType,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Cache-Control": "no-store",
    "Vary": "Origin",
    "X-Content-Type-Options": "nosniff"
  };
  if (origin && ALLOWED_ORIGINS.has(origin)) h["Access-Control-Allow-Origin"] = origin;
  return h;
}
function json(data: unknown, status = 200, origin: string | null = null) {
  return new Response(JSON.stringify(data), { status, headers: headers(origin) });
}
async function authorized(req: Request) {
  const auth = req.headers.get("Authorization");
  const key = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY") || "";
  const url = Deno.env.get("SUPABASE_URL") || "";
  if (!auth?.startsWith("Bearer ") || !key || !url) return false;
  try {
    return (await fetch(url + "/auth/v1/user", {
      headers: { Authorization: auth, apikey: key }
    })).ok;
  } catch { return false; }
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("Origin");
  if (origin && !ALLOWED_ORIGINS.has(origin)) return json({ error: "Origin not allowed", code: "ORIGIN_NOT_ALLOWED" }, 403, origin);
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: headers(origin) });
  if (req.method !== "POST") return json({ error: "POST only" }, 405, origin);
  if (!(await authorized(req))) return json({ error: "Authentication required", code: "AUTH_REQUIRED" }, 401, origin);

  const key = Deno.env.get("GEMINI_API_KEY") || Deno.env.get("GOOGLE_API_KEY") || "";
  if (!key) return json({ error: "Gemini API key is not configured in Supabase secrets", code: "GEMINI_NOT_CONFIGURED" }, 503, origin);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON", code: "INVALID_JSON" }, 400, origin); }

  const prompt = String(body?.prompt || "").trim();
  if (!prompt) return json({ error: "prompt is required", code: "PROMPT_REQUIRED" }, 400, origin);
  if (prompt.length > 6000) return json({ error: "prompt is too long", code: "PROMPT_TOO_LONG" }, 413, origin);

  const model = body?.model === "lyria-3-clip-preview" ? "lyria-3-clip-preview" : "lyria-3.5";
  const input = Array.isArray(body?.images)
    ? [{ type: "text", text: prompt }, ...body.images.slice(0, 10).map((x: any) => ({
        type: "image",
        mime_type: String(x?.mime_type || "image/jpeg"),
        data: String(x?.data || "")
      })).filter((x: any) => x.data)]
    : prompt;

  try {
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        model,
        input,
        response_format: { type: "audio" }
      })
    });

    const raw = await response.text();
    let data: any = {};
    try { data = JSON.parse(raw); } catch {}
    if (!response.ok) {
      const message = String(data?.error?.message || "Music generation failed").slice(0, 500);
      return json({
        error: message,
        code: response.status === 429 ? "MUSIC_QUOTA_OR_RATE_LIMIT" : "MUSIC_GENERATION_FAILED",
        provider_status: response.status
      }, response.status === 429 ? 429 : 502, origin);
    }

    const audio = data?.output_audio?.data ||
      data?.outputAudio?.data ||
      data?.steps?.flatMap((s: any) => Array.isArray(s?.content) ? s.content : [])
        ?.find((c: any) => c?.type === "audio" && c?.data)?.data || "";

    const lyrics = String(data?.output_text || data?.outputText || "").trim();
    if (!audio) return json({ error: "The music model returned no audio.", code: "MUSIC_EMPTY" }, 502, origin);

    return json({
      ok: true,
      model,
      audio: "data:audio/mpeg;base64," + audio,
      lyrics: lyrics.slice(0, 12000)
    }, 200, origin);
  } catch (error) {
    return json({
      error: error instanceof Error ? error.message : "Music service unavailable",
      code: "MUSIC_NETWORK_FAILED"
    }, 502, origin);
  }
});
