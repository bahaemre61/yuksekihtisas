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
  CheckIcon,
  SunIcon,
  CloudIcon,
  CalendarDaysIcon,
  ExclamationTriangleIcon, 
  ArrowPathRoundedSquareIcon,
  SparklesIcon,
  ArrowRightIcon
} from '@heroicons/react/24/solid';

const ExpandableText = ({ text, limit = 100 }: { text: string, limit?: number }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  if (!text) return <p className="text-xs text-gray-400 italic">Not bırakılmamış.</p>;
  if (text.length <= limit) return <p className="text-xs text-gray-600 italic leading-relaxed">{text}</p>;

  return (
    <div>
      <p className="text-xs text-gray-600 italic leading-relaxed">
        {isExpanded ? text : `${text.substring(0, limit)}...`}
      </p>
      <button onClick={() => setIsExpanded(!isExpanded)} className="text-[10px] font-bold text-blue-600 mt-1 uppercase tracking-tighter hover:underline">
        {isExpanded ? '↑ KÜÇÜLT' : '↓ DAHA FAZLA GÖR'}
      </button>
    </div>
  );
};

export default function DriverTasksPage() {
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [completedRequests, setCompletedRequests] = useState<string[]>([]);

  // ✅ ZAMAN KONTROLÜ (Sayısal Karşılaştırma)
  const getFlexTimeLabel = (startTime: string, endTime: string) => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const sH = start.getHours(); const sM = start.getMinutes();
    const eH = end.getHours(); const eM = end.getMinutes();

    if (sH === 8 && sM === 30 && eH === 12 && eM === 0) return { label: "ÖĞLEDEN ÖNCE", color: "bg-amber-100 text-amber-700 border-amber-200", icon: <CloudIcon className="h-3 w-3" /> };
    if (sH === 13 && sM === 0 && eH === 17 && eM === 30) return { label: "ÖĞLEDEN SONRA", color: "bg-orange-100 text-orange-700 border-orange-200", icon: <SunIcon className="h-3 w-3" /> };
    if (sH === 8 && sM === 30 && eH === 17 && eM === 30) return { label: "TÜM GÜN", color: "bg-indigo-100 text-indigo-700 border-indigo-200", icon: <CalendarDaysIcon className="h-3 w-3" /> };
    
    return { label: start.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }), color: "bg-blue-100 text-blue-700 border-blue-200", icon: <ClockIcon className="h-3.5 w-3.5" /> };
  };

  const fetchMyTasks = async () => {
    try {
      const res = await axios.get('/api/driver/my-tasks');
      setTrips(res.data);
    } catch (err) { console.error(err); } 
    finally { setLoading(false); }
  };

  useEffect(() => { fetchMyTasks(); }, []);

  const openNavigation = (location: string) => {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(location.trim())}&travelmode=driving`, '_blank');
  };

  const markAsDone = async (requestId: string) => {
    try {
      await axios.put(`/api/requests/${requestId}`, { status: 'completed' });
      setCompletedRequests(prev => [...prev, requestId]);
    } catch (err) { alert("Hata: Durak güncellenemedi."); }
  };

  const handleCompleteTrip = async (batchId: string) => {
    if (!confirm("Seferi bitirmek istediğinize emin misiniz?")) return;
    try {
      await axios.post('/api/driver/complete-task', { batchId });
      fetchMyTasks();
    } catch (err) { alert("Hata: Sefer kapatılamadı."); }
  };

  if (loading) return <div className="flex items-center justify-center h-[60vh] text-gray-400 font-black text-xs uppercase tracking-[0.3em]">GÖREVLER YÜKLENİYOR...</div>;

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 space-y-8">
      <header className="border-b border-gray-100 pb-5">
        <h1 className="text-2xl font-black text-gray-800 uppercase tracking-tighter italic">GÖREV <span className="text-blue-600">PANELİ</span></h1>
        <p className="text-xs text-gray-400 font-bold uppercase mt-1 tracking-widest">Atanan aktif ring ve münferit seferler.</p>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {trips.map((trip, idx) => (
          <div key={idx} className="bg-white border border-gray-200 rounded-4xl overflow-hidden shadow-sm flex flex-col h-full transition-all hover:shadow-md">
            
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <TruckIcon className="h-4 w-4 text-blue-600" />
                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{trip.requests.length > 1 ? 'Ring Seferi' : 'Münferit Görev'}</span>
              </div>
              <span className="text-[9px] font-black bg-blue-100 text-blue-700 px-3 py-1 rounded-full uppercase">{trip.title || `SEFER #${idx + 1}`}</span>
            </div>

            <div className="divide-y divide-gray-50 flex-1">
              {trip.requests.map((req: any, rIdx: number) => {
                const isDone = completedRequests.includes(req._id) || req.status === 'completed';
                const timeInfo = getFlexTimeLabel(req.startTime, req.endTime);
                
                const isOneWay = req.purpose?.includes('[Tek Yön]');
                const isRoundTrip = !isOneWay;
                const cleanPurpose = req.purpose?.replace('[Tek Yön] ', '') || '';
                
                return (
                  <div key={req._id} className={`p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all ${isDone ? 'opacity-40 bg-gray-50/50' : ''}`}>
                    <div className="flex-1 space-y-3">
                      <div className="flex items-start gap-4">
                        <div className={`mt-1 h-6 w-6 shrink-0 rounded-full flex items-center justify-center text-[10px] font-black ${isDone ? 'bg-green-500 text-white' : 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'}`}>{isDone ? <CheckIcon className="h-4 w-4 stroke-[3px]" /> : rIdx + 1}</div>
                        <div className="flex-1">
                          
                          {/* Üst Satır: Hedef ve Aciliyet Durumu */}
                          <div className="flex items-center gap-3">
                            <div className={`flex flex-wrap items-center gap-2 ${isDone ? 'opacity-50 grayscale' : ''}`}>
                        {/* KALKIŞ */}
                        <div className="flex items-center gap-2 bg-gray-100 px-3 py-1.5 rounded-xl border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(17,24,39,1)]">
                         <span className="text-[8px] font-black text-blue-600 uppercase italic">BAŞLANGIÇ</span>
                          <span className={`text-[11px] font-black uppercase ${isDone ? 'line-through' : 'text-gray-900'}`}>
                          {req.fromLocation}
                         </span>
                          </div>

                           {/* VARIŞ */}
                              <div className="flex items-center gap-2 bg-blue-600 px-3 py-1.5 rounded-xl border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(17,24,39,1)]">
                             <span className="text-[8px] font-black text-white/70 uppercase italic">HEDEF</span>
                             <span className={`text-[11px] font-black uppercase ${isDone ? 'line-through' : 'text-white'}`}>
                             {req.toLocation}
                              </span>
                             </div>
                            </div>
                            {/* 🔥 ACİLİYET ETİKETİ */}
                            {req.priority === 'high' && !isDone && (
                              <span className="flex items-center gap-1 bg-red-100 text-red-700 px-2 py-0.5 rounded-lg font-black text-[9px] border border-red-200 animate-pulse uppercase">
                                <ExclamationTriangleIcon className="h-3 w-3" /> ACİL
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-2">
                            {/* Personel İsmi */}
                            <span className="text-[10px] text-gray-500 flex items-center gap-1 font-bold uppercase">
                              <UserIcon className="h-3.5 w-3.5" /> {req.requestingUser?.name}
                            </span>
                            
                            {/* Gidiş/Esnek Zaman Etiketi */}
                            <span className={`text-[10px] flex items-center gap-1 font-black px-2 py-0.5 rounded-lg border ${timeInfo.color}`}>
                              {timeInfo.icon} {timeInfo.label}
                            </span>

                            {/* DÖNÜŞ ZAMANI VE SEYAHAT TİPİ ETİKETİ */}
                            {!isDone && (
                              <>
                                {isOneWay && (
                                  <span className="text-[10px] text-purple-600 flex items-center gap-1 font-black uppercase bg-purple-50 px-2 py-0.5 rounded-lg border border-purple-200">
                                    <ArrowRightIcon className="h-3.5 w-3.5" /> TEK YÖN
                                  </span>
                                )}
                                {isRoundTrip && (
                                  <span className="text-[10px] text-gray-400 flex items-center gap-1 font-black uppercase bg-gray-50 px-2 py-0.5 rounded-lg border border-gray-100">
                                    <ArrowPathRoundedSquareIcon className="h-3.5 w-3.5 text-gray-400" /> 
                                    DÖNÜŞ: {new Date(req.endTime).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="ml-10 bg-slate-50 border-l-2 border-slate-200 p-3 rounded-r-xl">
                        <div className="flex items-center gap-1 text-[9px] font-black text-gray-400 uppercase mb-1 tracking-tighter"><ChatBubbleLeftEllipsisIcon className="h-3 w-3" /> Personel Notu</div>
                        <ExpandableText text={cleanPurpose} />
                      </div>
                    </div>

                    <div className="flex items-center gap-3 pl-10 md:pl-0">
                      {!isDone && (
                        <>
                          <button onClick={() => openNavigation(req.toLocation)} className="p-3 bg-white border border-gray-200 text-blue-600 rounded-2xl hover:bg-blue-50 transition-all active:scale-90 shadow-sm"><PlayIcon className="h-6 w-6" /></button>
                          <button onClick={() => markAsDone(req._id)} className="flex items-center gap-2 px-6 py-3 bg-white border border-green-200 text-green-600 rounded-2xl hover:bg-green-50 transition-all active:scale-95 text-[11px] font-black uppercase tracking-widest shadow-sm"><CheckCircleIcon className="h-6 w-6" /> TAMAMLA</button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-5 bg-gray-50 border-t border-gray-100">
              <button onClick={() => handleCompleteTrip(trip.requests[0].batchId || trip.requests[0]._id)} className="w-full py-4 bg-gray-800 hover:bg-black text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-xl active:scale-95">Bütün Rotayı Bitir</button>
            </div>
          </div>
        ))}
      </div>
      {/* SAĞ: REHBER (Sticky) */}
        <div className="lg:col-span-4 lg:sticky lg:top-10 space-y-8 order-2 lg:order-last">
          <div className="bg-gray-900 rounded-[3rem] p-8 text-white shadow-2xl relative border-b-8 border-blue-600">
            <h3 className="text-xl font-black uppercase tracking-tighter mb-8 flex items-center gap-3">
              <SparklesIcon className="h-6 w-6 text-blue-400" /> OPERASYON KILAVUZU
            </h3>
            
            <div className="space-y-10">
              {[
                { l: "ÖĞLEDEN ÖNCE", i: <CloudIcon className="h-6 w-6 text-amber-400" />, d: "08:30 - 12:00 arası rotayı tamamlayın." },
                { l: "ÖĞLEDEN SONRA", i: <SunIcon className="h-6 w-6 text-orange-400" />, d: "13:00 - 17:30 arası rotayı tamamlayın." },
                { l: "TÜM GÜN", i: <CalendarDaysIcon className="h-6 w-6 text-indigo-400" />, d: "Diğer işlerin yanında herhangi bir saate tamamlayın." }
              ].map((item, i) => (
                <div key={i} className="flex gap-4 items-start group">
                  <div className="p-3 bg-white/5 rounded-2xl border border-white/10 group-hover:bg-blue-600/20 group-hover:border-blue-500/50 transition-all">{item.i}</div>
                  <div>
                    <span className="block text-xs font-black text-white uppercase tracking-widest mb-1">{item.l}</span>
                    <p className="text-[11px] text-gray-400 font-bold leading-relaxed">{item.d}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-amber-100 rounded-4xl p-8 border-4 border-gray-900 shadow-[8px_8px_0px_0px_rgba(17,24,39,1)]">
            <p className="text-[10px] font-black text-gray-900 uppercase mb-2 flex items-center gap-2">
              <ExclamationTriangleIcon className="h-5 w-5" /> Önemli Hatırlatma
            </p>
            <p className="text-xs font-black leading-relaxed text-gray-700 italic">
              "Kırmızı ACİL etiketi olan talepler bekletilmemelidir. Diğer esnek zamanlı (Öğleden Önce vb.) işleri bu rotaların üzerine ekleyerek yakıt tasarrufu sağlayın."
            </p>
          </div>
        </div>
      </div>
  
  );
}