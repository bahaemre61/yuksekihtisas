'use client';

import React, {useEffect, useState} from 'react';
import axios from 'axios';
import Link from 'next/link';
import {
  WrenchScrewdriverIcon,
  DocumentTextIcon,
  CalendarIcon,
  MegaphoneIcon,
  ArrowRightIcon,
  TruckIcon, 
  CpuChipIcon 
} from '@heroicons/react/24/outline';

enum RequestStatus{
  PENDING = 'pending',
  ASSIGNED = 'assigned',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

interface IVehicleRequest{
  _id : string;
  purpose: string;
  status : RequestStatus;
  startTime : string;
}

interface ITechnicalRequest {
  _id: string;
  title: string;
  status: RequestStatus;
  createdAt: string;
}

interface IAnnouncement{
  _id :string;
  title : string;
  priority : 'normal' | 'urgent';
  createdAt: string;
}

interface IMenu{
  date : string;
  items: string[];
  calories? : number;
}

const StatusBadge = ({status}: {status: RequestStatus}) => {
  let colorClass = ''; let text = status.toUpperCase();
  switch(status) {
    case RequestStatus.PENDING: colorClass = 'bg-yellow-100 text-yellow-800'; text = 'Beklemede'; break;
    case RequestStatus.ASSIGNED: colorClass = 'bg-blue-100 text-blue-800'; text = 'Atandı'; break;
    case RequestStatus.COMPLETED: colorClass = 'bg-green-100 text-green-800'; text = 'Tamamlandı'; break;
    case RequestStatus.CANCELLED: colorClass = 'bg-red-100 text-red-800'; text = 'İptal'; break;
    default: text = status;
  }
  return <span className={`px-2 py-1 text-xs font-bold rounded ${colorClass}`}>{text}</span>
}

export default function DashboardHome() {
  const [recentRequests, setRecentRequests] = useState<IVehicleRequest[]>([]);
  // YENİ: Teknik Talep State'i
  const [recentTechnicalRequests, setRecentTechnicalRequests] = useState<ITechnicalRequest[]>([]);
  
  const [announcements, setAnnouncements] = useState<IAnnouncement[]>([]);
  const [todayMenu, setTodayMenu] = useState<IMenu | null>(null);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try{
        const userRes = await axios.get('/api/me');
        setUserName(userRes.data.name);

        const reqReq = await axios.get('/api/requests/my');
        setRecentRequests(reqReq.data.slice(0,5));

        // 3. YENİ: Teknik Talepler
        // Not: Teknik talep API'niz { success: true, data: [...] } dönüyorsa .data.data dememiz gerekebilir.
        // Yazdığımız API yapısına göre: res.data.data
        const techRes = await axios.get('/api/technicalrequests/my');
        if(techRes.data.success) {
            setRecentTechnicalRequests(techRes.data.data.slice(0, 5));
        }

        // 4. Duyurular
        const annRes = await axios.get('/api/announcements');
        setAnnouncements(annRes.data.slice(0,3));

        // 5. Yemek Menüsü
        const today = new Date();
        const menuRes = await axios.get('/api/menu', {
          params: {month: today.getMonth(), year: today.getFullYear()}
        });

        const foundMenu = menuRes.data.find((m: IMenu) => {
          const mDate = new Date(m.date);
          return mDate.getDate() === today.getDate() && mDate.getMonth() === today.getMonth();
        });

        setTodayMenu(foundMenu || null);
      }catch (err) {
        console.error("Dashboard verileri yüklenmedi",err);
      }finally{
        setLoading(false);
      }
    };
    fetchDashboardData();
  },[]);

  if(loading) {
    return(
      <div className='flex items-center justify-center h-screen'>
        <div className='animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500'></div>
      </div>
    );
  }

return (
    <div className="space-y-6">
      {/* Hoşgeldiniz Başlığı */}
      <div className="flex justify-between items-end">
        <div>
            <h1 className="text-3xl font-bold text-gray-800">Merhaba, {userName} 👋</h1>
            <p className="text-gray-500 mt-1">Güncel durum ve taleplerin burada.</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* SOL SÜTUN (2/3 Genişlik) */}
        <div className="lg:col-span-2 space-y-6">
            
            {/* 1. KART: ARAÇ TALEPLERİM */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                        <TruckIcon className="h-5 w-5 mr-2 text-blue-500" />
                        Son Araç Taleplerim
                    </h3>
                    <Link href="/dashboard/taleplerim" className="text-sm text-blue-600 hover:underline flex items-center">
                        Tümü <ArrowRightIcon className="h-4 w-4 ml-1"/>
                    </Link>
                </div>
                
                <div className="space-y-3">
                    {recentRequests.length === 0 ? (
                        <div className="text-center py-6 text-gray-400 bg-gray-50 rounded-lg border border-dashed border-gray-200 text-sm">
                            Aktif araç talebiniz bulunmuyor.
                        </div>
                    ) : (
                        recentRequests.map((req) => (
                            <div key={req._id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors border-b border-gray-50 last:border-0">
                                <div>
                                    <p className="font-medium text-gray-800">{req.purpose}</p>
                                    <p className="text-xs text-gray-500">
                                        {new Date(req.startTime).toLocaleString('tr-TR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                                <StatusBadge status={req.status} />
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* 2. KART: TEKNİK TALEPLERİM (YENİ EKLENEN KISIM) */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                        <CpuChipIcon className="h-5 w-5 mr-2 text-orange-500" />
                        Son Teknik Taleplerim
                    </h3>
                    {/* Linki teknik taleplerim sayfasına yönlendirdik */}
                    <Link href="/dashboard/tekniktaleplerim" className="text-sm text-orange-600 hover:underline flex items-center">
                        Tümü <ArrowRightIcon className="h-4 w-4 ml-1"/>
                    </Link>
                </div>
                
                <div className="space-y-3">
                    {recentTechnicalRequests.length === 0 ? (
                        <div className="text-center py-6 text-gray-400 bg-gray-50 rounded-lg border border-dashed border-gray-200 text-sm">
                            Aktif teknik destek talebiniz bulunmuyor.
                        </div>
                    ) : (
                        recentTechnicalRequests.map((req) => (
                            <div key={req._id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors border-b border-gray-50 last:border-0">
                                <div>
                                    <p className="font-medium text-gray-800">{req.title}</p>
                                    <p className="text-xs text-gray-500">
                                        {new Date(req.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', hour:'2-digit', minute:'2-digit' })}
                                    </p>
                                </div>
                                <StatusBadge status={req.status} />
                            </div>
                        ))
                    )}
                </div>
            </div>

        </div>

        {/* SAĞ SÜTUN: Bilgi Kartları (1/3 Genişlik) */}
        <div className="space-y-6">

          {/* 1. Günün Menüsü Kartı */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <CalendarIcon className="h-5 w-5 mr-2 text-green-600" />
              Günün Menüsü
            </h3>
            
            {todayMenu ? (
                <div className="bg-green-50 p-4 rounded-lg">
                    <p className="text-sm text-green-800 font-bold mb-2 border-b border-green-200 pb-1">
                        {new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'long' })}
                    </p>
                    <ul className="space-y-1">
                        {todayMenu.items.map((item, idx) => (
                            <li key={idx} className="text-sm text-gray-700 flex items-start">
                                <span className="mr-2 text-green-400">•</span> {item}
                            </li>
                        ))}
                    </ul>
                    {todayMenu.calories && (
                        <p className="text-xs text-green-600 mt-3 text-right font-semibold">
                            ~ {todayMenu.calories} kcal
                        </p>
                    )}
                </div>
            ) : (
                <div className="text-center py-6 text-gray-400 bg-gray-50 rounded-lg text-sm border border-dashed border-gray-200">
                    Bugün için menü girişi yapılmamış.
                </div>
            )}
            <div className="mt-3 text-right">
                <Link href="/dashboard/yemek" className="text-xs text-gray-500 hover:text-green-600">
                    Tüm Ayı Gör &rarr;
                </Link>
            </div>
          </div>

          {/* 2. Duyurular Kartı */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <MegaphoneIcon className="h-5 w-5 mr-2 text-purple-500" />
              Duyurular
            </h3>
            
            <div className="space-y-4">
                {announcements.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-4 bg-gray-50 rounded-lg border border-dashed">Yeni duyuru yok.</p>
                ) : (
                    announcements.map(ann => (
                        <div key={ann._id} className={`text-sm pb-3 border-b border-gray-100 last:border-0 last:pb-0 ${ann.priority === 'urgent' ? 'bg-red-50 p-2 rounded border-l-2 border-red-500' : ''}`}>
                            <p className="font-medium text-gray-800 truncate">{ann.title}</p>
                            <p className="text-xs text-gray-500 mt-1">
                                {new Date(ann.createdAt).toLocaleDateString('tr-TR')}
                            </p>
                        </div>
                    ))
                )}
            </div>
            <div className="mt-3 text-right">
                <Link href="/dashboard/duyurular" className="text-xs text-gray-500 hover:text-purple-600">
                    Tümünü Oku &rarr;
                </Link>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}