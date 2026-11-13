const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

const ROOT = path.resolve(__dirname, "..");
const DB_PATH = path.join(ROOT, "otokart.db");

// Klasorleri olustur
for (const d of ["uploads", "photos", "output", "jobs"]) {
  const p = path.join(ROOT, d);
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'operator',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS batches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'excel',
  filename TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  scheduled_at TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  printed_at TEXT
);

CREATE TABLE IF NOT EXISTS cards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  batch_id INTEGER NOT NULL,
  photo_file TEXT,
  data_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  printed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS mail_jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'daily', -- daily | weekly
  category TEXT,
  to_email TEXT NOT NULL,
  subject TEXT,
  body TEXT,
  send_time TEXT NOT NULL DEFAULT '18:00', -- HH:MM
  weekday INTEGER, -- 0=Pazar ... 6=Cumartesi (weekly)
  active INTEGER NOT NULL DEFAULT 1,
  last_run TEXT,
  last_status TEXT,
  created_by TEXT,
  created_by_role TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS mail_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id INTEGER,
  mode TEXT,
  to_email TEXT,
  batch_ids TEXT,
  status TEXT NOT NULL,
  error TEXT,
  created_by TEXT,
  sent_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS activity_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  level TEXT NOT NULL DEFAULT 'info', -- info | warn | error
  action TEXT NOT NULL,
  username TEXT,
  role TEXT,
  category TEXT,
  batch_id INTEGER,
  card_id INTEGER,
  details_json TEXT,
  ip TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON activity_logs (created_at);
CREATE INDEX IF NOT EXISTS idx_activity_logs_username ON activity_logs (username);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs (action);
CREATE INDEX IF NOT EXISTS idx_activity_logs_category ON activity_logs (category);
`);

// ---- Migrations (mevcut veritabani bozulmadan) ----
function tableExists(name) {
  return db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name = ?").get(name)?.name === name;
}
if (tableExists("schedules")) db.exec("DROP TABLE IF EXISTS schedules");

function hasColumn(table, col) {
  return db.prepare(`PRAGMA table_info(${table})`).all().some((c) => c.name === col);
}
if (!hasColumn("batches", "created_by_role")) {
  db.exec("ALTER TABLE batches ADD COLUMN created_by_role TEXT");
}
if (!hasColumn("batches", "mail_sent_at")) {
  db.exec("ALTER TABLE batches ADD COLUMN mail_sent_at TEXT");
}
if (!hasColumn("mail_logs", "created_by")) {
  db.exec("ALTER TABLE mail_logs ADD COLUMN created_by TEXT");
}
if (!hasColumn("mail_jobs", "created_by_role")) {
  db.exec("ALTER TABLE mail_jobs ADD COLUMN created_by_role TEXT");
}

// Eski kayitlarda rol bos ise kullanicidan tamamla
db.exec(`
  UPDATE batches
  SET created_by_role = (SELECT role FROM users WHERE users.username = batches.created_by)
  WHERE created_by_role IS NULL AND created_by IS NOT NULL
`);

// Varsayilan ayarlar
const DEFAULT_MAIL_BODY = `Merhaba,

Ekli dosyada ilgili kart basım listesi ve fotoğraflar yer almaktadır. Kartların basılmadan önce kontrol edilmesini, onayımız sonrasında basım işlemlerinin gerçekleştirilmesini ve basımı tamamlanan kartların RFID bilgileriyle birlikte Excel formatında tarafımıza gönderilmesini rica ederiz.

İyi çalışmalar.`;

const defaults = [
  ["mail_smtp_host", "smtp.gmail.com"],
  ["mail_smtp_port", "587"],
  ["mail_smtp_user", ""],
  ["mail_smtp_pass", ""],
  ["mail_smtp_secure", "false"],
  ["mail_from_name", "OtoKart"],
  ["mail_to_default", ""],
  ["mail_subject_template", "OtoKart - Kart Basım Listesi"],
  ["mail_body_template", DEFAULT_MAIL_BODY],
  ["mail_daily_time", "18:00"],
  ["mail_weekly_day", "1"],
  ["mail_weekly_time", "09:00"],
];
const upsertSetting = db.prepare(
  "INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)"
);
for (const [k, v] of defaults) upsertSetting.run(k, v);

module.exports = db;
