'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { 
  MapPinIcon, ClockIcon, UsersIcon, BoltIcon, 
  CalendarDaysIcon, ArrowRightCircleIcon, EllipsisVerticalIcon 
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
    
    if (!driverId) {
      alert("Lütfen önce bir şoför seçin.");
      return;
    }

    setIsAssigning(groupIdx);
    try {
      await axios.post('/api/admin/assign-group', {
        driverId,
        requestIds
      });
      
      alert("Görevler başarıyla atandı!");
      fetchData(); 
    } catch (err) {
      console.error(err);
      alert("Atama sırasında bir hata oluştu.");
    } finally {
      setIsAssigning(null);
    }
  };

  if (loading) return <div className="p-20 text-center text-slate-400 font-medium animate-pulse">Operasyon planı yükleniyor...</div>;

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-8">
      {/* ÜST BAR (Aynı Kalıyor) */}
      <header className="flex justify-between items-start mb-12">
        <div>
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Akıllı Havuz</h1>
          <p className="text-slate-500 mt-1 font-medium">Yapay zeka bugün için en verimli rotaları hazırladı.</p>
        </div>
        <div className="flex gap-4">
          <div className="bg-white px-5 py-3 rounded-2xl shadow-sm border border-slate-100 text-center text-blue-600 font-black">
             {groups.filter(g => g.isToday).length} Aktif
          </div>
        </div>
      </header>

      {/* BUGÜNÜN TALEPLERİ */}
      <section className="mb-16">
        <div className="flex items-center gap-2 mb-6">
          <BoltIcon className="h-5 w-5 text-amber-500" />
          <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest text-[11px]">Canlı Operasyon</h2>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {groups.filter(g => g.isToday).map((group, idx) => (
            <div key={idx} className="bg-white rounded-4x1 border border-slate-200 shadow-sm flex flex-col overflow-hidden">
              <div className="p-6 border-b border-slate-50">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-2 bg-blue-50 rounded-xl text-blue-600">
                    <MapPinIcon className="h-6 w-6" />
                  </div>
                </div>
                <h3 className="text-lg font-bold text-slate-900 leading-tight">{group.title}</h3>
                <p className="text-xs text-slate-400 mt-1 italic leading-relaxed">{group.reason}</p>
              </div>

              <div className="p-6 flex-1 space-y-4">
                {group.requests.map((req: any) => (
                  <div key={req._id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 bg-slate-100 rounded-full flex items-center justify-center text-[10px] font-bold">
                        {req.requestingUser?.name?.charAt(0) || 'U'}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-700">{req.requestingUser?.name}</p>
                        <p className="text-[10px] text-slate-400">{req.toLocation}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-slate-500">{new Date(req.startTime).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                ))}
              </div>

              {/* ATAMA ALANI: ARTIK ÇALIŞIYOR */}
              <div className="p-4 bg-slate-50/50 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <select 
                    value={selectedDrivers[idx] || ''}
                    onChange={(e) => setSelectedDrivers({ ...selectedDrivers, [idx]: e.target.value })}
                    className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Şoför Seç...</option>
                    {drivers.map(d => (
                      <option key={d._id} value={d._id}>{d.name}</option>
                    ))}
                  </select>
                  <button 
                    onClick={() => handleAssign(idx, group.ids)}
                    disabled={isAssigning === idx}
                    className={`p-2.5 rounded-xl transition-all ${isAssigning === idx ? 'bg-slate-400' : 'bg-slate-900 hover:bg-blue-600'} text-white`}
                  >
                    {isAssigning === idx ? (
                      <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
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

      {/* GELECEK PLANLAR: LİSTE GÖRÜNÜMÜ */}
      <section>
        <div className="flex items-center gap-2 mb-6">
          <CalendarDaysIcon className="h-5 w-5 text-slate-400" />
          <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest">Gelecek Günlerin Planı</h2>
        </div>

        <div className="bg-white rounded-3x1 border border-slate-200 overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50/50 text-slate-400 text-[10px] font-black uppercase tracking-widest">
              <tr>
                <th className="px-8 py-4">Tarih / Saat</th>
                <th className="px-8 py-4">Güzergah</th>
                <th className="px-8 py-4">Kişi</th>
                <th className="px-8 py-4 text-right">Durum</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {groups.filter(g => !g.isToday).map((group, idx) => (
                <tr key={idx} className="hover:bg-slate-50/30 transition-colors">
                  <td className="px-8 py-4">
                    <div className="flex items-center gap-3 text-slate-400">
                      <ClockIcon className="h-4 w-4" />
                      <span className="text-sm font-medium">
                        {new Date(group.requests[0].startTime).toLocaleDateString('tr-TR')}
                      </span>
                    </div>
                  </td>
                  <td className="px-8 py-4 font-bold text-slate-600 text-sm">{group.title}</td>
                  <td className="px-8 py-4">
                    <div className="flex items-center gap-1 text-slate-400 font-bold text-xs">
                      <UsersIcon className="h-4 w-4" /> {group.total} Yolcu
                    </div>
                  </td>
                  <td className="px-8 py-4 text-right">
                    <span className="text-[10px] font-black text-slate-300 border border-slate-200 px-3 py-1 rounded-full uppercase">Kilitli</span>
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