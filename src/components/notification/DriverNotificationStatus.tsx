'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { SignalIcon, ShieldCheckIcon, ArrowPathIcon, ExclamationCircleIcon } from '@heroicons/react/24/solid';

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

export default function DriverNotificationStatus() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'active' | 'denied' | 'unsupported'>('loading');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const init = async () => {
        if (!('serviceWorker' in navigator) || !('Notification' in window)) {
          console.warn("Driver: Bildirim desteği yok.");
          setStatus('unsupported');
          return;
        }

        const permission = Notification.permission;
        if (permission === 'granted') setStatus('active');
        else if (permission === 'denied') setStatus('denied');
        else setStatus('idle');
      };
      init();
    }
  }, []);

  const handleSubscribe = async () => {
    const publicKey = process.env.NEXT_PUBLIC_VAPID_KEY;
    if (!publicKey) {
      alert("Driver: VAPID Key bulunamadı!");
      return;
    }

    setStatus('loading');
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;
      const permission = await window.Notification.requestPermission();

      if (permission === 'granted') {
        const convertedKey = urlBase64ToUint8Array(publicKey);
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedKey!
        });
        await axios.post('/api/driver/push/subscribe', subscription);
        setStatus('active');
      } else {
        setStatus('denied');
      }
    } catch (err: any) {
      console.error("Driver Abonelik Hatası:", err);
      setStatus('denied');
      alert("Hata: " + err.message);
    }
  };

  // 🛡️ BURASI DEĞİŞTİ: null yerine artık uyarı dönüyoruz
  if (status === 'unsupported') {
    return (
      <div className="px-4 py-2 mt-4 bg-blue-50 border border-blue-200 rounded-xl">
        <p className="text-[10px] font-bold text-blue-800 uppercase italic">
          ⚠️ Bildirim Desteği Bulunamadı
        </p>
      </div>
    );
  }

  return (
    <div className="px-4 py-2 mt-4">
      <button
        onClick={handleSubscribe}
        disabled={status === 'loading' || status === 'active'}
        className={`w-full flex items-center justify-between p-3 rounded-2xl border-4 transition-all
          ${status === 'active' 
            ? 'bg-blue-50 border-gray-900 text-blue-700' 
            : status === 'denied'
            ? 'bg-red-50 border-red-600 text-red-600'
            : 'bg-white border-gray-900 text-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'}`}
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl border-2 border-gray-900 ${status === 'active' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>
            {status === 'active' ? <ShieldCheckIcon className="h-4 w-4" /> : <SignalIcon className="h-4 w-4" />}
          </div>
          <div className="text-left">
            <p className="text-[10px] font-black uppercase leading-none">
              {status === 'active' ? 'SİSTEM BAĞLI' : status === 'denied' ? 'ERİŞİM YOK' : 'BİLDİRİM HATTI'}
            </p>
          </div>
        </div>
        {status === 'loading' && <ArrowPathIcon className="h-4 w-4 animate-spin text-blue-600" />}
        {status === 'denied' && <ExclamationCircleIcon className="h-4 w-4 text-red-600" />}
      </button>
    </div>
  );
}