'use client';

import React, { useState, useEffect } from 'react';
import { XMarkIcon, ChatBubbleBottomCenterTextIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/solid';

interface FeedbackModalProps {
  formUrl: string;
}

export default function FeedbackModal({ formUrl }: FeedbackModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Sayfa yüklendikten 3 saniye sonra veya belirli bir tetikleyiciyle açılabilir
  useEffect(() => {
    const hasSeenFeedback = localStorage.getItem('hasSeenFeedback');
    if (!hasSeenFeedback) {
      const timer = setTimeout(() => setIsOpen(true), 3000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    // Kullanıcıyı sürekli darlamamak için localStorage'a kaydediyoruz
    localStorage.setItem('hasSeenFeedback', 'true');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
      {/* MODAL KAPSAYICI */}
      <div className="relative bg-white border-4 border-gray-900 w-full max-w-md rounded-[2.5rem] shadow-[15px_15px_0px_0px_rgba(37,99,235,1)] overflow-hidden animate-in fade-in zoom-in duration-300">
        
        {/* KAPATMA BUTONU */}
        <button 
          onClick={handleClose}
          className="absolute top-5 right-5 p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-900"
        >
          <XMarkIcon className="h-6 w-6 stroke-[3px]" />
        </button>

        <div className="p-8 md:p-10 space-y-6">
          {/* İKON & BAŞLIK */}
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="p-4 bg-blue-600 border-4 border-gray-900 rounded-2xl rotate-3 shadow-lg">
              <ChatBubbleBottomCenterTextIcon className="h-8 w-8 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter italic">
                FİKRİN <span className="text-blue-600">BİZİM İÇİN</span> DEĞERLİ!
              </h2>
            </div>
          </div>

          <div className="h-px bg-gray-100 w-full" />

          {/* MESAJ */}
          <p className="text-xs font-bold text-gray-600 leading-relaxed text-center italic">
            "Sistemi kullanırken yaşadığınız deneyimi 2 dakikada paylaşın, araç talep sürecini sizin için daha kusursuz hale getirelim."
          </p>

          {/* AKSİYON BUTONU */}
          <div className="pt-4">
            <a 
              href={formUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleClose}
              className="
                w-full flex items-center justify-center gap-3 
                bg-gray-900 text-white 
                py-5 rounded-2xl 
                font-black uppercase text-[10px] tracking-[0.2em] 
                hover:bg-blue-600 transition-all 
                active:scale-95 shadow-xl
              "
            >
              ANKETE KATIL <ArrowTopRightOnSquareIcon className="h-5 w-5" />
            </a>
            
            <button 
              onClick={handleClose}
              className="w-full mt-4 text-[9px] font-black text-gray-400 uppercase tracking-widest hover:text-gray-900 transition-colors"
            >
              Belki Daha Sonra
            </button>
          </div>
        </div>

        {/* ALT DEKORASYON BAR */}
        <div className="h-3 bg-blue-600 w-full border-t-4 border-gray-900" />
      </div>
    </div>
  );
}