'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import axios from 'axios';
import {
    PrinterIcon,
    ChevronLeftIcon,
    MapPinIcon,
    CalendarDaysIcon,
    UserCircleIcon,
    ClockIcon,
    DocumentTextIcon,
    UsersIcon,
    CheckCircleIcon,
    ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import unilogo from "@/src/components/yuksekihtisasuni-logo.png";

export default function MeetingViewPage() {
    const { id } = useParams();
    const [meeting, setMeeting] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDetail = async () => {
            try {
                const res = await axios.get(`/api/meetings/${id}`);
                setMeeting(res.data.meeting);
            } catch (err) {
                console.error('Yükleme hatası');
            } finally {
                setLoading(false);
            }
        };
        fetchDetail();
    }, [id]);

    if (loading) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-base-200 gap-4">
            <div className="loading loading-spinner loading-lg text-primary"></div>
            <p className="text-base-content/60 font-semibold text-sm uppercase tracking-widest">Yükleniyor...</p>
        </div>
    );

    if (!meeting) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-base-200 gap-3">
            <ExclamationCircleIcon className="h-12 w-12 text-error/60" />
            <p className="text-base-content/70 font-semibold">Toplantı bulunamadı.</p>
        </div>
    );

    const isClosed = meeting.status !== 'open';
    const attendeeCount = meeting.attendees?.length || 0;
    const meetingDate = new Date(meeting.date);

    return (
        <div className="min-h-screen bg-base-200 py-8 px-4 print:bg-white print:py-0 print:px-0">
            <style jsx global>{`
                @media print {
                    @page {
                        margin: 0; /* Removes browser header/footer (date, url, page number) */
                    }
                    body {
                        padding: 1cm; /* Adds padding back to prevent content from touching the edges */
                    }
                }
            `}</style>
            <div className="max-w-4xl mx-auto space-y-6 print:space-y-4">

                {/* Üst Aksiyon Çubuğu - Yazdırmada gizle */}
                <div className="flex items-center justify-between print:hidden">
                    {/* <button
                        onClick={() => window.history.back()}
                        className="flex items-center gap-2 text-sm font-semibold text-base-content/70 hover:text-base-content transition-colors"
                    >
                        <ChevronLeftIcon className="h-5 w-5" />
                        Geri Dön
                    </button> */}
                    <button
                        onClick={() => window.print()}
                        className="flex items-center gap-2 bg-primary text-primary-content px-5 py-2.5 rounded-lg font-semibold text-sm hover:brightness-90 transition-all shadow-sm"
                    >
                        <PrinterIcon className="h-4 w-4" />
                        Yazdır / PDF
                    </button>
                </div>

                {/* Ana Kart */}
                <div className="bg-base-100 rounded-2xl shadow-sm border border-base-200 overflow-hidden print:shadow-none print:border print:rounded-none">

                    {/* Print Özel Form Başlığı */}
                    <div className="hidden print:flex w-full border-2 border-black mb-4 bg-white text-black">
                        {/* Sol Logo */}
                        <div className="w-[20%] border-r-2 border-black flex items-center justify-center p-2">
                            <img src={unilogo.src} alt="Logo" className="h-20 w-auto object-contain grayscale" />
                        </div>
                        
                        {/* Orta Başlık */}
                        <div className="w-[50%] border-r-2 border-black flex flex-col items-center justify-center p-2 text-center">
                            <h2 className="text-sm font-bold leading-tight">T.C.</h2>
                            <h2 className="text-sm font-bold leading-tight">YÜKSEK İHTİSAS ÜNİVERSİTESİ</h2>
                            <h2 className="text-base font-extrabold leading-tight mt-1">TOPLANTI TUTANAK FORMU</h2>
                        </div>
                        
                        {/* Sağ Bilgi Alanı */}
                        <div className="w-[30%] flex flex-col text-[10px] font-bold divide-y-2 divide-black">
                            <div className="flex divide-x-2 divide-black h-1/4">
                                <div className="w-[45%] px-2 py-1 flex items-center">Doküman No</div>
                                <div className="w-[55%] px-2 py-1 flex items-center">YIU.FRM.001</div>
                            </div>
                            <div className="flex divide-x-2 divide-black h-1/4">
                                <div className="w-[45%] px-2 py-1 flex items-center">Yayın Tarihi</div>
                                <div className="w-[55%] px-2 py-1 flex items-center">19.09.2025</div>
                            </div>
                            <div className="flex divide-x-2 divide-black h-1/4">
                                <div className="w-[45%] px-2 py-1 flex items-center">Revizyon Tarihi</div>
                                <div className="w-[55%] px-2 py-1 flex items-center"></div>
                            </div>
                            <div className="flex divide-x-2 divide-black h-1/4">
                                <div className="w-[45%] px-2 py-1 flex items-center">Revizyon No</div>
                                <div className="w-[55%] px-2 py-1 flex items-center">0</div>
                            </div>
                        </div>
                    </div>

                    {/* Hero Header */}
                    <div className="bg-linear-to-r from-primary/10 via-base-100 to-info/10 border-b border-base-200 px-8 py-8 print:px-6 print:py-4 print:border-none print:bg-white print:text-black">
                        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                            <div>
                                <h1 className="text-2xl md:text-3xl font-bold text-base-content leading-tight print:text-xl print:text-center print:mb-2 print:border-b-2 print:border-black print:pb-2 print:w-full">
                                    {meeting.title}
                                </h1>
                                <div className="flex flex-wrap gap-x-5 gap-y-2 mt-3">
                                    <span className="flex items-center gap-1.5 text-sm text-base-content/70">
                                        <CalendarDaysIcon className="h-4 w-4 text-primary shrink-0" />
                                        {meetingDate.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                                    </span>
                                    <span className="flex items-center gap-1.5 text-sm text-base-content/70">
                                        <ClockIcon className="h-4 w-4 text-primary shrink-0" />
                                        {meetingDate.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                    <span className="flex items-center gap-1.5 text-sm text-base-content/70">
                                        <MapPinIcon className="h-4 w-4 text-primary shrink-0" />
                                        {meeting.location}
                                    </span>
                                </div>
                            </div>
                            <div className="shrink-0">
                                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold tracking-wide uppercase ${isClosed ? 'bg-base-200 text-base-content/60' : 'bg-success/10 text-success'}`}>
                                    <span className={`h-1.5 w-1.5 rounded-full ${isClosed ? 'bg-base-content/40' : 'bg-success animate-pulse'}`}></span>
                                    {isClosed ? 'Kapalı Oturum' : 'Aktif Oturum'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="p-8 print:p-6 space-y-8">

                        {/* Bilgi Satırı */}
                        <div className="grid md:grid-cols-3 gap-4">
                            <div className="bg-base-200/50 rounded-xl p-4 border border-base-200">
                                <p className="text-xs font-semibold text-base-content/50 uppercase tracking-wide mb-1">Oturum Başkanı</p>
                                <div className="flex items-center gap-2 mt-1">
                                    <UserCircleIcon className="h-5 w-5 text-primary shrink-0" />
                                    <p className="text-sm font-semibold text-base-content">
                                        {meeting.organizer?.title} {meeting.organizer?.name} {meeting.organizer?.surname}
                                    </p>
                                </div>
                            </div>
                            <div className="bg-base-200/50 rounded-xl p-4 border border-base-200">
                                <p className="text-xs font-semibold text-base-content/50 uppercase tracking-wide mb-1">Katılımcı Sayısı</p>
                                <div className="flex items-center gap-2 mt-1">
                                    <UsersIcon className="h-5 w-5 text-info shrink-0" />
                                    <p className="text-sm font-semibold text-base-content">{attendeeCount} Kişi</p>
                                </div>
                            </div>
                            <div className="bg-base-200/50 rounded-xl p-4 border border-base-200">
                                <p className="text-xs font-semibold text-base-content/50 uppercase tracking-wide mb-1">Tutanak Durumu</p>
                                <div className="flex items-center gap-2 mt-1">
                                    <DocumentTextIcon className="h-5 w-5 text-warning shrink-0" />
                                    <p className="text-sm font-semibold text-base-content">
                                        {meeting.minutes ? 'Tutanak Mevcut' : 'Henüz Girilmedi'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Alınan Kararlar */}
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <DocumentTextIcon className="h-5 w-5 text-primary" />
                                <h2 className="text-base font-bold text-base-content uppercase tracking-wide">Alınan Kararlar</h2>
                            </div>
                            <div className="bg-base-200/40 rounded-xl border border-base-200 p-6 min-h-[140px]">
                                {meeting.minutes ? (
                                    <p className="text-base-content/90 leading-relaxed whitespace-pre-wrap text-sm">
                                        {meeting.minutes}
                                    </p>
                                ) : (
                                    <p className="text-base-content/40 italic text-sm text-center pt-6">
                                        Bu toplantı için henüz tutanak girilmemiştir.
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Hazirun Listesi */}
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <UsersIcon className="h-5 w-5 text-primary" />
                                <h2 className="text-base font-bold text-base-content uppercase tracking-wide">
                                    Katılımcı Listesi
                                    <span className="ml-2 text-xs font-normal text-base-content/50 normal-case">({attendeeCount} katılımcı)</span>
                                </h2>
                            </div>

                            {attendeeCount === 0 ? (
                                <div className="text-center py-8 text-base-content/40 italic text-sm border-2 border-dashed border-base-300 rounded-xl">
                                    Henüz katılım sağlanmadı.
                                </div>
                            ) : (
                                <div className="overflow-hidden rounded-xl border border-base-200">
                                    <table className="w-full text-sm">
                                        <thead className="bg-base-200/70">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-xs font-bold text-base-content/60 uppercase tracking-wide w-10">#</th>
                                                <th className="px-4 py-3 text-left text-xs font-bold text-base-content/60 uppercase tracking-wide">Ad Soyad</th>
                                                <th className="px-4 py-3 text-left text-xs font-bold text-base-content/60 uppercase tracking-wide hidden md:table-cell">Katılım Saati</th>
                                                <th className="px-4 py-3 text-center text-xs font-bold text-base-content/60 uppercase tracking-wide w-24">Durum</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-base-200">
                                            {meeting.attendees.map((att: any, idx: number) => (
                                                <tr key={idx} className="hover:bg-base-200/30 transition-colors">
                                                    <td className="px-4 py-3 text-xs font-bold text-base-content/40">{idx + 1}</td>
                                                    <td className="px-4 py-3">
                                                        <span className="font-semibold text-base-content">
                                                            {att.user?.title} {att.user?.name} {att.user?.surname} {att.isGuest ? `${att.guestName}` : ''}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-xs text-base-content/60 hidden md:table-cell">
                                                        {att.checkInTime
                                                            ? new Date(att.checkInTime).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
                                                            : '—'}
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-success bg-success/10 px-2.5 py-1 rounded-full">
                                                            <CheckCircleIcon className="h-3.5 w-3.5" />
                                                            Katıldı
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        {/* İmza Alanı - Sadece Yazdırmada */}
                        <div className="hidden print:grid print:grid-cols-2 gap-12 pt-16 border-t border-base-300 mt-8">
                            <div className="space-y-2">
                                <div className="border-b border-base-content/30 pb-1"></div>
                                <p className="text-xs text-base-content/60 text-center">Oturum Başkanı İmzası</p>
                                <p className="text-xs font-semibold text-center">{meeting.organizer?.title} {meeting.organizer?.name} {meeting.organizer?.surname}</p>
                            </div>
                            <div className="space-y-2">
                                <div className="border-b border-base-content/30 pb-1"></div>
                                <p className="text-xs text-base-content/60 text-center">Tutanak Takibi İmzası</p>
                            </div>
                        </div>

                    </div>
                </div>

                {/* Alt Aksiyonlar - Yazdırmada Gizle */}
                <div className="flex flex-col md:flex-row gap-3 print:hidden pb-8">
                    <button
                        onClick={() => window.print()}
                        className="flex-1 flex items-center justify-center gap-2 bg-base-100 border border-base-200 text-base-content px-5 py-3 rounded-xl font-semibold text-sm hover:bg-base-200 transition-all shadow-sm"
                    >
                        <PrinterIcon className="h-5 w-5" />
                        PDF / Yazdır
                    </button>
                    <button
                        onClick={() => window.location.href = '/dashboard/toplantilar'}
                        className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-content px-5 py-3 rounded-xl font-semibold text-sm hover:brightness-90 transition-all shadow-sm"
                    >
                        <ChevronLeftIcon className="h-5 w-5" />
                        Panele Dön
                    </button>
                </div>

            </div>
        </div>
    );
}