// Kurumsal Risk, Değişim Yönetişimi ve İç Kontrol formu: ortak sabitler (sunucu + istemci).

export const RISK_CATEGORIES = [
    'Operasyonel', 'Akademik', 'Mali', 'İK', 'Bilgi Güvenliği', 'Mevzuat/Uyum', 'İtibar', 'İSG', 'Uluslararasılaşma', 'Diğer'
] as const;

export const RESOURCE_TYPES = ['Hayır', 'İnsan Kaynağı', 'Mali', 'Yazılım/Sistem', 'Eğitim', 'Fiziksel', 'Diğer'] as const;

export const CHANGE_TYPES = [
    'Süreç', 'Organizasyon', 'Görev/Yetki', 'Dijital Sistem', 'İnsan Kaynağı', 'Mevzuat/Prosedür', 'Eğitim', 'İletişim', 'Fiziksel Altyapı', 'Diğer'
] as const;

export const COMMISSION_DECISIONS = [
    'Birim izleyecek', 'Aksiyon uygulanacak', 'Değişim önerisi değerlendirilecek', 'Üst yönetime sunulacak',
    'İç kontrol incelemesine alınacak', 'Kapatılacak', 'Revizyon'
] as const;

export const CURRENT_STATUSES = [
    'Yeni', 'Değerlendirmede', 'Aksiyon Planlandı', 'Uygulama Devam Ediyor', 'Kontrol Altında',
    'İç Kontrol İncelemesinde', 'Kapatıldı', 'Yeniden Değerlendirme'
] as const;

export const INTERNAL_CONTROL_RESULTS = ['Uygun', 'İyileştirme Gerekli', 'Risk Yeniden Değerlendirilmeli', 'Yeni Değişim Önerisi Gerekli'] as const;

// "Portal iş akışlarından seçilir"
export const WORKFLOWS = [
    'Araç Talebi', 'Teknik Destek Talebi', 'Malzeme Talebi', 'Toplantı ve Tutanak', 'Duyuru Yönetimi',
    'Yemek Menüsü', 'Doküman / Kanıt Yönetimi', 'Görev Yönetimi', 'Diğer'
] as const;

// Birim önerileri (listeye yazılmayan birim de elle girilebilir)
export const UNIT_SUGGESTIONS = [
    'Rektörlük', 'Genel Sekreterlik', 'Bilgi İşlem Daire Başkanlığı', 'Personel Daire Başkanlığı',
    'Strateji Geliştirme Daire Başkanlığı', 'Sağlık, Kültür ve Spor Daire Başkanlığı', 'Yapı İşleri ve Teknik Daire Başkanlığı',
    'Kütüphane ve Dokümantasyon Daire Başkanlığı', 'Tıp Fakültesi', 'Sağlık Bilimleri Fakültesi', 'Sağlık Meslek Yüksekokulu', 'Meslek Yüksekokulu'
];

export const RISK_LEVELS = [
    { key: 'dusuk', label: 'Düşük', max: 4 },
    { key: 'orta', label: 'Orta', max: 9 },
    { key: 'yuksek', label: 'Yüksek', max: 16 },
    { key: 'cok_yuksek', label: 'Çok Yüksek', max: 25 }
] as const;

export function riskScore(olasilik?: number | null, etki?: number | null): number | null {
    if (!olasilik || !etki) return null;
    return olasilik * etki;
}

// Önerilen eşikler: 1-4 Düşük | 5-9 Orta | 10-16 Yüksek | 17-25 Çok Yüksek
export function riskLevel(score: number | null | undefined): { key: string; label: string } | null {
    if (!score) return null;
    const level = RISK_LEVELS.find((l) => score <= l.max);
    return level ? { key: level.key, label: level.label } : null;
}

// Rol yetkileri. Portalda "komisyon" ve "iç kontrol" rolleri olmadığı için mevcut roller eşlenmiştir; gerekirse buradan değiştirin.
export const COMMISSION_ROLES: string[] = ['admin', 'supervisor'];
export const INTERNAL_CONTROL_ROLES: string[] = ['admin', 'kanit_sorumlu', 'raportor'];
export const RISK_FORM_CREATOR_ROLES: string[] = ['user', 'admin', 'amir', 'supervisor', 'techamir', 'akademik', 'kanit_sorumlu', 'raportor', 'mali_isler', 'tech', 'driver'];

export const canReviewAll = (role?: string) =>
    !!role && (COMMISSION_ROLES.includes(role) || INTERNAL_CONTROL_ROLES.includes(role));
