'use client'; 

import { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { TrashIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

enum RequestStatus {
    PENDING = 'pending',
    ASSIGNED = 'assigned',
    COMPLETED = 'completed',
    CANCELLED = 'cancelled'
}

// ✅ SIRALAMA ÖNCELİĞİ (Senin istediğin sıra)
const statusPriority: Record<string, number> = {
    [RequestStatus.PENDING]: 1,
    [RequestStatus.ASSIGNED]: 2,
    [RequestStatus.COMPLETED]: 3,
    [RequestStatus.CANCELLED]: 4,
};

interface IVehicleRequest {
    _id: string;
    purpose: string;
    fromLocation: string;
    toLocation: string;
    status: RequestStatus;
    startTime: string;
    endTime: string;
    createdAt: string;
    willCarryItems: boolean;
    assignedDriver?: { name: string; };
}

const StatusBadge = ({ status }: { status: RequestStatus }) => {
  let colorClass = '';
  let text = status.toUpperCase();

  switch (status) {
    case RequestStatus.PENDING: colorClass = 'bg-yellow-100 text-yellow-800'; text = 'Beklemede'; break;
    case RequestStatus.ASSIGNED: colorClass = 'bg-blue-100 text-blue-800'; text = 'Atandı'; break;
    case RequestStatus.COMPLETED: colorClass = 'bg-green-100 text-green-800'; text = 'Tamamlandı'; break;
    case RequestStatus.CANCELLED: colorClass = 'bg-red-100 text-red-800'; text = 'İptal Edildi'; break;
  }
  return (
    <span className={`px-3 py-1 inline-flex text-xs font-semibold rounded-full ${colorClass}`}>
      {text}
    </span>
  );
};

const formatTRDate = (dateString: string) => {
  return new Date(dateString).toLocaleString('tr-TR', { day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' });
};

export default function MyRequestsPage() {
  const [requests, setRequests] = useState<IVehicleRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCancelled, setShowCancelled] = useState(false);

  useEffect(() => {
    const fetchRequests = async () => {
      setLoading(true);
      try {
        const res = await axios.get('/api/requests/my'); 
        setRequests(res.data);
      } catch (err) { console.error(err); }
      setLoading(false);
    };
    fetchRequests();
  }, []); 

  // ✅ SIRALAMA VE FİLTRELEME (useMemo ile performanslı)
  const filteredAndSortedRequests = useMemo(() => {
    let result = requests;
    if (!showCancelled) {
      result = result.filter(r => r.status !== RequestStatus.CANCELLED);
    }

    return [...result].sort((a, b) => {
      if (statusPriority[a.status] !== statusPriority[b.status]) {
        return statusPriority[a.status] - statusPriority[b.status];
      }
      return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
    });
  }, [requests, showCancelled]);

  const handleCancel = async (id: string) => {
    if (!confirm("Bu talebi iptal etmek istediğinize emin misiniz?")) return;
    try {
      await axios.put(`/api/requests/${id}/cancel`);
      setRequests(prev => prev.map(req => req._id === id ? { ...req, status: RequestStatus.CANCELLED } : req));
    } catch (err) { alert("Hata oluştu."); }
  };

  if (loading) return (
    <div className="flex justify-center items-center h-64">
        <div className="h-8 w-8 animate-spin border-4 border-blue-600 border-t-transparent rounded-full"></div>
    </div>
  );

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <h2 className="text-2xl font-semibold text-gray-800">Araç Taleplerim</h2>
        <button 
          onClick={() => setShowCancelled(!showCancelled)}
          className="flex items-center gap-2 text-xs font-semibold text-gray-500 hover:text-blue-600 transition-colors"
        >
          {showCancelled ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
          {showCancelled ? 'İptalleri Gizle' : 'İptalleri Göster'}
        </button>
      </div>
      
      {filteredAndSortedRequests.length === 0 ? (
        <div className="text-center text-gray-500 py-10 border-2 border-dashed border-gray-300 rounded-lg">
          <p>Henüz gösterilecek bir talebiniz bulunmuyor.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {filteredAndSortedRequests.map((req) => (
            <div 
              key={req._id} 
              className={`
                border border-gray-200 rounded-lg p-4 shadow-sm transition-all duration-300
                ${req.status === RequestStatus.PENDING 
                  ? 'hover:shadow-[0_0_15px_rgba(250,204,21,0.4)] hover:border-yellow-300 bg-white' 
                  : 'hover:shadow-md bg-white'}
                ${req.status === RequestStatus.ASSIGNED 
                  ? 'hover:shadow-[0_0_15px_rgba(59,130,246,0.4)] hover:border-blue-300 bg-white' 
                  : 'hover:shadow-md bg-white'}
                ${req.status === RequestStatus.COMPLETED
                  ? 'hover:shadow-[0_0_15px_rgba(34,197,94,0.4)] hover:border-green-300 bg-white'
                  : 'hover:shadow-md bg-white'}
                ${req.status === RequestStatus.CANCELLED ? 'opacity-60 bg-gray-50' : ''}
              `}
            >
              <div className="flex flex-col sm:flex-row justify-between sm:items-start">
                <div className="flex-1 mb-4 sm:mb-0">
                  <h3 className="text-lg font-semibold text-gray-900">{req.purpose}</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    <span className="font-bold">Güzergah:</span> {req.fromLocation} &rarr; {req.toLocation}
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    <span className="font-medium">Gidiş:</span> {formatTRDate(req.startTime)}
                    <br />
                    <span className="font-medium">Dönüş:</span> {formatTRDate(req.endTime)}
                  </p>
                  <p className="text-sm text-gray-500">
                    <strong>Eşyalı:</strong> {req.willCarryItems ? 'Evet' : 'Hayır'}
                  </p>
                </div>             
                <div className="shrink-0 ml-0 sm:ml-4 sm:text-right space-y-2">
                  <StatusBadge status={req.status} />
                  <p className="text-sm text-gray-500">
                    <strong>Şoför:</strong> {req.assignedDriver ? req.assignedDriver.name : '—'}
                  </p>
                  {req.status === RequestStatus.PENDING && (
                    <button 
                      onClick={() => handleCancel(req._id)}
                      className='mt-2 text-red-600 hover:text-red-800 transition-colors p-1'
                    >
                      <TrashIcon className='h-5 w-5' />
                    </button>
                  )}  
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}