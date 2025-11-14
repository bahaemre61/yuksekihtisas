import React from 'react';
// Tailwind'in ikon kütüphanesinden bir "inşaat/araçlar" ikonu alalım
import { WrenchScrewdriverIcon } from '@heroicons/react/24/outline';
import errologo from '@/src/components/404-illustration.png.jpg'

interface Props {
  title: string;
  subtitle?: string;
}

export default function PlaceholderContent({ title, subtitle }: Props) {
  return (
    <div className="flex flex-col items-center justify-center text-center bg-white p-10 rounded-lg shadow-lg border-2 border-dashed border-gray-300 min-h-[70vh]">
      
      {/* 1. Üstteki Resim (İkon) */}
      <WrenchScrewdriverIcon className="h-24 w-24 text-gray-400" />
      
      {/* 2. Alttaki Yazı (Başlık) */}
      <h2 className="mt-6 text-2xl font-bold text-gray-800">
        {title}
      </h2>
      
      {/* 3. Alttaki Yazı (Açıklama) */}
      <p className="mt-2 text-lg text-gray-500">
        {subtitle || 'Bu bölüm şu anda yapım aşamasındadır.'}
      </p>
      <p className="mt-1 text-gray-500">
        Lütfen daha sonra tekrar kontrol edin.
      </p>
    </div>
  );
}