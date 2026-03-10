'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  WrenchScrewdriverIcon, 
  CheckBadgeIcon, 
  ArrowPathIcon,
  CpuChipIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/solid';

// 🛡️ VAPID Anahtarını Tarayıcının/Mobilin anlayacağı Uint8Array formatına çevirir
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function TechNotificationStatus() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'active' | 'denied' | 'unsupported'>('idle');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (!('serviceWorker' in navigator)) {
        setStatus('unsupported');
        return;
      }
      if (Notification.permission === 'granted') setStatus('active');
      if (Notification.permission === 'denied') setStatus('denied');
    }
  }, []);

  const handleSubscribe = async () => {
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

    // 1. Anahtar kontrolü
    if (!publicKey) {
      alert("HATA: VAPID Public Key bulunamadı! .env dosyasını kontrol edin.");
      return;
    }

    setStatus('loading');
    try {
      // 2. Service Worker'ın hazır olduğundan emin ol
      const registration = await navigator.serviceWorker.ready;
      
      // 3. İzin iste
      const permission = await Notification.requestPermission();

      if (permission === 'granted') {
        // 🚀 KRİTİK NOKTA: Anahtarı çevirip PushManager'a veriyoruz
        const convertedKey = urlBase64ToUint8Array(publicKey);

        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedKey
        });

        // 4. Backend'e gönder (Şoförlerle ortak rota)
        await axios.post('/api/driver/push/subscribe', subscription);
        setStatus('active');
        console.log("Abonelik başarılı!");
      } else {
        setStatus('denied');
      }
    } catch (err: any) {
      console.error("Abonelik hatası detayı:", err);
      setStatus('denied');
      alert(`Hata: ${err.message}`);
    }
  };

  // Desteklenmeyen durum (HTTP veya eski tarayıcı)
  if (status === 'unsupported') {
    return (
      <div className="px-4 py-2 mt-4 bg-red-50 border-2 border-red-600 rounded-xl">
        <p className="text-[10px] font-black text-red-700 uppercase leading-none">Tarayıcı Desteklenmiyor</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-2 mt-4">
      <button
        onClick={handleSubscribe}
        disabled={status === 'loading' || status === 'active'}
        className={`
          w-full flex items-center justify-between p-3 rounded-2xl border-4 transition-all group
          ${status === 'active' 
            ? 'bg-amber-50 border-gray-900 text-amber-700' 
            : status === 'denied'
            ? 'bg-red-50 border-red-600 text-red-600'
            : 'bg-white border-gray-900 text-gray-900 shadow-[4px_4px_0px_0px_rgba(17,24,39,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1'}
        `}
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl border-2 border-gray-900 ${status === 'active' ? 'bg-amber-500 text-white shadow-sm' : 'bg-gray-100'}`}>
            {status === 'active' ? <CpuChipIcon className="h-4 w-4" /> : <WrenchScrewdriverIcon className="h-4 w-4" />}
          </div>
          <div className="text-left">
            <p className="text-[10px] font-black uppercase tracking-tighter leading-none">
              {status === 'active' ? 'TEKNİK HAT AKTİF' : status === 'denied' ? 'ERİŞİM KAPALI' : 'BİLDİRİMİ AÇ'}
            </p>
            <p className="text-[8px] font-bold uppercase opacity-60 mt-1 italic leading-none">
              {status === 'active' ? 'TALEPLER GELEBİLİR' : status === 'denied' ? 'İZİNLERİ SIFIRLA' : 'SİSTEME BAĞLAN'}
            </p>
          </div>
        </div>

        {status === 'active' ? (
          <div className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
          </div>
        ) : status === 'loading' ? (
          <ArrowPathIcon className="h-4 w-4 animate-spin text-amber-600" />
        ) : status === 'denied' ? (
          <ExclamationTriangleIcon className="h-4 w-4 text-red-600" />
        ) : (
          <div className="w-2 h-2 rounded-full bg-gray-300" />
        )}
      </button>
    </div>
  );
}