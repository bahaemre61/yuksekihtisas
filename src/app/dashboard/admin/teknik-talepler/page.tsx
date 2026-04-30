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
}

export default function TechnicalAdminPage() {
    const [requests, setRequests] = useState<ITechnicalRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [showCancelled, setShowCancelled] = useState<boolean>(false);

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
        </div>
    );
}