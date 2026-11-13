/* Ornek Excel listeleri — kategori bazli bos baslik sablonu uretir.
   Basliklar server/excel.js alan eslesmelerini karsilar (adres + "_20" son ekleri). */

const STUDENT_HEADERS = [
  "T.C.Kimlik No_20",
  "Öğrenci No_20",
  "Adı_20",
  "Soyadı_20",
  "Fakülte_20",
  "Fakülte_INGILIZCE",
  "Program_20",
  "Program_INGILIZCE",
];

const AKADEMIK_HEADERS = [
  "T.C.Kimlik No_20",
  "Personel No_20",
  "Adı_20",
  "Soyadı_20",
  "Unvan_20",
  "Fakülte_20",
  "Fakülte_INGILIZCE",
  "Program_20",
  "Program_INGILIZCE",
];

const IDARI_HEADERS = [
  "Sicil No",
  "Tc No",
  "Görevi",
  "Soyadı",
  "Adı",
  "Birimi",
];

const IDARI_ROWS = [
  ["B-1214", "44188826786", "Özel Kalem", "ŞENPARLAK ÇALIK", "Elif", "Rektörlük"],
  ["B-1215", "14974028342", "Basın Tanıtım Personeli", "ARSLAN", "Uygar Doğu", "Basın, Tanıtım ve Halkla İlişkiler Daire Başkanlığı"],
];

const STUDENT_ROWS = [];
const AKADEMIK_ROWS = [];

const COL_WIDTHS = {
  "T.C.Kimlik No_20": 15,
  "Öğrenci No_20": 15,
  "Personel No_20": 15,
  "Adı_20": 18,
  "Soyadı_20": 18,
  "Unvan_20": 24,
  "Fakülte_20": 34,
  "Fakülte_INGILIZCE": 34,
  "Program_20": 34,
  "Program_INGILIZCE": 34,
  "Birim_20": 40,
  "Birim_EN": 40,
  "Sicil No": 15,
  "Tc No": 13,
  "Görevi": 26,
  "Soyadı": 22,
  "Adı": 22,
  "Birimi": 48,
};

function sampleFor(category) {
  switch (String(category)) {
    case "akademik":
      return { headers: [...AKADEMIK_HEADERS], rows: [...AKADEMIK_ROWS] };
    case "idari":
      return { headers: [...IDARI_HEADERS], rows: [...IDARI_ROWS] };
    case "stajer":
    case "intorn":
    case "ogrenci":
    default:
      return { headers: [...STUDENT_HEADERS], rows: [...STUDENT_ROWS] };
  }
}

function sampleExcelBuffer(XLSX, category) {
  const { headers, rows } = sampleFor(category);
  const aoa = [headers, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!cols"] = headers.map((h) => ({ wch: COL_WIDTHS[h] || 20 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Kart Listesi");
  return Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
}

module.exports = { sampleFor, sampleExcelBuffer };
