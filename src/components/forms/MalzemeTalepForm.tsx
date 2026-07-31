'use client';

import React, { useState, Fragment } from 'react';
import axios from 'axios';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, ShoppingBagIcon } from '@heroicons/react/24/outline';

export interface IUser {
  _id: string;
  name: string;
  email: string;
  role: string;
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
  const [materialType, setMaterialType] = useState('Kırtasiye');
  const [customMaterialType, setCustomMaterialType] = useState('');
  const [materialName, setMaterialName] = useState('');
  const [quantity, setQuantity] = useState<number>(1);
  const [unit, setUnit] = useState('Adet');
  const [customUnit, setCustomUnit] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    const finalType = materialType === 'Diğer' ? customMaterialType.trim() : materialType;
    const finalUnit = unit === 'Diğer' ? customUnit.trim() : unit;

    if (!finalType) {
      setMessage({ type: 'error', text: 'Lütfen malzemenin cinsini belirtiniz.' });
      return;
    }
    if (!materialName.trim()) {
      setMessage({ type: 'error', text: 'Lütfen malzeme adını yazınız.' });
      return;
    }
    if (quantity <= 0) {
      setMessage({ type: 'error', text: 'Lütfen geçerli bir miktar giriniz.' });
      return;
    }
    if (!finalUnit) {
      setMessage({ type: 'error', text: 'Lütfen birim ölçeğini giriniz.' });
      return;
    }

    setLoading(true);
    try {
      await axios.post('/api/material-requests', {
        materialType: finalType,
        materialName: materialName.trim(),
        quantity,
        unit: finalUnit,
        description: description ? description.trim() : ''
      });

      setMessage({ type: 'success', text: 'Malzeme talebiniz başarıyla oluşturuldu ve Onay Havuzuna gönderildi!' });

      // Formu sıfırla
      setMaterialName('');
      setQuantity(1);
      setDescription('');

      setTimeout(() => {
        if (onSuccess) onSuccess();
        if (onClose) onClose();
      }, 1500);

    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.msg || 'Malzeme talebi oluşturulurken bir hata meydana geldi.' });
    } finally {
      setLoading(false);
    }
  };

  const formBody = (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b pb-2">
        <h2 className="text-xl font-bold text-base-content flex items-center gap-2">
          <ShoppingBagIcon className="h-6 w-6 text-primary" />
          Malzeme Talep Formu
        </h2>
        {isModal && onClose && (
          <button
            type="button"
            onClick={onClose}
            className="text-base-content/50 hover:text-base-content transition-colors"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        )}
      </div>

      {message && (
        <div className={`p-4 rounded-md ${message.type === 'success' ? 'bg-success/20 text-success font-medium' : 'bg-error/20 text-error font-medium'}`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Malzemenin Cinsi */}
        <div>
          <label className="block text-sm font-medium text-base-content/80 mb-1">Malzemenin Cinsi</label>
          <select
            value={materialType}
            onChange={(e) => setMaterialType(e.target.value)}
            className="w-full border border-base-300 rounded-md p-2 bg-base-100 focus:ring-primary focus:border-primary"
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
          {materialType === 'Diğer' && (
            <input
              type="text"
              placeholder="Cinsi buraya yazınız..."
              value={customMaterialType}
              onChange={(e) => setCustomMaterialType(e.target.value)}
              className="w-full border border-base-300 rounded-md p-2 mt-2 focus:ring-primary focus:border-primary text-sm"
              required
            />
          )}
        </div>

        {/* Malzeme Adı / Tanımı */}
        <div>
          <label className="block text-sm font-medium text-base-content/80 mb-1">Malzeme Adı / Tanımı</label>
          <input
            type="text"
            required
            value={materialName}
            onChange={(e) => setMaterialName(e.target.value)}
            placeholder="Örn: A4 Fotokopi Kağıdı"
            className="w-full border border-base-300 rounded-md p-2 focus:ring-primary focus:border-primary"
          />
        </div>

        {/* Miktar & Birim Ölçeği */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-base-content/80 mb-1">Miktar</label>
            <input
              type="number"
              min={1}
              required
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              className="w-full border border-base-300 rounded-md p-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-base-content/80 mb-1">Birim Ölçeği</label>
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="w-full border border-base-300 rounded-md p-2 bg-base-100 focus:ring-primary focus:border-primary"
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
            {unit === 'Diğer' && (
              <input
                type="text"
                placeholder="Birimi buraya yazınız..."
                value={customUnit}
                onChange={(e) => setCustomUnit(e.target.value)}
                className="w-full border border-base-300 rounded-md p-2 mt-2 focus:ring-primary focus:border-primary text-sm"
                required
              />
            )}
          </div>
        </div>

        {/* Açıklama / Gerekçe */}
        <div>
          <label className="block text-sm font-medium text-base-content/80 mb-1">Talep Gerekçesi / Açıklama</label>
          <textarea
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Malzeme ihtiyacınızın nedenini detaylı bir şekilde anlatınız..."
            className="w-full border border-base-300 rounded-md p-2 focus:ring-primary focus:border-primary"
          ></textarea>
        </div>

        {/* 2 Aşamalı Onay Bilgilendirme Notu */}
        <div className="p-3 bg-primary/10 rounded-md text-xs text-primary font-medium">
          ℹ️ Malzeme talebiniz <strong>Genel Sekreterlik</strong> onayından geçip <strong>Satın Alma</strong> tarafından incelenip arşivlencektir.
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className={`w-full text-primary-content font-bold py-3 px-4 rounded-md transition duration-300 ${loading ? 'bg-base-300 text-base-content/50 cursor-not-allowed' : 'bg-primary hover:brightness-90'
            }`}
        >
          {loading ? 'Gönderiliyor...' : 'Malzeme Talebi Oluştur'}
        </button>
      </form>
    </div>
  );

  if (!isModal) {
    return (
      <div className="bg-base-100 shadow-md rounded-lg p-6 space-y-6 max-w-3xl mx-auto">
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
            <Dialog.Panel className="w-full max-w-3xl bg-base-100 shadow-md rounded-lg p-6 my-8 border border-base-200">
              {formBody}
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition.Root>
  );
}
