'use client';

import React, { useState, useEffect, Fragment } from 'react';
import axios from 'axios';
import { Dialog, Transition } from '@headlessui/react';
import {
  ShoppingBagIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ShieldCheckIcon,
  BanknotesIcon,
  XMarkIcon,
  ArrowPathIcon,
  MagnifyingGlassIcon,
  FunnelIcon
} from '@heroicons/react/24/outline';
import { IUser } from './MalzemeTalepForm';

export interface IMaterialRequestData {
  _id: string;
  requester: IUser;
  materialType: string;
  materialName: string;
  quantity: number;
  unit: string;
  description?: string;
  status: 'pending_supervisor' | 'pending_mali_isler' | 'approved' | 'rejected';
  supervisorReviewer?: IUser;
  supervisorNote?: string;
  supervisorReviewedAt?: string;
  maliIslerReviewer?: IUser;
  maliIslerNote?: string;
  maliIslerReviewedAt?: string;
  createdAt: string;
}

export default function MalzemeTalepPool({
  currentUser,
  onOpenNewFormModal
}: {
  currentUser: IUser | null;
  onOpenNewFormModal?: () => void;
}) {
  const [requests, setRequests] = useState<IMaterialRequestData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Review Modal State
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewItem, setReviewItem] = useState<IMaterialRequestData | null>(null);
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject'>('approve');
  const [reviewNote, setReviewNote] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/material-requests');
      setRequests(res.data);
    } catch (err) {
      console.error('Fetch material requests error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenReviewModal = (item: IMaterialRequestData, action: 'approve' | 'reject') => {
    setReviewItem(item);
    setReviewAction(action);
    setReviewNote('');
    setIsReviewModalOpen(true);
  };

  const handleSaveReview = async () => {
    if (!reviewItem) return;
    setReviewSubmitting(true);
    try {
      await axios.put(`/api/material-requests/${reviewItem._id}/status`, {
        action: reviewAction,
        note: reviewNote
      });
      alert('Talep durumu başarıyla güncellendi!');
      setIsReviewModalOpen(false);
      fetchRequests();
    } catch (err: any) {
      alert(err.response?.data?.msg || 'Onay kaydetme hatası');
    } finally {
      setReviewSubmitting(false);
    }
  };

  const role = currentUser?.role;
  const isAdmin = role === 'admin';
  const isSupervisor = role === 'supervisor' || role === 'amir' || role === 'kanit_sorumlu';
  const isMaliIsler = role === 'mali_isler';

  // Kişiye veya Malzemeye göre Filtreleme
  const filteredRequests = requests.filter((item) => {
    const term = searchTerm.toLowerCase().trim();

    // 1. Status filtresi
    if (statusFilter !== 'all' && item.status !== statusFilter) {
      return false;
    }

    // 2. Arama filtresi (Kişi adı, e-posta, malzeme adı, cinsi)
    if (!term) return true;

    const requesterName = item.requester?.name?.toLowerCase() || '';
    const requesterEmail = item.requester?.email?.toLowerCase() || '';
    const materialName = item.materialName?.toLowerCase() || '';
    const materialType = item.materialType?.toLowerCase() || '';
    const description = item.description?.toLowerCase() || '';

    return (
      requesterName.includes(term) ||
      requesterEmail.includes(term) ||
      materialName.includes(term) ||
      materialType.includes(term) ||
      description.includes(term)
    );
  });

  return (
    <div className="bg-base-100 p-6 md:p-8 rounded-3xl border border-base-200 shadow-sm space-y-6">
      {/* Header Banner & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-base-200 pb-4">
        <div>
          <h3 className="font-black text-xl text-base-content flex items-center gap-2.5">
            <ShoppingBagIcon className="h-7 w-7 text-primary" />
            Malzeme Talepleri Listesi & Havuz
          </h3>
          <p className="text-xs text-base-content/70 mt-1">
            Gelen malzeme taleplerini kolayca arayın ve 2 kademeli onay sürecini takip edin.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchRequests}
            className="btn btn-ghost btn-sm btn-square rounded-xl"
            title="Yenile"
          >
            <ArrowPathIcon className="h-4 w-4" />
          </button>

          {/* {onOpenNewFormModal && (
            <button
              onClick={onOpenNewFormModal}
              className="btn btn-primary btn-sm gap-2 rounded-xl font-bold shadow-md shadow-primary/20"
            >
              <ShoppingBagIcon className="h-4 w-4" />
              Yeni Malzeme Talebi
            </button>
          )} */}
        </div>
      </div>

      {/* SEARCH BAR & STATUS FILTER BAR */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-base-200/50 p-4 rounded-2xl border border-base-200">
        {/* Search Input */}
        <div className="md:col-span-2 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-base-content/40">
            <MagnifyingGlassIcon className="h-5 w-5" />
          </div>
          <input
            type="text"
            className="input input-bordered input-sm w-full pl-10 rounded-xl font-bold text-xs md:text-sm focus:ring-2 focus:ring-primary/20"
            placeholder="Kişi adı, e-posta, malzeme adı veya cinsine göre arayın..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs text-base-content/50 hover:text-base-content font-bold"
            >
              Temizle
            </button>
          )}
        </div>

        {/* Status Filter */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-base-content/40">
            <FunnelIcon className="h-4 w-4" />
          </div>
          <select
            className="select select-bordered select-sm w-full pl-9 rounded-xl font-bold text-xs"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">Tüm Durumlar ({requests.length})</option>
            <option value="pending_supervisor">1. Aşama Bekleyenler</option>
            <option value="pending_mali_isler">2. Aşama Bekleyenler</option>
            <option value="approved">Tam Onaylananlar</option>
            <option value="rejected">Reddedilenler</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 space-y-2">
          <span className="loading loading-spinner loading-md text-primary"></span>
          <span className="text-xs font-semibold text-base-content/60">Talepler yükleniyor...</span>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="p-16 text-center border-2 border-dashed border-base-300 rounded-2xl space-y-3">
          <ShoppingBagIcon className="h-12 w-12 text-base-content/30 mx-auto" />
          <p className="text-base font-bold text-base-content/70">
            {searchTerm || statusFilter !== 'all'
              ? 'Aramanıza veya filtrenize uygun malzeme talebi bulunamadı.'
              : 'Henüz oluşturulmuş bir malzeme talebi bulunmuyor.'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="table table-zebra w-full text-xs">
            <thead>
              <tr className="border-b border-base-200">
                <th className="font-bold">Talep Eden Kişi</th>
                <th className="font-bold">Malzemenin Cinsi</th>
                <th className="font-bold">Malzeme Adı / Miktar</th>
                <th className="font-bold">Gerekçe</th>
                <th className="font-bold">Onay Durumu</th>
                <th className="font-bold">Değerlendirme Notları</th>
                <th className="font-bold text-right">Aksiyonlar</th>
              </tr>
            </thead>
            <tbody>
              {filteredRequests.map((item) => {
                const canSupervisorApprove =
                  (isAdmin || isSupervisor) && item.status === 'pending_supervisor';
                const isSameUserAsSupervisor = item.supervisorReviewer?._id === currentUser?._id;
                const canMaliIslerApprove =
                  (isAdmin || isMaliIsler) &&
                  item.status === 'pending_mali_isler' &&
                  (!isSameUserAsSupervisor || isAdmin);

                return (
                  <tr key={item._id} className="hover:bg-primary/5 transition-colors">
                    <td>
                      <div className="font-bold text-base-content text-sm">{item.requester?.name || 'Kullanıcı'}</div>
                      <div className="text-[11px] text-base-content/60">{item.requester?.email}</div>
                    </td>

                    <td>
                      <span className="badge badge-ghost badge-sm font-bold">{item.materialType}</span>
                    </td>

                    <td>
                      <div className="font-bold text-sm text-base-content">{item.materialName}</div>
                      <div className="text-xs font-black text-primary">
                        {item.quantity} {item.unit}
                      </div>
                    </td>

                    <td>
                      <p className="max-w-xs line-clamp-2 text-base-content/80">
                        {item.description || 'Açıklama yok'}
                      </p>
                    </td>

                    <td>
                      {item.status === 'pending_supervisor' && (
                        <span className="bg-amber-500/10 text-amber-600 border border-amber-500/20 px-2.5 py-1 rounded-full font-bold text-[11px] inline-flex items-center gap-1 animate-pulse shadow-xs">
                          <ClockIcon className="h-3.5 w-3.5" /> 1. Aşama: Birim / Genel Sekreterlik Bekliyor
                        </span>
                      )}
                      {item.status === 'pending_mali_isler' && (
                        <span className="bg-sky-500/10 text-sky-600 border border-sky-500/20 px-2.5 py-1 rounded-full font-bold text-[11px] inline-flex items-center gap-1 animate-pulse shadow-xs">
                          <BanknotesIcon className="h-3.5 w-3.5" /> 2. Aşama: Satın Alma Bekliyor
                        </span>
                      )}
                      {item.status === 'approved' && (
                        <span className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 px-2.5 py-1 rounded-full font-bold text-[11px] inline-flex items-center gap-1 shadow-xs">
                          <CheckCircleIcon className="h-3.5 w-3.5" /> Tam Onaylandı (Mali İşler)
                        </span>
                      )}
                      {item.status === 'rejected' && (
                        <span className="bg-rose-500/10 text-rose-600 border border-rose-500/20 px-2.5 py-1 rounded-full font-bold text-[11px] inline-flex items-center gap-1 shadow-xs">
                          <XCircleIcon className="h-3.5 w-3.5" /> Reddedildi
                        </span>
                      )}
                    </td>

                    <td>
                      <div className="space-y-1 text-[11px]">
                        {item.supervisorReviewer && (
                          <div className="text-base-content/70">
                            <span className="font-bold">1. Aşama:</span> {item.supervisorReviewer.name}{' '}
                            {item.supervisorNote && `("${item.supervisorNote}")`}
                          </div>
                        )}
                        {item.maliIslerReviewer && (
                          <div className="text-base-content/70">
                            <span className="font-bold">Mali İşler:</span> {item.maliIslerReviewer.name}{' '}
                            {item.maliIslerNote && `("${item.maliIslerNote}")`}
                          </div>
                        )}
                        {!item.supervisorReviewer && !item.maliIslerReviewer && (
                          <span className="text-base-content/40">-</span>
                        )}
                      </div>
                    </td>

                    <td className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {canSupervisorApprove && (
                          <>
                            <button
                              onClick={() => handleOpenReviewModal(item, 'approve')}
                              className="btn btn-primary btn-xs font-bold rounded-lg hover:scale-105 transition-all shadow-xs gap-1"
                              title="1. Aşama Onayla"
                            >
                              <ShieldCheckIcon className="h-3.5 w-3.5" /> 1. Aşama Onayla
                            </button>
                            <button
                              onClick={() => handleOpenReviewModal(item, 'reject')}
                              className="btn btn-error btn-xs text-white font-bold rounded-lg hover:scale-105 transition-all shadow-xs"
                              title="Reddet"
                            >
                              Reddet
                            </button>
                          </>
                        )}

                        {canMaliIslerApprove && (
                          <>
                            <button
                              onClick={() => handleOpenReviewModal(item, 'approve')}
                              className="btn btn-success btn-xs text-white font-bold rounded-lg hover:scale-105 transition-all shadow-xs gap-1"
                              title="2. Aşama Mali İşler Onayla"
                            >
                              <BanknotesIcon className="h-3.5 w-3.5" /> 2. Aşama Onayla
                            </button>
                            <button
                              onClick={() => handleOpenReviewModal(item, 'reject')}
                              className="btn btn-error btn-xs text-white font-bold rounded-lg hover:scale-105 transition-all shadow-xs"
                              title="Reddet"
                            >
                              Reddet
                            </button>
                          </>
                        )}

                        {!canSupervisorApprove && !canMaliIslerApprove && (
                          <span className="text-[11px] text-base-content/40 italic">Yetki Bekleniyor</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* REVIEW ACTION MODAL */}
      <Transition.Root show={isReviewModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setIsReviewModalOpen(false)}>
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
              <Dialog.Panel className="w-full max-w-md bg-base-100 rounded-3xl p-6 shadow-2xl border border-base-200 space-y-4">
                <div className="flex items-center justify-between border-b border-base-200 pb-3">
                  <Dialog.Title className="text-lg font-black text-base-content flex items-center gap-2">
                    <ShoppingBagIcon className="h-5 w-5 text-primary" />
                    Malzeme Talebi Değerlendirme
                  </Dialog.Title>
                  <button
                    onClick={() => setIsReviewModalOpen(false)}
                    className="btn btn-ghost btn-xs btn-square rounded-xl"
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                </div>

                {reviewItem && (
                  <div className="space-y-4">
                    <div className="p-3.5 bg-base-200/70 rounded-2xl text-xs space-y-1 border border-base-200">
                      <div className="font-bold text-base-content">
                        {reviewItem.materialName} ({reviewItem.quantity} {reviewItem.unit})
                      </div>
                      <div className="text-base-content/70">Cinsi: {reviewItem.materialType}</div>
                      <div className="text-base-content/70">Talep Eden: {reviewItem.requester?.name}</div>
                    </div>

                    <div>
                      <label className="label text-xs font-bold">Karar</label>
                      <div className="font-bold text-sm">
                        {reviewAction === 'approve' ? (
                          reviewItem.status === 'pending_supervisor' ? (
                            <span className="text-primary">🟢 1. Aşama Onay Ver (Satın Almaya Aktar)</span>
                          ) : (
                            <span className="text-emerald-600">🟢 2. Aşama Satın Alma Tam Onay Ver</span>
                          )
                        ) : (
                          <span className="text-rose-600">🔴 Talebi Reddet</span>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="label text-xs font-bold">Değerlendirme / Bütçe Notu (Opsiyonel)</label>
                      <textarea
                        className="textarea textarea-bordered textarea-sm w-full rounded-xl"
                        rows={3}
                        placeholder="Değerlendirme notunuzu yazınız..."
                        value={reviewNote}
                        onChange={(e) => setReviewNote(e.target.value)}
                      ></textarea>
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-base-200">
                      <button
                        type="button"
                        onClick={() => setIsReviewModalOpen(false)}
                        className="btn btn-ghost btn-sm rounded-xl font-bold"
                      >
                        İptal
                      </button>
                      <button
                        onClick={handleSaveReview}
                        disabled={reviewSubmitting}
                        className="btn btn-primary btn-sm gap-1 rounded-xl font-bold shadow-md"
                      >
                        {reviewSubmitting ? <span className="loading loading-spinner loading-xs"></span> : 'Onayla ve Kaydet'}
                      </button>
                    </div>
                  </div>
                )}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition.Root>
    </div>
  );
}
