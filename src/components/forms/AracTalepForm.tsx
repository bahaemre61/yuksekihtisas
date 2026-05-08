'use client';

import React, { useState, useEffect, ChangeEvent } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { ExclamationTriangleIcon, SparklesIcon, ClockIcon } from '@heroicons/react/24/outline';

export default function CreateRequestPage() {
  const router = useRouter();

  // --- MERKEZİ STATE YAPISI (Orijinal) ---
  const [formData, setFormData] = useState({
    fromLocation: '',
    toLocation: '',
    customFrom: '',
    customTo: '',
    purpose: '',
    willCarryItems: false,
    startTime: '',
    endTime: '',
    priority: 'normal' as 'normal' | 'high',
  });

  const [tripType, setTripType] = useState<'roundTrip' | 'oneWay'>('roundTrip');

  const [locations, setLocations] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [locationsLoading, setLocationsLoading] = useState(true);
  const [canSetPriority, setCanSetPriority] = useState(false);
  const [aiText, setAiText] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    const initPage = async () => {
      try {
        const userRes = await axios.get('/api/me');
        if (['amir', 'admin', 'ADMIN', 'AMIR', 'TECHAMIR', 'techamir', 'SUPERVISOR', 'supervisor'].includes(userRes.data.role)) setCanSetPriority(true);

        const locRes = await axios.get('/api/locations');
        if (locRes.data && Array.isArray(locRes.data.data)) setLocations(locRes.data.data);
      } catch (err) { console.error('Başlatma hatası:', err); }
      finally { setLocationsLoading(false); }
    };
    initPage();
  }, []);

  // --- YENİ EKLENEN: ZAMAN ESNEKLİĞİ FONKSİYONU ---
  const setFlexibleTime = (period: 'morning' | 'afternoon' | 'fullDay') => {
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Istanbul' });
    let start = '';
    let end = '';

    if (period === 'morning') {
      start = `${today}T08:30`;
      end = `${today}T11:59`;
    } else if (period === 'afternoon') {
      start = `${today}T13:00`;
      end = `${today}T17:30`;
    } else if (period === 'fullDay') {
      start = `${today}T08:30`;
      end = `${today}T17:30`;
    }
    setFormData(prev => ({ ...prev, startTime: start, endTime: end }));
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setFormData(prev => ({ ...prev, [name]: val }));
  };

  // --- AI FILL (Orijinal Mantık) ---
  const handleAiFill = async () => {
    if (!aiText.trim()) return;
    setAiLoading(true);
    setError('');
    try {
      const res = await axios.post('/api/ai/parse-request', { text: aiText });
      const data = res.data;
      setFormData(prev => {
        const newState = { ...prev };
        if (data.fromLocation) {
          const isKnown = locations.includes(data.fromLocation);
          newState.fromLocation = isKnown ? data.fromLocation : 'other';
          if (!isKnown) newState.customFrom = data.fromLocation;
        }
        if (data.toLocation) {
          const isKnown = locations.includes(data.toLocation);
          newState.toLocation = isKnown ? data.toLocation : 'other';
          if (!isKnown) newState.customTo = data.toLocation;
        }
        if (data.purpose) newState.purpose = data.purpose;
        if (data.startTime) newState.startTime = data.startTime.slice(0, 16);
        if (data.endTime) newState.endTime = data.endTime.slice(0, 16);
        return newState;
      });
    } catch (err) { alert("Yapay zeka metni çözümleyemedi."); }
    finally { setAiLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const start = new Date(formData.startTime);
    const now = new Date();
    const isAcil = formData.priority === 'high';

    if (!isAcil) {
      const isSameDay = start.toDateString() === now.toDateString();

      if (isSameDay) {
        const nowMins = now.getHours() * 60 + now.getMinutes();
        const startMins = start.getHours() * 60 + start.getMinutes();

        // Mesai dönemleri (dakika cinsinden)
        const MORNING_START = 8 * 60 + 30;  // 08:30
        const MORNING_END   = 12 * 60;       // 12:00
        const AFTER_START   = 13 * 60;       // 13:00
        const AFTER_END     = 17 * 60 + 30;  // 17:30

        const nowInMorning    = nowMins >= MORNING_START && nowMins < MORNING_END;
        const nowInAfternoon  = nowMins >= AFTER_START   && nowMins < AFTER_END;
        const startInMorning  = startMins >= MORNING_START && startMins < MORNING_END;
        const startInAfternoon = startMins >= AFTER_START && startMins < AFTER_END;

        if (nowInMorning && startInMorning) {
          setError(`Sabah mesaisi (08:30–12:00) başladıktan sonra öğleden önce için talep oluşturamazsınız. Şu anki saat: ${now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}. Acil durum varsa "ACİL DURUM" seçeneğini kullanın.`);
          return;
        }

        if (nowInAfternoon && startInAfternoon) {
          setError(`Öğleden sonra mesaisi (13:00–17:30) başladıktan sonra öğleden sonra için talep oluşturamazsınız. Şu anki saat: ${now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}. Acil durum varsa "ACİL DURUM" seçeneğini kullanın.`);
          return;
        }

        // Geçmiş saate talep
        if (start <= now) {
          setError(`Geçmiş bir saat (${start.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}) için talep oluşturamazsınız.`);
          return;
        }
      } else if (start < now) {
        setError('Geçmiş bir tarih için talep oluşturamazsınız.');
        return;
      }
    }

    const hours = start.getHours();
    if (hours === 12) {
      setError("Öğle arası (12:00 - 13:00) için talep oluşturulamaz.");
      return;
    }
    setLoading(true);

    let finalEndTime = formData.endTime;
    const payloadStart = new Date(formData.startTime);

    if (tripType === 'oneWay') {
      // 1 saat ekle
      finalEndTime = new Date(payloadStart.getTime() + 60 * 1000).toISOString();
    }

    const prefix = tripType === 'oneWay' ? '[Tek Yön] ' : '';

    const payload = {
      ...formData,
      purpose: prefix + formData.purpose,
      endTime: finalEndTime,
      fromLocation: formData.fromLocation === 'other' ? formData.customFrom : formData.fromLocation,
      toLocation: formData.toLocation === 'other' ? formData.customTo : formData.toLocation,
    };
    try {
      if (new Date(payload.endTime) <= new Date(payload.startTime)) throw new Error('Dönüş saati gidişten sonra olmalıdır.');
      await axios.post('/api/requests', payload);
      setSuccessMessage('Araç talebiniz başarıyla oluşturuldu!');
      setTimeout(() => router.push('/dashboard/taleplerim'), 2000);
    } catch (err: any) { setError(err.response?.data?.msg || err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* AI HIZLI DOLDURMA (Orijinal Tasarımın) */}
      <div className="bg-linear-to-r from-primary/10 to-secondary/10 border border-primary/20 p-5 rounded-xl mb-6 shadow-sm">
        <div className="flex items-center mb-2">
          <SparklesIcon className="h-5 w-5 text-primary mr-2" />
          <h3 className="font-bold text-base-content">Yapay Zeka ile Hızlı Doldur</h3>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <input readOnly type="text" value={aiText} onChange={(e) => setAiText(e.target.value)} className="flex-1 p-3 bg-base-100 text-base-content border border-primary/20 rounded-lg outline-none focus:ring-2 focus:ring-primary/50 text-sm" onKeyDown={(e) => e.key === 'Enter' && handleAiFill()} />
          <button onClick={handleAiFill} disabled={aiLoading || !aiText.trim()} className="bg-primary text-primary-content px-5 py-2 rounded-lg font-medium hover:brightness-90 disabled:opacity-50 transition-all flex items-center justify-center min-w-[140px]">
            {aiLoading ? <span className="animate-pulse">Düşünüyor...</span> : "Sihirli Doldur"}
          </button>
        </div>
      </div>

      <div className="bg-base-100 shadow-lg rounded-lg p-6 sm:p-8 border border-base-200">
        <h2 className="text-2xl font-semibold text-base-content mb-6 border-b border-base-200 pb-4">Yeni Araç Talep Formu</h2>

        {error && <div className="mb-4 bg-error/20 p-4 border border-error/30 text-error rounded-md text-sm font-medium">{error}</div>}
        {successMessage && <div className="mb-4 bg-success/20 p-4 border border-success/30 text-success rounded-md text-sm font-medium">{successMessage}</div>}

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* ACİLİYET DURUMU (Orijinal Tasarımın) */}
          {canSetPriority && (
            <div>
              <label className="block text-sm font-medium text-base-content/80 mb-2">Aciliyet Durumu</label>
              <div className="grid grid-cols-2 gap-4">
                <button type="button" onClick={() => setFormData(p => ({ ...p, priority: 'normal' }))} className={`flex items-center justify-center px-4 py-3 border rounded-lg text-sm font-medium transition-all ${formData.priority === 'normal' ? 'border-info bg-info/10 text-info ring-2 ring-info/30' : 'border-base-300 text-base-content/80 hover:bg-base-200'}`}>Normal Talep</button>
                <button type="button" onClick={() => setFormData(p => ({ ...p, priority: 'high' }))} className={`flex items-center justify-center px-4 py-3 border rounded-lg text-sm font-medium transition-all ${formData.priority === 'high' ? 'border-error bg-error/10 text-error ring-2 ring-error/30' : 'border-base-300 text-base-content/80 hover:bg-base-200'}`}>
                  <ExclamationTriangleIcon className="h-5 w-5 mr-2" /> ACİL DURUM
                </button>
              </div>
            </div>
          )}

          {/* LOKASYONLAR (Orijinal Tasarımın) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-base-content/80">Nereden?</label>
              <select name="fromLocation" value={formData.fromLocation} onChange={handleInputChange} required className="mt-1 block w-full rounded-lg border border-base-300 bg-base-100 text-base-content px-4 py-3 text-sm focus:ring-primary outline-none">
                <option value="">{locationsLoading ? 'Yükleniyor...' : 'Seçiniz'}</option>
                {locations.map((loc, index) => <option key={index} value={loc}>{loc}</option>)}
                <option value="other" className="font-bold text-primary">+ DİĞER (Elle Gir)</option>
              </select>
              {formData.fromLocation === 'other' && <input name="customFrom" value={formData.customFrom} onChange={handleInputChange} placeholder="Kalkış noktası..." className="mt-2 block w-full rounded-lg border border-primary/30 bg-base-100 text-base-content px-4 py-2 text-sm outline-none" required />}
            </div>
            <div>
              <label className="block text-sm font-medium text-base-content/80">Nereye?</label>
              <select name="toLocation" value={formData.toLocation} onChange={handleInputChange} required className="mt-1 block w-full rounded-lg border border-base-300 bg-base-100 text-base-content px-4 py-3 text-sm focus:ring-primary outline-none">
                <option value="">{locationsLoading ? 'Yükleniyor...' : 'Seçiniz'}</option>
                {locations.map((loc, index) => <option key={index} value={loc}>{loc}</option>)}
                <option value="other" className="font-bold text-primary">+ DİĞER (Elle Gir)</option>
              </select>
              {formData.toLocation === 'other' && <input name="customTo" value={formData.customTo} onChange={handleInputChange} placeholder="Varış noktası..." className="mt-2 block w-full rounded-lg border border-primary/30 bg-base-100 text-base-content px-4 py-2 text-sm outline-none" required />}
            </div>
          </div>

          {/* --- YENİ EKLENEN: SEYAHAT TİPİ --- */}
          <div>
            <label className="text-sm font-medium text-base-content/80 mb-3 flex items-center gap-2">
              Seyahat Tipi
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setTripType('oneWay')} className={`flex flex-col items-center p-3 border rounded-xl transition-all ${tripType === 'oneWay' ? 'border-info bg-info/10 ring-1 ring-info' : 'border-base-300 bg-base-100 hover:bg-base-200'}`}>
                <span className="text-xl">➡️</span>
                <span className="text-[10px] font-bold text-base-content/80 uppercase">Tek Yön</span>
              </button>
              <button type="button" onClick={() => setTripType('roundTrip')} className={`flex flex-col items-center p-3 border rounded-xl transition-all ${tripType === 'roundTrip' ? 'border-info bg-info/10 ring-1 ring-info' : 'border-base-300 bg-base-100 hover:bg-base-200'}`}>
                <span className="text-xl">🔄</span>
                <span className="text-[10px] font-bold text-base-content/80 uppercase">Gidiş Dönüş</span>
              </button>
            </div>
          </div>

          {/* --- YENİ EKLENEN: ZAMAN ESNEKLİĞİ BUTONLARI --- */}
          <div>
            <label className=" text-sm font-medium text-base-content/80 mb-3 flex items-center gap-2">
              <ClockIcon className="h-4 w-4 text-info" /> Hızlı Zaman Seçimi
            </label>

            <div className="grid grid-cols-3 gap-3">
              <button type="button" onClick={() => setFlexibleTime('morning')} className={`flex flex-col items-center p-3 border rounded-xl transition-all ${formData.startTime.includes('08:30') && formData.endTime.includes('11:59') ? 'border-info bg-info/10 ring-1 ring-info' : 'border-base-300 bg-base-100 hover:bg-base-200'}`}>
                <span className="text-xl">🌅</span>
                <span className="text-[10px] font-bold text-base-content/80 uppercase">Öğleden Önce</span>
              </button>
              <button type="button" onClick={() => setFlexibleTime('afternoon')} className={`flex flex-col items-center p-3 border rounded-xl transition-all ${formData.startTime.includes('13:00') && formData.endTime.includes('17:30') ? 'border-info bg-info/10 ring-1 ring-info' : 'border-base-300 bg-base-100 hover:bg-base-200'}`}>
                <span className="text-xl">☀️</span>
                <span className="text-[10px] font-bold text-base-content/80 uppercase">Öğleden Sonra</span>
              </button>
              <button type="button" onClick={() => setFlexibleTime('fullDay')} className={`flex flex-col items-center p-3 border rounded-xl transition-all ${formData.startTime.includes('08:30') && formData.endTime.includes('17:30') ? 'border-info bg-info/10 ring-1 ring-info' : 'border-base-300 bg-base-100 hover:bg-base-200'}`}>
                <span className="text-xl">📅</span>
                <span className="text-[10px] font-bold text-base-content/80 uppercase">Tüm Gün</span>
              </button>
            </div>
          </div>

          {/* ZAMAN SEÇİMİ (Orijinal) */}
          <div className={`grid grid-cols-1 ${tripType === 'roundTrip' ? 'md:grid-cols-2' : ''} gap-6`}>
            <div>
              <label className="block text-sm font-medium text-base-content/80">Gidiş Zamanı</label>
              <input type="datetime-local" name="startTime" value={formData.startTime} onChange={handleInputChange} required className="mt-1 block w-full rounded-lg border border-base-300 bg-base-100 text-base-content px-4 py-3 outline-none focus:ring-primary" />
            </div>
            {tripType === 'roundTrip' && (
              <div>
                <label className="block text-sm font-medium text-base-content/80">Dönüş Zamanı</label>
                <input type="datetime-local" name="endTime" value={formData.endTime} onChange={handleInputChange} required className="mt-1 block w-full rounded-lg border border-base-300 bg-base-100 text-base-content px-4 py-3 outline-none focus:ring-primary" />
              </div>
            )}
          </div>

          {/* AÇIKLAMA VE CHECKBOX (Orijinal) */}
          <div>
            <label className="block text-sm font-medium text-base-content/80">Açıklama</label>
            <textarea name="purpose" rows={3} value={formData.purpose} onChange={handleInputChange} required className="mt-1 block w-full rounded-lg border border-base-300 bg-base-100 text-base-content px-4 py-3 outline-none focus:ring-primary" placeholder="Talep amacını belirtiniz..." />
          </div>

          <div className="flex items-center">
            <input id="carry" type="checkbox" name="willCarryItems" checked={formData.willCarryItems} onChange={handleInputChange} className="h-4 w-4 rounded border-base-300 text-primary focus:ring-primary" />
            <label htmlFor="carry" className="ml-2 block text-sm font-medium text-base-content">Eşya veya bagaj taşınacak</label>
          </div>

          <div className="border-t border-base-200 pt-6">
            <button type="submit" disabled={loading} className="w-full bg-primary text-primary-content py-4 rounded-lg text-lg font-bold hover:brightness-90 shadow-md transition-all disabled:opacity-50">
              {loading ? "Talebiniz Gönderiliyor..." : "Talebi Oluştur"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
