'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { QRCodeSVG } from 'qrcode.react';
import {
  PlusIcon,
  QrCodeIcon,
  CalendarIcon,
  MapPinIcon,
  XMarkIcon,
  UsersIcon,
  DocumentTextIcon,
  ClockIcon,
  ShareIcon,
  TrashIcon
} from '@heroicons/react/24/outline';

export default function MeetingManagement() {
  const [meetings, setMeetings] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedQR, setSelectedQR] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showMinutesModal, setShowMinutesModal] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<any>(null);
  const [minutesText, setMinutesText] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    date: ''
  });

  const fetchMeetings = async () => {
    try {
      const res = await axios.get('/api/meetings');
      if (res.data.success) setMeetings(res.data.meetings);
    } catch (err) {
      console.error("Toplantılar yüklenemedi");
    }
  };
  const handleSaveMinutes = async () => {
    setLoading(true);
    try {
      const res = await axios.patch(`/api/meetings/${selectedMeeting._id}`, {
        minutes: minutesText
      });
      if (res.data.success) {
        setShowMinutesModal(false);
        setMinutesText('');
        fetchMeetings();
      }
    } catch (err: any) {
      alert(err.response?.data?.msg || "Hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (meetingId: string) => {
    if (!confirm('Bu toplantıyı silmek istediğinize emin misiniz? Bu işlem geri alınamaz.')) return;
    try {
      await axios.delete(`/api/meetings/${meetingId}`);
      fetchMeetings();
    } catch (err: any) {
      alert(err.response?.data?.msg || 'Silme işlemi başarısız oldu.');
    }
  };

  useEffect(() => { fetchMeetings(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.post('/api/meetings/create', formData);
      setShowModal(false);
      setFormData({ title: '', description: '', location: '', date: '' });
      fetchMeetings();
      setSelectedQR(res.data.qrSecret);
    } catch (err: any) {
      alert(err.response?.data?.msg || "Hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  const copyShareLink = async (id: string) => {
    const link = `${window.location.origin}/meeting/view/${id}`;
    let copied = false;

    // 1. Modern API denemesi (Sadece HTTPS/Localhost'ta çalışır)
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(link);
        copied = true;
      } catch (err) {
        console.error("Modern kopyalama başarısız:", err);
      }
    }

    if (!copied) {
      try {
        const textArea = document.createElement("textarea");
        textArea.value = link;

        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        textArea.style.top = "0";
        document.body.appendChild(textArea);

        textArea.focus();
        textArea.select();

        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);

        if (successful) {
          copied = true;
        } else {
          throw new Error('Kopyalama başarısız');
        }
      } catch (err) {
        console.error("Fallback kopyalama da başarısız:", err);
        alert("Kopyalanamadı, ancak link yeni sekmede açılıyor.");
      }
    }

    if (copied) {
      alert("Link başarıyla kopyalandı ve yeni sekmede açılıyor!");
    }

    // Her durumda yeni sekmede aç
    window.open(link, '_blank');
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-base-100 p-6 rounded-lg shadow-sm border border-base-200">
        <div>
          <h1 className="text-2xl font-bold text-base-content">
            Toplantı Portalı (Test)
          </h1>
          <p className="text-sm text-base-content/70 mt-1">
            QR Katılım & Toplantı Tutanak Sistemi | Not (Katılımcılar telefondan QR Kod okutarak katılmalılar! ve Toplantı bittikten sonra Tutanak yazılmalı)
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="w-full md:w-auto bg-primary text-primary-content px-6 py-3 rounded-lg font-medium hover:brightness-90 transition-all flex items-center justify-center gap-2 shadow-sm"
        >
          <PlusIcon className="h-5 w-5" /> Yeni Toplantı Başlat
        </button>
      </div>


      {/* MEETINGS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {meetings.length === 0 ? (
          <div className="col-span-full py-16 text-center border-2 border-dashed border-base-300 rounded-xl bg-base-100/50">
            <p className="text-base-content/60 font-medium">Henüz bir toplantı oluşturulmadı</p>
          </div>
        ) : (
          meetings.map((meeting: any) => (
            <div
              key={meeting._id}
              className="bg-base-100 border border-base-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-5"
            >
              {/* Card Header */}
              <div className="flex justify-between items-start">
                <div className="flex flex-col gap-1.5">
                  <span className="flex items-center gap-1 text-xs font-medium text-base-content/60">
                    <ClockIcon className="h-3.5 w-3.5" /> {new Date(meeting.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <h3 className="text-lg font-semibold text-base-content leading-tight">
                    {meeting.title}
                  </h3>
                </div>
                <div className={`px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wide uppercase ${meeting.status === 'open' ? 'bg-success/10 text-success' : 'bg-base-200 text-base-content/60'}`}>
                  {meeting.status === 'open' ? 'AKTİF' : 'KAPALI'}
                </div>
              </div>

              {/* Info Row */}
              <div className="flex flex-col gap-2.5 text-sm font-medium text-base-content/80">
                <div className="flex items-center gap-2 bg-base-200/50 px-3 py-2 rounded-lg">
                  <CalendarIcon className="h-4 w-4 text-primary" />
                  {new Date(meeting.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>
                <div className="flex items-center gap-2 bg-base-200/50 px-3 py-2 rounded-lg">
                  <MapPinIcon className="h-4 w-4 text-primary" /> {meeting.location}
                </div>
              </div>

              {/* Attendees Section */}
              <div className="border-t border-base-200 pt-4 mt-auto">
                <div className="flex items-center gap-2 mb-3">
                  <UsersIcon className="h-4 w-4 text-info" />
                  <span className="text-sm font-semibold text-base-content">Katılımcılar ({meeting.attendees?.length || 0})</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {meeting.attendees?.map((att: any, idx: number) => (
                    <div key={idx} className="bg-info/10 border border-info/20 px-2.5 py-1 rounded-md text-xs font-medium text-info">
                      {att.user?.title} {att.user?.name} {att.user?.surname}
                    </div>
                  ))}
                  {meeting.attendees?.length === 0 && <span className="text-sm italic text-base-content/50">Henüz katılım sağlanmadı...</span>}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3 mt-2">
                <button
                  onClick={() => setSelectedQR(meeting.qrSecret)}
                  className="bg-primary/10 text-primary hover:bg-primary hover:text-primary-content border border-primary/20 p-2.5 rounded-lg font-semibold text-xs flex items-center justify-center gap-2 transition-all"
                >
                  <QrCodeIcon className="h-4 w-4" /> QR KODU
                </button>
                <button
                  onClick={() => {
                    setSelectedMeeting(meeting);
                    setMinutesText(meeting.minutes || '');
                    setShowMinutesModal(true);
                  }}
                  className="bg-base-200 text-base-content hover:bg-base-300 p-2.5 rounded-lg font-semibold text-xs flex items-center justify-center gap-2 transition-all"
                >
                  <DocumentTextIcon className="h-4 w-4" />
                  {meeting.minutes ? 'Tutanak Görüntüle' : 'Tutanak Yaz'}
                </button>
                <button
                  onClick={() => copyShareLink(meeting._id)}
                  className="bg-base-200 text-base-content hover:bg-base-300 p-2.5 rounded-lg font-semibold text-xs flex items-center justify-center gap-2 transition-all"
                >
                  <ShareIcon className="h-4 w-4" /> Toplantı Linki
                </button>
                <button
                  onClick={() => handleDelete(meeting._id)}
                  className="bg-error/10 text-error hover:bg-error hover:text-error-content border border-error/20 p-2.5 rounded-lg font-semibold text-xs flex items-center justify-center gap-2 transition-all"
                >
                  <TrashIcon className="h-4 w-4" /> Sil
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* QR MODAL */}
      {selectedQR && (
        <div className="fixed inset-0 bg-base-300/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-base-100 rounded-2xl p-8 max-w-sm w-full text-center relative shadow-xl border border-base-200">
            <button onClick={() => setSelectedQR(null)} className="absolute top-4 right-4 p-2 text-base-content/50 hover:text-base-content hover:bg-base-200 rounded-full transition-colors">
              <XMarkIcon className="h-6 w-6" />
            </button>
            <h2 className="text-2xl font-bold text-base-content mb-2">KATILIM QR</h2>
            <p className="text-sm text-base-content/70 mb-6">Okutmak için ekrana yaklaştırın</p>

            <div className="bg-white p-4 rounded-xl inline-block mb-2 shadow-sm border border-base-200">
              <QRCodeSVG
                value={`${window.location.origin}/meeting/join/${selectedQR}`}
                size={200}
                level="H"
              />
            </div>
          </div>
        </div>
      )}

      {/* CREATE MEETING MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-base-300/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-base-100 shadow-xl rounded-xl p-6 sm:p-8 border border-base-200 w-full max-w-lg relative">
            <button onClick={() => setShowModal(false)} className="absolute top-6 right-6 p-2 text-base-content/50 hover:text-base-content hover:bg-base-200 rounded-full transition-colors">
              <XMarkIcon className="h-6 w-6" />
            </button>
            <h2 className="text-2xl font-semibold text-base-content mb-6 border-b border-base-200 pb-4">Yeni Toplantı Planla</h2>

            <form onSubmit={handleCreate} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-base-content/80 mb-1.5">Toplantı Konusu</label>
                <input
                  placeholder="Örn: Ar-Ge Değerlendirme"
                  className="block w-full rounded-lg border border-base-300 bg-base-100 text-base-content px-4 py-3 text-sm focus:ring-primary outline-none transition-all"
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-base-content/80 mb-1.5">Toplantı Yeri</label>
                <input
                  placeholder="Örn: Dekanlık Toplantı Salonu"
                  className="block w-full rounded-lg border border-base-300 bg-base-100 text-base-content px-4 py-3 text-sm focus:ring-primary outline-none transition-all"
                  value={formData.location}
                  onChange={e => setFormData({ ...formData, location: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-base-content/80 mb-1.5">Tarih & Saat</label>
                <input
                  type="datetime-local"
                  className="block w-full rounded-lg border border-base-300 bg-base-100 text-base-content px-4 py-3 text-sm focus:ring-primary outline-none transition-all"
                  value={formData.date}
                  onChange={e => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </div>
              <div className="pt-4 border-t border-base-200 mt-6">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-primary text-primary-content py-4 rounded-lg text-lg font-bold hover:brightness-90 shadow-md transition-all disabled:opacity-50 flex justify-center items-center"
                >
                  {loading ? 'Planlanıyor...' : 'Toplantıyı Başlat'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* MINUTES MODAL */}
      {showMinutesModal && selectedMeeting && (
        <div className="fixed inset-0 bg-base-300/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-base-100 shadow-xl rounded-xl p-6 sm:p-8 border border-base-200 w-full max-w-2xl relative">
            <button onClick={() => { setShowMinutesModal(false); setMinutesText(''); }} className="absolute top-6 right-6 p-2 text-base-content/50 hover:text-base-content hover:bg-base-200 rounded-full transition-colors">
              <XMarkIcon className="h-6 w-6" />
            </button>
            <h2 className="text-2xl font-semibold text-base-content mb-2">
              {selectedMeeting.minutes ? 'Tutanağı Görüntüle / Düzenle' : 'Tutanak Yaz'}
            </h2>
            <p className="text-sm text-base-content/70 mb-6 border-b border-base-200 pb-4">
              <span className="font-semibold text-primary">{selectedMeeting.title}</span>
              {selectedMeeting.minutes
                ? ' toplantısının tutanağını aşağıda görüntüleyebilir ve düzenleyebilirsiniz.'
                : ' toplantısı için alınan kararları ve notları giriniz. Tutanak kaydedildiğinde toplantı kapatılacaktır.'}
            </p>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-base-content/80 mb-1.5">Tutanak Metni</label>
                <textarea
                  placeholder="Alınan kararlar, görüşülen konular..."
                  className="block w-full rounded-lg border border-base-300 bg-base-100 text-base-content px-4 py-3 text-sm focus:ring-primary outline-none transition-all min-h-[220px] resize-y"
                  value={minutesText}
                  onChange={e => setMinutesText(e.target.value)}
                />
              </div>

              <div className="pt-4 border-t border-base-200 mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => { setShowMinutesModal(false); setMinutesText(''); }}
                  className="px-6 py-3 rounded-lg font-medium bg-base-200 text-base-content hover:bg-base-300 transition-all"
                >
                  Kapat
                </button>
                <button
                  type="button"
                  onClick={handleSaveMinutes}
                  disabled={loading || !minutesText.trim()}
                  className="px-6 py-3 rounded-lg font-bold bg-primary text-primary-content hover:brightness-90 shadow-md transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {loading ? 'Kaydediliyor...' : selectedMeeting.minutes ? 'Güncelle & Kaydet' : 'Tutanağı Kaydet & Kapat'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}