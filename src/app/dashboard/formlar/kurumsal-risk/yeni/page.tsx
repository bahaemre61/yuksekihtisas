'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import RiskFormMain, { emptyMain, type MainValues } from '@/src/components/risk/RiskFormMain';

export default function YeniRiskKaydiPage() {
    const router = useRouter();
    const [name, setName] = useState('');
    const today = new Date().toLocaleDateString('tr-TR');

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            try {
                const res = await axios.get('/api/me');
                if (!cancelled) setName(res.data?.name || '');
            } catch {
                // isim alınamazsa boş kalır
            }
        };
        load();
        return () => { cancelled = true; };
    }, []);

    const handleSubmit = async (values: MainValues): Promise<string | void> => {
        try {
            const res = await axios.post('/api/risk-forms', values);
            router.push(`/dashboard/formlar/kurumsal-risk/${res.data.id}`);
        } catch (err) {
            return axios.isAxiosError(err) ? err.response?.data?.msg || 'Kayıt oluşturulamadı.' : 'Kayıt oluşturulamadı.';
        }
    };

    return (
        <div className="mx-auto max-w-4xl space-y-5 p-4 sm:p-6">
            <Link href="/dashboard/formlar/kurumsal-risk" className="inline-flex items-center gap-1.5 text-sm font-medium text-base-content/60 hover:text-base-content">
                <ArrowLeftIcon className="h-4 w-4" /> Risk kayıtları
            </Link>
            <div>
                <h1 className="text-2xl font-bold text-base-content">Yeni Risk Kaydı</h1>
                <p className="mt-1 text-sm text-base-content/60">Alanlar verdiğiniz cevaplara göre dinamik olarak açılır. Komisyon, izleme ve iç kontrol bölümleri kayıt oluşturulduktan sonra doldurulur.</p>
            </div>
            <RiskFormMain initial={emptyMain()} filledBy={name} dateLabel={today} submitLabel="Risk Kaydını Oluştur" onSubmit={handleSubmit} />
        </div>
    );
}
