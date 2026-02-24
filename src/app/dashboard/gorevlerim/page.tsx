'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { 
  MapPinIcon, 
  UserIcon, 
  CheckCircleIcon,
  PlayIcon // Sürüşe başla için daha uygun bir ikon
} from '@heroicons/react/24/solid';

// 📍 ANA ÜS ADRESİ (Garaj veya Merkez Bina)
const ANA_US = "Yüksek İhtisas Üniversitesi - 100. Yıl Yerleşkesi (Tıp Fakültesi)";

export default function DriverTasksPage() {
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMyTasks = async () => {
    try {
      const res = await axios.get('/api/driver/my-tasks');
      setTrips(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchMyTasks(); }, []);

  // 🚗 SÜRÜŞE BAŞLA & DURUM GÜNCELLE
  const handleStartDriving = async (requests: any[]) => {
    if (requests.length === 0) return;

    try {
      // 1. Backend'e şoförün durumunu "busy" (meşgul) yapması için istek atıyoruz
      await axios.patch('/api/driver/update-status', { status: 'busy' });
      
      // 2. Google Maps Rota Hazırlığı (Ana Üs -> Duraklar -> Ana Üs)
      const stops = requests.map(r => encodeURIComponent(r.toLocation.trim()));
      const origin = encodeURIComponent(ANA_US);
      const destination = encodeURIComponent(ANA_US);
      const waypoints = stops.join('|');

      const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&waypoints=${waypoints}&travelmode=driving`;

      // 3. Navigasyonu aç
      window.open(googleMapsUrl, '_blank');
      
      // Arayüzü tazeleyebiliriz (opsiyonel)
      console.log("Sürüş başladı, şoför meşgul moduna alındı.");
    } catch (err) {
      alert("Durum güncellenirken bir hata oluştu, ancak navigasyon açılıyor.");
    }
  };

  const handleCompleteTrip = async (batchId: string) => {
    if (!confirm("Seferi bitirmek istediğinize emin misiniz?")) return;
    try {
      await axios.post('/api/driver/complete-task', { batchId });
      await axios.patch('/api/driver/update-status', { status: 'available' });
      
      fetchMyTasks();
    } catch (err) {
      alert("Hata oluştu.");
    }
  };

  if (loading) return <div className="p-10 text-center font-black text-slate-400 animate-pulse text-xs">Veriler Alınıyor...</div>;

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-6">
      <header className="mb-6 flex justify-between items-center">
        <h1 className="text-xl font-black text-slate-900 tracking-tighter italic uppercase">Görevlerim</h1>
        <div className="bg-green-50 text-green-600 px-3 py-1 rounded-full text-[10px] font-black border border-green-100">
          SİSTEM AKTİF
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {trips.length > 0 ? (
          trips.map((trip, idx) => (
            <div key={idx} className="bg-white rounded-4x1 shadow-sm border border-slate-200 flex flex-col overflow-hidden">
              
              {/* Grup Başlığı */}
              <div className="px-5 py-4 bg-slate-900 text-white flex justify-between items-center">
                <h2 className="text-[11px] font-black uppercase tracking-widest text-blue-400">
                  {trip.title}
                </h2>
                <span className="text-[9px] font-bold bg-white/10 px-2 py-0.5 rounded-lg">Ring Seferi</span>
              </div>

              {/* Yolcu ve Konum Listesi */}
              <div className="p-5 flex-1 space-y-4">
                {trip.requests.map((req: any, rIdx: number) => (
                  <div key={rIdx} className="border-l-2 border-blue-500 pl-4 py-1">
                    <p className="text-sm font-bold text-slate-800">{req.toLocation}</p>
                    <p className="text-[10px] font-medium text-slate-400 mt-0.5">
                      Talep Eden: <span className="text-slate-600 font-bold">{req.requestingUser?.name}</span>
                    </p>
                    <p className='text-[9px] text-slate-500 italic mt-0.5'>Saat: {new Date(req.startTime).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                ))}
              </div>

              {/* Aksiyon Butonları */}
              <div className="p-4 bg-slate-50/50 border-t border-slate-100 grid grid-cols-2 gap-3">
                <button 
                  onClick={() => handleStartDriving(trip.requests)}
                  className="bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-2xl text-[10px] font-black flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-100"
                >
                  <PlayIcon className="h-3.5 w-3.5" /> SÜRÜŞE BAŞLA
                </button>
                <button 
                  onClick={() => handleCompleteTrip(trip.requests[0].batchId)}
                  className="bg-white text-green-600 border border-green-200 hover:bg-green-50 py-3.5 rounded-2xl text-[10px] font-black transition-all flex items-center justify-center gap-2"
                >
                  <CheckCircleIcon className="h-3.5 w-3.5" /> BİTİR
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full py-20 text-center bg-white rounded-[2.5rem] border-2 border-dashed border-slate-100 font-black text-slate-300 text-xs">
            ŞU AN AKTİF GÖREVİNİZ BULUNMUYOR
          </div>
        )}
      </div>
    </div>
  );
}