'use client';

import React, { useState, useEffect, Fragment } from 'react';
import axios from 'axios';
import { Dialog, Transition } from '@headlessui/react';
import {
  XMarkIcon,
  ShoppingBagIcon,
  PlusIcon,
  TrashIcon,
  DocumentTextIcon,
  ClipboardDocumentListIcon,
  PaperClipIcon,
  CloudArrowUpIcon,
  CheckCircleIcon,
  BuildingOfficeIcon
} from '@heroicons/react/24/outline';

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
  const handleSpecFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    const allowed = ['.pdf', '.doc', '.docx', '.rar'];
    const ext = selected.name.substring(selected.name.lastIndexOf('.')).toLowerCase();

    if (!allowed.includes(ext)) {
      alert('Şartname dosyası sadece PDF (.pdf) veya Word (.doc, .docx) formatında yüklenebilir.');
      return;
    }

    setUploadingSpec(true);
    try {
      const formData = new FormData();
      formData.append('file', selected);

      const res = await axios.post('/api/material-requests/upload-spec', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setSpecFileUrl(res.data.fileUrl);
      setSpecFileName(res.data.fileName);
      setSpecFile(selected);
    } catch (err: any) {
      alert(err.response?.data?.msg || 'Şartname dosyası yüklenirken bir hata oluştu.');
    } finally {
      setUploadingSpec(false);
    }
  };

  const handleRemoveSpecFile = () => {
    setSpecFile(null);
    setSpecFileUrl('');
    setSpecFileName('');
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

  const formBody = (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-base-200 pb-3">
        <div>
          <h2 className="text-xl font-black text-base-content flex items-center gap-2">
            <ShoppingBagIcon className="h-6 w-6 text-primary" />
            Malzeme Talep Formu
          </h2>
          <p className="text-xs text-base-content/60 mt-0.5">
            Yerleşke seçerek malzeme kalemlerini girebilir ve şartname belgesi yükleyebilirsiniz.
          </p>
        </div>
        {isModal && onClose && (
          <button
            type="button"
            onClick={onClose}
            className="btn btn-ghost btn-xs btn-square rounded-xl"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        )}
      </div>

      {message && (
        <div className={`p-4 rounded-2xl text-xs font-bold ${message.type === 'success' ? 'bg-success/10 text-success border border-success/20' : 'bg-error/10 text-error border border-error/20'}`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Yerleşke Seçimi (İş Kodu için Zorunlu) */}
        <div className="p-4 bg-primary/5 rounded-2xl border border-primary/20 space-y-2">
          <label className="block text-xs font-extrabold text-primary flex items-center gap-1.5">
            <BuildingOfficeIcon className="h-4 w-4 text-primary" />
            Yerleşke Seçiniz * (İş Koduna Otomatik İşlenir)
          </label>
          <select
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full border border-base-300 rounded-xl p-3 bg-base-100 font-bold text-xs focus:ring-2 focus:ring-primary/20 shadow-xs"
            required
          >
            {availableLocations.map((loc) => (
              <option key={loc} value={loc}>
                {loc}
              </option>
            ))}
          </select>
          {/* <p className="text-[11px] text-base-content/60 italic">
            Seçilen yerleşke İş Kodunuza (Örn: 20262027-01-YRLŞK(BLGT)) otomatik yansıyacaktır.
          </p> */}
        </div>

        {/* Dynamic Item Cards */}
        <div className="space-y-5">
          {items.map((item, index) => (
            <div
              key={item.id}
              className="p-5 rounded-2xl bg-base-200/40 border border-base-200 space-y-4 relative transition-all hover:border-primary/30"
            >
              {/* Item Card Header */}
              <div className="flex items-center justify-between border-b border-base-200/70 pb-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-primary/10 text-primary font-black text-xs">
                  Malzeme Kalemi #{index + 1}
                </span>

                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(index)}
                    className="btn btn-ghost btn-xs text-error gap-1 hover:bg-error/10 rounded-xl"
                    title="Bu Malzemeyi Kaldır"
                  >
                    <TrashIcon className="h-4 w-4" />
                    <span className="text-[11px] font-bold">Kaldır</span>
                  </button>
                )}
              </div>

              {/* Grid 1: Malzemenin Cinsi & Malzeme Adı */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Malzemenin Cinsi */}
                <div>
                  <label className="block text-xs font-bold text-base-content/80 mb-1">
                    Malzemenin Cinsi *
                  </label>
                  <select
                    value={item.materialType}
                    onChange={(e) => handleItemChange(index, 'materialType', e.target.value)}
                    className="w-full border border-base-300 rounded-xl p-2.5 bg-base-100 text-xs font-bold focus:ring-2 focus:ring-primary/20"
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
                      placeholder="Cinsi buraya yazınız..."
                      value={item.customMaterialType}
                      onChange={(e) => handleItemChange(index, 'customMaterialType', e.target.value)}
                      className="w-full border border-base-300 rounded-xl p-2 mt-2 text-xs font-bold focus:ring-2 focus:ring-primary/20"
                      required
                    />
                  )}
                </div>

                {/* Malzeme Adı / Tanımı */}
                <div>
                  <label className="block text-xs font-bold text-base-content/80 mb-1">
                    Malzeme Adı / Tanımı *
                  </label>
                  <input
                    type="text"
                    required
                    value={item.materialName}
                    onChange={(e) => handleItemChange(index, 'materialName', e.target.value)}
                    placeholder="Örn: A4 Fotokopi Kağıdı, Kalem, Silgi..."
                    className="w-full border border-base-300 rounded-xl p-2.5 text-xs font-bold focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              {/* Grid 2: Miktar & Birim Ölçeği */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-base-content/80 mb-1">
                    Miktar *
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={item.quantity}
                    onChange={(e) => handleItemChange(index, 'quantity', Number(e.target.value))}
                    className="w-full border border-base-300 rounded-xl p-2.5 text-xs font-bold focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-base-content/80 mb-1">
                    Birim Ölçeği *
                  </label>
                  <select
                    value={item.unit}
                    onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                    className="w-full border border-base-300 rounded-xl p-2.5 bg-base-100 text-xs font-bold focus:ring-2 focus:ring-primary/20"
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
                      placeholder="Birimi buraya yazınız..."
                      value={item.customUnit}
                      onChange={(e) => handleItemChange(index, 'customUnit', e.target.value)}
                      className="w-full border border-base-300 rounded-xl p-2 mt-2 text-xs font-bold focus:ring-2 focus:ring-primary/20"
                      required
                    />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Add Another Material Button (+) */}
        <button
          type="button"
          onClick={handleAddItem}
          className="btn btn-outline btn-primary btn-sm w-full gap-2 rounded-2xl font-bold border-dashed border-2 hover:border-solid hover:scale-[1.005] transition-all"
        >
          <PlusIcon className="h-5 w-5" />
          <span>+ Başka Malzeme Ekle</span>
        </button>

        {/* SHARED SECTION: GEREKÇE & ŞARTNAME DOSYA YÜKLEME */}
        <div className="p-5 rounded-2xl bg-base-200/60 border border-base-200 space-y-4">
          <div className="font-extrabold text-xs text-base-content/80 uppercase tracking-wider border-b border-base-200 pb-2 flex items-center gap-1.5">
            <DocumentTextIcon className="h-4 w-4 text-primary" />
            Tüm Talep İçin Genel Bilgiler & Şartname (Opsiyonel)
          </div>

          {/* 1 Adet Gerekçe */}
          <div>
            <label className="block text-xs font-bold text-base-content/80 mb-1 flex items-center gap-1">
              <DocumentTextIcon className="h-4 w-4 text-primary" />
              Talep Gerekçesi / Açıklama (1 Adet - Opsiyonel)
            </label>
            <textarea
              rows={2}
              value={batchDescription}
              onChange={(e) => setBatchDescription(e.target.value)}
              placeholder="Tüm malzeme talebinizin ortak gerekçesini veya amacını buraya yazabilirsiniz..."
              className="w-full border border-base-300 rounded-xl p-2.5 text-xs font-medium focus:ring-2 focus:ring-primary/20 bg-base-100"
            ></textarea>
          </div>

          {/* 1 Adet Şartname Metni */}
          <div>
            <label className="block text-xs font-bold text-base-content/80 mb-1 flex items-center gap-1">
              <ClipboardDocumentListIcon className="h-4 w-4 text-secondary" />
              Teknik Şartname / Özel Detaylar (Metin Olarak - Opsiyonel)
            </label>
            <textarea
              rows={2}
              value={specification}
              onChange={(e) => setSpecification(e.target.value)}
              placeholder="Talep edilen ürünlerin teknik özellikleri veya şartname detaylarını metin olarak buraya yazabilirsiniz..."
              className="w-full border border-base-300 rounded-xl p-2.5 text-xs font-medium focus:ring-2 focus:ring-primary/20 bg-base-100"
            ></textarea>
          </div>

          {/* 1 Adet Şartname DOSYASI YÜKLEME (PDF veya DOCX) */}
          <div className="pt-1">
            <label className="block text-xs font-bold text-base-content/80 mb-1.5 flex items-center gap-1">
              <PaperClipIcon className="h-4 w-4 text-accent" />
              Teknik Şartname Dosyası Yükle (.pdf, .docx, .doc, .rar - Opsiyonel)
            </label>

            {specFileUrl ? (
              <div className="flex items-center justify-between p-3 rounded-xl bg-success/10 border border-success/30 text-xs font-bold text-success">
                <div className="flex items-center gap-2 truncate">
                  <CheckCircleIcon className="h-5 w-5 text-success shrink-0" />
                  <span className="truncate">{specFileName} (Şartname Yüklendi)</span>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveSpecFile}
                  className="btn btn-ghost btn-xs text-error font-bold underline shrink-0"
                >
                  Kaldır
                </button>
              </div>
            ) : (
              <div className="relative border-2 border-dashed border-base-300 hover:border-primary/50 hover:bg-base-100 rounded-xl p-4 text-center transition-all cursor-pointer">
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.rar"
                  onChange={handleSpecFileChange}
                  disabled={uploadingSpec}
                  className="absolute inset-0 opacity-0 cursor-pointer z-10"
                />

                {uploadingSpec ? (
                  <div className="flex items-center justify-center gap-2 text-xs font-bold text-primary">
                    <span className="loading loading-spinner loading-xs"></span>
                    <span>Şartname Dosyası Yükleniyor...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2 text-xs font-bold text-base-content/70">
                    <CloudArrowUpIcon className="h-5 w-5 text-primary" />
                    <span>PDF veya Word Şartname Dosyası Seçin (.pdf, .docx, .rar)</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 2 Aşamalı Onay Bilgilendirme Notu */}
        <div className="p-3.5 bg-primary/10 rounded-2xl text-xs text-primary font-bold border border-primary/20 flex items-center gap-2">
          <span>ℹ️</span>
          <span>
            Oluşturduğunuz {items.length} malzeme talebi <strong>Genel Sekreterlik</strong> onayından geçip <strong>Satın Alma</strong> tarafından işleme alınacaktır.
          </span>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading || uploadingSpec}
          className={`w-full text-primary-content font-bold py-3.5 px-4 rounded-2xl transition duration-300 shadow-lg shadow-primary/20 ${loading || uploadingSpec ? 'bg-base-300 text-base-content/50 cursor-not-allowed' : 'bg-primary hover:brightness-95'
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
      <div className="bg-base-100 shadow-md rounded-3xl p-6 md:p-8 space-y-6 max-w-3xl mx-auto border border-base-200">
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
            <Dialog.Panel className="w-full max-w-3xl max-h-[92vh] overflow-y-auto bg-base-100 shadow-2xl rounded-3xl p-4 sm:p-6 md:p-8 my-4 sm:my-8 border border-base-200">
              {formBody}
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition.Root>
  );
}
