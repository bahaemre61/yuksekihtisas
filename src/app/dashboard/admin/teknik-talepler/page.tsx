'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

// Statü Enum'ı
enum RequestStatus {
    PENDING = 'pending',
    ASSIGNED = 'assigned',
    COMPLETED = 'completed',
    CANCELLED = 'cancelled', 
}

// Teknik Talep Arayüzü (Araç yapısına benzetildi)
interface ITechnicalRequest {
    _id: string;
    title: string;       // Konu (Araçtaki purpose yerine)
    description: string; // Detay
    location: string;    // Konum (Araçtaki from/to yerine)
    priority: 'LOW' | 'MEDIUM' | 'HIGH';
    status: RequestStatus;
    createdAt: string;
    user: { name: string; email: string }; // Talep Eden
    technicalStaff?: { _id: string; name: string }[]; // Atanan Personel (Dizi olabilir)
}

export default function TechnicalAdminPage() {
    const [requests, setRequests] = useState<ITechnicalRequest[]>([]);
    const [loading, setLoading] = useState(true);

    // Tüm verileri çekme fonksiyonu
    const fetchAllRequests = async () => {
        setLoading(true);
        try {
            // Admin için tüm teknik talepleri çeken API
            const res = await axios.get('/api/admin/technical-requests');
            if(res.data.success) {
                setRequests(res.data.data);
            }
        } catch (err) {
            console.error(err);
            alert("Veriler yüklenirken bir hata oluştu.");
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchAllRequests();
    }, []);

    // Atamayı Kaldır (Boşa Çıkar) Fonksiyonu
    const handleUnassign = async (id: string) => {
        if (!confirm("Bu işi teknik personelden alıp tekrar havuza (Bekliyor) atmak istediğinize emin misiniz?")) return;
        
        try {
            // Bu API endpoint'ini aşağıda ayrıca vereceğim
            await axios.put(`/api/admin/technical-requests/unassign`, { requestId: id });
            
            // State'i güncelle (Sayfayı yenilemeden ekrana yansıt)
            setRequests(prev => prev.map(req => 
                req._id === id 
                ? { ...req, status: RequestStatus.PENDING, technicalStaff: [] } 
                : req
            ));
        } catch (err) {
            console.error(err);
            alert("İşlem başarısız.");
        }
    };

    // Renk Yardımcısı
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending': return 'bg-yellow-100 text-yellow-800';
            case 'assigned': return 'bg-blue-100 text-blue-800';
            case 'completed': return 'bg-green-100 text-green-800';
            case 'cancelled': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    if (loading) return <div className='p-6 text-gray-500'>Veriler yükleniyor...</div>;

    return (
      
        <div className="bg-white shadow-sm rounded-lg overflow-hidden border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <div className="flex items-center gap-4">
            <Link href="/dashboard/admin" className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <ArrowLeftIcon className="h-6 w-6 text-gray-600"/>
            </Link>
                <h2 className="text-xl font-semibold text-gray-800">Teknik Destek Yönetimi</h2>             
            </div>         
            <span className="ml-auto text-sm text-gray-500">Toplam: {requests.length} Kayıt</span>
            </div>  
            
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Talep Eden</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Arıza & Konum</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Öncelik</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tarih</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Durum</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Personel</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {requests.map((req) => (
                            <tr key={req._id} className="hover:bg-gray-50 transition-colors">
                                
                                {/* 1. Talep Eden */}
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-gray-900">{req.user?.name || 'Bilinmiyor'}</div>
                                    <div className="text-xs text-gray-500">{req.user?.email}</div>
                                </td>

                                {/* 2. Arıza Bilgisi */}
                                <td className="px-6 py-4">
                                    <div className="text-sm text-gray-900 font-bold">{req.title}</div>
                                    <div className="text-xs text-gray-500 truncate max-w-[200px]">{req.description}</div>
                                    <div className="text-xs text-blue-600 mt-1 font-medium">{req.location}</div>
                                </td>

                                {/* 3. Öncelik (Teknik özel alan) */}
                                <td className="px-6 py-4 whitespace-nowrap">
                                    {req.priority === 'HIGH' ? (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                                          ACİL
                                    </span>
                                   ) : req.priority === 'LOW' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                              DÜŞÜK
                             </span>
                              ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-50 text-yellow-800">
                              NORMAL
                              </span>
                              )}
                                </td>

                                {/* 4. Tarih */}
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {new Date(req.createdAt).toLocaleDateString('tr-TR')}
                                </td>

                                {/* 5. Durum */}
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(req.status)}`}>
                                        {req.status.toUpperCase()}
                                    </span>
                                </td>

                                {/* 6. Atanan Personel */}
                                <td className="px-6 py-4 text-sm text-gray-600">
                                    {req.technicalStaff && req.technicalStaff.length > 0 ? (
                                        <div className="flex flex-col gap-1">
                                            {req.technicalStaff.map(staff => (
                                                <span key={staff._id} className="inline-flex items-center">
                                                    • {staff.name}
                                                </span>
                                            ))}
                                        </div>
                                    ) : (
                                        <span className="text-gray-400 italic">-</span>
                                    )}
                                </td>

                                {/* 7. İşlemler */}
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    {req.status === 'assigned' && (
                                        <button 
                                            onClick={() => handleUnassign(req._id)}
                                            className="text-red-600 hover:text-red-900 hover:underline cursor-pointer"
                                        >
                                            Boşa Çıkar
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {requests.length === 0 && (
                    <div className="p-10 text-center text-gray-400">
                        Kayıt bulunamadı.
                    </div>
                )}
            </div>
        </div>
    );
}