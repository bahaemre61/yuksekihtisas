'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { useTheme } from 'next-themes';
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import {
    ArrowLeftEndOnRectangleIcon,
    Bars3Icon,
    BellIcon,
    ChevronDownIcon,
    MoonIcon,
    SunIcon,
    UserCircleIcon
} from "@heroicons/react/24/outline";
import { enablePush, getPushState, type PushState } from '@/src/lib/pushClient';

const BELL_TITLES: Record<PushState, string> = {
    unsupported: 'Bu tarayıcıda/cihazda anlık bildirim desteklenmiyor (iPhone için uygulamayı Ana Ekrana ekleyin)',
    denied: 'Bildirimler tarayıcı ayarlarından engellenmiş',
    inactive: 'Anlık bildirimleri aç',
    active: 'Anlık bildirimler açık'
};

export default function Header({ setIsMobileMenuOpen }: { setIsMobileMenuOpen: (isOpen: boolean) => void }) {
    const { theme, setTheme } = useTheme();
    const router = useRouter();
    const [mounted, setMounted] = useState(false);
    const [userName, setUserName] = useState('');
    const [pushState, setPushState] = useState<PushState>('unsupported');
    const [pushBusy, setPushBusy] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        axios.get('/api/me')
            .then((res) => setUserName(res.data?.name || ''))
            .catch(() => setUserName(''));
    }, []);

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            try {
                const state = await getPushState();
                if (!cancelled) setPushState(state);
            } catch {
                // durum okunamazsa 'unsupported' kalır
            }
        };
        load();
        return () => {
            cancelled = true;
        };
    }, []);

    const handleEnablePush = async () => {
        if (pushState !== 'inactive' || pushBusy) return;
        setPushBusy(true);
        try {
            setPushState(await enablePush());
        } catch (err) {
            console.error('Bildirim açılamadı:', err);
            alert('Bildirimler açılamadı. Lütfen tekrar deneyin.');
        } finally {
            setPushBusy(false);
        }
    };

    const handleLogout = async () => {
        try {
            await axios.post('/api/auth/logout');
        } catch (err) {
            console.error('Çıkış Yapılmadı', err);
        } finally {
            router.push('/login');
        }
    };

    const isDark = theme === 'dark';
    const bellClickable = pushState === 'inactive' && !pushBusy;

    return (
        <div className="sticky top-0 z-10 shrink-0 flex items-center justify-between h-16 bg-base-100 border-b border-base-200 px-4">
            <button
                type="button"
                className="text-base-content/60 hover:text-base-content focus:outline-none md:hidden"
                onClick={() => setIsMobileMenuOpen(true)}
            >
                <Bars3Icon className="h-6 w-6" />
            </button>

            <div className="flex-1" />

            <div className="flex items-center gap-2">
                {mounted && (
                    <button
                        type="button"
                        onClick={() => setTheme(isDark ? 'corporate' : 'dark')}
                        className="h-9 w-9 flex items-center justify-center rounded-lg text-base-content/60 hover:bg-base-200 hover:text-base-content transition-colors"
                        title={isDark ? 'Açık Temaya Geç' : 'Koyu Temaya Geç'}
                        aria-label={isDark ? 'Açık Temaya Geç' : 'Koyu Temaya Geç'}
                    >
                        {isDark ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
                    </button>
                )}

                <button
                    type="button"
                    onClick={handleEnablePush}
                    disabled={!bellClickable}
                    className={`relative h-9 w-9 flex items-center justify-center rounded-lg transition-colors ${
                        bellClickable
                            ? 'text-base-content/60 hover:bg-base-200 hover:text-base-content'
                            : pushState === 'active'
                                ? 'text-base-content/70 cursor-default'
                                : 'text-base-content/30 cursor-not-allowed'
                    }`}
                    title={pushBusy ? 'Bildirim açılıyor...' : BELL_TITLES[pushState]}
                    aria-label={BELL_TITLES[pushState]}
                >
                    <BellIcon className="h-5 w-5" />
                    {pushState === 'active' && (
                        <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-base-100" />
                    )}
                </button>

                <Menu as="div" className="relative">
                    <MenuButton className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-base-200 transition-colors focus:outline-none">
                        <UserCircleIcon className="h-8 w-8 text-base-content/40 shrink-0" />
                        <span className="hidden sm:block max-w-40 truncate text-sm font-medium text-base-content">
                            {userName || '...'}
                        </span>
                        <ChevronDownIcon className="h-4 w-4 text-base-content/50" />
                    </MenuButton>
                    <MenuItems className="absolute right-0 mt-2 w-48 origin-top-right rounded-xl border border-base-200 bg-base-100 p-1.5 shadow-lg focus:outline-none">
                        <MenuItem>
                            <button
                                type="button"
                                onClick={handleLogout}
                                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-base-content/80 data-focus:bg-base-200"
                            >
                                <ArrowLeftEndOnRectangleIcon className="h-4 w-4" />
                                Çıkış Yap
                            </button>
                        </MenuItem>
                    </MenuItems>
                </Menu>
            </div>
        </div>
    )
}
