'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { 
  MapIcon, 
  PlayIcon, 
  UserIcon, 
  ClockIcon,
  CheckCircleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/solid';

interface IVehicleRequest {
    _id: string;
    toLocation: string;
    priority: 'normal' | 'high';
    startTime: string;
    requestingUser?: { name: string; };
}

interface ITaskGroup {
    title: string;
    description: string;
    total: number;
    requests: IVehicleRequest[];
}

export default function MyTasksPage() {
  const [taskGroups, setTaskGroups] = useState<ITaskGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [driverStatus, setDriverStatus] = useState<'available' | 'busy'>('available');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const [tasksRes, meRes] = await Promise.all([
        axios.get('/api/ai/driver-group'),
        axios.get('/api/me')
      ]);
      setTaskGroups(Array.isArray(tasksRes.data) ? tasksRes.data : []);
      setDriverStatus(meRes.data.driverStatus || 'available');
    } catch (err) { 
      console.error("Yükleme hatası:", err); 
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => { fetchTasks(); }, []);

  // SEFERİ BAŞLAT
  const handleStartTrip = async (groupTitle: string, requests: IVehicleRequest[]) => {
    setActionLoading(groupTitle);
    try {
      await axios.post('/api/driver/start-task'); // driverStatus -> busy
      
      const MAIN_HUB = "Yüksek İhtisas Üniversitesi (Tıp Fakültesi)";
      const stops = Array.from(new Set(requests.map(r => r.toLocation.trim())));
      const route = [MAIN_HUB, ...stops, MAIN_HUB].map(p => encodeURIComponent(p)).join('/');
      
      window.open(`https://www.google.com/maps/dir/${route}`, '_blank');
      await fetchTasks();
    } catch (err) { 
      alert("Sefer başlatılamadı."); 
    } finally {
      setActionLoading(null);
    }
  };

  // SEFERİ BİTİR
  const handleCompleteTrip = async (groupTitle: string) => {
    if (!window.confirm("Bu seferdeki tüm yolcuları bıraktınız mı?")) return;
    
    setActionLoading(groupTitle);
    try {
      await axios.post('/api/driver/complete-task'); // requests -> completed, driverStatus -> available
      alert("Sefer başarıyla tamamlandı. Yeni görevler için müsaitsiniz.");
      await fetchTasks();
    } catch (err) {
      alert("Hata oluştu.");
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) return <div className="p-10 text-center font-bold animate-pulse text-blue-600">Rotalar ve Görevler Hazırlanıyor...</div>;

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-black text-gray-800 flex items-center gap-3">
          <MapIcon className="h-8 w-8 text-blue-600" /> GÜNLÜK SEFERLERİM
        </h1>
        <div className={`px-4 py-1.5 rounded-full text-xs font-black uppercase ${driverStatus === 'busy' ? 'bg-amber-100 text-amber-600 animate-pulse' : 'bg-green-100 text-green-600'}`}>
          {driverStatus === 'busy' ? '● ŞU AN YOLDASINIZ' : '● YENİ GÖREVE HAZIR'}
        </div>
      </div>

      {taskGroups.length === 0 ? (
        <div className="py-20 text-center bg-gray-50 rounded-[2.5rem] border-2 border-dashed text-gray-400 font-bold">
          Atanmış bir sefer bulunmuyor.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8">
          {taskGroups.map((group, index) => (
            <div key={index} className="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-gray-100 flex flex-col md:flex-row transition-all">
              
              {/* Sol: Sefer Künyesi */}
              <div className={`md:w-1/3 p-8 flex flex-col justify-between text-white ${driverStatus === 'busy' ? 'bg-linear-to-br from-amber-500 to-amber-700' : 'bg-linear-to-br from-blue-600 to-blue-800'}`}>
                <div>
                  <h2 className="text-2xl font-black uppercase tracking-tight">{group.title}</h2>
                  <p className="text-sm opacity-80 mt-2 italic">{group.description}</p>
                </div>
                <div className="mt-8 flex items-baseline gap-2">
                  <span className="text-5xl font-black">{group.total}</span>
                  <span className="font-bold opacity-70 uppercase text-xs">Yolcu Kaydı</span>
                </div>
              </div>

              {/* Sağ: Detay ve Butonlar */}
              <div className="md:w-2/3 p-8 flex flex-col">
                <div className="space-y-3 mb-8">
                  {group.requests.map((req) => (
                    <div key={req._id} className="flex justify-between items-center p-3.5 bg-gray-50 rounded-2xl border border-gray-100">
                      <div className="flex items-center gap-3">
                        <UserIcon className={`h-4 w-4 ${req.priority === 'high' ? 'text-red-500' : 'text-gray-400'}`} />
                        <div>
                          <p className="font-bold text-gray-800 text-sm">{req.requestingUser?.name || 'Yolcu'}</p>
                          <p className="text-[10px] text-gray-500">{req.toLocation}</p>
                        </div>
                      </div>
                      <span className="text-[11px] font-black text-blue-600 bg-white px-2 py-1 rounded-lg shadow-sm">
                        {new Date(req.startTime).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-auto">
                  {/* BAŞLAT BUTONU */}
                  <button 
                    onClick={() => handleStartTrip(group.title, group.requests)}
                    disabled={driverStatus === 'busy' || !!actionLoading}
                    className="flex items-center justify-center gap-2 bg-gray-900 text-white py-4 rounded-2xl font-black text-sm hover:bg-blue-600 disabled:bg-gray-200 disabled:text-gray-400 transition-all shadow-lg"
                  >
                    {actionLoading === group.title ? <ArrowPathIcon className="h-5 w-5 animate-spin" /> : <><PlayIcon className="h-5 w-5" /> SEFERİ BAŞLAT</>}
                  </button>

                  {/* BİTİR BUTONU */}
                  <button 
                    onClick={() => handleCompleteTrip(group.title)}
                    disabled={driverStatus === 'available' || !!actionLoading}
                    className="flex items-center justify-center gap-2 bg-green-600 text-white py-4 rounded-2xl font-black text-sm hover:bg-green-700 disabled:bg-gray-100 disabled:text-gray-300 transition-all shadow-lg shadow-green-100"
                  >
                    <CheckCircleIcon className="h-5 w-5" /> SEFERİ BİTİR
                  </button>
                </div>
              </div>

            </div>
          ))}
        </div>
      )}
    </div>
  );
}