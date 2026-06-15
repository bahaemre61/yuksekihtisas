'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import AracTalepForm from '@/src/components/forms/AracTalepForm';
import TeknikTalepForm from '@/src/components/forms/TeknikTalepForm';

export default function TalepOlusturPage() {
  const [activeTab, setActiveTab] = useState<'selection' | 'vehicle' | 'technical'>('selection');
  const [userRole, setUserRole] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const res = await axios.get('/api/me');
        setUserRole(res.data.role);
      } catch (err) {
        console.error('Kullanıcı bilgisi alınamadı', err);
      } finally {
        setLoading(false);
      }
    };
    fetchUserRole();
  }, []);

  const isAkademi = userRole === 'akademik';

  const SelectionScreen = () => (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-base-content uppercase tracking-tighter">Portal İşlemleri</h1>
        <p className="text-base-content/70 mt-2 font-medium">Lütfen yapmak istediğiniz işlemi seçiniz.</p>
      </div>

      {/* Grid 2 sütuna indirildi (md:grid-cols-2) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl px-4">
        
        {/* 1. KUTU: ARAÇ TALEBİ */}
        <div 
          onClick={() => {
            if (!isAkademi) {
              setActiveTab('vehicle');
            }
          }}
          className={`group bg-base-100 p-8 rounded-2xl shadow-md border-2 border-transparent transition-all duration-300 flex flex-col items-center text-center ${
            isAkademi 
              ? 'opacity-50 cursor-not-allowed border-base-200' 
              : 'hover:border-info hover:shadow-xl cursor-pointer'
          }`}
        >
          <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 transition-colors ${
            isAkademi 
              ? 'bg-base-200 text-base-content/40' 
              : 'bg-info/20 text-info group-hover:bg-info group-hover:text-info-content'
          }`}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-base-content mb-2 flex items-center justify-center gap-2">
            Araç Talebi
            {isAkademi && (
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-error/15 text-error border border-error/25">
                Erişim Yok
              </span>
            )}
          </h2>
          <p className="text-base-content/70 text-sm">
            {isAkademi 
              ? 'Akademik yetkisi ile araç talebi oluşturamazsınız.' 
              : 'Saha görevleri için araç tahsis talebi oluşturun.'
            }
          </p>
        </div>

        {/* 2. KUTU: TEKNİK TALEP */}
        <div 
          onClick={() => setActiveTab('technical')}
          className="group bg-base-100 p-8 rounded-2xl shadow-md border-2 border-transparent hover:border-warning hover:shadow-xl cursor-pointer transition-all duration-300 flex flex-col items-center text-center"
        >
          <div className="w-20 h-20 bg-warning/20 rounded-full flex items-center justify-center mb-6 group-hover:bg-warning transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 text-warning group-hover:text-warning-content">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 0 0 4.486-6.336l-3.276 3.277a3.004 3.004 0 0 1-2.25-2.25l3.276-3.276a4.5 4.5 0 0 0-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437 1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008Z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-base-content mb-2">Teknik Destek</h2>
          <p className="text-base-content/70 text-sm">Bilgisayar veya Teknik Yapı arızaları için servis kaydı açın.</p>
        </div>

      </div>
    </div>
  );

  return (
    <div className="p-6">
      {/* Geri Dön Butonu */}
      {activeTab !== 'selection' && (
        <button 
          onClick={() => setActiveTab('selection')}
          className="mb-6 flex items-center text-base-content/60 hover:text-primary transition-colors font-bold uppercase text-xs tracking-widest"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-4 h-4 mr-2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
          Menüye Dön
        </button>
      )}

      {/* --- EKRAN YÖNETİMİ --- */}
      {loading ? (
        <div className="flex justify-center items-center py-20 text-base-content/50">Yükleniyor...</div>
      ) : (
        <>
          {activeTab === 'selection' && <SelectionScreen />}
          {activeTab === 'vehicle' && <AracTalepForm />}
          {activeTab === 'technical' && <TeknikTalepForm />}
        </>
      )}
    </div>
  );
}