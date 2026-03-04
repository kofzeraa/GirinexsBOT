import crypto from "crypto";
import { cfg } from "./config.js";

export function makeKeyCode() {
  const chunks = Array.from({ length: 5 }, () => crypto.randomBytes(2).toString("hex").toUpperCase());
  return `${cfg.keyPrefix}-${chunks.join("-")}`;
}

export function calcExpiresAt(days) {
  const d = new Date();
  d.setDate(d.getDate() + Number(days || 0));
  return d.toISOString();
}
