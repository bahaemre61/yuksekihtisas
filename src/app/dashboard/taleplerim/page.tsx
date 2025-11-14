'use client'; // Veri çekme (useEffect) ve state (useState) için

import React, { useEffect, useState } from 'react';
import axios from 'axios';

// --- ÇÖZÜM BURADA BAŞLIYOR ---

// 1. HATALI IMPORT'U SİLİN:
// import { RequestStatus } from '@/lib/models/VehicleRequest'; 

// 2. TİPLERİ BURADA YEREL OLARAK TANIMLAYIN:
// (Backend'den import edemeyiz, çünkü bu bir 'use client' dosyası)
enum RequestStatus {
    PENDING = 'pending',
    ASSIGNED = 'assigned',
    COMPLETED = 'completed',
    CANCELLED = 'cancelled'
}

// Araç talebi arayüzü (API'den bu gelecek)
interface IVehicleRequest {
    _id: string;
    purpose: string;
    fromLocation: string;
    toLocation: string;
    status: RequestStatus;
    startTime: string;
    endTime: string;
    createdAt: string;
    assignedDriver?: {
        name: string;
    };
}
// --- ÇÖZÜM BURADA BİTİYOR ---


// Durum (status) için renkli etiket (badge) döndüren yardımcı fonksiyon
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

export default function MyRequestsPage() {
  const [requests, setRequests] = useState<IVehicleRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sayfa yüklendiğinde API'den verileri çek
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
  }, []); // [] -> Sadece sayfa ilk yüklendiğinde 1 kez çalışır

  // 1. Yükleniyor Durumu
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

  // 2. Hata Durumu
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
      
      {/* 3. Boş Durumu (Hiç talep yoksa) */}
      {requests.length === 0 ? (
        <div className="text-center text-gray-500 py-10 border-2 border-dashed border-gray-300 rounded-lg">
          <p>Henüz oluşturulmuş bir talebiniz bulunmuyor.</p>
        </div>
      ) : (
        
        // 4. Veri Varsa: Talepleri Listele
        <div className="space-y-4">
          {requests.map((req) => (
            <div key={req._id} className="border border-gray-200 rounded-lg p-4 shadow-sm">
              <div className="flex justify-between items-start">
                {/* Sol Taraf: Talep Detayları */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{req.purpose}</h3>
                  
                  {/* --- DÜZELTME BURADA --- */}
                  <p className="text-sm text-gray-600 mt-1">
                    {req.fromLocation} &rarr; {req.toLocation}
                  </p> {/* <-- </Screen> değil, </p> olmalıydı */}
                  
                  <p className="text-sm text-gray-500 mt-2">
                    <strong>Gidiş:</strong> {new Date(req.startTime).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    <br />
                    <strong>Dönüş:</strong> {new Date(req.endTime).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </p> {/* <-- </Screen> değil, </p> olmalıydı */}
                  
                  <p className="text-sm text-gray-500 mt-1">
                    <strong>Atanan Şoför:</strong> {req.assignedDriver ? req.assignedDriver.name : 'Henüz atanmadı'}
                  </p> {/* <-- </Screen> değil, </p> olmalıydı */}
                  {/* --- DÜZELTME SONA ERDİ --- */}

                </div>
                
                {/* Sağ Taraf: Durum Etiketi */}
                <div className="shrink-0 ml-4">
                  <StatusBadge status={req.status} />
                </div>
              </div>
            </div>
          ))}
        </div>
   )}

    </div>
  );
}