'use client';

import { useState, useEffect } from 'react';

// --- TİP TANIMLARI ---
interface IUser {
  _id: string;
  name: string;
  email: string;
}

interface IRequest {
  _id: string;
  title: string;
  description: string;
  location: string; // Artık district yerine location var
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  screenshotUrl?: string;
  createdAt: string;
  user: IUser;
}

// --- MOCK PERSONEL LİSTESİ ---
// (Not: Buradaki ID'leri veritabanınızdaki gerçek "Tekniker" rolündeki kullanıcı ID'leriyle değiştirin)
const TECHNICIANS = [
  { id: '6916e98c15be654c0e862e78', name: 'Baha Emre ÇELİK' },
  { id: '692800ddff451ed6cb13e52c', name: 'Ömer Fukran SİVRİ' },
  { id: '696e0c33f8f3fd40b5c7170d', name: 'Ege AKBABA' },
];

export default function TeknikDestekPage() {
  const [requests, setRequests] = useState<IRequest[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedTechs, setSelectedTechs] = useState<Record<string, string>>({});

  const fetchRequests = async () => {
  try {
    const res = await fetch('/api/technicalrequests/pool');

    // 1. Önce sunucu hatası var mı (404, 500 vs) kontrol et
    if (!res.ok) {
      const errorText = await res.text(); // HTML dönerse bunu okuyalım
      console.error("API Hatası (HTML Döndü):", errorText);
      alert("API'ye ulaşılamadı. Console'a bakınız.");
      return;
    }

    const data = await res.json();
    
    if (data.success) {
      setRequests(data.data);
    } else {
      console.error("Backend Hatası:", data.error);
    }

  } catch (error) {
    console.error('Fetch işlemi sırasında hata:', error);
  } finally {
    setLoading(false);
  }
};

  useEffect(() => {
    fetchRequests();
  }, []);

  // 2. PERSONEL ATAMA İŞLEMİ
  const handleAssign = async (requestId: string) => {
    const techId = selectedTechs[requestId];
    if (!techId) return alert('Lütfen atama yapılacak personeli seçiniz.');

    try {
      const res = await fetch('/api/technicalrequests/assign', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, technicianId: techId }),
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

  const handleSelectChange = (requestId: string, val: string) => {
    setSelectedTechs((prev) => ({ ...prev, [requestId]: val }));
  };

  if (loading) return <div className="p-10 text-center text-gray-500">Yükleniyor...</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Üst Başlık */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <span className="bg-orange-100 text-orange-600 p-2 rounded-lg">
              {/* Tamir/Teknik İkonu */}
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </span>
            Teknik Destek Havuzu
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Personel ataması bekleyen teknik arıza talepleri
          </p>
        </div>
        <div className="bg-orange-50 text-orange-800 px-4 py-2 rounded-full text-sm font-semibold border border-orange-200">
          Bekleyen: {requests.length} Adet
        </div>
      </div>

      {/* Liste Boşsa */}
      {requests.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl shadow-sm border border-gray-200 border-dashed">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4 text-gray-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900">Harika! Bekleyen iş yok.</h3>
          <p className="text-gray-500">Şu an havuzda atama bekleyen bir talep bulunmuyor.</p>
        </div>
      ) : (
        /* Kart Grid Yapısı */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {requests.map((req) => (
            <div key={req._id} className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col hover:shadow-md transition-shadow duration-200">
              
              {/* Kart Başlık */}
              <div className="p-5 border-b border-gray-100 pb-3">
                <div className="flex justify-between items-start gap-2">
                  <h3 className="font-bold text-gray-800 line-clamp-1" title={req.title}>{req.title}</h3>
                  <span className={`px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide rounded-full ${
                    req.priority === 'HIGH' ? 'bg-red-100 text-red-600' : 
                    req.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' : 
                    'bg-green-100 text-green-700'
                  }`}>
                    {req.priority === 'HIGH' ? 'Acil' : req.priority === 'MEDIUM' ? 'Orta' : 'Düşük'}
                  </span>
                </div>
                <div className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  {new Date(req.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>

              {/* Kart İçerik */}
              <div className="p-5 flex-1 space-y-4">
                
                {/* Kullanıcı & Konum */}
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold shrink-0">
                    {req.user?.name?.charAt(0) || '?'}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-700">{req.user?.name || 'Misafir'}</p>
                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                      {req.location}
                    </p>
                  </div>
                </div>

                {/* Açıklama */}
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                  <p className="text-sm text-gray-600 line-clamp-3">{req.description}</p>
                </div>

                {/* Ekran Görüntüsü Butonu */}
                {req.screenshotUrl && (
                  <a 
                    href={req.screenshotUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    Ekran Görüntüsünü İncele
                  </a>
                )}
              </div>

              {/* Alt Kısım: Aksiyon */}
              <div className="p-4 bg-gray-50 border-t flex items-center gap-2">
                <select 
                  className="flex-1 text-sm border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500 py-2"
                  value={selectedTechs[req._id] || ''}
                  onChange={(e) => handleSelectChange(req._id, e.target.value)}
                >
                  <option value="">Personel Seçiniz...</option>
                  {TECHNICIANS.map((tech) => (
                    <option key={tech.id} value={tech.id}>{tech.name}</option>
                  ))}
                </select>
                <button 
                  onClick={() => handleAssign(req._id)}
                  disabled={!selectedTechs[req._id]}
                  className="bg-orange-600 hover:bg-orange-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Ata
                </button>
              </div>

            </div>
          ))}
        </div>
      )}
    </div>
  );
}