const express = require("express");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { parseExcel, suggestMapping } = require("./excel");
const { enrichUniversity, universityList, missingReport, missingFields } = require("./university");
const XLSX = require("xlsx");
const { sampleExcelBuffer } = require("./sampleExcel");
const { generateSinglePdf, generatePrintPdf } = require("./pdf");
const db = require("./db");
const { startScheduler } = require("./scheduler");
const {
  allowedCategories,
  canAccessCategory,
  canUseMail,
  ROLE_LABELS,
  VALID_ROLES,
} = require("./permissions");
const { photosDir, findPhoto, countMatched } = require("./photos");
const mail = require("./mail");
const { logActivity, listFileName, buildTimestamp, trParts } = require("./logger");

const ROOT = path.resolve(__dirname, "..");
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "10mb" }));
app.use(express.static(path.join(ROOT, "web")));

// ---- Upload ayarlari ----
const uploadDir = path.join(ROOT, "uploads");
const outputDir = path.join(ROOT, "output");
for (const d of [uploadDir, photosDir, outputDir]) {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
}

const excelUpload = multer({
  storage: multer.diskStorage({
    destination: uploadDir,
    filename: (req, file, cb) => {
      // Turkce/ozel karakterleri temizle (dosya yolu uyumlulugu)
      const safe = Buffer.from(file.originalname, "latin1").toString("utf8")
        .replace(/[^\w.\- ]+/g, "_")
        .replace(/\s+/g, "_");
      cb(null, `${Date.now()}_${safe}`);
    },
  }),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === ".xlsx" || ext === ".xls") cb(null, true);
    else cb(new Error("Sadece Excel (.xlsx/.xls) dosyasi kabul edilir"));
  },
});

const photoUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const cat = (req.params.category || "genel").replace(/[^a-z0-9_\-]/gi, "");
      const dir = path.join(photosDir, cat);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
      const base = path.basename(file.originalname, ext).replace(/[^\d]/g, "");
      cb(null, `${base || Date.now()}${ext}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
});

// ---- Auth ----
// PORTAL_JWT_SECRET (veya JWT_SECRET) tanimliysa uygulama portal oturumuyla calisir (SSO):
// portalin "token" cerezindeki JWT dogrulanir, ayri giris / kayit kapatilir.
// Tanimli degilse eski bagimsiz mod (kendi kullanici tablosu + x-session) calisir.
const PORTAL_SECRET = process.env.PORTAL_JWT_SECRET || process.env.JWT_SECRET || "";
const SSO = !!PORTAL_SECRET;
// Portal rolu -> OtoKart rolu. Listede olmayan roller erisemez.
const PORTAL_ROLE_MAP = { admin: "admin", ogrenci_isleri: "ogrenci_isleri" };

function readCookie(req, name) {
  const raw = req.headers.cookie || "";
  for (const part of raw.split(";")) {
    const i = part.indexOf("=");
    if (i > 0 && part.slice(0, i).trim() === name) {
      try { return decodeURIComponent(part.slice(i + 1).trim()); } catch { return null; }
    }
  }
  return null;
}

function portalUser(req) {
  const token = readCookie(req, "token");
  if (!token) return { error: 401 };
  let payload;
  try {
    payload = jwt.verify(token, PORTAL_SECRET);
  } catch {
    return { error: 401 };
  }
  const role = PORTAL_ROLE_MAP[payload.role];
  if (!role) return { error: 403 };
  return { user: { username: payload.name || payload.id, role } };
}

const sessions = new Map();
function auth(req, res, next) {
  if (SSO) {
    const r = portalUser(req);
    if (r.error === 403) return res.status(403).json({ error: "Bu modulu kullanma yetkiniz yok" });
    if (r.error) return res.status(401).json({ error: "Giris yapilmadi" });
    req.user = r.user;
    return next();
  }
  // Header veya query string uzerinden token kabul et (img etiketleri header gonderemez)
  const token = req.headers["x-session"] || req.query.token;
  if (!token || !sessions.has(token)) return res.status(401).json({ error: "Giris yapilmadi" });
  req.user = sessions.get(token);
  next();
}

// ---- Kategoriler ----
const CATEGORIES = {
  ogrenci: { label: "Öğrenci", folder: "ogrenci" },
  akademik: { label: "Akademik", folder: "akademik" },
  idari: { label: "İdari", folder: "idari" },
  stajer: { label: "Stajer Doktor", folder: "stajer" },
  intorn: { label: "İntörn", folder: "intorn" },
};

// ---- Yetki yardimcilari ----
function getBatchForUser(req, res, id) {
  const batch = db.prepare("SELECT * FROM batches WHERE id = ?").get(id);
  if (!batch) {
    res.status(404).json({ error: "Batch bulunamadi" });
    return null;
  }
  if (!canAccessCategory(req.user.role, batch.category)) {
    res.status(403).json({ error: "Bu kategoriye erisim yetkiniz yok" });
    return null;
  }
  return batch;
}

function categoryFilterSql(role) {
  const cats = allowedCategories(role);
  return { sql: `(${cats.map(() => "?").join(",")})`, params: cats };
}

// ---- Auth endpointleri ----
// SSO modunda mevcut portal oturumunu dondurur (arayuz giris ekranini atlar)
app.get("/api/sso-me", (req, res) => {
  if (!SSO) return res.status(404).json({ error: "SSO kapali" });
  const r = portalUser(req);
  if (r.error === 403) return res.status(403).json({ error: "Bu modulu kullanma yetkiniz yok" });
  if (r.error) return res.status(401).json({ error: "Portal oturumu bulunamadi" });
  res.json(r.user);
});

app.post("/api/login", (req, res) => {
  if (SSO) return res.status(404).json({ error: "Giris portal uzerinden yapilir" });
  const { username, password } = req.body || {};
  const user = db.prepare("SELECT * FROM users WHERE username = ?").get(username);
  if (!user || user.password !== password) {
    logActivity("login_error", { username }, { level: "warn" });
    return res.status(401).json({ error: "Kullanici adi veya sifre hatali" });
  }
  const token = `t_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  sessions.set(token, { username: user.username, role: user.role });
  logActivity("login_ok", { username, role: user.role });
  res.json({ token, username: user.username, role: user.role });
});

app.post("/api/register", (req, res) => {
  if (SSO) return res.status(404).json({ error: "Kayit kapali" });
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: "Kullanici adi ve sifre zorunlu" });
  try {
    db.prepare("INSERT INTO users (username, password, role) VALUES (?, ?, 'operator')").run(username, password);
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: "Kullanici zaten var" });
  }
});

// ---- Kategoriler (role gore filtrelenmis) ----
app.get("/api/categories", auth, (req, res) => {
  const allowed = allowedCategories(req.user.role);
  res.json(
    Object.entries(CATEGORIES)
      .filter(([key]) => allowed.includes(key))
      .map(([key, v]) => ({ key, label: v.label }))
  );
});

// ---- Fakülte / bölüm listesi (TR-EN) ----
app.get("/api/university", (req, res) => {
  res.json(universityList());
});

// ---- Excel upload + mapping onerisi ----
app.post("/api/excel/analyze", excelUpload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Dosya yuklenmedi" });
  try {
    const result = parseExcel(req.file.path);
    logActivity("excel_analyze", { filename: req.file.originalname, total: result.rows.length }, { username: req.user?.username || null, role: req.user?.role || null });
    res.json({
      filename: req.file.filename,
      headers: result.headers,
      suggested: suggestMapping(result.headers),
      sample: result.rows.slice(0, 5),
      total: result.rows.length,
    });
  } catch (e) {
    res.status(400).json({ error: "Excel okunamadi: " + e.message });
  }
});

// ---- Excel onizleme (kayit olusturmadan) ----
app.post("/api/excel/preview", auth, (req, res) => {
  const { filename, mapping, category } = req.body || {};
  if (!filename) return res.status(400).json({ error: "Dosya yok" });
  if (!canAccessCategory(req.user.role, category)) {
    return res.status(403).json({ error: "Bu kategoriye erisim yetkiniz yok" });
  }
  const filePath = path.join(uploadDir, path.basename(String(filename)));
  if (!fs.existsSync(filePath)) return res.status(400).json({ error: "Excel dosyasi bulunamadi" });
  try {
    const result = parseExcel(filePath, mapping || null);
    const rows = result.rows;
    const report = missingReport(
      category,
      rows.map((r, i) => ({ id: i + 1, data: r }))
    );
    logActivity("excel_preview", { filename, category, total: rows.length }, { username: req.user.username, role: req.user.role, category });
    res.json({ total: rows.length, rows, report });
  } catch (e) {
    res.status(400).json({ error: "Excel okunamadi: " + e.message });
  }
});

// ---- Batch olustur (excel veya manuel) ----
app.post("/api/batches", auth, (req, res) => {
  const { category, name, source, filename, mapping, rows } = req.body || {};
  if (!category || !CATEGORIES[category]) return res.status(400).json({ error: "Gecersiz kategori" });
  if (!canAccessCategory(req.user.role, category)) {
    return res.status(403).json({ error: "Bu kategoriye erisim yetkiniz yok" });
  }

  const info = db
    .prepare(
      "INSERT INTO batches (category, name, source, filename, created_by, created_by_role) VALUES (?, ?, ?, ?, ?, ?)"
    )
    .run(category, name || `${CATEGORIES[category].label} - ${new Date().toLocaleDateString("tr-TR")}`, source || "excel", filename || null, req.user.username, req.user.role);
  const batchId = info.lastInsertRowid;

  let inserted = 0;
  if (source === "manual" && rows && rows.length) {
    const stmt = db.prepare("INSERT INTO cards (batch_id, data_json) VALUES (?, ?)");
    for (const r of rows) stmt.run(batchId, JSON.stringify(enrichUniversity(r)));
    inserted = rows.length;
  } else if (filename) {
    const filePath = path.join(uploadDir, filename);
    if (!fs.existsSync(filePath)) return res.status(400).json({ error: "Excel dosyasi bulunamadi" });
    const result = parseExcel(filePath, mapping || null);
    const stmt = db.prepare("INSERT INTO cards (batch_id, data_json) VALUES (?, ?)");
    for (const r of result.rows) stmt.run(batchId, JSON.stringify(r));
    inserted = result.rows.length;
  }

  logActivity("batch_create", { category, source: source || "excel", name, filename, inserted }, { username: req.user.username, role: req.user.role, category, batchId });
  res.json({ ok: true, batchId, inserted });
});

// ---- Batch listesi (role gore filtrelenmis) ----
app.get("/api/batches", auth, (req, res) => {
  const f = categoryFilterSql(req.user.role);
  const rows = db.prepare(`
    SELECT b.*,
      (SELECT COUNT(*) FROM cards WHERE batch_id = b.id) as card_count,
      (SELECT COUNT(*) FROM cards WHERE batch_id = b.id AND status = 'pending') as pending_count
    FROM batches b
    WHERE b.category IN ${f.sql}
    ORDER BY b.created_at DESC
  `).all(...f.params);
  for (const b of rows) {
    const cards = db.prepare("SELECT data_json FROM cards WHERE batch_id = ?").all(b.id);
    b.matched_count = countMatched(b.category, cards);
    b.missing_field_count = cards.filter((c) => missingFields(enrichUniversity(JSON.parse(c.data_json)), b.category).length > 0).length;
  }
  res.json(rows);
});

// ---- Batch detay + kartlar ----
app.get("/api/batches/:id", auth, (req, res) => {
  const batch = getBatchForUser(req, res, req.params.id);
  if (!batch) return;
  const cards = db.prepare("SELECT * FROM cards WHERE batch_id = ? ORDER BY id").all(batch.id);
  const parsed = cards.map((c) => {
    const data = enrichUniversity(JSON.parse(c.data_json));
    const photo = findPhoto(batch.category, data);
    return { ...c, data, photo_url: photo ? `/api/photo?path=${encodeURIComponent(path.relative(ROOT, photo))}` : null };
  });
  res.json({ ...batch, cards: parsed, data_report: missingReport(batch.category, parsed) });
});

// ---- Eksik alan raporu (Excel) ----
app.get("/api/batches/:id/missing.xlsx", auth, (req, res) => {
  const batch = getBatchForUser(req, res, req.params.id);
  if (!batch) return;
  const cards = db
    .prepare("SELECT id, data_json FROM cards WHERE batch_id = ? ORDER BY id")
    .all(batch.id)
    .map((c) => ({ id: c.id, data: enrichUniversity(JSON.parse(c.data_json)) }));
  const report = missingReport(batch.category, cards);

  const rows = [["Kart No", "Ad", "Soyad", "Numara", "Eksik Alanlar"]];
  for (const it of report.items) {
    rows.push([it.card_id, it.ad, it.soyad, it.no, it.missing.map((m) => m.label).join(", ")]);
  }
  if (!report.items.length) rows.push(["", "", "", "", "Eksik alan yok"]);

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = [{ wch: 10 }, { wch: 24 }, { wch: 24 }, { wch: 16 }, { wch: 46 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Eksik Alanlar");
  logActivity("missing_fields_download", { category: batch.category, count: report.items.length }, { username: req.user.username, role: req.user.role, category: batch.category, batchId: batch.id });

  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="eksik_alanlar_${batch.id}_${buildTimestamp()}.xlsx"`);
  res.send(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
});

// ---- Ornek liste (secilen kategori icin Excel sablonu) ----
app.get("/api/sample-excel", auth, (req, res) => {
  const category = String(req.query.category || "ogrenci");
  if (!CATEGORIES[category]) return res.status(400).json({ error: "Gecersiz kategori" });
  if (!canAccessCategory(req.user.role, category)) {
    return res.status(403).json({ error: "Bu kategoriye erisim yetkiniz yok" });
  }
  const buf = sampleExcelBuffer(XLSX, category);
  logActivity("sample_excel_download", { category }, { username: req.user.username, role: req.user.role, category });
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="otokart_ornek_${category}_${buildTimestamp()}.xlsx"`);
  res.send(buf);
});

// ---- Tek kart ekle (manuel) ----
app.post("/api/batches/:id/cards", auth, (req, res) => {
  const batch = getBatchForUser(req, res, req.params.id);
  if (!batch) return;
  const { data } = req.body || {};
  if (!data) return res.status(400).json({ error: "Kart verisi yok" });
  const info = db.prepare("INSERT INTO cards (batch_id, data_json) VALUES (?, ?)").run(batch.id, JSON.stringify(enrichUniversity(data)));
  logActivity("card_add", { category: batch.category, tc_no: data?.tc_no, ogrenci_no: data?.ogrenci_no, personel_no: data?.personel_no }, { username: req.user.username, role: req.user.role, category: batch.category, batchId: batch.id, cardId: info.lastInsertRowid });
  res.json({ ok: true, cardId: info.lastInsertRowid });
});

// ---- Kart guncelle ----
app.put("/api/batches/:id/cards/:cardId", auth, (req, res) => {
  const batch = getBatchForUser(req, res, req.params.id);
  if (!batch) return;
  const { data, status } = req.body || {};
  const card = db.prepare("SELECT * FROM cards WHERE id = ? AND batch_id = ?").get(req.params.cardId, req.params.id);
  if (!card) return res.status(404).json({ error: "Kart bulunamadi" });
  if (data) db.prepare("UPDATE cards SET data_json = ? WHERE id = ?").run(JSON.stringify(enrichUniversity(data)), card.id);
  if (status) db.prepare("UPDATE cards SET status = ? WHERE id = ?").run(status, card.id);
  logActivity("card_update", { category: batch.category, status }, { username: req.user.username, role: req.user.role, category: batch.category, batchId: batch.id, cardId: card.id });
  res.json({ ok: true });
});

// ---- Kart sil ----
app.delete("/api/batches/:id/cards/:cardId", auth, (req, res) => {
  const batch = getBatchForUser(req, res, req.params.id);
  if (!batch) return;
  db.prepare("DELETE FROM cards WHERE id = ? AND batch_id = ?").run(req.params.cardId, req.params.id);
  logActivity("card_delete", { category: batch.category }, { username: req.user.username, role: req.user.role, category: batch.category, batchId: batch.id, cardId: parseInt(req.params.cardId, 10) });
  res.json({ ok: true });
});

// ---- Batch sil ----
app.delete("/api/batches/:id", auth, (req, res) => {
  const batch = getBatchForUser(req, res, req.params.id);
  if (!batch) return;
  logActivity("batch_delete", { category: batch.category, name: batch.name }, { username: req.user.username, role: req.user.role, category: batch.category, batchId: batch.id });
  db.prepare("DELETE FROM batches WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

// ---- Tek kart PDF ----
app.get("/api/batches/:id/cards/:cardId/pdf", auth, async (req, res) => {
  const batch = getBatchForUser(req, res, req.params.id);
  if (!batch) return;
  const card = db.prepare("SELECT * FROM cards WHERE id = ? AND batch_id = ?").get(req.params.cardId, req.params.id);
  if (!card) return res.status(404).json({ error: "Bulunamadi" });
  const data = enrichUniversity(JSON.parse(card.data_json));
  const photo = findPhoto(batch.category, data);
  const out = path.join(outputDir, `otokart_kart_${buildTimestamp()}.pdf`);
  await generateSinglePdf(batch.category, data, photo, out);
  logActivity("card_pdf", { category: batch.category }, { username: req.user.username, role: req.user.role, category: batch.category, batchId: batch.id, cardId: card.id });
  res.download(out, `kart_${data.ogrenci_no || card.id}.pdf`);
});

// ---- Batch PDF indir (her tiklamada yeniden üretir, kart durumu degismez) ----
app.get("/api/batches/:id/pdf", auth, async (req, res) => {
  const batch = getBatchForUser(req, res, req.params.id);
  if (!batch) return;
  const cards = db.prepare("SELECT * FROM cards WHERE batch_id = ?").all(batch.id);
  if (!cards.length) return res.status(400).json({ error: "Kart yok" });
  const items = cards.map((c) => {
    const data = enrichUniversity(JSON.parse(c.data_json));
    return { data, photoPath: findPhoto(batch.category, data) };
  });
  const stamp = buildTimestamp();
  const out = path.join(outputDir, `batch_${batch.id}_${stamp}_tmp.pdf`);
  await generatePrintPdf(batch.category, items, out);
  logActivity("batch_pdf_download", { category: batch.category, count: cards.length }, { username: req.user.username, role: req.user.role, category: batch.category, batchId: batch.id });
  res.download(out, `otokart_${batch.category}_${batch.id}_${stamp}.pdf`, (err) => {
    if (err && !res.headersSent) console.error("PDF download error:", err);
    try { fs.unlinkSync(out); } catch {}
  });
});

// ---- Foto servis ----
app.get("/api/photo", auth, (req, res) => {
  const rel = req.query.path;
  if (!rel) return res.status(400).end();
  const full = path.resolve(ROOT, rel);
  if (!full.startsWith(ROOT)) return res.status(403).end();
  if (!fs.existsSync(full)) return res.status(404).end();
  const relPhotos = path.relative(photosDir, full);
  if (relPhotos.startsWith("..") || path.isAbsolute(relPhotos)) return res.status(403).end();
  const cat = relPhotos.split(path.sep)[0];
  if (!canAccessCategory(req.user.role, cat)) return res.status(403).end();
  res.sendFile(full);
});

// ---- Batch'i zip + mail ile gonder (tek liste) ----
app.post("/api/batches/:id/send-zip-mail", auth, async (req, res) => {
  const batch = getBatchForUser(req, res, req.params.id);
  if (!batch) return;
  const { toEmail, fromName, smtpHost, smtpPort, smtpUser, smtpPass, smtpSecure } = req.body || {};
  if (!toEmail) return res.status(400).json({ error: "Alici e-posta adresi zorunlu" });

  try {
    const r = await mail.sendBatchesMail({
      batchIds: [batch.id],
      toEmail,
      smtp: { fromName, smtpHost, smtpPort, smtpUser, smtpPass, smtpSecure },
      mode: "instant",
      createdBy: req.user.username,
    });
    res.json({ ok: true, message: r.message, email: toEmail });
  } catch (e) {
    res.status(500).json({ error: "Zip/mail hatasi: " + e.message });
  }
});

// ---- Foto toplu yukleme ----
app.post("/api/photos/:category", auth, (req, res, next) => {
  if (!canAccessCategory(req.user.role, req.params.category)) {
    return res.status(403).json({ error: "Bu kategoriye erisim yetkiniz yok" });
  }
  next();
}, photoUpload.array("photos", 200), (req, res) => {
  res.json({ ok: true, count: (req.files || []).length });
});

// ---- Islem loglari (yalniz admin) ----
app.get("/api/logs", auth, requireAdmin, (req, res) => {
  const { q, level, action, username, category, dateFrom, dateTo, page = 1, pageSize = 50 } = req.query || {};
  const where = [];
  const params = [];
  if (level) { where.push("level = ?"); params.push(level); }
  if (action) { where.push("action LIKE ?"); params.push(`%${action}%`); }
  if (username) { where.push("username LIKE ?"); params.push(`%${username}%`); }
  if (category) { where.push("category = ?"); params.push(category); }
  if (dateFrom) { where.push("date(created_at) >= date(?)"); params.push(dateFrom); }
  if (dateTo) { where.push("date(created_at) <= date(?)"); params.push(dateTo); }
  if (q) { where.push("details_json LIKE ? OR action LIKE ? OR username LIKE ?"); const s = `%${q}%`; params.push(s, s, s); }
  const w = where.length ? "WHERE " + where.join(" AND ") : "";
  const limit = Math.min(200, Math.max(1, parseInt(pageSize, 10) || 50));
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const offset = (pageNum - 1) * limit;
  const total = db.prepare(`SELECT COUNT(*) as c FROM activity_logs ${w}`).get(...params).c;
  const rows = db.prepare(`SELECT * FROM activity_logs ${w} ORDER BY id DESC LIMIT ? OFFSET ?`).all(...params, limit, offset);
  res.json({ total, page: pageNum, pageSize: limit, rows });
});

function toTRTime(iso) {
  if (!iso) return "";
  const d = new Date(String(iso).replace(" ", "T") + "Z");
  if (isNaN(d.getTime())) return iso;
  d.setUTCHours(d.getUTCHours() + 3);
  const p = (n, w = 2) => String(n).padStart(w, "0");
  return `${p(d.getUTCDate())}.${p(d.getUTCMonth() + 1)}.${d.getUTCFullYear()} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())}`;
}

app.get("/api/logs/export.xlsx", auth, requireAdmin, (req, res) => {
  const rows = db.prepare("SELECT * FROM activity_logs ORDER BY id DESC LIMIT 5000").all();
  const aoa = [["Tarih/Saat", "Seviye", "Islem", "Kullanici", "Rol", "Kategori", "Batch", "Kart", "Detay"]];
  for (const r of rows) {
    aoa.push([toTRTime(r.created_at), r.level, r.action, r.username || "", r.role || "", r.category || "", r.batch_id ?? "", r.card_id ?? "", r.details_json || ""]);
  }
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!cols"] = [{ wch: 19 }, { wch: 8 }, { wch: 22 }, { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 10 }, { wch: 8 }, { wch: 80 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Islem Loglari");
  const buf = Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="otokart_log_${buildTimestamp()}.xlsx"`);
  res.send(buf);
});

// ---- Dashboard istatistikleri ----
function statsForRole(role) {
  const f = categoryFilterSql(role);
  const batchIdsSql = `SELECT id FROM batches WHERE category IN ${f.sql}`;
  const batches = db.prepare(`SELECT COUNT(*) as c FROM batches WHERE category IN ${f.sql}`).get(...f.params).c;
  const cards = db.prepare(`SELECT COUNT(*) as c FROM cards WHERE batch_id IN (${batchIdsSql})`).get(...f.params).c;
  const pending = db.prepare(`SELECT COUNT(*) as c FROM cards WHERE status = 'pending' AND batch_id IN (${batchIdsSql})`).get(...f.params).c;
  const printed = db.prepare(`SELECT COUNT(*) as c FROM cards WHERE status = 'printed' AND batch_id IN (${batchIdsSql})`).get(...f.params).c;
  const last = db.prepare(`SELECT MAX(created_at) as t FROM batches WHERE category IN ${f.sql}`).get(...f.params).t;
  return { batches, cards, pending, printed, lastActivity: last };
}

app.get("/api/stats", auth, (req, res) => {
  const base = statsForRole(req.user.role);

  let byRole;
  if (req.user.role === "admin") {
    byRole = ["ogrenci_isleri", "personel_daire"].map((role) => {
      const s = statsForRole(role);
      const users = db.prepare("SELECT COUNT(*) as c FROM users WHERE role = ?").get(role).c;
      return { role, label: ROLE_LABELS[role] || role, users, ...s };
    });
  }

  res.json({ ...base, byRole });
});

// ---- Ayarlar ----
app.get("/api/settings", auth, (req, res) => {
  const rows = db.prepare("SELECT * FROM settings").all();
  const obj = {};
  const isAdmin = req.user.role === "admin";
  for (const r of rows) {
    // SMTP sifresi admin disina donmesin
    if (!isAdmin && r.key === "mail_smtp_pass") continue;
    obj[r.key] = r.value;
  }
  res.json(obj);
});

app.post("/api/settings", auth, requireAdmin, (req, res) => {
  const body = req.body || {};
  const stmt = db.prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value");
  for (const [k, v] of Object.entries(body)) stmt.run(k, String(v));
  const masked = {};
  for (const k of Object.keys(body)) masked[k] = k === "mail_smtp_pass" ? "***" : "(changed)";
  logActivity("settings_save", { keys: Object.keys(body) }, { username: req.user.username, role: req.user.role });
  res.json({ ok: true });
});

// ---- Hata yakalayici ----
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message || "Sunucu hatasi" });
});

// ---- Mail zamanlayici baslat ----
startScheduler({
  onMailJob: (job) => {
    console.log(`[scheduler] Mail kurali tetiklendi: ${job.name} (${job.mode})`);
    mail.runMailJob(job)
      .then((r) => console.log(`[scheduler] Mail sonucu: ${job.name} -> ${r.skipped ? "yeni liste yok" : r.batchCount + " liste"}`))
      .catch((e) => console.error(`[scheduler] Mail hatasi: ${job.name} -> ${e.message}`));
  },
});

// ---- Kullanici yonetimi (sadece yonetici) ----
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== "admin") return res.status(403).json({ error: "Yetkiniz yok" });
  next();
}

app.get("/api/users", auth, requireAdmin, (req, res) => {
  const users = db.prepare("SELECT id, username, role, created_at FROM users ORDER BY created_at ASC").all();
  res.json(users.map((u) => ({ ...u, roleLabel: ROLE_LABELS[u.role] || u.role })));
});

app.post("/api/users", auth, requireAdmin, (req, res) => {
  const { username, password, role } = req.body || {};
  if (!username || !password || !role) return res.status(400).json({ error: "Kullanici adi, sifre ve rol zorunlu" });
  if (!VALID_ROLES.includes(role)) return res.status(400).json({ error: "Gecersiz rol" });
  try {
    const info = db.prepare("INSERT INTO users (username, password, role) VALUES (?, ?, ?)").run(String(username).trim(), String(password), role);
    logActivity("user_create", { username, role }, { username: req.user.username, role: req.user.role });
    res.json({ ok: true, id: info.lastInsertRowid });
  } catch (e) {
    res.status(400).json({ error: "Bu kullanici adi zaten var" });
  }
});

app.put("/api/users/:id", auth, requireAdmin, (req, res) => {
  const { role, password } = req.body || {};
  const u = db.prepare("SELECT * FROM users WHERE id = ?").get(req.params.id);
  if (!u) return res.status(404).json({ error: "Kullanici bulunamadi" });
  if (role) {
    if (!VALID_ROLES.includes(role)) return res.status(400).json({ error: "Gecersiz rol" });
    if (u.role === "admin" && role !== "admin" && u.username === "admin") {
      return res.status(400).json({ error: "Son admin rolu kaldirilamaz" });
    }
    db.prepare("UPDATE users SET role = ? WHERE id = ?").run(role, u.id);
  }
  if (password) db.prepare("UPDATE users SET password = ? WHERE id = ?").run(String(password), u.id);
  logActivity("user_update", { targetUser: u.username, roleChanged: !!(role && role !== u.role), passwordChanged: !!password }, { username: req.user.username, role: req.user.role });
  res.json({ ok: true });
});

app.delete("/api/users/:id", auth, requireAdmin, (req, res) => {
  const u = db.prepare("SELECT * FROM users WHERE id = ?").get(req.params.id);
  if (!u) return res.status(404).json({ error: "Kullanici bulunamadi" });
  if (u.username === "admin") return res.status(400).json({ error: "Varsayilan admin silinemez" });
  logActivity("user_delete", { targetUser: u.username }, { username: req.user.username, role: req.user.role });
  db.prepare("DELETE FROM users WHERE id = ?").run(u.id);
  res.json({ ok: true });
});

// ---- Mail merkezi (anında / gün sonu / haftada bir) ----
function requireMailRole(req, res, next) {
  if (!canUseMail(req.user.role)) {
    return res.status(403).json({ error: "Mail merkezine erisim yetkiniz yok" });
  }
  next();
}

function canManageJob(req, job) {
  return req.user.role === "admin" || job.created_by === req.user.username;
}

app.get("/api/mail/jobs", auth, requireMailRole, (req, res) => {
  const rows = req.user.role === "admin"
    ? db.prepare("SELECT * FROM mail_jobs ORDER BY created_at DESC").all()
    : db.prepare("SELECT * FROM mail_jobs WHERE created_by = ? ORDER BY created_at DESC").all(req.user.username);
  res.json(rows);
});

app.post("/api/mail/jobs", auth, requireMailRole, (req, res) => {
  const { name, mode, category, to_email, subject, body, send_time, weekday, active } = req.body || {};
  if (!name || !to_email) return res.status(400).json({ error: "Kural adi ve alici e-posta zorunlu" });
  if (!["daily", "weekly"].includes(mode)) return res.status(400).json({ error: "Gecersiz mod" });
  if (category && !canAccessCategory(req.user.role, category)) {
    return res.status(403).json({ error: "Bu kategoriye erisim yetkiniz yok" });
  }
  const info = db.prepare(
    `INSERT INTO mail_jobs (name, mode, category, to_email, subject, body, send_time, weekday, active, created_by, created_by_role)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    String(name).trim(),
    mode,
    category || null,
    String(to_email).trim(),
    subject || null,
    body || null,
    send_time || (mode === "daily" ? "18:00" : "09:00"),
    weekday !== undefined && weekday !== null && weekday !== "" ? parseInt(weekday, 10) : null,
    active ? 1 : 0,
    req.user.username,
    req.user.role
  );
  logActivity("mail_job_create", { name, mode, category, to_email, send_time, weekday }, { username: req.user.username, role: req.user.role, category });
  res.json({ ok: true, id: info.lastInsertRowid });
});

app.put("/api/mail/jobs/:id", auth, requireMailRole, (req, res) => {
  const job = db.prepare("SELECT * FROM mail_jobs WHERE id = ?").get(req.params.id);
  if (!job) return res.status(404).json({ error: "Kural bulunamadi" });
  if (!canManageJob(req, job)) return res.status(403).json({ error: "Yetkiniz yok" });
  const b = req.body || {};
  if (b.category && !canAccessCategory(req.user.role, b.category)) {
    return res.status(403).json({ error: "Bu kategoriye erisim yetkiniz yok" });
  }
  db.prepare(
    `UPDATE mail_jobs SET name=?, mode=?, category=?, to_email=?, subject=?, body=?, send_time=?, weekday=?, active=? WHERE id=?`
  ).run(
    b.name ?? job.name,
    b.mode ?? job.mode,
    b.category !== undefined ? (b.category || null) : job.category,
    b.to_email ?? job.to_email,
    b.subject !== undefined ? b.subject : job.subject,
    b.body !== undefined ? b.body : job.body,
    b.send_time ?? job.send_time,
    b.weekday !== undefined ? (b.weekday === "" || b.weekday === null ? null : parseInt(b.weekday, 10)) : job.weekday,
    b.active !== undefined ? (b.active ? 1 : 0) : job.active,
    job.id
  );
  logActivity("mail_job_update", { jobId: job.id, category: b.category }, { username: req.user.username, role: req.user.role, category: b.category || job.category });
  res.json({ ok: true });
});

app.delete("/api/mail/jobs/:id", auth, requireMailRole, (req, res) => {
  const job = db.prepare("SELECT * FROM mail_jobs WHERE id = ?").get(req.params.id);
  if (!job) return res.status(404).json({ error: "Kural bulunamadi" });
  if (!canManageJob(req, job)) return res.status(403).json({ error: "Yetkiniz yok" });
  logActivity("mail_job_delete", { jobId: job.id, name: job.name }, { username: req.user.username, role: req.user.role, category: job.category });
  db.prepare("DELETE FROM mail_jobs WHERE id = ?").run(job.id);
  res.json({ ok: true });
});

app.post("/api/mail/jobs/:id/run", auth, requireMailRole, async (req, res) => {
  const job = db.prepare("SELECT * FROM mail_jobs WHERE id = ?").get(req.params.id);
  if (!job) return res.status(404).json({ error: "Kural bulunamadi" });
  if (!canManageJob(req, job)) return res.status(403).json({ error: "Yetkiniz yok" });
  try {
    const r = await mail.runMailJob(job);
    logActivity("mail_job_run", { jobId: job.id, name: job.name, skipped: r.skipped, batchCount: r.batchCount }, { username: req.user.username, role: req.user.role, category: job.category });
    res.json({ ok: true, ...r });
  } catch (e) {
    logActivity("mail_job_run_error", { jobId: job.id, error: e.message }, { username: req.user.username, role: req.user.role, category: job.category, level: "error" });
    res.status(500).json({ error: "Mail hatasi: " + e.message });
  }
});

app.post("/api/mail/send", auth, requireMailRole, async (req, res) => {
  const { batchIds, toEmail, subject, body } = req.body || {};
  if (!toEmail) return res.status(400).json({ error: "Alici e-posta adresi zorunlu" });
  if (!Array.isArray(batchIds) || !batchIds.length) return res.status(400).json({ error: "Liste secilmedi" });

  const batches = [];
  for (const id of batchIds) {
    const b = db.prepare("SELECT * FROM batches WHERE id = ?").get(id);
    if (!b) return res.status(404).json({ error: `Liste bulunamadi: ${id}` });
    if (!canAccessCategory(req.user.role, b.category)) {
      return res.status(403).json({ error: "Bu kategoriye erisim yetkiniz yok" });
    }
    batches.push(b);
  }

  try {
    const r = await mail.sendBatchesMail({
      batchIds: batches.map((b) => b.id),
      toEmail,
      subject: subject || undefined,
      text: body || undefined,
      mode: "instant",
      createdBy: req.user.username,
    });
    res.json({ ok: true, ...r });
  } catch (e) {
    res.status(500).json({ error: "Mail hatasi: " + e.message });
  }
});

app.get("/api/mail/logs", auth, requireMailRole, (req, res) => {
  const rows = req.user.role === "admin"
    ? db.prepare("SELECT * FROM mail_logs ORDER BY id DESC LIMIT 100").all()
    : db.prepare("SELECT * FROM mail_logs WHERE created_by = ? ORDER BY id DESC LIMIT 100").all(req.user.username);
  res.json(rows);
});

app.post("/api/mail/test", auth, requireAdmin, async (req, res) => {
  const { toEmail } = req.body || {};
  try {
    const r = await mail.sendTestMail(toEmail);
    logActivity("smtp_test_ok", { toEmail }, { username: req.user.username, role: req.user.role });
    res.json(r);
  } catch (e) {
    logActivity("smtp_test_error", { toEmail, error: e.message }, { username: req.user.username, role: req.user.role, level: "error" });
    res.status(500).json({ error: "SMTP test hatasi: " + e.message });
  }
});

// ---- Varsayilan kullanicilar ----
const adminExists = SSO ? 1 : db.prepare("SELECT COUNT(*) as c FROM users WHERE username = 'admin'").get().c;
if (!adminExists) {
  db.prepare("INSERT INTO users (username, password, role) VALUES ('admin', 'admin', 'admin')").run();
  console.log("[auth] Varsayilan admin olusturuldu: admin / admin");
}
// SSO modunda varsayilan (kullanici adi = sifre) hesaplar olusturulmaz
for (const [username, role] of SSO ? [] : [
  ["akademik", "akademik"],
  ["idari", "idari"],
  ["ogrenci_isleri", "ogrenci_isleri"],
  ["personel_daire", "personel_daire"],
]) {
  const exists = db.prepare("SELECT COUNT(*) as c FROM users WHERE username = ?").get(username).c;
  if (!exists) {
    db.prepare("INSERT INTO users (username, password, role) VALUES (?, ?, ?)").run(username, username, role);
    console.log(`[auth] Varsayilan kullanici: ${username} / ${username} (${role})`);
  }
}

// SSO modunda yalnizca yerel makineden erisilir; disariya portal (Next rewrite / nginx) uzerinden acilir
const HOST = process.env.HOST || (SSO ? "127.0.0.1" : "0.0.0.0");
app.listen(PORT, HOST, () => {
  console.log(`OtoKart sunucusu calisiyor: http://${HOST}:${PORT} (${SSO ? "portal SSO" : "bagimsiz giris"})`);
});
