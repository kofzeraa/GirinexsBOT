import fetch from "node-fetch";
import { cfg } from "./config.js";

function headers() {
  return { "api_key": cfg.base44ApiKey, "Content-Type": "application/json" };
}

async function req(method, path, body) {
  const url = `${cfg.base44ApiUrl}${path}`;
  const r = await fetch(url, { method, headers: headers(), body: body ? JSON.stringify(body) : undefined });
  const txt = await r.text();
  let data = null;
  try { data = txt ? JSON.parse(txt) : null; } catch { data = txt; }
  if (!r.ok) throw new Error(`Base44 ${method} ${path} -> ${r.status}: ${typeof data === "string" ? data : JSON.stringify(data)}`);
  return data;
}

export function pickId(entity) {
  return entity?.id ?? entity?._id ?? entity?.data?.id ?? entity?.data?._id ?? null;
}

export async function listEntities(name) {
  const data = await req("GET", `/entities/${name}`);
  return Array.isArray(data) ? data : (data?.data ?? data ?? []);
}

// DiscordChannel upsert (by channel_id)
export async function upsertDiscordChannel(channelId, payload) {
  const list = await listEntities("DiscordChannel");
  const found = list.find(x => (x.channel_id || x.channelId) === channelId);
  if (found) {
    const id = pickId(found);
    const upd = await req("PUT", `/entities/DiscordChannel/${id}`, payload);
    return { id: pickId(upd) || id, raw: upd, existed: true };
  }
  const created = await req("POST", "/entities/DiscordChannel", payload);
  return { id: pickId(created), raw: created, existed: false };
}

// Payment
export async function createPayment(payload) {
  const data = await req("POST", "/entities/Payment", payload);
  return { raw: data, id: pickId(data) };
}
export async function updatePayment(id, payload) {
  const data = await req("PUT", `/entities/Payment/${id}`, payload);
  return { raw: data, id: pickId(data) || id };
}

// Key
export async function createKey(payload) {
  const data = await req("POST", "/entities/Key", payload);
  return { raw: data, id: pickId(data) };
}
export async function updateKey(id, payload) {
  const data = await req("PUT", `/entities/Key/${id}`, payload);
  return { raw: data, id: pickId(data) || id };
}
