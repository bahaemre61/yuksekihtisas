'use client';

import React, { useState, Fragment } from 'react';
import axios from 'axios';
import { Dialog, Transition } from '@headlessui/react';
import {
  DocumentTextIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  ArrowDownTrayIcon,
  PencilSquareIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { IUser } from './UserMultiSelect';
import { IEvidenceSession } from './SessionCard';

export interface IEvidence {
  _id: string;
  sessionId: string;
  title: string;
  description?: string;
  fileUrl: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadedBy: IUser;
  status: 'pending' | 'approved' | 'rejected' | 'revision_requested';
  reporterNote?: string;
  reviewedBy?: IUser;
  reviewedAt?: string;
  createdAt: string;
}

export default function EvidenceTable({
  evidences,
  canReview,
  currentUser,
  selectedSession,
  onRefresh
}: {
  evidences: IEvidence[];
  canReview: boolean;
  currentUser: IUser | null;
  selectedSession: IEvidenceSession;
  onRefresh: () => void;
}) {
  const [isEditEvidenceModalOpen, setIsEditEvidenceModalOpen] = useState(false);
  const [editingEvidence, setEditingEvidence] = useState<IEvidence | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editFile, setEditFile] = useState<File | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);

  const handleOpenEditModal = (evidence: IEvidence) => {
    setEditingEvidence(evidence);
    setEditTitle(evidence.title);
    setEditDescription(evidence.description || '');
    setEditFile(null);
    setIsEditEvidenceModalOpen(true);
  };

  const handleSaveEditEvidence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEvidence) return;
    if (!editTitle.trim()) {
      alert('Başlık boş olamaz.');
      return;
    }

    if (editFile) {
      const allowedExtensions = ['.doc', '.docx'];
      const fileName = editFile.name.toLowerCase();
      const isAllowed = allowedExtensions.some((ext) => fileName.endsWith(ext));
      if (!isAllowed) {
        alert('Sadece Word (.doc, .docx) formatında dosyalar yüklenebilir.');
        return;
      }
    }

    setEditSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('title', editTitle);
      formData.append('description', editDescription);
      if (editFile) {
        formData.append('file', editFile);
      }

      await axios.put(`/api/evidence/${editingEvidence._id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      alert('Kanıt belgesi başarıyla revize edildi ve yeniden incelemeye gönderildi!');
      setIsEditEvidenceModalOpen(false);
      onRefresh();
    } catch (err: any) {
      alert(err.response?.data?.msg || 'Düzenleme kaydedilemedi');
    } finally {
      setEditSubmitting(false);
    }
  };

  const visibleEvidences = canReview
    ? evidences
    : evidences.filter((e) => {
        if (!currentUser) return true;
        if (currentUser._id && e.uploadedBy?._id) {
          return e.uploadedBy._id.toString() === currentUser._id.toString();
        }
        if (currentUser.name && e.uploadedBy?.name) {
          return e.uploadedBy.name === currentUser.name;
        }
        return true;
      });

  return (
    <div className="lg:col-span-2 bg-base-100 p-6 rounded-3xl border border-base-200 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-base-200 pb-4">
        <div>
          <h3 className="font-black text-base md:text-lg text-base-content">
            {canReview
              ? `Yüklenen Tüm Kanıtlar (${evidences.length})`
              : `Yüklediğim Kanıtlar (${visibleEvidences.length})`}
          </h3>
          <p className="text-xs text-base-content/60 mt-0.5">Oturum: {selectedSession.title}</p>
        </div>
      </div>

      {visibleEvidences.length === 0 ? (
        <div className="p-12 text-center border-2 border-dashed border-base-300 rounded-2xl space-y-3">
          <DocumentTextIcon className="h-12 w-12 text-base-content/30 mx-auto" />
          <p className="text-sm font-semibold text-base-content/60">
            {canReview ? 'Bu oturuma henüz bir kanıt yüklenmedi.' : 'Bu oturuma henüz bir kanıt yüklemediniz.'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="table table-zebra w-full text-xs">
            <thead>
              <tr className="border-b border-base-200">
                <th className="font-bold">Başlık & Dosya</th>
                {canReview && <th className="font-bold">Yükleyen</th>}
                <th className="font-bold">Tarih</th>
                <th className="font-bold">Durum</th>
                <th className="font-bold">Raportör Notu</th>
                <th className="font-bold text-right">Aksiyonlar</th>
              </tr>
            </thead>
            <tbody>
              {visibleEvidences.map((item) => (
                <tr key={item._id} className="hover:bg-primary/5 transition-colors duration-150">
                  <td>
                    <div className="font-bold text-sm text-base-content">{item.title}</div>
                    <div className="text-[11px] text-base-content/60 flex items-center gap-1 mt-0.5">
                      {item.fileName} ({Math.round(item.fileSize / 1024)} KB)
                    </div>
                  </td>

                  {canReview && (
                    <td>
                      <div className="font-bold text-base-content">{item.uploadedBy?.name || 'Kullanıcı'}</div>
                    </td>
                  )}

                  <td className="font-semibold text-base-content/70">
                    {new Date(item.createdAt).toLocaleDateString('tr-TR')}
                  </td>

                  <td>
                    {item.status === 'approved' && (
                      <span className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 px-2.5 py-1 rounded-full font-bold text-[11px] inline-flex items-center gap-1 shadow-xs">
                        <CheckCircleIcon className="h-3.5 w-3.5" /> Onaylandı
                      </span>
                    )}
                    {item.status === 'rejected' && (
                      <span className="bg-rose-500/10 text-rose-600 border border-rose-500/20 px-2.5 py-1 rounded-full font-bold text-[11px] inline-flex items-center gap-1 shadow-xs">
                        <XCircleIcon className="h-3.5 w-3.5" /> Reddedildi
                      </span>
                    )}
                    {item.status === 'revision_requested' && (
                      <span className="bg-amber-500/10 text-amber-600 border border-amber-500/20 px-2.5 py-1 rounded-full font-bold text-[11px] inline-flex items-center gap-1 animate-pulse shadow-xs">
                        <ExclamationTriangleIcon className="h-3.5 w-3.5" /> Revizyon İsteniyor
                      </span>
                    )}
                    {item.status === 'pending' && (
                      <span className="bg-sky-500/10 text-sky-600 border border-sky-500/20 px-2.5 py-1 rounded-full font-bold text-[11px] inline-flex items-center gap-1 shadow-xs">
                        <ClockIcon className="h-3.5 w-3.5" /> Beklemede
                      </span>
                    )}
                  </td>

                  <td>
                    {item.reporterNote ? (
                      <span className="text-xs bg-base-200/80 p-2 rounded-xl italic block max-w-xs border border-base-200">
                        "{item.reporterNote}"
                      </span>
                    ) : (
                      <span className="text-base-content/40">-</span>
                    )}
                  </td>

                  <td className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <a
                        href={item.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-ghost btn-xs text-primary gap-1 font-bold rounded-lg hover:bg-primary/10 transition-all"
                      >
                        <ArrowDownTrayIcon className="h-3.5 w-3.5" /> İndir
                      </a>

                      {item.status === 'revision_requested' && (
                        <button
                          onClick={() => handleOpenEditModal(item)}
                          className="btn btn-warning btn-xs gap-1 font-bold rounded-lg shadow-xs hover:scale-105 transition-all"
                          title="Revize Et & Düzenle"
                        >
                          <PencilSquareIcon className="h-3.5 w-3.5" /> Düzenle
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* EDIT EVIDENCE MODAL */}
      <Transition.Root show={isEditEvidenceModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setIsEditEvidenceModalOpen(false)}>
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
              <Dialog.Panel className="w-full max-w-lg bg-base-100 rounded-3xl p-6 shadow-2xl border border-base-200 space-y-4">
                <div className="flex items-center justify-between border-b border-base-200 pb-3">
                  <Dialog.Title className="text-lg font-black text-base-content flex items-center gap-2">
                    <PencilSquareIcon className="h-5 w-5 text-amber-500" />
                    Kanıtı Revize Et & Düzenle
                  </Dialog.Title>
                  <button
                    onClick={() => setIsEditEvidenceModalOpen(false)}
                    className="btn btn-ghost btn-xs btn-square rounded-xl"
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                </div>

                {editingEvidence && (
                  <form onSubmit={handleSaveEditEvidence} className="space-y-4">
                    {editingEvidence.reporterNote && (
                      <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-xs space-y-1">
                        <div className="font-bold text-amber-600 flex items-center gap-1.5">
                          <ExclamationTriangleIcon className="h-4 w-4" />
                          Raportörün Revizyon Notu:
                        </div>
                        <p className="text-base-content/80 italic">"{editingEvidence.reporterNote}"</p>
                      </div>
                    )}

                    <div>
                      <label className="label text-xs font-bold">Kanıt Başlığı *</label>
                      <input
                        type="text"
                        className="input input-bordered input-sm w-full rounded-xl"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        required
                      />
                    </div>

                    <div>
                      <label className="label text-xs font-bold">Açıklama / Detay</label>
                      <textarea
                        className="textarea textarea-bordered textarea-sm w-full rounded-xl"
                        rows={2}
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                      ></textarea>
                    </div>

                    <div>
                      <label className="label text-xs font-bold">Yeni Dosya Yükle (Sadece Word .doc, .docx - İsteğe Bağlı)</label>
                      <input
                        type="file"
                        accept=".doc,.docx"
                        className="file-input file-input-bordered file-input-warning file-input-sm w-full rounded-xl"
                        onChange={(e) => setEditFile(e.target.files?.[0] || null)}
                      />
                      <span className="text-[10px] text-base-content/50 italic mt-1 block">
                        Mevcut dosya: {editingEvidence.fileName}. Yeni dosya seçmezseniz mevcut dosya korunur.
                      </span>
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-base-200">
                      <button
                        type="button"
                        onClick={() => setIsEditEvidenceModalOpen(false)}
                        className="btn btn-ghost btn-sm rounded-xl font-bold"
                      >
                        İptal
                      </button>
                      <button
                        type="submit"
                        disabled={editSubmitting}
                        className="btn btn-warning btn-sm gap-1 rounded-xl font-bold shadow-md"
                      >
                        {editSubmitting ? (
                          <span className="loading loading-spinner loading-xs"></span>
                        ) : (
                          'Yeniden İncelemeye Gönder'
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition.Root>
    </div>
  );
}
