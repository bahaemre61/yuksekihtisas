'use client';

import React, { useState, useEffect, Fragment } from 'react';
import axios from 'axios';
import { Dialog, Transition } from '@headlessui/react';
import { CloudArrowUpIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import Alert from '@/src/components/ui/Alert';

// Teknik şartname yükleme kuralları (sunucudaki upload-spec ile aynı olmalı)
const SPEC_ALLOWED_EXT = ['.pdf', '.doc', '.docx', '.rar', '.zip', '.7z'];
const SPEC_MAX_BYTES = 25 * 1024 * 1024; // 25MB

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export interface IUser {
  _id: string;
  name: string;
  email: string;
  role: string;
}

export interface IMaterialItemInput {
  id: string;
  materialType: string;
  customMaterialType: string;
  materialName: string;
  quantity: number;
  unit: string;
  customUnit: string;
}

export default function MalzemeTalepForm({
  isOpen = true,
  onClose,
  currentUser,
  onSuccess,
  isModal = true
}: {
  isOpen?: boolean;
  onClose?: () => void;
  currentUser?: IUser | null;
  onSuccess?: () => void;
  isModal?: boolean;
}) {
  const createEmptyItem = (): IMaterialItemInput => ({
    id: Math.random().toString(36).substring(2, 9),
    materialType: 'Kırtasiye',
    customMaterialType: '',
    materialName: '',
    quantity: 1,
    unit: 'Adet',
    customUnit: ''
  });

  const [items, setItems] = useState<IMaterialItemInput[]>([createEmptyItem()]);
  const [location, setLocation] = useState('Yüksek İhtisas Tıp Fakültesi (100.Yıl Yerleşkesi)');
  const [availableLocations, setAvailableLocations] = useState<string[]>([
    // 'Balgat Yerleşkesi',
    // 'Tıp Fakültesi Yerleşkesi',
    // 'Bağlum Yerleşkesi',
    // 'Rektörlük / Merkez'
  ]);

  const [batchDescription, setBatchDescription] = useState('');
  const [specification, setSpecification] = useState('');

  // Şartname dosya yükleme state'leri
  const [specFile, setSpecFile] = useState<File | null>(null);
  const [specFileUrl, setSpecFileUrl] = useState('');
  const [specFileName, setSpecFileName] = useState('');
  const [uploadingSpec, setUploadingSpec] = useState(false);
  const [specFileSize, setSpecFileSize] = useState(0);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [specError, setSpecError] = useState('');
  const [dragActive, setDragActive] = useState(false);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const res = await axios.get('/api/locations');
        if (res.data?.data && Array.isArray(res.data.data)) {
          const combined = Array.from(new Set([...availableLocations, ...res.data.data]));
          setAvailableLocations(combined);
        }
      } catch (err) {
        console.error('Fetch locations error:', err);
      }
    };
    fetchLocations();
  }, []);

  const handleAddItem = () => {
    setItems((prev) => [...prev, createEmptyItem()]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof IMaterialItemInput, value: any) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  // Şartname Dosyası Yükleme İşleyicisi
  const uploadSpecFile = async (selected: File) => {
    setSpecError('');

    const dot = selected.name.lastIndexOf('.');
    const ext = dot >= 0 ? selected.name.substring(dot).toLowerCase() : '';

    if (!SPEC_ALLOWED_EXT.includes(ext)) {
      setSpecError(`"${ext || 'uzantısız'}" dosya türü desteklenmiyor. Yalnızca PDF, Word (.doc/.docx) veya sıkıştırılmış dosya (.rar, .zip, .7z) yükleyebilirsiniz.`);
      return;
    }
    if (selected.size === 0) {
      setSpecError('Seçilen dosya boş görünüyor. Lütfen dosyayı kontrol edip tekrar deneyin.');
      return;
    }
    if (selected.size > SPEC_MAX_BYTES) {
      setSpecError(`Dosya boyutu (${formatBytes(selected.size)}) 25 MB sınırını aşıyor. Dosyayı küçültüp ya da parçalara bölüp tekrar deneyin.`);
      return;
    }

    setUploadingSpec(true);
    setUploadProgress(0);
    try {
      const formData = new FormData();
      formData.append('file', selected);

      // Content-Type elle verilmez: tarayıcı boundary değerini kendisi ekler
      const res = await axios.post('/api/material-requests/upload-spec', formData, {
        onUploadProgress: (ev) => {
          if (ev.total) setUploadProgress(Math.round((ev.loaded * 100) / ev.total));
        }
      });

      setSpecFileUrl(res.data.fileUrl);
      setSpecFileName(res.data.fileName);
      setSpecFileSize(selected.size);
      setSpecFile(selected);
    } catch (err) {
      let msg = 'Şartname dosyası yüklenirken bir hata oluştu.';
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        if (status === 413) {
          msg = 'Dosya, sunucunun kabul ettiği boyut sınırını aşıyor (413). Dosyayı küçültüp tekrar deneyin.';
        } else if (status === 401) {
          msg = 'Oturum süreniz dolmuş olabilir. Sayfayı yenileyip tekrar giriş yapın.';
        } else if (!err.response) {
          msg = 'Sunucuya ulaşılamadı veya bağlantı koptu. İnternet bağlantınızı kontrol edip tekrar deneyin.';
        } else if (err.response.data?.msg) {
          msg = err.response.data.msg;
        } else {
          msg = `Yükleme başarısız oldu (HTTP ${status}).`;
        }
      }
      setSpecError(msg);
    } finally {
      setUploadingSpec(false);
    }
  };

  const handleSpecFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    // Aynı dosya tekrar seçilebilsin (hata sonrası yeniden deneme) diye input sıfırlanır
    e.target.value = '';
    if (selected) uploadSpecFile(selected);
  };

  const handleRemoveSpecFile = () => {
    setSpecFile(null);
    setSpecFileUrl('');
    setSpecFileName('');
    setSpecFileSize(0);
    setSpecError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!location) {
      setMessage({ type: 'error', text: 'Lütfen bir yerleşke seçiniz.' });
      return;
    }

    // Tüm kalemleri doğrula
    const preparedItems = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const finalType = item.materialType === 'Diğer' ? item.customMaterialType.trim() : item.materialType;
      const finalUnit = item.unit === 'Diğer' ? item.customUnit.trim() : item.unit;

      if (!finalType) {
        setMessage({ type: 'error', text: `${i + 1}. Malzemenin cinsini belirtiniz.` });
        return;
      }
      if (!item.materialName.trim()) {
        setMessage({ type: 'error', text: `${i + 1}. Malzemenin adını yazınız.` });
        return;
      }
      if (item.quantity <= 0) {
        setMessage({ type: 'error', text: `${i + 1}. Malzemenin miktarını geçerli giriniz.` });
        return;
      }
      if (!finalUnit) {
        setMessage({ type: 'error', text: `${i + 1}. Malzemenin birim ölçeğini giriniz.` });
        return;
      }

      preparedItems.push({
        materialType: finalType,
        materialName: item.materialName.trim(),
        quantity: item.quantity,
        unit: finalUnit
      });
    }

    setLoading(true);
    try {
      await axios.post('/api/material-requests', {
        location,
        description: batchDescription.trim(),
        specification: specification.trim(),
        specificationFileUrl: specFileUrl,
        specificationFileName: specFileName,
        items: preparedItems
      });

      setMessage({
        type: 'success',
        text: `${preparedItems.length} adet malzeme talebiniz (${location}) için başarıyla oluşturuldu ve Onay Havuzuna gönderildi!`
      });

      // Formu sıfırla
      setItems([createEmptyItem()]);
      setBatchDescription('');
      setSpecification('');
      setSpecFile(null);
      setSpecFileUrl('');
      setSpecFileName('');
      setSpecFileSize(0);

      setTimeout(() => {
        if (onSuccess) onSuccess();
        if (onClose) onClose();
      }, 1500);

    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.response?.data?.msg || 'Malzeme talebi oluşturulurken bir hata meydana geldi.'
      });
    } finally {
      setLoading(false);
    }
  };

  const inputCls =
    'w-full h-11 rounded-lg border border-base-300 bg-base-100 px-3 text-sm font-medium text-base-content placeholder:font-normal placeholder:text-base-content/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10';
  const labelCls = 'mb-1.5 block text-sm font-semibold text-base-content/80';

  const formBody = (
    <div className="space-y-6">
      <div className="flex items-start justify-between border-b border-base-200 pb-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-base-content">Malzeme Talep Formu</h2>
          <p className="mt-1 text-sm text-base-content/60">
            Yerleşke seçerek malzeme kalemlerini girebilir ve şartname belgesi yükleyebilirsiniz.
          </p>
        </div>
        {isModal && onClose && (
          <button
            type="button"
            onClick={onClose}
            className="btn btn-ghost btn-sm btn-square rounded-lg text-2xl leading-none text-base-content/60"
            aria-label="Kapat"
          >
            &times;
          </button>
        )}
      </div>

      {message && (
        <Alert variant={message.type === 'success' ? 'success' : 'error'} onClose={() => setMessage(null)}>
          {message.text}
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Yerleşke Seçimi (İş Kodu için Zorunlu) */}
        <div className="rounded-xl border border-base-200 bg-base-200/40 p-5">
          <label className={labelCls}>
            Yerleşke <span className="text-error">*</span>
            <span className="ml-1 font-normal text-base-content/50">(İş koduna otomatik işlenir)</span>
          </label>
          <select
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className={inputCls}
            required
          >
            {availableLocations.map((loc) => (
              <option key={loc} value={loc}>
                {loc}
              </option>
            ))}
          </select>
        </div>

        {/* Malzeme Kalemleri: tablo benzeri, tek satırlık giriş */}
        <div className="overflow-hidden rounded-xl border border-base-200">
          <div className="flex items-center justify-between border-b border-base-200 bg-base-200/50 px-5 py-3">
            <h3 className="text-sm font-semibold text-base-content">Malzeme Kalemleri</h3>
            <span className="text-xs font-medium text-base-content/60">{items.length} kalem</span>
          </div>

          <div className="divide-y divide-base-200">
            {items.map((item, index) => (
              <div key={item.id} className="px-5 py-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-12 lg:items-start">
                  <div className="flex items-center gap-3 sm:col-span-2 lg:col-span-12">
                    <span className="flex h-6 w-6 items-center justify-center rounded-md bg-base-200 text-xs font-semibold text-base-content/70">
                      {index + 1}
                    </span>
                    <span className="text-sm font-semibold text-base-content">Kalem {index + 1}</span>
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        className="ml-auto text-xs font-semibold text-error hover:underline"
                        title="Bu kalemi kaldır"
                      >
                        Kaldır
                      </button>
                    )}
                  </div>

                  {/* Malzemenin Cinsi */}
                  <div className="lg:col-span-3">
                    <label className={labelCls}>Cinsi <span className="text-error">*</span></label>
                    <select
                      value={item.materialType}
                      onChange={(e) => handleItemChange(index, 'materialType', e.target.value)}
                      className={inputCls}
                      required
                    >
                      <option value="Kırtasiye">Kırtasiye</option>
                      <option value="Teknoloji / Donanım">Teknoloji / Donanım</option>
                      <option value="Sarf Malzemesi">Sarf Malzemesi</option>
                      <option value="Temizlik">Temizlik</option>
                      <option value="Demirbaş">Demirbaş</option>
                      <option value="Ofis Malzemesi">Ofis Malzemesi</option>
                      <option value="Diğer">Diğer (Özel Belirt)</option>
                    </select>
                    {item.materialType === 'Diğer' && (
                      <input
                        type="text"
                        placeholder="Cinsi yazınız..."
                        value={item.customMaterialType}
                        onChange={(e) => handleItemChange(index, 'customMaterialType', e.target.value)}
                        className={`${inputCls} mt-2`}
                        required
                      />
                    )}
                  </div>

                  {/* Malzeme Adı / Tanımı */}
                  <div className="sm:col-span-2 lg:col-span-5">
                    <label className={labelCls}>Malzeme Adı / Tanımı <span className="text-error">*</span></label>
                    <input
                      type="text"
                      required
                      value={item.materialName}
                      onChange={(e) => handleItemChange(index, 'materialName', e.target.value)}
                      placeholder="Örn: A4 Fotokopi Kağıdı"
                      className={inputCls}
                    />
                  </div>

                  {/* Miktar */}
                  <div className="lg:col-span-2">
                    <label className={labelCls}>Miktar <span className="text-error">*</span></label>
                    <input
                      type="number"
                      min={1}
                      required
                      value={item.quantity}
                      onChange={(e) => handleItemChange(index, 'quantity', Number(e.target.value))}
                      className={inputCls}
                    />
                  </div>

                  {/* Birim */}
                  <div className="lg:col-span-2">
                    <label className={labelCls}>Birim <span className="text-error">*</span></label>
                    <select
                      value={item.unit}
                      onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                      className={inputCls}
                      required
                    >
                      <option value="Adet">Adet</option>
                      <option value="Paket">Paket</option>
                      <option value="Kutu">Kutu</option>
                      <option value="Koli">Koli</option>
                      <option value="Top">Top</option>
                      <option value="Metre">Metre</option>
                      <option value="Litre">Litre</option>
                      <option value="Kg">Kg</option>
                      <option value="Diğer">Diğer (Özel Belirt)</option>
                    </select>
                    {item.unit === 'Diğer' && (
                      <input
                        type="text"
                        placeholder="Birimi yazınız..."
                        value={item.customUnit}
                        onChange={(e) => handleItemChange(index, 'customUnit', e.target.value)}
                        className={`${inputCls} mt-2`}
                        required
                      />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-base-200 bg-base-200/30 px-5 py-3">
            <button
              type="button"
              onClick={handleAddItem}
              className="inline-flex h-10 items-center rounded-lg border border-base-300 bg-base-100 px-4 text-sm font-semibold text-base-content/80 transition-colors hover:bg-base-200"
            >
              + Başka Malzeme Ekle
            </button>
          </div>
        </div>

        {/* SHARED SECTION: GEREKÇE & ŞARTNAME DOSYA YÜKLEME */}
        <div className="rounded-xl border border-base-200 bg-base-200/40 p-5 space-y-5">
          <div className="border-b border-base-200 pb-3 text-sm font-semibold text-base-content">
            Genel Bilgiler & Şartname <span className="font-normal text-base-content/50">(Opsiyonel)</span>
          </div>

          {/* 1 Adet Gerekçe */}
          <div>
            <label className={labelCls}>
              Talep Gerekçesi / Açıklama
            </label>
            <textarea
              rows={2}
              value={batchDescription}
              onChange={(e) => setBatchDescription(e.target.value)}
              placeholder="Tüm malzeme talebinizin ortak gerekçesini veya amacını buraya yazabilirsiniz..."
              className="w-full rounded-lg border border-base-300 bg-base-100 px-3 py-2.5 text-sm font-medium text-base-content placeholder:font-normal placeholder:text-base-content/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
            ></textarea>
          </div>

          {/* 1 Adet Şartname Metni */}
          <div>
            <label className={labelCls}>
              Teknik Şartname / Özel Detaylar (Metin)
            </label>
            <textarea
              rows={2}
              value={specification}
              onChange={(e) => setSpecification(e.target.value)}
              placeholder="Talep edilen ürünlerin teknik özellikleri veya şartname detaylarını metin olarak buraya yazabilirsiniz..."
              className="w-full rounded-lg border border-base-300 bg-base-100 px-3 py-2.5 text-sm font-medium text-base-content placeholder:font-normal placeholder:text-base-content/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
            ></textarea>
          </div>

          {/* 1 Adet Şartname DOSYASI YÜKLEME (PDF veya DOCX) */}
          <div className="pt-1">
            <label className={labelCls}>
              Teknik Şartname Dosyası
            </label>

            {specError && (
              <div className="mb-2">
                <Alert key={specError} variant="error" onClose={() => setSpecError('')}>
                  {specError}
                </Alert>
              </div>
            )}

            {specFileUrl ? (
              <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-base-100 border border-success/40">
                <div className="flex items-center gap-3 min-w-0">
                  <CheckCircleIcon className="h-6 w-6 text-success shrink-0" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-base-content">{specFileName}</p>
                    <p className="text-xs text-base-content/60">
                      Şartname yüklendi{specFileSize > 0 ? ` · ${formatBytes(specFileSize)}` : ''}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveSpecFile}
                  className="btn btn-ghost btn-xs text-error font-bold shrink-0"
                >
                  Kaldır
                </button>
              </div>
            ) : (
              <div
                onDragEnter={() => setDragActive(true)}
                onDragLeave={() => setDragActive(false)}
                onDrop={() => setDragActive(false)}
                className={`relative rounded-xl border-2 border-dashed p-5 text-center transition-colors ${
                  uploadingSpec
                    ? 'border-primary/40 bg-primary/5'
                    : dragActive
                      ? 'border-primary bg-primary/5'
                      : 'border-base-300 bg-base-100 hover:border-primary/50'
                }`}
              >
                <input
                  type="file"
                  accept={SPEC_ALLOWED_EXT.join(',')}
                  onChange={handleSpecFileChange}
                  disabled={uploadingSpec}
                  aria-label="Teknik şartname dosyası seç"
                  className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
                />

                {uploadingSpec ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-center gap-2 text-sm font-semibold text-primary">
                      <span className="loading loading-spinner loading-xs"></span>
                      <span>Yükleniyor... %{uploadProgress}</span>
                    </div>
                    <progress className="progress progress-primary w-full max-w-xs" value={uploadProgress} max={100}></progress>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div className="flex items-center justify-center gap-2 text-sm font-semibold text-base-content/80">
                      <CloudArrowUpIcon className="h-5 w-5 text-primary" />
                      <span>Dosyayı sürükleyip bırakın veya <span className="text-primary underline">bilgisayardan seçin</span></span>
                    </div>
                    <p className="text-xs text-base-content/50">
                      PDF, Word (.doc/.docx) veya sıkıştırılmış dosya (.rar, .zip, .7z) · En fazla 25 MB
                    </p>
                  </div>
                )}
              </div>
            )}
            <p className="mt-1.5 text-xs text-base-content/50">
              Birden fazla şartname dosyası varsa hepsini tek bir .rar veya .zip içinde sıkıştırıp yükleyebilirsiniz.
            </p>
          </div>
        </div>

        {/* 2 Aşamalı Onay Bilgilendirme Notu */}
        <div className="rounded-xl border border-base-200 bg-base-200/40 px-4 py-3 text-sm text-base-content/70">
          Oluşturduğunuz {items.length} malzeme talebi <strong className="font-semibold text-base-content">Genel Sekreterlik</strong> onayından geçip <strong className="font-semibold text-base-content">Satın Alma</strong> tarafından işleme alınacaktır.
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading || uploadingSpec}
          className={`w-full text-primary-content font-semibold py-3 px-4 text-sm rounded-lg transition-colors ${loading || uploadingSpec ? 'bg-base-300 text-base-content/50 cursor-not-allowed' : 'bg-primary hover:brightness-95'
            }`}
        >
          {loading ? (
            <span className="loading loading-spinner loading-xs"></span>
          ) : (
            `Toplu Malzeme Talebi Oluştur (${items.length} Malzeme Kalemi)`
          )}
        </button>
      </form>
    </div>
  );

  if (!isModal) {
    return (
      <div className="bg-base-100 rounded-2xl p-6 md:p-10 space-y-6 max-w-5xl mx-auto border border-base-200">
        {formBody}
      </div>
    );
  }

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose || (() => { })}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-base-content/40 backdrop-blur-md" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto p-4 flex items-center justify-center">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <Dialog.Panel className="w-full max-w-5xl max-h-[92vh] overflow-y-auto bg-base-100 shadow-2xl rounded-2xl p-4 sm:p-6 md:p-10 my-4 sm:my-8 border border-base-200">
              {formBody}
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition.Root>
  );
}
