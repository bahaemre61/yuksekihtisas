'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import axios from 'axios';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import RiskFormMain, { toMainValues, type MainValues } from '@/src/components/risk/RiskFormMain';
import RiskReviewSections, { type RiskPermissions } from '@/src/components/risk/RiskReviewSections';

/* eslint-disable @typescript-eslint/no-explicit-any */
export default function RiskKaydiDetayPage() {
    const { id } = useParams<{ id: string }>();
    const [doc, setDoc] = useState<Record<string, any> | null>(null);
    const [permissions, setPermissions] = useState<RiskPermissions | null>(null);
    const [error, setError] = useState('');
    const [mainSaved, setMainSaved] = useState(false);

    const load = useCallback(async () => {
        try {
            const res = await axios.get(`/api/risk-forms/${id}`);
            setDoc(res.data.data);
            setPermissions(res.data.permissions);
        } catch (err) {
            setError(axios.isAxiosError(err) ? err.response?.data?.msg || 'Kayıt yüklenemedi.' : 'Kayıt yüklenemedi.');
        }
    }, [id]);

    useEffect(() => {
        let cancelled = false;
        const run = async () => {
            if (!cancelled) await load();
        };
        run();
        return () => { cancelled = true; };
    }, [load]);

    const handleMainSave = async (values: MainValues): Promise<string | void> => {
        setMainSaved(false);
        try {
            await axios.put(`/api/risk-forms/${id}`, { section: 'main', data: values });
            setMainSaved(true);
            await load();
        } catch (err) {
            return axios.isAxiosError(err) ? err.response?.data?.msg || 'Kaydedilemedi.' : 'Kaydedilemedi.';
        }
    };

    return (
        <div className="mx-auto max-w-4xl space-y-5 p-4 sm:p-6">
            <Link href="/dashboard/formlar/kurumsal-risk" className="inline-flex items-center gap-1.5 text-sm font-medium text-base-content/60 hover:text-base-content">
                <ArrowLeftIcon className="h-4 w-4" /> Risk kayıtları
            </Link>

            {error && <p className="rounded-lg bg-error/10 p-4 text-sm font-medium text-error" role="alert">{error}</p>}
            {!doc && !error && <p className="py-16 text-center text-base-content/50">Yükleniyor...</p>}

            {doc && permissions && (
                <>
                    <div>
                        <h1 className="text-2xl font-bold text-base-content">{doc.riskBaslik}</h1>
                        <p className="mt-1 text-sm text-base-content/60">
                            {doc.birim} · {doc.surec} · {doc.createdBy?.name} · {new Date(doc.createdAt).toLocaleDateString('tr-TR')}
                        </p>
                    </div>

                    {mainSaved && <p className="rounded-lg bg-success/10 p-3 text-sm font-medium text-success">Birim bilgileri güncellendi.</p>}

                    <RiskFormMain
                        initial={toMainValues(doc)}
                        disabled={!permissions.editMain}
                        filledBy={doc.createdBy?.name || ''}
                        dateLabel={new Date(doc.createdAt).toLocaleDateString('tr-TR')}
                        submitLabel="Değişiklikleri Kaydet"
                        onSubmit={handleMainSave}
                    />

                    <RiskReviewSections id={String(id)} doc={doc} permissions={permissions} onSaved={load} />
                </>
            )}
        </div>
    );
}
