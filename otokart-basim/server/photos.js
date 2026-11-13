/* Fotograf eslestirme — numara ve isim-soyisim (Turkce karakter destekli).
 * index.js ve mail.js ayni mantigi kullanir.
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const photosDir = path.join(ROOT, "photos");

const CATEGORY_FOLDERS = {
  ogrenci: "ogrenci",
  akademik: "akademik",
  idari: "idari",
  stajer: "stajer",
  intorn: "intorn",
};

function slugifyName(name) {
  if (!name) return "";
  return String(name)
    .toLowerCase()
    .trim()
    .replace(/ç/g, "c")
    .replace(/ğ/g, "g")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ş/g, "s")
    .replace(/ü/g, "u")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function nameCandidates(data) {
  const out = [];
  if (data.ad && data.soyad) {
    out.push(`${data.ad}_${data.soyad}`);
    out.push(`${data.soyad}_${data.ad}`);
  }
  if (data.ad) out.push(data.ad);
  if (data.soyad) out.push(data.soyad);
  // Hem normalize (ASCII) hem orijinal Turkce karakterli dondur
  const normalized = out.map(slugifyName);
  const original = out.map((s) => s.toLowerCase().trim().replace(/\s+/g, "_"));
  return [...normalized, ...original].filter(Boolean);
}

function photoDirFor(category) {
  return path.join(photosDir, CATEGORY_FOLDERS[category] || category);
}

function findPhoto(category, data) {
  const dir = photoDirFor(category);
  if (!fs.existsSync(dir)) return null;
  const files = fs.readdirSync(dir);
  const filesByName = new Map();
  for (const f of files) {
    const base = path.basename(f, path.extname(f)).toLowerCase();
    if (base && !filesByName.has(base)) filesByName.set(base, f);
    // Normalize (ASCII) versiyonu da ekle ki Turkce karakterli dosya adlarina eslesin
    const nk = slugifyName(base);
    if (nk && !filesByName.has(nk)) filesByName.set(nk, f);
  }

  // 1) Önce numara ile eşleştir (ogrenci_no / personel_no / tc_no)
  const numCandidates = [data.ogrenci_no, data.personel_no, data.tc_no].filter(Boolean);
  for (const c of numCandidates) {
    const hit = filesByName.get(String(c).toLowerCase());
    if (hit) return path.join(dir, hit);
  }

  // 2) Sonra isim soyisim ile eşleştir (akademik / idari icin daha dayanikli)
  for (const n of nameCandidates(data)) {
    const hit = filesByName.get(n);
    if (hit) return path.join(dir, hit);
  }

  return null;
}

// Bir batch icin eslesen (fotografi bulunan) kart sayisi
function countMatched(category, cards) {
  const dir = photoDirFor(category);
  if (!fs.existsSync(dir)) return 0;
  const files = fs.readdirSync(dir);
  const keys = new Set();
  for (const f of files) {
    const base = path.basename(f, path.extname(f)).toLowerCase();
    keys.add(base);
    keys.add(slugifyName(base));
  }
  let n = 0;
  for (const c of cards) {
    try {
      const d = JSON.parse(c.data_json);
      let found = false;
      // Numara dene
      [d.ogrenci_no, d.personel_no, d.tc_no].filter(Boolean).forEach((k) => {
        if (keys.has(String(k).toLowerCase())) found = true;
      });
      // Isim-soyisim dene (hem normalize hem orijinal)
      if (!found) {
        nameCandidates(d).forEach((nk) => {
          if (keys.has(nk)) found = true;
        });
      }
      if (found) n++;
    } catch {}
  }
  return n;
}

module.exports = {
  ROOT,
  photosDir,
  CATEGORY_FOLDERS,
  slugifyName,
  nameCandidates,
  photoDirFor,
  findPhoto,
  countMatched,
};
