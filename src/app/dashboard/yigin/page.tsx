'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { 
  MapPinIcon, ClockIcon, UsersIcon, BoltIcon, 
  CalendarDaysIcon, ArrowRightCircleIcon, HandRaisedIcon
} from '@heroicons/react/24/solid';

export default function SmartGroupPage() {
  const [groups, setGroups] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedDrivers, setSelectedDrivers] = useState<{ [key: number]: string }>({});
  const [isAssigning, setIsAssigning] = useState<number | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [gRes, dRes] = await Promise.all([
        axios.get('/api/ai/smart-group'),
        axios.get('/api/admin/all-drivers')
      ]);
      setGroups(gRes.data);
      setDrivers(dRes.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleAssign = async (groupIdx: number, requestIds: string[]) => {
    const driverId = selectedDrivers[groupIdx];
    if (!driverId) { alert("Lütfen önce bir şoför seçin."); return; }
    setIsAssigning(groupIdx);
    try {
      await axios.post('/api/admin/assign-group', { driverId, requestIds });
      alert("Görevler başarıyla atandı!");
      fetchData(); 
    } catch (err) { alert("Hata oluştu."); } 
    finally { setIsAssigning(null); }
  };

  if (loading) return <div className="p-20 text-center text-base-content/50 font-medium animate-pulse">Operasyon planı yükleniyor...</div>;

  return (
    <div className="min-h-screen bg-base-200 p-8">
      {/* ÜST BAR */}
      <header className="flex justify-between items-start mb-12">
        <div>
          <h1 className="text-4xl font-extrabold text-base-content tracking-tight">Akıllı Havuz</h1>
          <p className="text-base-content/70 mt-1 font-medium">Yapay zeka bugün için en verimli rotaları hazırladı.</p>
          <Link 
            href="/dashboard/yigin/manuel-atama"
            className="mt-4 flex items-center gap-2 bg-warning hover:bg-warning/80 text-warning-content px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-warning/20 active:scale-95 w-fit"
          >
            <HandRaisedIcon className="h-4 w-4" /> Manuel Grup Ekleme
          </Link>
        </div>
        <div className="flex gap-4">
          <div className="bg-base-100 px-5 py-3 rounded-2xl shadow-sm border border-base-200 text-center text-info font-black">
             {groups.filter(g => g.isToday).length} Aktif
          </div>
        </div>
      </header>

      {/* BUGÜNÜN TALEPLERİ */}
      <section className="mb-16">
        <div className="flex items-center gap-2 mb-6">
          <BoltIcon className="h-5 w-5 text-warning" />
          <h2 className="text-sm font-black text-base-content uppercase tracking-widest text-[11px]">Canlı Operasyon</h2>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {groups.filter(g => g.isToday).map((group, idx) => (
            <div key={idx} className="bg-base-100 rounded-4xl border border-base-200 shadow-sm flex flex-col overflow-hidden">
              <div className="p-6 border-b border-base-200/50">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-2 bg-info/10 rounded-xl text-info">
                    <MapPinIcon className="h-6 w-6" />
                  </div>
                </div>
                <h3 className="text-lg font-bold text-base-content leading-tight">{group.title}</h3>
                <p className="text-xs text-base-content/50 mt-1 italic leading-relaxed">{group.reason}</p>
              </div>

              {/* TALEPLER LİSTESİ - BURASI GÜNCELLENDİ */}
              <div className="p-6 flex-1 space-y-4">
                {group.requests.map((req: any) => {
                  const start = new Date(req.startTime);
                  const end = new Date(req.endTime);
                  const sH = start.getHours(); const sM = start.getMinutes();
                  const eH = end.getHours(); const eM = end.getMinutes();

                  // Zaman Esnekliği Kontrolü
                  const flexLabel = (sH === 8 && sM === 30 && eH === 12 && eM === 0) ? "ÖĞLEDEN ÖNCE" : 
                                    (sH === 13 && sM === 0 && eH === 17 && eM === 30) ? "ÖĞLEDEN SONRA" : 
                                    (sH === 8 && sM === 30 && eH === 17 && eM === 30) ? "TÜM GÜN" : null;

                  return (
                    <div key={req._id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center text-[10px] font-bold ${req.priority === 'high' ? 'bg-error text-error-content' : 'bg-base-200 text-base-content'}`}>
                          {req.requestingUser?.name?.charAt(0) || 'U'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-base-content">{req.requestingUser?.name}</p>
                            {/* 🔥 ACİL BUTONU */}
                            {req.priority === 'high' && (
                              <span className="text-[8px] font-bold bg-error/20 text-error px-1.5 py-0.5 rounded uppercase">Acil</span>
                            )}
                          </div>
                          <p className="text-[10px] text-base-content/50">{req.fromLocation} → {req.toLocation}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        {/* 🕒 ESNEK ZAMAN VEYA NORMAL SAAT */}
                        <p className={`text-[9px] font-bold ${flexLabel ? 'text-info' : 'text-base-content/70'}`}>
                          {flexLabel || start.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                        {/* 🔄 DÖNÜŞ SAATİ */}
                        <p className="text-[8px] text-base-content/70 font-medium italic">
                          Dönüş: {end.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* ATAMA ALANI */}
              <div className="p-4 bg-base-200/50 border-t border-base-200">
                <div className="flex items-center gap-2">
                  <select 
                    value={selectedDrivers[idx] || ''}
                    onChange={(e) => setSelectedDrivers({ ...selectedDrivers, [idx]: e.target.value })}
                    className="flex-1 bg-base-100 border border-base-300 rounded-xl px-4 py-2.5 text-xs font-bold text-base-content outline-none focus:ring-2 focus:ring-info"
                  >
                    <option value="">Şoför Seç...</option>
                    {drivers.map(d => (
                      <option key={d._id} value={d._id}>{d.name}</option>
                    ))}
                  </select>
                  <button 
                    onClick={() => handleAssign(idx, group.ids)}
                    disabled={isAssigning === idx}
                    className={`p-2.5 rounded-xl transition-all ${isAssigning === idx ? 'bg-base-300 text-base-content' : 'bg-base-content text-base-100 hover:bg-info'} `}
                  >
                    {isAssigning === idx ? (
                      <div className="h-5 w-5 border-2 border-base-content/50 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <ArrowRightCircleIcon className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* GELECEK PLANLAR */}
      <section>
        <div className="flex items-center gap-2 mb-6">
          <CalendarDaysIcon className="h-5 w-5 text-base-content/50" />
          <h2 className="text-sm font-black text-base-content/50 uppercase tracking-widest">Gelecek Günlerin Planı</h2>
        </div>
        <div className="bg-base-100 rounded-3xl border border-base-200 overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead className="bg-base-200/50 text-base-content/50 text-[10px] font-black uppercase tracking-widest">
              <tr>
                <th className="px-8 py-4">Tarih / Saat</th>
                <th className="px-8 py-4">Güzergah</th>
                <th className="px-8 py-4">Kişi</th>
                <th className="px-8 py-4 text-right">Durum</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-base-200">
              {groups.filter(g => !g.isToday).map((group, idx) => (
                <tr key={idx} className="hover:bg-base-200/30 transition-colors">
                  <td className="px-8 py-4">
                    <div className="flex items-center gap-3 text-base-content/50">
                      <ClockIcon className="h-4 w-4" />
                      <span className="text-sm font-medium">
                        {new Date(group.requests[0].startTime).toLocaleDateString('tr-TR')}
                      </span>
                    </div>
                  </td>
                  <td className="px-8 py-4 font-bold text-base-content/80 text-sm">{group.title}</td>
                  <td className="px-8 py-4">
                    <div className="flex items-center gap-1 text-base-content/50 font-bold text-xs">
                      <UsersIcon className="h-4 w-4" /> {group.total} Yolcu
                    </div>
                  </td>
                  <td className="px-8 py-4 text-right">
                    <span className="text-[10px] font-black text-base-content/40 border border-base-300 px-3 py-1 rounded-full uppercase">Kilitli</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}