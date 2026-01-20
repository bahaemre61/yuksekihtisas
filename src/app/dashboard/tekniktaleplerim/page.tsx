'use client'; 

import { useEffect, useState } from 'react';
import axios from 'axios';
import { TrashIcon } from '@heroicons/react/24/outline';

enum RequestStatus {
  PENDING = 'pending',
  ASSIGNED = 'assigned',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

// Teknik Talep Veri Tipi
interface ITechnicalRequest {
  _id: string;
  title: string;
  description: string;
  location: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  status: RequestStatus;
  createdAt: string;
  technicalStaff?: {
    name: string;
    title?: string;
  };
}

const StatusBadge = ({ status }: { status: RequestStatus }) => {
  let colorClass = '';
  let text = status.toUpperCase();

  switch (status) {
    case RequestStatus.PENDING:
      colorClass = 'bg-yellow-100 text-yellow-800';
      text = 'Beklemede';
      break;
    case RequestStatus.ASSIGNED:
      colorClass = 'bg-blue-100 text-blue-800';
      text = 'İşleme Alındı';
      break;
    case RequestStatus.COMPLETED:
      colorClass = 'bg-green-100 text-green-800';
      text = 'Tamamlandı';
      break;
    case RequestStatus.CANCELLED:
      colorClass = 'bg-red-100 text-red-800';
      text = 'İptal Edildi';
      break;
  }
  return (
    <span className={`px-3 py-1 inline-flex text-xs font-semibold rounded-full ${colorClass}`}>
      {text}
    </span>
  );
};

const PriorityBadge = ({ priority }: { priority: string }) => {
  let color = 'bg-gray-100 text-gray-800';
  let label = 'Normal';

  if (priority === 'HIGH') { color = 'bg-red-100 text-red-800'; label = 'ACİL'; }
  else if (priority === 'MEDIUM') { color = 'bg-orange-100 text-orange-800'; label = 'Orta'; }
  else { color = 'bg-green-100 text-green-800'; label = 'Düşük'; }

  return <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${color}`}>{label}</span>;
}

const formatTRDate = (dateString : string) =>{
  return new Date(dateString).toLocaleString('tr-TR',{
    day : 'numeric',
    month : 'long',
    hour : '2-digit',
    minute : '2-digit'
  })
}

export default function MyRequestsPage() {
  const [requests, setRequests] = useState<ITechnicalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Verileri Çek
  useEffect(() => {
    const fetchRequests = async () => {
      setLoading(true);
      setError(null);
      try {
        // API endpointimiz
        const res = await axios.get('/api/technicalrequests/my'); 
        if(res.data.success) {
            setRequests(res.data.data);
        }
      } catch (err: any) {
        console.error("Talepler yüklenemedi", err);
        setError(err.response?.data?.msg || "Talepler yüklenirken bir hata oluştu.");
      }
      setLoading(false);
    };
    
    fetchRequests();
  }, []); 

  // İptal Fonksiyonu
  const handleCancel = async(requestId: string) =>{
    if(!confirm("Bu talebi iptal etmek istediğinize emin misiniz?")) return;

    try{
      await axios.put('/api/technicalrequests/cancel', { requestId });

      setRequests((prev) =>
        prev.map((req)=>
          req._id === requestId ? {...req, status: RequestStatus.CANCELLED}: req
      ));
    }catch(err : any){
      alert(err.response?.data?.msg || "İptal işlemi başarısız oldu.");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <svg className="h-8 w-8 animate-spin text-orange-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    );
  }

  if (error) {
     return (
       <div className="rounded-md bg-red-100 p-4 border border-red-300">
         <p className="text-sm font-medium text-red-700">{error}</p>
       </div>
     );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <h2 className="text-2xl font-semibold text-gray-800">Teknik Taleplerim</h2>
      </div>
      
      {requests.length === 0 ? (
        <div className="text-center text-gray-500 py-10 border-2 border-dashed border-gray-300 rounded-lg">
          <p>Henüz oluşturulmuş bir teknik destek talebiniz bulunmuyor.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {requests.map((req) => (
            <div key={req._id} className="border border-gray-200 rounded-lg p-4 shadow-sm transition-shadow hover:shadow-md bg-white">
              <div className="flex flex-col sm:flex-row justify-between sm:items-start">
                
                <div className="flex-1 mb-4 sm:mb-0 pr-4">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-semibold text-gray-900">{req.title}</h3>
                    <PriorityBadge priority={req.priority} />
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                    {req.description}
                  </p>

                  <div className="flex flex-wrap gap-4 text-sm text-gray-500 mt-3">
                    <div className="flex items-center gap-1">
                        <span className="font-bold text-gray-700">Konum:</span> 
                        {req.location}
                    </div>
                    <div className="flex items-center gap-1">
                        <span className="font-bold text-gray-700">Tarih:</span> 
                        {formatTRDate(req.createdAt)}
                    </div>
                  </div>
                </div>             

                <div className="shrink-0 ml-0 sm:ml-4 sm:text-right space-y-3 flex flex-col items-start sm:items-end">
                  <StatusBadge status={req.status} />
                  
                  <div className="text-sm text-gray-500">
                    <strong>Tekniker:</strong><br/>
                    {req.technicalStaff ? (
                        <span className="text-gray-800">{req.technicalStaff.name}</span>
                    ) : (
                        <span className="italic text-gray-400">—</span>
                    )}
                  </div>

                  {req.status === RequestStatus.PENDING && (
                    <button 
                        onClick={() => handleCancel(req._id)}
                        className='text-xs font-medium text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded transition-colors flex items-center gap-1 focus:outline-none'
                        title="Talebi İptal Et"
                    >
                      <TrashIcon className='h-5 w-5' />
                      <span>İptal Et</span>
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