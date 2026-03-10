'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { SignalIcon, CheckBadgeIcon, ShieldExclamationIcon, ArrowPathIcon } from '@heroicons/react/24/solid';

export default function NotificationStatus() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'active' | 'denied'>('idle');

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') setStatus('active');
      if (Notification.permission === 'denied') setStatus('denied');
    }
  }, []);

  const handleSubscribe = async () => {
  setStatus('loading');
  try {
    console.log("1. Adım: Service Worker kaydı başlıyor...");
    const registration = await navigator.serviceWorker.register('/sw.js');
    console.log("2. Adım: Service Worker hazır.");

    console.log("3. Adım: İzin isteniyor...");
    const permission = await Notification.requestPermission();
    console.log("İzin durumu:", permission);

    if (permission === 'granted') {
      console.log("4. Adım: Push Manager aboneliği alınıyor...");
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      });
      
      console.log("5. Adım: Backend'e gönderiliyor...");
      await axios.post('/api/driver/push/subscribe', subscription);
      setStatus('active');
    } else {
      setStatus('denied');
    }
  } catch (err) {
    console.error("🚨 HATA YAKALANDI:", err);
    setStatus('denied');
    const errorMessage = err instanceof Error ? err.message : 'Bilinmeyen hata';
    alert("Hata oluştu: " + errorMessage);
  }
};

  return (
    <div className="px-4 py-2 mt-4">
      <button
        onClick={handleSubscribe}
        disabled={status === 'loading' || status === 'active'}
        className={`
          w-full flex items-center justify-between p-3 rounded-2xl border-4 transition-all group
          ${status === 'active' 
            ? 'bg-green-50 border-gray-900 text-green-700' 
            : status === 'denied'
            ? 'bg-red-50 border-red-600 text-red-600'
            : 'bg-white border-gray-900 text-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1'}
        `}
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl border-2 border-gray-900 ${status === 'active' ? 'bg-green-500 text-white' : 'bg-gray-100'}`}>
            {status === 'active' ? <CheckBadgeIcon className="h-4 w-4" /> : <SignalIcon className="h-4 w-4" />}
          </div>
          <div className="text-left">
            <p className="text-[10px] font-black uppercase tracking-tighter leading-none">
              {status === 'active' ? 'SİSTEM BAĞLI' : status === 'denied' ? 'ERİŞİM YOK' : 'BİLDİRİM HATTI'}
            </p>
            <p className="text-[8px] font-bold uppercase opacity-60 mt-1 italic">
              {status === 'active' ? 'ANLIK TAKİP AÇIK' : status === 'denied' ? 'İZİN VERİLMELİ' : 'BAĞLANMAK İÇİN TIKLA'}
            </p>
          </div>
        </div>

        {status === 'active' ? (
          <div className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </div>
        ) : status === 'loading' ? (
          <ArrowPathIcon className="h-4 w-4 animate-spin text-blue-600" />
        ) : null}
      </button>
    </div>
  );
}