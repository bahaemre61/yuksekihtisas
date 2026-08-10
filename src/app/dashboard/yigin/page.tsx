'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import axios from 'axios';
import {
  MapPinIcon, ClockIcon, UsersIcon, BoltIcon,
  CalendarDaysIcon, ArrowRightCircleIcon, HandRaisedIcon,
  CpuChipIcon, CheckCircleIcon, SparklesIcon, ShieldCheckIcon
} from '@heroicons/react/24/solid';

export default function SmartGroupPage() {
  const [groups, setGroups] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedDrivers, setSelectedDrivers] = useState<{ [key: number]: string }>({});
  const [isAssigning, setIsAssigning] = useState<number | null>(null);

  // Otonom Bot State
  const [botLogs, setBotLogs] = useState<string[]>([]);
  const [isBotRunning, setIsBotRunning] = useState(false);
  const [lastBotRunTime, setLastBotRunTime] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [gRes, dRes] = await Promise.all([
        axios.get('/api/ai/smart-group'),
        axios.get('/api/admin/all-drivers')
      ]);
      setGroups(gRes.data);
      setDrivers(dRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Otonom Dispeçer Botunu Tetikleme Fonksiyonu
  const triggerAutoAssignBot = async (slot?: string) => {
    setIsBotRunning(true);
    try {
      const param = slot ? `?slot=${slot}&force=true` : '?force=true';
      const res = await axios.post(`/api/cron/auto-assign${param}`);

      if (res.data.success && res.data.result) {
        const result = res.data.result;
        setLastBotRunTime(result.timestamp);

        if (result.details && result.details.length > 0) {
          setBotLogs(prev => [...result.details, ...prev]);
        } else {
          setBotLogs(prev => [`[${result.timestamp}] Bot kontrolü tamamlandı: Bekleyen yeni talep bulunmuyor.`, ...prev]);
        }

        if (result.assignedRequestsCount > 0) {
          alert(`🤖 Otonom Dispeçer Botu: ${result.assignedRequestsCount} talep (${result.assignedGroupsCount} grup) şoförlere otomatik atandı!`);
        }
      }
      fetchData();
    } catch (err: any) {
      console.error('Otonom Bot çalıştırma hatası:', err);
      alert('Otonom bot çalıştırılırken bir hata oluştu.');
    } finally {
      setIsBotRunning(false);
    }
  };

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

  if (loading) return <div className="p-20 text-center text-base-content/50 font-medium animate-pulse">Operasyon planı ve dispeçer botu yükleniyor...</div>;

  const todayGroups = groups.filter(g => g.isToday);
  const futureGroups = groups.filter(g => !g.isToday);

  return (
    <div className="min-h-screen bg-base-200 p-8 space-y-10">
      {/* ÜST BAR */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-extrabold text-base-content tracking-tight flex items-center gap-3">
            <CpuChipIcon className="h-10 w-10 text-primary" />
            Akıllı Havuz & Otonom Dispeçer Botu
          </h1>
          <p className="text-base-content/70 mt-1 font-medium">
            Araç talepleri yerleşke ve güzergahlara göre gruplanır; sabah 08:30 ve öğle 13:30 nöbetlerinde otonom olarak şoförlere dağıtılır.
          </p>
          <div className="flex items-center gap-3 mt-4 flex-wrap">
            <Link
              href="/dashboard/yigin/manuel-atama"
              className="flex items-center gap-2 bg-warning hover:bg-warning/80 text-warning-content px-5 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all shadow-md active:scale-95"
            >
              <HandRaisedIcon className="h-4 w-4" /> Manuel Grup Ekleme
            </Link>

            <button
              onClick={() => triggerAutoAssignBot()}
              disabled={isBotRunning}
              className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-5 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all shadow-md active:scale-95 disabled:opacity-50"
            >
              {isBotRunning ? (
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <SparklesIcon className="h-4 w-4" />
              )}
              <span>Otonom Botu Çalıştır</span>
            </button>
          </div>
        </div>

        <div className="flex gap-3">
          <div className="bg-base-100 px-6 py-4 rounded-3xl shadow-sm border border-base-200 text-center">
            <div className="text-[10px] font-black uppercase text-base-content/50">Aktif Gruplar</div>
            <div className="text-2xl font-black text-primary mt-0.5">{todayGroups.length} İş</div>
          </div>
        </div>
      </header>

      {/* 🤖 OTONOM CANLI DİSPEÇER BOTU DURUM KARTI */}
      <section className="bg-base-100 rounded-3xl border border-base-200 p-6 md:p-8 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-base-200 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-500/10 text-emerald-600 rounded-2xl relative">
              <CpuChipIcon className="h-7 w-7" />
              <span className="absolute top-2 right-2 h-2.5 w-2.5 rounded-full bg-emerald-500 animate-ping" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-base-content">Otonom Dispeçer Botu Nöbetçisi</h2>
                <span className="badge badge-success text-white font-bold text-[10px]">🟢 CANLI</span>
              </div>
              <p className="text-xs text-base-content/60 mt-0.5">
                İnsan müdahalesi olmadan 08:30 ve 13:30 vardiyalarında otomatize dağıtım yapar, acil talepleri anında şoföre atar.
              </p>
            </div>
          </div>

          {lastBotRunTime && (
            <div className="text-xs font-bold text-base-content/60 bg-base-200 px-3.5 py-1.5 rounded-xl self-start md:self-auto">
              Son Bot Kontrolü: <span className="text-primary font-mono">{lastBotRunTime}</span>
            </div>
          )}
        </div>

        {/* Nöbet Kural Kartları */}
        {/* <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-base-200/50 rounded-2xl border border-base-200 space-y-1">
            <div className="font-extrabold text-xs text-primary flex items-center gap-1.5">
              <ClockIcon className="h-4 w-4" />
              🌅 Sabah Vardiyası (08:30 Nöbeti)
            </div>
            <p className="text-[11px] text-base-content/70 leading-relaxed">
              Her sabah saat 08:30'da <strong>Öğleden Önce (08:30-12:00)</strong> talepleri otomatik gruplayıp şoförlere bağlar.
            </p>
          </div>

          <div className="p-4 bg-base-200/50 rounded-2xl border border-base-200 space-y-1">
            <div className="font-extrabold text-xs text-secondary flex items-center gap-1.5">
              <ClockIcon className="h-4 w-4" />
              ☀️ Öğle Vardiyası (13:30 Nöbeti)
            </div>
            <p className="text-[11px] text-base-content/70 leading-relaxed">
              Her gün saat 13:30'da <strong>Öğleden Sonra (13:00-17:30)</strong> taleplerini otomatik derler, müsait şoförlere atar ve push bildirimi gönderir.
            </p>
          </div>

          <div className="p-4 bg-rose-500/10 rounded-2xl border border-rose-500/20 space-y-1">
            <div className="font-extrabold text-xs text-rose-600 flex items-center gap-1.5">
              <BoltIcon className="h-4 w-4" />
              🚨 Acil Talep Anında Olay Botu
            </div>
            <p className="text-[11px] text-base-content/70 leading-relaxed">
              <strong>Acil</strong> talep açıldığında otomatik atama yapar ve personel ve şoförler bilgilendirilir.
            </p>
          </div>
        </div> */}

        {/* Bot Log Akışı (Canlı Günlük) */}
        {botLogs.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-base-200">
            <div className="text-xs font-bold text-base-content/60 flex items-center gap-1.5">
              <ShieldCheckIcon className="h-4 w-4 text-emerald-600" />
              Son Otonom Atama Günlüğü (Canlı Log Akışı):
            </div>
            <div className="max-h-40 overflow-y-auto bg-base-200/70 p-3 rounded-2xl text-[11px] font-mono space-y-1 border border-base-200">
              {botLogs.map((log, i) => (
                <div key={i} className="text-base-content/80 flex items-start gap-2">
                  <span className="text-primary font-bold">•</span>
                  <span>{log}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* BUGÜNÜN TALEPLERİ / CANLI OPERASYON */}
      <section className="mb-16">
        <div className="flex items-center gap-2 mb-6">
          <BoltIcon className="h-5 w-5 text-warning" />
          <h2 className="text-sm font-black text-base-content uppercase tracking-widest text-[11px]">Canlı Operasyon Havuzu</h2>
        </div>

        {todayGroups.length === 0 ? (
          <div className="p-12 text-center bg-base-100 border-2 border-dashed border-base-300 rounded-3xl space-y-2">
            <CheckCircleIcon className="h-12 w-12 text-emerald-500 mx-auto" />
            <div className="font-bold text-base text-base-content">Bugün için tüm talepler atanmış veya bekleyen talep yok!</div>
            <p className="text-xs text-base-content/60">Bot yeni bir talep geldiğinde otomatik olarak devreye girecektir.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {todayGroups.map((group, idx) => (
              <div key={idx} className="bg-base-100 rounded-4xl border border-base-200 shadow-sm flex flex-col overflow-hidden hover:border-primary/30 transition-all">
                <div className="p-6 border-b border-base-200/50 bg-base-100">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-2.5 bg-primary/10 rounded-2xl text-primary">
                      <MapPinIcon className="h-6 w-6" />
                    </div>
                    <span className="badge badge-ghost font-bold text-[10px]">
                      {group.total} Yolcu
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-base-content leading-tight">{group.title}</h3>
                  <p className="text-xs text-base-content/50 mt-1 italic leading-relaxed">{group.reason}</p>
                </div>

                {/* TALEPLER LİSTESİ */}
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
                      <div key={req._id} className="flex items-center justify-between bg-base-200/40 p-3 rounded-2xl border border-base-200/60">
                        <div className="flex items-center gap-3">
                          <div className={`h-8 w-8 rounded-full flex items-center justify-center text-[10px] font-bold ${req.priority === 'high' ? 'bg-error text-error-content' : 'bg-base-300 text-base-content'}`}>
                            {req.requestingUser?.name?.charAt(0) || 'U'}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold text-base-content">{req.requestingUser?.name}</p>
                              {/* 🔥 ACİL ROZETİ */}
                              {req.priority === 'high' && (
                                <span className="text-[8px] font-bold bg-error/20 text-error px-1.5 py-0.5 rounded uppercase">Acil</span>
                              )}
                            </div>
                            <p className="text-[10px] text-base-content/60 font-medium">{req.fromLocation} ➔ {req.toLocation}</p>
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
                      className="flex-1 bg-base-100 border border-base-300 rounded-xl px-4 py-2.5 text-xs font-bold text-base-content outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="">Manuel Şoför Seç...</option>
                      {drivers.map(d => (
                        <option key={d._id} value={d._id}>{d.name}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => handleAssign(idx, group.ids)}
                      disabled={isAssigning === idx}
                      className={`p-2.5 rounded-xl transition-all ${isAssigning === idx ? 'bg-base-300 text-base-content' : 'bg-primary text-white hover:bg-primary/90'} `}
                      title="Manuel Atama Yap"
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
        )}
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
              {futureGroups.map((group, idx) => (
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
                    <span className="text-[10px] font-black text-base-content/40 border border-base-300 px-3 py-1 rounded-full uppercase">Planlı</span>
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