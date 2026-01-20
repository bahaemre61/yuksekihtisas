'use client';

import { useState,FormEvent, ChangeEvent, useEffect } from "react";
import { useRouter } from 'next/navigation'; 
import { ExclamationTriangleIcon, CheckCircleIcon, ClockIcon, LockClosedIcon } from '@heroicons/react/24/outline';

export default function TeknikTalepForm() {

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  // --- YENİ EKLENEN KISIM: İLÇELER STATE'İ ---
  const [locations, setLocations] = useState<string[]>([]);
  const [locationsLoading, setLocationsLoading] = useState(true);

  const [canSelectHighPriority, setCanSelectHighPriority] = useState(false);
  const router = useRouter();


  useEffect(() => {
  const checkUserRole = async () => {
    try {
      const res = await fetch('/api/me'); 
      const data = await res.json();
      

      if (data.role === 'admin' || data.role === 'amir' || data.role === 'ADMIN') {
        setCanSelectHighPriority(true);
      }
    } catch (error) {
      console.error('Yetki kontrolü yapılamadı', error);
    }
  };

  checkUserRole();
}, []);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    priority: 'MEDIUM',
  });

    const [file, setFile] = useState<File | null>(null);

   useEffect(() => {
    const fetchLocations = async () => {
      try {
        const res = await fetch('/api/locations');
        
        if (!res.ok) {
           throw new Error('Veri çekilemedi.');
        }

        const result = await res.json();
        
        // --- DEĞİŞİKLİK BURADA ---
        // Eskiden: if (result.success && Array.isArray(result.data))
        // Yeni: Sadece result.data'nın bir dizi (Array) olup olmadığına bakıyoruz.
        // Çünkü sizin API'niz 'success' değil 'msg' gönderiyor.
        
        if (Array.isArray(result.data)) {
          setLocations(result.data);
        } else {
          console.error('API formatı beklenildiği gibi değil:', result);
          setMessage({ type: 'error', text: 'İlçe listesi yüklenemedi.' });
        }

      } catch (error) {
        console.error('Fetch Hatası:', error);
      } finally {
        setLocationsLoading(false);
      }
    };

    fetchLocations();
  }, []);

    const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const dataToSend = new FormData();
      
      dataToSend.append('title', formData.title);
      dataToSend.append('description', formData.description);
      dataToSend.append('location', formData.location);
      dataToSend.append('priority', formData.priority);
      
      if (file) {
        dataToSend.append('screenshot', file);
      }

      const response = await fetch('/api/technicalrequests', {
        method: 'POST',
        body: dataToSend,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Bir hata oluştu');
      }

      setMessage({ type: 'success', text: 'Talep başarıyla oluşturuldu!' });
      
      setFormData({
        title: '',
        description: '',
        location: '',
        priority: 'MEDIUM',
      });
      setFile(null);
      (document.getElementById('fileInput') as HTMLInputElement).value = '';
      
      setTimeout(() => {
        router.push('/dashboard/tekniktaleplerim');
      }, 2000);

    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white shadow-md rounded-lg p-6 space-y-6 max-w-3xl mx-auto">
      <h2 className="text-xl font-bold text-gray-800 border-b pb-2">Teknik Destek Formu</h2>

      {message && (
        <div className={`p-4 rounded-md ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Başlık */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Konu Başlığı</label>
          <input
            type="text"
            name="title"
            required
            value={formData.title}
            onChange={handleInputChange}
            placeholder="Örn: Bilgisayar Açılmıyor"
            className="w-full border border-gray-300 rounded-md p-2 focus:ring-orange-500 focus:border-orange-500"
          />
        </div>

        {/* İlçe Seçimi (API'den Gelen Data) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Bölge / İlçe</label>
          <select
            name="location"
            required
            value={formData.location}
            onChange={handleInputChange}
            disabled={locationsLoading}
            className="w-full border border-gray-300 rounded-md p-2 bg-white disabled:bg-gray-100"
          >
            <option value="">{locationsLoading ? 'Yükleniyor...' : 'Seçiniz'}</option>
            {/* Dinamik Listeleme */}
            {!locationsLoading && locations.map((loc, index) => (
              <option key={index} value={loc}>
                {loc}
              </option>
            ))}
          </select>
        </div>

        {/* Aciliyet Durumu */}
         {/* <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Aciliyet Durumu</label>
          <div className="flex gap-4 mt-2">
            {['LOW', 'MEDIUM', 'HIGH'].map((prio) => (
              <label key={prio} className="flex items-center space-x-2 cursor-pointer border p-3 rounded-md hover:bg-gray-50 w-full transition-colors">
                <input
                  type="radio"
                  name="priority"
                  value={prio}
                  checked={formData.priority === prio}
                  onChange={handleInputChange}
                  className="text-orange-600 focus:ring-orange-500"
                />
                <span className={`font-semibold ${
                  prio === 'HIGH' ? 'text-red-600' : prio === 'MEDIUM' ? 'text-yellow-600' : 'text-green-600'
                }`}>
                  {prio === 'HIGH' ? 'Yüksek' : prio === 'MEDIUM' ? 'Orta' : 'Düşük'}
                </span>
              </label>
            ))}
          </div> */}
          <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">Aciliyet Durumu</label>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            {/* DÜŞÜK ÖNCELİK */}
            <button
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, priority: 'LOW' }))}
              className={`
                flex items-center justify-center px-4 py-3 border rounded-lg text-sm font-medium transition-all
                ${formData.priority === 'LOW'
                  ? 'border-green-500 bg-green-50 text-green-700 ring-2 ring-green-200'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }
              `}
            >
              <CheckCircleIcon className={`h-5 w-5 mr-2 ${formData.priority === 'LOW' ? 'text-green-600' : 'text-gray-400'}`} />
              Düşük
            </button>

            {/* ORTA (NORMAL) ÖNCELİK */}
            <button
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, priority: 'MEDIUM' }))}
              className={`
                flex items-center justify-center px-4 py-3 border rounded-lg text-sm font-medium transition-all
                ${formData.priority === 'MEDIUM'
                  ? 'border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-200'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }
              `}
            >
              <ClockIcon className={`h-5 w-5 mr-2 ${formData.priority === 'MEDIUM' ? 'text-blue-600' : 'text-gray-400'}`} />
              Normal
            </button>

            <button
              type="button"
              disabled={!canSelectHighPriority}
              onClick={() => canSelectHighPriority && setFormData(prev => ({ ...prev, priority: 'HIGH' }))}
              className={`
                relative flex items-center justify-center px-4 py-3 border rounded-lg text-sm font-medium transition-all
                ${!canSelectHighPriority
                  ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed opacity-70' // Pasif Durum
                  : formData.priority === 'HIGH'
                    ? 'border-red-500 bg-red-50 text-red-700 ring-2 ring-red-200 cursor-pointer' // Aktif ve Seçili
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50 cursor-pointer' // Aktif ama Seçili Değil
                }
              `}
            >
              {!canSelectHighPriority ? (
                <LockClosedIcon className="h-5 w-5 mr-2 text-gray-400" />
              ) : (
                <ExclamationTriangleIcon className={`h-5 w-5 mr-2 ${formData.priority === 'HIGH' ? 'text-red-600' : 'text-gray-400'}`} />
              )}
              
              ACİL DURUM
              
              {/* Sadece yetkisi olmayanlar görsün diye ufak bir "Sadece Amir" etiketi */}
              {!canSelectHighPriority && (
                 <span className="absolute -top-2 -right-2 bg-gray-500 text-white text-[9px] px-1.5 py-0.5 rounded-full">
                    Sadece Amir
                 </span>
              )}
            </button>

          </div>
          
          {/* Bilgilendirme Metni */}
          <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
            <span className="text-red-500 font-bold">*</span>
            Acil durumlar teknik ekip ekranında en üstte ve kırmızı olarak listelenir.
          </p>
        </div>

        {/* Açıklama */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Arıza Detayı</label>
          <textarea
            name="description"
            required
            rows={4}
            value={formData.description}
            onChange={handleInputChange}
            placeholder="Sorunu detaylı bir şekilde anlatınız..."
            className="w-full border border-gray-300 rounded-md p-2 focus:ring-orange-500 focus:border-orange-500"
          ></textarea>
        </div>

        {/* Dosya Yükleme */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Ekran Görüntüsü (Opsiyonel)</label>
          <input
            id="fileInput"
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-full file:border-0
              file:text-sm file:font-semibold
              file:bg-orange-50 file:text-orange-700
              hover:file:bg-orange-100
              cursor-pointer border border-gray-300 rounded-lg"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className={`w-full text-white font-bold py-3 px-4 rounded-md transition duration-300 ${
            loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-orange-600 hover:bg-orange-700'
          }`}
        >
          {loading ? 'Gönderiliyor...' : 'Teknik Talep Oluştur'}
        </button>

      </form>
    </div>
  );
}