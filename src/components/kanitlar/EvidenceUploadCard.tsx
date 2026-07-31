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
  ArrowRightIcon,
  ClipboardDocumentCheckIcon
} from '@heroicons/react/24/outline';

export default function EvidenceUploadCard({
  sessionId,
  onUploadSuccess,
  onOpenDocumentRequestModal
}: {
  sessionId: string;
  onUploadSuccess: () => void;
  onOpenDocumentRequestModal: () => void;
}) {
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const handleUploadEvidence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionId) {
      alert('Lütfen önce bir oturum seçiniz.');
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
      onUploadSuccess();
    } catch (err: any) {
      alert(err.response?.data?.msg || 'Kanıt yükleme hatası');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-base-100 p-6 rounded-3xl border border-base-200 shadow-sm space-y-6">
      {/* Step 1: Digital Request Form Button */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-secondary/10 border border-primary/20 space-y-3">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-primary text-primary-content font-black text-[11px] uppercase tracking-wider shadow-xs">
            Adım 1
          </span>
          <span className="text-[11px] font-bold text-primary">Dijital Ön Başvuru</span>
        </div>

        <div>
          <h4 className="font-black text-base text-base-content flex items-center gap-2">
            <DocumentTextIcon className="h-5 w-5 text-primary" />
            Doküman Hazırlama / Revizyon / İptal Talep Formu
          </h4>
          <p className="text-xs text-base-content/70 mt-1 leading-relaxed">
            Önce dijital talep formunu doldurarak talebinizi sisteme kaydediniz.
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenDocumentRequestModal}
          className="btn btn-primary btn-sm w-full gap-2 rounded-xl font-bold shadow-md shadow-primary/20 hover:scale-[1.01] transition-all"
        >
          <DocumentTextIcon className="h-4 w-4" />
          1. Dijital Talep Formunu Doldur
          <ArrowRightIcon className="h-3.5 w-3.5 ml-auto" />
        </button>
      </div>

      {/* Step 2: Downloadable Sample Word Templates */}
      <div className="p-5 rounded-2xl bg-base-200/50 border border-base-200 space-y-3">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-secondary text-secondary-content font-black text-[11px] uppercase tracking-wider shadow-xs">
            Adım 2
          </span>
          <span className="text-[11px] font-bold text-secondary">Örnek Şablon İndir</span>
        </div>

        <div>
          <h4 className="font-black text-sm text-base-content flex items-center gap-2">
            <ClipboardDocumentCheckIcon className="h-5 w-5 text-secondary" />
            Hazır Word Şablonları ve Örnek Formlar
          </h4>
          <p className="text-xs text-base-content/70 mt-0.5">
            İhtiyacınız olan şablonu bilgisayarınıza indirip doldurunuz:
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
          <a
            href="/api/evidence/templates/is-akis"
            download
            className="flex items-center justify-between p-2.5 rounded-xl bg-base-100 border border-base-200 hover:border-primary/40 hover:bg-primary/5 transition-all text-xs font-bold text-base-content group"
          >
            <span className="truncate">📋 İş Akış Şablonu</span>
            <ArrowDownTrayIcon className="h-4 w-4 text-primary shrink-0 group-hover:scale-110 transition-transform" />
          </a>

          <a
            href="/api/evidence/templates/gorev-yetki"
            download
            className="flex items-center justify-between p-2.5 rounded-xl bg-base-100 border border-base-200 hover:border-primary/40 hover:bg-primary/5 transition-all text-xs font-bold text-base-content group"
          >
            <span className="truncate">💼 Görev & Yetki Şablonu</span>
            <ArrowDownTrayIcon className="h-4 w-4 text-primary shrink-0 group-hover:scale-110 transition-transform" />
          </a>

          <a
            href="/api/evidence/templates/rapor"
            download
            className="flex items-center justify-between p-2.5 rounded-xl bg-base-100 border border-base-200 hover:border-primary/40 hover:bg-primary/5 transition-all text-xs font-bold text-base-content group"
          >
            <span className="truncate">📊 Kalite / Rapor Şablonu</span>
            <ArrowDownTrayIcon className="h-4 w-4 text-primary shrink-0 group-hover:scale-110 transition-transform" />
          </a>

          <a
            href="/api/evidence/templates/prosedur"
            download
            className="flex items-center justify-between p-2.5 rounded-xl bg-base-100 border border-base-200 hover:border-primary/40 hover:bg-primary/5 transition-all text-xs font-bold text-base-content group"
          >
            <span className="truncate">📄 Standart Prosedür Şablonu</span>
            <ArrowDownTrayIcon className="h-4 w-4 text-primary shrink-0 group-hover:scale-110 transition-transform" />
          </a>
        </div>
      </div>

      {/* Step 3: Upload Filled Word Document */}
      <div className="p-5 rounded-2xl bg-base-100 border border-base-200 space-y-4 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-accent text-accent-content font-black text-[11px] uppercase tracking-wider shadow-xs">
            Adım 3
          </span>
          <span className="text-[11px] font-bold text-accent">Son Adım: Kanıt Yükle</span>
        </div>

        <div className="flex items-center gap-2">
          <CloudArrowUpIcon className="h-6 w-6 text-primary shrink-0" />
          <div>
            <h3 className="font-black text-base text-base-content">Doldurulan Word Kanıtını Yükle</h3>
            <p className="text-[11px] text-base-content/60">Sadece Word (.doc, .docx) kabul edilir</p>
          </div>
        </div>

        <form onSubmit={handleUploadEvidence} className="space-y-4">
          <div>
            <label className="label text-xs font-bold text-base-content/80">Belge / Kanıt Başlığı *</label>
            <input
              type="text"
              className="input input-bordered input-sm w-full rounded-xl"
              placeholder="Örn: Tamamlanan İş Akış Formu"
              value={uploadTitle}
              onChange={(e) => setUploadTitle(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="label text-xs font-bold text-base-content/80">Açıklama / Detay</label>
            <textarea
              className="textarea textarea-bordered textarea-sm w-full rounded-xl"
              rows={2}
              placeholder="Belge ile ilgili açıklamalarınız..."
              value={uploadDescription}
              onChange={(e) => setUploadDescription(e.target.value)}
            ></textarea>
          </div>

          <div>
            <label className="label text-xs font-bold text-base-content/80">Word Dosyası Seç (Sadece .doc, .docx) *</label>
            
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
                  ? 'border-primary bg-primary/10 scale-[1.02] shadow-lg shadow-primary/20'
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
                <div className="space-y-1">
                  <div className="inline-flex items-center justify-center p-2 rounded-full bg-success/10 text-success">
                    <CheckIcon className="h-5 w-5" />
                  </div>
                  <div className="text-xs font-bold text-base-content truncate px-2">
                    {uploadFile.name}
                  </div>
                  <div className="text-[11px] font-semibold text-success flex items-center justify-center gap-2">
                    <span>({Math.round(uploadFile.size / 1024)} KB)</span>
                    <span className="underline text-error font-bold hover:text-error/80 cursor-pointer z-20" onClick={(e) => { e.stopPropagation(); setUploadFile(null); }}>
                      Kaldır
                    </span>
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5 py-1">
                  <div className="inline-flex items-center justify-center p-2.5 rounded-full bg-primary/10 text-primary">
                    <CloudArrowUpIcon className="h-6 w-6" />
                  </div>
                  <div className="text-xs font-bold text-base-content">
                    Word Dosyasını Sürükleyin veya <span className="text-primary underline">Seçin</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={uploading || !uploadFile}
            className="btn btn-primary btn-sm w-full shadow-lg shadow-primary/25 hover:shadow-primary/40 rounded-xl gap-2 font-bold transition-all disabled:opacity-50"
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
  );
}
