'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import {
    ArrowLeftIcon,
    CheckIcon,
    UserGroupIcon,
    PaperAirplaneIcon
} from '@heroicons/react/24/outline';

export default function ManuelAtamaPage() {
    const router = useRouter();
    const [requests, setRequests] = useState<any[]>([]);
    const [drivers, setDrivers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [selectedDriverId, setSelectedDriverId] = useState('');
    const [groupTitle, setGroupTitle] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [reqRes, drvRes] = await Promise.all([
                    axios.get('/api/admin/requests?status=pending'),
                    axios.get('/api/admin/all-drivers?status=available')
                ]);

                // 📅 TARİH FİLTRELEME MANTIĞI
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                const filteredRequests = reqRes.data.filter((req: any) => {
                    const reqDate = new Date(req.startTime);
                    // Bugün ve gelecek tarihli olanları listeye al
                    return reqDate >= today;
                });

                // Zamana göre sırala
                filteredRequests.sort((a: any, b: any) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

                setRequests(filteredRequests);
                setDrivers(drvRes.data);
            } catch (err) {
                console.error("Veri çekilemedi", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const toggleSelection = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleManualAssign = async () => {
        if (selectedIds.length === 0 || !selectedDriverId || !groupTitle) {
            alert("Lütfen talepleri seçin, bir grup ismi girin ve şoför belirleyin.");
            return;
        }

        try {
            await axios.post('/api/admin/assign-group', {
                requestIds: selectedIds,
                driverId: selectedDriverId,
                title: groupTitle
            });
            alert("Manuel atama başarıyla tamamlandı.");
            router.push('/dashboard/yigin');
        } catch (err) {
            alert("Atama sırasında hata oluştu.");
        }
    };

    if (loading) return <div className="p-10 text-center text-base-content/60">Güncel havuz yükleniyor...</div>;

    return (
        <div className="space-y-6 max-w-6xl mx-auto py-8">
            {/* ÜST BAR */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.back()} className="p-2 hover:bg-base-200 rounded-full transition-colors">
                        <ArrowLeftIcon className="h-6 w-6 text-base-content/80" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-base-content uppercase tracking-tight">
                            Manuel Atama Paneli
                        </h1>
                        <p className="text-xs text-info font-bold">
                            📅 Bugün ve Gelecek Talepler Listeleniyor ({new Date().toLocaleDateString('tr-TR')})
                        </p>
                    </div>
                </div>

                <div className="text-xs font-bold bg-info/10 text-info px-4 py-2 rounded-lg border border-info/30">
                    {selectedIds.length} Talep Seçildi
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* SOL TARAF: BUGÜNKÜ TALEP LİSTESİ */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="bg-base-100 rounded-xl border border-base-200 overflow-hidden shadow-sm">
                        <div className="p-4 border-b border-base-200 bg-base-200 flex justify-between items-center">
                            <p className="text-xs font-bold text-base-content/60 uppercase tracking-wider">Bekleyen Talepler</p>
                            <span className="text-[10px] text-base-content/40 font-medium italic">Bugün ve gelecek tarihli talepler.</span>
                        </div>
                        <div className="divide-y divide-base-200 max-h-[600px] overflow-y-auto">
                            {(() => {
                                const today = new Date();
                                const todayReqs = requests.filter(req => {
                                    const reqDate = new Date(req.startTime);
                                    return reqDate.getDate() === today.getDate() &&
                                           reqDate.getMonth() === today.getMonth() &&
                                           reqDate.getFullYear() === today.getFullYear();
                                });
                                const upcomingReqs = requests.filter(req => {
                                    const reqDate = new Date(req.startTime);
                                    return reqDate.getDate() !== today.getDate() ||
                                           reqDate.getMonth() !== today.getMonth() ||
                                           reqDate.getFullYear() !== today.getFullYear();
                                });

                                return requests.length > 0 ? (
                                    <>
                                        {todayReqs.length > 0 && (
                                            <div className="p-2 bg-base-200/50 text-[10px] font-black text-base-content/50 uppercase text-center tracking-[0.2em] border-b border-base-200 sticky top-0 backdrop-blur-sm z-10">
                                                Bugün
                                            </div>
                                        )}
                                        {todayReqs.map((req) => (
                                            <div
                                                key={req._id}
                                                onClick={() => toggleSelection(req._id)}
                                                className={`p-4 flex items-center gap-4 cursor-pointer transition-all ${selectedIds.includes(req._id) ? 'bg-info/10' : 'hover:bg-base-200/50'}`}
                                            >
                                                <div className={`h-5 w-5 rounded border flex items-center justify-center transition-all ${selectedIds.includes(req._id) ? 'bg-info border-info' : 'border-base-300'}`}>
                                                    {selectedIds.includes(req._id) && <CheckIcon className="h-3 w-3 text-info-content" />}
                                                </div>
                                                <div className="flex-1">
                                                    <p className="text-sm font-bold text-base-content">{req.requestingUser?.name}</p>
                                                    <p className="text-xs text-base-content/60">{req.fromLocation} ➔ {req.toLocation}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-xs font-bold text-info bg-info/10 px-2 py-0.5 rounded">
                                                        {new Date(req.startTime).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                    <p className="text-[9px] text-base-content/40 uppercase font-black mt-1">Aciliyet: Normal</p>
                                                </div>
                                            </div>
                                        ))}

                                        {upcomingReqs.length > 0 && (
                                            <div className="p-2 bg-base-200/50 text-[10px] font-black text-base-content/50 uppercase text-center tracking-[0.2em] border-y border-base-200 mt-4 sticky top-0 backdrop-blur-sm z-10">
                                                Gelecek Talepler
                                            </div>
                                        )}
                                        {upcomingReqs.map((req) => (
                                            <div
                                                key={req._id}
                                                onClick={() => toggleSelection(req._id)}
                                                className={`p-4 flex items-center gap-4 cursor-pointer transition-all ${selectedIds.includes(req._id) ? 'bg-info/10' : 'hover:bg-base-200/50'}`}
                                            >
                                                <div className={`h-5 w-5 rounded border flex items-center justify-center transition-all ${selectedIds.includes(req._id) ? 'bg-info border-info' : 'border-base-300'}`}>
                                                    {selectedIds.includes(req._id) && <CheckIcon className="h-3 w-3 text-info-content" />}
                                                </div>
                                                <div className="flex-1">
                                                    <p className="text-sm font-bold text-base-content">{req.requestingUser?.name}</p>
                                                    <p className="text-xs text-base-content/60">{req.fromLocation} ➔ {req.toLocation}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-xs font-bold text-warning bg-warning/10 px-2 py-0.5 rounded">
                                                        {new Date(req.startTime).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' })} {new Date(req.startTime).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                    <p className="text-[9px] text-base-content/40 uppercase font-black mt-1">Aciliyet: Normal</p>
                                                </div>
                                            </div>
                                        ))}
                                    </>
                                ) : (
                                    <div className="p-12 text-center text-base-content/40 italic text-sm">
                                        Bugün veya gelecek için bekleyen herhangi bir talep bulunmuyor.
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                </div>

                {/* SAĞ TARAF: ATAMA FORMU */}
                <div className="space-y-6">
                    <div className="bg-base-100 p-6 rounded-xl border border-base-200 shadow-sm sticky top-24">
                        <h3 className="text-sm font-bold text-base-content uppercase tracking-wider mb-6 flex items-center gap-2">
                            <UserGroupIcon className="h-5 w-5 text-info" /> Atama Detayları
                        </h3>

                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-base-content/60 uppercase">Grup/Sefer İsmi</label>
                                <input
                                    type="text"
                                    placeholder="Örn: Rektörlük Sabah Seferi"
                                    value={groupTitle}
                                    onChange={(e) => setGroupTitle(e.target.value)}
                                    className="w-full mt-1 bg-base-100 text-base-content border border-base-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-info transition-all"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-base-content/60 uppercase">Şoför Seçimi</label>
                                <select
                                    value={selectedDriverId}
                                    onChange={(e) => setSelectedDriverId(e.target.value)}
                                    className="w-full mt-1 bg-base-100 text-base-content border border-base-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-info transition-all"
                                >
                                    <option value="">Şoför Seçiniz...</option>
                                    {drivers.map(drv => (
                                        <option key={drv._id} value={drv._id}>{drv.name}</option>
                                    ))}
                                </select>
                            </div>

                            <button
                                onClick={handleManualAssign}
                                disabled={selectedIds.length === 0}
                                className="w-full bg-info hover:brightness-90 disabled:opacity-50 text-info-content py-3 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-95 shadow-sm"
                            >
                                <PaperAirplaneIcon className="h-4 w-4" /> SEFERİ ŞİMDİ ATA
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}