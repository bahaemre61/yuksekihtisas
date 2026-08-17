'use client';

import { useState, FormEvent, ChangeEvent, useEffect } from "react";
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


        if (data.role === 'admin' || data.role === 'amir' || data.role === 'ADMIN' || data.role === 'AMIR' || data.role === 'TECHAMIR' || data.role === 'techamir' || data.role === 'SUPERVISOR' || data.role === 'supervisor') {
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
    customLocation: '',
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
      const selectedFile = e.target.files[0];

      const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
      if (!allowedTypes.includes(selectedFile.type)) {
        setMessage({ type: 'error', text: 'Sadece JPG, PNG veya WEBP formatında resim yükleyebilirsiniz.' });
        e.target.value = '';
        setFile(null);
        return;
      }

      const maxSize = 5 * 1024 * 1024;
      if (selectedFile.size > maxSize) {
        setMessage({ type: 'error', text: 'Dosya boyutu 5MB\'dan büyük olamaz.' });
        e.target.value = '';
        setFile(null);
        return;
      }

      setFile(selectedFile);
      setMessage(null);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const finalLocation = formData.location === 'other' ? formData.customLocation.trim() : formData.location;
    if (!finalLocation) {
      setMessage({ type: 'error', text: 'Lütfen geçerli bir yerleşke seçin veya girin.' });
      setLoading(false);
      return;
    }

    try {
      const dataToSend = new FormData();

      dataToSend.append('title', formData.title);
      dataToSend.append('description', formData.description);
      dataToSend.append('location', finalLocation);
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
        customLocation: '',
        priority: 'MEDIUM',
      });
      setFile(null);
      const fileInput = document.getElementById('fileInput') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

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
    <div className="bg-base-100 shadow-md rounded-lg p-6 space-y-6 max-w-3xl mx-auto">
      <h2 className="text-xl font-bold text-base-content border-b pb-2">Teknik Destek Formu</h2>

      {message && (
        <div className={`p-4 rounded-md ${message.type === 'success' ? 'bg-success/20 text-success' : 'bg-error/20 text-error'}`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Başlık */}
        <div>
          <label className="block text-sm font-medium text-base-content/80 mb-1">Konu Başlığı</label>
          <input
            type="text"
            name="title"
            required
            value={formData.title}
            onChange={handleInputChange}
            placeholder="Örn: Bilgisayar Açılmıyor"
            className="w-full border border-base-300 rounded-md p-2 focus:ring-orange-500 focus:border-orange-500"
          />
        </div>

        {/* Yerleşke Seçimi */}
        <div>
          <label className="block text-sm font-medium text-base-content/80 mb-1">Yerleşke</label>
          <select
            name="location"
            required
            value={formData.location}
            onChange={handleInputChange}
            disabled={locationsLoading}
            className="w-full border border-base-300 rounded-md p-2 bg-base-100 disabled:bg-base-200"
          >
            <option value="">{locationsLoading ? 'Yükleniyor...' : 'Seçiniz'}</option>

            {/* Dinamik Listeleme */}
            {!locationsLoading && locations.map((loc, index) => (
              <option key={index} value={loc}>
                {loc}
              </option>
            ))}
            <option value="other" className="font-bold text-primary">+ DİĞER (Elle Gir)</option>
          </select>
          {formData.location === 'other' && (
            <input
              type="text"
              name="customLocation"
              value={formData.customLocation}
              onChange={handleInputChange}
              placeholder="Yerleşke / Konum giriniz..."
              className="mt-2 block w-full rounded-lg border border-primary/30 bg-base-100 text-base-content px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/50"
              required
            />
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-base-content/80 mb-3">Aciliyet Durumu</label>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

            {/* DÜŞÜK ÖNCELİK */}
            <button
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, priority: 'LOW' }))}
              className={`
                flex items-center justify-center px-4 py-3 border rounded-lg text-sm font-medium transition-all
                ${formData.priority === 'LOW'
                  ? 'border-success bg-success/10 text-success ring-2 ring-success/30'
                  : 'border-base-300 text-base-content/80 hover:bg-base-200'
                }
              `}
            >
              <CheckCircleIcon className={`h-5 w-5 mr-2 ${formData.priority === 'LOW' ? 'text-success' : 'text-base-content/50'}`} />
              Düşük
            </button>

            {/* ORTA (NORMAL) ÖNCELİK */}
            <button
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, priority: 'MEDIUM' }))}
              className={`
                flex items-center justify-center px-4 py-3 border rounded-lg text-sm font-medium transition-all
                ${formData.priority === 'MEDIUM'
                  ? 'border-info bg-info/10 text-info ring-2 ring-info/30'
                  : 'border-base-300 text-base-content/80 hover:bg-base-200'
                }
              `}
            >
              <ClockIcon className={`h-5 w-5 mr-2 ${formData.priority === 'MEDIUM' ? 'text-info' : 'text-base-content/50'}`} />
              Normal
            </button>

            <button
              type="button"
              disabled={!canSelectHighPriority}
              onClick={() => canSelectHighPriority && setFormData(prev => ({ ...prev, priority: 'HIGH' }))}
              className={`
                relative flex items-center justify-center px-4 py-3 border rounded-lg text-sm font-medium transition-all
                ${!canSelectHighPriority
                  ? 'bg-base-200 border-base-200 text-base-content/50 cursor-not-allowed opacity-70'
                  : formData.priority === 'HIGH'
                    ? 'border-error bg-error/10 text-error ring-2 ring-error/30 cursor-pointer'
                    : 'border-base-300 text-base-content/80 hover:bg-base-200 cursor-pointer'
                }
              `}
            >
              {!canSelectHighPriority ? (
                <LockClosedIcon className="h-5 w-5 mr-2 text-base-content/50" />
              ) : (
                <ExclamationTriangleIcon className={`h-5 w-5 mr-2 ${formData.priority === 'HIGH' ? 'text-error' : 'text-base-content/50'}`} />
              )}

              ACİL DURUM

              {!canSelectHighPriority && (
                <span className="absolute -top-2 -right-2 bg-base-300 text-base-content/70 text-[9px] px-1.5 py-0.5 rounded-full">
                  Sadece Amir
                </span>
              )}
            </button>

          </div>

          {/* Bilgilendirme Metni */}
          <p className="text-xs text-base-content/60 mt-2 flex items-center gap-1">
            <span className="text-error font-bold">*</span>
            Acil durumlar teknik ekip ekranında en üstte ve kırmızı olarak listelenir.
          </p>
        </div>

        {/* Açıklama */}
        <div>
          <label className="block text-sm font-medium text-base-content/80 mb-1">Arıza Detayı</label>
          <textarea
            name="description"
            required
            rows={4}
            value={formData.description}
            onChange={handleInputChange}
            placeholder="Sorunu detaylı bir şekilde anlatınız..."
            className="w-full border border-base-300 rounded-md p-2 focus:ring-orange-500 focus:border-orange-500"
          ></textarea>
        </div>

        {/* Dosya Yükleme */}
        <div>
          <label className="block text-sm font-medium text-base-content/80 mb-1">Ekran Görüntüsü (Opsiyonel)</label>
          <input
            id="fileInput"
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="block w-full text-sm text-base-content/60
              file:mr-4 file:py-2 file:px-4
              file:rounded-full file:border-0
              file:text-sm file:font-semibold
              file:bg-primary/10 file:text-primary
              hover:file:bg-primary/20
              cursor-pointer border border-base-300 rounded-lg"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className={`w-full text-primary-content font-bold py-3 px-4 rounded-md transition duration-300 ${loading ? 'bg-base-300 text-base-content/50 cursor-not-allowed' : 'bg-primary hover:brightness-90'
            }`}
        >
          {loading ? 'Gönderiliyor...' : 'Teknik Talep Oluştur'}
        </button>

      </form>
    </div>
  );
}