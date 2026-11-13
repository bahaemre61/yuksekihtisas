/* Rol / kategori yetkileri — tek kaynak.
 * Hem API hem arayuz ayni haritayi kullanir.
 */

const ALL_CATEGORIES = ["ogrenci", "akademik", "idari", "stajer", "intorn"];

// Hangi rol hangi kart kategorilerini basabilir / gorebilir
const ROLE_CATEGORIES = {
  admin: ALL_CATEGORIES,
  // Ogrenci Isleri: ogrenci + intorn + stajer doktor
  ogrenci_isleri: ["ogrenci", "intorn", "stajer"],
  // Personel Daire Baskanligi: akademik + idari
  personel_daire: ["akademik", "idari"],
  // Mevcut personel rolleri: tum kategoriler (davranis korunuyor)
  akademik: ALL_CATEGORIES,
  idari: ALL_CATEGORIES,
  operator: ALL_CATEGORIES,
};

const ROLE_LABELS = {
  admin: "Yönetici",
  ogrenci_isleri: "Öğrenci İşleri",
  personel_daire: "Personel Daire Başkanlığı",
  akademik: "Akademik Personel",
  idari: "İdari Personel",
  operator: "Operatör",
};

const ROLE_BADGE = {
  admin: "Yönetici",
  ogrenci_isleri: "Öğrenci İşleri",
  personel_daire: "Personel Daire",
  akademik: "Akademik",
  idari: "İdari",
  operator: "Operatör",
};

const VALID_ROLES = Object.keys(ROLE_LABELS);

// Mail merkezini gorebilecek roller
const MAIL_ROLES = ["admin", "ogrenci_isleri", "personel_daire"];

function allowedCategories(role) {
  return ROLE_CATEGORIES[role] || ALL_CATEGORIES;
}

function canAccessCategory(role, category) {
  return allowedCategories(role).includes(category);
}

function canUseMail(role) {
  return MAIL_ROLES.includes(role);
}

function roleLabel(role) {
  return ROLE_LABELS[role] || role;
}

module.exports = {
  ALL_CATEGORIES,
  ROLE_CATEGORIES,
  ROLE_LABELS,
  ROLE_BADGE,
  MAIL_ROLES,
  VALID_ROLES,
  allowedCategories,
  canAccessCategory,
  canUseMail,
  roleLabel,
};
