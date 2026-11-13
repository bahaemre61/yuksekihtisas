'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';

// Kart basım modülü (otokart-basim yan servisi) portal içinde gömülü açılır.
// Asıl yetki kontrolü servis tarafında yapılır; bu sayfa yalnızca yetkisiz kullanıcıya açık bir mesaj gösterir.
const ALLOWED_ROLES = ['admin', 'ogrenci_isleri'];

export default function KartBasimPage() {
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await axios.get('/api/me');
        if (!cancelled) setAllowed(ALLOWED_ROLES.includes(res.data?.role));
      } catch {
        if (!cancelled) setAllowed(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  if (allowed === null) {
    return <div className="p-10 text-center text-base-content/50">Yükleniyor...</div>;
  }

  if (!allowed) {
    return (
      <div className="p-10 text-center">
        <h1 className="text-xl font-bold text-base-content">Erişim yok</h1>
        <p className="mt-2 text-sm text-base-content/60">Kart basım modülünü yalnızca Öğrenci İşleri yetkisine sahip kullanıcılar görebilir.</p>
      </div>
    );
  }

  return (
    <iframe
      src="/kart-basim/"
      title="Kart Basım"
      className="h-[calc(100vh-4rem)] w-full border-0 bg-base-100"
    />
  );
}
