"use strict";

/**
 * Yüksek İhtisas Üniversitesi — resmî fakülte / bölüm (TR ⇄ EN) listesi.
 * Kaynak: üniversitenin akademik birim listesi. README.md içinde de yayınlanmıştır.
 *
 * Amaç: Excel listesinde İngilizce karşılığı boş bırakılmış fakülte/bölüm
 * alanlarını otomatik doldurmak (kart ön yüzünde TR + EN birlikte basılır).
 */

const FACULTIES = [
  { tr: "Tıp Fakültesi", en: "Faculty of Medicine" },
  { tr: "Sağlık Bilimleri Fakültesi", en: "Faculty of Health Sciences" },
  { tr: "Spor Bilimleri Fakültesi", en: "Sports Science Faculty" },
  { tr: "Lisansüstü Eğitim Enstitüsü", en: "Graduate School of Education" },
  {
    tr: "Sağlık Hizmetleri Meslek Yüksekokulu",
    en: "Vocational School of Health Services",
  },
  { tr: "Meslek Yüksekokulu", en: "Vocational School" },
  { tr: "Yabancı Diller Yüksekokulu", en: "School of Foreign Languages" },
];

// faculty: bölümün bağlı olduğu fakülte (TR) — fakülte alanı boşsa doldurulur.
const PROGRAMS = [
  // Tıp Fakültesi
  { tr: "Temel Tıp Bilimleri", en: "Basic Medical Sciences", faculty: "Tıp Fakültesi" },
  { tr: "Cerrahi Tıp Bilimleri", en: "Surgical Medical Sciences", faculty: "Tıp Fakültesi" },
  { tr: "Dahili Tıp Bilimleri", en: "Internal Medical Sciences", faculty: "Tıp Fakültesi" },

  // Sağlık Bilimleri Fakültesi
  {
    tr: "Beslenme ve Diyetetik Bölümü",
    en: "Department of Nutrition and Dietetics",
    faculty: "Sağlık Bilimleri Fakültesi",
  },
  {
    tr: "Dil ve Konuşma Terapisi Bölümü",
    en: "Department of Language and Speaking Therapy",
    faculty: "Sağlık Bilimleri Fakültesi",
  },
  {
    tr: "Ebelik Bölümü",
    en: "Department of Midwifery",
    faculty: "Sağlık Bilimleri Fakültesi",
  },
  {
    tr: "Ergoterapi Bölümü",
    en: "Department of Occupational Therapy",
    faculty: "Sağlık Bilimleri Fakültesi",
  },
  {
    tr: "Fizyoterapi ve Rehabilitasyon Bölümü",
    en: "Physiotherapy and Rehabilitation Department",
    faculty: "Sağlık Bilimleri Fakültesi",
  },
  {
    tr: "Hemşirelik Bölümü",
    en: "Department of Nursing",
    faculty: "Sağlık Bilimleri Fakültesi",
  },
  {
    tr: "Sağlık Yönetimi Bölümü",
    en: "Health Management Department",
    faculty: "Sağlık Bilimleri Fakültesi",
  },

  // Spor Bilimleri Fakültesi
  {
    tr: "Antrenörlük Eğitimi Bölümü",
    en: "Coaching Education Department",
    faculty: "Spor Bilimleri Fakültesi",
  },

  // Sağlık Hizmetleri Meslek Yüksekokulu
  {
    tr: "Ameliyathane Hizmetleri",
    en: "Operating Room Services",
    faculty: "Sağlık Hizmetleri Meslek Yüksekokulu",
  },
  {
    tr: "Anestezi",
    en: "Anesthesia",
    faculty: "Sağlık Hizmetleri Meslek Yüksekokulu",
  },
  {
    tr: "Biyomedikal Cihaz Teknolojisi",
    en: "Biomedical Device Technology",
    faculty: "Sağlık Hizmetleri Meslek Yüksekokulu",
  },
  {
    tr: "Elektronörofizyoloji",
    en: "Electroneurophysiology",
    faculty: "Sağlık Hizmetleri Meslek Yüksekokulu",
  },
  {
    tr: "Fizyoterapi",
    en: "Physiotherapy",
    faculty: "Sağlık Hizmetleri Meslek Yüksekokulu",
  },
  {
    tr: "İlk ve Acil Yardım",
    en: "Emergency and First Aid",
    faculty: "Sağlık Hizmetleri Meslek Yüksekokulu",
  },
  {
    tr: "Optisyenlik",
    en: "Opticianry",
    faculty: "Sağlık Hizmetleri Meslek Yüksekokulu",
  },
  {
    tr: "Tıbbi Dokümantasyon ve Sekreterlik",
    en: "Medical Documentation and Secretariat",
    faculty: "Sağlık Hizmetleri Meslek Yüksekokulu",
  },
  {
    tr: "Tıbbi Laboratuvar Teknikleri",
    en: "Medical Laboratory Techniques",
    faculty: "Sağlık Hizmetleri Meslek Yüksekokulu",
  },
  {
    tr: "Tele-Sağlık Teknikerliği",
    en: "Telehealth Technicianhip",
    faculty: "Sağlık Hizmetleri Meslek Yüksekokulu",
  },
  {
    tr: "Tıbbi Tanıtım ve Pazarlama",
    en: "Medical Promotion and Marketing",
    faculty: "Sağlık Hizmetleri Meslek Yüksekokulu",
  },
  {
    tr: "Tıbbi Veri İşleme Teknikerliği",
    en: "Medical Data Processing Technicianhip",
    faculty: "Sağlık Hizmetleri Meslek Yüksekokulu",
  },

  // Meslek Yüksekokulu
  {
    tr: "Bilgisayar Programcılığı",
    en: "Computer Programming Program",
    faculty: "Meslek Yüksekokulu",
  },
  {
    tr: "Eczane Hizmetleri",
    en: "Pharmaceutical Services Program",
    faculty: "Meslek Yüksekokulu",
  },
  { tr: "Elektrik", en: "Electrical Program", faculty: "Meslek Yüksekokulu" },
  {
    tr: "Grafik Tasarımı",
    en: "Graphic Design Program",
    faculty: "Meslek Yüksekokulu",
  },
];

// Tıp Fakültesi program türleri (Excel'de "Tıp Fakültesi" / "Tıp Fakültesi (İngilizce)")
const MEDICINE_FACULTY = { tr: "Tıp Fakültesi", en: "Faculty of Medicine" };
const MEDICINE_PROGRAMMES = [
  { tr: "Türkçe Program", en: "Turkish Programme", match: ["turkce", "turkish"] },
  { tr: "İngilizce Program", en: "English Programme", match: ["ingilizce", "english"] },
];

/* ---------------- Normalizasyon ---------------- */

// Türkçe karakterleri sadeleştir, noktalama ve fazla boşlukları temizle.
function key(value) {
  return String(value == null ? "" : value)
    .toLocaleLowerCase("tr-TR")
    .replace(/[’'`".,;:()[\]{}/\\_\-–—]+/g, " ")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/ğ/g, "g")
    .replace(/â/g, "a")
    .replace(/î/g, "i")
    .replace(/û/g, "u")
    .replace(/\s+/g, " ")
    .trim();
}

const TAILS = [
  "bolumu", "bolum", "programi", "program", "anabilim dali",
  "anabilim", "dali", "abd", "fakultesi", "fakulte",
  "meslek yuksekokulu", "yuksekokulu", "enstitu",
];
const HEADS = [
  "graduate school of", "school of", "faculty of", "institute of",
  "department of", "department", "faculty", "school", "institute",
  "the",
];

// Bir metnin eşleşme varyantları: "Hemşirelik Bölümü" → "hemsirelik bolumu", "hemsirelik"
function variants(value) {
  const base = key(value);
  if (!base) return [];
  const out = new Set([base]);
  const addTail = (k) => {
    for (const t of TAILS) {
      if (k.endsWith(" " + t)) {
        const v = k.slice(0, -(t.length + 1)).trim();
        if (v) out.add(v);
      }
    }
  };
  const addHead = (k) => {
    for (const h of HEADS) {
      if (k.startsWith(h + " ")) {
        const v = k.slice(h.length + 1).trim();
        if (v) out.add(v);
      }
    }
  };
  for (const v of [...out]) {
    addTail(v);
    addHead(v);
  }
  return [...out].sort((a, b) => b.length - a.length);
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildIndex(entries, field, targetField) {
  const index = new Map();
  for (const entry of entries) {
    for (const v of variants(entry[field])) {
      if (!index.has(v)) index.set(v, entry);
    }
  }
  return index;
}

const facultyTrIndex = buildIndex(FACULTIES, "tr");
const facultyEnIndex = buildIndex(FACULTIES, "en");
const programTrIndex = buildIndex(PROGRAMS, "tr");
const programEnIndex = buildIndex(PROGRAMS, "en");

// Önce tam/varyant eşleşmesi, sonra en uzun kelime öbeği içerme eşleşmesi.
function lookup(index, value) {
  const vs = variants(value);
  if (!vs.length) return null;
  for (const v of vs) {
    const hit = index.get(v);
    if (hit) return hit;
  }
  const base = key(value);
  let best = null;
  let bestLen = 0;
  for (const [v, entry] of index) {
    if (v.length < 3 || v.length <= bestLen) continue;
    const re = new RegExp(`(^| )${escapeRe(v)}( |$)`);
    if (re.test(base)) {
      best = entry;
      bestLen = v.length;
    }
  }
  return best;
}

function findFaculty(...values) {
  for (const v of values) {
    const hit = lookup(facultyTrIndex, v) || lookup(facultyEnIndex, v);
    if (hit) return hit;
  }
  return null;
}

function findProgram(...values) {
  for (const v of values) {
    const hit = lookup(programTrIndex, v) || lookup(programEnIndex, v);
    if (hit) return hit;
  }
  return null;
}

// Tıp Fakültesi için "Turkish Programme" / "English Programme" karşılığı.
// Dolu bir bölüm eşleşmesi varsa ona dokunulmaz.
function medicineProgramme(row, faculty) {
  const isMedicine =
    (faculty && faculty.tr === MEDICINE_FACULTY.tr) ||
    /tip fakultesi|faculty of medicine/.test(
      key(row.fakulte_tr || row.fakulte_en || ""),
    ) ||
    /tip fakultesi|faculty of medicine/.test(
      key(row.program_tr || row.program_en || row.bolum_tr || row.bolum_en || ""),
    );
  if (!isMedicine) return null;

  const prog = key(row.program_tr || row.bolum_tr || row.program_en || "");
  if (!prog) return MEDICINE_PROGRAMMES[0]; // varsayılan: Türkçe Program
  // "Tıp Fakültesi", "Tıp", "Faculty of Medicine" → Türkçe Program
  if (/^(tip|tip fakultesi|faculty of medicine|medicine)$/.test(prog)) {
    return MEDICINE_PROGRAMMES[0];
  }
  for (const p of MEDICINE_PROGRAMMES) {
    if (p.match.some((m) => prog.includes(m))) return p;
  }
  return null;
}

/**
 * Kart verisindeki eksik İngilizce (ve varsa Türkçe) fakülte/bölüm alanlarını
 * resmî listeye göre tamamlar. Var olan değerler asla değiştirilmez.
 */
function enrichUniversity(row) {
  if (!row || typeof row !== "object") return row;
  const out = { ...row };

  const program = findProgram(
    out.program_tr,
    out.program_en,
    out.bolum_tr,
    out.bolum_en,
  );
  const faculty = findFaculty(
    out.fakulte_tr,
    out.fakulte_en,
    program && !out.fakulte_tr && !out.fakulte_en ? "" : out.unite_tr,
  ) || (program ? findFaculty(program.faculty) : null);

  if (faculty) {
    if (!out.fakulte_tr) out.fakulte_tr = faculty.tr;
    if (!out.fakulte_en) out.fakulte_en = faculty.en;
  }
  if (program) {
    if (!out.program_tr && !out.bolum_tr) out.program_tr = program.tr;
    if (!out.program_en && !out.bolum_en) out.program_en = program.en;
    // Bölüm biliniyorsa fakülte de tutarlı olsun (boşsa doldur).
    if (!out.fakulte_tr && !out.fakulte_en) {
      const f = findFaculty(program.faculty);
      if (f) {
        out.fakulte_tr = f.tr;
        out.fakulte_en = f.en;
      }
    }
  }

  // Tıp Fakültesi: Turkish Programme / English Programme
  const med = medicineProgramme(out, faculty);
  if (med) {
    if (!out.fakulte_tr) out.fakulte_tr = MEDICINE_FACULTY.tr;
    if (!out.fakulte_en) out.fakulte_en = MEDICINE_FACULTY.en;
    // Program türü yalnızca öğrenci kartlarında anlamlıdır (personelde "Ana Bilim Dalı" vardır).
    const isStudent =
      !!row.ogrenci_no ||
      (!row.personel_no && !row.unvan && !row.personel_unvan && !row.unite_tr && !row.unite_en);
    if (isStudent && !out.program_en && !out.bolum_en) {
      out.program_en = med.en;
      if (!out.program_tr && !out.bolum_tr) out.program_tr = med.tr;
    }
  }

  return out;
}

/* ---------------- Eksik alan raporu ---------------- */

const STUDENT_FIELDS = [
  { key: "fakulte_tr", label: "Fakülte (TR)" },
  { key: "fakulte_en", label: "Fakülte (EN)" },
  { key: "program_tr", label: "Bölüm (TR)" },
  { key: "program_en", label: "Bölüm (EN)" },
];
const AKADEMIK_FIELDS = [
  { key: "unite_tr", label: "Birim (TR)", anyOf: ["unite_tr", "fakulte_tr"] },
  { key: "unite_en", label: "Birim (EN)", anyOf: ["unite_en", "fakulte_en"] },
  { key: "program_tr", label: "Ana Bilim Dalı (TR)" },
];
const IDARI_FIELDS = [
  { key: "unite_tr", label: "Birim", anyOf: ["unite_tr", "fakulte_tr"] },
];

function fieldsFor(category, row) {
  const cat = String(category || "");
  if (cat === "akademik") return AKADEMIK_FIELDS;
  if (cat === "idari") return IDARI_FIELDS;
  if (cat === "ogrenci" || cat === "stajer" || cat === "intorn") return STUDENT_FIELDS;
  // Bilinmeyen kategori: dolu alan grubuna göre karar ver.
  return row && (row.unite_tr || row.unite_en || row.personel_no || row.unvan || row.personel_unvan)
    ? AKADEMIK_FIELDS
    : STUDENT_FIELDS;
}

function cardNo(data) {
  return String(data.ogrenci_no || data.personel_no || data.tc_no || "").trim();
}

function isFilled(row, field) {
  const keys = field.anyOf || [field.key];
  return keys.some((k) => String(row[k] ?? "").trim() !== "");
}

// Tek kartta boş kalan alanlar
function missingFields(row, category) {
  if (!row) return [];
  return fieldsFor(category, row).filter((f) => !isFilled(row, f));
}

/**
 * Batch'teki kartlar için eksik alan raporu üretir.
 * cards: [{ id, data }]
 */
function missingReport(category, cards) {
  const list = cards || [];
  const sample = list.length ? list[0].data || list[0] : null;
  const fields = fieldsFor(category, sample);
  const counts = new Map(fields.map((f) => [f.key, 0]));
  const items = [];

  for (const card of cards || []) {
    const data = card.data || card;
    const missing = missingFields(data, category);
    if (!missing.length) continue;
    for (const f of missing) counts.set(f.key, (counts.get(f.key) || 0) + 1);
    items.push({
      card_id: card.id ?? null,
      ad: String(data.ad || ""),
      soyad: String(data.soyad || ""),
      no: cardNo(data),
      missing: missing.map((f) => ({ key: f.key, label: f.label })),
    });
  }

  return {
    total: (cards || []).length,
    affected: items.length,
    complete: items.length === 0,
    fields: fields
      .map((f) => ({ key: f.key, label: f.label, count: counts.get(f.key) || 0 }))
      .filter((f) => f.count > 0),
    items,
  };
}

// Panelde / README'de kullanılabilecek sade liste.
function universityList() {
  return FACULTIES.map((f) => ({
    faculty: f.tr,
    facultyEn: f.en,
    programs: PROGRAMS.filter((p) => p.faculty === f.tr).map((p) => ({
      tr: p.tr,
      en: p.en,
    })),
    // Tıp Fakültesi gibi program türü ayrımı olan fakülteler
    programmeTypes: f.tr === MEDICINE_FACULTY.tr ? MEDICINE_PROGRAMMES.map(({ tr, en }) => ({ tr, en })) : [],
  }));
}

module.exports = {
  FACULTIES,
  PROGRAMS,
  MEDICINE_PROGRAMMES,
  enrichUniversity,
  universityList,
  findFaculty,
  findProgram,
  missingFields,
  missingReport,
  key,
};
