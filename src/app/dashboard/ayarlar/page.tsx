'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { useTheme } from 'next-themes';
import { LockClosedIcon, SwatchIcon } from '@heroicons/react/24/outline';

export default function SettingsPage() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: '' });

  useEffect(() => {
    setMounted(true);
  }, []);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg({ text: '', type: '' });

    if (newPassword !== confirmPassword) {
      setMsg({ text: 'Yeni şifreler eşleşmiyor.', type: 'error' });
      return;
    }

    if (newPassword.length < 6) {
      setMsg({ text: 'Şifre en az 6 karakter olmalıdır.', type: 'error' });
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post('/api/user/change-password', {
        currentPassword,
        newPassword
      });

      if (res.data.success) {
        setMsg({ text: 'Şifreniz başarıyla güncellendi.', type: 'success' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err: any) {
      setMsg({ text: err.response?.data?.msg || 'Hata oluştu.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-8">
      <div>
        <h1 className="text-3xl font-black text-base-content uppercase tracking-tighter italic">AYARLAR</h1>
        <p className="text-sm text-base-content/60 mt-1">Hesap güvenliğinizi ve sistem görünümünü buradan yönetebilirsiniz.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* ŞİFRE DEĞİŞTİRME */}
        <div className="bg-base-100 rounded-3xl p-6 sm:p-8 shadow-sm border border-base-200">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-base-200">
            <div className="p-3 bg-info/10 text-info rounded-xl">
              <LockClosedIcon className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-base-content">Şifre Değiştir</h2>
              <p className="text-xs text-base-content/60">Hesap güvenliğiniz için şifrenizi güncelleyin</p>
            </div>
          </div>

          <form onSubmit={handlePasswordChange} className="space-y-4">
            {msg.text && (
              <div className={`p-3 text-sm rounded-xl font-medium ${msg.type === 'error' ? 'bg-error/20 text-error' : 'bg-success/20 text-success'}`}>
                {msg.text}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-base-content/70 uppercase mb-2">Mevcut Şifre</label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full bg-base-200 text-base-content border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-info outline-none transition-all"
                placeholder="••••••"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-base-content/70 uppercase mb-2">Yeni Şifre</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-base-200 text-base-content border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-info outline-none transition-all"
                placeholder="En az 6 karakter"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-base-content/70 uppercase mb-2">Yeni Şifre (Tekrar)</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-base-200 text-base-content border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-info outline-none transition-all"
                placeholder="Şifreyi onaylayın"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-info text-info-content rounded-xl font-bold uppercase tracking-wider hover:bg-info/90 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {loading ? 'Güncelleniyor...' : 'Şifreyi Güncelle'}
            </button>
          </form>
        </div>

        {/* TEMA AYARLARI */}
        <div className="bg-base-100 rounded-3xl p-6 sm:p-8 shadow-sm border border-base-200">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-base-200">
            <div className="p-3 bg-primary/10 text-primary rounded-xl">
              <SwatchIcon className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-base-content">Görünüm ve Tema</h2>
              <p className="text-xs text-base-content/60">Sistem arayüzünü kişiselleştirin</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setTheme('corporate')}
              className={`p-4 rounded-2xl flex flex-col items-center justify-center gap-3 transition-all border-2 ${theme === 'corporate' ? 'border-primary bg-primary/5 text-primary' : 'border-base-200 hover:border-base-300 text-base-content/70'
                }`}
            >
              <div className="w-10 h-10 rounded-full bg-white border shadow-sm"></div>
              <span className="text-sm font-bold">Açık</span>
            </button>

            <button
              onClick={() => setTheme('dark')}
              className={`p-4 rounded-2xl flex flex-col items-center justify-center gap-3 transition-all border-2 ${theme === 'dark' ? 'border-primary bg-primary/5 text-primary' : 'border-base-200 hover:border-base-300 text-base-content/70'
                }`}
            >
              <div className="w-10 h-10 rounded-full bg-gray-900 border border-gray-700 shadow-sm"></div>
              <span className="text-sm font-bold">Koyu</span>
            </button>
          </div>

          <div className="mt-6 p-4 bg-base-200 rounded-2xl">
            <p className="text-xs text-base-content/70 italic text-center">
              Tema seçimi cihazınıza özel olarak kaydedilir ve bir sonraki girişinizde hatırlanır.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}