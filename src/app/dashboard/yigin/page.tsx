'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { 
  MapIcon, 
  ExclamationTriangleIcon, 
  CheckCircleIcon 
} from '@heroicons/react/24/outline';

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
    createdAt: string;
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
  const [error, setError] = useState<string | null>(null);
  
  const router = useRouter();

  
  const fetchPendingRequests = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/requests/pending'); 
      setRequests(res.data);
    } catch (err: any) {
      setError("Talepler yüklenirken bir hata oluştu.");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPendingRequests();
  }, []);

 
  const toggleSelect = (id: string) => {
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

  
  const handleProcessSelected = async () => {
    if (selectedIds.length === 0) return;
    setProcessing(true);

    try {
     
      const selectedTasks = requests.filter(r => selectedIds.includes(r._id));

      selectedTasks.sort((a, b) => {
        
        if (a.priority === 'high' && b.priority !== 'high') return -1;
        if (a.priority !== 'high' && b.priority === 'high') return 1;
        
        
        return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
      });

      
      await Promise.all(selectedIds.map(id => 
        axios.put(`/api/requests/${id}/assign`)
      ));
     const startPoint = selectedTasks[0].fromLocation.trim();    
      let stops: string[] = [];

      selectedTasks.forEach(task => {
        const pickup = task.fromLocation.trim();
        const dropoff = task.toLocation.trim();   
        if (pickup !== startPoint && !stops.includes(pickup)) {
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
      
      

    } catch (err: any) {
      console.error(err);
      alert("Bazı görevler alınamadı (Başkası kapmış olabilir). Liste yenileniyor.");
      fetchPendingRequests(); 
    } finally {
      setProcessing(false);
    }
  };


  if (loading) return <div className="p-6 text-center">Yükleniyor...</div>;

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg relative">
      
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 sticky top-0 bg-white z-10 py-2 border-b">
        <div>
            <h2 className="text-2xl font-semibold text-gray-800">Talep Yığını</h2>
            <p className="text-sm text-gray-500">
                {selectedIds.length}/5 Görev Seçildi
            </p>
        </div>

        {selectedIds.length > 0 && (
            <button
                onClick={handleProcessSelected}
                disabled={processing}
                className="flex items-center px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 shadow-lg transition-all font-bold animate-pulse"
            >
                {processing ? (
                    'İşleniyor...'
                ) : (
                    <>
                        <MapIcon className="h-5 w-5 mr-2" />
                        {selectedIds.length} İşi Al & Rotayı Başlat
                    </>
                )}
            </button>
        )}
      </div>
      
      
      {requests.length === 0 ? (
        <div className="text-center text-gray-500 py-10 border-2 border-dashed border-gray-300 rounded-lg">
          <p>Şu anda bekleyen bir talep bulunmuyor.</p>
        </div>
      ) : (
        <div className="space-y-4 pb-20"> 
          {requests.map((req) => {
            const isSelected = selectedIds.includes(req._id);
            return (
                <div 
                    key={req._id} 
                    onClick={() => toggleSelect(req._id)}
                    className={`
                        relative border-2 rounded-xl p-4 cursor-pointer transition-all
                        ${isSelected ? 'border-green-500 bg-green-50 shadow-md' : 'border-gray-200 hover:border-green-300'}
                    `}
                >
                    
                    {req.priority === 'high' && (
                        <div className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-bl-xl rounded-tr-lg flex items-center">
                            <ExclamationTriangleIcon className="h-3 w-3 mr-1" /> ACİL
                        </div>
                    )}

                    <div className="flex items-start mt-2">
                        
                        <div className={`
                            flex items-center justify-center h-6 w-6 rounded-full border-2 mr-4 mt-1 transition-colors
                            ${isSelected ? 'bg-green-500 border-green-500' : 'border-gray-300 bg-white'}
                        `}>
                            {isSelected && <CheckCircleIcon className="h-5 w-5 text-white" />}
                        </div>

                       
                        <div className="flex-1">
                            <h3 className="text-lg font-bold text-gray-900">{req.purpose}</h3>
                            <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">
                                <p>📍 <strong>Nereden:</strong> {req.fromLocation}</p>
                                <p>🏁 <strong>Nereye:</strong> {req.toLocation}</p>
                                <p>🕒 <strong>Saat:</strong> {formatTRDate(req.startTime)}</p>
                                <p>👤 <strong>Yolcu:</strong> {req.requestingUser.name}</p>
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