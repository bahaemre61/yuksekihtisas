'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  SignalIcon, 
  CheckBadgeIcon, 
  ArrowPathIcon,
  ExclamationCircleIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/solid';

// 🛡️ VAPID Anahtar Dönüştürücü (Mobil Cihazlar İçin Şart)
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

export default function DriverNotificationStatus() {
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

    if (!publicKey) {
      alert("HATA: VAPID Public Key (.env) bulunamadı!");
      return;
    }

    setStatus('loading');
    try {
      // 1. Service Worker hazır olana kadar bekle
      const registration = await navigator.serviceWorker.ready;
      
      // 2. Bildirim izni iste
      const permission = await Notification.requestPermission();

      if (permission === 'granted') {
        // 🚀 MOBİL İÇİN KRİTİK DÖNÜŞÜM
        const convertedKey = urlBase64ToUint8Array(publicKey);

        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedKey
        });

        // 3. Backend'e gönder
        await axios.post('/api/driver/push/subscribe', subscription);
        setStatus('active');
      } else {
        setStatus('denied');
      }
    } catch (err: any) {
      console.error("Abonelik hatası:", err);
      setStatus('denied');
      // Mobil cihazda hatayı görmek için alert ekliyoruz
      alert(`Abonelik başarısız: ${err.message}`);
    }
  };

  if (status === 'unsupported') return null;

  return (
    <div className="px-4 py-2 mt-4">
      <button
        onClick={handleSubscribe}
        disabled={status === 'loading' || status === 'active'}
        className={`
          w-full flex items-center justify-between p-3 rounded-2xl border-4 transition-all
          ${status === 'active' 
            ? 'bg-blue-50 border-gray-900 text-blue-700' 
            : status === 'denied'
            ? 'bg-red-50 border-red-600 text-red-600'
            : 'bg-white border-gray-900 text-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1'}
        `}
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl border-2 border-gray-900 ${status === 'active' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>
            {status === 'active' ? <ShieldCheckIcon className="h-4 w-4" /> : <SignalIcon className="h-4 w-4" />}
          </div>
          <div className="text-left">
            <p className="text-[10px] font-black uppercase tracking-tighter leading-none">
              {status === 'active' ? 'SİSTEM BAĞLI' : status === 'denied' ? 'ERİŞİM YOK' : 'BİLDİRİM HATTI'}
            </p>
            <p className="text-[8px] font-bold uppercase opacity-60 mt-1 italic leading-none">
              {status === 'active' ? 'TAKİP EDİLİYOR' : status === 'denied' ? 'AYARLARI AÇ' : 'BAĞLANMAK İÇİN TIKLA'}
            </p>
          </div>
        </div>

        {status === 'active' ? (
          <div className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
          </div>
        ) : status === 'loading' ? (
          <ArrowPathIcon className="h-4 w-4 animate-spin text-blue-600" />
        ) : status === 'denied' ? (
          <ExclamationCircleIcon className="h-4 w-4 text-red-600" />
        ) : null}
      </button>
    </div>
  );
}