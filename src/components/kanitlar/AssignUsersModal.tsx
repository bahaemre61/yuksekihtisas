'use client';

import React, { useState, useEffect, Fragment } from 'react';
import axios from 'axios';
import { Dialog, Transition } from '@headlessui/react';
import { UserPlusIcon, XMarkIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import UserMultiSelect, { IUser } from './UserMultiSelect';
import { IEvidenceSession } from './SessionCard';

export default function AssignUsersModal({
  isOpen,
  onClose,
  session,
  allUsers,
  onSuccess
}: {
  isOpen: boolean;
  onClose: () => void;
  session: IEvidenceSession | null;
  allUsers: IUser[];
  onSuccess: () => void;
}) {
  const [assignReporters, setAssignReporters] = useState<string[]>([]);
  const [assignDataUsers, setAssignDataUsers] = useState<string[]>([]);

  useEffect(() => {
    if (session) {
      setAssignReporters(session.reporters.map((u) => u._id));
      setAssignDataUsers(session.dataEntryUsers.map((u) => u._id));
    }
  }, [session]);

  const handleSaveAssignments = async () => {
    if (!session) return;
    try {
      await axios.put(`/api/evidence/sessions/${session._id}/assign`, {
        reporters: assignReporters,
        dataEntryUsers: assignDataUsers
      });
      alert('Oturum üyeleri güncellendi!');
      onSuccess();
      onClose();
    } catch (err: any) {
      alert(err.response?.data?.msg || 'Atama güncellenemedi');
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
                <div>
                  <Dialog.Title className="text-xl font-black text-base-content flex items-center gap-2.5">
                    <UserPlusIcon className="h-6 w-6 text-primary" />
                    Oturum Üye Atamaları
                  </Dialog.Title>
                  <p className="text-xs text-base-content/70 mt-1">
                    Seçili Oturum: <span className="font-bold text-primary">{session?.title}</span>
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="btn btn-ghost btn-xs btn-square rounded-xl"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <UserMultiSelect
                    label="Raportörler (Gelen Verileri İnceleyenler)"
                    users={allUsers}
                    selectedIds={assignReporters}
                    onChange={setAssignReporters}
                  />

                  <UserMultiSelect
                    label="Veri Girebilecek Kullanıcılar"
                    users={allUsers}
                    selectedIds={assignDataUsers}
                    onChange={setAssignDataUsers}
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
                  <button onClick={handleSaveAssignments} className="btn btn-primary btn-sm gap-2 shadow-lg shadow-primary/20 rounded-xl font-bold">
                    <CheckCircleIcon className="h-4 w-4" />
                    Atamaları Kaydet
                  </button>
                </div>
              </div>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition.Root>
  );
}
