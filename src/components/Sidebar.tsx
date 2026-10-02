'use client';

import React, { useState, useEffect, Fragment } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import axios from "axios";
import { Dialog, Transition } from '@headlessui/react';
import {
  HomeIcon,
  ArchiveBoxIcon,
  DocumentTextIcon,
  CalendarIcon,
  UserIcon,
  PlusCircleIcon,
  XMarkIcon,
  ClipboardDocumentCheckIcon,
  CommandLineIcon,
  CpuChipIcon,
  ServerStackIcon,
  Cog6ToothIcon,
  UsersIcon,
  ChevronDownIcon,
  ViewColumnsIcon,
  DocumentDuplicateIcon,
  ClipboardDocumentListIcon
} from '@heroicons/react/24/outline';
import unilogo from "@/src/components/yuksekihtisasuni-logo.png"
import DriverNotificationStatus from "./notification/DriverNotificationStatus";
import TechNotificationStatus from "./notification/TechNotificationStatus";

const UserRole = { USER: 'user', DRIVER: 'driver', ADMIN: 'admin', AMIR: 'amir', TECHNICAL: 'tech', SUPERVISOR: 'supervisor', TECHAMIR: 'techamir', AKADEMI: 'akademik', KANIT_SORUMLU: 'kanit_sorumlu', RAPORTOR: 'raportor', MALI_ISLER: 'mali_isler' } as const;
type UserRole = typeof UserRole[keyof typeof UserRole];
interface IUser { name: string; role: UserRole; driverStatus?: 'available' | 'busy'; }

const handeLagout = async (router: ReturnType<typeof useRouter>) => {
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
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
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

  type NavIcon = React.ComponentType<{ className?: string }>;
  type NavChild = { name: string; href: string; roles: UserRole[]; badge?: string };
  type NavEntry = { name: string; icon: NavIcon; href?: string; roles?: UserRole[]; children?: NavChild[] };

  const requestsGroup: NavEntry = {
    name: 'Taleplerim',
    icon: ClipboardDocumentListIcon,
    children: [
      { name: 'Malzeme Taleplerim', href: '/dashboard/malzemetalepleri', roles: [UserRole.USER, UserRole.DRIVER, UserRole.ADMIN, UserRole.AMIR, UserRole.TECHNICAL, UserRole.SUPERVISOR, UserRole.TECHAMIR, UserRole.AKADEMI, UserRole.MALI_ISLER] },
      { name: 'Araç Taleplerim', href: '/dashboard/taleplerim', roles: [UserRole.USER, UserRole.ADMIN, UserRole.TECHNICAL, UserRole.SUPERVISOR, UserRole.TECHAMIR, UserRole.AMIR, UserRole.MALI_ISLER] },
      { name: 'Teknik Taleplerim', href: '/dashboard/tekniktaleplerim', roles: [UserRole.USER, UserRole.ADMIN, UserRole.DRIVER, UserRole.AMIR, UserRole.SUPERVISOR, UserRole.AKADEMI, UserRole.MALI_ISLER] },
    ],
  };

  const formsGroup: NavEntry = {
    name: 'Formlar',
    icon: DocumentDuplicateIcon,
    children: [
      { name: 'Kurumsal Risk', href: '/dashboard/formlar/kurumsal-risk', badge: 'Hazırlanıyor', roles: [UserRole.USER, UserRole.DRIVER, UserRole.ADMIN, UserRole.TECHNICAL, UserRole.AMIR, UserRole.SUPERVISOR, UserRole.TECHAMIR, UserRole.AKADEMI, UserRole.KANIT_SORUMLU, UserRole.RAPORTOR, UserRole.MALI_ISLER] },
    ],
  };

  const navLinks: NavEntry[] = [
    { name: 'Ana Sayfa', href: '/dashboard', icon: HomeIcon, roles: [UserRole.USER, UserRole.DRIVER, UserRole.ADMIN, UserRole.TECHNICAL, UserRole.AMIR, UserRole.SUPERVISOR, UserRole.TECHAMIR, UserRole.AKADEMI, UserRole.KANIT_SORUMLU, UserRole.RAPORTOR, UserRole.MALI_ISLER] },
    { name: 'Yeni Talep Oluştur', href: '/dashboard/talep-olustur', icon: PlusCircleIcon, roles: [UserRole.USER, UserRole.DRIVER, UserRole.ADMIN, UserRole.AMIR, UserRole.TECHNICAL, UserRole.SUPERVISOR, UserRole.TECHAMIR, UserRole.AKADEMI, UserRole.MALI_ISLER] },
    requestsGroup,
    { name: 'Araç Talep Yığını', href: '/dashboard/yigin', icon: ArchiveBoxIcon, roles: [UserRole.ADMIN, UserRole.SUPERVISOR] },
    { name: 'Teknik Talepler', href: '/dashboard/teknikyigin', icon: CpuChipIcon, roles: [UserRole.ADMIN, UserRole.TECHAMIR] },
    { name: 'Dökümanlar', href: '/dashboard/dokumanlar', icon: ClipboardDocumentCheckIcon, roles: [UserRole.ADMIN] },
    { name: 'Görev Panosu', href: '/dashboard/todo', icon: ViewColumnsIcon, roles: [UserRole.USER, UserRole.DRIVER, UserRole.ADMIN, UserRole.TECHNICAL, UserRole.AMIR, UserRole.SUPERVISOR, UserRole.TECHAMIR, UserRole.AKADEMI, UserRole.KANIT_SORUMLU, UserRole.RAPORTOR, UserRole.MALI_ISLER] },
    formsGroup,
    { name: 'Duyurular', href: '/dashboard/duyurular', icon: DocumentTextIcon, roles: [UserRole.USER, UserRole.DRIVER, UserRole.ADMIN, UserRole.AMIR, UserRole.TECHNICAL, UserRole.TECHAMIR, UserRole.AKADEMI, UserRole.MALI_ISLER] },
    { name: 'Yemek Menüsü', href: '/dashboard/yemek', icon: CalendarIcon, roles: [UserRole.USER, UserRole.DRIVER, UserRole.ADMIN, UserRole.AMIR, UserRole.TECHNICAL, UserRole.SUPERVISOR, UserRole.TECHAMIR, UserRole.AKADEMI, UserRole.MALI_ISLER] },
    { name: 'Görevlerim', href: '/dashboard/gorevlerim', icon: ClipboardDocumentCheckIcon, roles: [UserRole.DRIVER] },
    { name: 'Teknik Görevlerim', href: '/dashboard/teknikgorevlerim', icon: ServerStackIcon, roles: [UserRole.TECHNICAL] },
    { name: 'Yönetim Paneli', href: '/dashboard/admin', icon: CommandLineIcon, roles: [UserRole.ADMIN, UserRole.SUPERVISOR] },
    { name: 'Kullanıcılar', href: '/dashboard/kullanicilar', icon: UserIcon, roles: [UserRole.ADMIN] },
    { name: 'Toplantılar', href: '/dashboard/toplantilar', icon: UsersIcon, roles: [UserRole.USER, UserRole.DRIVER, UserRole.ADMIN, UserRole.AMIR, UserRole.TECHNICAL, UserRole.SUPERVISOR, UserRole.TECHAMIR, UserRole.AKADEMI, UserRole.MALI_ISLER] },
    { name: 'Ayarlar', href: '/dashboard/ayarlar', icon: Cog6ToothIcon, roles: [UserRole.USER, UserRole.AMIR, UserRole.TECHNICAL, UserRole.DRIVER, UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.TECHAMIR, UserRole.AKADEMI, UserRole.MALI_ISLER] },
  ];

  // "TailAdmin" referansındaki düz (yüzmeyen) sidebar + açık tonlu aktif öğe tasarımı
  const sidebarContent = (
    <div className="flex flex-col h-full bg-base-100 border-r border-base-200 pt-5 pb-4">
      <div className="flex flex-col grow overflow-y-auto">
        <div className="flex items-center shrink-0 px-5 pb-4 border-b border-base-200">
          <img
            className="h-9 w-auto"
            src={unilogo.src}
            alt="Logo"
          />
          <span className="ml-3 text-base font-bold text-base-content">Talep Sistemi</span>
        </div>

        {!user && (
          <div className="flex-1 flex items-center justify-center py-10">
            <svg className="h-7 w-7 animate-spin text-base-content/30" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        )}
        {user && (
          <div className="mt-4 flex-1 flex flex-col">
            <span className="px-5 mb-2 text-[11px] font-semibold uppercase tracking-wider text-base-content/40">Menü</span>
            <nav className="flex-1 px-3 space-y-1">
              {navLinks.map((item) => {
                if (item.children) {
                  const visibleChildren = item.children.filter((c) => c.roles.includes(user.role));
                  if (visibleChildren.length === 0) return null;
                  const childActive = visibleChildren.some((c) => pathname === c.href);
                  const isOpen = openGroups[item.name] ?? childActive;
                  return (
                    <div key={item.name}>
                      <button
                        type="button"
                        onClick={() => setOpenGroups((prev) => ({ ...prev, [item.name]: !isOpen }))}
                        aria-expanded={isOpen}
                        className={`group flex w-full items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                          childActive ? 'bg-primary/10 text-primary' : 'text-base-content/70 hover:bg-base-200'
                        }`}
                      >
                        <item.icon className={`mr-3 shrink-0 h-5 w-5 ${childActive ? 'text-primary' : 'text-base-content/40 group-hover:text-base-content/70'}`} />
                        <span className="flex-1 text-left">{item.name}</span>
                        <ChevronDownIcon className={`h-4 w-4 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                      </button>
                      {isOpen && (
                        <ul className="mt-1 space-y-1">
                          {visibleChildren.map((child) => {
                            const isActive = pathname === child.href;
                            return (
                              <li key={child.href}>
                                <Link
                                  href={child.href}
                                  className={`flex items-center rounded-lg py-2 ps-10 pe-2 text-sm font-medium transition-colors ${
                                    isActive ? 'bg-primary/10 text-primary' : 'text-base-content/70 hover:bg-base-200'
                                  }`}
                                >
                                  <span className="flex-1 whitespace-nowrap">{child.name}</span>
                                  {child.badge && (
                                    <span className="ml-1 shrink-0 whitespace-nowrap rounded-full bg-base-200 px-1.5 py-0.5 text-[10px] font-medium text-base-content/50">
                                      {child.badge}
                                    </span>
                                  )}
                                </Link>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  );
                }
                if (!item.href || !item.roles?.includes(user.role)) return null;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                      isActive ? 'bg-primary/10 text-primary' : 'text-base-content/70 hover:bg-base-200'
                    }`}
                  >
                    <item.icon className={`mr-3 shrink-0 h-5 w-5 ${isActive ? 'text-primary' : 'text-base-content/40 group-hover:text-base-content/70'}`} />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>

        )}
        {user && user.role === UserRole.TECHNICAL && (
          <div className="mx-3 mt-3 p-4 rounded-xl bg-base-200/60 border border-base-200">
            <TechNotificationStatus />
            <div className="flex items-center justify-between mt-2.5">
              <p className="text-[11px] font-semibold text-base-content/50">Teknik Servis Hattı</p>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Aktif
              </span>
            </div>
          </div>
        )}
        {user && user.role === UserRole.DRIVER && (
          <div className="mx-3 mt-3 p-4 rounded-xl bg-base-200/60 border border-base-200">
            <DriverNotificationStatus />
            <div className="flex items-center justify-between mt-2.5">
              <p className="text-[11px] font-semibold text-base-content/50">Durumunuz</p>
              <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold ${user.driverStatus === 'available' ? 'text-emerald-600' : 'text-rose-600'}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${user.driverStatus === 'available' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                {user.driverStatus === 'available' ? 'Uygun' : 'Meşgul'}
              </span>
            </div>
          </div>
        )}

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

      <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 md:left-0">
        {sidebarContent}
      </div>
    </>
  );
}
