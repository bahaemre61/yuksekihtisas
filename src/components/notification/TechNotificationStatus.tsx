'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  WrenchScrewdriverIcon, 
  CpuChipIcon, 
  ArrowPathIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/solid';

function urlBase64ToUint8Array(base64String: string) {
  if (!base64String) return null;
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
  const [status, setStatus] = useState<'idle' | 'loading' | 'active' | 'denied' | 'unsupported'>('loading');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const checkStatus = async () => {
        if (!('serviceWorker' in navigator) || !('Notification' in window)) {
          setStatus('unsupported');
          return;
        }
        if (Notification.permission === 'granted') {
          setStatus('active');
        } else if (Notification.permission === 'denied') {
          setStatus('denied');
        } else {
          setStatus('idle');
        }
      };
      checkStatus();
    }
  }, []);

  const handleSubscribe = async () => {
    const publicKey = process.env.NEXT_PUBLIC_VAPID_KEY;
    if (!publicKey) return alert("VAPID Key Eksik!");

    setStatus('loading');
    try {
      // 1. SW Kaydı ve Hazırlık (iPhone'da register zorunludur)
      const registration = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      // 2. İzin İsteği
      const permission = await window.Notification.requestPermission();

      if (permission === 'granted') {
        const convertedKey = urlBase64ToUint8Array(publicKey);
        if (!convertedKey) throw new Error("Key çevrilemedi");

        // 3. Abonelik
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedKey
        });

        // 4. Backend Kaydı
        await axios.post('/api/driver/push/subscribe', subscription);
        setStatus('active');
      } else {
        setStatus('denied');
      }
    } catch (err: any) {
      console.error("Abonelik hatası:", err);
      setStatus('denied');
      alert("Hata: " + err.message);
    }
  };

  if (status === 'unsupported') {
    return (
      <div className="px-4 py-2 mt-4 bg-red-50 border-2 border-red-600 rounded-xl text-[10px] font-black text-red-700 uppercase italic">
        ⚠️ Baha, iPhone için 'Ana Ekrana Ekle' şart!
      </div>
    );
  }

  return (
    <div className="px-4 py-2 mt-4">
      <button
        onClick={handleSubscribe}
        disabled={status === 'loading' || status === 'active'}
        className={`w-full flex items-center justify-between p-3 rounded-2xl border-4 transition-all
          ${status === 'active' ? 'bg-amber-50 border-gray-900 text-amber-700' : 'bg-white border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'}`}
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl border-2 border-gray-900 ${status === 'active' ? 'bg-amber-500 text-white' : 'bg-gray-100'}`}>
            {status === 'active' ? <CpuChipIcon className="h-4 w-4" /> : <WrenchScrewdriverIcon className="h-4 w-4" />}
          </div>
          <div className="text-left">
            <p className="text-[10px] font-black uppercase leading-none">{status === 'active' ? 'TEKNİK HAT AKTİF' : 'BİLDİRİMİ AÇ'}</p>
          </div>
        </div>
        {status === 'loading' && <ArrowPathIcon className="h-4 w-4 animate-spin text-amber-600" />}
      </button>
    </div>
  );
}