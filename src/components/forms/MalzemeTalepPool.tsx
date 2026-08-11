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
  FunnelIcon,
  PrinterIcon,
  ArrowDownTrayIcon,
  EyeIcon,
  ClipboardDocumentCheckIcon,
  UserCircleIcon,
  CalendarIcon,
  DocumentTextIcon,
  ClipboardDocumentListIcon,
  PaperClipIcon,
  ArrowUturnLeftIcon
} from '@heroicons/react/24/outline';
import { IUser } from './MalzemeTalepForm';

export interface IMaterialRequestData {
  _id: string;
  batchId?: string;
  requester: IUser;
  materialType: string;
  materialName: string;
  quantity: number;
  unit: string;
  description?: string;
  specification?: string;
  specificationFileUrl?: string;
  specificationFileName?: string;
  location?: string;
  status: 'pending_supervisor' | 'pending_mali_isler' | 'approved' | 'rejected';
  supervisorReviewer?: IUser;
  supervisorNote?: string;
  supervisorReviewedAt?: string;
  maliIslerReviewer?: IUser;
  maliIslerNote?: string;
  maliIslerReviewedAt?: string;
  createdAt: string;
}

export interface IBatchGroup {
  batchId: string;
  requester: IUser;
  location?: string;
  createdAt: string;
  items: IMaterialRequestData[];
  status: 'pending_supervisor' | 'pending_mali_isler' | 'approved' | 'rejected';
}

export interface IActionLog {
  _id: string;
  batchId?: string;
  userName: string;
  userEmail: string;
  userRole: string;
  action: 'INSPECT' | 'DOWNLOAD' | 'REVIEW_APPROVE' | 'REVIEW_REJECT' | 'RELEASE_INSPECT';
  actionDetails?: string;
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

  // Logs state
  const [logsMap, setLogsMap] = useState<Record<string, { logs: IActionLog[]; counts: { inspectCount: number; downloadCount: number; totalClicks: number } }>>({});

  // Batch Detail / Action Modal State
  const [isBatchDetailModalOpen, setIsBatchDetailModalOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<IBatchGroup | null>(null);

  // Individual Review Modal State
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewItem, setReviewItem] = useState<IMaterialRequestData | null>(null);
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject'>('approve');
  const [reviewNote, setReviewNote] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  // Print Modal State
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printBatch, setPrintBatch] = useState<IBatchGroup | null>(null);

  // Edit Item Modal State (Personelin kendi talebini düzenlemesi için)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<IMaterialRequestData | null>(null);
  const [editFormData, setEditFormData] = useState({
    materialName: '',
    materialType: 'Kırtasiye',
    quantity: 1,
    unit: 'Adet',
    description: '',
    specification: ''
  });
  const [isEditingSubmitting, setIsEditingSubmitting] = useState(false);

  const handleOpenEditModal = (item: IMaterialRequestData) => {
    setEditingItem(item);
    setEditFormData({
      materialName: item.materialName || '',
      materialType: item.materialType || 'Kırtasiye',
      quantity: item.quantity || 1,
      unit: item.unit || 'Adet',
      description: item.description || '',
      specification: item.specification || ''
    });
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingItem) return;
    setIsEditingSubmitting(true);
    try {
      await axios.put(`/api/material-requests/${editingItem._id}`, editFormData);
      alert('Malzeme talebi başarıyla güncellendi!');
      setIsEditModalOpen(false);
      fetchRequests();
    } catch (err: any) {
      alert(err.response?.data?.msg || 'Düzenleme güncelleme hatası');
    } finally {
      setIsEditingSubmitting(false);
    }
  };

  // Log History Modal State
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [activeLogBatch, setActiveLogBatch] = useState<IBatchGroup | null>(null);
  const [activeLogs, setActiveLogs] = useState<IActionLog[]>([]);
  const [activeLogCounts, setActiveLogCounts] = useState({ inspectCount: 0, downloadCount: 0, totalClicks: 0 });
  const [loadingLogs, setLoadingLogs] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/material-requests');
      setRequests(res.data);
      fetchAllLogs();
    } catch (err) {
      console.error('Fetch material requests error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllLogs = async () => {
    try {
      const res = await axios.get('/api/material-requests/log');
      const allLogs: IActionLog[] = res.data.logs || [];

      // Group logs by batchId
      const map: Record<string, { logs: IActionLog[]; counts: { inspectCount: number; downloadCount: number; totalClicks: number } }> = {};

      allLogs.forEach((log) => {
        const bId = log.batchId || 'default';
        if (!map[bId]) {
          map[bId] = { logs: [], counts: { inspectCount: 0, downloadCount: 0, totalClicks: 0 } };
        }
        map[bId].logs.push(log);
        if (log.action === 'INSPECT') map[bId].counts.inspectCount++;
        if (log.action === 'DOWNLOAD') map[bId].counts.downloadCount++;
        map[bId].counts.totalClicks++;
      });

      // Her batch'in loglarını tarihe göre en yeni en başta olacak şekilde sırala
      Object.values(map).forEach((group) => {
        group.logs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      });

      setLogsMap(map);
    } catch (err) {
      console.error('Fetch logs error:', err);
    }
  };

  // Record Log API Call
  const recordActionLog = async (
    batchId: string,
    action: 'INSPECT' | 'DOWNLOAD' | 'RELEASE_INSPECT',
    actionDetails?: string
  ) => {
    try {
      let defaultMsg = 'Talep detayları incelendi';
      if (action === 'DOWNLOAD') defaultMsg = 'Talep belgesi indirildi/yazdırıldı';
      if (action === 'RELEASE_INSPECT') defaultMsg = 'Talebi incelemeyi bıraktı (İnceleme durumu kaldırıldı)';

      await axios.post('/api/material-requests/log', {
        batchId,
        action,
        actionDetails: actionDetails || defaultMsg
      });
      await fetchAllLogs();
    } catch (err) {
      console.error('Record log error:', err);
    }
  };

  // İncelemeyi Bırakma Handler
  const handleReleaseInspect = async (batch: IBatchGroup) => {
    try {
      await recordActionLog(
        batch.batchId,
        'RELEASE_INSPECT',
        `Talebi incelemeyi bıraktı (İnceleme serbest bırakıldı)`
      );
      await fetchAllLogs();
    } catch (err) {
      console.error('Release inspect error:', err);
    }
  };

  // 1 "İş" olarak gruplama (Batch grouping)
  const groupedBatches: IBatchGroup[] = React.useMemo(() => {
    const map: Record<string, IBatchGroup> = {};

    requests.forEach((req) => {
      const bId = req.batchId || `SINGLE-${req._id}`;
      if (!map[bId]) {
        map[bId] = {
          batchId: bId,
          requester: req.requester,
          location: req.location || 'Balgat Yerleşkesi',
          createdAt: req.createdAt,
          items: [],
          status: req.status
        };
      }
      map[bId].items.push(req);
    });

    // Düzeltilmiş Genel Onay Durumu Hesaplaması
    Object.values(map).forEach((group) => {
      const statuses = group.items.map(i => i.status);
      const activeStatuses = statuses.filter(s => s !== 'rejected');

      if (activeStatuses.length === 0) {
        group.status = 'rejected';
      } else if (activeStatuses.includes('pending_supervisor')) {
        group.status = 'pending_supervisor';
      } else if (activeStatuses.includes('pending_mali_isler')) {
        group.status = 'pending_mali_isler';
      } else if (activeStatuses.every(s => s === 'approved')) {
        group.status = 'approved';
      } else {
        group.status = 'approved';
      }
    });

    return Object.values(map);
  }, [requests]);

  // Filtered Batches
  const filteredBatches = groupedBatches.filter((batch) => {
    const term = searchTerm.toLowerCase().trim();

    if (statusFilter !== 'all' && batch.status !== statusFilter) {
      return false;
    }

    if (!term) return true;

    const requesterName = batch.requester?.name?.toLowerCase() || '';
    const requesterEmail = batch.requester?.email?.toLowerCase() || '';
    const batchIdStr = batch.batchId.toLowerCase();

    const itemsMatch = batch.items.some(
      (item) =>
        item.materialName.toLowerCase().includes(term) ||
        item.materialType.toLowerCase().includes(term) ||
        (item.description && item.description.toLowerCase().includes(term)) ||
        (item.specification && item.specification.toLowerCase().includes(term))
    );

    return (
      requesterName.includes(term) ||
      requesterEmail.includes(term) ||
      batchIdStr.includes(term) ||
      itemsMatch
    );
  });

  // Open "İşlem Yap / İncele" Modal
  const handleOpenInspectModal = (batch: IBatchGroup) => {
    setSelectedBatch(batch);
    setIsBatchDetailModalOpen(true);
    recordActionLog(batch.batchId, 'INSPECT', `"${batch.items.length} Kalem Malzeme" İşlem Yap / İncele butonuna tıklandı`);
  };

  // Open Print/Download Modal for a specific batch or all
  const handleOpenPrintModal = (batch?: IBatchGroup) => {
    setPrintBatch(batch || null);
    setIsPrintModalOpen(true);

    const targetBatchId = batch ? batch.batchId : 'ALL';
    recordActionLog(
      targetBatchId,
      'DOWNLOAD',
      batch ? `"${batch.items.length} Kalem Malzeme" için Çıktı / İndir butonuna tıklandı` : 'Tüm Talepler için Çıktı / İndir butonuna tıklandı'
    );
  };

  // Open Log History Modal
  const handleOpenLogModal = async (batch: IBatchGroup) => {
    setActiveLogBatch(batch);
    setIsLogModalOpen(true);
    setLoadingLogs(true);
    try {
      const res = await axios.get(`/api/material-requests/log?batchId=${encodeURIComponent(batch.batchId)}`);
      setActiveLogs(res.data.logs || []);
      setActiveLogCounts(res.data.counts || { inspectCount: 0, downloadCount: 0, totalClicks: 0 });
    } catch (err) {
      console.error('Fetch batch log error:', err);
    } finally {
      setLoadingLogs(false);
    }
  };

  // Individual item review modal
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

      // Record review log
      if (selectedBatch) {
        await axios.post('/api/material-requests/log', {
          batchId: selectedBatch.batchId,
          requestId: reviewItem._id,
          action: reviewAction === 'approve' ? 'REVIEW_APPROVE' : 'REVIEW_REJECT',
          actionDetails: `${reviewItem.materialName} için ${reviewAction === 'approve' ? 'Onay verildi' : 'Reddet kararı verildi'}`
        });
      }

      alert('Talep durumu başarıyla güncellendi!');
      setIsReviewModalOpen(false);
      fetchRequests();
    } catch (err: any) {
      alert(err.response?.data?.msg || 'Onay kaydetme hatası');
    } finally {
      setReviewSubmitting(false);
    }
  };

  // Toplu Tümünü Onayla Handler
  const handleBulkApproveBatch = async (batch: IBatchGroup, action: 'approve' | 'reject') => {
    const actionLabel = action === 'approve' ? 'onaylamak' : 'reddetmek';
    const confirmMsg = `Bu işe ait (${batch.items.length} adet) malzemelerin TÜMÜNÜ ${actionLabel} istediğinize emin misiniz?`;

    if (!confirm(confirmMsg)) return;

    setLoading(true);
    try {
      const res = await axios.post('/api/material-requests/bulk-status', {
        batchId: batch.batchId,
        action,
        note: action === 'approve' ? 'Toplu İşlem Onayı verildi' : 'Toplu Reddedildi'
      });

      alert(`🎉 ${res.data.msg}`);
      setIsBatchDetailModalOpen(false);
      fetchRequests();
    } catch (err: any) {
      alert(err.response?.data?.msg || 'Toplu işlem hatası oluştu');
    } finally {
      setLoading(false);
    }
  };

  // Export CSV Function
  const handleExportCSV = () => {
    const listToExport = printBatch ? printBatch.items : requests;

    if (listToExport.length === 0) {
      alert('İndirilecek malzeme talebi bulunamadı.');
      return;
    }

    const headers = [
      'İş / Talep Kodu',
      'Talep Eden',
      'E-Posta',
      'Malzemenin Cinsi',
      'Malzeme Adı',
      'Miktar',
      'Birim',
      'Gerekçe / Açıklama',
      'Teknik Şartname Metni',
      'Şartname Dosya Bağlantısı',
      'Durum',
      'Tarih'
    ];

    const rows = listToExport.map((item) => {
      let statusText = '1. Aşama Bekliyor';
      if (item.status === 'pending_mali_isler') statusText = '2. Aşama (Satın Alma) Bekliyor';
      if (item.status === 'approved') statusText = 'Tam Onaylandı';
      if (item.status === 'rejected') statusText = 'Reddedildi';

      const createdDate = item.createdAt ? new Date(item.createdAt).toLocaleDateString('tr-TR') : '';

      return [
        `"${item.batchId || ''}"`,
        `"${(item.requester?.name || '').replace(/"/g, '""')}"`,
        `"${(item.requester?.email || '').replace(/"/g, '""')}"`,
        `"${(item.materialType || '').replace(/"/g, '""')}"`,
        `"${(item.materialName || '').replace(/"/g, '""')}"`,
        `"${item.quantity || 0}"`,
        `"${(item.unit || '').replace(/"/g, '""')}"`,
        `"${(item.description || '').replace(/"/g, '""')}"`,
        `"${(item.specification || '').replace(/"/g, '""')}"`,
        `"${(item.specificationFileUrl || '').replace(/"/g, '""')}"`,
        `"${statusText}"`,
        `"${createdDate}"`
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Malzeme_Talepleri_Listesi_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    recordActionLog(printBatch?.batchId || 'ALL', 'DOWNLOAD', 'CSV / Excel dosyası indirildi');
  };

  const role = currentUser?.role;
  const isAdmin = role === 'admin';
  const isSupervisor = role === 'supervisor' || role === 'amir' || role === 'kanit_sorumlu';
  const isMaliIsler = role === 'mali_isler';

  return (
    <div className="w-full bg-base-100 p-6 md:p-8 rounded-3xl border border-base-200 shadow-sm space-y-6">
      {/* Header Banner & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-base-200 pb-4">
        <div>
          <h3 className="font-black text-xl text-base-content flex items-center gap-2.5">
            <ShoppingBagIcon className="h-7 w-7 text-primary" />
            Malzeme Talepleri Havuzu & İş Takibi
          </h3>
          <p className="text-xs text-base-content/70 mt-1">
            Satın alma talepleri başvuru başına <strong>1 İş</strong> olarak gruplandırılmıştır. İnceleme durumları ve loglar anlık takip edilir.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={fetchRequests}
            className="btn btn-ghost btn-sm btn-square rounded-xl"
            title="Listeyi Yenile"
          >
            <ArrowPathIcon className="h-4 w-4" />
          </button>

          {/* İndir (CSV / Excel) Butonu */}
          <button
            onClick={handleExportCSV}
            className="btn btn-outline btn-primary btn-sm gap-1.5 rounded-xl font-bold hover:scale-[1.02] transition-all"
            title="Tüm Listeyi Excel/CSV Formatında İndir"
          >
            <ArrowDownTrayIcon className="h-4 w-4" />
            <span>Excel / İndir</span>
          </button>

          {/* Tümünü Çıktı Al Butonu */}
          <button
            onClick={() => handleOpenPrintModal(undefined)}
            className="btn btn-primary btn-sm gap-1.5 rounded-xl font-bold shadow-md shadow-primary/20 hover:scale-[1.02] transition-all text-white"
            title="Tüm Talepleri Yazdır / Çıktı Al"
          >
            <PrinterIcon className="h-4 w-4" />
            <span>Tümünü Yazdır</span>
          </button>

          {onOpenNewFormModal && (
            <button
              onClick={onOpenNewFormModal}
              className="btn btn-secondary btn-sm gap-1.5 rounded-xl font-bold shadow-md"
            >
              <ShoppingBagIcon className="h-4 w-4" />
              <span>Yeni Talep</span>
            </button>
          )}
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
            placeholder="Kişi adı, e-posta, talep kodu, malzeme veya şartname adına göre arayın..."
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
            <option value="all">Tüm İşler / Talepler ({groupedBatches.length})</option>
            <option value="pending_supervisor">1. Aşama Bekleyenler</option>
            <option value="pending_mali_isler">2. Aşama (Satın Alma) Bekleyenler</option>
            <option value="approved">Tam Onaylananlar</option>
            <option value="rejected">Reddedilenler</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 space-y-2">
          <span className="loading loading-spinner loading-md text-primary"></span>
          <span className="text-xs font-semibold text-base-content/60">Talepler ve işler yükleniyor...</span>
        </div>
      ) : filteredBatches.length === 0 ? (
        <div className="p-16 text-center border-2 border-dashed border-base-300 rounded-2xl space-y-3">
          <ShoppingBagIcon className="h-12 w-12 text-base-content/30 mx-auto" />
          <p className="text-base font-bold text-base-content/70">
            {searchTerm || statusFilter !== 'all'
              ? 'Aramanıza veya filtrenize uygun malzeme talebi / iş bulunamadı.'
              : 'Henüz oluşturulmuş bir malzeme talebi bulunmuyor.'}
          </p>
        </div>
      ) : (
        /* Batch Grouped Table */
        <div className="overflow-x-auto rounded-2xl border border-base-200 shadow-xs relative">
          <table className="table w-full text-xs">
            <thead>
              <tr className="border-b border-base-200 bg-base-200/70 text-base-content/80 font-bold">
                <th className="font-extrabold p-3 min-w-[150px]">Talep / İş Kodu</th>
                <th className="font-extrabold p-3 min-w-[150px]">Talep Eden Kişi</th>
                <th className="font-extrabold p-3 min-w-[220px]">Talep Edilen Malzemeler (Kalemler)</th>
                <th className="font-extrabold p-3 min-w-[120px]">Tarih</th>
                <th className="font-extrabold p-3 min-w-[150px]">Genel Onay Durumu</th>
                <th className="font-extrabold p-3 min-w-[190px]">İnceleyen & Tıklama Logları</th>
                <th className="font-extrabold p-3 text-right sticky right-0 bg-base-200 z-10 min-w-[230px] shadow-xs">
                  Aksiyonlar
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredBatches.map((batch) => {
                const logData = logsMap[batch.batchId] || { logs: [], counts: { inspectCount: 0, downloadCount: 0, totalClicks: 0 } };
                const formattedDate = batch.createdAt ? new Date(batch.createdAt).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-';

                const specFileItem = batch.items.find(i => Boolean(i.specificationFileUrl && i.specificationFileUrl.trim()));
                const specTextItem = batch.items.find(i => Boolean(i.specification && i.specification.trim()));

                const hasSpecFile = Boolean(specFileItem?.specificationFileUrl);
                const specFileUrl = specFileItem?.specificationFileUrl?.trim();
                const specFileName = specFileItem?.specificationFileName?.trim();

                const hasSpecText = Boolean(specTextItem?.specification);

                // İnceleme durumları kontrolü (En son inceleme/bırakma logu)
                const inspectLogs = logData.logs ? logData.logs.filter(l => l.action === 'INSPECT' || l.action === 'RELEASE_INSPECT') : [];
                inspectLogs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                const latestInspectLog = inspectLogs.length > 0 ? inspectLogs[0] : null;

                const isCurrentlyInspected = latestInspectLog?.action === 'INSPECT';
                const isReleased = latestInspectLog?.action === 'RELEASE_INSPECT';
                const lastInspectorName = latestInspectLog?.userName || '';

                // Yenilenmiş Kibar Renk Tasarımı
                let rowBgClass = 'hover:bg-base-200/50 transition-colors';
                if (batch.status === 'approved') {
                  rowBgClass = 'border-l-4 border-l-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/10 hover:bg-emerald-50/40 transition-colors';
                } else if (batch.status === 'rejected') {
                  rowBgClass = 'border-l-4 border-l-rose-500 bg-rose-50/20 dark:bg-rose-950/10 hover:bg-rose-50/40 transition-colors';
                } else if (isCurrentlyInspected) {
                  rowBgClass = 'border-l-4 border-l-indigo-500 bg-indigo-50/30 dark:bg-indigo-950/15 hover:bg-indigo-50/50 transition-colors font-medium';
                } else if (isReleased) {
                  rowBgClass = 'border-l-4 border-l-amber-500 bg-amber-50/20 dark:bg-amber-950/10 hover:bg-amber-50/40 transition-colors';
                }

                return (
                  <tr key={batch.batchId} className={rowBgClass}>
                    {/* Batch / İş Kodu */}
                    <td>
                      <div className="font-black text-primary text-xs tracking-wider">
                        {batch.batchId.startsWith('SINGLE-') ? 'TEKLİ TALEP' : batch.batchId}
                      </div>
                      <div className="flex items-center gap-1 mt-1 flex-wrap">
                        {hasSpecFile && specFileUrl && (
                          <a
                            href={specFileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-accent btn-xs gap-1 font-bold text-[10px] rounded-lg shadow-xs hover:scale-105 transition-all text-white"
                            title={specFileName || 'Teknik Şartname Dosyasını İndir / Oku (PDF/Word)'}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <PaperClipIcon className="h-3 w-3" />
                            <span>Şartname Dosyası (PDF/Word)</span>
                          </a>
                        )}
                        {hasSpecText && !hasSpecFile && (
                          <span
                            className="badge badge-secondary/10 text-secondary border border-secondary/20 text-[10px] font-bold gap-1 cursor-pointer hover:bg-secondary/20 transition-all"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenInspectModal(batch);
                            }}
                            title="Teknik Şartname Metni Var (Görmek için tıklayın)"
                          >
                            <ClipboardDocumentListIcon className="h-3 w-3" /> Metin Şartname Var
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Requester Info */}
                    <td>
                      <div className="font-bold text-base-content text-sm">{batch.requester?.name || 'Kullanıcı'}</div>
                      <div className="text-[11px] text-base-content/60">{batch.requester?.email}</div>
                    </td>

                    {/* Malzemelerin Özeti */}
                    <td>
                      <div className="space-y-1">
                        {batch.items.slice(0, 3).map((item) => (
                          <div key={item._id} className="text-xs font-semibold text-base-content/90 flex items-center gap-1.5">
                            <span className="text-primary font-bold">• {item.materialName}</span>
                            <span className="text-base-content/60 text-[11px]">({item.quantity} {item.unit})</span>
                          </div>
                        ))}
                        {batch.items.length > 3 && (
                          <div className="text-[11px] font-bold text-secondary">
                            +{batch.items.length - 3} malzeme daha var...
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Tarih */}
                    <td>
                      <div className="text-xs font-medium text-base-content/80 flex items-center gap-1">
                        <CalendarIcon className="h-3.5 w-3.5 text-base-content/50" />
                        {formattedDate}
                      </div>
                    </td>

                    {/* Overall Status */}
                    <td>
                      {batch.status === 'pending_supervisor' && (
                        <span className="bg-amber-500/10 text-amber-600 border border-amber-500/20 px-2.5 py-1 rounded-full font-bold text-[11px] inline-flex items-center gap-1 animate-pulse shadow-xs">
                          <ClockIcon className="h-3.5 w-3.5" /> 1. Aşama Bekliyor
                        </span>
                      )}
                      {batch.status === 'pending_mali_isler' && (
                        <span className="bg-sky-500/10 text-sky-600 border border-sky-500/20 px-2.5 py-1 rounded-full font-bold text-[11px] inline-flex items-center gap-1 animate-pulse shadow-xs">
                          <BanknotesIcon className="h-3.5 w-3.5" /> 2. Aşama (Satın Alma) Bekliyor
                        </span>
                      )}
                      {batch.status === 'approved' && (
                        <span className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 px-2.5 py-1 rounded-full font-bold text-[11px] inline-flex items-center gap-1 shadow-xs">
                          <CheckCircleIcon className="h-3.5 w-3.5" /> Onaylandı
                        </span>
                      )}
                      {batch.status === 'rejected' && (
                        <span className="bg-rose-500/10 text-rose-600 border border-rose-500/20 px-2.5 py-1 rounded-full font-bold text-[11px] inline-flex items-center gap-1 shadow-xs">
                          <XCircleIcon className="h-3.5 w-3.5" /> Reddedildi
                        </span>
                      )}
                    </td>

                    {/* Inceleyen Personel & Log stats */}
                    <td>
                      <div className="space-y-1 text-[11px]">
                        {isCurrentlyInspected ? (
                          <div className="flex items-center gap-1 font-extrabold text-indigo-700 bg-indigo-500/15 px-2 py-0.5 rounded-lg border border-indigo-500/30 w-fit">
                            <EyeIcon className="h-3 w-3 text-indigo-700 shrink-0" />
                            <span className="truncate">İnceleyen: {lastInspectorName}</span>
                          </div>
                        ) : isReleased ? (
                          <div className="flex items-center gap-1 font-bold text-amber-700 bg-amber-500/15 px-2 py-0.5 rounded-lg border border-amber-500/30 w-fit">
                            <ArrowUturnLeftIcon className="h-3 w-3 text-amber-700 shrink-0" />
                            <span className="truncate">İnceleme Bırakıldı ({lastInspectorName})</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 font-semibold text-base-content/50 bg-base-200/80 px-2 py-0.5 rounded-lg w-fit">
                            <span>⚪ Henüz İncelemedi</span>
                          </div>
                        )}

                        <div className="font-bold text-base-content/80 flex items-center gap-1">
                          <span>👁️ İnceleme:</span>
                          <span className="text-primary font-black">{logData.counts.inspectCount} kez</span>
                        </div>
                        <div className="font-bold text-base-content/80 flex items-center gap-1">
                          <span>📥 İndirme:</span>
                          <span className="text-secondary font-black">{logData.counts.downloadCount} kez</span>
                        </div>
                        <button
                          onClick={() => handleOpenLogModal(batch)}
                          className="text-[10px] font-bold text-blue-600 hover:underline flex items-center gap-1 mt-0.5"
                        >
                          <ClipboardDocumentCheckIcon className="h-3 w-3" /> Log Detaylarını Gör
                        </button>
                      </div>
                    </td>

                    {/* Actions (Sticky Right Edge - Clean & Minimal) */}
                    <td className="text-right sticky right-0 z-10 transition-colors backdrop-blur-md bg-base-100/90">
                      <div className="flex items-center justify-end">
                        <button
                          onClick={() => handleOpenInspectModal(batch)}
                          className="btn btn-primary btn-xs font-bold rounded-lg hover:scale-105 transition-all shadow-xs gap-1 whitespace-nowrap"
                          title="Talebi ve Malzemeleri İncele / İşlem Yap"
                        >
                          <EyeIcon className="h-3.5 w-3.5" /> İncele / İşlem Yap
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* BATCH DETAIL / ACTIONS MODAL */}
      <Transition.Root show={isBatchDetailModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setIsBatchDetailModalOpen(false)}>
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
              <Dialog.Panel className="w-full max-w-5xl max-h-[92vh] bg-base-100 rounded-3xl shadow-2xl border border-base-200 flex flex-col overflow-hidden">
                {selectedBatch && (() => {
                  const modalSpecItem = selectedBatch.items.find(i => Boolean(i.specificationFileUrl && i.specificationFileUrl.trim()));
                  const modalSpecUrl = modalSpecItem?.specificationFileUrl?.trim();

                  return (
                    <div className="flex flex-col h-full overflow-hidden">
                      {/* Fixed Top Header */}
                      <div className="p-6 pb-4 border-b border-base-200 shrink-0 space-y-4 bg-base-100 z-10">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="badge badge-primary font-black text-xs">
                                {selectedBatch.batchId}
                              </span>
                              <span className="text-xs text-base-content/50 font-bold">
                                {new Date(selectedBatch.createdAt).toLocaleDateString('tr-TR')}
                              </span>
                            </div>
                            <h3 className="text-xl font-black text-base-content mt-1 flex items-center gap-2">
                              <ShoppingBagIcon className="h-6 w-6 text-primary" />
                              Talep Detayları & Satın Alma İnceleme Ekranı
                            </h3>
                          </div>
                          <button
                            onClick={() => setIsBatchDetailModalOpen(false)}
                            className="btn btn-ghost btn-xs btn-square rounded-xl"
                          >
                            <XMarkIcon className="h-5 w-5" />
                          </button>
                        </div>

                        {/* Requester Summary & Quick Controls Toolbar */}
                        <div className="p-3.5 bg-base-200/60 rounded-2xl border border-base-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
                          <div className="space-y-0.5">
                            <div className="text-[11px] font-bold text-base-content/60">Talep Eden Personel</div>
                            <div className="font-extrabold text-xs md:text-sm text-base-content flex items-center gap-1.5">
                              <UserCircleIcon className="h-4 w-4 text-primary shrink-0" />
                              <span>{selectedBatch.requester?.name || 'Kullanıcı'} ({selectedBatch.requester?.email})</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-wrap shrink-0">
                            {modalSpecUrl && (
                              <a
                                href={modalSpecUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-accent btn-xs gap-1.5 rounded-xl font-bold text-white shadow-xs"
                                title="Yüklenen Teknik Şartname Belgesini İndir / Aç (PDF/Word)"
                              >
                                <PaperClipIcon className="h-3.5 w-3.5" />
                                <span>Şartname Dosyası (PDF/Word)</span>
                              </a>
                            )}

                            <button
                              onClick={() => {
                                handleReleaseInspect(selectedBatch);
                                setIsBatchDetailModalOpen(false);
                              }}
                              className="btn btn-outline btn-warning btn-xs gap-1.5 rounded-xl font-bold"
                              title="İncelemeyi Bırak"
                            >
                              <ArrowUturnLeftIcon className="h-3.5 w-3.5" />
                              İncelemeyi Bırak
                            </button>

                            <button
                              onClick={() => {
                                setIsBatchDetailModalOpen(false);
                                handleOpenPrintModal(selectedBatch);
                              }}
                              className="btn btn-primary btn-xs gap-1.5 rounded-xl font-bold text-white shadow-xs"
                            >
                              <PrinterIcon className="h-3.5 w-3.5" />
                              İndir / Çıktı Al
                            </button>
                            <button
                              onClick={() => handleOpenLogModal(selectedBatch)}
                              className="btn btn-outline btn-secondary btn-xs gap-1.5 rounded-xl font-bold"
                            >
                              <ClipboardDocumentCheckIcon className="h-3.5 w-3.5" />
                              Loglar
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Scrollable Modal Content Body */}
                      <div className="p-6 overflow-y-auto flex-1 space-y-6">
                        {/* Toplu Onay / Reddet Banner */}
                        <div className="flex flex-wrap items-center justify-between gap-3 bg-base-200/70 p-3.5 rounded-2xl border border-base-200 shadow-xs">
                          <div className="text-xs font-black text-base-content flex items-center gap-2">
                            <ShoppingBagIcon className="h-5 w-5 text-primary" />
                            <span>Talep Edilen Malzemeler ({selectedBatch.items.length} Kalem Ürün)</span>
                          </div>

                          <div className="flex items-center gap-2 flex-wrap">
                            {selectedBatch.items.some(i => (isAdmin || isSupervisor) && i.status === 'pending_supervisor') && (
                              <button
                                onClick={() => handleBulkApproveBatch(selectedBatch, 'approve')}
                                className="btn btn-success btn-xs md:btn-sm gap-1.5 rounded-xl font-extrabold text-white shadow-md hover:scale-105 transition-all"
                                title="Bu işe ait TÜM malzemeleri 1. Aşamada tek tıkla toplu onaylar"
                              >
                                <CheckCircleIcon className="h-4 w-4" />
                                <span>1. Aşama Tümünü Onayla ({selectedBatch.items.filter(i => i.status === 'pending_supervisor').length} Ürün)</span>
                              </button>
                            )}

                            {selectedBatch.items.some(i => (isAdmin || isMaliIsler) && i.status === 'pending_mali_isler') && (
                              <button
                                onClick={() => handleBulkApproveBatch(selectedBatch, 'approve')}
                                className="btn btn-success btn-xs md:btn-sm gap-1.5 rounded-xl font-extrabold text-white shadow-md hover:scale-105 transition-all"
                                title="Bu işe ait TÜM malzemeleri 2. Aşamada (Mali İşler) tek tıkla toplu onaylar"
                              >
                                <CheckCircleIcon className="h-4 w-4" />
                                <span>2. Aşama Tümünü Onayla ({selectedBatch.items.filter(i => i.status === 'pending_mali_isler').length} Ürün)</span>
                              </button>
                            )}

                            {selectedBatch.items.some(i => i.status === 'pending_supervisor' || i.status === 'pending_mali_isler') && (
                              <button
                                onClick={() => handleBulkApproveBatch(selectedBatch, 'reject')}
                                className="btn btn-error btn-outline btn-xs md:btn-sm gap-1.5 rounded-xl font-bold hover:scale-105 transition-all"
                                title="Bu işe ait bekleyen tüm malzemeleri reddeder"
                              >
                                <XCircleIcon className="h-4 w-4" />
                                <span>Tümünü Reddet</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Scroll-safe Material Items Table */}
                        <div className="space-y-3">
                          <div className="overflow-x-auto max-h-[48vh] overflow-y-auto border border-base-200 rounded-2xl relative shadow-xs">
                            <table className="table table-zebra w-full text-xs">
                              <thead className="sticky top-0 z-20 bg-base-200/90 backdrop-blur-md shadow-xs">
                                <tr>
                                  <th className="font-bold w-10">#</th>
                                  <th className="font-bold">Malzemenin Cinsi</th>
                                  <th className="font-bold">Malzeme Adı</th>
                                  <th className="font-bold">Miktar / Birim</th>
                                  <th className="font-bold">Durum</th>
                                  <th className="font-bold text-right">Onay İşlemi</th>
                                </tr>
                              </thead>
                              <tbody>
                                {selectedBatch.items.map((item, idx) => {
                                  const canSupervisorApprove =
                                    (isAdmin || isSupervisor) && item.status === 'pending_supervisor';
                                  const isSameUserAsSupervisor = item.supervisorReviewer?._id === currentUser?._id;
                                  const canMaliIslerApprove =
                                    (isAdmin || isMaliIsler) &&
                                    item.status === 'pending_mali_isler' &&
                                    (!isSameUserAsSupervisor || isAdmin);

                                  const isOwner = currentUser?._id && item.requester?._id && String(item.requester._id) === String(currentUser._id);
                                  const canEdit = (isOwner || isAdmin) && item.status !== 'approved';

                                  return (
                                    <tr key={item._id}>
                                      <td className="font-bold text-center">{idx + 1}</td>
                                      <td>
                                        <span className="badge badge-ghost badge-sm font-bold">{item.materialType}</span>
                                      </td>
                                      <td className="font-bold text-sm text-base-content">{item.materialName}</td>
                                      <td className="font-black text-primary text-xs">
                                        {item.quantity} {item.unit}
                                      </td>
                                      <td>
                                        {item.status === 'pending_supervisor' && (
                                          <span className="text-amber-600 font-bold text-[11px]">1. Aşama Bekliyor</span>
                                        )}
                                        {item.status === 'pending_mali_isler' && (
                                          <span className="text-sky-600 font-bold text-[11px]">Satın Alma Bekliyor</span>
                                        )}
                                        {item.status === 'approved' && (
                                          <span className="text-emerald-600 font-bold text-[11px]">🟢 Onaylandı</span>
                                        )}
                                        {item.status === 'rejected' && (
                                          <span className="text-rose-600 font-bold text-[11px]">🔴 Reddedildi</span>
                                        )}
                                      </td>
                                      <td className="text-right">
                                        <div className="flex items-center justify-end gap-1 flex-wrap">
                                          {canEdit && (
                                            <button
                                              onClick={() => handleOpenEditModal(item)}
                                              className="btn btn-warning btn-xs font-bold rounded-lg gap-1"
                                              title="Talebini Düzenle"
                                            >
                                              ✏️ Düzenle
                                            </button>
                                          )}

                                          {canSupervisorApprove && (
                                            <>
                                              <button
                                                onClick={() => handleOpenReviewModal(item, 'approve')}
                                                className="btn btn-primary btn-xs font-bold rounded-lg"
                                              >
                                                1. Aşama Onayla
                                              </button>
                                              <button
                                                onClick={() => handleOpenReviewModal(item, 'reject')}
                                                className="btn btn-error btn-xs text-white font-bold rounded-lg"
                                              >
                                                Reddet
                                              </button>
                                            </>
                                          )}
                                          {canMaliIslerApprove && (
                                            <>
                                              <button
                                                onClick={() => handleOpenReviewModal(item, 'approve')}
                                                className="btn btn-success btn-xs text-white font-bold rounded-lg"
                                              >
                                                2. Aşama Onayla
                                              </button>
                                              <button
                                                onClick={() => handleOpenReviewModal(item, 'reject')}
                                                className="btn btn-error btn-xs text-white font-bold rounded-lg"
                                              >
                                                Reddet
                                              </button>
                                            </>
                                          )}
                                          {!canEdit && !canSupervisorApprove && !canMaliIslerApprove && (
                                            <span className="text-[11px] text-base-content/40 italic">Tamamlandı / Yetki Dışı</span>
                                          )}
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* Shared Gerekçe & Şartname Display in Inspect Modal */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                          {selectedBatch.items.find(i => i.description)?.description && (
                            <div className="p-4 bg-base-200/50 rounded-2xl border border-base-200 space-y-1">
                              <div className="font-extrabold text-xs text-base-content flex items-center gap-1.5">
                                <DocumentTextIcon className="h-4 w-4 text-primary" />
                                Talep Gerekçesi / Açıklama:
                              </div>
                              <p className="text-xs text-base-content/80 leading-relaxed">
                                {selectedBatch.items.find(i => i.description)?.description}
                              </p>
                            </div>
                          )}

                          {selectedBatch.items.find(i => i.specification)?.specification && (
                            <div className="p-4 bg-base-200/50 rounded-2xl border border-base-200 space-y-1">
                              <div className="font-extrabold text-xs text-base-content flex items-center gap-1.5">
                                <ClipboardDocumentListIcon className="h-4 w-4 text-secondary" />
                                Teknik Şartname / Özel Detaylar:
                              </div>
                              <p className="text-xs text-base-content/80 leading-relaxed">
                                {selectedBatch.items.find(i => i.specification)?.specification}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Yüklenen Şartname DOSYASI İndir / Görüntüle Butonu */}
                        {modalSpecUrl && (
                          <div className="p-4 bg-accent/10 border border-accent/20 rounded-2xl flex items-center justify-between gap-4">
                            <div className="space-y-0.5">
                              <div className="font-extrabold text-xs text-accent flex items-center gap-1.5">
                                <PaperClipIcon className="h-4 w-4 text-accent" />
                                Yüklenen Teknik Şartname Dosyası:
                              </div>
                              <div className="text-xs font-bold text-base-content">
                                {selectedBatch.items.find(i => i.specificationFileName)?.specificationFileName || 'Ekli Şartname Belgesi'}
                              </div>
                            </div>

                            <a
                              href={modalSpecUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn btn-accent btn-sm gap-1.5 font-bold rounded-xl text-white shadow-md shrink-0"
                            >
                              <ArrowDownTrayIcon className="h-4 w-4" />
                              Şartname Dosyasını İndir / Aç (PDF/Word)
                            </a>
                          </div>
                        )}
                      </div>

                      {/* Fixed Footer Bottom */}
                      <div className="p-4 px-6 border-t border-base-200 bg-base-200/40 shrink-0 flex items-center justify-between">
                        <div className="text-xs font-bold text-base-content/60">
                          Toplam {selectedBatch.items.length} Kalem Malzeme İnceleniyor
                        </div>
                        <button
                          onClick={() => setIsBatchDetailModalOpen(false)}
                          className="btn btn-primary btn-sm rounded-xl font-bold text-white shadow-md"
                        >
                          Kapat
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition.Root>

      {/* LOG HISTORY MODAL */}
      <Transition.Root show={isLogModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setIsLogModalOpen(false)}>
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
              <Dialog.Panel className="w-full max-w-2xl bg-base-100 rounded-3xl p-6 md:p-8 shadow-2xl border border-base-200 space-y-6">
                <div className="flex items-center justify-between border-b border-base-200 pb-3">
                  <div>
                    <h3 className="text-lg font-black text-base-content flex items-center gap-2">
                      <ClipboardDocumentCheckIcon className="h-6 w-6 text-primary" />
                      Erişim ve Tıklama Logları
                    </h3>
                    <p className="text-xs text-base-content/60 mt-0.5">
                      İncele, İncelemeyi Bırak ve İndir butonlarına kimlerin kaç kez tıkladığı anlık kayıt altına alınır.
                    </p>
                  </div>
                  <button
                    onClick={() => setIsLogModalOpen(false)}
                    className="btn btn-ghost btn-xs btn-square rounded-xl"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>

                {/* Log Summary Statistics */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3.5 bg-primary/10 rounded-2xl border border-primary/20 text-center">
                    <div className="text-xs font-bold text-primary">👁️ Toplam İnceleme</div>
                    <div className="text-xl font-black text-primary">{activeLogCounts.inspectCount} kez</div>
                  </div>
                  <div className="p-3.5 bg-secondary/10 rounded-2xl border border-secondary/20 text-center">
                    <div className="text-xs font-bold text-secondary">📥 Toplam İndirme</div>
                    <div className="text-xl font-black text-secondary">{activeLogCounts.downloadCount} kez</div>
                  </div>
                  <div className="p-3.5 bg-accent/10 rounded-2xl border border-accent/20 text-center">
                    <div className="text-xs font-bold text-accent">📊 Toplam Tıklama</div>
                    <div className="text-xl font-black text-accent">{activeLogCounts.totalClicks} kez</div>
                  </div>
                </div>

                {/* Detailed Logs List */}
                <div className="space-y-2">
                  <h4 className="font-bold text-xs text-base-content/70">Zaman Damgalı İşlem Logları</h4>

                  {loadingLogs ? (
                    <div className="p-8 text-center">
                      <span className="loading loading-spinner loading-sm text-primary"></span>
                    </div>
                  ) : activeLogs.length === 0 ? (
                    <div className="p-8 text-center border border-dashed rounded-2xl text-xs text-base-content/50 font-bold">
                      Henüz kaydedilmiş bir tıklama / erişim logu bulunmuyor.
                    </div>
                  ) : (
                    <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                      {activeLogs.map((log) => {
                        const dateStr = log.createdAt ? new Date(log.createdAt).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '';

                        let badgeClass = 'bg-primary/10 text-primary';
                        let actionLabel = '👁️ İnceleme / İşlem Yap';
                        if (log.action === 'DOWNLOAD') {
                          badgeClass = 'bg-secondary/10 text-secondary';
                          actionLabel = '📥 İndirme / Çıktı';
                        } else if (log.action === 'RELEASE_INSPECT') {
                          badgeClass = 'bg-amber-500/10 text-amber-600 border border-amber-500/20';
                          actionLabel = '↩️ İnceleme Bırakıldı';
                        } else if (log.action === 'REVIEW_APPROVE') {
                          badgeClass = 'bg-emerald-500/10 text-emerald-600';
                          actionLabel = '🟢 Onay Verildi';
                        } else if (log.action === 'REVIEW_REJECT') {
                          badgeClass = 'bg-rose-500/10 text-rose-600';
                          actionLabel = '🔴 Reddet Kararı';
                        }

                        return (
                          <div
                            key={log._id}
                            className="p-3 rounded-2xl bg-base-200/40 border border-base-200 text-xs flex items-center justify-between gap-3"
                          >
                            <div className="space-y-0.5">
                              <div className="font-bold text-base-content flex items-center gap-1.5">
                                <UserCircleIcon className="h-4 w-4 text-base-content/60" />
                                {log.userName} ({log.userEmail})
                              </div>
                              <div className="text-[11px] text-base-content/60">
                                {log.actionDetails || 'Aksiyon tamamlandı'}
                              </div>
                            </div>

                            <div className="text-right space-y-1">
                              <span className={`px-2.5 py-0.5 rounded-full font-black text-[10px] inline-block ${badgeClass}`}>
                                {actionLabel}
                              </span>
                              <div className="text-[10px] text-base-content/50 font-mono">
                                {dateStr}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="flex justify-end pt-2 border-t border-base-200">
                  <button
                    onClick={() => setIsLogModalOpen(false)}
                    className="btn btn-ghost btn-sm rounded-xl font-bold"
                  >
                    Kapat
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition.Root>

      {/* INDIVIDUAL ITEM REVIEW ACTION MODAL */}
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

                {reviewItem && (() => {
                  const itemSpecUrl = reviewItem.specificationFileUrl?.trim() || requests.find(r => r.batchId === reviewItem.batchId && r.specificationFileUrl)?.specificationFileUrl?.trim();
                  const itemSpecName = reviewItem.specificationFileName?.trim() || requests.find(r => r.batchId === reviewItem.batchId && r.specificationFileName)?.specificationFileName?.trim();

                  return (
                    <div className="space-y-4">
                      <div className="p-3.5 bg-base-200/70 rounded-2xl text-xs space-y-2 border border-base-200">
                        <div className="font-bold text-base-content text-sm">
                          {reviewItem.materialName} ({reviewItem.quantity} {reviewItem.unit})
                        </div>
                        <div className="text-base-content/70 font-semibold">Cinsi: {reviewItem.materialType}</div>
                        <div className="text-base-content/70 font-semibold">Talep Eden: {reviewItem.requester?.name}</div>

                        {reviewItem.description && (
                          <div className="pt-2 border-t border-base-300/60">
                            <span className="font-extrabold text-base-content flex items-center gap-1">
                              <DocumentTextIcon className="h-3.5 w-3.5 text-primary" />
                              Talep Gerekçesi / Açıklama:
                            </span>
                            <p className="text-[11px] text-base-content/80 mt-0.5 leading-relaxed">{reviewItem.description}</p>
                          </div>
                        )}

                        {reviewItem.specification && (
                          <div className="pt-2 border-t border-base-300/60">
                            <span className="font-extrabold text-base-content flex items-center gap-1">
                              <ClipboardDocumentListIcon className="h-3.5 w-3.5 text-secondary" />
                              Teknik Şartname Metni:
                            </span>
                            <p className="text-[11px] text-base-content/80 mt-0.5 leading-relaxed">{reviewItem.specification}</p>
                          </div>
                        )}

                        {itemSpecUrl && (
                          <div className="pt-2 border-t border-base-300/60">
                            <a
                              href={itemSpecUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn btn-accent btn-xs gap-1.5 font-bold rounded-xl text-white shadow-xs w-full py-2 flex items-center justify-center"
                            >
                              <PaperClipIcon className="h-4 w-4" />
                              {itemSpecName || 'Ekli Şartname Dosyasını İndir / Oku (PDF/Word)'}
                            </a>
                          </div>
                        )}
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
                  );
                })()}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition.Root>

      {/* EDIT MATERIAL ITEM MODAL */}
      <Transition.Root show={isEditModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setIsEditModalOpen(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-base-content/50 backdrop-blur-sm" />
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
              <Dialog.Panel className="w-full max-w-lg bg-base-100 rounded-3xl p-6 md:p-8 shadow-2xl border border-base-200 space-y-6">
                <div className="flex items-center justify-between border-b border-base-200 pb-3">
                  <div>
                    <h3 className="text-lg font-black text-base-content flex items-center gap-2">
                      ✏️ Malzeme Talebini Düzenle
                    </h3>
                    <p className="text-xs text-base-content/60 mt-0.5">
                      Talep bilgilerinizi düzenleyip güncelleyebilirsiniz.
                    </p>
                  </div>
                  <button
                    onClick={() => setIsEditModalOpen(false)}
                    className="btn btn-ghost btn-xs btn-square rounded-xl"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>

                <div className="space-y-4 text-xs">
                  <div>
                    <label className="label font-bold text-base-content">Malzeme Adı *</label>
                    <input
                      type="text"
                      className="input input-bordered w-full rounded-xl text-xs font-bold"
                      value={editFormData.materialName}
                      onChange={(e) => setEditFormData({ ...editFormData, materialName: e.target.value })}
                      placeholder="Örn: A4 Fotokopi Kağıdı"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label font-bold text-base-content">Malzemenin Cinsi</label>
                      <select
                        className="select select-bordered w-full rounded-xl text-xs font-bold"
                        value={editFormData.materialType}
                        onChange={(e) => setEditFormData({ ...editFormData, materialType: e.target.value })}
                      >
                        <option value="Kırtasiye">Kırtasiye</option>
                        <option value="Temizlik">Temizlik</option>
                        <option value="Tıbbi Malzeme">Tıbbi Malzeme</option>
                        <option value="Teknik / Hırdavat">Teknik / Hırdavat</option>
                        <option value="Elektronik / BT">Elektronik / BT</option>
                        <option value="Demirbaş">Demirbaş</option>
                        <option value="Diğer">Diğer</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="label font-bold text-base-content">Miktar</label>
                        <input
                          type="number"
                          min="1"
                          className="input input-bordered w-full rounded-xl text-xs font-bold"
                          value={editFormData.quantity}
                          onChange={(e) => setEditFormData({ ...editFormData, quantity: Number(e.target.value) })}
                        />
                      </div>
                      <div>
                        <label className="label font-bold text-base-content">Birim</label>
                        <input
                          type="text"
                          className="input input-bordered w-full rounded-xl text-xs font-bold"
                          value={editFormData.unit}
                          onChange={(e) => setEditFormData({ ...editFormData, unit: e.target.value })}
                          placeholder="Adet, Kutu, Paket"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="label font-bold text-base-content">Talep Gerekçesi / Açıklama</label>
                    <textarea
                      className="textarea textarea-bordered w-full rounded-xl text-xs"
                      rows={2}
                      value={editFormData.description}
                      onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                      placeholder="Neden talep edildiği..."
                    ></textarea>
                  </div>

                  <div>
                    <label className="label font-bold text-base-content">Teknik Şartname / Detaylar</label>
                    <textarea
                      className="textarea textarea-bordered w-full rounded-xl text-xs"
                      rows={2}
                      value={editFormData.specification}
                      onChange={(e) => setEditFormData({ ...editFormData, specification: e.target.value })}
                      placeholder="Ölçü, marka, model, standart vb..."
                    ></textarea>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-base-200">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="btn btn-ghost btn-sm rounded-xl font-bold"
                  >
                    İptal
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveEdit}
                    disabled={isEditingSubmitting || !editFormData.materialName.trim()}
                    className="btn btn-primary btn-sm rounded-xl font-bold text-white shadow-md gap-1"
                  >
                    {isEditingSubmitting ? <span className="loading loading-spinner loading-xs"></span> : 'Kaydet ve Güncelle'}
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition.Root>

      {/* PRINT & OUTPUT REPORT MODAL */}
      <Transition.Root show={isPrintModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setIsPrintModalOpen(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-base-content/50 backdrop-blur-sm" />
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
              <Dialog.Panel className="w-full max-w-4xl bg-white text-gray-900 rounded-3xl p-6 md:p-8 shadow-2xl border border-gray-200 space-y-6">
                {/* Print Controls */}
                <div className="flex items-center justify-between border-b pb-4 print:hidden">
                  <div className="flex items-center gap-2">
                    <PrinterIcon className="h-6 w-6 text-blue-600" />
                    <h3 className="font-extrabold text-lg text-gray-900">
                      Malzeme Talep Resmi Çıktı / İndirme Belgesi
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleExportCSV}
                      className="btn btn-outline btn-sm gap-1.5 rounded-xl font-bold"
                    >
                      <ArrowDownTrayIcon className="h-4 w-4" />
                      CSV / Excel İndir
                    </button>
                    <button
                      onClick={() => window.print()}
                      className="btn btn-primary btn-sm gap-1.5 rounded-xl font-bold text-white shadow-md"
                    >
                      <PrinterIcon className="h-4 w-4" />
                      Yazdır / PDF Olarak Kaydet
                    </button>
                    <button
                      onClick={() => setIsPrintModalOpen(false)}
                      className="btn btn-ghost btn-sm btn-square rounded-xl"
                    >
                      <XMarkIcon className="h-5 w-5 text-gray-500" />
                    </button>
                  </div>
                </div>

                {/* Printable Document Area */}
                {(() => {
                  const printItems = printBatch ? printBatch.items : requests;
                  const requesterName = printBatch ? printBatch.requester?.name : (requests[0]?.requester?.name || 'Sistem Kullanıcısı');
                  const supervisorUser = printItems.find(i => i.supervisorReviewer)?.supervisorReviewer;
                  const maliIslerUser = printItems.find(i => i.maliIslerReviewer)?.maliIslerReviewer;

                  const supervisorName = supervisorUser ? supervisorUser.name : 'Onay Bekliyor / İşlem Yapılmadı';
                  const maliIslerName = maliIslerUser ? maliIslerUser.name : 'Onay Bekliyor / İşlem Yapılmadı';

                  const sharedDesc = printItems.find(i => i.description)?.description || '';
                  const sharedSpec = printItems.find(i => i.specification)?.specification || '';
                  const sharedSpecFileUrl = printItems.find(i => i.specificationFileUrl)?.specificationFileUrl || '';
                  const sharedSpecFileName = printItems.find(i => i.specificationFileName)?.specificationFileName || '';

                  return (
                    <div className="printable-document space-y-6 font-sans">
                      {/* Institutional Header */}
                      <div className="text-center border-b-2 border-gray-800 pb-4 space-y-1">
                        <h2 className="text-lg font-black tracking-wide uppercase text-blue-950">
                          YÜKSEK İHTİSAS ÜNİVERSİTESİ
                        </h2>
                        <h3 className="text-sm font-bold uppercase text-gray-700">
                          MALZEME TALEP İCMAL VE ONAY FORMU
                        </h3>
                        <div className="flex justify-between items-center text-[11px] text-gray-500 pt-2 px-2">
                          <span>Form Tarihi: {new Date().toLocaleDateString('tr-TR')}</span>
                          <span>
                            Talep Kodu: {printBatch ? printBatch.batchId : 'Tüm Talepler'}
                          </span>
                        </div>
                      </div>

                      {/* Printable Requests Table */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left border-collapse border border-gray-300">
                          <thead>
                            <tr className="bg-gray-100 text-gray-900 border-b border-gray-300">
                              <th className="border border-gray-300 p-2 font-bold w-8 text-center">#</th>
                              <th className="border border-gray-300 p-2 font-bold">Malzemenin Cinsi</th>
                              <th className="border border-gray-300 p-2 font-bold">Malzeme Adı / Tanımı</th>
                              <th className="border border-gray-300 p-2 font-bold text-center">Miktar / Birim</th>
                              <th className="border border-gray-300 p-2 font-bold text-center">Durum</th>
                            </tr>
                          </thead>
                          <tbody>
                            {printItems.map((item, idx) => {
                              let statusLabel = '1. Aşama Bekliyor';
                              if (item.status === 'pending_mali_isler') statusLabel = 'Satın Alma Bekliyor';
                              if (item.status === 'approved') statusLabel = 'Tam Onaylandı';
                              if (item.status === 'rejected') statusLabel = 'Reddedildi';

                              return (
                                <tr key={item._id} className="border-b border-gray-200">
                                  <td className="border border-gray-300 p-2 text-center font-bold">{idx + 1}</td>
                                  <td className="border border-gray-300 p-2 font-semibold">{item.materialType}</td>
                                  <td className="border border-gray-300 p-2 font-bold text-gray-900">{item.materialName}</td>
                                  <td className="border border-gray-300 p-2 text-center font-bold">
                                    {item.quantity} {item.unit}
                                  </td>
                                  <td className="border border-gray-300 p-2 text-center font-bold">
                                    {statusLabel}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Shared Gerekçe, Şartname & Ekli Dosya Display in Print */}
                      {(sharedDesc || sharedSpec || sharedSpecFileUrl) && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                          {sharedDesc && (
                            <div className="p-3 bg-gray-50 border border-gray-300 rounded-xl space-y-1">
                              <div className="font-extrabold text-gray-900">Talep Gerekçesi / Açıklama:</div>
                              <div className="text-gray-700 leading-relaxed">{sharedDesc}</div>
                            </div>
                          )}
                          {(sharedSpec || sharedSpecFileUrl) && (
                            <div className="p-3 bg-gray-50 border border-gray-300 rounded-xl space-y-1">
                              <div className="font-extrabold text-gray-900">Teknik Şartname / Özel Detaylar:</div>
                              {sharedSpec && <div className="text-gray-700 leading-relaxed mb-1">{sharedSpec}</div>}
                              {sharedSpecFileUrl && (
                                <div className="font-bold text-blue-700 underline flex items-center gap-1 pt-1 border-t border-gray-200">
                                  📄 Ekli Şartname Dosyası: {sharedSpecFileName || 'Dosyayı İndir (PDF/Word)'}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Institutional Signatures / Approvers Section */}
                      <div className="grid grid-cols-3 gap-4 pt-6 text-center text-xs">
                        <div className="p-4 bg-gray-50 border border-gray-300 rounded-2xl space-y-1.5">
                          <div className="font-black text-gray-900 uppercase tracking-wider text-[11px]">TALEP EDEN</div>
                          <div className="text-sm font-extrabold text-blue-900">{requesterName}</div>
                        </div>

                        <div className="p-4 bg-gray-50 border border-gray-300 rounded-2xl space-y-1.5">
                          <div className="font-black text-gray-900 uppercase tracking-wider text-[11px]">GENEL SEKRETERLİK / BİRİM AMİRİ</div>
                          <div className="text-sm font-extrabold text-blue-900">{supervisorName}</div>
                        </div>

                        <div className="p-4 bg-gray-50 border border-gray-300 rounded-2xl space-y-1.5">
                          <div className="font-black text-gray-900 uppercase tracking-wider text-[11px]">SATIN ALMA / MALİ İŞLER DAİRESİ</div>
                          <div className="text-sm font-extrabold text-blue-900">{maliIslerName}</div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition.Root>
    </div>
  );
}
