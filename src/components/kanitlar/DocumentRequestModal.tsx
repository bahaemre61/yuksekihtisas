'use client';

import React, { useState, Fragment } from 'react';
import axios from 'axios';
import { Dialog, Transition } from '@headlessui/react';
import {
  DocumentTextIcon,
  XMarkIcon,
  CloudArrowUpIcon,
  CheckIcon,
  UserIcon,
  CalendarIcon,
  DocumentDuplicateIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

export interface IUser {
  _id: string;
  name: string;
  email: string;
  role: string;
}

export default function DocumentRequestModal({
  isOpen,
  onClose,
  sessionId,
  currentUser,
  onSuccess
}: {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
  currentUser: IUser | null;
  onSuccess: (data: { documentName: string; requestType: 'NEW_DOCUMENT' | 'REVISION' | 'REVOCATION'; documentNo?: string }) => void;
}) {
  const [requestType, setRequestType] = useState<'NEW_DOCUMENT' | 'REVISION' | 'REVOCATION'>('NEW_DOCUMENT');
  const [documentName, setDocumentName] = useState('');
  const [documentNo, setDocumentNo] = useState('');
  const [reason, setReason] = useState('');
  const [feedback, setFeedback] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const todayStr = new Date().toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!documentName.trim()) {
      alert('Lütfen Doküman Adı giriniz.');
      return;
    }

    if (['REVISION', 'REVOCATION'].includes(requestType) && !documentNo.trim()) {
      alert('Revizyon ve Yürürlükten Kaldırma talepleri için Doküman No zorunludur.');
      return;
    }

    setSubmitting(true);
    try {
      let uploadedEvidenceId: string | undefined = undefined;

      // 1. Eğer Word dosyası seçildiyse yükle
      if (uploadFile) {
        const allowed = ['.doc', '.docx'];
        if (!allowed.some((ext) => uploadFile.name.toLowerCase().endsWith(ext))) {
          alert('Sadece Word (.doc, .docx) formatında dosyalar yüklenebilir.');
          setSubmitting(false);
          return;
        }

        const formData = new FormData();
        formData.append('sessionId', sessionId);
        formData.append(
          'title',
          `${documentName} (${requestType === 'NEW_DOCUMENT' ? 'Yeni Doküman' : requestType === 'REVISION' ? 'Revizyon' : 'Yürürlükten Kaldırma'})`
        );
        formData.append('description', reason || 'Doküman Talep Formu ile yüklendi.');
        formData.append('file', uploadFile);

        const uploadRes = await axios.post('/api/evidence/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        uploadedEvidenceId = uploadRes.data._id;
      }

      // 2. Dijital Doküman Talep Formunu kaydet
      const reqRes = await axios.post('/api/evidence/requests', {
        sessionId,
        requestType,
        documentName: documentName.trim(),
        documentNo: documentNo ? documentNo.trim() : '',
        reason: reason ? reason.trim() : '',
        feedback: feedback ? feedback.trim() : '',
        evidenceId: uploadedEvidenceId
      });

      alert('1. Adım Tamamlandı! Dijital Doküman Talep Formunuz başarıyla kaydedildi.\n\nŞimdi 2. Adımdan şablon indirebilir ve 3. Adımdan doldurduğunuz Word belgesini yükleyebilirsiniz.');
      onSuccess({
        documentName: documentName.trim(),
        requestType,
        documentNo: documentNo ? documentNo.trim() : undefined
      });
      onClose();
      // Formu sıfırla
      setDocumentName('');
      setDocumentNo('');
      setReason('');
      setFeedback('');
      setUploadFile(null);
    } catch (err: any) {
      alert(err.response?.data?.msg || 'Talep oluşturulurken bir hata meydana geldi.');
    } finally {
      setSubmitting(false);
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
            <Dialog.Panel className="w-full max-w-3xl bg-base-100 rounded-3xl p-6 md:p-8 shadow-2xl border border-base-200 space-y-6 my-8">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-base-200 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-primary/10 text-primary">
                    <DocumentTextIcon className="h-6 w-6" />
                  </div>
                  <div>
                    <Dialog.Title className="text-xl font-black text-base-content">
                      Doküman Hazırlama & Yürürlükten Kaldırma Talep Formu
                    </Dialog.Title>
                    <p className="text-xs text-base-content/60 mt-0.5">
                      Lütfen dijital talep formunu doldurup kanıt belgenizi ekleyiniz.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="btn btn-ghost btn-xs btn-square rounded-xl"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* 1. Talepte Bulunan Kişi & Tarih (Otomatik) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-base-200/50 p-4 rounded-2xl border border-base-200/80">
                  <div className="flex items-center gap-3">
                    <UserIcon className="h-5 w-5 text-primary shrink-0" />
                    <div>
                      <div className="text-[11px] font-bold text-base-content/60">Talepte Bulunan Kişi:</div>
                      <div className="text-sm font-black text-base-content">{currentUser?.name || 'Giriş Yapmış Kullanıcı'}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <CalendarIcon className="h-5 w-5 text-primary shrink-0" />
                    <div>
                      <div className="text-[11px] font-bold text-base-content/60">Talep Tarihi:</div>
                      <div className="text-sm font-black text-base-content">{todayStr}</div>
                    </div>
                  </div>
                </div>

                {/* 2. Talep Türü Seçimi */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-base-content/80">2. Talep Türü *</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => setRequestType('NEW_DOCUMENT')}
                      className={`p-3.5 rounded-2xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${requestType === 'NEW_DOCUMENT'
                          ? 'bg-primary text-primary-content border-primary shadow-lg shadow-primary/20 scale-[1.02]'
                          : 'bg-base-100 border-base-200 text-base-content/70 hover:bg-base-200'
                        }`}
                    >
                      <DocumentTextIcon className="h-4 w-4" />
                      Yeni Doküman Hazırlama
                    </button>

                    <button
                      type="button"
                      onClick={() => setRequestType('REVISION')}
                      className={`p-3.5 rounded-2xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${requestType === 'REVISION'
                          ? 'bg-amber-500 text-white border-amber-500 shadow-lg shadow-amber-500/20 scale-[1.02]'
                          : 'bg-base-100 border-base-200 text-base-content/70 hover:bg-base-200'
                        }`}
                    >
                      <DocumentDuplicateIcon className="h-4 w-4" />
                      Revizyon
                    </button>

                    <button
                      type="button"
                      onClick={() => setRequestType('REVOCATION')}
                      className={`p-3.5 rounded-2xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${requestType === 'REVOCATION'
                          ? 'bg-rose-500 text-white border-rose-500 shadow-lg shadow-rose-500/20 scale-[1.02]'
                          : 'bg-base-100 border-base-200 text-base-content/70 hover:bg-base-200'
                        }`}
                    >
                      <ExclamationTriangleIcon className="h-4 w-4" />
                      Yürürlükten Kaldırma
                    </button>
                  </div>
                </div>

                {/* 3. Dinamik Doküman Bilgileri */}
                <div className="p-4 bg-base-200/40 rounded-2xl border border-base-200 space-y-4">
                  <div className="text-xs font-black text-primary uppercase tracking-wider">
                    {requestType === 'NEW_DOCUMENT' && '3.1. Talep Edilen Doküman Bilgileri'}
                    {requestType === 'REVISION' && '3.2. Revize Edilen Doküman Bilgileri'}
                    {requestType === 'REVOCATION' && '3.3. Yürürlükten Kaldırılacak Doküman Bilgileri'}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="label text-xs font-bold text-base-content/80">Doküman Adı *</label>
                      <input
                        type="text"
                        className="input input-bordered input-sm w-full rounded-xl"
                        placeholder="Doküman adını yazınız..."
                        value={documentName}
                        onChange={(e) => setDocumentName(e.target.value)}
                        required
                      />
                    </div>

                    {['REVISION', 'REVOCATION'].includes(requestType) && (
                      <div>
                        <label className="label text-xs font-bold text-base-content/80">Doküman No *</label>
                        <input
                          type="text"
                          className="input input-bordered input-sm w-full rounded-xl"
                          placeholder="Örn: PR-001 veya FR-042"
                          value={documentNo}
                          onChange={(e) => setDocumentNo(e.target.value)}
                          required
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* 4. Talep Gerekçesi ve Açıklama */}
                <div>
                  <label className="label text-xs font-bold text-base-content/80">4. Talep Gerekçesi ve Açıklama (Opsiyonel)</label>
                  <textarea
                    className="textarea textarea-bordered textarea-sm w-full rounded-xl"
                    rows={2}
                    placeholder="Talep gerekçesini ve detayları açıklayabilirsiniz..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  ></textarea>
                </div>

                {/* 5. İlgili Kişi veya Kişilerin Görüşü */}
                <div>
                  <label className="label text-xs font-bold text-base-content/80">5. İlgili Kişi veya Kişilerin Görüşü (Opsiyonel)</label>
                  <textarea
                    className="textarea textarea-bordered textarea-sm w-full rounded-xl"
                    rows={2}
                    placeholder="Varsa ilgili kişi veya kurulların görüş ve notları..."
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                  ></textarea>
                </div>

                {/* 6. Ek Kanıt Belgesi Yükleme Alanı */}
                {/* <div>
                  <label className="label text-xs font-bold text-base-content/80">6. Kanıt Belgesi Seç (Sadece Word .doc, .docx) *</label>
                  
                  <div
                    onDragOver={(e) => { e.preventDefault(); setIsDraggingOver(true); }}
                    onDragLeave={(e) => { e.preventDefault(); setIsDraggingOver(false); }}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDraggingOver(false);
                      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                        const file = e.dataTransfer.files[0];
                        const allowed = ['.doc', '.docx'];
                        if (allowed.some((ext) => file.name.toLowerCase().endsWith(ext))) {
                          setUploadFile(file);
                        } else {
                          alert('Sadece Word (.doc, .docx) formatında dosyalar yüklenebilir.');
                        }
                      }
                    }}
                    className={`relative border-2 border-dashed rounded-2xl p-4 text-center transition-all duration-300 cursor-pointer overflow-hidden ${
                      isDraggingOver
                        ? 'border-primary bg-primary/10 scale-[1.01]'
                        : uploadFile
                        ? 'border-success/60 bg-success/5'
                        : 'border-base-300 hover:border-primary/50 hover:bg-base-200/50'
                    }`}
                  >
                    <input
                      type="file"
                      accept=".doc,.docx"
                      className="absolute inset-0 opacity-0 cursor-pointer z-10"
                      onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                      required
                    />

                    {uploadFile ? (
                      <div className="flex items-center justify-between px-3 py-1">
                        <div className="flex items-center gap-2 text-xs font-bold text-success">
                          <CheckIcon className="h-5 w-5" />
                          <span>{uploadFile.name} ({Math.round(uploadFile.size / 1024)} KB)</span>
                        </div>
                        <span className="text-xs text-error font-bold underline cursor-pointer z-20" onClick={(e) => { e.stopPropagation(); setUploadFile(null); }}>
                          Kaldır
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-2 text-xs font-bold text-base-content/70 py-1">
                        <CloudArrowUpIcon className="h-5 w-5 text-primary" />
                        <span>Kanıt dosyası yüklemek için tıklayın veya sürükleyin</span>
                      </div>
                    )}
                  </div>
                </div> */}

                {/* Submit Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t border-base-200">
                  <button
                    type="button"
                    onClick={onClose}
                    className="btn btn-ghost btn-sm rounded-xl font-bold"
                  >
                    İptal
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="btn btn-primary btn-sm gap-2 shadow-lg shadow-primary/20 rounded-xl font-bold"
                  >
                    {submitting ? (
                      <span className="loading loading-spinner loading-xs"></span>
                    ) : (
                      <>
                        <DocumentTextIcon className="h-4 w-4" />
                        Talep Formunu & Kanıtı Gönder
                      </>
                    )}
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
