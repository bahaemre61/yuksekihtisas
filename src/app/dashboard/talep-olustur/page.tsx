'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation'; 
import { ExclamationTriangleIcon , SparklesIcon} from '@heroicons/react/24/outline';

export default function CreateRequestPage() {

  const [fromLocation, setFromLocation] = useState('');
  const [toLocation, setToLocation] = useState('');
  const [purpose, setPurpose] = useState('');
  const [willCarryItems, setWillCarryItems] = useState(false);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [priority, setPriority] = useState<'normal' | 'high'>('normal');
  

  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [canSetPriority, setCanSetPriority] = useState(false);  

  const [aiText, setAiText] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  
  const router = useRouter();

  useEffect(() => {
    const checkRole = async () => {
      try {
        const res = await axios.get('/api/me');
        const role = res.data.role;
        if(role === 'amir' || role === 'admin') {
          setCanSetPriority(true);
        }
      } catch (err) {
        console.error('Kullanıcı rolü alınamadı:', err);
      }
    };
    checkRole();
  }, []);

  const handleAiFill = async () => {
    if (!aiText.trim()) return;
    setAiLoading(true);
    setError('');
    try {
        const res = await axios.post('/api/ai/parse-request', { text: aiText });
        const data = res.data; 

        if (data.fromLocation) setFromLocation(data.fromLocation);
        if (data.toLocation) setToLocation(data.toLocation);
        if (data.purpose) setPurpose(data.purpose);
        if (data.willCarryItems !== undefined) setWillCarryItems(data.willCarryItems);
        

        if (data.startTime) setStartTime(data.startTime.slice(0, 16));
        if (data.endTime) setEndTime(data.endTime.slice(0, 16));

        if (data.priority === 'high' && canSetPriority) {
            setPriority('high');
        } else {
            setPriority('normal');
        }

    } catch (err) {
        console.error(err);
        alert("Yapay zeka metni çözümleyemedi. Lütfen tekrar deneyin.");
    } finally {
        setAiLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); 
    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      
      const payload = {
        fromLocation,
        toLocation,
        purpose,
        willCarryItems,
        startTime,
        endTime,
        priority,
      };

      
      if (new Date(endTime) <= new Date(startTime)) {
        setError('Dönüş saati, gidiş saatinden sonra olmalıdır.');
        setLoading(false);
        return;
      }


      await axios.post('/api/requests', payload);

      
      setSuccessMessage('Araç talebiniz başarıyla oluşturuldu! Taleplerim sayfasına yönlendiriliyorsunuz...');
      
      
      setFromLocation('');
      setToLocation('');
      setPurpose('');
      setWillCarryItems(false);
      setStartTime('');
      setEndTime('');
      setPriority('normal');
      setAiText('');

      
      setTimeout(() => {
        router.push('/dashboard/taleplerim');
      }, 2000);

    } catch (err: any) {
      
      if (axios.isAxiosError(err) && err.response) {       
        setError(err.response.data.msg || 'Talep oluşturulamadı. Bilinmeyen bir hata.');
      } else {
        setError('Bir hata oluştu. Lütfen tekrar deneyin.');
      }
    } finally {
      
      setLoading(false);
    }
  };

  return (
    
    <div className="max-w-3xl mx-auto">
      
      <div className="bg-linear-to-r from-purple-50 to-indigo-50 border border-purple-200 p-5 rounded-xl mb-6 shadow-sm">
        <div className="flex items-center mb-2">
            <SparklesIcon className="h-5 w-5 text-purple-600 mr-2" />
            <h3 className="font-bold text-purple-800">Yapay Zeka ile Hızlı Doldur</h3>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
            <input 
                type="text" 
                value={aiText}
                onChange={(e) => setAiText(e.target.value)}
                placeholder='Örn: "Yarın 14:00te Rektörlükten Esenboğaya misafir götüreceğim, acil."'
                className="flex-1 p-3 border border-purple-200 rounded-lg outline-none focus:ring-2 focus:ring-purple-400 text-sm"
                onKeyDown={(e) => e.key === 'Enter' && handleAiFill()}
            />
            <button 
                onClick={handleAiFill}
                disabled={aiLoading || !aiText.trim()}
                className="bg-purple-600 text-white px-5 py-2 rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 transition-all flex items-center justify-center min-w-140px"
            >
                {aiLoading ? (
                    <span className="animate-pulse">Düşünüyor...</span>
                ) : (
                    <>
                        <SparklesIcon className="h-4 w-4 mr-2 text-yellow-300" />
                        Sihirli Doldur
                    </>
                )}
            </button>
        </div>
        <p className="text-xs text-purple-500 mt-2 ml-1">* İsteğinizi doğal bir dille yazın, formu sizin için dolduralım.</p>
      </div>

      <div className="bg-white shadow-lg rounded-lg p-6 sm:p-8">
        <h2 className="text-2xl font-semibold text-gray-800 mb-6">
          Yeni Araç Talep Formu
        </h2>
        
        
        {error && (
          <div className="mb-4 rounded-md bg-red-100 p-4 border border-red-300">
            <p className="text-sm font-medium text-red-700">{error}</p>
          </div>
        )}
        
        
        {successMessage && (
          <div className="mb-4 rounded-md bg-green-100 p-4 border border-green-300">
            <p className="text-sm font-medium text-green-700">{successMessage}</p>
          </div>
        )}

       
        <form onSubmit={handleSubmit} className="space-y-6">
          {canSetPriority && (

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Aciliyet Durumu</label>
            <div className="grid grid-cols-2 gap-4">
                <button
                    type="button"
                    onClick={() => setPriority('normal')}
                    className={`
                        flex items-center justify-center px-4 py-3 border rounded-lg text-sm font-medium transition-all
                        ${priority === 'normal' 
                            ? 'border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-200' 
                            : 'border-gray-300 text-gray-700 hover:bg-gray-50'}
                    `}
                >
                    Normal Talep
                </button>

                <button
                    type="button"
                    onClick={() => setPriority('high')}
                    className={`
                        flex items-center justify-center px-4 py-3 border rounded-lg text-sm font-medium transition-all
                        ${priority === 'high' 
                            ? 'border-red-500 bg-red-50 text-red-700 ring-2 ring-red-200' 
                            : 'border-gray-300 text-gray-700 hover:bg-gray-50'}
                    `}
                >
                    <ExclamationTriangleIcon className="h-5 w-5 mr-2" />
                    ACİL DURUM
                </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
                * Acil durumlar şoförlerin rotasında önceliklendirilir.
            </p>
          </div>
          )}
          
          
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
                disabled={loading} 
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

          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="startTime" className="block text-sm font-medium text-gray-700">
                Gidiş Tarihi ve Saati
              </label>
              <input
                type="datetime-local"
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