'use client';

import React, { useState, useEffect, Fragment } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import axios from "axios";
import { Dialog, Transition } from '@headlessui/react';
import {
  HomeIcon,
  TruckIcon,
  ArchiveBoxIcon,
  DocumentTextIcon,
  CalendarIcon,
  CheckBadgeIcon,
  UserIcon,
  ArrowLeftEndOnRectangleIcon,
  PlusCircleIcon,
  XMarkIcon,
  ClipboardDocumentCheckIcon,
  CommandLineIcon,
  CpuChipIcon,
  WrenchScrewdriverIcon,
  ServerStackIcon,
  Cog6ToothIcon,
  UsersIcon
} from '@heroicons/react/24/outline';
import unilogo from "@/src/components/yuksekihtisasuni-logo.png"
import DriverNotificationStatus from "./notification/DriverNotificationStatus";
import TechNotificationStatus from "./notification/TechNotificationStatus";

const UserRole = { USER: 'user', DRIVER: 'driver', ADMIN: 'admin', AMIR: 'amir', TECHNICAL: 'tech', SUPERVISOR: 'supervisor', TECHAMIR: 'techamir', AKADEMI: 'akademik' } as const;
type UserRole = typeof UserRole[keyof typeof UserRole];
interface IUser { name: string; role: UserRole; driverStatus?: 'available' | 'busy'; }


const handeLagout = async (router: any) => {
  try {
    await axios.post('api/auth/logout');
    router.push('/login')
  } catch (err) {
    console.error('Çıkış Yapılmadı', err);
    router.push('/login');
  }
};


const fetchUser = async (): Promise<IUser | null> => {
  try {
    const res = await axios.get('/api/me');
    return res.data;
  } catch (e) {
    console.error('Kullanıcı bilgisi alınamadı', e)
    return null;
  }
};

export default function Sidebar({ isMobileMenuOpen, setIsMobileMenuOpen }: {
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (isOpen: boolean) => void;
}) {
  const [user, setUser] = useState<IUser | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    fetchUser().then((userData) => {
      if (userData) {
        setUser(userData);
      }
      else {
        handeLagout(router);
      }
    });
  }, []);

  const handleStatusChange = async (newStatus: 'available' | 'busy') => {
    if (!user) return;

    try {
      const res = await axios.put('/api/driver/status', { status: newStatus });
      setUser(res.data)
    } catch (err) {
      console.error("Durum güncellenemedi", err);
    }
  }

  const navLinks = [
    { name: 'Ana Sayfa', href: '/dashboard', icon: HomeIcon, roles: [UserRole.USER, UserRole.DRIVER, UserRole.ADMIN, UserRole.TECHNICAL, UserRole.AMIR, UserRole.SUPERVISOR, UserRole.TECHAMIR, UserRole.AKADEMI] },
    { name: 'Yeni Talep Oluştur', href: '/dashboard/talep-olustur', icon: PlusCircleIcon, roles: [UserRole.USER, UserRole.DRIVER, UserRole.ADMIN, UserRole.AMIR, UserRole.TECHNICAL, UserRole.SUPERVISOR, UserRole.TECHAMIR, UserRole.AKADEMI] },
    { name: 'Araç Taleplerim', href: '/dashboard/taleplerim', icon: TruckIcon, roles: [UserRole.USER, UserRole.ADMIN, UserRole.TECHNICAL, UserRole.SUPERVISOR, UserRole.TECHAMIR, UserRole.AMIR] },
    { name: 'Teknik Taleplerim', href: '/dashboard/tekniktaleplerim', icon: WrenchScrewdriverIcon, roles: [UserRole.USER, UserRole.ADMIN, UserRole.DRIVER, UserRole.AMIR, UserRole.SUPERVISOR, UserRole.AKADEMI] },
    { name: 'Araç Talep Yığını', href: '/dashboard/yigin', icon: ArchiveBoxIcon, roles: [UserRole.ADMIN, UserRole.SUPERVISOR] },
    { name: 'Teknik Talepler', href: '/dashboard/teknikyigin', icon: CpuChipIcon, roles: [UserRole.ADMIN, UserRole.TECHAMIR] },
    { name: 'Yapılacak Listem', href: '/dashboard/todo', icon: CheckBadgeIcon, roles: [UserRole.USER, UserRole.DRIVER, UserRole.ADMIN, UserRole.AMIR, UserRole.TECHNICAL, UserRole.SUPERVISOR, UserRole.TECHAMIR, UserRole.AKADEMI] },
    { name: 'Duyurular', href: '/dashboard/duyurular', icon: DocumentTextIcon, roles: [UserRole.USER, UserRole.DRIVER, UserRole.ADMIN, UserRole.AMIR, UserRole.TECHNICAL, UserRole.TECHAMIR, UserRole.AKADEMI] },
    { name: 'Yemek Menüsü', href: '/dashboard/yemek', icon: CalendarIcon, roles: [UserRole.USER, UserRole.DRIVER, UserRole.ADMIN, UserRole.AMIR, UserRole.TECHNICAL, UserRole.SUPERVISOR, UserRole.TECHAMIR, UserRole.AKADEMI] },
    { name: 'Görevlerim', href: '/dashboard/gorevlerim', icon: ClipboardDocumentCheckIcon, roles: [UserRole.DRIVER,] },
    { name: 'Teknik Görevlerim', href: '/dashboard/teknikgorevlerim', icon: ServerStackIcon, roles: [UserRole.TECHNICAL,] },
    { name: 'Yönetim Paneli', href: '/dashboard/admin', icon: CommandLineIcon, roles: [UserRole.ADMIN, UserRole.SUPERVISOR] },
    { name: 'Kullanıcılar', href: '/dashboard/kullanicilar', icon: UserIcon, roles: [UserRole.ADMIN] },
    { name: 'Toplantılar', href: '/dashboard/toplantilar', icon: UsersIcon, roles: [UserRole.USER, UserRole.DRIVER, UserRole.ADMIN, UserRole.AMIR, UserRole.TECHNICAL, UserRole.SUPERVISOR, UserRole.TECHAMIR, UserRole.AKADEMI] },
    { name: 'Ayarlar', href: '/dashboard/ayarlar', icon: Cog6ToothIcon, roles: [UserRole.USER, UserRole.AMIR, UserRole.TECHNICAL, UserRole.DRIVER, UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.TECHAMIR, UserRole.AKADEMI] },
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full bg-base-100 pt-5 pb-4 shadow-xl border-r border-base-200">
      <div className="flex flex-col grow pt-5 pb-4 overflow-y-auto">
        <div className="flex items-center shrink-0 px-4">
          <img
            className="h-10 w-auto"
            src={unilogo.src}
            alt="Logo"
          />
          <span className="ml-3 text-xl font-bold text-base-content">Talep Sistemi</span>
        </div>

        {!user && (
          <div className="flex-1 flex items-center justify-center">
            <svg className="h-8 w-8 animate-spin text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        )}
        {user && (
          <div className="mt-5 flex-1 flex flex-col">
            <nav className="flex-1 px-2 space-y-1">
              {navLinks.map((item) => {
                if (user && item.roles.includes(user.role)) {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`
                        ${isActive ? 'bg-primary/10 text-primary' : 'text-base-content/70 hover:bg-base-200 hover:text-base-content'}
                        group flex items-center px-2 py-2 text-sm font-medium rounded-md
                      `}
                    >
                      <item.icon
                        className={`
                          ${isActive ? 'text-primary' : 'text-base-content/50 group-hover:text-base-content/70'}
                          mr-3 shrink-0 h-6 w-6
                        `}
                      />
                      {item.name}
                      {item.name === 'Toplantılar' && (
                        <span className="relative ml-2 group/badge">
                          {/* <span className="inline-flex items-center bg-info text-info-content text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm animate-pulse cursor-default">
                            YENİ
                          </span> */}
                        </span>
                      )}
                    </Link>
                  );
                }
                return null;
              })}
            </nav>
          </div>

        )}
        {user && user.role === UserRole.TECHNICAL && (
          <div className="border-t border-base-200 p-4 bg-warning/10">
            <TechNotificationStatus />
            <div className="text-center mt-3">
              <p className="text-[10px] font-black text-warning/70 uppercase tracking-widest mb-1 italic">Teknik Servis Hattı</p>
              <span className="text-[9px] font-black text-warning bg-warning/20 px-3 py-1 rounded-lg border border-warning/30 uppercase tracking-tighter">
                Anlık Bildirimler Aktif
              </span>
            </div>
          </div>
        )}
        {user && user.role === UserRole.DRIVER && (

          <div className="border-t border-base-200 p-4">
            <DriverNotificationStatus />
            <div className="text-center mb-2">
              <p className="text-sm font-medium text-base-content/80">Durumunuz</p>
              {user.driverStatus === 'available' ? (
                <span className="inline-flex items-center rounded-full bg-success/20 px-3 py-1 text-xs font-medium text-success">
                  <svg className="-ml-1 mr-1.5 h-2 w-2 text-success" fill="currentColor" viewBox="0 0 8 8">
                    <circle cx={4} cy={4} r={3} />
                  </svg>
                  Uygun
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full bg-error/20 px-3 py-1 text-xs font-medium text-error">
                  <svg className="-ml-1 mr-1.5 h-2 w-2 text-error" fill="currentColor" viewBox="0 0 8 8">
                    <circle cx={4} cy={4} r={3} />
                  </svg>
                  Meşgul
                </span>
              )}
            </div>
          </div>
        )}
        <div className="border-t border-base-200 p-4">
          <a href="#" onClick={() => handeLagout(router)} className="group shrink-0 w-full">
            <div className="flex items-center">
              <div>
                <UserIcon className="inline-block h-9 w-9 rounded-full text-base-content/50" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-base-content/80 group-hover:text-base-content">{user?.name || '...'}</p>
                <p className="text-xs font-medium text-base-content/70 group-hover:text-base-content flex items-center">
                  Çıkış Yap <ArrowLeftEndOnRectangleIcon className='ml-1 h-4 w-4' />
                </p>
              </div>
            </div>
          </a>
        </div>

      </div>
    </div>
  );
  return (
    <>
      <Transition.Root show={isMobileMenuOpen} as={Fragment}>
        <Dialog as="div" className="relative z-40 md:hidden" onClose={setIsMobileMenuOpen}>

          <Transition.Child
            as={Fragment}
            enter="transition-opacity ease-linear duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition-opacity ease-linear duration-300"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-base-content/50 bg-opacity-75" />
          </Transition.Child>

          <div className="fixed inset-0 flex z-40">
            <Transition.Child
              as={Fragment}
              enter="transition ease-in-out duration-300 transform"
              enterFrom="-translate-x-full"
              enterTo="translate-x-0"
              leave="transition ease-in-out duration-300 transform"
              leaveFrom="translate-x-0"
              leaveTo="-translate-x-full"
            >
              <Dialog.Panel className="relative flex-1 flex flex-col max-w-xs w-full">

                <div className="absolute top-0 right-0 -mr-12 pt-2">
                  <button
                    type="button"
                    className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <XMarkIcon className="h-6 w-6 text-white" />
                  </button>
                </div>

                {sidebarContent}

              </Dialog.Panel>
            </Transition.Child>
            <div className="shrink-0 w-14" aria-hidden="true">
            </div>
          </div>
        </Dialog>
      </Transition.Root>

      <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
        {sidebarContent}
      </div>
    </>
  );
}
