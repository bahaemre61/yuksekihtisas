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
        if (!confirm("Bu işi teknik personelden alıp tekrar havuza atmak istediğinize emin misiniz?")) return;
        try {
            await axios.put(`/api/admin/technical-requests/unassign`, { requestId: id });
            fetchAllRequests(); // Listeyi yenile
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
        <div className="bg-white shadow-sm rounded-xl overflow-hidden border border-gray-200">
            {/* 🔎 FİLTRELEME VE BAŞLIK ALANI */}
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/50">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Link href="/dashboard/admin" className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                            <ArrowLeftIcon className="h-5 w-5 text-gray-600" />
                        </Link>
                        <h2 className="text-xl font-bold text-gray-800 uppercase tracking-tight">Teknik Destek Yönetimi</h2>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        {/* Statü Filtresi */}
                        <div className="flex items-center gap-2 bg-white border rounded-lg px-3 py-1.5 shadow-sm">
                            <FunnelIcon className="h-4 w-4 text-gray-400" />
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
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all border ${
                                showCancelled 
                                ? 'bg-red-50 text-red-700 border-red-200 shadow-inner' 
                                : 'bg-white text-gray-600 border-gray-300 shadow-sm'
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
                    <div className="flex justify-center items-center py-20 text-gray-400 animate-pulse font-bold uppercase text-xs">
                        Veriler yükleniyor...
                    </div>
                ) : (
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest">Talep Eden</th>
                                <th className="px-6 py-3 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest">Arıza & Konum</th>
                                <th className="px-6 py-3 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest">Öncelik</th>
                                <th className="px-6 py-3 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest">Tarih</th>
                                <th className="px-6 py-3 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest">Durum</th>
                                <th className="px-6 py-3 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest">Personel</th>
                                <th className="px-6 py-3 text-right text-[10px] font-black text-gray-500 uppercase tracking-widest">İşlemler</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {requests.map((req) => (
                                <tr 
                                    key={req._id} 
                                    className={`hover:bg-gray-50 transition-colors ${req.status === 'cancelled' ? 'opacity-50 grayscale-[0.5] bg-gray-50/50' : ''}`}
                                >
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-bold text-gray-900">{req.user?.name || 'Bilinmiyor'}</div>
                                        <div className="text-[10px] text-gray-500">{req.user?.email}</div>
                                    </td>
                                    <td className="px-6 py-4 max-w-[300px]">
                                        <div className="text-sm text-gray-900 font-bold truncate" title={req.title}>{req.title}</div>
                                        <div className="text-xs text-gray-500 truncate" title={req.description}>{req.description}</div>
                                        <div className="text-[10px] text-blue-600 mt-1 font-black uppercase tracking-tighter">{req.location}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-black border ${
                                            req.priority === 'HIGH' ? 'bg-red-50 text-red-700 border-red-100' :
                                            req.priority === 'LOW' ? 'bg-green-50 text-green-700 border-green-100' :
                                            'bg-yellow-50 text-yellow-700 border-yellow-100'
                                        }`}>
                                            {req.priority === 'HIGH' ? 'ACİL' : req.priority === 'LOW' ? 'DÜŞÜK' : 'NORMAL'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-600 font-medium">
                                        {new Date(req.createdAt).toLocaleDateString('tr-TR')}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2.5 py-0.5 inline-flex text-[10px] leading-5 font-black rounded-full border ${getStatusColor(req.status)}`}>
                                            {req.status.toUpperCase()}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-xs text-gray-600">
                                        {req.technicalStaff && req.technicalStaff.length > 0 ? (
                                            <div className="flex flex-col gap-0.5">
                                                {req.technicalStaff.map(staff => (
                                                    <span key={staff._id} className="font-bold text-blue-700">• {staff.name}</span>
                                                ))}
                                            </div>
                                        ) : (
                                            <span className="text-gray-400 italic">Atanmadı</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        {req.status === 'assigned' && (
                                            <button 
                                                onClick={() => handleUnassign(req._id)}
                                                className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-lg hover:bg-indigo-600 hover:text-white transition-all text-[10px] font-black border border-indigo-100"
                                            >
                                                BOŞA ÇIKAR
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}

                {!loading && requests.length === 0 && (
                    <div className="p-20 text-center text-gray-400 font-bold uppercase text-xs tracking-widest">
                        Kriterlere uygun kayıt bulunamadı.
                    </div>
                )}
            </div>
        </div>
    );
}