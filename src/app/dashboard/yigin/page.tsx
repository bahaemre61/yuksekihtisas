'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';

enum RequestStatus{
  PENDING = 'pending',
  ASSIGNED = 'assigned',
  COMPLETED = 'completed',
  CANCELLED ='cancelled',
}

interface  IRequestingUser {
  _id: string;
  name : string;
  email : string;
} 

interface IVehicleRequest{
  _id : string;
  purpose : string;
  fromLocation : string;
  toLocation : string;
  status : RequestStatus;
  startTime : string;
  endTime : string;
  createdAt: string;
  requestingUser : IRequestingUser;
}

const formatTRDate = (datestring: string) => {
  return new Date(datestring).toLocaleString('tr-TR', {
    day: '2-digit',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });
};


export default function pendingRequestPage(){
  const [requests, setRequests] = useState<IVehicleRequest[]>([]);
  const[loading, setLoading] = useState(true);
  const[error, setError] = useState<string | null>(null);
  const[assigningId, setAssigningId] = useState<string | null>(null);
  const router = useRouter();


  const fetchPendingRequest = async () => {
    setLoading(true);
    setError(null);
    try{
      const res = await axios.get('/api/requests/pending')
      setRequests(res.data);
    }catch (err : any){
      console.error("Bekleyen Talepler yüklenemedi",err)
      setError(err.response?.data?.msg || "Talepler yüklenirken bir hata oluştu");
    }
    setLoading(false);
  };
  
  useEffect(()=> {
    fetchPendingRequest();
  },[]);

  const handleAssignJob = async (requestId : string) =>{
    setAssigningId(requestId);
    setError(null);
  

  try{
    //await axios.put(`/api/requests/${requestId}/assign`);
       await new Promise(resolve => setTimeout(resolve, 2000));
      alert(`Test: ${requestId} ID'li işi kabul ettiniz!`);
  }catch(err : any){
    console.error("İş Kabul edilmedi")
    setError(err.response?.data.msg || "İş Kabul edilirken bir hata oluştu");
  }finally{
    setAssigningId(null);
  }
}
if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <svg className="h-8 w-8 animate-spin text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            {/* ... spinner svg ... */}
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
      <h2 className="text-2xl font-semibold text-gray-800 mb-6">Talep Yığını (Bekleyen İşler)</h2>
      
      {requests.length === 0 ? (
        <div className="text-center text-gray-500 py-10 border-2 border-dashed border-gray-300 rounded-lg">
          <p>Şu anda bekleyen bir talep bulunmuyor.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {requests.map((req) => (
            <div key={req._id} className="border border-gray-200 rounded-lg p-4 shadow-sm">
              <div className="flex flex-col sm:flex-row justify-between">
                
                {/* Sol Taraf: Talep Detayları */}
                <div className="flex-1 mb-4 sm:mb-0">
                  <h3 className="text-lg font-semibold text-gray-900">{req.purpose}</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    <span className="font-medium">Güzergah:</span> {req.fromLocation} &rarr; {req.toLocation}
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    <span className="font-medium">Gidiş:</span> {formatTRDate(req.startTime)}
                    <br />
                    <span className="font-medium">Dönüş:</span> {formatTRDate(req.endTime)}
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    <span className="font-medium">Talep Eden:</span> {req.requestingUser.name} ({req.requestingUser.email})
                  </p>
                </div>
                
                
                <div className="shrink-0 ml-0 sm:ml-4 flex flex-col items-stretch sm:items-end justify-between">
                  
                  <button
                    onClick={() => handleAssignJob(req._id)}
                    disabled={assigningId === req._id} 
                    className="flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-gray-400"
                  >
                    {assigningId === req._id ? (
                      <svg className="h-5 w-5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        {/* ... spinner svg ... */}
                      </svg>
                    ) : (
                      'İşi Kabul Et'
                    )}
                  </button>
                  <p className="text-xs text-gray-400 mt-2 text-right">
                    Oluşturulma: {new Date(req.createdAt).toLocaleString('tr-TR')}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
