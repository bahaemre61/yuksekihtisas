'use client';

import React, { useState, Fragment } from 'react';
import axios from 'axios';
import { Dialog, Transition } from '@headlessui/react';
import { FolderPlusIcon, XMarkIcon } from '@heroicons/react/24/outline';
import UserMultiSelect, { IUser } from './UserMultiSelect';

export default function NewSessionModal({
  isOpen,
  onClose,
  allUsers,
  onSuccess
}: {
  isOpen: boolean;
  onClose: () => void;
  allUsers: IUser[];
  onSuccess: () => void;
}) {
  const [sessionTitle, setSessionTitle] = useState('');
  const [sessionDescription, setSessionDescription] = useState('');
  const [selectedReporters, setSelectedReporters] = useState<string[]>([]);
  const [selectedDataUsers, setSelectedDataUsers] = useState<string[]>([]);

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionTitle.trim()) return;

    try {
      await axios.post('/api/evidence/sessions', {
        title: sessionTitle,
        description: sessionDescription,
        reporters: selectedReporters,
        dataEntryUsers: selectedDataUsers
      });
      alert('Oturum başarıyla oluşturuldu!');
      onSuccess();
      onClose();
      setSessionTitle('');
      setSessionDescription('');
      setSelectedReporters([]);
      setSelectedDataUsers([]);
    } catch (err: any) {
      alert(err.response?.data?.msg || 'Oturum oluşturulurken hata oluştu');
    }
  };

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
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
            <Dialog.Panel className="w-full max-w-4xl bg-base-100 rounded-3xl p-8 shadow-2xl border border-base-200 space-y-6 my-8">
              <div className="flex items-center justify-between border-b border-base-200 pb-4">
                <Dialog.Title className="text-xl font-black text-base-content flex items-center gap-2.5">
                  <FolderPlusIcon className="h-6 w-6 text-primary" />
                  Yeni Veri Girme Oturumu Başlat
                </Dialog.Title>
                <button
                  onClick={onClose}
                  className="btn btn-ghost btn-xs btn-square rounded-xl"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleCreateSession} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="label text-xs font-bold">Oturum Başlığı (Örn: Kalite Verileri 2026) *</label>
                    <input
                      type="text"
                      className="input input-bordered input-sm w-full rounded-xl"
                      placeholder="Oturum adını yazınız..."
                      value={sessionTitle}
                      onChange={(e) => setSessionTitle(e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <label className="label text-xs font-bold">Oturum Açıklaması</label>
                    <input
                      type="text"
                      className="input input-bordered input-sm w-full rounded-xl"
                      placeholder="Bu oturumda toplanacak veriler ve kanıtlar..."
                      value={sessionDescription}
                      onChange={(e) => setSessionDescription(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                  <UserMultiSelect
                    label="Oturuma Atanacak Raportörler (Gelen Verileri İnceleyenler)"
                    users={allUsers}
                    selectedIds={selectedReporters}
                    onChange={setSelectedReporters}
                  />

                  <UserMultiSelect
                    label="Veri Girebilecek Kullanıcılar"
                    users={allUsers}
                    selectedIds={selectedDataUsers}
                    onChange={setSelectedDataUsers}
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-base-200">
                  <button
                    type="button"
                    onClick={onClose}
                    className="btn btn-ghost btn-sm rounded-xl font-bold"
                  >
                    İptal
                  </button>
                  <button type="submit" className="btn btn-primary btn-sm gap-2 shadow-lg shadow-primary/20 rounded-xl font-bold">
                    <FolderPlusIcon className="h-4 w-4" />
                    Oturumu Oluştur
                  </button>
                </div>
              </form>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition.Root>
  );
}
