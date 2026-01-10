'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { 
  MapPinIcon, 
  ExclamationTriangleIcon, 
  UserGroupIcon,
  ClockIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import { CheckBadgeIcon } from '@heroicons/react/24/solid';


enum RequestStatus { PENDING = 'pending' }

interface IRequestingUser {
    _id: string;
    name: string;
    email: string;
}

interface IVehicleRequest {
    _id: string;
    purpose: string;
    fromLocation: string;
    toLocation: string;
    status: RequestStatus;
    startTime: string;
    endTime: string;
    priority: 'normal' | 'high';
    requestingUser: IRequestingUser; 
    willCarryItems?: boolean;
}

interface IGroupedRequest {
    _id: string; 
    description?: string;
    totalRequests: number;
    highPriorityCount: number;
    requests: IVehicleRequest[];
}

const formatTRDate = (dateString: string) => {
  return new Date(dateString).toLocaleTimeString('tr-TR', {
    hour: '2-digit', minute: '2-digit'
  });
};

export default function PendingGroupsPage() {
  const [groups, setGroups] = useState<IGroupedRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [myDriverStatus, setMyDriverStatus] = useState<string>('available');
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchGroupedRequests = async () => {
    setLoading(true);
    try {
      const meRes = await axios.get('/api/me');
      setMyDriverStatus(meRes.data.driverStatus || 'available');

      const res = await axios.get('/api/ai/smart-group');
      
      if(Array.isArray(res.data)) {
        setGroups(res.data);
      } else {
        setGroups([]);
      }

    } catch (err: any) {
      console.error("Veri çekme hatası", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroupedRequests();
  }, []);

  const handleAcceptGroup = async (groupTitle: string, groupRequests: IVehicleRequest[]) => {
    if (myDriverStatus === 'busy') {
        alert("Şu an meşgulsünüz. Yeni görev alamazsınız.");
        return;
    }

    const confirmMsg = `${groupTitle} bölgesindeki ${groupRequests.length} yolcuyu almak istiyor musunuz?`;
    if (!confirm(confirmMsg)) return;

    setProcessingId(groupTitle);

    try {
        const requestIds = groupRequests.map(r => r._id);

        await axios.post('/api/driver/accept-group', { requestIds });

        const startPoint = groupRequests[0].fromLocation.trim(); // İlk yolcunun konumu başlangıç
        let stops: string[] = [];

        groupRequests.forEach(task => {
            const pickup = task.fromLocation.trim();
            const dropoff = task.toLocation.trim();
            if (!stops.includes(pickup)) stops.push(pickup);
            if (!stops.includes(dropoff)) stops.push(dropoff);
        });

        const routeArray = [startPoint, ...stops]; 
        const encodedRoute = routeArray.map(point => encodeURIComponent(point)).join('/');
        const mapUrl = `https://www.google.com/maps/dir/${encodedRoute}`;

        alert("Grup zimmetinize atandı! Rota açılıyor...");
        window.open(mapUrl, '_blank');

        setGroups(prev => prev.filter(g => g._id !== groupTitle));
        setMyDriverStatus('busy');

    } catch (err: any) {
        console.error(err);
        alert(err.response?.data?.msg || "Grubu alırken hata oluştu.");
    } finally {
        setProcessingId(null);
    }
  };

  if (loading) return <div className="p-6 text-center text-gray-500">Yükleniyor...</div>;

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg relative min-h-[500px]">
      
      {/* HEADER */}
      <div className="mb-6 border-b pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <h2 className="text-2xl font-semibold text-gray-800 flex items-center">
                <SparklesIcon className="h-6 w-6 text-purple-600 mr-2" />
                Akıllı Talep Yığını
            </h2>
            <p className="text-sm text-gray-500 mt-1">
                Talepler konumlarına göre AI tarafından otomatik gruplandı.
            </p>
        </div>
        <button onClick={fetchGroupedRequests} className="text-blue-600 text-sm font-semibold hover:bg-blue-50 px-3 py-2 rounded transition-colors">
            🔄 Listeyi Yenile
        </button>
      </div>

      {/* SÜRÜCÜ MEŞGUL UYARISI */}
      {myDriverStatus === 'busy' && (
        <div className="mb-6 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r shadow-sm">
          <div className="flex">
            <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600 mr-3" />
            <div>
              <p className="text-sm text-yellow-700 font-bold">Şu an MEŞGUL durumdasınız.</p>
              <p className="text-sm text-yellow-600 mt-1">
                Yeni grup alabilmek için mevcut görevleri tamamlamalısınız.
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* BOŞ STATE */}
      {groups.length === 0 ? (
        <div className="text-center text-gray-500 py-16 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50">
          <MapPinIcon className="h-12 w-12 mx-auto text-gray-300 mb-3"/>
          <p className="text-lg">Şu anda bekleyen bir grup veya talep bulunmuyor.</p>
        </div>
      ) : (
        /* GRUP KARTLARI */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pb-10">
          {groups.map((group, index) => {
            const isUrgentGroup = group.highPriorityCount > 0;
            const isProcessing = processingId === group._id;
            const isBusy = myDriverStatus === 'busy';

            return (
                <div 
                    key={index} 
                    className={`
                        flex flex-col justify-between
                        relative border rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300
                        ${isUrgentGroup ? 'border-red-300 bg-white' : 'border-gray-200 bg-white'}
                        ${isBusy ? 'opacity-60 grayscale-[0.5]' : ''}
                    `}
                >
                    <div>
                        {/* KART BAŞLIĞI */}
                        <div className={`p-4 border-b flex justify-between items-start ${isUrgentGroup ? 'bg-red-50' : 'bg-gray-50'}`}>
                            <div className="flex-1">
                                <h3 className="text-lg font-bold text-gray-800 uppercase flex items-center">
                                    <MapPinIcon className="h-5 w-5 mr-2 text-blue-500"/>
                                    {group._id || 'Özel Rota'}
                                </h3>
                                {/* AI AÇIKLAMASI */}
                                {group.description && (
                                    <p className="text-xs text-gray-600 mt-2 bg-white/50 p-1.5 rounded border border-gray-200 italic flex items-start">
                                        <SparklesIcon className="h-3 w-3 mr-1 mt-0.5 text-purple-500 shrink-0"/>
                                        {group.description}
                                    </p>
                                )}
                            </div>
                            
                            {isUrgentGroup && (
                                <span className="ml-2 bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded animate-pulse flex items-center shrink-0">
                                    <ExclamationTriangleIcon className="h-3 w-3 mr-1"/>
                                    ACİL
                                </span>
                            )}
                        </div>

                        {/* YOLCU SAYISI BİLGİSİ */}
                        <div className="px-4 py-2 bg-gray-50/50 border-b border-gray-100 flex items-center text-xs font-semibold text-gray-500">
                             <UserGroupIcon className="h-4 w-4 mr-1"/>
                             Toplam {group.totalRequests} Yolcu
                        </div>

                        {/* YOLCU LİSTESİ (Scrollable) */}
                        <div className="p-4 space-y-3 max-h-[200px] overflow-y-auto custom-scrollbar">
                            {group.requests.map((req) => (
                                <div key={req._id} className="text-sm border-b border-gray-100 last:border-0 pb-2 hover:bg-gray-50 rounded px-1 transition-colors">
                                    <div className="flex justify-between font-semibold text-gray-700">
                                        <span>{req.requestingUser?.name || "Misafir"}</span>
                                        <span className="text-gray-400 flex items-center text-xs">
                                            <ClockIcon className="h-3 w-3 mr-1"/>
                                            {formatTRDate(req.startTime)}
                                        </span>
                                    </div>
                                    <div className="text-gray-500 text-xs mt-1">
                                        <span className="font-medium text-gray-700">Hedef:</span> {req.toLocation}
                                    </div>
                                    {req.priority === 'high' && <span className="text-[10px] text-red-500 font-bold block mt-1">! Acil</span>}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* AKSİYON BUTONU */}
                    <div className="p-4 bg-gray-50 border-t mt-auto">
                        <button
                            onClick={() => handleAcceptGroup(group._id, group.requests)}
                            disabled={isProcessing || isBusy}
                            className={`
                                w-full py-3 rounded-lg font-bold text-white shadow transition-all flex justify-center items-center transform active:scale-95
                                ${isUrgentGroup 
                                    ? 'bg-linear-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800' 
                                    : 'bg-linear-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800'}
                                ${isBusy || isProcessing ? 'opacity-50 cursor-not-allowed transform-none' : ''}
                            `}
                        >
                            {isProcessing ? (
                                <span className="flex items-center">
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    İşleniyor...
                                </span>
                            ) : (
                                <>
                                    <CheckBadgeIcon className="h-5 w-5 mr-2" />
                                    BU ROTAYI AL
                                </>
                            )}
                        </button>
                    </div>
                </div>
            );
          })}
        </div>
      )}
    </div>
  );
}