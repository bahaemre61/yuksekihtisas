'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { ArrowLeftIcon, ArrowUpTrayIcon, CheckCircleIcon, PlayIcon } from '@heroicons/react/24/outline';

interface IFieldDoc { name: string; required: boolean; description: string }
interface IImportType { key: string; label: string; description: string; fields: IFieldDoc[]; example: Record<string, unknown>[] }
type RowStatus = 'will_create' | 'created' | 'skipped' | 'error';
interface IRowResult { index: number; label: string; status: RowStatus; message?: string }
interface IReport {
    type: string;
    dryRun: boolean;
    aborted: boolean;
    summary: { total: number; willCreate: number; created: number; skipped: number; errors: number };
    rows: IRowResult[];
}

const STATUS_UI: Record<RowStatus, { label: string; cls: string }> = {
    will_create: { label: 'Eklenecek', cls: 'bg-info/10 text-info' },
    created: { label: 'Eklendi', cls: 'bg-success/10 text-success' },
    skipped: { label: 'Atlandı', cls: 'bg-base-200 text-base-content/60' },
    error: { label: 'Hata', cls: 'bg-error/10 text-error' }
};

const getErrorMsg = (err: unknown, fallback: string) =>
    (axios.isAxiosError(err) ? err.response?.data?.msg : undefined) || fallback;

export default function BulkImportPage() {
    const [types, setTypes] = useState<IImportType[]>([]);
    const [maxRows, setMaxRows] = useState(2000);
    const [loadError, setLoadError] = useState('');
    const [typeKey, setTypeKey] = useState('');
    const [text, setText] = useState('');
    const [fileName, setFileName] = useState('');
    const [skipInvalid, setSkipInvalid] = useState(false);
    const [busy, setBusy] = useState<'' | 'dry' | 'run'>('');
    const [error, setError] = useState('');
    const [report, setReport] = useState<IReport | null>(null);
    // Kuru çalıştırması yapılmış içeriğin imzası: içerik/ayar değişirse gerçek aktarım kilitlenir
    const [validatedSig, setValidatedSig] = useState('');
    const fileRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            try {
                const res = await axios.get('/api/admin/bulk-import');
                if (cancelled) return;
                setTypes(res.data.types);
                setMaxRows(res.data.maxRows);
                setTypeKey(res.data.types[0]?.key || '');
            } catch (err) {
                if (!cancelled) setLoadError(getErrorMsg(err, 'Veri tipleri yüklenemedi.'));
            }
        };
        load();
        return () => { cancelled = true; };
    }, []);

    const current = types.find((t) => t.key === typeKey);
    const signature = `${typeKey}\u0000${skipInvalid}\u0000${text}`;

    // JSON'u çöz: dizi ya da { type, rows } biçimi
    const parsed = useMemo(() => {
        if (!text.trim()) return null;
        try {
            const json = JSON.parse(text);
            if (Array.isArray(json)) return { rows: json as unknown[] };
            if (json && typeof json === 'object') {
                const rows = json.rows ?? json.data ?? json.items;
                if (Array.isArray(rows)) {
                    return { rows: rows as unknown[], type: typeof json.type === 'string' ? (json.type as string) : undefined };
                }
            }
            return { error: 'JSON bir dizi olmalı ya da {"type": "...", "rows": [...]} biçiminde olmalı.' };
        } catch (e) {
            return { error: `Geçersiz JSON: ${(e as Error).message}` };
        }
    }, [text]);

    const parseError = parsed && 'error' in parsed ? parsed.error : '';
    const rows = parsed && 'rows' in parsed ? parsed.rows : null;
    const fileType = parsed && 'type' in parsed ? parsed.type : undefined;

    const resetResult = () => { setReport(null); setError(''); };

    const onFile = async (file?: File) => {
        if (!file) return;
        resetResult();
        const content = await file.text();
        setFileName(file.name);
        setText(content);
        try {
            const json = JSON.parse(content);
            if (json?.type && types.some((t) => t.key === json.type)) setTypeKey(json.type);
        } catch {
            // hata, parsed üzerinden gösterilir
        }
        if (fileRef.current) fileRef.current.value = '';
    };

    const loadExample = () => {
        if (!current) return;
        resetResult();
        setFileName('');
        setText(JSON.stringify({ type: current.key, rows: current.example }, null, 2));
    };

    const submit = async (dryRun: boolean) => {
        if (!rows || !current) return;
        if (!dryRun && !window.confirm(`${rows.length} satır "${current.label}" olarak veritabanına yazılacak. Devam edilsin mi?`)) return;
        setBusy(dryRun ? 'dry' : 'run');
        setError('');
        try {
            const res = await axios.post('/api/admin/bulk-import', { type: current.key, rows, dryRun, skipInvalid });
            setReport(res.data);
            setValidatedSig(dryRun ? signature : '');
        } catch (err) {
            setReport(null);
            setError(getErrorMsg(err, 'İşlem başarısız oldu.'));
        } finally {
            setBusy('');
        }
    };

    const canRun = !!rows && rows.length > 0 && validatedSig === signature && !busy
        && !!report?.dryRun && report.summary.willCreate > 0 && (report.summary.errors === 0 || skipInvalid);

    return (
        <div className="mx-auto max-w-5xl p-6">
            <Link href="/dashboard/admin" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-base-content/60 hover:text-base-content">
                <ArrowLeftIcon className="h-4 w-4" /> Yönetim Paneli
            </Link>
            <h1 className="text-2xl font-bold text-base-content">Toplu Veri Aktarımı</h1>
            <p className="mt-1 text-sm text-base-content/60">
                Topladığınız JSON verisini yükleyin, önce kuru çalıştırma ile kontrol edin, sonra veritabanına aktarın. Kuru çalıştırma hiçbir şey yazmaz.
            </p>

            {loadError && <p className="mt-6 rounded-lg bg-error/10 p-4 text-sm font-medium text-error" role="alert">{loadError}</p>}

            {current && (
                <div className="mt-6 space-y-6">
                    {/* 1. Veri tipi */}
                    <section className="rounded-xl border border-base-200 bg-base-100 p-5">
                        <h2 className="text-sm font-semibold text-base-content">1. Ne aktarılacak?</h2>
                        <div className="mt-3 flex flex-wrap gap-2">
                            {types.map((t) => (
                                <button
                                    key={t.key}
                                    type="button"
                                    onClick={() => { setTypeKey(t.key); resetResult(); }}
                                    className={`h-9 rounded-lg px-4 text-sm font-medium transition-colors ${
                                        t.key === typeKey ? 'bg-primary text-primary-content' : 'bg-base-200 text-base-content/70 hover:bg-base-300'
                                    }`}
                                >
                                    {t.label}
                                </button>
                            ))}
                        </div>
                        <p className="mt-3 text-sm text-base-content/60">{current.description}</p>

                        <div className="mt-4 overflow-x-auto rounded-lg border border-base-200">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-base-200/60 text-xs uppercase text-base-content/60">
                                    <tr><th className="px-3 py-2">Alan</th><th className="px-3 py-2">Zorunlu</th><th className="px-3 py-2">Açıklama</th></tr>
                                </thead>
                                <tbody>
                                    {current.fields.map((f) => (
                                        <tr key={f.name} className="border-t border-base-200">
                                            <td className="px-3 py-2 font-mono text-xs">{f.name}</td>
                                            <td className="px-3 py-2">{f.required ? 'Evet' : 'Hayır'}</td>
                                            <td className="px-3 py-2 text-base-content/70">{f.description}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <button type="button" onClick={loadExample} className="mt-3 text-sm font-medium text-primary hover:underline">
                            Örnek JSON&apos;u editöre yükle
                        </button>
                    </section>

                    {/* 2. JSON */}
                    <section className="rounded-xl border border-base-200 bg-base-100 p-5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <h2 className="text-sm font-semibold text-base-content">2. JSON verisi</h2>
                            <div className="flex items-center gap-2">
                                {fileName && <span className="text-xs text-base-content/50">{fileName}</span>}
                                <input ref={fileRef} type="file" accept=".json,application/json" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
                                <button
                                    type="button"
                                    onClick={() => fileRef.current?.click()}
                                    className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-base-content/70 ring-1 ring-inset ring-base-300 hover:bg-base-200"
                                >
                                    <ArrowUpTrayIcon className="h-4 w-4" /> .json dosyası seç
                                </button>
                            </div>
                        </div>
                        <textarea
                            value={text}
                            onChange={(e) => { setText(e.target.value); setFileName(''); resetResult(); }}
                            spellCheck={false}
                            rows={12}
                            placeholder='[ { "name": "..." }, ... ]   veya   { "type": "kullanicilar", "rows": [ ... ] }'
                            className="mt-3 w-full rounded-lg border border-base-300 bg-base-100 px-3 py-2.5 font-mono text-xs text-base-content placeholder:text-base-content/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
                        />
                        {parseError && <p className="mt-2 text-sm font-medium text-error" role="alert">{parseError}</p>}
                        {rows && <p className="mt-2 text-sm text-base-content/60">{rows.length} satır okundu (en fazla {maxRows}).</p>}
                        {fileType && fileType !== typeKey && (
                            <p className="mt-2 text-sm font-medium text-warning">
                                Dosyadaki tip (&quot;{fileType}&quot;) seçili tipten farklı. Aktarım seçili tipe göre yapılır.
                            </p>
                        )}
                    </section>

                    {/* 3. Çalıştır */}
                    <section className="rounded-xl border border-base-200 bg-base-100 p-5">
                        <h2 className="text-sm font-semibold text-base-content">3. Kontrol et ve çalıştır</h2>
                        <label className="mt-3 flex items-start gap-2 text-sm text-base-content/70">
                            <input
                                type="checkbox"
                                checked={skipInvalid}
                                onChange={(e) => { setSkipInvalid(e.target.checked); resetResult(); }}
                                className="mt-0.5"
                            />
                            <span>
                                Hatalı satırları atla, geçerli olanları aktar{' '}
                                <span className="text-base-content/50">(kapalıyken tek bir hata bile varsa hiçbir şey yazılmaz)</span>
                            </span>
                        </label>
                        <div className="mt-4 flex flex-wrap gap-2">
                            <button
                                type="button"
                                onClick={() => submit(true)}
                                disabled={!rows || rows.length === 0 || !!busy}
                                className="inline-flex h-10 items-center gap-1.5 rounded-lg px-4 text-sm font-medium text-base-content ring-1 ring-inset ring-base-300 hover:bg-base-200 disabled:opacity-50"
                            >
                                <CheckCircleIcon className="h-4 w-4" /> {busy === 'dry' ? 'Kontrol ediliyor...' : 'Doğrula (kuru çalıştırma)'}
                            </button>
                            <button
                                type="button"
                                onClick={() => submit(false)}
                                disabled={!canRun}
                                title={canRun ? '' : 'Önce hata içermeyen bir kuru çalıştırma yapın'}
                                className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-primary px-5 text-sm font-medium text-primary-content hover:brightness-95 disabled:opacity-50"
                            >
                                <PlayIcon className="h-4 w-4" /> {busy === 'run' ? 'Aktarılıyor...' : 'Aktarımı çalıştır'}
                            </button>
                        </div>
                        {error && <p className="mt-3 text-sm font-medium text-error" role="alert">{error}</p>}
                    </section>

                    {/* Sonuç */}
                    {report && (
                        <section className="rounded-xl border border-base-200 bg-base-100 p-5">
                            <h2 className="text-sm font-semibold text-base-content">
                                {report.dryRun ? 'Kuru çalıştırma sonucu (hiçbir şey yazılmadı)' : 'Aktarım sonucu'}
                            </h2>
                            <div className="mt-3 flex flex-wrap gap-2 text-xs font-medium">
                                <span className="rounded-full bg-base-200 px-3 py-1">Toplam {report.summary.total}</span>
                                {report.dryRun
                                    ? <span className="rounded-full bg-info/10 px-3 py-1 text-info">Eklenecek {report.summary.willCreate}</span>
                                    : <span className="rounded-full bg-success/10 px-3 py-1 text-success">Eklendi {report.summary.created}</span>}
                                <span className="rounded-full bg-base-200 px-3 py-1 text-base-content/60">Atlandı {report.summary.skipped}</span>
                                <span className={`rounded-full px-3 py-1 ${report.summary.errors ? 'bg-error/10 text-error' : 'bg-base-200 text-base-content/60'}`}>
                                    Hata {report.summary.errors}
                                </span>
                            </div>
                            {report.aborted && (
                                <p className="mt-3 text-sm font-medium text-error">
                                    Hatalar olduğu için hiçbir şey yazılmadı. Satırları düzeltin ya da &quot;Hatalı satırları atla&quot; seçeneğini işaretleyin.
                                </p>
                            )}
                            {report.dryRun && report.summary.errors > 0 && !skipInvalid && (
                                <p className="mt-3 text-sm text-warning">Hatalar düzeltilmeden aktarım çalıştırılamaz.</p>
                            )}
                            <div className="mt-4 max-h-96 overflow-auto rounded-lg border border-base-200">
                                <table className="w-full text-left text-sm">
                                    <thead className="sticky top-0 bg-base-200 text-xs uppercase text-base-content/60">
                                        <tr><th className="px-3 py-2">#</th><th className="px-3 py-2">Kayıt</th><th className="px-3 py-2">Durum</th><th className="px-3 py-2">Not</th></tr>
                                    </thead>
                                    <tbody>
                                        {report.rows.map((r) => (
                                            <tr key={r.index} className="border-t border-base-200">
                                                <td className="px-3 py-2 text-base-content/50">{r.index + 1}</td>
                                                <td className="px-3 py-2">{r.label}</td>
                                                <td className="px-3 py-2">
                                                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_UI[r.status].cls}`}>{STATUS_UI[r.status].label}</span>
                                                </td>
                                                <td className="px-3 py-2 text-base-content/70">{r.message}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    )}
                </div>
            )}
        </div>
    );
}
