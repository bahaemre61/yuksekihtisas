import {
    CHANGE_TYPES, COMMISSION_DECISIONS, CURRENT_STATUSES, INTERNAL_CONTROL_RESULTS,
    RESOURCE_TYPES, RISK_CATEGORIES, riskScore
} from './riskConfig';

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => !!v && typeof v === 'object' && !Array.isArray(v);

const text = (v: unknown, max = 2000) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const oneOf = <T extends string>(v: unknown, allowed: readonly T[], fallback: T | '' = ''): T | '' =>
    typeof v === 'string' && (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
const list = (v: unknown, allowed?: readonly string[], max = 30): string[] =>
    Array.isArray(v)
        ? [...new Set(v.filter((x): x is string => typeof x === 'string').map((x) => x.trim()).filter((x) => x && (!allowed || allowed.includes(x))))].slice(0, max)
        : [];
const int15 = (v: unknown): number | undefined => {
    const n = Number(v);
    return Number.isInteger(n) && n >= 1 && n <= 5 ? n : undefined;
};
const date = (v: unknown): Date | undefined => {
    if (typeof v !== 'string' || !v) return undefined;
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? undefined : d;
};

const TRIPLE = ['evet', 'kismen', 'hayir'] as const;
const YES_NO = ['evet', 'hayir'] as const;

// A ve 1-6. bölümler (birimin doldurduğu kısım). Dinamik kurallar sunucuda da uygulanır.
export function sanitizeMain(raw: unknown): { data?: Obj; error?: string } {
    if (!isObj(raw)) return { error: 'Geçersiz veri.' };

    const olasilik = int15(raw.olasilik);
    const etki = int15(raw.etki);
    const kontrolYeterli = oneOf(raw.kontrolYeterli, TRIPLE);
    const degisimGerekli = oneOf(raw.degisimGerekli, YES_NO);
    const d = isObj(raw.degisim) ? raw.degisim : {};

    const data: Obj = {
        birim: text(raw.birim, 200),
        altBirim: text(raw.altBirim, 200),
        surec: text(raw.surec, 200),
        surecSorumlusu: text(raw.surecSorumlusu, 200),

        riskBaslik: text(raw.riskBaslik, 200),
        riskTanim: text(raw.riskTanim),
        riskNeden: text(raw.riskNeden),
        riskSonuc: text(raw.riskSonuc),
        riskKategorileri: list(raw.riskKategorileri, RISK_CATEGORIES),
        riskKategoriDiger: text(raw.riskKategoriDiger, 200),

        olasilik,
        etki,
        riskPuani: riskScore(olasilik, etki) ?? undefined,
        puanGerekce: text(raw.puanGerekce),

        kontrolFaaliyet: text(raw.kontrolFaaliyet),
        kontrolKanit: text(raw.kontrolKanit),
        kontrolYeterli,

        // 5. bölüm "evet" değilse alanlar temizlenir
        degisimGerekli
    };

    // 4. bölüm yalnızca kontrol "kısmen" / "hayır" ise
    const needsAction = kontrolYeterli === 'kismen' || kontrolYeterli === 'hayir';
    Object.assign(data, {
        aksiyonOneri: needsAction ? text(raw.aksiyonOneri) : '',
        aksiyonFaaliyet: needsAction ? text(raw.aksiyonFaaliyet) : '',
        aksiyonSorumlu: needsAction ? text(raw.aksiyonSorumlu, 200) : '',
        aksiyonHedefTarih: needsAction ? date(raw.aksiyonHedefTarih) ?? null : null,
        aksiyonKaynak: needsAction ? list(raw.aksiyonKaynak, RESOURCE_TYPES) : [],
        aksiyonKaynakDiger: needsAction ? text(raw.aksiyonKaynakDiger, 200) : ''
    });

    const change = degisimGerekli === 'evet';
    data.degisim = change
        ? {
            mevcutDurum: text(d.mevcutDurum),
            onerilenDegisim: text(d.onerilenDegisim),
            turler: list(d.turler, CHANGE_TYPES),
            turDiger: text(d.turDiger, 200),
            gerekce: text(d.gerekce),
            fayda: text(d.fayda),
            yapilmazsa: text(d.yapilmazsa),
            etkilenenBirimler: list(d.etkilenenBirimler),
            kaynak: oneOf(d.kaynak, ['yok', 'var'] as const),
            kaynakAciklama: text(d.kaynakAciklama),
            ustYonetimKarari: oneOf(d.ustYonetimKarari, YES_NO),
            sorumlu: text(d.sorumlu, 200),
            hedefTarih: date(d.hedefTarih) ?? null
        }
        : {
            mevcutDurum: '', onerilenDegisim: '', turler: [], turDiger: '', gerekce: '', fayda: '', yapilmazsa: '',
            etkilenenBirimler: [], kaynak: '', kaynakAciklama: '', ustYonetimKarari: '', sorumlu: '', hedefTarih: null
        };

    Object.assign(data, {
        eylemIlkIslem: text(raw.eylemIlkIslem),
        eylemSorumlu: text(raw.eylemSorumlu, 200),
        eylemBildirimMakam: text(raw.eylemBildirimMakam, 200),
        eylemAlternatif: text(raw.eylemAlternatif)
    });

    // Zorunlu alanlar
    const missing: string[] = [];
    if (!data.birim) missing.push('Birim');
    if (!data.riskBaslik) missing.push('Risk başlığı');
    if (!data.riskTanim) missing.push('Risk tanımı');
    if (!data.riskNeden) missing.push('Riskin nedeni / kaynağı');
    if (!data.riskSonuc) missing.push('Riskin olası sonucu');
    if ((data.riskKategorileri as string[]).length === 0) missing.push('Risk kategorisi');
    if ((data.riskKategorileri as string[]).includes('Diğer') && !data.riskKategoriDiger) missing.push('Diğer kategori açıklaması');
    if (!olasilik || !etki) missing.push('Olasılık ve etki puanı');
    if (!data.puanGerekce) missing.push('Puanlama gerekçesi');
    if (!kontrolYeterli) missing.push('Mevcut kontrol yeterli mi?');
    if (needsAction && !data.aksiyonFaaliyet) missing.push('Yapılacak faaliyet / aksiyon');
    if (!degisimGerekli) missing.push('Değişim gerekiyor mu?');
    if (change && !(data.degisim as Obj).onerilenDegisim) missing.push('Önerilen değişim');
    // 6. bölüm: alternatif / süreklilik yöntemi hariç hepsi zorunlu
    if (!data.eylemIlkIslem) missing.push('İlk yapılacak işlem');
    if (!data.eylemSorumlu) missing.push('Eylem planı sorumlusu');
    if (!data.eylemBildirimMakam) missing.push('Bildirim yapılacak makam');
    if (missing.length) return { error: `Zorunlu alanlar eksik: ${missing.join(', ')}` };

    return { data };
}

const missingError = (missing: string[]) => (missing.length ? { error: `Zorunlu alanlar eksik: ${missing.join(', ')}` } : null);

export function sanitizeKomisyon(raw: unknown): { data?: Obj; error?: string } {
    if (!isObj(raw)) return { error: 'Geçersiz veri.' };
    const nihaiOlasilik = int15(raw.nihaiOlasilik);
    const nihaiEtki = int15(raw.nihaiEtki);
    const miss: string[] = [];
    if (!oneOf(raw.riskTanimi, ['uygun', 'revizyon'] as const)) miss.push('Risk tanımı değerlendirmesi');
    if (!oneOf(raw.birimPuanlama, ['uygun', 'revize'] as const)) miss.push('Birim puanlaması');
    if (!nihaiOlasilik || !nihaiEtki) miss.push('Nihai olasılık ve etki');
    if (list(raw.kararlar, COMMISSION_DECISIONS).length === 0) miss.push('Komisyon kararı');
    if (!text(raw.aciklama)) miss.push('Komisyon açıklaması');
    const me = missingError(miss);
    if (me) return me;
    return {
        data: {
            'komisyon.riskTanimi': oneOf(raw.riskTanimi, ['uygun', 'revizyon'] as const),
            'komisyon.birimPuanlama': oneOf(raw.birimPuanlama, ['uygun', 'revize'] as const),
            'komisyon.nihaiOlasilik': nihaiOlasilik,
            'komisyon.nihaiEtki': nihaiEtki,
            'komisyon.nihaiPuan': riskScore(nihaiOlasilik, nihaiEtki) ?? undefined,
            'komisyon.kararlar': list(raw.kararlar, COMMISSION_DECISIONS),
            'komisyon.aciklama': text(raw.aciklama)
        }
    };
}

export function sanitizeIzleme(raw: unknown): { data?: Obj; error?: string } {
    if (!isObj(raw)) return { error: 'Geçersiz veri.' };
    const guncelOlasilik = int15(raw.guncelOlasilik);
    const guncelEtki = int15(raw.guncelEtki);
    const miss: string[] = [];
    if (!oneOf(raw.guncelDurum, CURRENT_STATUSES)) miss.push('Riskin güncel durumu');
    if (!oneOf(raw.aksiyonGerceklesti, TRIPLE)) miss.push('Aksiyon gerçekleşti mi?');
    if (!text(raw.kanit)) miss.push('Uygulama kanıtı');
    if (!guncelOlasilik || !guncelEtki) miss.push('Güncel olasılık ve etki');
    if (!text(raw.not)) miss.push('İzleme notu');
    const me = missingError(miss);
    if (me) return me;
    return {
        data: {
            'izleme.guncelDurum': oneOf(raw.guncelDurum, CURRENT_STATUSES, 'Yeni'),
            'izleme.aksiyonGerceklesti': oneOf(raw.aksiyonGerceklesti, TRIPLE),
            'izleme.kanit': text(raw.kanit),
            'izleme.guncelOlasilik': guncelOlasilik,
            'izleme.guncelEtki': guncelEtki,
            'izleme.guncelPuan': riskScore(guncelOlasilik, guncelEtki) ?? undefined,
            'izleme.not': text(raw.not)
        }
    };
}

export function sanitizeIcKontrol(raw: unknown): { data?: Obj; error?: string } {
    if (!isObj(raw)) return { error: 'Geçersiz veri.' };
    const uygulaniyor = oneOf(raw.uygulaniyor, TRIPLE);
    const miss: string[] = [];
    if (!uygulaniyor) miss.push('Kontrol uygulanıyor mu?');
    if (uygulaniyor === 'kismen' && !text(raw.uygulaniyorAciklama)) miss.push('“Kısmen” açıklaması');
    if (!oneOf(raw.kanitYeterli, TRIPLE)) miss.push('Kanıt yeterli mi?');
    if (!oneOf(raw.etkili, ['etkili', 'kismen', 'etkisiz'] as const)) miss.push('Kontrol etkili mi?');
    if (!oneOf(raw.faaliyetRaporuUyum, ['uyumlu', 'uyumsuz', 'ilgisiz'] as const)) miss.push('Faaliyet raporuyla uyum');
    if (!oneOf(raw.yeniRisk, YES_NO)) miss.push('Yeni risk tespit edildi mi?');
    if (!text(raw.bulgu)) miss.push('İç kontrol bulgusu');
    if (!text(raw.oneri)) miss.push('Öneri');
    if (!oneOf(raw.sonuc, INTERNAL_CONTROL_RESULTS)) miss.push('Sonuç');
    const me = missingError(miss);
    if (me) return me;
    return {
        data: {
            'icKontrol.uygulaniyor': uygulaniyor,
            'icKontrol.uygulaniyorAciklama': uygulaniyor === 'kismen' ? text(raw.uygulaniyorAciklama) : '',
            'icKontrol.kanitYeterli': oneOf(raw.kanitYeterli, TRIPLE),
            'icKontrol.etkili': oneOf(raw.etkili, ['etkili', 'kismen', 'etkisiz'] as const),
            'icKontrol.faaliyetRaporuUyum': oneOf(raw.faaliyetRaporuUyum, ['uyumlu', 'uyumsuz', 'ilgisiz'] as const),
            'icKontrol.yeniRisk': oneOf(raw.yeniRisk, YES_NO),
            'icKontrol.bulgu': text(raw.bulgu),
            'icKontrol.oneri': text(raw.oneri),
            'icKontrol.sonuc': oneOf(raw.sonuc, INTERNAL_CONTROL_RESULTS)
        }
    };
}
