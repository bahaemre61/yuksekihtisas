'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { PlusIcon, ShieldExclamationIcon } from '@heroicons/react/24/outline';
import { RiskBadge } from '@/src/components/risk/riskUi';

interface IRiskRow {
    _id: string;
    birim: string;
    surec: string;
    riskBaslik: string;
    riskPuani?: number;
    komisyon?: { nihaiPuan?: number };
    izleme?: { guncelDurum?: string; guncelPuan?: number };
    icKontrol?: { sonuc?: string };
    createdBy?: { name: string };
    createdAt: string;
}

export default function KurumsalRiskListPage() {
    const [rows, setRows] = useState<IRiskRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            try {
                const res = await axios.get('/api/risk-forms');
                if (!cancelled) setRows(res.data?.data || []);
            } catch {
                if (!cancelled) setError('Kayıtlar yüklenemedi.');
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        load();
        return () => { cancelled = true; };
    }, []);

    return (
        <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="flex items-center gap-2 text-2xl font-bold text-base-content">
                        <ShieldExclamationIcon className="h-7 w-7 text-primary" />
                        Kurumsal Risk, Değişim Yönetişimi ve İç Kontrol
                    </h1>
                    <p className="mt-1 text-sm text-base-content/60">Tek kayıt üzerinden risk, kontrol, aksiyon, değişim ve izleme süreci.</p>
                </div>
                <Link href="/dashboard/formlar/kurumsal-risk/yeni" className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-content hover:brightness-95">
                    <PlusIcon className="h-4 w-4" /> Yeni Risk Kaydı
                </Link>
            </div>

            {error && <p className="rounded-lg bg-error/10 p-3 text-sm font-medium text-error" role="alert">{error}</p>}

            <div className="overflow-x-auto rounded-xl border border-base-200 bg-base-100 shadow-sm">
                <table className="w-full text-left text-sm">
                    <thead className="bg-base-200/60 text-xs uppercase text-base-content/60">
                        <tr>
                            <th className="px-4 py-3">Risk</th>
                            <th className="px-4 py-3">Birim / Süreç</th>
                            <th className="px-4 py-3">Birim Puanı</th>
                            <th className="px-4 py-3">Nihai Puan</th>
                            <th className="px-4 py-3">Güncel Durum</th>
                            <th className="px-4 py-3">Tarih</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={6} className="px-4 py-10 text-center text-base-content/50">Yükleniyor...</td></tr>
                        ) : rows.length === 0 ? (
                            <tr><td colSpan={6} className="px-4 py-10 text-center text-base-content/50">Henüz risk kaydı yok.</td></tr>
                        ) : rows.map((r) => (
                            <tr key={r._id} className="border-t border-base-200 hover:bg-base-200/40">
                                <td className="px-4 py-3">
                                    <Link href={`/dashboard/formlar/kurumsal-risk/${r._id}`} className="font-semibold text-primary hover:underline">{r.riskBaslik}</Link>
                                    {r.createdBy?.name && <div className="text-xs text-base-content/50">{r.createdBy.name}</div>}
                                </td>
                                <td className="px-4 py-3"><div className="text-base-content">{r.birim}</div><div className="text-xs text-base-content/50">{r.surec}</div></td>
                                <td className="px-4 py-3"><RiskBadge score={r.riskPuani} /></td>
                                <td className="px-4 py-3"><RiskBadge score={r.komisyon?.nihaiPuan} /></td>
                                <td className="px-4 py-3">
                                    <span className="rounded-full bg-base-200 px-2.5 py-0.5 text-xs font-medium text-base-content/70">{r.izleme?.guncelDurum || 'Yeni'}</span>
                                </td>
                                <td className="px-4 py-3 text-xs text-base-content/60">{new Date(r.createdAt).toLocaleDateString('tr-TR')}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
