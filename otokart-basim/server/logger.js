/* Proje icinde dosya isimleri ve log kayitlari icin ortak yardimcilar.
 * - trParts(): yerel (UTC+3) tarih parcalari
 * - buildTimestamp(): YYYYAAGG_SSDDSS_mmm (saniye + milisaniye)
 * - listFileName(): otokart_prefix_2026..., ext
 * - logActivity(): DB'ye kayit */

function trParts(date = new Date()) {
  const p = (n, w = 2) => String(n).padStart(w, "0");
  return {
    y: date.getFullYear(),
    m: p(date.getMonth() + 1),
    d: p(date.getDate()),
    h: p(date.getHours()),
    mi: p(date.getMinutes()),
    s: p(date.getSeconds()),
    ms: String(date.getMilliseconds()).padStart(3, "0"),
    isoDate: `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`,
    isoTime: `${p(date.getHours())}:${p(date.getMinutes())}:${p(date.getSeconds())}`,
    isoDateTime: `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())} ${p(date.getHours())}:${p(date.getMinutes())}:${p(date.getSeconds())}`,
  };
}

function buildTimestamp(date = new Date()) {
  const p = trParts(date);
  return `${p.y}${p.m}${p.d}_${p.h}${p.mi}${p.s}_${p.ms}`;
}

function listFileName(prefix = "otokart_liste", ext = "zip", date = new Date()) {
  return `${prefix}_${buildTimestamp(date)}.${ext}`;
}

const db = require("./db");

function logActivity(action, details = null, entity = null) {
  try {
    const e = (entity && typeof entity === "object") ? entity : {};
    const d = details && typeof details === "object" ? details : { text: String(details ?? "") };
    db.prepare(
      `INSERT INTO activity_logs (level, action, username, role, category, batch_id, card_id, details_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      e.level || "info",
      String(action || "unknown"),
      e.username || null,
      e.role || null,
      e.category || null,
      e.batchId ?? null,
      e.cardId ?? null,
      JSON.stringify(d)
    );
  } catch (err) {
    console.error("[logger] logActivity failed:", err.message);
  }
}

module.exports = { trParts, buildTimestamp, listFileName, logActivity };
