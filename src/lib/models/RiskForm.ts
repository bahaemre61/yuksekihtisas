import { Schema, models, model, Types } from 'mongoose';

const str = (max = 2000) => ({ type: String, trim: true, maxlength: max, default: '' });
const num15 = { type: Number, min: 1, max: 5 };
const triple = { type: String, enum: ['evet', 'kismen', 'hayir', ''], default: '' };

// Tek kayıt üzerinden dinamik izleme formu: bölümler A ve 1-6 birim tarafından, 7 komisyon, 8 izleme, 9 iç kontrol tarafından doldurulur.
const RiskFormSchema = new Schema(
    {
        createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },

        // A. Birim ve süreç
        birim: { ...str(200) },
        altBirim: { ...str(200) },
        surec: { ...str(200) },
        surecSorumlusu: { ...str(200) },

        // 1. Risk tanımlama
        riskBaslik: { ...str(200) },
        riskTanim: str(),
        riskNeden: str(),
        riskSonuc: str(),
        riskKategorileri: { type: [String], default: [] },
        riskKategoriDiger: str(200),

        // 2. Risk değerlendirme
        olasilik: num15,
        etki: num15,
        riskPuani: { type: Number, min: 1, max: 25 },
        puanGerekce: str(),

        // 3. Mevcut kontroller
        kontrolFaaliyet: str(),
        kontrolKanit: str(),
        kontrolYeterli: triple,

        // 4. Risk azaltma aksiyonu (kontrol "kısmen/hayır" ise)
        aksiyonOneri: str(),
        aksiyonFaaliyet: str(),
        aksiyonSorumlu: str(200),
        aksiyonHedefTarih: { type: Date },
        aksiyonKaynak: { type: [String], default: [] },
        aksiyonKaynakDiger: str(200),

        // 5. Değişim yönetişimi (karar "evet" ise)
        degisimGerekli: { type: String, enum: ['evet', 'hayir', ''], default: '' },
        degisim: {
            mevcutDurum: str(),
            onerilenDegisim: str(),
            turler: { type: [String], default: [] },
            turDiger: str(200),
            gerekce: str(),
            fayda: str(),
            yapilmazsa: str(),
            etkilenenBirimler: { type: [String], default: [] },
            kaynak: { type: String, enum: ['yok', 'var', ''], default: '' },
            kaynakAciklama: str(),
            ustYonetimKarari: { type: String, enum: ['evet', 'hayir', ''], default: '' },
            sorumlu: str(200),
            hedefTarih: { type: Date }
        },

        // 6. Risk gerçekleşirse eylem planı
        eylemIlkIslem: str(),
        eylemSorumlu: str(200),
        eylemBildirimMakam: str(200),
        eylemAlternatif: str(),

        // 7. Komisyon değerlendirmesi
        komisyon: {
            riskTanimi: { type: String, enum: ['uygun', 'revizyon', ''], default: '' },
            birimPuanlama: { type: String, enum: ['uygun', 'revize', ''], default: '' },
            nihaiOlasilik: num15,
            nihaiEtki: num15,
            nihaiPuan: { type: Number, min: 1, max: 25 },
            kararlar: { type: [String], default: [] },
            aciklama: str(),
            degerlendiren: { type: Schema.Types.ObjectId, ref: 'User' },
            degerlendirmeTarihi: { type: Date }
        },

        // 8. İzleme ve güncel durum
        izleme: {
            guncelDurum: { type: String, default: 'Yeni' },
            aksiyonGerceklesti: triple,
            kanit: str(),
            guncelOlasilik: num15,
            guncelEtki: num15,
            guncelPuan: { type: Number, min: 1, max: 25 },
            not: str(),
            guncelleyen: { type: Schema.Types.ObjectId, ref: 'User' },
            guncellemeTarihi: { type: Date }
        },

        // 9. İç kontrol değerlendirmesi (risk temelli)
        icKontrol: {
            uygulaniyor: triple,
            uygulaniyorAciklama: str(),
            kanitYeterli: triple,
            etkili: { type: String, enum: ['etkili', 'kismen', 'etkisiz', ''], default: '' },
            faaliyetRaporuUyum: { type: String, enum: ['uyumlu', 'uyumsuz', 'ilgisiz', ''], default: '' },
            yeniRisk: { type: String, enum: ['evet', 'hayir', ''], default: '' },
            bulgu: str(),
            oneri: str(),
            sonuc: { type: String, default: '' },
            degerlendiren: { type: Schema.Types.ObjectId, ref: 'User' },
            degerlendirmeTarihi: { type: Date }
        }
    },
    { timestamps: true }
);

RiskFormSchema.index({ createdBy: 1, createdAt: -1 });

export type RiskFormId = Types.ObjectId;

const RiskForm = models.RiskForm || model('RiskForm', RiskFormSchema);

export default RiskForm;
