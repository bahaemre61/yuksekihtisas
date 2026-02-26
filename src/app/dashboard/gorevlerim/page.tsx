'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { 
  ChatBubbleLeftEllipsisIcon, 
  UserIcon, 
  CheckCircleIcon,
  PlayIcon,
  ClockIcon,
  TruckIcon,
  CheckIcon
} from '@heroicons/react/24/solid';

const ANA_US = "Yüksek İhtisas Üniversitesi - 100. Yıl Yerleşkesi (Tıp Fakültesi)";

// --- YARDIMCI BİLEŞEN: GENİŞLEYEBİLİR METİN ---
const ExpandableText = ({ text, limit = 100 }: { text: string, limit?: number }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  if (!text) return <p className="text-xs text-gray-400 italic">Not bırakılmamış.</p>;
  if (text.length <= limit) return <p className="text-xs text-gray-600 italic leading-relaxed">{text}</p>;

  return (
    <div>
      <p className="text-xs text-gray-600 italic leading-relaxed">
        {isExpanded ? text : `${text.substring(0, limit)}...`}
      </p>
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="text-[10px] font-bold text-blue-600 mt-1 uppercase tracking-tighter hover:underline"
      >
        {isExpanded ? '↑ KÜÇÜLT' : '↓ DAHA FAZLA GÖR'}
      </button>
    </div>
  );
};

export default function DriverTasksPage() {
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [completedRequests, setCompletedRequests] = useState<string[]>([]);

  const fetchMyTasks = async () => {
    try {
      const res = await axios.get('/api/driver/my-tasks');
      setTrips(res.data);
    } catch (err) { 
      console.error("Görevler çekilemedi:", err); 
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => { fetchMyTasks(); }, []);

  const openNavigation = (location: string) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(location.trim())}&travelmode=driving`;
  window.open(url, '_blank');
  };

  const markAsDone = async (requestId: string) => {
    try {
      const res = await axios.put(`/api/requests/${requestId}`, { 
        status: 'completed' 
      });
      
      if (res.status === 200) {
        setCompletedRequests(prev => [...prev, requestId]);
      }
    } catch (err) {
      alert("Hata: Durak güncellenemedi.");
    }
  };

  const handleCompleteTrip = async (batchId: string) => {
    if (!confirm("Tüm duraklar bittiyse ve merkeze dönüyorsanız onaylayın.")) return;
    try {
      await axios.post('/api/driver/complete-task', { batchId });
      fetchMyTasks();
    } catch (err) {
      alert("Hata: Sefer kapatılamadı.");
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-[60vh] text-gray-400 font-black text-xs uppercase tracking-[0.3em]">
      GÖREVLER YÜKLENİYOR...
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 space-y-8">
      <header className="border-b border-gray-100 pb-5">
        <h1 className="text-2xl font-black text-gray-800 uppercase tracking-tighter italic">
          GÖREV <span className="text-blue-600">PANELİ</span>
        </h1>
        <p className="text-xs text-gray-400 font-bold uppercase mt-1 tracking-widest">Atanan aktif ring ve münferit seferler.</p>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {trips.length > 0 ? (
          trips.map((trip, idx) => (
            <div key={idx} className="bg-white border border-gray-200 rounded-4x1 overflow-hidden shadow-sm flex flex-col h-full transition-all hover:shadow-md">
              
              {/* Kart Üst Bilgisi */}
              <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <TruckIcon className="h-4 w-4 text-blue-600" />
                  <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                    {trip.requests.length > 1 ? 'Ring Seferi' : 'Münferit Görev'}
                  </span>
                </div>
                <span className="text-[9px] font-black bg-blue-100 text-blue-700 px-3 py-1 rounded-full uppercase">
                  {trip.title || `SEFER #${idx + 1}`}
                </span>
              </div>

              {/* Durak Satırları */}
              <div className="divide-y divide-gray-50 flex-1">
                {trip.requests.map((req: any, rIdx: number) => {
                  const isDone = completedRequests.includes(req._id) || req.status === 'completed';
                  
                  return (
                    <div key={req._id} className={`p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all ${isDone ? 'opacity-40 bg-gray-50/50' : ''}`}>
                      
                      {/* Sol: Durak ve Personel Bilgisi */}
                      <div className="flex-1 space-y-3">
                        <div className="flex items-start gap-4">
                          <div className={`mt-1 h-6 w-6 shrink-0 rounded-full flex items-center justify-center text-[10px] font-black ${isDone ? 'bg-green-500 text-white' : 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'}`}>
                            {isDone ? <CheckIcon className="h-4 w-4 stroke-[3px]" /> : rIdx + 1}
                          </div>
                          <div className="flex-1">
                            <p className={`text-sm font-black ${isDone ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                              {req.toLocation}
                            </p>
                            <div className="flex flex-wrap items-center gap-4 mt-2">
                              <span className="text-[10px] text-gray-500 flex items-center gap-1 font-bold uppercase">
                                <UserIcon className="h-3.5 w-3.5" /> {req.requestingUser?.name}
                              </span>
                              <span className="text-[10px] text-blue-600 flex items-center gap-1 font-black bg-blue-50 px-2 py-0.5 rounded-lg">
                                <ClockIcon className="h-3.5 w-3.5" /> {new Date(req.startTime).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Önemli Not (Expandable) */}
                        <div className="ml-10 bg-slate-50 border-l-2 border-slate-200 p-3 rounded-r-xl">
                          <div className="flex items-center gap-1 text-[9px] font-black text-gray-400 uppercase mb-1 tracking-tighter">
                            <ChatBubbleLeftEllipsisIcon className="h-3 w-3" /> Personel Notu
                          </div>
                          <ExpandableText text={req.purpose} />
                        </div>
                      </div>

                      {/* Sağ: Aksiyon Butonları */}
                      <div className="flex items-center gap-3 pl-10 md:pl-0">
                        {!isDone ? (
                          <>
                            <button 
                              onClick={() => openNavigation(req.toLocation)}
                              className="p-3 bg-white border border-gray-200 text-blue-600 rounded-2xl hover:bg-blue-50 transition-all active:scale-90 shadow-sm"
                              title="Yol Tarifi Al"
                            >
                              <PlayIcon className="h-6 w-6" />
                            </button>
                            <button 
                              onClick={() => markAsDone(req._id)}
                              className="flex items-center gap-2 px-6 py-3 bg-white border border-green-200 text-green-600 rounded-2xl hover:bg-green-50 transition-all active:scale-95 text-[11px] font-black uppercase tracking-widest shadow-sm"
                            >
                              <CheckCircleIcon className="h-6 w-6" />
                              TAMAMLA
                            </button>
                          </>
                        ) : (
                          <div className="flex items-center gap-1 text-green-600 font-black text-[10px] uppercase bg-green-50 px-4 py-3 rounded-2xl border border-green-100">
                            <CheckCircleIcon className="h-5 w-5" /> Durak Bitti
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Kart Altı: Tüm Seferi Kapatma */}
              <div className="p-5 bg-gray-50 border-t border-gray-100">
                  <button 
                    onClick={() => handleCompleteTrip(trip.requests[0].batchId || trip.requests[0]._id)}
                    className="w-full py-4 bg-gray-800 hover:bg-black text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-xl active:scale-95"
                  >
                    Bütün Rotayı Bitir
                  </button>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full py-24 text-center bg-white border-2 border-dashed border-gray-100 rounded-[3rem]">
            <p className="text-xs font-black text-gray-300 uppercase tracking-[0.4em]">Bekleyen Görev Bulunmuyor</p>
          </div>
        )}
      </div>
    </div>
  );
}