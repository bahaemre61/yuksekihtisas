'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { 
  ExclamationTriangleIcon, 
  UserGroupIcon,
  SparklesIcon,
  CalendarDaysIcon,
  ArrowPathIcon,
  LockClosedIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';
import { CheckBadgeIcon } from '@heroicons/react/24/solid';

interface IVehicleRequest {
    _id: string;
    purpose: string;
    toLocation: string;
    startTime: string;
    priority: 'normal' | 'high';
    requestingUser: { name: string; email: string };
}

interface IGroupedRequest {
    _id: string; 
    description?: string;
    totalRequests: number;
    highPriorityCount: number;
    requests: IVehicleRequest[];
    canAccept: boolean;
}

interface IDriver {
    _id: string;
    name: string;
    driverStatus: string; // Şoförün anlık durumu
}

export default function PendingGroupsPage() {
  const [groups, setGroups] = useState<IGroupedRequest[]>([]);
  const [drivers, setDrivers] = useState<IDriver[]>([]); 
  const [selectedDrivers, setSelectedDrivers] = useState<{[key: string]: string}>({}); 
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false); 
  const [myDriverStatus, setMyDriverStatus] = useState<string>('available');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'today' | 'future'>('today');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [meRes, groupsRes, driversRes] = await Promise.all([
        axios.get('/api/me'),
        axios.get('/api/ai/smart-group'),
        axios.get('/api/admin/all-drivers') // Tüm şoförleri getiren yeni uç
      ]);
      
      setMyDriverStatus(meRes.data.driverStatus || 'available');
      setIsAdmin(['admin', 'amir', 'ADMIN'].includes(meRes.data.role));
      setGroups(Array.isArray(groupsRes.data) ? groupsRes.data : []);
      setDrivers(Array.isArray(driversRes.data) ? driversRes.data : []);
    } catch (err) {
      console.error("Hata:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleAdminAssign = async (groupTitle: string, groupRequests: IVehicleRequest[]) => {
    const driverId = selectedDrivers[groupTitle];
    if (!driverId) return alert("Lütfen önce bir şoför seçin!");

    if (!window.confirm(`${groupTitle} rotasını seçili şoföre atamak istiyor musunuz?`)) return;

    setProcessingId(groupTitle);
    try {
        const requestIds = groupRequests.map(r => r._id);
        await axios.post('/api/admin/assign-group', { requestIds, driverId });
        
        alert("Görev başarıyla şoföre atandı!");
        setGroups(prev => prev.filter(g => g._id !== groupTitle));
    } catch (err: any) {
        alert(err.response?.data?.msg || "Atama yapılamadı.");
    } finally {
        setProcessingId(null);
    }
  };

  const handleAcceptGroup = async (groupTitle: string, groupRequests: IVehicleRequest[]) => {
    if (myDriverStatus === 'busy') return alert("Şu an meşgulsünüz.");
    if (!window.confirm("Bu görevi üstlenmek istiyor musunuz?")) return;

    setProcessingId(groupTitle);
    try {
        const requestIds = groupRequests.map(r => r._id);
        await axios.post('/api/driver/accept-group', { requestIds });
        
        alert("Görev zimmetinize atandı!");
        setGroups(prev => prev.filter(g => g._id !== groupTitle));
        setMyDriverStatus('busy');
    } catch (err: any) {
        alert(err.response?.data?.msg || "Hata oluştu.");
    } finally {
        setProcessingId(null);
    }
  };

  const filteredGroups = groups.filter(group => {
    if (activeTab === 'today') return group.canAccept === true;
    if (activeTab === 'future') return group.canAccept === false;
    return true;
  });

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      
      {/* BAŞLIK VE YENİLE */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2 uppercase tracking-tighter">
            <SparklesIcon className="h-7 w-7 text-purple-600" />
            Operasyon Havuzu
        </h1>
        <button onClick={fetchData} className="p-2 hover:bg-gray-100 rounded-full transition-all">
            <ArrowPathIcon className={`h-6 w-6 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* TABS */}
      <div className="flex bg-gray-100 p-1.5 rounded-2xl w-full md:w-fit shadow-inner">
        <button onClick={() => setActiveTab('today')} className={`flex-1 md:flex-none px-8 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'today' ? 'bg-white shadow-md text-blue-600' : 'text-gray-500'}`}>Bugünün İşleri</button>
        <button onClick={() => setActiveTab('future')} className={`flex-1 md:flex-none px-8 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'future' ? 'bg-white shadow-md text-purple-600' : 'text-gray-500'}`}>Gelecek Planlar</button>
      </div>

      {!isAdmin && myDriverStatus === 'busy' && (
        <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-r-xl flex items-center gap-3">
            <ExclamationTriangleIcon className="h-6 w-6 text-amber-600" />
            <p className="text-amber-800 text-sm font-medium">Aktif bir görevdesiniz. Yeni iş alamazsınız.</p>
        </div>
      )}

      {loading ? (
        <div className="py-20 text-center text-gray-400 italic font-bold animate-pulse">Yükleniyor...</div>
      ) : filteredGroups.length === 0 ? (
        <div className="py-20 text-center border-2 border-dashed rounded-[2.5rem] bg-gray-50 text-gray-400">
            <CalendarDaysIcon className="h-12 w-12 mx-auto mb-2 opacity-10" />
            <p className="font-bold">Görev bulunmuyor.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredGroups.map((group) => (
            <div key={group._id} className={`flex flex-col bg-white rounded-4xl border-2 transition-all shadow-sm ${group.canAccept ? 'border-blue-50' : 'border-gray-100 opacity-80'}`}>
              
              <div className={`p-5 rounded-4xl ${group.canAccept ? 'bg-blue-50/30' : 'bg-gray-100/50'}`}>
                <div className="flex justify-between items-start mb-3">
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg uppercase ${group.highPriorityCount > 0 ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-200 text-gray-600'}`}>
                    {group.highPriorityCount > 0 ? 'ACİL' : 'NORMAL'}
                  </span>
                  <div className="text-[10px] font-bold text-gray-400 flex items-center gap-1 uppercase">
                    <UserGroupIcon className="h-3.5 w-3.5" /> {group.totalRequests} KİŞİ
                  </div>
                </div>
                <h2 className="text-lg font-black text-gray-900 leading-tight uppercase">{group._id}</h2>
              </div>

              <div className="p-5 space-y-3 grow overflow-y-auto max-h-[180px]">
                {group.requests.map((req) => (
                    <div key={req._id} className="flex justify-between items-center bg-gray-50 p-3 rounded-2xl border border-gray-100">
                        <div className="max-w-[70%] text-xs">
                            <p className="font-bold text-gray-800 truncate">{req.requestingUser?.name}</p>
                            <p className="text-[10px] text-gray-500 truncate italic">{req.toLocation}</p>
                        </div>
                        <span className="text-[10px] font-black text-blue-600">{new Date(req.startTime).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                ))}
              </div>

              {/* AKSİYON ALANI */}
              <div className="p-5 pt-0 mt-auto">
                {group.canAccept ? (
                  isAdmin ? (
                    <div className="space-y-3 p-3 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Tüm Şoförler</label>
                        <div className="flex gap-2">
                            <select 
                                value={selectedDrivers[group._id] || ""}
                                onChange={(e) => setSelectedDrivers(prev => ({...prev, [group._id]: e.target.value}))}
                                className="flex-1 bg-white border border-gray-200 rounded-xl px-3 py-2 text-[11px] font-bold outline-none focus:border-blue-500"
                            >
                                <option value="">Şoför Seç...</option>
                                {drivers.map(d => (
                                    <option key={d._id} value={d._id}>
                                        {d.name}
                                    </option>
                                ))}
                            </select>
                            <button 
                                onClick={() => handleAdminAssign(group._id, group.requests)}
                                disabled={processingId === group._id}
                                className="bg-gray-900 text-white p-2 rounded-xl hover:bg-black transition-all"
                            >
                                {processingId === group._id ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : <ChevronRightIcon className="h-4 w-4" />}
                            </button>
                        </div>
                    </div>
                  ) : (
                    <button
                        onClick={() => handleAcceptGroup(group._id, group.requests)}
                        disabled={myDriverStatus === 'busy' || processingId === group._id}
                        className={`w-full py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all active:scale-95
                        ${(myDriverStatus === 'busy' || processingId === group._id) ? 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-100'}
                        `}
                    >
                        {processingId === group._id ? <ArrowPathIcon className="h-5 w-5 animate-spin" /> : <><CheckBadgeIcon className="h-5 w-5" /> GÖREVİ ÜSTLEN</>}
                    </button>
                  )
                ) : (
                  <div className="w-full py-4 rounded-2xl bg-gray-100 text-gray-400 font-bold text-sm flex items-center justify-center gap-2 cursor-not-allowed">
                    <LockClosedIcon className="h-5 w-5" /> GÜNÜNÜ BEKLEYİN
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}