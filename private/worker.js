/*
 * Private site API. Reads and writes the list files in this GitHub repository
 * so edits made on the page and edits made by Claude land in the same place.
 *
 * Every /api request must carry a valid Cloudflare Access login token for this
 * site. Without TEAM_DOMAIN and POLICY_AUD configured, every request is refused.
 * The GitHub token is a Worker secret named GITHUB_TOKEN.
 */
const REPO = "Joshua-Lovett/personal-site";
const BRANCH = "main";
const DIR = "private/data";
const KEYS = ["todos", "goals", "dreamboard", "done", "connections"];
const MAX_BYTES = 400000;

let jwks = null;
let jwksAt = 0;

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

const b64uToBytes = (s) => {
  const b = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(b, (c) => c.charCodeAt(0));
};
const bytesToB64 = (bytes) => {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 8192) bin += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(bin);
};
const teamDomain = (env) => String(env.TEAM_DOMAIN || "").replace(/^https?:\/\//, "").replace(/\/+$/, "");

async function getKeys(env, force) {
  if (!force && jwks && Date.now() - jwksAt < 600000) return jwks;
  const r = await fetch("https://" + teamDomain(env) + "/cdn-cgi/access/certs");
  if (!r.ok) throw new Error("certs");
  jwks = (await r.json()).keys || [];
  jwksAt = Date.now();
  return jwks;
}

async function verifyAccess(request, env) {
  const token = request.headers.get("Cf-Access-Jwt-Assertion");
  if (!token || !teamDomain(env) || !env.POLICY_AUD) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const dec = new TextDecoder();
    const header = JSON.parse(dec.decode(b64uToBytes(parts[0])));
    const payload = JSON.parse(dec.decode(b64uToBytes(parts[1])));
    if (header.alg !== "RS256") return null;
    let key = (await getKeys(env, false)).find((k) => k.kid === header.kid);
    if (!key) key = (await getKeys(env, true)).find((k) => k.kid === header.kid);
    if (!key) return null;
    const cryptoKey = await crypto.subtle.importKey("jwk", key, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
    const ok = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", cryptoKey, b64uToBytes(parts[2]), new TextEncoder().encode(parts[0] + "." + parts[1]));
    if (!ok) return null;
    const aud = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
    if (!aud.includes(env.POLICY_AUD)) return null;
    if (payload.iss !== "https://" + teamDomain(env)) return null;
    if (!payload.exp || payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch (e) {
    return null;
  }
}

const gh = (env, path, init = {}) =>
  fetch("https://api.github.com/repos/" + REPO + path, {
    ...init,
    headers: {
      Authorization: "Bearer " + env.GITHUB_TOKEN,
      Accept: "application/vnd.github+json",
      "User-Agent": "personal-site-worker",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init.headers || {}),
    },
  });

async function readKey(env, key) {
  const r = await gh(env, "/contents/" + DIR + "/" + key + ".json?ref=" + BRANCH);
  if (!r.ok) return json({ error: "read_failed" }, 502);
  const f = await r.json();
  const text = new TextDecoder().decode(b64uToBytes(String(f.content).replace(/\s/g, "").replace(/\+/g, "-").replace(/\//g, "_")));
  let items = [];
  try { items = JSON.parse(text).items || []; } catch (e) {}
  return json({ items, sha: f.sha });
}

async function writeKey(env, key, request) {
  let body;
  try { body = await request.json(); } catch (e) { return json({ error: "bad_json" }, 400); }
  if (!Array.isArray(body.items) || typeof body.sha !== "string") return json({ error: "bad_body" }, 400);
  const text = JSON.stringify({ items: body.items }, null, 2) + "\n";
  const bytes = new TextEncoder().encode(text);
  if (bytes.length > MAX_BYTES) return json({ error: "too_large" }, 413);
  const r = await gh(env, "/contents/" + DIR + "/" + key + ".json", {
    method: "PUT",
    body: JSON.stringify({ message: "Update " + key + " from the site", content: bytesToB64(bytes), sha: body.sha, branch: BRANCH }),
  });
  if (r.status === 409 || r.status === 422) return json({ error: "conflict" }, 409);
  if (!r.ok) return json({ error: "write_failed" }, 502);
  const out = await r.json();
  return json({ sha: out.content.sha });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith("/api/")) return env.ASSETS.fetch(request);

    if (!(await verifyAccess(request, env))) return json({ error: "unauthorized" }, 401);
    if (!env.GITHUB_TOKEN) return json({ error: "not_configured" }, 503);

    const m = url.pathname.match(/^\/api\/data\/([a-z]+)$/);
    if (!m || !KEYS.includes(m[1])) return json({ error: "not_found" }, 404);
    const key = m[1];

    if (request.method === "GET") return readKey(env, key);
    if (request.method === "PUT") {
      const origin = request.headers.get("Origin");
      if (origin && origin !== url.origin) return json({ error: "bad_origin" }, 403);
      if (!(request.headers.get("Content-Type") || "").startsWith("application/json")) return json({ error: "bad_type" }, 415);
      return writeKey(env, key, request);
    }
    return json({ error: "method" }, 405);
  },
};
