import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const MAX_PROMPT = 4000;
const ALLOWED_ORIGINS = new Set([
  "https://acerolaorionjr.github.io",
  "http://localhost:3000",
  "http://localhost:5173"
]);

function headers(origin: string | null, contentType = "application/json; charset=utf-8") {
  const h: Record<string, string> = {
    "Content-Type": contentType,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Cache-Control": "no-store",
    "Vary": "Origin"
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
  } catch {
    return false;
  }
}

const geminiKey = () => Deno.env.get("GEMINI_API_KEY") || "";

function providerError(data: any, fallback: string) {
  const message = String(data?.error?.message || fallback).slice(0, 500);
  const lower = message.toLowerCase();
  if (lower.includes("quota") || lower.includes("rate limit") || lower.includes("resource exhausted") || lower.includes("exceeded")) {
    return {
      error: "Video generation quota is currently unavailable. Your Acerola request was received, but the video service has no available quota right now.",
      code: "VEO_QUOTA_EXCEEDED",
      provider_error: message
    };
  }
  return { error: message, code: "VEO_START_FAILED" };
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("Origin");
  if (origin && !ALLOWED_ORIGINS.has(origin)) return json({ error: "Origin not allowed", code: "ORIGIN_NOT_ALLOWED" }, 403, origin);
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: headers(origin) });
  if (!(await authorized(req))) return json({ error: "Authentication required", code: "AUTH_REQUIRED" }, 401, origin);

  const apiKey = geminiKey();
  if (!apiKey) return json({ error: "Gemini API key is not configured in Supabase secrets", code: "GEMINI_NOT_CONFIGURED" }, 503, origin);

  if (req.method === "GET") {
    const u = new URL(req.url);
    const operation = String(u.searchParams.get("operation") || "").trim();
    const download = u.searchParams.get("download") === "1";
    if (!operation || !/^projects\//.test(operation)) return json({ error: "A valid operation is required", code: "INVALID_OPERATION" }, 400, origin);

    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/${operation}`, {
        headers: { "x-goog-api-key": apiKey }
      });
      const raw = await r.text();
      let data: any = {};
      try { data = JSON.parse(raw); } catch {}
      if (!r.ok) {
        const pe = providerError(data, "Veo status request failed");
        return json({ ...pe, code: pe.code === "VEO_START_FAILED" ? "VEO_STATUS_FAILED" : pe.code }, 502, origin);
      }

      const sample = data?.response?.generateVideoResponse?.generatedSamples?.[0]?.video;
      if (download && data?.done && sample?.uri) {
        const video = await fetch(sample.uri, { headers: { "x-goog-api-key": apiKey } });
        if (!video.ok) return json({ error: "Generated video download failed", code: "VEO_DOWNLOAD_FAILED" }, 502, origin);
        const h = new Headers();
        h.set("Content-Type", video.headers.get("Content-Type") || "video/mp4");
        h.set("Cache-Control", "private, no-store");
        h.set("Content-Disposition", 'inline; filename="acerola-short.mp4"');
        return new Response(video.body, { status: 200, headers: h });
      }

      return json({
        ok: true,
        done: !!data?.done,
        operation: data?.name || operation,
        error: data?.error?.message || null,
        video_uri: sample?.uri || null
      }, 200, origin);
    } catch {
      return json({ error: "Could not check Veo operation", code: "VEO_NETWORK_FAILED" }, 502, origin);
    }
  }

  if (req.method !== "POST") return json({ error: "POST or GET only" }, 405, origin);

  let body: any;
  try { body = await req.json(); } catch {
    return json({ error: "Invalid JSON", code: "INVALID_JSON" }, 400, origin);
  }

  const prompt = String(body?.prompt || "").trim();
  if (!prompt) return json({ error: "prompt is required", code: "PROMPT_REQUIRED" }, 400, origin);
  if (prompt.length > MAX_PROMPT) return json({ error: "prompt is too long", code: "PROMPT_TOO_LONG" }, 413, origin);

  const aspectRatio = body?.aspect_ratio === "16:9" ? "16:9" : "9:16";
  const model = body?.model === "veo-3.1-fast-generate-preview"
    ? "veo-3.1-fast-generate-preview"
    : "veo-3.1-generate-preview";

  try {
    const start = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:predictLongRunning`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({ instances: [{ prompt }], parameters: { aspectRatio } })
    });

    const raw = await start.text();
    let data: any = {};
    try { data = JSON.parse(raw); } catch {}

    if (!start.ok) {
      const pe = providerError(data, "Veo request failed");
      return json({ ...pe, provider_status: start.status }, pe.code === "VEO_QUOTA_EXCEEDED" ? 429 : 502, origin);
    }

    return json({
      ok: true,
      operation: data?.name || null,
      model,
      aspect_ratio: aspectRatio,
      status: "queued"
    }, 200, origin);
  } catch {
    return json({ error: "Could not reach Gemini Veo", code: "VEO_NETWORK_FAILED" }, 502, origin);
  }
});
