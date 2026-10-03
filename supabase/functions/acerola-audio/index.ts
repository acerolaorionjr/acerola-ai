import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const ALLOWED_ORIGINS = new Set([
  "https://acerolaorionjr.github.io",
  "http://localhost:3000",
  "http://localhost:5173"
]);
const MAX_INPUT = 4096;
const VOICES = new Set(["alloy","ash","ballad","coral","echo","fable","onyx","nova","sage","shimmer","verse","marin","cedar"]);
const FORMATS = new Set(["mp3","opus","aac","flac","wav","pcm"]);

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
    return (await fetch(url + "/auth/v1/user", { headers: { Authorization: auth, apikey: key } })).ok;
  } catch { return false; }
}
function base64(bytes: Uint8Array) {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  return btoa(binary);
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("Origin");
  if (origin && !ALLOWED_ORIGINS.has(origin)) return json({ error: "Origin not allowed", code: "ORIGIN_NOT_ALLOWED" }, 403, origin);
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: headers(origin) });
  if (req.method !== "POST") return json({ error: "POST only" }, 405, origin);
  if (!(await authorized(req))) return json({ error: "Authentication required", code: "AUTH_REQUIRED" }, 401, origin);

  const key = Deno.env.get("OPENAI_API_KEY") || "";
  if (!key) return json({ error: "OpenAI API key is not configured", code: "OPENAI_NOT_CONFIGURED" }, 503, origin);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON", code: "INVALID_JSON" }, 400, origin); }

  const input = String(body?.input || body?.text || "").trim();
  if (!input) return json({ error: "input is required", code: "INPUT_REQUIRED" }, 400, origin);
  if (input.length > MAX_INPUT) return json({ error: "input is too long", code: "INPUT_TOO_LONG" }, 413, origin);

  const voice = VOICES.has(String(body?.voice || "")) ? String(body.voice) : "marin";
  const format = FORMATS.has(String(body?.response_format || "")) ? String(body.response_format) : "mp3";
  const speed = Math.min(4, Math.max(0.25, Number(body?.speed) || 1));
  const instructions = String(body?.instructions || "").trim().slice(0, 1000);

  try {
    const upstream = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini-tts",
        voice,
        input,
        instructions: instructions || undefined,
        response_format: format,
        speed
      })
    });
    if (!upstream.ok) {
      const raw = await upstream.text();
      let data: any = {};
      try { data = JSON.parse(raw); } catch {}
      const message = String(data?.error?.message || "Audio generation failed").slice(0, 500);
      return json({ error: message, code: upstream.status === 429 ? "AUDIO_QUOTA_OR_RATE_LIMIT" : "AUDIO_GENERATION_FAILED", provider_status: upstream.status }, upstream.status === 429 ? 429 : 502, origin);
    }
    const bytes = new Uint8Array(await upstream.arrayBuffer());
    if (!bytes.length) return json({ error: "The audio model returned no audio.", code: "AUDIO_EMPTY" }, 502, origin);
    const mime = format === "wav" ? "audio/wav" : format === "opus" ? "audio/ogg" : format === "aac" ? "audio/aac" : format === "flac" ? "audio/flac" : "audio/mpeg";
    return json({ ok: true, audio: "data:" + mime + ";base64," + base64(bytes), format, voice, model: "gpt-4o-mini-tts" }, 200, origin);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Audio service unavailable", code: "AUDIO_NETWORK_FAILED" }, 502, origin);
  }
});
