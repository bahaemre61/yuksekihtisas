'use client'; // Bu dosyanın bir İstemci Bileşeni olduğunu belirtir (useState, onClick vb. için)

import React, { useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation'; // Yönlendirme için

export default function CreateRequestPage() {
  // Form alanları için state'ler
  const [fromLocation, setFromLocation] = useState('');
  const [toLocation, setToLocation] = useState('');
  const [purpose, setPurpose] = useState('');
  const [willCarryItems, setWillCarryItems] = useState(false);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  // UI (Arayüz) durumları için state'ler
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Yönlendirme hook'u
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // Formun sayfayı yenilemesini engelle
    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      // Backend'e göndereceğimiz veri paketi (payload)
      const payload = {
        fromLocation,
        toLocation,
        purpose,
        willCarryItems,
        startTime,
        endTime,
      };

      // Basit bir ön-doğrulama (Frontend tarafında)
      if (new Date(endTime) <= new Date(startTime)) {
        setError('Dönüş saati, gidiş saatinden sonra olmalıdır.');
        setLoading(false);
        return;
      }

      // Kendi API'mize (Next.js) POST isteği atıyoruz
      // Tarayıcı, httpOnly cookie'mizi (token) bu isteğe otomatik olarak ekleyecektir.
      await axios.post('/api/requests', payload);

      // Başarılı olursa...
      setSuccessMessage('Araç talebiniz başarıyla oluşturuldu! Taleplerim sayfasına yönlendiriliyorsunuz...');
      
      // Formu temizle
      setFromLocation('');
      setToLocation('');
      setPurpose('');
      setWillCarryItems(false);
      setStartTime('');
      setEndTime('');

      // 2 saniye sonra kullanıcıyı "Taleplerim" sayfasına yönlendir
      setTimeout(() => {
        router.push('/dashboard/taleplerim'); // Bu sayfayı daha sonra oluşturacağız
      }, 2000);

    } catch (err: any) {
      // API'den bir hata dönerse (örn: 400, 401, 500)
      if (axios.isAxiosError(err) && err.response) {
        // Backend'de (`route.ts`) belirlediğimiz 'msg'yi göster
        setError(err.response.data.msg || 'Talep oluşturulamadı. Bilinmeyen bir hata.');
      } else {
        setError('Bir hata oluştu. Lütfen tekrar deneyin.');
      }
    } finally {
      // Hata da olsa, başarılı da olsa yüklenmeyi durdur
      setLoading(false);
    }
  };

  return (
    // Ana form konteyneri
    <div className="max-w-3xl mx-auto">
      {/* Tailwind ile stilize edilmiş form kartı */}
      <div className="bg-white shadow-lg rounded-lg p-6 sm:p-8">
        <h2 className="text-2xl font-semibold text-gray-800 mb-6">
          Yeni Araç Talep Formu
        </h2>
        
        {/* Hata Mesajı Alanı (Sadece hata varsa görünür) */}
        {error && (
          <div className="mb-4 rounded-md bg-red-100 p-4 border border-red-300">
            <p className="text-sm font-medium text-red-700">{error}</p>
          </div>
        )}
        
        {/* Başarı Mesajı Alanı (Sadece başarılıysa görünür) */}
        {successMessage && (
          <div className="mb-4 rounded-md bg-green-100 p-4 border border-green-300">
            <p className="text-sm font-medium text-green-700">{successMessage}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Nereden / Nereye (Aynı satırda) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="fromLocation" className="block text-sm font-medium text-gray-700">
                Nereden?
              </label>
              <input
                type="text"
                id="fromLocation"
                value={fromLocation}
                onChange={(e) => setFromLocation(e.target.value)}
                required
                disabled={loading} // Yüklenirken formu kilitle
                className="mt-1 block w-full appearance-none rounded-lg border border-gray-300 px-4 py-3 text-base text-gray-900 placeholder-gray-500 focus:z-10 focus:border-blue-500 focus:outline-none focus:ring-blue-500 disabled:bg-gray-50"
              />
            </div>
            <div>
              <label htmlFor="toLocation" className="block text-sm font-medium text-gray-700">
                Nereye?
              </label>
              <input
                type="text"
                id="toLocation"
                value={toLocation}
                onChange={(e) => setToLocation(e.target.value)}
                required
                disabled={loading}
                className="mt-1 block w-full appearance-none rounded-lg border border-gray-300 px-4 py-3 text-base text-gray-900 placeholder-gray-500 focus:z-10 focus:border-blue-500 focus:outline-none focus:ring-blue-500 disabled:bg-gray-50"
              />
            </div>
          </div>

          {/* Gidiş / Dönüş Saati (Aynı satırda) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="startTime" className="block text-sm font-medium text-gray-700">
                Gidiş Tarihi ve Saati
              </label>
              <input
                type="datetime-local" // Bu input hem tarih hem saat seçtirir
                id="startTime"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
                disabled={loading}
                className="mt-1 block w-full appearance-none rounded-lg border border-gray-300 px-4 py-3 text-base text-gray-900 placeholder-gray-500 focus:z-10 focus:border-blue-500 focus:outline-none focus:ring-blue-500 disabled:bg-gray-50"
              />
            </div>
            <div>
              <label htmlFor="endTime" className="block text-sm font-medium text-gray-700">
                Dönüş Tarihi ve Saati
              </label>
              <input
                type="datetime-local"
                id="endTime"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
                disabled={loading}
                className="mt-1 block w-full appearance-none rounded-lg border border-gray-300 px-4 py-3 text-base text-gray-900 placeholder-gray-500 focus:z-10 focus:border-blue-500 focus:outline-none focus:ring-blue-500 disabled:bg-gray-50"
              />
            </div>
          </div>

          {/* Amaç (Açıklama) */}
          <div>
            <label htmlFor="purpose" className="block text-sm font-medium text-gray-700">
              Talep Amacı (Açıklama)
            </label>
            <textarea
              id="purpose"
              rows={4}
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              required
              disabled={loading}
              className="mt-1 block w-full appearance-none rounded-lg border border-gray-300 px-4 py-3 text-base text-gray-900 placeholder-gray-500 focus:z-10 focus:border-blue-500 focus:outline-none focus:ring-blue-500 disabled:bg-gray-50"
            />
          </div>

          {/* Eşya Taşınacak Mı? (Checkbox) */}
          <div className="flex items-center">
            <input
              id="willCarryItems"
              type="checkbox"
              checked={willCarryItems}
              onChange={(e) => setWillCarryItems(e.target.checked)}
              disabled={loading}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="willCarryItems" className="ml-2 block text-sm font-medium text-gray-800">
              Eşya Taşınacak mı? (İşaretliyse: Evet)
            </label>
          </div>

          {/* Gönder Butonu */}
          <div className="border-t pt-6">
            <button
              type="submit"
              disabled={loading}
              className="group relative flex w-full justify-center rounded-lg border border-transparent bg-blue-600 px-4 py-3 text-lg font-bold text-white shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? (
                <svg className="h-5 w-5 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                'Talep Gönder'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}