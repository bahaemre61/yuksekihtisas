'use client';

import React, { useState } from 'react';
import axios from 'axios';
import {
  DocumentTextIcon,
  CloudArrowUpIcon,
  DocumentArrowUpIcon,
  ArrowDownTrayIcon,
  CheckIcon,
  SparklesIcon,
  LockClosedIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  ClipboardDocumentCheckIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

export interface ICompletedFormInfo {
  requestId?: string;
  documentName: string;
  requestType: 'NEW_DOCUMENT' | 'REVISION' | 'REVOCATION';
  documentNo?: string;
}

export default function EvidenceUploadSection({
  sessionId,
  onUploadSuccess,
  onOpenDocumentRequestModal,
  completedForm,
  onResetFormStep
}: {
  sessionId: string;
  onUploadSuccess: () => void;
  onOpenDocumentRequestModal: () => void;
  completedForm: ICompletedFormInfo | null;
  onResetFormStep: () => void;
}) {
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [dynamicTemplates, setDynamicTemplates] = useState<{ id: string; title: string; filename: string; downloadUrl: string }[]>([]);

  const isStep1Done = !!completedForm;

  React.useEffect(() => {
    axios.get('/api/evidence/templates')
      .then((res) => {
        if (res.data?.templates) {
          setDynamicTemplates(res.data.templates);
        }
      })
      .catch(() => {});
  }, []);

  // Form tamamlandığında başlığı otomatik doldur
  React.useEffect(() => {
    if (completedForm) {
      const typeLabel =
        completedForm.requestType === 'NEW_DOCUMENT'
          ? 'Yeni Doküman'
          : completedForm.requestType === 'REVISION'
          ? 'Revizyon'
          : 'Yürürlükten Kaldırma';
      setUploadTitle(`${completedForm.documentName} (${typeLabel})`);
    }
  }, [completedForm]);

  const handleUploadEvidence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionId) {
      alert('Lütfen önce bir oturum seçiniz.');
      return;
    }
    if (!isStep1Done) {
      alert('Lütfen önce 1. Adımdaki Dijital Doküman Talep Formunu doldurunuz.');
      return;
    }
    if (!uploadTitle.trim() || !uploadFile) {
      alert('Lütfen belge başlığını ve doldurduğunuz Word dosyasını seçiniz.');
      return;
    }

    const allowedExtensions = ['.doc', '.docx'];
    const fileName = uploadFile.name.toLowerCase();
    const isAllowed = allowedExtensions.some((ext) => fileName.endsWith(ext));
    if (!isAllowed) {
      alert('Sadece Word (.doc, .docx) formatında dosyalar yüklenebilir.');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('sessionId', sessionId);
      formData.append('title', uploadTitle);
      formData.append('description', uploadDescription);
      formData.append('file', uploadFile);

      await axios.post('/api/evidence/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      alert('Kanıt belgesi başarıyla yüklendi ve Raportör incelemesine gönderildi!');
      setUploadTitle('');
      setUploadDescription('');
      setUploadFile(null);
      onResetFormStep(); // Adımı sıfırla
      onUploadSuccess();
    } catch (err: any) {
      alert(err.response?.data?.msg || 'Kanıt yükleme hatası');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-base-100 p-6 md:p-8 rounded-3xl border border-base-200 shadow-sm space-y-8">
      {/* Visual Stepper Header */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-base-200 pb-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-extrabold uppercase tracking-wider border border-primary/20 mb-1">
              <SparklesIcon className="h-4 w-4 animate-spin-slow" />
              Sıralı Adımlı İş Akışı
            </div>
            <h3 className="font-black text-xl text-base-content">
              Doküman Talep Formu & Kanıt Yükleme Süreci
            </h3>
            <p className="text-xs text-base-content/70 mt-0.5">
              Lütfen adımları sırasıyla takip ediniz. Adım 1 doldurulduktan sonra Adım 2 ve Adım 3 otomatik aktifleşecektir.
            </p>
          </div>

          {isStep1Done && (
            <button
              type="button"
              onClick={onResetFormStep}
              className="btn btn-ghost btn-xs text-base-content/60 gap-1 rounded-xl hover:text-error"
              title="Yeni bir form doldurmak için sıfırla"
            >
              <ArrowPathIcon className="h-3.5 w-3.5" /> Adımları Yeniden Başlat
            </button>
          )}
        </div>

        {/* Step Progress Indicators */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Step 1 Indicator */}
          <div
            className={`p-4 rounded-2xl border transition-all flex items-center gap-3 ${
              isStep1Done
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600'
                : 'bg-primary/10 border-primary/30 text-primary animate-pulse'
            }`}
          >
            <div
              className={`p-2.5 rounded-xl font-black text-sm ${
                isStep1Done ? 'bg-emerald-500 text-white' : 'bg-primary text-primary-content'
              }`}
            >
              {isStep1Done ? <CheckIcon className="h-5 w-5" /> : '1'}
            </div>
            <div>
              <div className="font-black text-xs uppercase tracking-wider">1. Adım</div>
              <div className="font-bold text-sm">Dijital Talep Formu</div>
              <div className="text-[11px] opacity-80 font-medium">
                {isStep1Done ? '🟢 Form Tamamlandı' : '🔵 Doldurulması Zorunlu'}
              </div>
            </div>
          </div>

          {/* Step 2 Indicator */}
          <div
            className={`p-4 rounded-2xl border transition-all flex items-center gap-3 ${
              isStep1Done
                ? 'bg-secondary/10 border-secondary/30 text-secondary'
                : 'bg-base-200/50 border-base-200 text-base-content/40 opacity-60'
            }`}
          >
            <div
              className={`p-2.5 rounded-xl font-black text-sm ${
                isStep1Done ? 'bg-secondary text-secondary-content' : 'bg-base-300 text-base-content/50'
              }`}
            >
              {isStep1Done ? '2' : <LockClosedIcon className="h-5 w-5" />}
            </div>
            <div>
              <div className="font-black text-xs uppercase tracking-wider">2. Adım</div>
              <div className="font-bold text-sm">Örnek Şablon İndir</div>
              <div className="text-[11px] opacity-80 font-medium">
                {isStep1Done ? '🟢 İndirmeye Hazır' : '🔒 Adım 1 Bekleniyor'}
              </div>
            </div>
          </div>

          {/* Step 3 Indicator */}
          <div
            className={`p-4 rounded-2xl border transition-all flex items-center gap-3 ${
              isStep1Done
                ? 'bg-accent/10 border-accent/30 text-accent'
                : 'bg-base-200/50 border-base-200 text-base-content/40 opacity-60'
            }`}
          >
            <div
              className={`p-2.5 rounded-xl font-black text-sm ${
                isStep1Done ? 'bg-accent text-accent-content' : 'bg-base-300 text-base-content/50'
              }`}
            >
              {isStep1Done ? '3' : <LockClosedIcon className="h-5 w-5" />}
            </div>
            <div>
              <div className="font-black text-xs uppercase tracking-wider">3. Adım</div>
              <div className="font-bold text-sm">Word Kanıtı Yükle</div>
              <div className="text-[11px] opacity-80 font-medium">
                {isStep1Done ? '🟢 Yüklemeye Hazır' : '🔒 Adım 1 Bekleniyor'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Workflow Steps Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* STEP 1 SECTION CARD */}
        <div className="bg-base-200/40 p-6 rounded-3xl border border-base-200 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="badge badge-primary font-black text-xs uppercase px-3 py-1">Adım 1</span>
              {isStep1Done && (
                <span className="badge badge-success font-bold text-xs gap-1">
                  <CheckCircleIcon className="h-3.5 w-3.5" /> Tamamlandı
                </span>
              )}
            </div>

            <h4 className="font-black text-base text-base-content flex items-center gap-2">
              <DocumentTextIcon className="h-6 w-6 text-primary shrink-0" />
              Dijital Doküman Talep Formu
            </h4>

            {isStep1Done ? (
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-xs space-y-2">
                <div className="font-black text-emerald-700 flex items-center gap-1.5">
                  <CheckCircleIcon className="h-4 w-4" />
                  Talep Formunuz Başarıyla Kaydedildi!
                </div>
                <div className="font-bold text-base-content">
                  Doküman Adı: <span className="text-primary">{completedForm.documentName}</span>
                </div>
                <div className="text-base-content/70">
                  Talep Türü: {completedForm.requestType === 'NEW_DOCUMENT' ? 'Yeni Doküman' : completedForm.requestType === 'REVISION' ? 'Revizyon' : 'Yürürlükten Kaldırma'}
                </div>
                {completedForm.documentNo && (
                  <div className="text-base-content/70">Doküman No: {completedForm.documentNo}</div>
                )}
              </div>
            ) : (
              <p className="text-xs text-base-content/70 leading-relaxed">
                Kanıt belgesi yüklemeden önce lütfen dijital talep formunu doldurarak talebinizi oluşturunuz.
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onOpenDocumentRequestModal}
            className={`btn btn-sm w-full gap-2 rounded-xl font-bold shadow-md transition-all ${
              isStep1Done
                ? 'btn-outline btn-success'
                : 'btn-primary shadow-primary/25 hover:scale-[1.01]'
            }`}
          >
            <DocumentTextIcon className="h-4 w-4" />
            {isStep1Done ? 'Form Detaylarını Gör / Yeniden Doldur' : '1. Adım: Dijital Formu Doldur'}
            <ArrowRightIcon className="h-3.5 w-3.5 ml-auto" />
          </button>
        </div>

        {/* STEP 2 SECTION CARD (UNLOCKED AFTER STEP 1) */}
        <div
          className={`p-6 rounded-3xl border transition-all duration-300 flex flex-col justify-between space-y-4 ${
            isStep1Done
              ? 'bg-base-100 border-base-200 shadow-sm'
              : 'bg-base-200/30 border-base-200/60 opacity-60 pointer-events-none'
          }`}
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span
                className={`badge font-black text-xs uppercase px-3 py-1 ${
                  isStep1Done ? 'badge-secondary text-white' : 'badge-ghost'
                }`}
              >
                Adım 2
              </span>
              {!isStep1Done && (
                <span className="badge badge-ghost text-[10px] font-bold gap-1 text-base-content/60">
                  <LockClosedIcon className="h-3 w-3" /> Önce Adım 1'i Tamamlayınız
                </span>
              )}
            </div>

            <h4 className="font-black text-base text-base-content flex items-center gap-2">
              <ClipboardDocumentCheckIcon className="h-6 w-6 text-secondary shrink-0" />
              Hazır Word Şablonu İndir
            </h4>
            <p className="text-xs text-base-content/70">
              Bilgisayarınıza indirip doldurabileceğiniz Word şablonları:
            </p>

            <div className="space-y-2 pt-1">
              {dynamicTemplates.length > 0 ? (
                dynamicTemplates.map((tmpl) => (
                  <a
                    key={tmpl.id}
                    href={tmpl.downloadUrl}
                    download={tmpl.filename}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-base-200/60 border border-base-200 hover:border-secondary hover:bg-secondary/10 transition-all text-xs font-bold text-base-content group"
                  >
                    <span className="truncate">📄 {tmpl.title}</span>
                    <ArrowDownTrayIcon className="h-4 w-4 text-secondary shrink-0 group-hover:scale-110 transition-transform" />
                  </a>
                ))
              ) : (
                <>
                  <a
                    href="/api/evidence/templates/0"
                    download
                    className="flex items-center justify-between p-2.5 rounded-xl bg-base-200/60 border border-base-200 hover:border-secondary hover:bg-secondary/10 transition-all text-xs font-bold text-base-content group"
                  >
                    <span className="truncate">📋 Word Şablonu 1</span>
                    <ArrowDownTrayIcon className="h-4 w-4 text-secondary shrink-0 group-hover:scale-110 transition-transform" />
                  </a>

                  <a
                    href="/api/evidence/templates/1"
                    download
                    className="flex items-center justify-between p-2.5 rounded-xl bg-base-200/60 border border-base-200 hover:border-secondary hover:bg-secondary/10 transition-all text-xs font-bold text-base-content group"
                  >
                    <span className="truncate">💼 Word Şablonu 2</span>
                    <ArrowDownTrayIcon className="h-4 w-4 text-secondary shrink-0 group-hover:scale-110 transition-transform" />
                  </a>

                  <a
                    href="/api/evidence/templates/2"
                    download
                    className="flex items-center justify-between p-2.5 rounded-xl bg-base-200/60 border border-base-200 hover:border-secondary hover:bg-secondary/10 transition-all text-xs font-bold text-base-content group"
                  >
                    <span className="truncate">📊 Word Şablonu 3</span>
                    <ArrowDownTrayIcon className="h-4 w-4 text-secondary shrink-0 group-hover:scale-110 transition-transform" />
                  </a>

                  <a
                    href="/api/evidence/templates/3"
                    download
                    className="flex items-center justify-between p-2.5 rounded-xl bg-base-200/60 border border-base-200 hover:border-secondary hover:bg-secondary/10 transition-all text-xs font-bold text-base-content group"
                  >
                    <span className="truncate">📄 Word Şablonu 4</span>
                    <ArrowDownTrayIcon className="h-4 w-4 text-secondary shrink-0 group-hover:scale-110 transition-transform" />
                  </a>
                </>
              )}
            </div>
          </div>
        </div>

        {/* STEP 3 SECTION CARD (UNLOCKED AFTER STEP 1) */}
        <div
          className={`p-6 rounded-3xl border transition-all duration-300 space-y-4 flex flex-col justify-between ${
            isStep1Done
              ? 'bg-base-100 border-base-200 shadow-sm'
              : 'bg-base-200/30 border-base-200/60 opacity-60 pointer-events-none'
          }`}
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span
                className={`badge font-black text-xs uppercase px-3 py-1 ${
                  isStep1Done ? 'badge-accent text-accent-content' : 'badge-ghost'
                }`}
              >
                Adım 3
              </span>
              {!isStep1Done && (
                <span className="badge badge-ghost text-[10px] font-bold gap-1 text-base-content/60">
                  <LockClosedIcon className="h-3 w-3" /> Önce Adım 1'i Tamamlayınız
                </span>
              )}
            </div>

            <h4 className="font-black text-base text-base-content flex items-center gap-2">
              <CloudArrowUpIcon className="h-6 w-6 text-primary shrink-0" />
              Word Kanıtını Yükle & Gönder
            </h4>

            <form onSubmit={handleUploadEvidence} className="space-y-3">
              <div>
                <label className="label text-xs font-bold text-base-content/80">Belge Başlığı *</label>
                <input
                  type="text"
                  className="input input-bordered input-sm w-full rounded-xl"
                  placeholder="Örn: 2026 Kalite Raporu Word"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  required
                  disabled={!isStep1Done}
                />
              </div>

              <div>
                <label className="label text-xs font-bold text-base-content/80">Açıklama / Detay</label>
                <textarea
                  className="textarea textarea-bordered textarea-sm w-full rounded-xl"
                  rows={2}
                  placeholder="Açıklama giriniz..."
                  value={uploadDescription}
                  onChange={(e) => setUploadDescription(e.target.value)}
                  disabled={!isStep1Done}
                ></textarea>
              </div>

              <div>
                <label className="label text-xs font-bold text-base-content/80">Word Dosyası Seç (.doc, .docx) *</label>
                
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
                      ? 'border-primary bg-primary/10 scale-[1.02]'
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
                    disabled={!isStep1Done}
                  />

                  {uploadFile ? (
                    <div className="flex items-center justify-between px-2">
                      <span className="text-xs font-bold text-success truncate">{uploadFile.name}</span>
                      <span className="text-[11px] text-error font-bold underline cursor-pointer z-20" onClick={(e) => { e.stopPropagation(); setUploadFile(null); }}>
                        Kaldır
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2 text-xs font-bold text-base-content/70">
                      <CloudArrowUpIcon className="h-5 w-5 text-primary" />
                      <span>Word dosyasını seçin veya sürükleyin</span>
                    </div>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={uploading || !uploadFile || !isStep1Done}
                className="btn btn-primary btn-sm w-full shadow-lg shadow-primary/25 rounded-xl font-bold transition-all disabled:opacity-50 mt-2"
              >
                {uploading ? (
                  <span className="loading loading-spinner loading-xs"></span>
                ) : (
                  <>
                    <DocumentArrowUpIcon className="h-4 w-4" />
                    3. Raportöre Gönder & Yükle
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
