import React from 'react';
import { WrenchScrewdriverIcon } from '@heroicons/react/24/outline';

interface Props {
  title: string;
  subtitle?: string;
}

export default function PlaceholderContent({ title, subtitle }: Props) {
  return (
    <div className="flex flex-col items-center justify-center text-center bg-base-100 p-10 rounded-lg shadow-lg border-2 border-dashed border-base-300 min-h-[70vh]">
      
      <WrenchScrewdriverIcon className="h-24 w-24 text-base-content/30" />
      
      <h2 className="mt-6 text-2xl font-bold text-base-content">
        {title}
      </h2>
      
      <p className="mt-2 text-lg text-base-content/70">
        {subtitle || 'Bu bölüm şu anda yapım aşamasındadır.'}
      </p>
      <p className="mt-1 text-base-content/70">
        Lütfen daha sonra tekrar kontrol edin.
      </p>
    </div>
  );
}