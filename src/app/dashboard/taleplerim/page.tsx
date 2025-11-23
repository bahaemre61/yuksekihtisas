'use client'; 

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { request } from 'http';
import { TrashIcon } from '@heroicons/react/24/outline';

enum RequestStatus {
    PENDING = 'pending',
    ASSIGNED = 'assigned',
    COMPLETED = 'completed',
    CANCELLED = 'cancelled'
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
    willCarryItems: boolean;
    assignedDriver?: {
        name: string;
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
      text = 'Atandı';
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

const formatTRDate = (dateString : string) =>{
  return new Date(dateString).toLocaleString('tr-TR',{
    day : '2-digit',
    month : 'long',
    hour : '2-digit',
    minute : '2-digit'
  } )
}

export default function MyRequestsPage() {
  const [requests, setRequests] = useState<IVehicleRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);


  useEffect(() => {
    const fetchRequests = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await axios.get('/api/requests/my'); 
        setRequests(res.data);
      } catch (err: any) {
        console.error("Talepler yüklenemedi", err);
        setError(err.response?.data?.msg || "Talepler yüklenirken bir hata oluştu.");
      }
      setLoading(false);
    };
    
    fetchRequests();
  }, []); 

  const handleCancel = async(requestsId: string) =>{
    if(!confirm("Bu talebi iptal etmek istediğinize emin misiniz")) return;

    try{
      await axios.put(`/api/requests/${requestsId}/cancel`);

      setRequests((prev) =>
      prev.map((req)=>
      req._id === requestsId ? {...req, status: RequestStatus.CANCELLED}: req
    ));
    }catch(err : any){
      alert(err.response?.data?.msg || "İptal işlemi başarısız oldu.");
    }
  };


  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <svg className="h-8 w-8 animate-spin text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
    <div className="bg-white p-6 rounded-lg shadow-lg">
      <h2 className="text-2xl font-semibold text-gray-800 mb-6">Araç Taleplerim</h2>
      
     
      {requests.length === 0 ? (
        <div className="text-center text-gray-500 py-10 border-2 border-dashed border-gray-300 rounded-lg">
          <p>Henüz oluşturulmuş bir talebiniz bulunmuyor.</p>
        </div>
      ) : (
        
        
        <div className="space-y-5">
          {requests.map((req) => (
            <div key={req._id} className="border border-gray-200 rounded-lg p-4 shadow-sm transition-shadow hover:shadow-md">
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
                  <button onClick={() => handleCancel(req._id)}
                  className='mt-2 text-xs font-medium text-red-600 hover:text-red-800 hover:underline focus:outline-none'
                  >
                    <TrashIcon className='h-5 w-5'></TrashIcon>
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