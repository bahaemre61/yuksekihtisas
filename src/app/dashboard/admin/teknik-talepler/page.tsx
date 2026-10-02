'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Link from 'next/link';
import {
    ArrowLeftIcon,
    FunnelIcon,
    EyeIcon,
    EyeSlashIcon
} from '@heroicons/react/24/outline';
import { Dialog } from '@headlessui/react';
import { RATING_START_DATE } from '@/src/lib/ratingConfig';
import StarRating, { RATING_LABELS } from '@/src/components/ui/StarRating';

enum RequestStatus {
    PENDING = 'pending',
    ASSIGNED = 'assigned',
    COMPLETED = 'completed',
    CANCELLED = 'cancelled',
}

const statusPriority: Record<string, number> = {
    [RequestStatus.PENDING]: 1,
    [RequestStatus.ASSIGNED]: 2,
    [RequestStatus.COMPLETED]: 3,
    [RequestStatus.CANCELLED]: 4,
};

interface ITechnicalRequest {
    _id: string;
    title: string;
    description: string;
    location: string;
    priority: 'LOW' | 'MEDIUM' | 'HIGH';
    status: RequestStatus;
    createdAt: string;
    user: { name: string; email: string };
    technicalStaff?: { _id: string; name: string }[];
    rating?: { score: number; comment?: string; ratedAt?: string };
    completedAt?: string | null;
}

export default function TechnicalAdminPage() {
    const [requests, setRequests] = useState<ITechnicalRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [showCancelled, setShowCancelled] = useState<boolean>(false);
    const [ratingView, setRatingView] = useState<ITechnicalRequest | null>(null);

    const fetchAllRequests = async () => {
        setLoading(true);
        try {
            // 🛠️ API çağrısına filtreleri ekliyoruz
            const res = await axios.get(`/api/admin/technical-requests?status=${filterStatus}&showCancelled=${showCancelled}`);

            // API'den gelen verinin formatını kontrol ederek alıyoruz
            const incomingData = Array.isArray(res.data) ? res.data : (res.data.data || []);

            const sortedData = [...incomingData].sort((a, b) => {
                return (statusPriority[a.status] || 99) - (statusPriority[b.status] || 99);
            });

            setRequests(sortedData);
        } catch (err) {
            console.error(err);
            alert("Veriler yüklenirken bir hata oluştu.");
        }
        setLoading(false);
    };

    // 🔄 Filtreler değiştiğinde veriyi tekrar çek
    useEffect(() => {
        fetchAllRequests();
    }, [filterStatus, showCancelled]);

    const handleUnassign = async (id: string) => {
        if (!confirm("Emin misiniz?")) return;

        try {
            const res = await axios.put(`/api/admin/technical-requests/${id}/unassign`);

            if (res.data.success) {
                fetchAllRequests();
            }
        } catch (err) {
            alert("Hata oluştu.");
        }
    };

    const handleCancel = async (id: string) => {
        if (!confirm("Bu talebi iptal etmek istediğinize emin misiniz?")) return;
        try {
            const res = await axios.put(`/api/admin/technical-requests/${id}/cancel`);
            if (res.data.success) {
                fetchAllRequests();
            }
        } catch (err) {
            alert("İptal işlemi başarısız.");
        }
    };

    const getPriorityLabel = (priority: string) => {
        return priority === 'HIGH' ? 'ACİL' : priority === 'LOW' ? 'DÜŞÜK' : 'NORMAL';
    };

    // Raporlama: Aktif filtreden bağımsız olarak TÜM talepleri Excel/CSV olarak indirir (iptal edilenler HARİÇ)
    const [exportingCsv, setExportingCsv] = useState(false);
    const handleExportAllCSV = async () => {
        setExportingCsv(true);
        try {
            const res = await axios.get('/api/admin/technical-requests?status=all&showCancelled=false');
            const incomingData = Array.isArray(res.data) ? res.data : (res.data.data || []);
            const allRequests: ITechnicalRequest[] = incomingData.filter((r: ITechnicalRequest) => r.status !== RequestStatus.CANCELLED);

            if (allRequests.length === 0) {
                alert('Dışa aktarılacak talep bulunamadı.');
                return;
            }

            const headers = ['Talep Eden', 'E-Posta', 'Arıza Başlığı', 'Açıklama', 'Konum', 'Öncelik', 'Tarih', 'Durum', 'Personel'];

            const rows = allRequests.map((req) => [
                req.user?.name || 'Bilinmiyor',
                req.user?.email || '',
                req.title,
                req.description,
                req.location,
                getPriorityLabel(req.priority),
                new Date(req.createdAt).toLocaleDateString('tr-TR'),
                req.status.toUpperCase(),
                req.technicalStaff && req.technicalStaff.length > 0 ? req.technicalStaff.map((s) => s.name).join(' / ') : 'Atanmadı'
            ].map((val) => `"${String(val).replace(/"/g, '""')}"`).join(','));

            const csvContent = '﻿' + [headers.join(','), ...rows].join('\n');
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.setAttribute('href', url);
            link.setAttribute('download', `Teknik_Talepler_Raporu_${new Date().toISOString().slice(0, 10)}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error(err);
            alert('Excel raporu oluşturulamadı.');
        } finally {
            setExportingCsv(false);
        }
    };

    const isPastDate = (dateString: string) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const reqDate = new Date(dateString);
        return reqDate < today;
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending': return 'bg-warning/20 text-warning border-warning/30';
            case 'assigned': return 'bg-info/20 text-info border-info/30';
            case 'completed': return 'bg-success/20 text-success border-success/30';
            case 'cancelled': return 'bg-error/20 text-error border-error/30';
            default: return 'bg-base-200 text-base-content border-base-300';
        }
    };

    return (
        <div className="bg-base-100 shadow-sm rounded-xl overflow-hidden border border-base-200">
            {/* 🔎 FİLTRELEME VE BAŞLIK ALANI */}
            <div className="px-6 py-4 border-b border-base-200 bg-base-200/50">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Link href="/dashboard/admin" className="p-2 hover:bg-base-200 rounded-full transition-colors">
                            <ArrowLeftIcon className="h-5 w-5 text-base-content/70" />
                        </Link>
                        <h2 className="text-xl font-bold text-base-content uppercase tracking-tight">Teknik Destek Yönetimi</h2>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        {/* Statü Filtresi */}
                        <div className="flex items-center gap-2 bg-base-100 border border-base-200 rounded-lg px-3 py-1.5 shadow-sm">
                            <FunnelIcon className="h-4 w-4 text-base-content/50" />
                            <select
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                                className="text-xs font-bold bg-transparent outline-none pr-4 cursor-pointer uppercase"
                            >
                                <option value="all">Tüm Durumlar</option>
                                <option value="pending">Beklemede</option>
                                <option value="assigned">Atandı</option>
                                <option value="completed">Tamamlandı</option>
                            </select>
                        </div>

                        {/* 👁️ İPTALLERİ GÖSTER/GİZLE BUTONU */}
                        <button
                            onClick={() => setShowCancelled(!showCancelled)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all border ${showCancelled
                                    ? 'bg-error/10 text-error border-error/30 shadow-inner'
                                    : 'bg-base-100 text-base-content/70 border-base-300 shadow-sm hover:bg-base-200'
                                }`}
                        >
                            {showCancelled ? <EyeIcon className="h-4 w-4" /> : <EyeSlashIcon className="h-4 w-4" />}
                            {showCancelled ? 'İptalleri Gizle' : 'İptalleri Göster'}
                        </button>

                        <button
                            onClick={handleExportAllCSV}
                            disabled={exportingCsv}
                            title="Filtreden bağımsız olarak tüm talepleri (iptaller HARİÇ) Excel/CSV olarak indir"
                            className="flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all border bg-base-100 text-base-content/70 border-base-300 shadow-sm hover:bg-base-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {exportingCsv ? 'Hazırlanıyor...' : "Tümünü Excel'e Aktar"}
                        </button>
                    </div>
                </div>
            </div>

            <div className="overflow-x-auto min-h-[400px]">
                {loading ? (
                    <div className="flex justify-center items-center py-20 text-base-content/40 animate-pulse font-bold uppercase text-xs">
                        Veriler yükleniyor...
                    </div>
                ) : (
                    <table className="min-w-full divide-y divide-base-200">
                        <thead className="bg-base-200/50">
                            <tr>
                                <th className="px-6 py-3 text-left text-[10px] font-black text-base-content/50 uppercase tracking-widest">Talep Eden</th>
                                <th className="px-6 py-3 text-left text-[10px] font-black text-base-content/50 uppercase tracking-widest">Arıza & Konum</th>
                                <th className="px-6 py-3 text-left text-[10px] font-black text-base-content/50 uppercase tracking-widest">Öncelik</th>
                                <th className="px-6 py-3 text-left text-[10px] font-black text-base-content/50 uppercase tracking-widest">Tarih</th>
                                <th className="px-6 py-3 text-left text-[10px] font-black text-base-content/50 uppercase tracking-widest">Durum</th>
                                <th className="px-6 py-3 text-left text-[10px] font-black text-base-content/50 uppercase tracking-widest">Personel</th>
                                <th className="px-6 py-3 text-right text-[10px] font-black text-base-content/50 uppercase tracking-widest">İşlemler</th>
                                <th className="px-6 py-3 text-right text-[10px] font-black text-base-content/50 uppercase tracking-widest">Değerlendirme</th>
                            </tr>
                        </thead>
                        <tbody className="bg-base-100 divide-y divide-base-200">
                            {requests.map((req) => (
                                <tr
                                    key={req._id}
                                    className={`hover:bg-base-200/50 transition-colors ${req.status === 'cancelled' ? 'opacity-50 grayscale-[0.5] bg-base-200/30' : ''}`}
                                >
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-bold text-base-content">{req.user?.name || 'Bilinmiyor'}</div>
                                        <div className="text-[10px] text-base-content/60">{req.user?.email}</div>
                                    </td>
                                    <td className="px-6 py-4 max-w-[300px]">
                                        <div className="text-sm text-base-content font-bold truncate" title={req.title}>{req.title}</div>
                                        <div className="text-xs text-base-content/70 truncate" title={req.description}>{req.description}</div>
                                        <div className="text-[10px] text-primary mt-1 font-black uppercase tracking-tighter">{req.location}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-black border ${req.priority === 'HIGH' ? 'bg-error/20 text-error border-error/30' :
                                                req.priority === 'LOW' ? 'bg-success/20 text-success border-success/30' :
                                                    'bg-warning/20 text-warning border-warning/30'
                                            }`}>
                                            {req.priority === 'HIGH' ? 'ACİL' : req.priority === 'LOW' ? 'DÜŞÜK' : 'NORMAL'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-xs text-base-content/80 font-medium">
                                        {new Date(req.createdAt).toLocaleDateString('tr-TR')}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2.5 py-0.5 inline-flex text-[10px] leading-5 font-black rounded-full border ${getStatusColor(req.status)}`}>
                                            {req.status.toUpperCase()}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-xs text-base-content/80">
                                        {req.technicalStaff && req.technicalStaff.length > 0 ? (
                                            <div className="flex flex-col gap-0.5">
                                                {req.technicalStaff.map(staff => (
                                                    <span key={staff._id} className="font-bold text-info">• {staff.name}</span>
                                                ))}
                                            </div>
                                        ) : (
                                            <span className="text-base-content/40 italic">Atanmadı</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium flex flex-col gap-2 items-end">
                                        {req.status === 'assigned' && (
                                            <button
                                                onClick={() => handleUnassign(req._id)}
                                                className="bg-info/10 text-info px-3 py-1 rounded-lg hover:bg-info hover:text-info-content transition-all text-[10px] font-black border border-info/30"
                                            >
                                                BOŞA ÇIKAR
                                            </button>
                                        )}
                                        {(req.status === 'pending' && isPastDate(req.createdAt)) && (
                                            <button
                                                onClick={() => handleCancel(req._id)}
                                                className="px-3 py-1 rounded-lg transition-all text-[10px] font-black border bg-error/10 text-error border-error/30 hover:bg-error hover:text-error-content ring-1 ring-error/50 animate-pulse"
                                            >
                                                İPTAL ET
                                            </button>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                        {req.status !== 'completed' ? (
                                            <span className="text-xs text-base-content/30">—</span>
                                        ) : req.rating?.score ? (
                                            <button
                                                onClick={() => setRatingView(req)}
                                                className="inline-flex items-center gap-2 rounded-lg border border-base-300 bg-base-100 px-3 py-1.5 text-xs font-semibold text-base-content/80 hover:bg-base-200 transition-colors"
                                                title="Değerlendirmeyi Gör"
                                            >
                                                <StarRating value={req.rating.score} size="sm" />
                                                <span>{req.rating.score}/5</span>
                                            </button>
                                        ) : req.completedAt && new Date(req.completedAt) >= RATING_START_DATE ? (
                                            <span className="inline-flex rounded-lg bg-base-200 px-3 py-1.5 text-xs font-medium text-base-content/50">
                                                Değerlendirilmedi
                                            </span>
                                        ) : (
                                            <span className="text-xs text-base-content/30" title="Değerlendirme sistemi öncesinde tamamlandı">—</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}

                {!loading && requests.length === 0 && (
                    <div className="p-20 text-center text-base-content/40 font-bold uppercase text-xs tracking-widest">
                        Kriterlere uygun kayıt bulunamadı.
                    </div>
                )}
            </div>

            {/* Değerlendirme detayı */}
            <Dialog open={ratingView !== null} onClose={() => setRatingView(null)} className="relative z-50">
                <div className="fixed inset-0 bg-base-content/40 backdrop-blur-sm" aria-hidden="true" />
                <div className="fixed inset-0 flex items-center justify-center p-4">
                    <Dialog.Panel className="w-full max-w-md rounded-2xl border border-base-200 bg-base-100 p-6 shadow-2xl">
                        {ratingView && ratingView.rating && (
                            <>
                                <div className="flex items-start justify-between gap-3">
                                    <Dialog.Title className="text-lg font-semibold text-base-content">Talep Değerlendirmesi</Dialog.Title>
                                    <button
                                        type="button"
                                        onClick={() => setRatingView(null)}
                                        className="text-2xl leading-none text-base-content/50 hover:text-base-content"
                                        aria-label="Kapat"
                                    >
                                        &times;
                                    </button>
                                </div>
                                <p className="mt-1 text-sm text-base-content/60">{ratingView.title}</p>

                                <div className="mt-5 flex items-center gap-3">
                                    <StarRating value={ratingView.rating.score} size="lg" />
                                    <div>
                                        <p className="text-xl font-semibold text-base-content">{ratingView.rating.score}/5</p>
                                        <p className="text-sm text-base-content/60">{RATING_LABELS[ratingView.rating.score]}</p>
                                    </div>
                                </div>

                                <div className="mt-5 rounded-xl border border-base-200 bg-base-200/40 p-4">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-base-content/50">Yorum</p>
                                    <p className="mt-1 whitespace-pre-wrap break-words text-sm text-base-content">
                                        {ratingView.rating.comment?.trim() || 'Yorum yazılmamış.'}
                                    </p>
                                </div>

                                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                                    <div>
                                        <dt className="text-xs text-base-content/50">Değerlendiren</dt>
                                        <dd className="font-medium text-base-content">{ratingView.user?.name || 'Bilinmiyor'}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-xs text-base-content/50">Tarih</dt>
                                        <dd className="font-medium text-base-content">
                                            {ratingView.rating.ratedAt ? new Date(ratingView.rating.ratedAt).toLocaleString('tr-TR') : '-'}
                                        </dd>
                                    </div>
                                    <div className="col-span-2">
                                        <dt className="text-xs text-base-content/50">İşi Yapan Personel</dt>
                                        <dd className="font-medium text-base-content">
                                            {ratingView.technicalStaff && ratingView.technicalStaff.length > 0
                                                ? ratingView.technicalStaff.map((st) => st.name).join(', ')
                                                : 'Atanmadı'}
                                        </dd>
                                    </div>
                                </dl>

                                <div className="mt-6 flex justify-end">
                                    <button
                                        type="button"
                                        onClick={() => setRatingView(null)}
                                        className="h-10 rounded-lg px-4 text-sm font-medium text-base-content/70 ring-1 ring-inset ring-base-300 hover:bg-base-200"
                                    >
                                        Kapat
                                    </button>
                                </div>
                            </>
                        )}
                    </Dialog.Panel>
                </div>
            </Dialog>
        </div>
    );
}