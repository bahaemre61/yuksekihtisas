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

interface IVehicleReuqest {
    _id: string;
    purpose: string;
    fromLocation: string;
    toLocation: string;
    status: RequestStatus;
    startTime: string;
    requestingUser: { name: string; email: string };
    assignedDriver?: { name: string; email: string };
}

export default function AdminDashboardPage() {
    const [requests, setRequests] = useState<IVehicleReuqest[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Filtre State'leri
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [showCancelled, setShowCancelled] = useState<boolean>(false);

    const fetchAllRequests = async () => {
        setLoading(true);
        try {
            // Backend'e filtre parametrelerini gönderiyoruz
            const res = await axios.get(`/api/admin/requests?status=${filterStatus}&showCancelled=${showCancelled}`);
            setRequests(res.data);
        } catch (err) {
            console.error(err);
            alert("Veriler yüklenmedi");
        }
        setLoading(false);
    };

    // Filtreler her değiştiğinde listeyi yenile
    useEffect(() => {
        fetchAllRequests();
    }, [filterStatus, showCancelled]);

    const handleUnassign = async (id: string) => {
        if (!confirm("Bu işi şoförden alıp tekrar havuza (Pending) atmak istediğinize emin misiniz?")) return;

        try {
            await axios.put(`/api/admin/requests/${id}/unassign`);
            fetchAllRequests(); // Listeyi yenilemek en sağlıklısı
        } catch (err) {
            alert("İşlem başarısız.");
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'assigned': return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'completed': return 'bg-green-100 text-green-800 border-green-200';
            case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    return (
        <div className="bg-white shadow-sm rounded-lg overflow-hidden border border-gray-200">
            {/* Header ve Filtreler */}
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/50">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Link href="/dashboard/admin" className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                            <ArrowLeftIcon className="h-5 w-5 text-gray-600" />
                        </Link>
                        <h2 className="text-xl font-bold text-gray-800 uppercase tracking-tight">Talepler</h2>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        {/* Durum Filtresi */}
                        <div className="flex items-center gap-2 bg-white border rounded-md px-2 py-1 shadow-sm">
                            <FunnelIcon className="h-4 w-4 text-gray-400" />
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

                        {/* İptalleri Göster Toggle */}
                        <button
                            onClick={() => setShowCancelled(!showCancelled)}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all border ${
                                showCancelled 
                                ? 'bg-red-50 text-red-700 border-red-200 shadow-inner' 
                                : 'bg-white text-gray-600 border-gray-300 shadow-sm'
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
                    <div className="flex justify-center items-center py-20 text-gray-400 animate-pulse">
                        Veriler yükleniyor...
                    </div>
                ) : (
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Talep Eden</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Güzergah & Amaç</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Tarih</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Durum</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Şoför</th>
                                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">İşlemler</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {requests.length > 0 ? (
                                requests.map((req) => (
                                    <tr 
                                        key={req._id} 
                                        className={`hover:bg-gray-50 transition-colors ${req.status === 'cancelled' ? 'opacity-50 grayscale-[0.5] bg-gray-50/50' : ''}`}
                                    >
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-bold text-gray-900">{req.requestingUser?.name || 'Silinmiş'}</div>
                                            <div className="text-xs text-gray-500">{req.requestingUser?.email}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-gray-900 font-semibold">{req.purpose}</div>
                                            <div className="text-xs text-gray-500 truncate max-w-[200px]">{req.fromLocation} ➔ {req.toLocation}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-600">
                                            <span className="font-medium text-gray-900">{new Date(req.startTime).toLocaleDateString('tr-TR')}</span> <br />
                                            {new Date(req.startTime).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2.5 py-0.5 inline-flex text-[10px] leading-5 font-bold rounded-full border ${getStatusColor(req.status)}`}>
                                                {req.status.toUpperCase()}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                            {req.assignedDriver ? (
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-blue-700">{req.assignedDriver.name}</span>
                                                </div>
                                            ) : (
                                                <span className="text-gray-400 italic">Atanmadı</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            {req.status === 'assigned' && (
                                                <button
                                                    onClick={() => handleUnassign(req._id)}
                                                    className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded hover:bg-indigo-600 hover:text-white transition-all text-xs font-bold border border-indigo-200"
                                                >
                                                    BOŞA ÇIKAR
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-400 italic">
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