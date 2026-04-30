'use client';

import { useState, useEffect } from 'react';
import { XMarkIcon, MagnifyingGlassPlusIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';

interface IUser {
  _id: string;
  name: string;
  email: string;
}
interface ITechnician {
  _id: string;
  name: string;
  title?: string;
}   

interface IRequest {
  _id: string;
  title: string;
  description: string;
  location: string; 
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  screenshotUrl?: string;
  createdAt: string;
  user: IUser;
  technicalStaff?: ITechnician[];
}

export default function TeknikDestekPage() {
  const [requests, setRequests] = useState<IRequest[]>([]);
  const [technicians, setTechnicians] = useState<ITechnician[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImg, setSelectedImg] = useState<string | null>(null);
  
  const [selectedTechs, setSelectedTechs] = useState<Record<string, string[]>>({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [requestsRes, techsRes] = await Promise.all([
          fetch('/api/technicalrequests/pool'),
          fetch('/api/users/technicians')
        ]);

        const requestsData = await requestsRes.json();
        const techsData = await techsRes.json();

        if (requestsData.success) setRequests(requestsData.data);
        if (techsData.success) setTechnicians(techsData.data);

      } catch (error) {
        console.error('Veri çekme hatası:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Checkbox değişince çalışır
  const toggleTechnician = (requestId: string, techId: string) => {
    setSelectedTechs((prev) => {
      const currentList = prev[requestId] || [];
      if (currentList.includes(techId)) {
        return { ...prev, [requestId]: currentList.filter(id => id !== techId) };
      } else {
        return { ...prev, [requestId]: [...currentList, techId] };
      }
    });
  };

  // 2. ATAMA İŞLEMİ (ÇOKLU)
  const handleAssign = async (requestId: string) => {
    const techIds = selectedTechs[requestId];
    
    if (!techIds || techIds.length === 0) {
      return alert('Lütfen en az bir personel seçiniz.');
    }

    try {
      const res = await fetch('/api/technicalrequests/assign', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, technicianIds: techIds }),
      });
      
      const result = await res.json();

      if (result.success) {
        setRequests((prev) => prev.filter((r) => r._id !== requestId));
        alert('İş ataması başarıyla yapıldı.');
      } else {
        alert('Hata: ' + result.error);
      }
    } catch (error) {
      console.error('Atama hatası:', error);
    }
  };

  if (loading) return <div className="p-10 text-center">Yükleniyor...</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <span className="bg-orange-100 text-orange-600 p-2 rounded-lg">🛠️</span>
            Teknik Destek Havuzu
          </h1>
          <p className="text-gray-500 text-sm mt-1">
             Birden fazla personel seçerek atama yapabilirsiniz.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/admin/teknik-talepler"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
          >
            Tüm Talepleri Gör
          </Link>
          <div className="bg-orange-50 text-orange-800 px-4 py-2 rounded-full text-sm font-semibold border border-orange-200">
            Bekleyen: {requests.length} Adet
          </div>
        </div>
      </div>

      {requests.length === 0 ? (
        <div className="text-center p-12 bg-white rounded-xl shadow-sm border border-dashed border-gray-300">
          <h3 className="text-lg font-medium text-gray-900">Bekleyen iş yok 🎉</h3>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {requests.map((req) => (
            <div key={req._id} className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col hover:shadow-md transition-shadow">
              
              <div className="p-5 border-b border-gray-100 pb-3">
                 <div className="flex justify-between items-start gap-2">
                    <h3 className="font-bold text-gray-800 line-clamp-1">{req.title}</h3>
                    <span className={`px-2.5 py-0.5 text-[10px] font-bold uppercase rounded-full ${
                        req.priority === 'HIGH' ? 'bg-red-100 text-red-600' : 
                        req.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'
                    }`}>
                        {req.priority === 'HIGH' ? 'ACİL' : req.priority === 'MEDIUM' ? 'ORTA' : 'DÜŞÜK'}
                    </span>
                 </div>
                 <div className="text-xs text-gray-400 mt-1">{new Date(req.createdAt).toLocaleDateString('tr-TR')}</div>
              </div>

              <div className="p-5 flex-1 space-y-3">
                 <div className="text-sm">
                    <span className="font-bold text-gray-700">Talep Eden:</span> {req.user?.name}
                    <br/>
                    <span className="font-bold text-gray-700">Konum:</span> {req.location}
                 </div>
                 <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">{req.description}</p>
              </div>
  <div className="relative">
      {/* 1. TALEP LİSTESİNDEKİ BUTON KISMI */}
      {/* ... req map döngüsü içinde ... */}
      <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100 mt-2">
        {req.screenshotUrl ? (
          <button 
            onClick={() => setSelectedImg(`/api/display-image/${req.screenshotUrl!.split('/').pop()}`)}
            className="flex items-center gap-2 text-[10px] font-black text-blue-600 hover:text-blue-800 uppercase tracking-widest transition-all group"
          >
            <MagnifyingGlassPlusIcon className="h-4 w-4 transition-transform group-hover:scale-125" />
            Görseli İncele
          </button>
        ) : (
          <span className="text-[9px] text-gray-400 font-bold uppercase italic">Görsel Yok</span>
        )}
      </div>

      {/* 2. PREMIUM MODAL KATMANI */}
      {selectedImg && (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-2 md:p-10">
    {/* Arka Plan (Blur artırıldı) */}
    <div 
      className="absolute inset-0 bg-gray-900/70 backdrop-blur-md transition-opacity" 
      onClick={() => setSelectedImg(null)} 
    />
    
    {/* Modal İçeriği (Genişlik max-w-6xl yapıldı) */}
    <div className="relative bg-white rounded-3x1 md:rounded-[3rem] shadow-2xl max-w-6xl w-full max-h-[95vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
      
      {/* Üst Bar (Kapat butonu burada daha şık) */}
      <div className="px-8 py-4 flex justify-between items-center border-b border-gray-100 bg-white">
        <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
            <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Teknik Arıza Detay Görüntüsü</span>
        </div>
        <button 
          onClick={() => setSelectedImg(null)}
          className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-600 rounded-full transition-all"
        >
          <XMarkIcon className="h-6 w-6 stroke-[2px]" />
        </button>
      </div>

      {/* Resim Alanı (Yükseklik artırıldı) */}
      <div className="flex-1 bg-gray-50 overflow-auto flex items-center justify-center p-2">
          <img 
            src={selectedImg} 
            alt="Detay" 
            className="w-full h-auto max-h-[75vh] md:max-h-[85vh] object-contain shadow-sm"
          />
      </div>
    </div>
  </div>
)}
    </div>

              {/* ÇOKLU SEÇİM ALANI */}
              <div className="p-4 bg-gray-50 border-t">
                <p className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">
                  Personel Seçimi ({selectedTechs[req._id]?.length || 0} Kişi)
                </p>
                
                {/* Scroll edilebilir personel listesi */}
                <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg bg-white p-2 mb-3">
                  {technicians.map((tech) => {
                    const isSelected = selectedTechs[req._id]?.includes(tech._id);
                    return (
                      <label key={tech._id} className="flex items-center gap-2 p-1.5 hover:bg-gray-50 rounded cursor-pointer text-sm">
                        <input 
                          type="checkbox" 
                          className="w-4 h-4 text-orange-600 rounded border-gray-300 focus:ring-orange-500"
                          checked={!!isSelected}
                          onChange={() => toggleTechnician(req._id, tech._id)}
                        />
                        <span className={isSelected ? 'text-gray-900 font-medium' : 'text-gray-600'}>
                          {tech.name}
                        </span>
                      </label>
                    );
                  })}
                </div>

                <button 
                  onClick={() => handleAssign(req._id)}
                  disabled={!selectedTechs[req._id] || selectedTechs[req._id].length === 0}
                  className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Ekibi Ata
                </button>
              </div>

            </div>
          ))}
        </div>
      )}
    </div>
  );
}