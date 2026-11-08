// Cloudflare Worker: CORS proxy for DeepSeek public shares.
// Deploy: dash.cloudflare.com > Workers > Create > paste this > Deploy.
const ID_RE = /^[A-Za-z0-9_-]{6,64}$/;

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "*";
    const allowed = env.ALLOWED_ORIGIN || "*"; // e.g. https://questi0ns-x.github.io
    const cors = {
      "Access-Control-Allow-Origin": allowed,
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Vary": "Origin",
    };
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (allowed !== "*" && origin !== allowed)
      return new Response(JSON.stringify({ error: "origin not allowed" }), { status: 403, headers: cors });

    const id = new URL(request.url).searchParams.get("share_id") || "";
    if (!ID_RE.test(id))
      return new Response(JSON.stringify({ error: "bad share_id" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });

    const up = await fetch(
      "https://chat.deepseek.com/api/v0/share/content?share_id=" + encodeURIComponent(id),
      { headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0" } }
    );
    return new Response(up.body, {
      status: up.status,
      headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "public, max-age=300" },
    });
  },
};
