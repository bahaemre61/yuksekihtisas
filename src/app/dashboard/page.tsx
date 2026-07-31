'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Link from 'next/link';
import {
  WrenchScrewdriverIcon,
  DocumentTextIcon,
  CalendarIcon,
  MegaphoneIcon,
  ArrowRightIcon,
  TruckIcon,
  CpuChipIcon,
  ShoppingBagIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  BanknotesIcon
} from '@heroicons/react/24/outline';

enum RequestStatus {
  PENDING = 'pending',
  ASSIGNED = 'assigned',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

interface IVehicleRequest {
  _id: string;
  purpose: string;
  status: RequestStatus;
  startTime: string;
}

interface ITechnicalRequest {
  _id: string;
  title: string;
  status: RequestStatus;
  createdAt: string;
}

interface IMaterialRequest {
  _id: string;
  materialName: string;
  materialType: string;
  quantity: number;
  unit: string;
  status: 'pending_supervisor' | 'pending_mali_isler' | 'approved' | 'rejected';
  createdAt: string;
}

interface IAnnouncement {
  _id: string;
  title: string;
  priority: 'normal' | 'urgent';
  createdAt: string;
}

interface IMenu {
  date: string;
  items: string[];
  calories?: number;
}

const StatusBadge = ({ status }: { status: RequestStatus }) => {
  let colorClass = '';
  let text = status.toUpperCase();
  switch (status) {
    case RequestStatus.PENDING:
      colorClass = 'bg-warning/20 text-warning';
      text = 'Beklemede';
      break;
    case RequestStatus.ASSIGNED:
      colorClass = 'bg-info/20 text-info';
      text = 'Atandı';
      break;
    case RequestStatus.COMPLETED:
      colorClass = 'bg-success/20 text-success';
      text = 'Tamamlandı';
      break;
    case RequestStatus.CANCELLED:
      colorClass = 'bg-error/20 text-error';
      text = 'İptal';
      break;
    default:
      text = status;
  }
  return <span className={`px-2 py-1 text-xs font-bold rounded ${colorClass}`}>{text}</span>;
};

const MaterialStatusBadge = ({ status }: { status: string }) => {
  switch (status) {
    case 'pending_supervisor':
      return (
        <span className="px-2 py-1 text-xs font-bold rounded bg-amber-500/20 text-amber-600 inline-flex items-center gap-1">
          <ClockIcon className="h-3 w-3" /> 1. Aşama Bekliyor
        </span>
      );
    case 'pending_mali_isler':
      return (
        <span className="px-2 py-1 text-xs font-bold rounded bg-sky-500/20 text-sky-600 inline-flex items-center gap-1">
          <BanknotesIcon className="h-3 w-3" /> 2. Aşama (Satın Alma)
        </span>
      );
    case 'approved':
      return (
        <span className="px-2 py-1 text-xs font-bold rounded bg-emerald-500/20 text-emerald-600 inline-flex items-center gap-1">
          <CheckCircleIcon className="h-3 w-3" /> Onaylandı
        </span>
      );
    case 'rejected':
      return (
        <span className="px-2 py-1 text-xs font-bold rounded bg-rose-500/20 text-rose-600 inline-flex items-center gap-1">
          <XCircleIcon className="h-3 w-3" /> Reddedildi
        </span>
      );
    default:
      return <span className="px-2 py-1 text-xs font-bold rounded bg-base-300">{status}</span>;
  }
};

export default function DashboardHome() {
  const [recentRequests, setRecentRequests] = useState<IVehicleRequest[]>([]);
  const [recentTechnicalRequests, setRecentTechnicalRequests] = useState<ITechnicalRequest[]>([]);
  const [recentMaterialRequests, setRecentMaterialRequests] = useState<IMaterialRequest[]>([]);

  const [announcements, setAnnouncements] = useState<IAnnouncement[]>([]);
  const [todayMenu, setTodayMenu] = useState<IMenu | null>(null);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const userRes = await axios.get('/api/me');
        setUserName(userRes.data.name);

        const reqReq = await axios.get('/api/requests/my');
        const activeRequests = reqReq.data.filter((req: IVehicleRequest) => req.status !== RequestStatus.CANCELLED);
        setRecentRequests(activeRequests.slice(0, 5));

        // Teknik Talepler
        const techRes = await axios.get('/api/technicalrequests/my');
        if (techRes.data.success) {
          const activeTechRequests = techRes.data.data.filter((req: ITechnicalRequest) => req.status !== RequestStatus.CANCELLED);
          setRecentTechnicalRequests(activeTechRequests.slice(0, 5));
        }

        // Malzeme Talepleri (Yeni Eklendi)
        try {
          const matRes = await axios.get('/api/material-requests');
          setRecentMaterialRequests(matRes.data.slice(0, 5));
        } catch (matErr) {
          console.error('Malzeme talepleri çekilemedi:', matErr);
        }

        // Duyurular
        const annRes = await axios.get('/api/announcements');
        setAnnouncements(annRes.data.slice(0, 3));

        // Yemek Menüsü
        const today = new Date();
        const menuRes = await axios.get('/api/menu', {
          params: { month: today.getMonth(), year: today.getFullYear() }
        });

        const foundMenu = menuRes.data.find((m: IMenu) => {
          const mDate = new Date(m.date);
          return mDate.getDate() === today.getDate() && mDate.getMonth() === today.getMonth();
        });

        setTodayMenu(foundMenu || null);
      } catch (err) {
        console.error('Dashboard verileri yüklenmedi', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hoşgeldiniz Başlığı */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-base-content">Merhaba, {userName} 👋</h1>
          <p className="text-base-content/60 mt-1">Güncel durum ve taleplerin burada.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* SOL SÜTUN (2/3 Genişlik) */}
        <div className="lg:col-span-2 space-y-6">
          {/* 1. KART: ARAÇ TALEPLERİM */}
          <div className="bg-base-100 p-6 rounded-xl shadow-sm border border-base-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-base-content flex items-center">
                <TruckIcon className="h-5 w-5 mr-2 text-primary" />
                Son Araç Taleplerim
              </h3>
              <Link href="/dashboard/taleplerim" className="text-sm text-primary hover:underline flex items-center">
                Tümü <ArrowRightIcon className="h-4 w-4 ml-1" />
              </Link>
            </div>

            <div className="space-y-3">
              {recentRequests.length === 0 ? (
                <div className="text-center py-6 text-base-content/50 bg-base-200 rounded-lg border border-dashed border-base-200 text-sm">
                  Aktif araç talebiniz bulunmuyor.
                </div>
              ) : (
                recentRequests.map((req) => (
                  <div key={req._id} className="flex items-center justify-between p-3 hover:bg-base-200 rounded-lg transition-colors border-b border-base-200 last:border-0">
                    <div>
                      <p className="font-medium text-base-content">{req.purpose}</p>
                      <p className="text-xs text-base-content/60">
                        {new Date(req.startTime).toLocaleString('tr-TR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <StatusBadge status={req.status} />
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 2. KART: TEKNİK TALEPLERİM */}
          <div className="bg-base-100 p-6 rounded-xl shadow-sm border border-base-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-base-content flex items-center">
                <CpuChipIcon className="h-5 w-5 mr-2 text-warning" />
                Son Teknik Taleplerim
              </h3>
              <Link href="/dashboard/tekniktaleplerim" className="text-sm text-warning hover:underline flex items-center">
                Tümü <ArrowRightIcon className="h-4 w-4 ml-1" />
              </Link>
            </div>

            <div className="space-y-3">
              {recentTechnicalRequests.length === 0 ? (
                <div className="text-center py-6 text-base-content/50 bg-base-200 rounded-lg border border-dashed border-base-200 text-sm">
                  Aktif teknik destek talebiniz bulunmuyor.
                </div>
              ) : (
                recentTechnicalRequests.map((req) => (
                  <div key={req._id} className="flex items-center justify-between p-3 hover:bg-base-200 rounded-lg transition-colors border-b border-base-200 last:border-0">
                    <div>
                      <p className="font-medium text-base-content">{req.title}</p>
                      <p className="text-xs text-base-content/60">
                        {new Date(req.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <StatusBadge status={req.status} />
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 3. KART: SON MALZEME TALEPLERİM (YENİ EKLENDİ) */}
          <div className="bg-base-100 p-6 rounded-xl shadow-sm border border-base-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-base-content flex items-center">
                <ShoppingBagIcon className="h-5 w-5 mr-2 text-secondary" />
                Son Malzeme Taleplerim
              </h3>
              <Link href="/dashboard/malzemetalepleri" className="text-sm text-secondary hover:underline flex items-center">
                Tümü <ArrowRightIcon className="h-4 w-4 ml-1" />
              </Link>
            </div>

            <div className="space-y-3">
              {recentMaterialRequests.length === 0 ? (
                <div className="text-center py-6 text-base-content/50 bg-base-200 rounded-lg border border-dashed border-base-200 text-sm">
                  Aktif malzeme talebiniz bulunmuyor.
                </div>
              ) : (
                recentMaterialRequests.map((req) => (
                  <div key={req._id} className="flex items-center justify-between p-3 hover:bg-base-200 rounded-lg transition-colors border-b border-base-200 last:border-0">
                    <div>
                      <p className="font-medium text-base-content">
                        {req.materialName} <span className="text-xs text-base-content/60">({req.quantity} {req.unit})</span>
                      </p>
                      <p className="text-xs text-base-content/60">
                        {req.materialType} • {new Date(req.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <MaterialStatusBadge status={req.status} />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* SAĞ SÜTUN: Bilgi Kartları (1/3 Genişlik) */}
        <div className="space-y-6">
          {/* 1. Günün Menüsü Kartı */}
          <div className="bg-base-100 p-6 rounded-xl shadow-sm border border-base-200">
            <h3 className="text-lg font-semibold text-base-content mb-4 flex items-center">
              <CalendarIcon className="h-5 w-5 mr-2 text-success" />
              Günün Menüsü
            </h3>

            {todayMenu ? (
              <div className="bg-success/10 p-4 rounded-lg border border-success/20">
                <p className="text-sm text-success font-bold mb-2 border-b border-success/20 pb-1">
                  {new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'long' })}
                </p>
                <ul className="space-y-1">
                  {todayMenu.items.map((item, idx) => (
                    <li key={idx} className="text-sm text-base-content/80 flex items-start">
                      <span className="mr-2 text-success">•</span> {item}
                    </li>
                  ))}
                </ul>
                {todayMenu.calories && (
                  <p className="text-xs text-success/70 mt-3 text-right font-semibold">
                    ~ {todayMenu.calories} kcal
                  </p>
                )}
              </div>
            ) : (
              <div className="text-center py-6 text-base-content/50 bg-base-200 rounded-lg text-sm border border-dashed border-base-200">
                Bugün için menü girişi yapılmamış.
              </div>
            )}
            <div className="mt-3 text-right">
              <Link href="/dashboard/yemek" className="text-xs text-base-content/60 hover:text-success">
                Tüm Ayı Gör &rarr;
              </Link>
            </div>
          </div>

          {/* 2. Duyurular Kartı */}
          <div className="bg-base-100 p-6 rounded-xl shadow-sm border border-base-200">
            <h3 className="text-lg font-semibold text-base-content mb-4 flex items-center">
              <MegaphoneIcon className="h-5 w-5 mr-2 text-secondary" />
              Duyurular
            </h3>

            <div className="space-y-4">
              {announcements.length === 0 ? (
                <p className="text-sm text-base-content/50 text-center py-4 bg-base-200 rounded-lg border border-dashed">
                  Yeni duyuru yok.
                </p>
              ) : (
                announcements.map((ann) => (
                  <div
                    key={ann._id}
                    className={`text-sm pb-3 border-b border-base-200 last:border-0 last:pb-0 ${ann.priority === 'urgent' ? 'bg-error/10 p-2 rounded border-l-2 border-error' : ''
                      }`}
                  >
                    <p className="font-medium text-base-content truncate">{ann.title}</p>
                    <p className="text-xs text-base-content/60 mt-1">
                      {new Date(ann.createdAt).toLocaleDateString('tr-TR')}
                    </p>
                  </div>
                ))
              )}
            </div>
            <div className="mt-3 text-right">
              <Link href="/dashboard/duyurular" className="text-xs text-base-content/60 hover:text-secondary">
                Tümünü Oku &rarr;
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}