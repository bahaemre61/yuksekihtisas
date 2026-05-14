'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import axios from 'axios';
import confetti from 'canvas-confetti';

export default function MeetingJoinPage() {
  const { qrSecret } = useParams();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'guest-form'>('loading');
  const [message, setMessage] = useState('');
  const [meetingTitle, setMeetingTitle] = useState('');
  const [visible, setVisible] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [guestTitle, setGuestTitle] = useState('');
  const [isSubmittingGuest, setIsSubmittingGuest] = useState(false);

  useEffect(() => {
    // Kart giriş animasyonu
    const t = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(t);
  }, []);

  const joinMeeting = async (guestNameParam?: string) => {
    try {
      if (guestNameParam) setIsSubmittingGuest(true);
      const res = await axios.post('/api/meetings/join', { qrSecret, guestName: guestNameParam });

      if (res.data.success) {
        setMeetingTitle(res.data.meetingTitle || 'Toplantı');
        setMessage(res.data.msg || 'Katılımınız başarıyla kaydedildi.');
        setStatus('success');

        const fire = (particleRatio: number, opts: object) => {
          confetti({
            origin: { y: 0.7 },
            ...opts,
            particleCount: Math.floor(200 * particleRatio),
          });
        };

        fire(0.25, { spread: 26, startVelocity: 55, colors: ['#10b981', '#34d399'] });
        fire(0.2, { spread: 60, colors: ['#fbbf24', '#f59e0b'] });
        fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8, colors: ['#3b82f6', '#60a5fa'] });
        fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2, colors: ['#a78bfa'] });
        fire(0.1, { spread: 120, startVelocity: 45, colors: ['#f87171'] });
      }
    } catch (err: any) {
      if (err.response?.status === 401 && err.response?.data?.requireGuestName) {
        setStatus('guest-form');
      } else {
        setMessage(err.response?.data?.msg || 'Bir hata oluştu. Lütfen tekrar deneyin.');
        setStatus('error');
      }
    } finally {
      if (guestNameParam) setIsSubmittingGuest(false);
    }
  };

  useEffect(() => {
    if (qrSecret) joinMeeting();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qrSecret]);

  const handleGuestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName.trim()) return;
    const fullName = guestTitle ? `${guestTitle} ${guestName}` : guestName;
    joinMeeting(fullName);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-base-200 via-base-100 to-base-200">
      {/* Arka plan dekoratif daireler */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-success/5 rounded-full blur-3xl" />
      </div>

      <div
        className={`relative w-full max-w-sm transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
      >
        <div className="bg-base-100 rounded-3xl shadow-2xl border border-base-200 overflow-hidden">

          {/* LOADING STATE */}
          {status === 'loading' && (
            <div className="flex flex-col items-center justify-center px-8 py-16 text-center">
              {/* Dönen halka animasyonu */}
              <div className="relative w-24 h-24 mb-8">
                <div className="absolute inset-0 rounded-full border-4 border-base-300" />
                <div className="absolute inset-0 rounded-full border-4 border-t-primary animate-spin" />
                <div className="absolute inset-2 rounded-full border-4 border-t-info animate-spin [animation-duration:1.4s] [animation-direction:reverse]" />
              </div>
              <h1 className="text-xl font-bold text-base-content mb-2">Bağlanıyor...</h1>
              <p className="text-sm text-base-content/60">Katılımınız doğrulanıyor, lütfen bekleyin.</p>
            </div>
          )}

          {/* GUEST FORM STATE */}
          {status === 'guest-form' && (
            <div className="flex flex-col items-center text-center p-8">
              <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-6">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-base-content mb-2">Misafir Girişi</h1>
              <p className="text-sm text-base-content/60 mb-6">Sisteme giriş yapmadığınız tespit edildi. Lütfen toplantıya katılmak için adınızı ve soyadınızı giriniz.</p>

              <form onSubmit={handleGuestSubmit} className="w-full space-y-4">
                <div className="flex gap-2">
                  <select
                    className="w-1/3 bg-base-200 border border-base-300 rounded-xl px-2 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    value={guestTitle}
                    onChange={(e) => setGuestTitle(e.target.value)}
                  >
                    <option value="">Unvan Yok</option>
                    <option value="Prof. Dr.">Prof. Dr.</option>
                    <option value="Doç. Dr.">Doç. Dr.</option>
                    <option value="Dr. Öğr. Üyesi">Dr. Öğr. Üyesi</option>
                    <option value="Öğr. Gör. Dr.">Öğr. Gör. Dr.</option>
                    <option value="Öğr. Gör.">Öğr. Gör.</option>
                    <option value="Arş. Gör. Dr.">Arş. Gör. Dr.</option>
                    <option value="Arş. Gör.">Arş. Gör.</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Adınız Soyadınız"
                    className="w-2/3 bg-base-200 border border-base-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSubmittingGuest || !guestName.trim()}
                  className="w-full bg-primary text-primary-content py-3.5 rounded-xl font-bold text-sm hover:brightness-90 transition-all shadow-md active:scale-95 disabled:opacity-50"
                >
                  {isSubmittingGuest ? 'Bağlanıyor...' : 'Toplantıya Katıl'}
                </button>
              </form>

              {/* Kurum Personeli Girişi */}
              <div className="mt-6 border-t border-base-200 pt-6 w-full">
                <p className="text-sm text-base-content/60 mb-3">Kurum İdari personeli misiniz?</p>
                <button
                  onClick={() => router.push(`/login?callbackUrl=/meeting/join/${qrSecret}`)}
                  className="w-full bg-base-200 text-base-content py-3 rounded-xl font-semibold text-sm hover:bg-base-300 transition-all active:scale-95"
                >
                  Hesabınıza Giriş Yapın
                </button>
              </div>
            </div>
          )}

          {/* SUCCESS STATE */}
          {status === 'success' && (
            <div className="flex flex-col items-center text-center">
              {/* Yeşil üst şerit */}
              <div className="w-full bg-gradient-to-r from-success/80 to-emerald-400/80 py-12 px-8 flex flex-col items-center gap-4">
                {/* Pulsing check */}
                <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-white/30 animate-ping" />
                  <div className="relative w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-lg">
                    <svg className="w-10 h-10 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                <h1 className="text-3xl font-black text-white drop-shadow">Katılım Onaylandı!</h1>
              </div>

              {/* İçerik */}
              <div className="px-8 py-8 w-full">
                <div className="bg-base-200/60 rounded-2xl px-5 py-4 mb-6">
                  <p className="text-xs font-semibold text-base-content/50 uppercase tracking-widest mb-1">Toplantı</p>
                  <p className="text-base font-bold text-base-content">{meetingTitle}</p>
                </div>
                <p className="text-sm text-base-content/70 leading-relaxed mb-8">{message}</p>

                <button
                  onClick={() => router.push('/dashboard')}
                  className="w-full bg-primary text-primary-content py-3.5 rounded-2xl font-bold text-sm hover:brightness-90 transition-all shadow-md active:scale-95"
                >
                  Panele Dön
                </button>
              </div>
            </div>
          )}

          {/* ERROR STATE */}
          {status === 'error' && (
            <div className="flex flex-col items-center text-center">
              {/* Kırmızı üst şerit */}
              <div className="w-full bg-gradient-to-r from-error/80 to-rose-400/80 py-12 px-8 flex flex-col items-center gap-4">
                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-lg">
                  <svg className="w-10 h-10 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <h1 className="text-3xl font-black text-white drop-shadow">Katılım Başarısız</h1>
              </div>

              {/* İçerik */}
              <div className="px-8 py-8 w-full">
                <div className="bg-error/10 border border-error/20 rounded-2xl px-5 py-4 mb-8">
                  <p className="text-sm font-medium text-error leading-relaxed">{message}</p>
                </div>

                <button
                  onClick={() => router.push('/dashboard')}
                  className="w-full bg-base-200 text-base-content py-3.5 rounded-2xl font-bold text-sm hover:bg-base-300 transition-all active:scale-95"
                >
                  Geri Dön
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Alt not */}
        <p className="text-center text-xs text-base-content/40 mt-5 font-medium">
          Yüksek İhtisas Üniversitesi — QR Katılım Sistemi
        </p>
      </div>
    </div>
  );
}
