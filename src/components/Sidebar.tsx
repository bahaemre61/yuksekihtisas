'use client';

import React, {useState, useEffect, Fragment} from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import axios from "axios";
import {Dialog, Transition} from '@headlessui/react';
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
} from '@heroicons/react/24/outline';
import unilogo from "@/src/components/yuksekihtisasuni-logo.png"

const UserRole = {USER: 'user', DRIVER: 'driver', ADMIN: 'admin'} as const;
type UserRole = typeof UserRole[keyof typeof UserRole];
interface IUser {name: string; role: UserRole}


const handeLagout = async (router:any) => {
    try{
        await axios.post('api/auth/logout');
        router.push('/login')
    }catch(err){
        console.error('Çıkış Yapılmadı', err);
        router.push('/login');
    }
};

const fetchUser = async () : Promise<IUser | null> => {
    try{
        const res = await axios.get('/api/me');
        return res.data;
    }catch(e)
    {
        console.error('Kullanıcı bilgisi alınamadı',e)
        return null;
    }
};

export default function Sidebar({ isMobileMenuOpen, setIsMobileMenuOpen }: { 
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (isOpen: boolean) => void;
}) {
    const [user, setUser]  =useState<IUser | null>(null);
    const pathname = usePathname();
    const router = useRouter();

    useEffect(()=> {
        fetchUser().then((userData)=>{
            if(userData){
                setUser(userData);
            }
            else{
                handeLagout(router);
            }
        });
    },[]);
    
    const navLinks = [
    { name: 'Ana Sayfa', href: '/dashboard', icon: HomeIcon, roles: [UserRole.USER, UserRole.DRIVER, UserRole.ADMIN] },
    { name: 'Yeni Talep Oluştur', href: '/dashboard/talep-olustur', icon: PlusCircleIcon, roles: [UserRole.USER, UserRole.DRIVER, UserRole.ADMIN] },
    { name: 'Araç Taleplerim', href: '/dashboard/taleplerim', icon: TruckIcon, roles: [UserRole.USER, UserRole.DRIVER, UserRole.ADMIN] },
    { name: 'Talep Yığını', href: '/dashboard/yigin', icon: ArchiveBoxIcon, roles: [UserRole.DRIVER, UserRole.ADMIN] },
    { name: 'Yapılcak Listem', href: '/dashboard/todo', icon: CheckBadgeIcon, roles: [UserRole.USER, UserRole.DRIVER, UserRole.ADMIN] },
    { name: 'Duyurular', href: '/dashboard/duyurular', icon: DocumentTextIcon, roles: [UserRole.USER, UserRole.DRIVER, UserRole.ADMIN] },
    { name: 'Yemek Menüsü', href: '/dashboard/yemek', icon: CalendarIcon, roles: [UserRole.USER, UserRole.DRIVER, UserRole.ADMIN] },
    ];

    const sidebarContent =(
    <div className="flex flex-col h-full bg-white pt-5 pb-4 shadow-xl">
      <div className="flex flex-col grow bg-white pt-5 pb-4 shadow-xl overflow-y-auto">
        <div className="flex items-center shrink-0 px-4">
          <img
            className="h-10 w-auto"
            src={unilogo.src}
            alt="Logo"
          />
          <span className="ml-3 text-xl font-bold text-gray-800">Talep Sistemi</span>
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
                        ${isActive ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}
                        group flex items-center px-2 py-2 text-sm font-medium rounded-md
                      `}
                    >
                      <item.icon
                        className={`
                          ${isActive ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'}
                          mr-3 shrink-0 h-6 w-6
                        `}
                      />
                      {item.name}
                    </Link>
                  );
                }
                return null;
              })}
            </nav>
          </div>
        )}
        <div className="border-t border-gray-200 p-4">
            <a href="#" onClick={() => handeLagout(router)} className="group shrink-0 w-full">
              <div className="flex items-center">
                <div>
                  <UserIcon className="inline-block h-9 w-9 rounded-full text-gray-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-700 group-hover:text-gray-900">{user?.name || '...'}</p>
                  <p className="text-xs font-medium text-gray-500 group-hover:text-gray-700 flex items-center">
                    Çıkış Yap <ArrowLeftEndOnRectangleIcon className='ml-1 h-4 w-4'/>
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
      {/* --- 1. Mobil Menü (Açılır/Kapanır Dialog) --- */}
      <Transition.Root show={isMobileMenuOpen} as={Fragment}>
        <Dialog as="div" className="relative z-40 md:hidden" onClose={setIsMobileMenuOpen}>
          
          {/* Arka plan gölgesi (overlay) */}
          <Transition.Child
            as={Fragment}
            enter="transition-opacity ease-linear duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition-opacity ease-linear duration-300"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-gray-600 bg-opacity-75" />
          </Transition.Child>

          {/* Asıl menü paneli */}
          <div className="fixed inset-0 flex z-40">
            <Transition.Child
              as={Fragment}
              enter="transition ease-in-out duration-300 transform"
              enterFrom="-translate-x-full" // Soldan gelsin
              enterTo="translate-x-0"
              leave="transition ease-in-out duration-300 transform"
              leaveFrom="translate-x-0"
              leaveTo="-translate-x-full" // Sola gitsin
            >
              <Dialog.Panel className="relative flex-1 flex flex-col max-w-xs w-full">
                
                {/* Kapatma Butonu (X) */}
                <div className="absolute top-0 right-0 -mr-12 pt-2">
                  <button
                    type="button"
                    className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                    onClick={() => setIsMobileMenuOpen(false)} // State'i 'false' yap
                  >
                    <XMarkIcon className="h-6 w-6 text-white" />
                  </button>
                </div>
                
                {/* YUKARIDA TANIMLADIĞIMIZ SIDEBAR İÇERİĞİ */}
                {sidebarContent} 
                
              </Dialog.Panel>
            </Transition.Child>
            <div className="shrink-0 w-14" aria-hidden="true">
              {/* Kapatma butonu için boş alan */}
            </div>
          </div>
        </Dialog>
      </Transition.Root>

      {/* --- 2. Masaüstü Menüsü (Sabit) --- */}
      <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
        {/* YUKARIDA TANIMLADIĞIMIZ SIDEBAR İÇERİĞİ */}
        {sidebarContent}
      </div>
    </>
  );
}
