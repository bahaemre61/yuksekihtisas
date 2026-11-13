# OtoKart — Yüksek İhtisas Üniversitesi Kart Basım Otomasyonu

Excel listelerinden öğrenci/personel kart basımı, tek kart manuel giriş,
önizleme (ön + arka yüz), PDF baskı ve anında / gün sonu / haftada bir mail gönderimi.

## Kurulum

```bash
cd otokart
npm install
npm start
```

Tarayıcıdan açın: **http://localhost:3000** — varsayılan giriş: **admin / admin**

## Sürüm kontrolü (GitHub)

- Depo: **https://github.com/omerrFurkan/otokart-basim** (private, `main` dalı)
- Kod değişiklikleri: `git add . && git commit -m "..." && git push`
- Kişisel/yerel veriler repoya **dahil edilmez**: `otokart.db`, `uploads/`, `photos/`, `output/`, `Boş örnek/`, `node_modules/`
- Yeni makinede kurulum:

```bash
git clone https://github.com/omerrFurkan/otokart-basim.git
cd otokart-basim
npm install
npm start
```

> Örnek Excel/fotoğraf klasörleri (`Boş örnek/`) ve mevcut veritabanı veri gizliliği nedeniyle repoda yoktur; gerekirse ayrıca kopyalanır.

## Kullanıcılar ve Roller

| Kullanıcı | Şifre | Rol | Gördüğü menü |
|-----------|-------|-----|--------------|
| admin | admin | Yönetici | Panel (ekip takibi dahil) + Kart Basım + Mail Gönder + İşlem Logları + Kullanıcılar |
| ogrenci_isleri | ogrenci_isleri | Öğrenci İşleri | **Kart Basım** + **Mail Gönder** — yalnızca Öğrenci / İntörn / Stajer Doktor |
| personel_daire | personel_daire | Personel Daire Başkanlığı | **Kart Basım** + **Mail Gönder** — yalnızca Akademik / İdari |
| akademik | akademik | Akademik Personel | Sadece **Kart Basım** (Toplu Ekle / Manuel Ekle + tarihe göre işlemler) |
| idari | idari | İdari Personel | Sadece **Kart Basım** |

Yönetici, **Kullanıcılar** menüsünden kullanıcı ekleyebilir, rol atayabilir veya silebilir.
Rol bazlı kategori yetkisi sunucuda da zorunludur: Öğrenci İşleri yalnızca
`ogrenci/stajer/intorn`, Personel Daire yalnızca `akademik/idari` listelerini görür,
açamaz ve mail atamaz (çapraz erişim **403**).

Admin **Panel** ekranındaki **Ekip Takibi** kartlarında Öğrenci İşleri ve Personel Daire
Başkanlığı'nın işlem/kart/basıma gönderildi/bekleyen sayılarını görür.

## Mail Gönder (3 mod)

| Mod | Ne zaman | Kapsam |
|-----|----------|--------|
| ⚡ Anında Gönder | Butona basınca | Seçilen listeler |
| 🌙 Gün Sonu | Her gün varsayılan **18:00** (değiştirilebilir) | O gün oluşturulmuş ve henüz mail atılmamış listeler |
| 📅 Haftada Bir | Varsayılan **Pazartesi 09:00** (değiştirilebilir) | Son 7 günde oluşturulmuş ve henüz mail atılmamış listeler |

- Tek mail + tek zip: zip içinde **Excel listesi** (manuel listelerde kartlardan otomatik üretilir)
  ve yalnızca ilgili listelerin **eşleşen fotoğrafları** bulunur; **PDF eklenmez**.
- Gönderim sonrası listeler `mail_sent_at` ile işaretlenir; gün sonu/haftalık kurallar aynı listeyi tekrar göndermez.
- Kural kapsamı oluşturan kullanıcının rolüne göre sınırlıdır (Öğrenci İşleri / Personel Daire birbirinin listesini göndermez).
- **SMTP Ayarları** yalnızca yöneticiye görünür (`mail_smtp_host/port/user/pass`, Test Mail).
- **Gönderim Geçmişi** son 100 kaydı (başarılı/hata + hata mesajı) listeler.
- SMTP: `587 / 25 / 2525` → otomatik **STARTTLS** (`Güvenli: Hayır`), `465` → otomatik **SSL/TLS** (`Güvenli: Evet`). SMTP hataları kullanıcıya anlaşılır Türkçe mesajla döner (port/güvenlik, kimlik bilgileri, bağlantı sorunları).

## Kart Basım (ana ekran)

- Üstte **📤 Toplu Ekle** (Excel + fotoğraflar birlikte) ve **✍️ Manuel Ekle** (tek kart + canlı önizleme) butonları
- **Toplu Ekle akışı:** Excel + fotoğrafları seç → **Listeyi Yükle ve Önizle** → kart önizlemeleri açılır → sağ alttaki **✓ Onayla ve Yükle** butonuna basılmadan **hiçbir kayıt oluşturulmaz** (`Vazgeç` veya `Esc` ile iptal)
- **Örnek Liste İndir:** “Örnek liste” kutusunun yanındaki **⬇ Örnek Liste İndir** butonu, seçili kategoriye göre başlıkları ve örnek satırları içeren `ornek_<kategori>_listesi.xlsx` indirir (Öğrenci/İntörn/Stajer → öğrenci formatı, Akademik → akademik format, İdari → idari format). Rol yetkisi var: Öğrenci İşleri yalnız kendi kategorilerini, Personel Daire yalnız akademik/idari’yi indirir.
- Altta kart işlemleri **tarihe göre gruplu** listelenir (örn. `05.11.2026 Perşembe`); tarihe tıklayınca o günün işlemleri açılır
- Her işin yanında fotoğraf eşleşmesi görünür (örn. `42/42 fotoğraf eşleşti`)
- İş detayında **Fotoğraf eşleşme** bandı: `X/Y eşleşti` rozeti, **Tümü / Fotoğraflı / Eksik** filtreleri
- İş detayında **Eksik Alan Raporu**: otomatik eşleştirme sonrası boş kalan fakülte/bölüm alanları, hangi kartta hangi alanın eksik olduğuyla listelenir; **⬇ Eksikleri Excel İndir** ile `eksik_alanlar_<id>.xlsx` alınır

## Özellikler

| Özellik | Açıklama |
|---------|----------|
| Excel yükleme | `.xlsx` yüklenir, sütunlar otomatik Türkçe eşleşir (elle düzeltilebilir) |
| Önizleme + onay | Yükleme öncesi kart önizlemeleri gösterilir; sağ alttaki **Onayla ve Yükle** butonu ile kesinleşir, onaylanmadan kayıt oluşmaz |
| Fakülte/bölüm İngilizcesi | Excel'de **İngilizce karşılık boşsa** resmî TR/EN listesinden otomatik tamamlanır (aşağıdaki tablo) |
| Tıp program türü | `Tıp Fakültesi` → **Turkish Programme**, `Tıp Fakültesi (İngilizce)` → **English Programme** |
| Eksik alan raporu | Otomatik tamamlamaya rağmen **boş kalan** fakülte/bölüm alanları iş detayında listelenir; **Excel** olarak indirilebilir |
| Fotoğraf yükleme | Excel ile birlikte fotoğraf da yükleyin; dosya adı = kart numarası (örn. `2601010917.jpg`) |
| Manuel tek kart | Form + canlı kart önizleme (ön ve arka yüz yan yana) |
| Kurumsal tasarım | Kartlar **kurumsal kimliğe** uygun: kırmızı şerit + dikey yazı, resmi YİÜ amblemi, lacivert/kırmızı kimlik |
| Kategoriler | Öğrenci / Akademik / İdari / Stajyer Doktor / İntörn |
| PDF baskı | Toplu A4 PDF (2×4 kart; önce ön yüzler, sonra arka yüzler — dupleks baskıya uygun sıra); panel önizlemesiyle **birebir aynı** şablon arka planları, fotoğraf/barkod konumları ve taşma koruması |
| Mail gönderimi | Anında / gün sonu / haftada bir; seçili listeler tek zip içinde kategori başına ayrı bir Excel'e birleştirilir; PDF yok |
| İşlem Logları | Her işlem (login, Excel, batch, kart, mail, kullanıcı, ayarlar) `activity_logs` tablosuna kaydedilir. Admin menüsünde **İşlem Logları** sayfasında filtrelenir ve **Excel** olarak indirilebilir |
| Dosya adlandırma | Tüm zip/PDF/Excel çıktıları `otokart_..._YYYYAAGG_SSDDSS_mmm` formatında; liste/mail ekleri zaman damgalı ve sıra no’lu |

## Fakülte ve Bölümler (TR / EN)

Kart ön yüzünde fakülte ve bölüm adı **Türkçe + İngilizce** basılır. Excel'de
`Fakülte_INGILIZCE` / `Program_INGILIZCE` sütunları boşsa, aşağıdaki resmî liste
kullanılarak otomatik tamamlanır (`server/university.js`).

> Listeye programatik erişim: `GET /api/university` (fakülte + bölümler + Tıp program türleri, TR/EN).

### Tıp Fakültesi — Faculty of Medicine
- Temel Tıp Bilimleri — Basic Medical Sciences
- Cerrahi Tıp Bilimleri — Surgical Medical Sciences
- Dahili Tıp Bilimleri — Internal Medical Sciences

**Program türü (Tıp Fakültesi):**
- Tıp Fakültesi / Tıp Fakültesi (Türkçe) — **Turkish Programme**
- Tıp Fakültesi (İngilizce) — **English Programme**

### Sağlık Bilimleri Fakültesi — Faculty of Health Sciences
- Beslenme ve Diyetetik Bölümü — Department of Nutrition and Dietetics
- Dil ve Konuşma Terapisi Bölümü — Department of Language and Speaking Therapy
- Ebelik Bölümü — Department of Midwifery
- Ergoterapi Bölümü — Department of Occupational Therapy
- Fizyoterapi ve Rehabilitasyon Bölümü — Physiotherapy and Rehabilitation Department
- Hemşirelik Bölümü — Department of Nursing
- Sağlık Yönetimi Bölümü — Health Management Department

### Spor Bilimleri Fakültesi — Sports Science Faculty
- Antrenörlük Eğitimi Bölümü — Coaching Education Department

### Lisansüstü Eğitim Enstitüsü — Graduate School of Education
- (Bölüm/program listesi yok)

### Sağlık Hizmetleri Meslek Yüksekokulu — Vocational School of Health Services
- Ameliyathane Hizmetleri — Operating Room Services
- Anestezi — Anesthesia
- Biyomedikal Cihaz Teknolojisi — Biomedical Device Technology
- Elektronörofizyoloji — Electroneurophysiology
- Fizyoterapi — Physiotherapy
- İlk ve Acil Yardım — Emergency and First Aid
- Optisyenlik — Opticianry
- Tıbbi Dokümantasyon ve Sekreterlik — Medical Documentation and Secretariat
- Tıbbi Laboratuvar Teknikleri — Medical Laboratory Techniques
- Tele-Sağlık Teknikerliği — Telehealth Technicianhip
- Tıbbi Tanıtım ve Pazarlama — Medical Promotion and Marketing
- Tıbbi Veri İşleme Teknikerliği — Medical Data Processing Technicianhip

### Meslek Yüksekokulu — Vocational School
- Bilgisayar Programcılığı — Computer Programming Program
- Eczane Hizmetleri — Pharmaceutical Services Program
- Elektrik — Electrical Program
- Grafik Tasarımı — Graphic Design Program

### Yabancı Diller Yüksekokulu — School of Foreign Languages
- (Program listesi yok)

## Kurumsal kimlik varlıkları

- Amblem: `web/assets/yiu-logo.png` (şeffaf arka plan, kartlara ve panele yerleştirilir)
- Resmi logo linki: https://demo.yuksekihtisas.edu.tr/sayfa/kurumsal/kurumsal-kimlik

## Vesikalık fotoğraf kırpma (offline, Python)

`tools/vesikalik.py` — A4 kağıdı üzerinde (veya kamera ile çekilmiş) bir vesikalik fotoğraftan yüzü yerel olarak tespit eder, yüzü merkeze alır ve tam **4:5** oranında (varsayılan **800×1000 piksel**) kırpar.

Tamamen yereldedir: internet veya bulut AI gerekmez. Kullanılan kütüphaneler **OpenCV** (Haar cascade + perspektif düzeltme) ve **MediaPipe** (yerel `face_detector.tflite` modeli ile yüz + göz anahtar noktaları).

Özellikler:
- A4 kağıdı algılanıp perspektif düzeltmesi (`--no-paper` ile kapatılabilir)
- Göz çizgisine göre otomatik döndürme/hizalama (`--no-align` ile kapatılabilir)
- EXIF yönü otomatik düzeltilir (Pillow ile)
- `--debug` ile tespit/kırpma çizgili ön izleme kaydedilir
- `--quality` ile JPEG kalitesi ayarlanır (vars. 95)

```bash
python tools/vesikalik.py <girdi_dosya_veya_klasor> [cikti_dosya_veya_klasor] [--width 800] [--height 1000] [--quality 95] [--debug] [--no-align] [--no-paper]

# Örnek: tek foto
python tools/vesikalik.py "Bos ornek/ogrenci/2407050005.jpg" cikti.jpg

# Örnek: klasörde tüm fotoğrafları işle
python tools/vesikalik.py "Bos ornek/ogrenci" output_images --debug
```

Çıktı her zaman 800×1000 (4:5) ve yüz merkezli olarak kaydedilir.

## Fotoğraf yükleme (JS)

Fotoğraflar **Kart Basım → Toplu Ekle** içinde Excel ile birlikte toplu yüklenir. Tek fotoğraf kart başına
kaydolur; dosya adı = kart numarası (örn. `2601010917.jpg`).

`/api/photos/:category` endpoint'i toplu yüklemeler için kullanılır:

- Yüklenen her fotoğraf `photos/<kategori>/<no>.jpg` olarak kaydedilir
- Fotoğraf dosya adı numarayla eşleştiğinde kartta otomatik görünür
- 4:5 vesikalık kırpma için ayrıca `python tools/vesikalik.py` aracı mevcuttur (bkz. yukarıdaki bölüm)

## Klasör yapısı

```
otokart/
├── server/       # Express API, PDF üretimi
│   ├── permissions.js  # Rol/kategori yetki haritası
│   ├── mail.js         # Zip + SMTP + mail job/log
│   ├── photos.js       # Fotoğraf eşleştirme (no + isim, Türkçe normalize)
│   ├── cardLayout.js   # Kart şablon alan konumları (panel ile birebir)
│   └── university.js  # Fakülte/bölüm TR-EN listesi + otomatik tamamlama
├── web/          # Panel (Tailwind, vanilla JS)
│   └── assets/   # YİÜ amblemi, vendor/tailwind.js
├── tools/        # vesikalik.py — offline 4:5 vesikalık kırpma aracı
│   └── models/   # face_detector.tflite — yerel MediaPipe yüz modeli
├── photos/       # Fotoğraflar: photos/<kategori>/<no>.jpg
├── uploads/      # Yüklenen Excel dosyaları
├── output/       # Üretilen PDF'ler
└── otokart.db    # SQLite
```
