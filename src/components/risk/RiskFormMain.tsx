'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
    CHANGE_TYPES, RESOURCE_TYPES, RISK_CATEGORIES, UNIT_SUGGESTIONS
} from '@/src/lib/riskConfig';
import {
    CheckGroup, DateInput, Field, Notice, RadioGroup, ScoreSelect, ScoreSummary, Section,
    TRIPLE_OPTIONS, TextArea, TextInput, YES_NO_OPTIONS
} from './riskUi';

export interface MainValues {
    birim: string; altBirim: string; surec: string; surecSorumlusu: string;
    riskBaslik: string; riskTanim: string; riskNeden: string; riskSonuc: string;
    riskKategorileri: string[]; riskKategoriDiger: string;
    olasilik: string; etki: string; puanGerekce: string;
    kontrolFaaliyet: string; kontrolKanit: string; kontrolYeterli: string;
    aksiyonOneri: string; aksiyonFaaliyet: string; aksiyonSorumlu: string; aksiyonHedefTarih: string;
    aksiyonKaynak: string[]; aksiyonKaynakDiger: string;
    degisimGerekli: string;
    degisim: {
        mevcutDurum: string; onerilenDegisim: string; turler: string[]; turDiger: string; gerekce: string; fayda: string;
        yapilmazsa: string; etkilenenBirimler: string[]; kaynak: string; kaynakAciklama: string; ustYonetimKarari: string;
        sorumlu: string; hedefTarih: string;
    };
    eylemIlkIslem: string; eylemSorumlu: string; eylemBildirimMakam: string; eylemAlternatif: string;
}

export const emptyMain = (): MainValues => ({
    birim: '', altBirim: '', surec: '', surecSorumlusu: '',
    riskBaslik: '', riskTanim: '', riskNeden: '', riskSonuc: '', riskKategorileri: [], riskKategoriDiger: '',
    olasilik: '', etki: '', puanGerekce: '',
    kontrolFaaliyet: '', kontrolKanit: '', kontrolYeterli: '',
    aksiyonOneri: '', aksiyonFaaliyet: '', aksiyonSorumlu: '', aksiyonHedefTarih: '', aksiyonKaynak: [], aksiyonKaynakDiger: '',
    degisimGerekli: '',
    degisim: {
        mevcutDurum: '', onerilenDegisim: '', turler: [], turDiger: '', gerekce: '', fayda: '', yapilmazsa: '',
        etkilenenBirimler: [], kaynak: '', kaynakAciklama: '', ustYonetimKarari: '', sorumlu: '', hedefTarih: ''
    },
    eylemIlkIslem: '', eylemSorumlu: '', eylemBildirimMakam: '', eylemAlternatif: ''
});

const day = (v?: string | null) => (v ? String(v).slice(0, 10) : '');
const s = (v: unknown) => (typeof v === 'string' ? v : '');
const a = (v: unknown) => (Array.isArray(v) ? (v as string[]) : []);

// Sunucudan gelen kaydı form değerlerine çevirir
export function toMainValues(doc: Record<string, any>): MainValues { // eslint-disable-line @typescript-eslint/no-explicit-any
    const d = (doc.degisim || {}) as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
    return {
        birim: s(doc.birim), altBirim: s(doc.altBirim), surec: s(doc.surec), surecSorumlusu: s(doc.surecSorumlusu),
        riskBaslik: s(doc.riskBaslik), riskTanim: s(doc.riskTanim), riskNeden: s(doc.riskNeden), riskSonuc: s(doc.riskSonuc),
        riskKategorileri: a(doc.riskKategorileri), riskKategoriDiger: s(doc.riskKategoriDiger),
        olasilik: doc.olasilik ? String(doc.olasilik) : '', etki: doc.etki ? String(doc.etki) : '', puanGerekce: s(doc.puanGerekce),
        kontrolFaaliyet: s(doc.kontrolFaaliyet), kontrolKanit: s(doc.kontrolKanit), kontrolYeterli: s(doc.kontrolYeterli),
        aksiyonOneri: s(doc.aksiyonOneri), aksiyonFaaliyet: s(doc.aksiyonFaaliyet), aksiyonSorumlu: s(doc.aksiyonSorumlu),
        aksiyonHedefTarih: day(doc.aksiyonHedefTarih), aksiyonKaynak: a(doc.aksiyonKaynak), aksiyonKaynakDiger: s(doc.aksiyonKaynakDiger),
        degisimGerekli: s(doc.degisimGerekli),
        degisim: {
            mevcutDurum: s(d.mevcutDurum), onerilenDegisim: s(d.onerilenDegisim), turler: a(d.turler), turDiger: s(d.turDiger),
            gerekce: s(d.gerekce), fayda: s(d.fayda), yapilmazsa: s(d.yapilmazsa), etkilenenBirimler: a(d.etkilenenBirimler),
            kaynak: s(d.kaynak), kaynakAciklama: s(d.kaynakAciklama), ustYonetimKarari: s(d.ustYonetimKarari),
            sorumlu: s(d.sorumlu), hedefTarih: day(d.hedefTarih)
        },
        eylemIlkIslem: s(doc.eylemIlkIslem), eylemSorumlu: s(doc.eylemSorumlu),
        eylemBildirimMakam: s(doc.eylemBildirimMakam), eylemAlternatif: s(doc.eylemAlternatif)
    };
}

export default function RiskFormMain({
    initial, disabled = false, submitLabel, filledBy, dateLabel, onSubmit
}: {
    initial: MainValues;
    disabled?: boolean;
    submitLabel: string;
    filledBy: string;
    dateLabel: string;
    onSubmit: (values: MainValues) => Promise<string | void>;
}) {
    const [v, setV] = useState<MainValues>(initial);
    const [people, setPeople] = useState<string[]>([]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            try {
                const res = await axios.get('/api/risk-forms/people');
                if (!cancelled) setPeople(res.data?.data || []);
            } catch {
                // liste gelmezse elle yazılabilir
            }
        };
        load();
        return () => { cancelled = true; };
    }, []);

    const set = <K extends keyof MainValues>(key: K, value: MainValues[K]) => setV((p) => ({ ...p, [key]: value }));
    const setD = <K extends keyof MainValues['degisim']>(key: K, value: MainValues['degisim'][K]) =>
        setV((p) => ({ ...p, degisim: { ...p.degisim, [key]: value } }));

    const needsAction = v.kontrolYeterli === 'kismen' || v.kontrolYeterli === 'hayir';
    const needsChange = v.degisimGerekli === 'evet';

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (saving || disabled) return;
        setSaving(true);
        setError('');
        const msg = await onSubmit(v);
        if (msg) setError(msg);
        setSaving(false);
    };

    return (
        <form onSubmit={submit} className="space-y-5">
            <datalist id="risk-units">{UNIT_SUGGESTIONS.map((u) => <option key={u} value={u} />)}</datalist>
            <datalist id="risk-people">{people.map((p) => <option key={p} value={p} />)}</datalist>

            <Section no="A" title="Birim ve Süreç Bilgileri" tone="info">
                <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Birim" required><TextInput list="risk-units" value={v.birim} onChange={(x) => set('birim', x)} disabled={disabled} placeholder="Listeden seçin ya da yazın" /></Field>
                    <Field label="Alt Birim / Bölüm" hint="Varsa"><TextInput value={v.altBirim} onChange={(x) => set('altBirim', x)} disabled={disabled} /></Field>
                    <Field label="İş Akışı / Süreç" hint="Elle yazın"><TextInput value={v.surec} onChange={(x) => set('surec', x)} disabled={disabled} placeholder="Örn: Araç talebi onay süreci" /></Field>
                    <Field label="Süreç Sorumlusu" hint="Kişi listesinden seçin ya da birim adı yazın"><TextInput list="risk-people" value={v.surecSorumlusu} onChange={(x) => set('surecSorumlusu', x)} disabled={disabled} /></Field>
                    <Field label="Formu Dolduran"><input className="w-full rounded-lg border border-base-300 bg-base-200/60 px-3 py-2.5 text-sm" value={filledBy} disabled readOnly /></Field>
                    <Field label="Tarih"><input className="w-full rounded-lg border border-base-300 bg-base-200/60 px-3 py-2.5 text-sm" value={dateLabel} disabled readOnly /></Field>
                </div>
            </Section>

            <Section no="1" title="Risk Tanımlama" hint="Ne ters gidebilir? Neden olabilir? Gerçekleşirse ne sonuç doğurur?" tone="primary">
                <Field label="Risk Başlığı" required><TextInput value={v.riskBaslik} onChange={(x) => set('riskBaslik', x)} disabled={disabled} placeholder="Kısa ve anlaşılır risk adı" /></Field>
                <Field label="Risk Tanımı" required hint="“... nedeniyle ... yaşanması ve bunun sonucunda ... oluşması riski.”"><TextArea value={v.riskTanim} onChange={(x) => set('riskTanim', x)} disabled={disabled} /></Field>
                <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Riskin Nedeni / Kaynağı" required><TextArea value={v.riskNeden} onChange={(x) => set('riskNeden', x)} disabled={disabled} placeholder="Riskin ortaya çıkmasına yol açabilecek nedenler" /></Field>
                    <Field label="Riskin Olası Sonucu" required><TextArea value={v.riskSonuc} onChange={(x) => set('riskSonuc', x)} disabled={disabled} placeholder="Kurum, birim, öğrenci, personel, mali yapı, itibar vb. üzerindeki etkiler" /></Field>
                </div>
                <Field label="Risk Kategorisi" required>
                    <CheckGroup value={v.riskKategorileri} onChange={(x) => set('riskKategorileri', x)} options={RISK_CATEGORIES} disabled={disabled} />
                    {v.riskKategorileri.includes('Diğer') && (
                        <div className="mt-2"><TextInput value={v.riskKategoriDiger} onChange={(x) => set('riskKategoriDiger', x)} disabled={disabled} placeholder="Diğer kategori" /></div>
                    )}
                </Field>
            </Section>

            <Section no="2" title="Risk Değerlendirme (Olasılık × Etki)" tone="warning">
                <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Olasılık (1-5)" required><ScoreSelect value={v.olasilik} onChange={(x) => set('olasilik', x)} disabled={disabled} /></Field>
                    <Field label="Etki (1-5)" required><ScoreSelect value={v.etki} onChange={(x) => set('etki', x)} disabled={disabled} /></Field>
                </div>
                <ScoreSummary olasilik={v.olasilik} etki={v.etki} />
                <Field label="Puanlama Gerekçesi" required hint="Neden bu olasılık ve etki puanını verdiniz?"><TextArea value={v.puanGerekce} onChange={(x) => set('puanGerekce', x)} disabled={disabled} /></Field>
                <p className="text-xs text-base-content/50">Önerilen eşikler: 1-4 Düşük · 5-9 Orta · 10-16 Yüksek · 17-25 Çok Yüksek</p>
            </Section>

            <Section no="3" title="Mevcut Kontroller" tone="success">
                <Field label="Mevcut Kontrol Faaliyeti"><TextArea value={v.kontrolFaaliyet} onChange={(x) => set('kontrolFaaliyet', x)} disabled={disabled} placeholder="Bu riskin gerçekleşmesini önlemek veya etkisini azaltmak için hâlihazırda ne yapılıyor?" /></Field>
                <Field label="Kontrolün Kanıtı"><TextArea rows={2} value={v.kontrolKanit} onChange={(x) => set('kontrolKanit', x)} disabled={disabled} placeholder="Kontrol listesi / sistem kaydı / prosedür / tutanak / rapor / diğer kanıt" /></Field>
                <Field label="Mevcut kontrol yeterli mi?" required><RadioGroup value={v.kontrolYeterli} onChange={(x) => set('kontrolYeterli', x)} options={TRIPLE_OPTIONS} disabled={disabled} /></Field>
                <Notice tone="info">“Kısmen” veya “Hayır” seçilirse 4. bölüm (Risk Azaltma Aksiyonu) açılır.</Notice>
            </Section>

            {needsAction && (
                <Section no="4" title="Risk Azaltma Aksiyonu" tone="error">
                    <Field label="Risk Azaltma Önerisi"><TextArea value={v.aksiyonOneri} onChange={(x) => set('aksiyonOneri', x)} disabled={disabled} placeholder="Riski azaltmak için önerilen yaklaşım" /></Field>
                    <Field label="Yapılacak Faaliyet / Aksiyon" required><TextArea value={v.aksiyonFaaliyet} onChange={(x) => set('aksiyonFaaliyet', x)} disabled={disabled} placeholder="Somut olarak ne yapılacak?" /></Field>
                    <div className="grid gap-4 md:grid-cols-2">
                        <Field label="Sorumlu Birim / Kişi"><TextInput list="risk-people" value={v.aksiyonSorumlu} onChange={(x) => set('aksiyonSorumlu', x)} disabled={disabled} /></Field>
                        <Field label="Hedef Tamamlanma Tarihi"><DateInput value={v.aksiyonHedefTarih} onChange={(x) => set('aksiyonHedefTarih', x)} disabled={disabled} /></Field>
                    </div>
                    <Field label="Kaynak Gerekiyor mu?">
                        <CheckGroup value={v.aksiyonKaynak} onChange={(x) => set('aksiyonKaynak', x)} options={RESOURCE_TYPES} disabled={disabled} />
                        {v.aksiyonKaynak.includes('Diğer') && <div className="mt-2"><TextInput value={v.aksiyonKaynakDiger} onChange={(x) => set('aksiyonKaynakDiger', x)} disabled={disabled} placeholder="Diğer kaynak" /></div>}
                    </Field>
                </Section>
            )}

            <Section no="5" title="Değişim Yönetişimi Karar Noktası" tone="secondary">
                <Field label="Değişim gerekiyor mu?" required><RadioGroup value={v.degisimGerekli} onChange={(x) => set('degisimGerekli', x)} options={YES_NO_OPTIONS} disabled={disabled} /></Field>
                <Notice tone="info">“Evet” seçilirse aşağıdaki Değişim Yönetişimi alanları açılır.</Notice>

                {needsChange && (
                    <div className="space-y-4 rounded-lg border border-secondary/30 bg-secondary/5 p-4">
                        <div className="grid gap-4 md:grid-cols-2">
                            <Field label="Mevcut Durum"><TextArea value={v.degisim.mevcutDurum} onChange={(x) => setD('mevcutDurum', x)} disabled={disabled} placeholder="Şu anda süreç nasıl yürütülüyor?" /></Field>
                            <Field label="Önerilen Değişim" required><TextArea value={v.degisim.onerilenDegisim} onChange={(x) => setD('onerilenDegisim', x)} disabled={disabled} placeholder="Ne değiştirilmek isteniyor?" /></Field>
                        </div>
                        <Field label="Değişim Türü">
                            <CheckGroup value={v.degisim.turler} onChange={(x) => setD('turler', x)} options={CHANGE_TYPES} disabled={disabled} />
                            {v.degisim.turler.includes('Diğer') && <div className="mt-2"><TextInput value={v.degisim.turDiger} onChange={(x) => setD('turDiger', x)} disabled={disabled} placeholder="Diğer değişim türü" /></div>}
                        </Field>
                        <div className="grid gap-4 md:grid-cols-3">
                            <Field label="Değişimin Gerekçesi"><TextArea value={v.degisim.gerekce} onChange={(x) => setD('gerekce', x)} disabled={disabled} placeholder="Neden gerekli?" /></Field>
                            <Field label="Beklenen Fayda"><TextArea value={v.degisim.fayda} onChange={(x) => setD('fayda', x)} disabled={disabled} placeholder="Değişiklik yapılırsa ne iyileşecek?" /></Field>
                            <Field label="Değişiklik Yapılmazsa"><TextArea value={v.degisim.yapilmazsa} onChange={(x) => setD('yapilmazsa', x)} disabled={disabled} placeholder="Mevcut risk/sorun nasıl devam eder?" /></Field>
                        </div>
                        <Field label="Etkilenecek Birimler" hint="Birden fazla seçilebilir">
                            <CheckGroup value={v.degisim.etkilenenBirimler} onChange={(x) => setD('etkilenenBirimler', x)} options={UNIT_SUGGESTIONS} disabled={disabled} />
                        </Field>
                        <div className="grid gap-4 md:grid-cols-2">
                            <Field label="Kaynak İhtiyacı">
                                <RadioGroup value={v.degisim.kaynak} onChange={(x) => setD('kaynak', x)} options={[{ value: 'yok', label: 'Yok' }, { value: 'var', label: 'Var' }]} disabled={disabled} />
                                {v.degisim.kaynak === 'var' && <div className="mt-2"><TextArea rows={2} value={v.degisim.kaynakAciklama} onChange={(x) => setD('kaynakAciklama', x)} disabled={disabled} placeholder="Açıklayınız" /></div>}
                            </Field>
                            <Field label="Üst Yönetim Kararı Gerekiyor mu?"><RadioGroup value={v.degisim.ustYonetimKarari} onChange={(x) => setD('ustYonetimKarari', x)} options={YES_NO_OPTIONS} disabled={disabled} /></Field>
                            <Field label="Sorumlu Birim / Kişi"><TextInput list="risk-people" value={v.degisim.sorumlu} onChange={(x) => setD('sorumlu', x)} disabled={disabled} /></Field>
                            <Field label="Hedef Tamamlanma Tarihi"><DateInput value={v.degisim.hedefTarih} onChange={(x) => setD('hedefTarih', x)} disabled={disabled} /></Field>
                        </div>
                    </div>
                )}
            </Section>

            <Section no="6" title="Risk Gerçekleşirse Eylem Planı" tone="warning">
                <Field label="İlk Yapılacak İşlem" required><TextArea value={v.eylemIlkIslem} onChange={(x) => set('eylemIlkIslem', x)} disabled={disabled} placeholder="Risk gerçekleştiğinde ilk hangi işlem yapılacak?" /></Field>
                <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Sorumlu Birim / Kişi" required><TextInput list="risk-people" value={v.eylemSorumlu} onChange={(x) => set('eylemSorumlu', x)} disabled={disabled} /></Field>
                    <Field label="Bildirim Yapılacak Makam" required><TextInput list="risk-units" value={v.eylemBildirimMakam} onChange={(x) => set('eylemBildirimMakam', x)} disabled={disabled} /></Field>
                </div>
                <Field label="Alternatif / Süreklilik Yöntemi"><TextArea value={v.eylemAlternatif} onChange={(x) => set('eylemAlternatif', x)} disabled={disabled} placeholder="Faaliyetin devamı nasıl sağlanacak?" /></Field>
            </Section>

            {error && <p className="rounded-lg bg-error/10 p-3 text-sm font-medium text-error" role="alert">{error}</p>}

            {!disabled && (
                <div className="flex justify-end">
                    <button type="submit" disabled={saving} className="h-11 rounded-lg bg-primary px-6 text-sm font-semibold text-primary-content hover:brightness-95 disabled:opacity-50">
                        {saving ? 'Kaydediliyor...' : submitLabel}
                    </button>
                </div>
            )}
        </form>
    );
}
