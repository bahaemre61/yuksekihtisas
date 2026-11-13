/* Mail merkezi: zip olusturma, SMTP, gonderim ve loglama.
 * Zip icinde Excel + fotoğraflar bulunur; PDF dahil edilmez.
 */
const fs = require("fs");
const path = require("path");
const { ZipArchive } = require("archiver");
const nodemailer = require("nodemailer");
const XLSX = require("xlsx");
const db = require("./db");
const { findPhoto } = require("./photos");
const { allowedCategories, ALL_CATEGORIES } = require("./permissions");
const { enrichUniversity } = require("./university");
const { logActivity, buildTimestamp } = require("./logger");

const ROOT = path.resolve(__dirname, "..");
const uploadDir = path.join(ROOT, "uploads");
const outputDir = path.join(ROOT, "output");
for (const d of [uploadDir, outputDir]) {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
}

function getSettings() {
  const rows = db.prepare("SELECT * FROM settings").all();
  const obj = {};
  for (const r of rows) obj[r.key] = r.value;
  return obj;
}

function normalizeSecure(port, secureRaw) {
  const n = parseInt(port, 10);
  // 465 -> her zaman SSL/TLS
  if (n === 465) return true;
  // 587 / 25 / 2525 -> her zaman STARTTLS veya sifir sifre (plain)
  if (n === 587 || n === 25 || n === 2525) return false;
  // Diger portlar: kullanici secimine guven
  return String(secureRaw) === "true";
}

function getSmtpConfig(overrides = {}) {
  const s = getSettings();
  const host = overrides.smtpHost || s.mail_smtp_host || "smtp.gmail.com";
  const port = parseInt(overrides.smtpPort || s.mail_smtp_port || "587", 10);
  const secureRaw = overrides.smtpSecure !== undefined ? overrides.smtpSecure : s.mail_smtp_secure;
  const secure = normalizeSecure(port, secureRaw);
  const user = overrides.smtpUser || s.mail_smtp_user || "";
  const pass = overrides.smtpPass || s.mail_smtp_pass || "";
  return {
    host,
    port,
    secure,
    auth: user && pass ? { user, pass } : undefined,
    user,
    fromName: overrides.fromName || s.mail_from_name || "OtoKart",
  };
}

function friendlySmtpError(e, cfg) {
  const raw = String((e && e.message) || e);
  const target = cfg ? `${cfg.host}:${cfg.port}` : "SMTP sunucusu";
  if (/wrong version number|SSL routines|tls_validate_record_header/i.test(raw)) {
    return `SSL/TLS uyumsuzluğu (${target}). Port 587 için "Güvenli: Hayır (STARTTLS)", port 465 için "Güvenli: Evet (SSL/TLS)" seçin.`;
  }
  if (/ENOTFOUND|getaddrinfo/i.test(raw)) {
    return `SMTP sunucusu bulunamadı: ${target}. Host adını kontrol edin.`;
  }
  if (/ECONNREFUSED/i.test(raw)) {
    return `Sunucuya bağlanılamadı (${target}). Host, port ve güvenlik duvarı izinlerini kontrol edin.`;
  }
  if (/ETIMEDOUT|timed ?out|ESOCKET/i.test(raw)) {
    return `Sunucu yanıt vermedi (zaman aşımı): ${target}. Port ve güvenlik duvarını kontrol edin.`;
  }
  if (/invalid login|535|534|authentication failed|auth[a-z ]*fail|user not found/i.test(raw)) {
    return `Kullanıcı adı/şifre reddedildi (${target}). Office 365/Gmail için uygulama şifresi gerekebilir.`;
  }
  if (/526|5\.7\.|relay|not allowed/i.test(raw)) {
    return `Sunucu gönderime izin vermedi (${target}). SMTP AUTH / relay yetkisi için IT ekibinizle paylaşın.`;
  }
  return raw;
}

function createTransporter(cfg) {
  return nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: cfg.auth,
  });
}

function sanitizeFile(name, fallback = "liste") {
  const base = String(name || fallback)
    .replace(/[\\/:*?"<>|]+/g, "_")
    .replace(/\s+/g, "_")
    .trim();
  return base || fallback;
}

/* Sheet isimleri 31 char, gecersiz karakter yasak, benzersiz olmali */
function sanitizeSheetName(name, fallback, id, used) {
  let s = String(name || fallback || "liste");
  s = s.replace(/[\\/:*?[\]]/g, " ").replace(/\s+/g, " ").trim().slice(0, 28);
  if (!s) s = fallback || "liste";
  let base = s;
  let n = 1;
  while (used && used.has(s)) {
    n += 1;
    s = `${base.slice(0, 24)} (${n})`.slice(0, 31);
  }
  if (used) used.add(s);
  return s;
}

/* Baslik satirini normalize et: kucuk harf, _NN son ekleri, fazla bosluk */
function normalizeHeaderKey(row) {
  const cells = (row || []).map((c) => String(c ?? "").trim().toLowerCase().replace(/_\d+$/, ""));
  while (cells.length && cells[cells.length - 1] === "") cells.pop();
  return cells.join("|");
}

function stdRowsForCards(cards) {
  const rows = [[
    "T.C. Kimlik No", "Öğrenci No", "Personel No", "Ünvan",
    "Ad", "Soyad", "Fakülte", "Fakülte (EN)", "Program", "Program (EN)",
  ]];
  for (const c of cards) {
    let d = {};
    try { d = JSON.parse(c.data_json); } catch {}
    d = enrichUniversity(d);
    rows.push([
      d.tc_no || "", d.ogrenci_no || "", d.personel_no || "", d.personel_unvan || "",
      d.ad || "", d.soyad || "", d.fakulte_tr || "", d.fakulte_en || "",
      d.program_tr || "", d.program_en || "",
    ]);
  }
  return rows;
}

function autoWidth(rows) {
  const widths = [];
  for (const row of rows) {
    row.forEach((c, i) => {
      const len = String(c ?? "").length;
      widths[i] = Math.max(widths[i] || 8, Math.min(len + 2, 50));
    });
  }
  return widths.map((wch) => ({ wch }));
}

function batchExcelSheet(cards, fallbackName) {
  const rows = stdRowsForCards(cards);
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = autoWidth(rows);
  return ws;
}

/* Birden fazla batch'i KATEGORI BASINDA Excel'lere birlestir.
   Her kategori icin ayri calisma kitabi uretir: ogrenci listeleri bir arada,
   akademik listeleri bir arada, idari listeleri bir arada.
   Orijinal Excel varsa sheet'lerini oldugu gibi kopyalar; yoksa kartlardan sheet uretir. */
const CATEGORY_NAMES = {
  ogrenci: "ogrenci",
  intorn: "intorn",
  stajer: "stajer",
  akademik: "akademik",
  idari: "idari",
};

const CATEGORY_LABELS = {
  ogrenci: "Öğrenci",
  intorn: "İntörn",
  stajer: "Stajer",
  akademik: "Akademik",
  idari: "İdari",
};

function combinedExcelByCategory(batches, stamp = buildTimestamp()) {
  const groups = new Map();
  for (const item of batches) {
    const cat = item.batch.category || "diger";
    if (!groups.has(cat)) groups.set(cat, []);
    groups.get(cat).push(item);
  }

  const out = [];
  for (const [cat, items] of groups) {
    const label = CATEGORY_LABELS[cat] || cat;

    // 1) Her batch'ten satir dizileri topla (header + data rows)
    const parts = [];
    for (const { batch, cards } of items) {
      const baseName = `${label} #${batch.id}`;
      const original = batch.filename ? path.join(uploadDir, path.basename(batch.filename)) : null;
      let ok = false;
      if (original && fs.existsSync(original)) {
        try {
          const src = XLSX.readFile(original);
          for (const sheetName of src.SheetNames) {
            const ws = src.Sheets[sheetName];
            const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "", blankrows: false });
            if (rows.length) parts.push({ name: baseName, rows, category: cat });
          }
          ok = true;
        } catch {
          // kartlardan uret
        }
      }
      if (!ok) parts.push({ name: baseName, rows: stdRowsForCards(cards), category: cat });
    }

    // 2) Ayni/normalize baslikli parcalari birlestir
    const paneMap = new Map();
    for (const part of parts) {
      const key = normalizeHeaderKey(part.rows[0]);
      if (!paneMap.has(key)) paneMap.set(key, []);
      paneMap.get(key).push(part);
    }

    const wb = XLSX.utils.book_new();
    const used = new Set();

    if (paneMap.size === 1) {
      // Aynı başlıklara sahip tüm listeler -> tek sekme alt alta
      const group = paneMap.values().next().value;
      const headerLen = Math.max(...group.map((g) => g.rows[0].length));
      const header = group[0].rows[0].slice();
      while (header.length < headerLen) header.push("");

      const merged = [header];
      for (const g of group) {
        for (const row of g.rows.slice(1)) {
          const r = row.slice();
          while (r.length < headerLen) r.push("");
          merged.push(r);
        }
      }

      const safe = sanitizeSheetName(`${label} Listesi`, "Liste", undefined, used);
      const ws = XLSX.utils.aoa_to_sheet(merged);
      ws["!cols"] = autoWidth(merged);
      XLSX.utils.book_append_sheet(wb, ws, safe);
    } else {
      // Farklı başlıklar -> HEPSİNİ kart formatına indirgeyerek tek sekmede alt alta
      const merged = [stdRowsForCards([])[0]];
      for (const { batch, cards } of items) {
        const rows = stdRowsForCards(cards);
        for (const row of rows.slice(1)) merged.push(row);
      }
      const safe = sanitizeSheetName(`${label} Listesi`, "Liste", undefined, used);
      const ws = XLSX.utils.aoa_to_sheet(merged);
      ws["!cols"] = autoWidth(merged);
      XLSX.utils.book_append_sheet(wb, ws, safe);
    }

    const buf = Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
    const folderName = CATEGORY_NAMES[cat] || cat;
    out.push({ category: cat, filename: `excel/otokart_liste_${stamp}_${folderName}.xlsx`, buffer: buf });
  }

  return out;
}

/* Secilen batch'lerden tek bir zip olustur */
async function buildZip(batchIds, zipPath, stamp = buildTimestamp()) {
  const archive = new ZipArchive({ zlib: { level: 9 } });
  const output = fs.createWriteStream(zipPath);
  archive.pipe(output);

  const addedPhotos = new Set();
  const batches = [];

  for (const id of batchIds) {
    const batch = db.prepare("SELECT * FROM batches WHERE id = ?").get(id);
    if (!batch) continue;
    const cards = db.prepare("SELECT * FROM cards WHERE batch_id = ? ORDER BY id").all(batch.id);
    batches.push({ batch, cards });

    // 2) Sadece bu batch'e ait kartlarin eslesen fotograflari
    for (const c of cards) {
      let data = {};
      try { data = JSON.parse(c.data_json); } catch {}
      const photo = findPhoto(batch.category, data);
      if (!photo || addedPhotos.has(photo)) continue;
      addedPhotos.add(photo);
      archive.file(photo, { name: `fotograflar/${batch.category}/${path.basename(photo)}` });
    }
  }

  // 1) Secilen listeleri KATEGORI BASINDA Excel'lere birlestir
  if (batches.length) {
    for (const part of combinedExcelByCategory(batches, stamp)) {
      archive.append(part.buffer, { name: part.filename });
    }
  }

  await archive.finalize();
  await new Promise((resolve, reject) => {
    output.on("close", resolve);
    archive.on("error", reject);
  });

  return { batches, photoCount: addedPhotos.size };
}

function logMail({ jobId, mode, toEmail, batchIds, status, error, createdBy }) {
  db.prepare(
    `INSERT INTO mail_logs (job_id, mode, to_email, batch_ids, status, error, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(jobId || null, mode || null, toEmail || null, JSON.stringify(batchIds || []), status, error || null, createdBy || null);
}

/* Batch(ler)i tek zip halinde mail at */
async function sendBatchesMail({ batchIds, toEmail, subject, text, smtp, jobId, mode, createdBy }) {
  if (!toEmail) throw new Error("Alici e-posta adresi zorunlu");
  const ids = (batchIds || []).map((x) => parseInt(x, 10)).filter(Boolean);
  if (!ids.length) throw new Error("Gonderilecek liste secilmedi");

  const stamp = buildTimestamp();
  const zipPath = path.join(outputDir, `otokart_liste_${stamp}.zip`);
  const cfg = getSmtpConfig(smtp || {});
  const settings = getSettings();

  logActivity("mail_send_start", { mode, toEmail, batchIds: ids }, { username: createdBy || null, batchId: ids[0] || null });

  try {
    const { batches, photoCount } = await buildZip(ids, zipPath, stamp);

    const transporter = createTransporter(cfg);
    const mailSubject = subject || settings.mail_subject_template || "OtoKart - Kart Basım Listesi";
    const mailBody = text || settings.mail_body_template || "Ekli dosyada kart basım listesi yer almaktadır.";

    await transporter.sendMail({
      from: `"${cfg.fromName}" <${cfg.user || "noreply@localhost"}>`,
      to: toEmail,
      subject: mailSubject,
      text: mailBody,
      attachments: [{ filename: `otokart_liste_${stamp}.zip`, path: zipPath }],
    });

    // Mükerrer gönderimi engelle
    const stmt = db.prepare("UPDATE batches SET mail_sent_at = datetime('now') WHERE id = ?");
    for (const id of ids) stmt.run(id);

    logMail({ jobId, mode, toEmail, batchIds: ids, status: "sent", createdBy });
    logActivity("mail_send_ok", { mode, toEmail, batchIds: ids, photoCount }, { username: createdBy || null, batchId: ids[0] || null });
    return {
      ok: true,
      email: toEmail,
      batchCount: batches.length,
      photoCount,
      message: `${batches.length} liste ve ${photoCount} fotoğraf zip olarak gönderildi`,
    };
  } catch (e) {
    const friendly = friendlySmtpError(e, cfg);
    logMail({ jobId, mode, toEmail, batchIds: ids, status: "error", error: friendly, createdBy });
    logActivity("mail_send_error", { mode, toEmail, batchIds: ids, error: friendly }, { username: createdBy || null, batchId: ids[0] || null, level: "error" });
    throw new Error(friendly);
  } finally {
    try { fs.unlinkSync(zipPath); } catch {}
  }
}

/* Bir zamanlanmis is icin gonderilecek batch'leri bul */
function jobAllowedCategories(job) {
  const role = job.created_by_role
    || (job.created_by
      ? (db.prepare("SELECT role FROM users WHERE username = ?").get(job.created_by) || {}).role
      : null);
  return role ? allowedCategories(role) : ALL_CATEGORIES;
}

function batchesForJob(job) {
  const cats = jobAllowedCategories(job);
  const scoped = (job.category ? [job.category] : cats).filter((c) => cats.includes(c));
  if (!scoped.length) return [];

  const params = [...scoped];
  let sql = `SELECT id FROM batches WHERE mail_sent_at IS NULL AND category IN (${scoped.map(() => "?").join(",")})`;
  if (job.mode === "daily") {
    sql += " AND date(created_at) = date('now')";
  } else if (job.mode === "weekly") {
    sql += " AND created_at >= datetime('now', '-7 days')";
  }
  sql += " ORDER BY id";
  return db.prepare(sql).all(...params).map((r) => r.id);
}

async function runMailJob(job) {
  const ids = batchesForJob(job);
  if (!ids.length) {
    db.prepare("UPDATE mail_jobs SET last_run = datetime('now'), last_status = ? WHERE id = ?")
      .run("Gönderilecek yeni liste yok", job.id);
    return { ok: true, skipped: true, batchCount: 0 };
  }
  try {
    const r = await sendBatchesMail({
      batchIds: ids,
      toEmail: job.to_email,
      subject: job.subject || undefined,
      text: job.body || undefined,
      jobId: job.id,
      mode: job.mode,
      createdBy: job.created_by,
    });
    db.prepare("UPDATE mail_jobs SET last_run = datetime('now'), last_status = ? WHERE id = ?")
      .run(`Gönderildi (${r.batchCount} liste)`, job.id);
    return r;
  } catch (e) {
    db.prepare("UPDATE mail_jobs SET last_run = datetime('now'), last_status = ? WHERE id = ?")
      .run(`Hata: ${e.message}`, job.id);
    throw e;
  }
}

async function sendTestMail(toEmail) {
  if (!toEmail) throw new Error("Test icin alici e-posta zorunlu");
  const cfg = getSmtpConfig();
  const transporter = createTransporter(cfg);
  try {
    await transporter.sendMail({
      from: `"${cfg.fromName}" <${cfg.user || "noreply@localhost"}>`,
      to: toEmail,
      subject: "OtoKart SMTP Test",
      text: "Bu bir OtoKart SMTP test mesajıdır.",
    });
  } catch (e) {
    throw new Error(friendlySmtpError(e, cfg));
  }
  return { ok: true, email: toEmail, secure: cfg.secure, port: cfg.port };
}

module.exports = {
  getSettings,
  getSmtpConfig,
  buildZip,
  sendBatchesMail,
  batchesForJob,
  runMailJob,
  sendTestMail,
  logMail,
  friendlySmtpError,
  combinedExcelByCategory,
};
