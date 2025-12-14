'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { 
  MapIcon, 
  ExclamationTriangleIcon, 
  CheckCircleIcon 
} from '@heroicons/react/24/outline';
import { SparklesIcon } from '@heroicons/react/24/solid';

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
}

const formatTRDate = (dateString: string) => {
  return new Date(dateString).toLocaleString('tr-TR', {
    day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit'
  });
};

export default function PendingRequestsPage() {
  const [requests, setRequests] = useState<IVehicleRequest[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false); 
  const [isOptimizing, setIsOptimizing] = useState(false); 
  const [myDriverStatus, setMyDriverStatus] = useState<string>('available'); 

  const fetchPendingRequests = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/requests/pending'); 
      setRequests(res.data);

      const meRes = await axios.get('/api/me');
      setMyDriverStatus(meRes.data.driverStatus || 'available');

    } catch (err: any) {
      console.error("Veri çekme hatası", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPendingRequests();
  }, []);

  const toggleSelect = (id: string) => {
    if (myDriverStatus === 'busy') return;

    if (selectedIds.includes(id)) {
      setSelectedIds(prev => prev.filter(itemId => itemId !== id));
    } else {
      if (selectedIds.length >= 5) {
        alert("Bir seferde en fazla 5 görev seçebilirsiniz!");
        return;
      }
      setSelectedIds(prev => [...prev, id]);
    }
  };

  const handleProcessSelected = async (useAI: boolean) => {
    if (selectedIds.length === 0) return;
    
    if (useAI) setIsOptimizing(true);
    else setProcessing(true);

    try {
      let selectedTasks = requests.filter(r => selectedIds.includes(r._id));

      if (useAI) {
        try {
            const startPoint = selectedTasks[0].fromLocation;
            
            const aiRes = await axios.post('/api/ai/optimize-route', {
                tasks: selectedTasks,
                startPoint: startPoint
            });

            const sortedIds = aiRes.data.sortedIds; 

            selectedTasks.sort((a, b) => {
                return sortedIds.indexOf(a._id) - sortedIds.indexOf(b._id);
            });

            alert("Rota Yapay Zeka tarafından optimize edildi! 🤖");
        } catch (error) {
            console.error("AI Hatası", error);
            alert("AI servisine ulaşılamadı, standart sıralama (Aciliyet/Zaman) kullanılıyor.");
            selectedTasks.sort((a, b) => {
                if (a.priority === 'high' && b.priority !== 'high') return -1;
                if (a.priority !== 'high' && b.priority === 'high') return 1;
                return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
            });
        }
      } else {
        selectedTasks.sort((a, b) => {
            if (a.priority === 'high' && b.priority !== 'high') return -1;
            if (a.priority !== 'high' && b.priority === 'high') return 1;
            return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
        });
      }

      await Promise.all(selectedIds.map(id => 
        axios.put(`/api/requests/${id}/assign`)
      ));

      const startPoint = selectedTasks[0].fromLocation.trim();
      let stops: string[] = [];

      selectedTasks.forEach(task => {
        const pickup = task.fromLocation.trim();
        const dropoff = task.toLocation.trim();

        if (pickup.toLowerCase() !== startPoint.toLowerCase() && !stops.includes(pickup)) {
            stops.push(pickup);
        }
        if (!stops.includes(dropoff)) {
            stops.push(dropoff);
        }
      });

      const routeArray = [startPoint, ...stops, startPoint];
      const encodedRoute = routeArray.map(point => encodeURIComponent(point)).join('/');
      
      const mapUrl = `https://www.google.com/maps/dir/${encodedRoute}`;

      window.open(mapUrl, '_blank');
      
      setRequests(prev => prev.filter(req => !selectedIds.includes(req._id)));
      setSelectedIds([]);
      setMyDriverStatus('busy');     

    } catch (err: any) {
      console.error(err);
      alert("İşlem sırasında hata oluştu. Sayfayı yenileyip tekrar deneyin.");
    } finally {
      setIsOptimizing(false);
      setProcessing(false);
    }
  };


  if (loading) return <div className="p-6 text-center">Yükleniyor...</div>;

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg relative min-h-[500px]">
      
      <div className="mb-6 border-b pb-4">
        <h2 className="text-2xl font-semibold text-gray-800">Talep Yığını</h2>
        <p className="text-sm text-gray-500 mt-1">
            {selectedIds.length}/5 Görev Seçildi
        </p>
      </div>

      {myDriverStatus === 'busy' && (
        <div className="mb-6 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r">
          <div className="flex">
            <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600 mr-3" />
            <div>
              <p className="text-sm text-yellow-700 font-bold">
                Şu an MEŞGUL durumdasınız.
              </p>
              <p className="text-sm text-yellow-600 mt-1">
                Yeni iş alabilmek için üzerinizdeki mevcut görevleri tamamlamanız gerekmektedir.
                Lütfen <a href="/dashboard/gorevlerim" className="underline font-bold hover:text-yellow-800">Görevlerim</a> sayfasına gidin.
              </p>
            </div>
          </div>
        </div>
      )}

      {selectedIds.length > 0 && (
        <div className="sticky top-4 z-20 flex flex-col sm:flex-row gap-3 mb-6 bg-white/90 p-4 rounded-xl shadow-lg border border-gray-100 backdrop-blur-sm">
            
            <button
                onClick={() => handleProcessSelected(false)}
                disabled={processing || isOptimizing}
                className="flex-1 flex items-center justify-center px-4 py-3 bg-gray-700 text-white rounded-xl hover:bg-gray-800 shadow transition-all font-bold text-sm disabled:opacity-50"
            >
                {processing ? 'İşleniyor...' : 'Sırayla Al & Başlat'}
            </button>

            <button
                onClick={() => handleProcessSelected(true)}
                disabled={processing || isOptimizing}
                className="flex-2 flex items-center justify-center px-6 py-3 bg-linear-to-r from-purple-600 to-blue-600 text-white rounded-xl hover:from-purple-700 hover:to-blue-700 shadow-md transition-all font-bold animate-pulse disabled:animate-none disabled:opacity-50"
            >
                {isOptimizing ? (
                    'Yapay Zeka Rota Çiziyor...'
                ) : (
                    <>
                        <SparklesIcon className="h-5 w-5 mr-2 text-yellow-300" />
                        AI ile Optimize Et & Başlat
                    </>
                )}
            </button>
        </div>
      )}
      
      {requests.length === 0 ? (
        <div className="text-center text-gray-500 py-16 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50">
          <p className="text-lg">Şu anda bekleyen bir talep bulunmuyor.</p>
        </div>
      ) : (
        <div className="space-y-4 pb-10">
          {requests.map((req) => {
            const isSelected = selectedIds.includes(req._id);
            const isBusy = myDriverStatus === 'busy';

            return (
                <div 
                    key={req._id} 
                    onClick={() => !isBusy && toggleSelect(req._id)}
                    className={`
                        relative border-2 rounded-xl p-5 transition-all
                        ${isBusy ? 'opacity-50 cursor-not-allowed grayscale-[0.8]' : 'cursor-pointer hover:shadow-md'}
                        ${isSelected ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-green-300'}
                    `}
                >
                    {req.priority === 'high' && (
                        <div className="absolute top-0 right-0 bg-red-600 text-white text-[10px] uppercase font-bold px-3 py-1 rounded-bl-xl rounded-tr-lg flex items-center shadow-sm z-10">
                            <ExclamationTriangleIcon className="h-3 w-3 mr-1" /> ACİL
                        </div>
                    )}

                    <div className="flex items-start">
                        <div className={`
                            shrink-0 flex items-center justify-center h-6 w-6 rounded-full border-2 mr-4 mt-1 transition-colors
                            ${isSelected ? 'bg-green-500 border-green-500' : 'border-gray-300 bg-white'}
                        `}>
                            {isSelected && <CheckCircleIcon className="h-4 w-4 text-white" />}
                        </div>

                        <div className="flex-1">
                            <h3 className="text-lg font-bold text-gray-900 leading-tight">{req.purpose}</h3>
                            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-4 text-sm text-gray-600">
                                <div className="flex items-start">
                                    <span className="font-semibold text-gray-800 min-w-[70px]">Nereden:</span>
                                    <span>{req.fromLocation}</span>
                                </div>
                                <div className="flex items-start">
                                    <span className="font-semibold text-gray-800 min-w-[70px]">Nereye:</span>
                                    <span>{req.toLocation}</span>
                                </div>
                                <div className="flex items-center">
                                    <span className="font-semibold text-gray-800 min-w-[70px]">Saat:</span>
                                    <span>{formatTRDate(req.startTime)}</span>
                                </div>
                                <div className="flex items-center">
                                    <span className="font-semibold text-gray-800 min-w-[70px]">Yolcu:</span>
                                    <span>{req.requestingUser.name}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            );
          })}
        </div>
      )}
    </div>
  );
}