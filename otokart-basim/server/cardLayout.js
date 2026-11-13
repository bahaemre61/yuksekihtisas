/* Kart şablon yerleşimi — web/app.js içindeki CARD_FIELDS / CARD_PHOTO /
 * CARD_BARCODE / CARD_BG / CARD_RATIO / mapCardData ile BİREBİR aynı olmalı.
 * PDF üretimi (server/pdf.js) bu modülü kullanır; panel ile baskı aynı çıkar.
 */

const CARD_BG = {
  akademik: { front: "akademik-front.jpg", back: "akademik-back.jpg" },
  idari: { front: "idari-front.jpg", back: "idari-back.jpg" },
  ogrenci: { front: "ogrenci-front.jpg", back: "ogrenci-back.jpg" },
  intorn: { front: "intern-front.jpg", back: "intern-back.jpg" },
  stajer: { front: "stajyer-front.jpg", back: "stajyer-back.jpg" },
};

/* Kart en-boy oranları (genişlik / yükseklik) */
const CARD_RATIO = {
  akademik: 1990 / 1146,
  idari: 1990 / 1146,
  ogrenci: 1990 / 1146,
  intorn: 2039 / 1146,
  stajer: 2039 / 1146,
};

const CARD_FIELDS = {
  akademik: {
    front: [
      { k: "ad", l: 15.64, t: 50.5, w: 44.55, f: 3.17 },
      { k: "unvan", l: 15.64, t: 62, w: 44.55, f: 3.17 },
      { k: "anabilim", l: 15.64, t: 76, w: 44.55, f: 3.17 },
      { k: "sicil", l: 15.64, t: 88.2, w: 44.55, f: 3.96 },
      { k: "okul", l: 29.7, t: 25, w: 57.43, f: 2.87, al: "center" },
      { k: "bolum", l: 29.7, t: 33.5, w: 57.43, f: 2.87, al: "center" },
      { k: "seri", l: 95.25, t: 0.6, f: 2.77, rot: 1 },
    ],
    back: [
      { k: "barkodno", l: -2.38, t: 53, f: 2.77, rot: 1 },
      { k: "tarih", l: 87.72, t: 71.8, f: 1.09, rot: 1, wt: 400 },
    ],
  },
  idari: {
    front: [
      { k: "ad", l: 17.03, t: 57.7, w: 44.55, f: 3.17 },
      { k: "gorev", l: 17.03, t: 71.9, w: 47.52, f: 2.87 },
      { k: "sicil", l: 17.03, t: 87.4, w: 44.55, f: 3.17 },
      { k: "birim", l: 29.7, t: 25, w: 57.43, f: 3.76, al: "center" },
      { k: "seri", l: 95.84, t: 2.8, f: 2.77, rot: 1 },
    ],
    back: [
      { k: "barkodno", l: -2.38, t: 44.5, f: 2.77, rot: 1 },
      { k: "tarih", l: 88.51, t: 72.2, f: 1.09, rot: 1, wt: 400 },
    ],
  },
  ogrenci: {
    front: [
      { k: "ad", l: 39.01, t: 42, w: 59.41, f: 3.47 },
      { k: "no", l: 39.01, t: 55.2, w: 59.41, f: 3.88 },
      { k: "faktr", l: 39.01, t: 64.7, w: 59.41, f: 2.44 },
      { k: "faken", l: 39.41, t: 70.4, w: 59.41, f: 2.42 },
      { k: "progtr", l: 39.01, t: 77.8, w: 59.41, f: 2.44 },
      { k: "progen", l: 39.01, t: 83.8, w: 59.41, f: 2.42 },
      { k: "seri", l: 94.26, t: 2.4, f: 2.77, rot: 1 },
    ],
    back: [
      { k: "tarih", l: 14.65, t: 18.5, w: 39.6, f: 1.78, wt: 400 },
      { k: "sn", l: 13.66, t: 88.5, w: 19.8, f: 1.78, wt: 400 },
      { k: "barkodno", l: 5.94, t: 82, w: 23.76, f: 1.78, wt: 400 },
    ],
  },
  intorn: {
    front: [
      { k: "ad", l: 39.6, t: 59.2, w: 49.5, f: 3.4 },
      { k: "fakulte", l: 37.62, t: 50.5, w: 53.47, f: 2.77, al: "center", c: "#c40000", cov: "#f6f6f6", h: 7 },
      { k: "ogrno", l: 41.58, t: 74.4, w: 31.68, f: 2.39 },
      { k: "gecerlilik", l: 66.73, t: 74, w: 31.68, f: 2.39 },
      { k: "seri", l: 94.46, t: 2.4, f: 3.43, rot: 1 },
    ],
    back: [
      { k: "fakulte2", l: 27.72, t: 48, w: 54.46, f: 2.77, al: "center", c: "#c40000", cov: "#ffffff", h: 6 },
      { k: "barkodno", l: 34.88, t: 76.4, w: 31.68, f: 2.08, al: "center", wt: 400 },
      { k: "tarih", l: 87.72, t: 11.7, f: 1.08, rot: 1, wt: 400 },
    ],
  },
  stajer: {
    front: [
      { k: "ad", l: 39.6, t: 59.1, w: 49.5, f: 3.03 },
      { k: "fakulte", l: 37.62, t: 50.5, w: 53.47, f: 2.77, al: "center", c: "#c40000", cov: "#f6f6f6", h: 7 },
      { k: "ogrno", l: 40.99, t: 74.4, w: 31.68, f: 2.38 },
      { k: "gecerlilik", l: 66.14, t: 74, w: 31.68, f: 2.38 },
      { k: "seri", l: 94.26, t: 2.5, f: 3.37, rot: 1 },
    ],
    back: [
      { k: "fakulte2", l: 27.72, t: 52, w: 54.46, f: 2.77, al: "center", c: "#c40000", cov: "#ffffff", h: 6 },
      { k: "barkodno", l: 38.61, t: 76.4, w: 31.68, f: 2.08, al: "center", wt: 400 },
      { k: "tarih", l: 87.72, t: 13.5, f: 1.09, rot: 1, wt: 400 },
    ],
  },
};

const CARD_PHOTO = {
  akademik: { l: 64.36, t: 44, w: 22.18, h: 47 },
  idari: { l: 63.17, t: 41.2, w: 21.78, h: 51.3 },
  ogrenci: { l: 16.83, t: 40.8, w: 20.79, h: 49.8 },
  intorn: { l: 11.88, t: 14, w: 23.37, h: 55.3 },
  stajer: { l: 11.09, t: 15.4, w: 24.16, h: 55.2 },
};

const CARD_BARCODE = {
  akademik: { l: 7.72, t: 28, w: 16.44, h: 60 },
  idari: { l: 7.72, t: 28, w: 16.44, h: 60 },
  ogrenci: { l: 5.94, t: 25, w: 13.86, h: 55 },
  intorn: { l: 30.3, t: 62, w: 49.5, h: 14 },
  stajer: { l: 30.69, t: 62, w: 47.52, h: 14 },
};

function serialOf(d, idx) {
  if (d._serial) return String(d._serial).padStart(6, "0");
  const ix = d._idx != null ? d._idx : idx;
  if (ix != null) return String(ix + 1).padStart(6, "0");
  const n = (d.tc_no || d.ogrenci_no || d.personel_no || "0")
    .split("")
    .reduce((a, c) => (a * 31 + (+c || 7) + 13) % 1000000, 7);
  return String(Math.abs(n)).padStart(6, "0");
}

function academicYear() {
  const now = new Date();
  const start = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
  return `${start}/${String(start + 1).slice(-2)}`;
}

function shortDate() {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getFullYear()).slice(-2)}`;
}

/* Mevcut proje verilerini şablon alanlarına eşle (web/app.js mapCardData ile aynı) */
function mapCardData(d, category, idx) {
  const ad = `${d.ad || ""} ${d.soyad || ""}`.toLocaleUpperCase("tr-TR").trim();
  const serial = serialOf(d, idx);
  const barcodeNo = d.tc_no || d.ogrenci_no || d.personel_no || serial;
  const now = new Date();
  const gecerlilik = `${String(now.getDate()).padStart(2, "0")}.${String(now.getMonth() + 1).padStart(2, "0")}.${String(now.getFullYear() + 1).slice(-2)}`;

  return {
    ad,
    no: d.ogrenci_no || d.personel_no || d.tc_no || "",
    faktr: d.fakulte_tr || "",
    faken: d.fakulte_en || "",
    progtr: d.program_tr || "",
    progen: d.program_en || "",
    fakulte: [d.fakulte_tr || "", d.program_tr || ""].filter(Boolean).join(" ") || d.fakulte_tr || "",
    fakulte2: [d.fakulte_en || "", d.program_en || ""].filter(Boolean).join(" ") || d.fakulte_tr || "",
    unvan: d.personel_unvan || "",
    gorev: d.personel_unvan || "",
    sicil: d.personel_no || d.ogrenci_no || d.tc_no || "",
    anabilim: d.program_tr || "",
    birim: d.unite_tr || "",
    ogrno: d.ogrenci_no || d.personel_no || d.tc_no || "",
    gecerlilik,
    seri: serial,
    barkodno: barcodeNo,
    tarih: shortDate(),
    tarihwrap: `${academicYear()}  ${shortDate()}`,
    sn: "<<sn>>",
    okul: "YÜKSEK İHTİSAS ÜNİVERSİTESİ",
    bolum: d.fakulte_tr || "",
  };
}

module.exports = {
  CARD_BG,
  CARD_RATIO,
  CARD_FIELDS,
  CARD_PHOTO,
  CARD_BARCODE,
  serialOf,
  academicYear,
  shortDate,
  mapCardData,
};
