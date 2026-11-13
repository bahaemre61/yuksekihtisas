const XLSX = require("xlsx");
const { enrichUniversity } = require("./university");

// Turkish karakterleri normalize et (ad eslestirme icin)
function norm(s) {
  if (s == null) return "";
  return String(s)
    .trim()
    .toLowerCase()
    .replace(/[\s_\-./]+/g, " ")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/ğ/g, "g")
    .replace(/İ/g, "i");
}

// Her kategori icin alan eslesme kurallari (anahtar = normalize edilmis baslik)
const FIELD_ALIASES = {
  tc_no: [
    "tc kimlik no", "tc kimlik", "kimlik no", "t c kimlik no", "tckn",
    "tc", "kimlik", "id", "t c kimlik", "tcknl",
    "tc no", "tcno", "t c no", "tc numarası", "tc numarasi",
  ],
  personel_no: [
    "personel no", "personel numarasi", "sicil no", "sicil", "karts no",
    "personel numarası", "sicil no",
  ],
  personel_unvan: ["unvan", "title", "unvanı", "akademik unvan", "gorev", "gorevi"],
  ogrenci_no: [
    "ogrenci no", "ogrenci numarasi", "ogrenci num", "ogrenci no",
    "student no", "barkod no", "karts no", "no",
  ],
  ad: ["ad", "adi", "isim", "first name", "ad soyad ad", "ad_adi"],
  soyad: ["soyad", "soyadi", "last name", "surname"],
  fakulte_tr: ["fakulte", "fakulte tr", "fakulte turkce"],
  fakulte_en: ["fakulte ingilizce", "fakulte en", "faculty", "faculty english"],
  program_tr: ["program", "program tr", "program turkce", "bolum", "bolum tr"],
  program_en: ["program ingilizce", "program en", "program english", "department"],
  unite_tr: ["unite", "unite tr", "birim", "mudurluk", "fakulte tr"],
  unite_en: ["unite en", "birim en"],
};

// Basligi bir alan anahtarina cevir
function mapHeader(header) {
  let h = norm(header);
  if (!h) return null;
  // Sonundaki "_20", " (1)" gibi sonekleri temizle (ornek: "Soyadı_20" -> "soyadi")
  h = h.replace(/[\s_\-./]*\d+$/, "").trim();
  if (!h) return null;
  for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
    for (const a of aliases) {
      if (h === norm(a)) return field;
    }
  }
  // Kismi eslesme: baslangicta ya da kelime sinirinda gecmeli
  // ("adi" alias'i "soyadi" icerisinde gectigi icin yanlis eslesmeyi onler)
  for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
    for (const a of aliases) {
      const na = norm(a);
      if (na.length < 3) continue;
      if (h.startsWith(na)) return field;
      if (new RegExp(`\\b${na}\\b`).test(h)) return field;
    }
  }
  return null;
}

// Excel dosyasini parse et, alan adli satirlari dondur
function parseExcel(filePath, mappingOverride = null) {
  const wb = XLSX.readFile(filePath, { cellDates: true });
  const sheetName = wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "", blankrows: false });
  if (!raw.length) return { headers: [], rows: [], fieldMap: {} };

  // Baslik satiri = ilk satir
  const headers = raw[0].map((h) => String(h ?? "").trim());
  const fieldMap = {};
  headers.forEach((h, i) => {
    if (mappingOverride && mappingOverride[i]) {
      fieldMap[mappingOverride[i]] = i;
    } else {
      const f = mapHeader(h);
      if (f && fieldMap[f] === undefined) fieldMap[f] = i;
    }
  });

  const rows = [];
  for (let r = 1; r < raw.length; r++) {
    const row = raw[r];
    if (!row || row.every((c) => String(c ?? "").trim() === "")) continue;
    const item = {};
    for (const [field, idx] of Object.entries(fieldMap)) {
      let v = row[idx];
      if (v === undefined || v === null) v = "";
      v = String(v).trim();
      // Excel numeric kose virgul sorunu: TCKN/ogrenci no sadece rakam olsun;
      // personel/sicil no harfleri (A-5359 gibi) aynen korunur.
      if (field === "tc_no" || field === "ogrenci_no") {
        v = v.replace(/[^\d]/g, "");
      }
      item[field] = v;
    }
    // Fakülte/bölümün İngilizcesi boşsa resmî listeden otomatik tamamla.
    rows.push(enrichUniversity(item));
  }
  return { headers, rows, fieldMap };
}

// Baslik onerisi (kullanicinin mapping secmesi icin)
function suggestMapping(headers) {
  return headers.map((h) => mapHeader(h) || "");
}

module.exports = { parseExcel, suggestMapping, norm, mapHeader };
