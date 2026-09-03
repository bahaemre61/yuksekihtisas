'use client';

import React, { useState, useEffect, Fragment } from 'react';
import axios from 'axios';
import { Dialog, Transition } from '@headlessui/react';
import {
  ShieldCheckIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ArrowDownTrayIcon,
  DocumentTextIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { IEvidenceSession } from './SessionCard';
import { IEvidence } from './EvidenceTable';

export interface IDocumentRequestData {
  _id: string;
  sessionId: string;
  evidenceId?: IEvidence;
  requester: { name: string; email: string; role: string };
  requestDate: string;
  requestType: 'NEW_DOCUMENT' | 'REVISION' | 'REVOCATION';
  documentName: string;
  documentNo?: string;
  reason?: string;
  feedback?: string;
  status: 'pending' | 'approved' | 'rejected' | 'revision_requested';
  createdAt: string;
}

export default function ReviewPanel({
  sessions,
  selectedSession,
  evidences,
  onSelectSession,
  onRefresh
}: {
  sessions: IEvidenceSession[];
  selectedSession: IEvidenceSession | null;
  evidences: IEvidence[];
  onSelectSession: (s: IEvidenceSession) => void;
  onRefresh: () => void;
}) {
  const [docRequests, setDocRequests] = useState<IDocumentRequestData[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<'requests' | 'evidences'>('requests');

  // Review Modal
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewEvidence, setReviewEvidence] = useState<IEvidence | null>(null);
  const [reviewStatus, setReviewStatus] = useState<'approved' | 'rejected' | 'revision_requested'>('approved');
  const [reviewNote, setReviewNote] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  useEffect(() => {
    if (selectedSession) {
      fetchRequests(selectedSession._id);
    }
  }, [selectedSession]);

  const fetchRequests = async (sessionId: string) => {
    try {
      const res = await axios.get(`/api/evidence/requests?sessionId=${sessionId}`);
      setDocRequests(res.data);
    } catch (err) {
      console.error('Fetch doc requests error:', err);
    }
  };

  const handleOpenReviewModal = (evidence: IEvidence, status: 'approved' | 'rejected' | 'revision_requested') => {
    setReviewEvidence(evidence);
    setReviewStatus(status);
    setReviewNote('');
    setIsReviewModalOpen(true);
  };

  const handleSaveReview = async () => {
    if (!reviewEvidence) return;
    setReviewSubmitting(true);
    try {
      await axios.put(`/api/evidence/${reviewEvidence._id}/status`, {
        status: reviewStatus,
        reporterNote: reviewNote
      });
      alert('Kanıt durumu güncellendi!');
      setIsReviewModalOpen(false);
      onRefresh();
      if (selectedSession) fetchRequests(selectedSession._id);
    } catch (err: any) {
      alert(err.response?.data?.msg || 'Durum güncelleme hatası');
    } finally {
      setReviewSubmitting(false);
    }
  };

  return (
    <div className="bg-base-100 p-6 md:p-8 rounded-3xl border border-base-200 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-base-200 pb-4">
        <div>
          <h3 className="font-black text-xl text-base-content flex items-center gap-2.5">
            <ShieldCheckIcon className="h-7 w-7 text-primary" />
            Raportör & Amir İnceleme Paneli
          </h3>
          <p className="text-xs text-base-content/70 mt-1">
            Gelen dijital talep formlarını ve yüklenen kanıt belgelerini inceleyin, onaylayın veya revizyon isteyin.
          </p>
        </div>

        {sessions.length > 0 && (
          <select
            className="select select-bordered select-sm font-bold rounded-xl text-xs"
            value={selectedSession?._id || ''}
            onChange={(e) => {
              const s = sessions.find((item) => item._id === e.target.value);
              if (s) onSelectSession(s);
            }}
          >
            {sessions.map((s) => (
              <option key={s._id} value={s._id}>
                Oturum: {s.title}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Sub tabs: Dijital Talep Formları vs Doğrudan Kanıtlar */}
      <div className="flex gap-2 bg-base-200/50 p-1.5 rounded-xl border border-base-200 w-fit">
        <button
          onClick={() => setActiveSubTab('requests')}
          className={`btn btn-xs rounded-lg font-bold gap-2 ${
            activeSubTab === 'requests' ? 'btn-primary text-white shadow-xs' : 'btn-ghost text-base-content/70'
          }`}
        >
          <DocumentTextIcon className="h-4 w-4" />
          Dijital Talep Formları ({docRequests.length})
        </button>

        <button
          onClick={() => setActiveSubTab('evidences')}
          className={`btn btn-xs rounded-lg font-bold gap-2 ${
            activeSubTab === 'evidences' ? 'btn-primary text-white shadow-xs' : 'btn-ghost text-base-content/70'
          }`}
        >
          <ShieldCheckIcon className="h-4 w-4" />
          Kanıt Belgeleri ({evidences.length})
        </button>
      </div>

      {/* SUB-TAB 1: DIGITAL REQUEST FORMS */}
      {activeSubTab === 'requests' && (
        <>
          {docRequests.length === 0 ? (
            <div className="p-16 text-center border-2 border-dashed border-base-300 rounded-2xl space-y-3">
              <DocumentTextIcon className="h-12 w-12 text-base-content/30 mx-auto" />
              <p className="text-base font-bold text-base-content/70">Bu oturuma ait henüz dijital talep formu bulunmuyor.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table table-zebra w-full text-xs">
                <thead>
                  <tr className="border-b border-base-200">
                    <th className="font-bold">Talep Eden</th>
                    <th className="font-bold">Talep Türü</th>
                    <th className="font-bold">Doküman Adı & No</th>
                    <th className="font-bold">Gerekçe / Görüş</th>
                    <th className="font-bold">Ek Kanıt Belgesi</th>
                    <th className="font-bold">Tarih</th>
                  </tr>
                </thead>
                <tbody>
                  {docRequests.map((req) => (
                    <tr key={req._id} className="hover:bg-primary/5 transition-colors">
                      <td>
                        <div className="font-bold text-base-content">{req.requester?.name || 'Kullanıcı'}</div>
                        <div className="text-[10px] text-base-content/60">{req.requester?.email}</div>
                      </td>

                      <td>
                        {req.requestType === 'NEW_DOCUMENT' && (
                          <span className="badge badge-primary badge-sm font-bold">Yeni Doküman</span>
                        )}
                        {req.requestType === 'REVISION' && (
                          <span className="badge badge-warning badge-sm font-bold">Revizyon</span>
                        )}
                        {req.requestType === 'REVOCATION' && (
                          <span className="badge badge-error badge-sm font-bold text-white">Yürürlükten Kaldırma</span>
                        )}
                      </td>

                      <td>
                        <div className="font-bold text-sm text-base-content">{req.documentName}</div>
                        {req.documentNo && (
                          <div className="text-[11px] font-bold text-primary">No: {req.documentNo}</div>
                        )}
                      </td>

                      <td>
                        <p className="max-w-xs line-clamp-2 text-base-content/80">
                          {req.reason || 'Gerekçe belirtilmedi.'}
                        </p>
                        {req.feedback && (
                          <span className="text-[10px] italic text-base-content/60 block mt-0.5">
                            Görüş: {req.feedback}
                          </span>
                        )}
                      </td>

                      <td>
                        {req.evidenceId ? (
                          <a
                            href={req.evidenceId.fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="btn btn-ghost btn-xs text-primary gap-1 font-bold rounded-lg hover:bg-primary/10"
                          >
                            <ArrowDownTrayIcon className="h-3.5 w-3.5" /> İndir ({req.evidenceId.fileName})
                          </a>
                        ) : (
                          <span className="text-base-content/40 italic">Ek Belge Yok</span>
                        )}
                      </td>

                      <td className="font-semibold text-base-content/70">
                        {new Date(req.requestDate).toLocaleDateString('tr-TR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* SUB-TAB 2: EVIDENCES REVIEW */}
      {activeSubTab === 'evidences' && (
        <>
          {evidences.length === 0 ? (
            <div className="p-16 text-center border-2 border-dashed border-base-300 rounded-2xl space-y-3">
              <CheckCircleIcon className="h-12 w-12 text-success/40 mx-auto" />
              <p className="text-base font-bold text-base-content/70">İncelenecek kanıt bulunmamaktadır.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table table-zebra w-full text-xs">
                <thead>
                  <tr className="border-b border-base-200">
                    <th className="font-bold">Kanıt Başlığı & Dosya</th>
                    <th className="font-bold">Yükleyen Kullanıcı</th>
                    <th className="font-bold">Açıklama</th>
                    <th className="font-bold">Mevcut Durum</th>
                    <th className="font-bold">Raportör Notu</th>
                    <th className="font-bold text-right">İnceleme Aksiyonları</th>
                  </tr>
                </thead>
                <tbody>
                  {evidences.map((item) => (
                    <tr key={item._id} className="hover:bg-primary/5 transition-colors duration-150">
                      <td>
                        <div className="font-bold text-sm text-base-content">{item.title}</div>
                        <a
                          href={item.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] text-primary font-semibold hover:underline flex items-center gap-1 mt-0.5"
                        >
                          <ArrowDownTrayIcon className="h-3 w-3" /> {item.fileName}
                        </a>
                      </td>

                      <td>
                        <div className="font-bold text-base-content">{item.uploadedBy?.name || 'Kullanıcı'}</div>
                        <div className="text-[10px] text-base-content/60">{item.uploadedBy?.email}</div>
                      </td>

                      <td>
                        <p className="max-w-xs line-clamp-2 text-base-content/80">
                          {item.description || 'Açıklama yok'}
                        </p>
                      </td>

                      <td>
                        {item.status === 'approved' && <span className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 px-2.5 py-1 rounded-full font-bold text-[11px]">Onaylandı</span>}
                        {item.status === 'rejected' && <span className="bg-rose-500/10 text-rose-600 border border-rose-500/20 px-2.5 py-1 rounded-full font-bold text-[11px]">Reddedildi</span>}
                        {item.status === 'revision_requested' && <span className="bg-amber-500/10 text-amber-600 border border-amber-500/20 px-2.5 py-1 rounded-full font-bold text-[11px]">Revizyon</span>}
                        {item.status === 'pending' && <span className="bg-sky-500/10 text-sky-600 border border-sky-500/20 px-2.5 py-1 rounded-full font-bold text-[11px]">Beklemede</span>}
                      </td>

                      <td>
                        {item.reporterNote ? (
                          <span className="text-xs bg-base-200/80 p-2 rounded-xl italic block max-w-xs border border-base-200">
                            {item.reporterNote}
                          </span>
                        ) : (
                          <span className="text-base-content/40">-</span>
                        )}
                      </td>

                      <td className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenReviewModal(item, 'approved')}
                            className="btn btn-success btn-xs text-white font-bold rounded-lg hover:scale-105 transition-all shadow-xs"
                            title="Onayla"
                          >
                            <CheckCircleIcon className="h-3.5 w-3.5" /> Onayla
                          </button>
                          <button
                            onClick={() => handleOpenReviewModal(item, 'revision_requested')}
                            className="btn btn-warning btn-xs font-bold rounded-lg hover:scale-105 transition-all shadow-xs"
                            title="Revizyon İste"
                          >
                            <ExclamationTriangleIcon className="h-3.5 w-3.5" /> Revizyon
                          </button>
                          <button
                            onClick={() => handleOpenReviewModal(item, 'rejected')}
                            className="btn btn-error btn-xs text-white font-bold rounded-lg hover:scale-105 transition-all shadow-xs"
                            title="Reddet"
                          >
                            <XCircleIcon className="h-3.5 w-3.5" /> Reddet
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
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
                    <ShieldCheckIcon className="h-5 w-5 text-primary" />
                    Kanıt Değerlendirme
                  </Dialog.Title>
                  <button
                    onClick={() => setIsReviewModalOpen(false)}
                    className="btn btn-ghost btn-xs btn-square rounded-xl"
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                </div>

                {reviewEvidence && (
                  <div className="space-y-4">
                    <div className="p-3.5 bg-base-200/70 rounded-2xl text-xs space-y-1 border border-base-200">
                      <div className="font-bold text-base-content">{reviewEvidence.title}</div>
                      <div className="text-base-content/70">Yükleyen: {reviewEvidence.uploadedBy?.name}</div>
                    </div>

                    <div>
                      <label className="label text-xs font-bold">Karar</label>
                      <div className="font-bold text-sm">
                        {reviewStatus === 'approved' && <span className="text-emerald-600">🟢 Onayla</span>}
                        {reviewStatus === 'rejected' && <span className="text-rose-600">🔴 Reddet</span>}
                        {reviewStatus === 'revision_requested' && <span className="text-amber-600">🟠 Revizyon İste</span>}
                      </div>
                    </div>

                    <div>
                      <label className="label text-xs font-bold">Raportör Değerlendirme Notu</label>
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
