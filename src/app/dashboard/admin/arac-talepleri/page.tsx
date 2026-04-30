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

// Sıralama önceliği tanımı
const statusPriority: Record<string, number> = {
    [RequestStatus.PENDING]: 1,
    [RequestStatus.ASSIGNED]: 2,
    [RequestStatus.COMPLETED]: 3,
    [RequestStatus.CANCELLED]: 4,
};

interface IVehicleReuqest {
    _id: string;
    purpose: string;
    fromLocation: string;
    toLocation: string;
    status: RequestStatus;
    startTime: string;
    endTime: string;
    requestingUser: { name: string; email: string };
    assignedDriver?: { name: string; email: string };
}

export default function AdminDashboardPage() {
    const [requests, setRequests] = useState<IVehicleReuqest[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [showCancelled, setShowCancelled] = useState<boolean>(false);

    const fetchAllRequests = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`/api/admin/requests?status=${filterStatus}&showCancelled=${showCancelled}`);
            
            // 📊 DURUMA GÖRE SIRALAMA MANTIĞI
            const sortedData = [...res.data].sort((a, b) => {
                return statusPriority[a.status] - statusPriority[b.status];
            });

            setRequests(sortedData);
        } catch (err) {
            console.error(err);
            alert("Veriler yüklenmedi");
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchAllRequests();
    }, [filterStatus, showCancelled]);

    const handleUnassign = async (id: string) => {
        if (!confirm("Bu işi şoförden alıp tekrar havuza (Pending) atmak istediğinize emin misiniz?")) return;
        try {
            await axios.put(`/api/admin/requests/${id}/unassign`);
            fetchAllRequests();
        } catch (err) {
            alert("İşlem başarısız.");
        }
    };

    const handleCancel = async (id: string) => {
        if (!confirm("Bu talebi iptal etmek istediğinize emin misiniz?")) return;
        try {
            await axios.put(`/api/admin/requests/${id}/cancel`);
            fetchAllRequests();
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
        <div className="bg-base-100 shadow-sm rounded-lg overflow-hidden border border-base-200">
            {/* Header ve Filtreler */}
            <div className="px-6 py-4 border-b border-base-200 bg-base-200/50">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Link href="/dashboard/admin" className="p-2 hover:bg-base-200 rounded-full transition-colors">
                            <ArrowLeftIcon className="h-5 w-5 text-base-content/70" />
                        </Link>
                        <h2 className="text-xl font-bold text-base-content uppercase tracking-tight">Talepler</h2>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2 bg-base-100 border border-base-200 rounded-md px-2 py-1 shadow-sm">
                            <FunnelIcon className="h-4 w-4 text-base-content/50" />
                            <select 
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                                className="text-sm bg-transparent outline-none pr-4 cursor-pointer"
                            >
                                <option value="all">Tüm Durumlar</option>
                                <option value="pending">Beklemede</option>
                                <option value="assigned">Atandı</option>
                                <option value="completed">Tamamlandı</option>
                            </select>
                        </div>

                        <button
                            onClick={() => setShowCancelled(!showCancelled)}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all border ${
                                showCancelled 
                                ? 'bg-error/10 text-error border-error/30 shadow-inner' 
                                : 'bg-base-100 text-base-content/70 border-base-300 shadow-sm hover:bg-base-200'
                            }`}
                        >
                            {showCancelled ? <EyeIcon className="h-4 w-4" /> : <EyeSlashIcon className="h-4 w-4" />}
                            {showCancelled ? 'İPTALLERİ GİZLE' : 'İPTALLERİ GÖSTER'}
                        </button>
                    </div>
                </div>
            </div>

            <div className="overflow-x-auto min-h-[400px]">
                {loading ? (
                    <div className="flex justify-center items-center py-20 text-base-content/50 animate-pulse">
                        Veriler yükleniyor...
                    </div>
                ) : (
                    <table className="min-w-full divide-y divide-base-200">
                        <thead className="bg-base-200/50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-base-content/60 uppercase tracking-wider">Talep Eden</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-base-content/60 uppercase tracking-wider">Nerden</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-base-content/60 uppercase tracking-wider">Nereye</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-base-content/60 uppercase tracking-wider">Amaç</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-base-content/60 uppercase tracking-wider">Tarih</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-base-content/60 uppercase tracking-wider">Durum</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-base-content/60 uppercase tracking-wider">Şoför</th>
                                <th className="px-6 py-3 text-right text-xs font-semibold text-base-content/60 uppercase tracking-wider">İşlemler</th>
                            </tr>
                        </thead>
                        <tbody className="bg-base-100 divide-y divide-base-200">
                            {requests.length > 0 ? (
                                requests.map((req) => (
                                    <tr 
                                        key={req._id} 
                                        className={`hover:bg-base-200/50 transition-colors ${req.status === 'cancelled' ? 'opacity-50 grayscale-[0.5] bg-base-200/30' : ''}`}
                                    >
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-bold text-base-content">{req.requestingUser?.name || 'Silinmiş'}</div>
                                            <div className="text-xs text-base-content/60">{req.requestingUser?.email}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-base-content/80">{req.fromLocation}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-base-content/80">{req.toLocation}</td>
                                        
                                        {/* 💬 AMAÇ KISMI TRUNCATE EDİLDİ */}
                                        <td className="px-6 py-4 max-w-[200px]">
                                            <div 
                                                className="text-sm font-semibold text-base-content truncate" 
                                                title={req.purpose} // Üzerine gelince tam hali görünür
                                            >
                                                {req.purpose}
                                            </div>
                                        </td>
                                        
                                        <td className="px-6 py-4 whitespace-nowrap text-xs text-base-content/70">
                                            <span className="font-medium text-base-content">{new Date(req.startTime).toLocaleDateString('tr-TR')}</span> <br />
                                            {new Date(req.startTime).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}- 
                                            {new Date(req.endTime).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                                        </td>   
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2.5 py-0.5 inline-flex text-[10px] leading-5 font-bold rounded-full border ${getStatusColor(req.status)}`}>
                                                {req.status.toUpperCase()}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-base-content/70">
                                            {req.assignedDriver ? (
                                                <span className="font-medium text-info">{req.assignedDriver.name}</span>
                                            ) : (
                                                <span className="text-base-content/40 italic">Atanmadı</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium flex flex-col gap-2 items-end">
                                            {req.status === 'assigned' && (
                                                <button
                                                    onClick={() => handleUnassign(req._id)}
                                                    className="bg-info/10 text-info px-3 py-1 rounded hover:bg-info hover:text-info-content transition-all text-xs font-bold border border-info/30"
                                                >
                                                    BOŞA ÇIKAR
                                                </button>
                                            )}
                                            {(req.status === 'pending' && isPastDate(req.startTime)) && (
                                                <button
                                                    onClick={() => handleCancel(req._id)}
                                                    className="px-3 py-1 rounded transition-all text-xs font-bold border bg-error/10 text-error border-error/30 hover:bg-error hover:text-error-content ring-1 ring-error/50 animate-pulse"
                                                >
                                                    SÜRESİ GEÇTİ - İPTAL ET
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={8} className="px-6 py-12 text-center text-base-content/50 italic">
                                        Kriterlere uygun talep bulunamadı.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}