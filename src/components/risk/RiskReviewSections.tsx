'use client';

import React, { useState } from 'react';
import axios from 'axios';
import { COMMISSION_DECISIONS, CURRENT_STATUSES, INTERNAL_CONTROL_RESULTS } from '@/src/lib/riskConfig';
import {
    CheckGroup, Field, RadioGroup, RiskBadge, ScoreSelect, ScoreSummary, Section, SelectInput,
    TRIPLE_OPTIONS, TextArea, YES_NO_OPTIONS
} from './riskUi';

export interface RiskPermissions {
    editMain: boolean;
    editKomisyon: boolean;
    editIzleme: boolean;
    editIcKontrol: boolean;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
type Doc = Record<string, any>;

const s = (v: unknown) => (typeof v === 'string' ? v : '');
const n = (v: unknown) => (v ? String(v) : '');
const fmt = (d?: string) => (d ? new Date(d).toLocaleString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '');

function SaveBar({ canEdit, saving, error, saved, by, at }: { canEdit: boolean; saving: boolean; error: string; saved: boolean; by?: string; at?: string }) {
    return (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-base-200 pt-4">
            <p className="text-xs text-base-content/50">{by && at ? `Son güncelleme: ${by} · ${fmt(at)}` : canEdit ? '' : 'Bu bölüm yalnızca yetkili kişiler tarafından doldurulur.'}</p>
            <div className="flex items-center gap-3">
                {error && <span className="text-sm font-medium text-error" role="alert">{error}</span>}
                {saved && <span className="text-sm font-medium text-success">Kaydedildi</span>}
                {canEdit && (
                    <button type="submit" disabled={saving} className="h-10 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-content hover:brightness-95 disabled:opacity-50">
                        {saving ? 'Kaydediliyor...' : 'Kaydet'}
                    </button>
                )}
            </div>
        </div>
    );
}

function useSectionSave(id: string, section: string, onSaved: () => void) {
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [saved, setSaved] = useState(false);

    const save = async (data: Record<string, unknown>) => {
        setSaving(true);
        setError('');
        setSaved(false);
        try {
            await axios.put(`/api/risk-forms/${id}`, { section, data });
            setSaved(true);
            onSaved();
        } catch (err) {
            setError(axios.isAxiosError(err) ? err.response?.data?.msg || 'Kaydedilemedi.' : 'Kaydedilemedi.');
        } finally {
            setSaving(false);
        }
    };
    return { saving, error, saved, save };
}

function Komisyon({ id, doc, canEdit, onSaved }: { id: string; doc: Doc; canEdit: boolean; onSaved: () => void }) {
    const k = doc.komisyon || {};
    const [riskTanimi, setRiskTanimi] = useState(s(k.riskTanimi));
    const [birimPuanlama, setBirimPuanlama] = useState(s(k.birimPuanlama));
    const [olasilik, setOlasilik] = useState(n(k.nihaiOlasilik));
    const [etki, setEtki] = useState(n(k.nihaiEtki));
    const [kararlar, setKararlar] = useState<string[]>(k.kararlar || []);
    const [aciklama, setAciklama] = useState(s(k.aciklama));
    const { saving, error, saved, save } = useSectionSave(id, 'komisyon', onSaved);

    return (
        <form onSubmit={(e) => { e.preventDefault(); save({ riskTanimi, birimPuanlama, nihaiOlasilik: olasilik, nihaiEtki: etki, kararlar, aciklama }); }}>
            <Section no="7" title="Komisyon Değerlendirmesi" tone="info">
                <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Risk Tanımı" required><RadioGroup value={riskTanimi} onChange={setRiskTanimi} disabled={!canEdit} options={[{ value: 'uygun', label: 'Uygun' }, { value: 'revizyon', label: 'Revizyon Gerekli' }]} /></Field>
                    <Field label="Birim Puanlaması" required><RadioGroup value={birimPuanlama} onChange={setBirimPuanlama} disabled={!canEdit} options={[{ value: 'uygun', label: 'Uygun' }, { value: 'revize', label: 'Revize Edildi' }]} /></Field>
                    <Field label="Nihai Olasılık" required><ScoreSelect value={olasilik} onChange={setOlasilik} disabled={!canEdit} /></Field>
                    <Field label="Nihai Etki" required><ScoreSelect value={etki} onChange={setEtki} disabled={!canEdit} /></Field>
                </div>
                <ScoreSummary olasilik={olasilik} etki={etki} />
                <Field label="Komisyon Kararı" required><CheckGroup value={kararlar} onChange={setKararlar} options={COMMISSION_DECISIONS} disabled={!canEdit} /></Field>
                <Field label="Komisyon Açıklaması" required hint="Karar gerekçesi / not"><TextArea value={aciklama} onChange={setAciklama} disabled={!canEdit} /></Field>
                <SaveBar canEdit={canEdit} saving={saving} error={error} saved={saved} by={k.degerlendiren?.name} at={k.degerlendirmeTarihi} />
            </Section>
        </form>
    );
}

function Izleme({ id, doc, canEdit, onSaved }: { id: string; doc: Doc; canEdit: boolean; onSaved: () => void }) {
    const z = doc.izleme || {};
    const [guncelDurum, setGuncelDurum] = useState(s(z.guncelDurum) || 'Yeni');
    const [gerceklesti, setGerceklesti] = useState(s(z.aksiyonGerceklesti));
    const [kanit, setKanit] = useState(s(z.kanit));
    const [olasilik, setOlasilik] = useState(n(z.guncelOlasilik));
    const [etki, setEtki] = useState(n(z.guncelEtki));
    const [not, setNot] = useState(s(z.not));
    const { saving, error, saved, save } = useSectionSave(id, 'izleme', onSaved);

    return (
        <form onSubmit={(e) => { e.preventDefault(); save({ guncelDurum, aksiyonGerceklesti: gerceklesti, kanit, guncelOlasilik: olasilik, guncelEtki: etki, not }); }}>
            <Section no="8" title="İzleme ve Güncel Durum" tone="success">
                <Field label="Riskin Güncel Durumu" required><SelectInput value={guncelDurum} onChange={setGuncelDurum} options={CURRENT_STATUSES} disabled={!canEdit} /></Field>
                <Field label="Aksiyon Gerçekleşti mi?" required><RadioGroup value={gerceklesti} onChange={setGerceklesti} options={TRIPLE_OPTIONS} disabled={!canEdit} /></Field>
                <Field label="Uygulama Kanıtı" required hint="Dosya bağlantısı, kayıt numarası veya açıklama"><TextArea rows={2} value={kanit} onChange={setKanit} disabled={!canEdit} /></Field>
                <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Güncel Olasılık" required><ScoreSelect value={olasilik} onChange={setOlasilik} disabled={!canEdit} /></Field>
                    <Field label="Güncel Etki" required><ScoreSelect value={etki} onChange={setEtki} disabled={!canEdit} /></Field>
                </div>
                <ScoreSummary olasilik={olasilik} etki={etki} />
                <Field label="İzleme Notu" required><TextArea value={not} onChange={setNot} disabled={!canEdit} /></Field>
                <SaveBar canEdit={canEdit} saving={saving} error={error} saved={saved} by={z.guncelleyen?.name} at={z.guncellemeTarihi} />
            </Section>
        </form>
    );
}

function IcKontrol({ id, doc, canEdit, onSaved }: { id: string; doc: Doc; canEdit: boolean; onSaved: () => void }) {
    const c = doc.icKontrol || {};
    const [uygulaniyor, setUygulaniyor] = useState(s(c.uygulaniyor));
    const [aciklama, setAciklama] = useState(s(c.uygulaniyorAciklama));
    const [kanitYeterli, setKanitYeterli] = useState(s(c.kanitYeterli));
    const [etkili, setEtkili] = useState(s(c.etkili));
    const [uyum, setUyum] = useState(s(c.faaliyetRaporuUyum));
    const [yeniRisk, setYeniRisk] = useState(s(c.yeniRisk));
    const [bulgu, setBulgu] = useState(s(c.bulgu));
    const [oneri, setOneri] = useState(s(c.oneri));
    const [sonuc, setSonuc] = useState(s(c.sonuc));
    const { saving, error, saved, save } = useSectionSave(id, 'icKontrol', onSaved);

    return (
        <form onSubmit={(e) => { e.preventDefault(); save({ uygulaniyor, uygulaniyorAciklama: aciklama, kanitYeterli, etkili, faaliyetRaporuUyum: uyum, yeniRisk, bulgu, oneri, sonuc }); }}>
            <Section no="9" title="İç Kontrol Değerlendirmesi (Risk Temelli)" tone="secondary">
                <Field label="Kontrol uygulanıyor mu?" required>
                    <RadioGroup value={uygulaniyor} onChange={setUygulaniyor} options={TRIPLE_OPTIONS} disabled={!canEdit} />
                    {uygulaniyor === 'kismen' && <div className="mt-2"><TextArea rows={2} value={aciklama} onChange={setAciklama} disabled={!canEdit} placeholder="“Kısmen” ise kısaca açıklayınız" /></div>}
                </Field>
                <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Kanıt yeterli mi?" required><RadioGroup value={kanitYeterli} onChange={setKanitYeterli} options={TRIPLE_OPTIONS} disabled={!canEdit} /></Field>
                    <Field label="Kontrol etkili mi?" required><RadioGroup value={etkili} onChange={setEtkili} disabled={!canEdit} options={[{ value: 'etkili', label: 'Etkili' }, { value: 'kismen', label: 'Kısmen Etkili' }, { value: 'etkisiz', label: 'Etkisiz' }]} /></Field>
                    <Field label="Birim Faaliyet Raporuyla Uyum" required><RadioGroup value={uyum} onChange={setUyum} disabled={!canEdit} options={[{ value: 'uyumlu', label: 'Uyumlu' }, { value: 'uyumsuz', label: 'Uyumlu Değil' }, { value: 'ilgisiz', label: 'İlgili Değil' }]} /></Field>
                    <Field label="Yeni Risk Tespit Edildi mi?" required><RadioGroup value={yeniRisk} onChange={setYeniRisk} options={YES_NO_OPTIONS} disabled={!canEdit} /></Field>
                </div>
                <Field label="İç Kontrol Bulgusu" required><TextArea value={bulgu} onChange={setBulgu} disabled={!canEdit} /></Field>
                <Field label="Öneri" required hint="İyileştirme önerisi"><TextArea value={oneri} onChange={setOneri} disabled={!canEdit} /></Field>
                <Field label="Sonuç" required><RadioGroup value={sonuc} onChange={setSonuc} options={INTERNAL_CONTROL_RESULTS.map((r) => ({ value: r, label: r }))} disabled={!canEdit} /></Field>
                <SaveBar canEdit={canEdit} saving={saving} error={error} saved={saved} by={c.degerlendiren?.name} at={c.degerlendirmeTarihi} />
            </Section>
        </form>
    );
}

export default function RiskReviewSections({ id, doc, permissions, onSaved }: { id: string; doc: Doc; permissions: RiskPermissions; onSaved: () => void }) {
    return (
        <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-base-200 bg-base-100 p-4 text-sm">
                <span className="font-semibold text-base-content">Birim puanı:</span> <RiskBadge score={doc.riskPuani} />
                {doc.komisyon?.nihaiPuan && <><span className="font-semibold text-base-content">Nihai:</span> <RiskBadge score={doc.komisyon.nihaiPuan} /></>}
                {doc.izleme?.guncelPuan && <><span className="font-semibold text-base-content">Güncel:</span> <RiskBadge score={doc.izleme.guncelPuan} /></>}
            </div>
            <Komisyon id={id} doc={doc} canEdit={permissions.editKomisyon} onSaved={onSaved} />
            <Izleme id={id} doc={doc} canEdit={permissions.editIzleme} onSaved={onSaved} />
            <IcKontrol id={id} doc={doc} canEdit={permissions.editIcKontrol} onSaved={onSaved} />
        </div>
    );
}
