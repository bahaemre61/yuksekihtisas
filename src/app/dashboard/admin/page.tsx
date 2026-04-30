// src/app/dashboard/admin/page.tsx

import Link from 'next/link';
import { CpuChipIcon, TruckIcon } from '@heroicons/react/24/outline';

// HATA BURADAYDI: "export default function" yazmazsak Next.js bu dosyayı tanımaz.
export default function AdminDashboardHome() {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-base-content mb-2">Yönetici Paneli</h1>
      <p className="text-base-content/70 mb-8">Sistemdeki tüm operasyonları buradan yönetebilirsiniz.</p>

      {/* Menü Kartları */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* 1. ARAÇ TALEPLERİ KARTI */}
        <Link 
          href="/dashboard/admin/arac-talepleri" // Burası araç admin sayfanızın yolu olmalı
          className="bg-base-100 p-6 rounded-xl shadow-sm border border-base-200 hover:border-info hover:shadow-md transition-all group cursor-pointer"
        >
          <div className="flex items-center gap-4">
            <div className="bg-info/10 p-4 rounded-lg group-hover:bg-info group-hover:text-info-content transition-colors text-info">
              <TruckIcon className="h-8 w-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-base-content">Araç Talepleri</h3>
              <p className="text-sm text-base-content/70 mt-1">
                Bekleyen araç isteklerini onayla, şoför ata ve geçmiş kayıtları incele.
              </p>
            </div>
          </div>
        </Link>

        {/* 2. TEKNİK DESTEK KARTI (Yeni Eklediğimiz) */}
        <Link 
          href="/dashboard/admin/teknik-talepler" 
          className="bg-base-100 p-6 rounded-xl shadow-sm border border-base-200 hover:border-warning hover:shadow-md transition-all group cursor-pointer"
        >
          <div className="flex items-center gap-4">
            <div className="bg-warning/10 p-4 rounded-lg group-hover:bg-warning group-hover:text-warning-content transition-colors text-warning">
              <CpuChipIcon className="h-8 w-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-base-content">Teknik Destek</h3>
              <p className="text-sm text-base-content/70 mt-1">
                Arıza kayıtlarını görüntüle, personel ataması yap ve durumları yönet.
              </p>
            </div>
          </div>
        </Link>

      </div>
    </div>
  );
}