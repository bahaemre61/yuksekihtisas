const cron = require("node-cron");
const db = require("./db");

// Bekleyen isleri toplu basima hazirla (durumu 'pending' olan kartlar)
function prepareBatchForPrint(batchId) {
  const batch = db.prepare("SELECT * FROM batches WHERE id = ?").get(batchId);
  if (!batch) return { ok: false, error: "batch yok" };
  const cards = db
    .prepare("SELECT * FROM cards WHERE batch_id = ? AND status != 'printed'")
    .all(batchId);
  if (cards.length === 0) return { ok: false, error: "bekleyen kart yok" };
  return { ok: true, batch, cards };
}

// Mail zamanlayici: gun sonu (daily) ve haftada bir (weekly)
function startScheduler({ onMailJob }) {
  cron.schedule("* * * * *", () => {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    const current = `${hh}:${mm}`;
    const weekday = now.getDay();

    const rows = db.prepare("SELECT * FROM mail_jobs WHERE active = 1").all();
    for (const s of rows) {
      if (!s.send_time || s.send_time !== current) continue;
      if (s.mode === "weekly" && Number(s.weekday) !== weekday) continue;

      const last = s.last_run ? new Date(String(s.last_run).replace(" ", "T") + "Z").getTime() : 0;
      if (Date.now() - last < 120000) continue;

      db.prepare("UPDATE mail_jobs SET last_run = datetime('now') WHERE id = ?").run(s.id);
      if (onMailJob) onMailJob(s);
    }
  });

  console.log("[scheduler] Mail zamanlayici baslatildi (gun sonu/haftada bir)");
}

module.exports = { startScheduler, prepareBatchForPrint };
