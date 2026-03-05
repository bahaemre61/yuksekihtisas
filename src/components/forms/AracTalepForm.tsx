'use client';

import React, { useState, useEffect, ChangeEvent } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation'; 
import { ExclamationTriangleIcon , SparklesIcon, ClockIcon} from '@heroicons/react/24/outline';

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
        if(['amir', 'admin', 'ADMIN', 'AMIR', 'TECHAMIR', 'techamir', 'SUPERVISOR', 'supervisor'].includes(userRes.data.role)) setCanSetPriority(true);

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
    const hours = new Date(formData.startTime).getHours();
    if (hours === 12) {
      alert("Öğle arası (12:00 - 13:00) için talep oluşturulamaz.");
      return;
    }
    setLoading(true);
    const payload = {
      ...formData,
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
      <div className="bg-linear-to-r from-purple-50 to-indigo-50 border border-purple-200 p-5 rounded-xl mb-6 shadow-sm">
        <div className="flex items-center mb-2">
            <SparklesIcon className="h-5 w-5 text-purple-600 mr-2" />
            <h3 className="font-bold text-purple-800">Yapay Zeka ile Hızlı Doldur</h3>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
            <input type="text" value={aiText} onChange={(e) => setAiText(e.target.value)} placeholder='Örn: "Yarın 14:00te Rektörlükten Esenboğaya gideceğim"' className="flex-1 p-3 border border-purple-200 rounded-lg outline-none focus:ring-2 focus:ring-purple-400 text-sm" onKeyDown={(e) => e.key === 'Enter' && handleAiFill()} />
            <button onClick={handleAiFill} disabled={aiLoading || !aiText.trim()} className="bg-purple-600 text-white px-5 py-2 rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 transition-all flex items-center justify-center min-w-[140px]">
                {aiLoading ? <span className="animate-pulse">Düşünüyor...</span> : "Sihirli Doldur"}
            </button>
        </div>
      </div>

      <div className="bg-white shadow-lg rounded-lg p-6 sm:p-8">
        <h2 className="text-2xl font-semibold text-gray-800 mb-6 border-b pb-4">Yeni Araç Talep Formu</h2>
        
        {error && <div className="mb-4 bg-red-100 p-4 border border-red-300 text-red-700 rounded-md text-sm font-medium">{error}</div>}
        {successMessage && <div className="mb-4 bg-green-100 p-4 border border-green-300 text-green-700 rounded-md text-sm font-medium">{successMessage}</div>}

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* ACİLİYET DURUMU (Orijinal Tasarımın) */}
          {canSetPriority && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Aciliyet Durumu</label>
              <div className="grid grid-cols-2 gap-4">
                  <button type="button" onClick={() => setFormData(p => ({...p, priority: 'normal'}))} className={`flex items-center justify-center px-4 py-3 border rounded-lg text-sm font-medium transition-all ${formData.priority === 'normal' ? 'border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-200' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}>Normal Talep</button>
                  <button type="button" onClick={() => setFormData(p => ({...p, priority: 'high'}))} className={`flex items-center justify-center px-4 py-3 border rounded-lg text-sm font-medium transition-all ${formData.priority === 'high' ? 'border-red-500 bg-red-50 text-red-700 ring-2 ring-red-200' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
                      <ExclamationTriangleIcon className="h-5 w-5 mr-2" /> ACİL DURUM
                  </button>
              </div>
            </div>
          )}
          
          {/* LOKASYONLAR (Orijinal Tasarımın) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Nereden?</label>
              <select name="fromLocation" value={formData.fromLocation} onChange={handleInputChange} required className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:ring-blue-500 outline-none">
                <option value="">{locationsLoading ? 'Yükleniyor...' : 'Seçiniz'}</option>
                {locations.map((loc, index) => <option key={index} value={loc}>{loc}</option>)}
                <option value="other" className="font-bold text-blue-600">+ DİĞER (Elle Gir)</option>
              </select>
              {formData.fromLocation === 'other' && <input name="customFrom" value={formData.customFrom} onChange={handleInputChange} placeholder="Kalkış noktası..." className="mt-2 block w-full rounded-lg border border-blue-200 px-4 py-2 text-sm outline-none" required />}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Nereye?</label>
              <select name="toLocation" value={formData.toLocation} onChange={handleInputChange} required className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:ring-blue-500 outline-none">
                <option value="">{locationsLoading ? 'Yükleniyor...' : 'Seçiniz'}</option>
                {locations.map((loc, index) => <option key={index} value={loc}>{loc}</option>)}
                <option value="other" className="font-bold text-blue-600">+ DİĞER (Elle Gir)</option>
              </select>
              {formData.toLocation === 'other' && <input name="customTo" value={formData.customTo} onChange={handleInputChange} placeholder="Varış noktası..." className="mt-2 block w-full rounded-lg border border-blue-200 px-4 py-2 text-sm outline-none" required />}
            </div>
          </div>

          {/* --- YENİ EKLENEN: ZAMAN ESNEKLİĞİ BUTONLARI --- */}
          <div>
            <label className=" text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
              <ClockIcon className="h-4 w-4 text-blue-500" /> Hızlı Zaman Seçimi <span className="flex items-center gap-1 bg-blue-100 text-blue-500 px-2 py-0.5 rounded-lg font-black text-[9px] border border-blue-200 animate-pulse uppercase">
                                Yeni Butonlar!
                              </span>
            </label>
            
            <div className="grid grid-cols-3 gap-3">
              <button type="button" onClick={() => setFlexibleTime('morning')} className={`flex flex-col items-center p-3 border rounded-xl transition-all ${formData.startTime.includes('09:00') && formData.endTime.includes('12:00') ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'border-gray-200 bg-white hover:bg-gray-50'}`}>
                <span className="text-xl">🌅</span>
                <span className="text-[10px] font-bold text-gray-700 uppercase">Öğleden Önce</span>
              </button>
              <button type="button" onClick={() => setFlexibleTime('afternoon')} className={`flex flex-col items-center p-3 border rounded-xl transition-all ${formData.startTime.includes('13:00') && formData.endTime.includes('17:00') ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'border-gray-200 bg-white hover:bg-gray-50'}`}>
                <span className="text-xl">☀️</span>
                <span className="text-[10px] font-bold text-gray-700 uppercase">Öğleden Sonra</span>
              </button>
              <button type="button" onClick={() => setFlexibleTime('fullDay')} className={`flex flex-col items-center p-3 border rounded-xl transition-all ${formData.startTime.includes('09:00') && formData.endTime.includes('17:00') ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'border-gray-200 bg-white hover:bg-gray-50'}`}>
                <span className="text-xl">📅</span>
                <span className="text-[10px] font-bold text-gray-700 uppercase">Tüm Gün</span>
              </button>
            </div>
          </div>

          {/* ZAMAN SEÇİMİ (Orijinal) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Gidiş Zamanı</label>
              <input type="datetime-local" name="startTime" value={formData.startTime} onChange={handleInputChange} required className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Dönüş Zamanı</label>
              <input type="datetime-local" name="endTime" value={formData.endTime} onChange={handleInputChange} required className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:ring-blue-500" />
            </div>
          </div>

          {/* AÇIKLAMA VE CHECKBOX (Orijinal) */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Açıklama</label>
            <textarea name="purpose" rows={3} value={formData.purpose} onChange={handleInputChange} required className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:ring-blue-500" placeholder="Talep amacını belirtiniz..." />
          </div>

          <div className="flex items-center">
            <input id="carry" type="checkbox" name="willCarryItems" checked={formData.willCarryItems} onChange={handleInputChange} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
            <label htmlFor="carry" className="ml-2 block text-sm font-medium text-gray-800">Eşya veya bagaj taşınacak</label>
          </div>

          <div className="border-t pt-6">
            <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-4 rounded-lg text-lg font-bold hover:bg-blue-700 shadow-md transition-all disabled:bg-gray-400">
              {loading ? "Talebiniz Gönderiliyor..." : "Talebi Oluştur"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}