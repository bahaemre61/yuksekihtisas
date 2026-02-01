// src/app/dashboard/admin/page.tsx

import Link from 'next/link';
import { CpuChipIcon, TruckIcon } from '@heroicons/react/24/outline';

// HATA BURADAYDI: "export default function" yazmazsak Next.js bu dosyayı tanımaz.
export default function AdminDashboardHome() {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-2">Yönetici Paneli</h1>
      <p className="text-gray-500 mb-8">Sistemdeki tüm operasyonları buradan yönetebilirsiniz.</p>

      {/* Menü Kartları */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* 1. ARAÇ TALEPLERİ KARTI */}
        <Link 
          href="/dashboard/admin/arac-talepleri" // Burası araç admin sayfanızın yolu olmalı
          className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:border-blue-500 hover:shadow-md transition-all group cursor-pointer"
        >
          <div className="flex items-center gap-4">
            <div className="bg-blue-100 p-4 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors text-blue-600">
              <TruckIcon className="h-8 w-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-800">Araç Talepleri</h3>
              <p className="text-sm text-gray-500 mt-1">
                Bekleyen araç isteklerini onayla, şoför ata ve geçmiş kayıtları incele.
              </p>
            </div>
          </div>
        </Link>

        {/* 2. TEKNİK DESTEK KARTI (Yeni Eklediğimiz) */}
        <Link 
          href="/dashboard/admin/teknik-talepler" 
          className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:border-orange-500 hover:shadow-md transition-all group cursor-pointer"
        >
          <div className="flex items-center gap-4">
            <div className="bg-orange-100 p-4 rounded-lg group-hover:bg-orange-600 group-hover:text-white transition-colors text-orange-600">
              <CpuChipIcon className="h-8 w-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-800">Teknik Destek</h3>
              <p className="text-sm text-gray-500 mt-1">
                Arıza kayıtlarını görüntüle, personel ataması yap ve durumları yönet.
              </p>
            </div>
          </div>
        </Link>

      </div>
    </div>
  );
}