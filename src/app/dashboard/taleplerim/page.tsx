'use client';

import { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { TrashIcon, EyeIcon, EyeSlashIcon, PencilSquareIcon, XMarkIcon } from '@heroicons/react/24/outline';

enum RequestStatus {
  PENDING = 'pending',
  ASSIGNED = 'assigned',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

// ✅ SIRALAMA ÖNCELİĞİ (Senin istediğin sıra)
const statusPriority: Record<string, number> = {
  [RequestStatus.PENDING]: 1,
  [RequestStatus.ASSIGNED]: 2,
  [RequestStatus.COMPLETED]: 3,
  [RequestStatus.CANCELLED]: 4,
};

interface IVehicleRequest {
  _id: string;
  purpose: string;
  fromLocation: string;
  toLocation: string;
  status: RequestStatus;
  startTime: string;
  endTime: string;
  createdAt: string;
  willCarryItems: boolean;
  assignedDriver?: { name: string; };
}

const StatusBadge = ({ status }: { status: RequestStatus }) => {
  let colorClass = '';
  let text = status.toUpperCase();

  switch (status) {
    case RequestStatus.PENDING: colorClass = 'bg-yellow-100 text-yellow-800'; text = 'Beklemede'; break;
    case RequestStatus.ASSIGNED: colorClass = 'bg-blue-100 text-blue-800'; text = 'Atandı'; break;
    case RequestStatus.COMPLETED: colorClass = 'bg-green-100 text-green-800'; text = 'Tamamlandı'; break;
    case RequestStatus.CANCELLED: colorClass = 'bg-red-100 text-red-800'; text = 'İptal Edildi'; break;
  }
  return (
    <span className={`px-3 py-1 inline-flex text-xs font-semibold rounded-full ${colorClass}`}>
      {text}
    </span>
  );
};

const formatTRDate = (dateString: string) => {
  return new Date(dateString).toLocaleString('tr-TR', { day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' });
};

export default function MyRequestsPage() {
  const [requests, setRequests] = useState<IVehicleRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCancelled, setShowCancelled] = useState(false);

  const [editingRequest, setEditingRequest] = useState<IVehicleRequest | null>(null);
  const [editFormData, setEditFormData] = useState({
    purpose: '',
    fromLocation: '',
    customFromLocation: '',
    toLocation: '',
    customToLocation: '',
    startTime: '',
    endTime: '',
    willCarryItems: false
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [locations, setLocations] = useState<string[]>([]);
  const [locationsLoading, setLocationsLoading] = useState(true);

  useEffect(() => {
    const fetchRequests = async () => {
      setLoading(true);
      try {
        const res = await axios.get('/api/requests/my');
        setRequests(res.data);
      } catch (err) { console.error(err); }
      setLoading(false);
    };

    const fetchLocations = async () => {
      try {
        const locRes = await axios.get('/api/locations');
        if (locRes.data && Array.isArray(locRes.data.data)) {
          setLocations(locRes.data.data);
        }
      } catch (err) {
        console.error('Lokasyonlar yüklenemedi', err);
      } finally {
        setLocationsLoading(false);
      }
    };

    fetchRequests();
    fetchLocations();
  }, []);

  // ✅ SIRALAMA VE FİLTRELEME (useMemo ile performanslı)
  const filteredAndSortedRequests = useMemo(() => {
    let result = requests;
    if (!showCancelled) {
      result = result.filter(r => r.status !== RequestStatus.CANCELLED);
    }

    return [...result].sort((a, b) => {
      if (statusPriority[a.status] !== statusPriority[b.status]) {
        return statusPriority[a.status] - statusPriority[b.status];
      }
      return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
    });
  }, [requests, showCancelled]);

  const handleCancel = async (id: string) => {
    if (!confirm("Bu talebi iptal etmek istediğinize emin misiniz?")) return;
    try {
      await axios.put(`/api/requests/${id}/cancel`);
      setRequests(prev => prev.map(req => req._id === id ? { ...req, status: RequestStatus.CANCELLED } : req));
    } catch (err) { alert("Hata oluştu."); }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({ ...prev, [name]: value }));
  };

  const openEditModal = (req: IVehicleRequest) => {
    setEditingRequest(req);
    // Backend'deki UTC tarihi input'a uygun (YYYY-MM-DDThh:mm) formata çeviriyoruz
    const localStart = new Date(new Date(req.startTime).getTime() - new Date(req.startTime).getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    const localEnd = new Date(new Date(req.endTime).getTime() - new Date(req.endTime).getTimezoneOffset() * 60000).toISOString().slice(0, 16);

    const isFromKnown = locations.includes(req.fromLocation);
    const isToKnown = locations.includes(req.toLocation);

    setEditFormData({
      purpose: req.purpose,
      fromLocation: isFromKnown ? req.fromLocation : 'other',
      customFromLocation: isFromKnown ? '' : req.fromLocation,
      toLocation: isToKnown ? req.toLocation : 'other',
      customToLocation: isToKnown ? '' : req.toLocation,
      startTime: localStart,
      endTime: localEnd,
      willCarryItems: req.willCarryItems
    });
  };

  const closeEditModal = () => {
    setEditingRequest(null);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRequest) return;

    setIsSubmitting(true);
    const payload = {
      ...editFormData,
      fromLocation: editFormData.fromLocation === 'other' ? editFormData.customFromLocation : editFormData.fromLocation,
      toLocation: editFormData.toLocation === 'other' ? editFormData.customToLocation : editFormData.toLocation
    };

    try {
      // Backend tarihi UTC istiyor olabilir, veriyi string olarak atıyoruz o otomatik çevirecektir:
      const res = await axios.put(`/api/requests/${editingRequest._id}`, payload);

      setRequests(prev => prev.map(r => r._id === editingRequest._id ? { ...r, ...res.data } : r));
      closeEditModal();
    } catch (err: any) {
      alert("Güncelleme başarısız: " + (err.response?.data?.msg || err.message));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="h-8 w-8 animate-spin border-4 border-blue-600 border-t-transparent rounded-full"></div>
    </div>
  );

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <h2 className="text-2xl font-semibold text-gray-800">Araç Taleplerim</h2>
        <button
          onClick={() => setShowCancelled(!showCancelled)}
          className="flex items-center gap-2 text-xs font-semibold text-gray-500 hover:text-blue-600 transition-colors"
        >
          {showCancelled ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
          {showCancelled ? 'İptalleri Gizle' : 'İptalleri Göster'}
        </button>
      </div>

      {filteredAndSortedRequests.length === 0 ? (
        <div className="text-center text-gray-500 py-10 border-2 border-dashed border-gray-300 rounded-lg">
          <p>Henüz gösterilecek bir talebiniz bulunmuyor.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {filteredAndSortedRequests.map((req) => (
            <div
              key={req._id}
              className={`
                border border-gray-200 rounded-lg p-4 shadow-sm transition-all duration-300
                ${req.status === RequestStatus.PENDING
                  ? 'hover:shadow-[0_0_15px_rgba(250,204,21,0.4)] hover:border-yellow-300 bg-white'
                  : 'hover:shadow-md bg-white'}
                ${req.status === RequestStatus.ASSIGNED
                  ? 'hover:shadow-[0_0_15px_rgba(59,130,246,0.4)] hover:border-blue-300 bg-white'
                  : 'hover:shadow-md bg-white'}
                ${req.status === RequestStatus.COMPLETED
                  ? 'hover:shadow-[0_0_15px_rgba(34,197,94,0.4)] hover:border-green-300 bg-white'
                  : 'hover:shadow-md bg-white'}
                ${req.status === RequestStatus.CANCELLED ? 'opacity-60 bg-gray-50' : ''}
              `}
            >
              <div className="flex flex-col sm:flex-row justify-between sm:items-start">
                <div className="flex-1 mb-4 sm:mb-0">
                  <h3 className="text-lg font-semibold text-gray-900">{req.purpose}</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    <span className="font-bold">Güzergah:</span> {req.fromLocation} &rarr; {req.toLocation}
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    <span className="font-medium">Gidiş:</span> {formatTRDate(req.startTime)}
                    <br />
                    <span className="font-medium">Dönüş:</span> {formatTRDate(req.endTime)}
                  </p>
                  <p className="text-sm text-gray-500">
                    <strong>Eşyalı:</strong> {req.willCarryItems ? 'Evet' : 'Hayır'}
                  </p>
                </div>
                <div className="shrink-0 ml-0 sm:ml-4 sm:text-right space-y-2">
                  <StatusBadge status={req.status} />
                  <p className="text-sm text-gray-500">
                    <strong>Şoför:</strong> {req.assignedDriver ? req.assignedDriver.name : '—'}
                  </p>
                  {req.status === RequestStatus.PENDING && (
                    <div className="mt-2 flex items-center justify-end sm:justify-start gap-2">
                      <button
                        onClick={() => openEditModal(req)}
                        className='text-blue-600 hover:text-blue-800 transition-colors p-1'
                        title="Düzenle"
                      >
                        <PencilSquareIcon className='h-5 w-5' />
                      </button>
                      <button
                        onClick={() => handleCancel(req._id)}
                        className='text-red-600 hover:text-red-800 transition-colors p-1'
                        title="İptal Et"
                      >
                        <TrashIcon className='h-5 w-5' />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Düzenleme Modalı */}
      {editingRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-gray-100 bg-gray-50/50">
              <h3 className="font-semibold text-gray-800 text-lg">Talebi Düzenle</h3>
              <button onClick={closeEditModal} className="text-gray-400 hover:text-gray-600 transition-colors">
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-4 space-y-4 text-left">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kullanım Amacı</label>
                <input
                  type="text"
                  required
                  value={editFormData.purpose}
                  onChange={e => setEditFormData({ ...editFormData, purpose: e.target.value })}
                  className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nereden</label>
                  <select
                    name="fromLocation"
                    required
                    value={editFormData.fromLocation}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">{locationsLoading ? 'Yükleniyor...' : 'Seçiniz'}</option>
                    {locations.map((loc, idx) => <option key={idx} value={loc}>{loc}</option>)}
                    <option value="other" className="font-bold text-blue-600">+ DİĞER (Elle Gir)</option>
                  </select>
                  {editFormData.fromLocation === 'other' && (
                    <input
                      type="text"
                      name="customFromLocation"
                      required
                      placeholder="Lütfen belirtin..."
                      value={editFormData.customFromLocation}
                      onChange={handleInputChange}
                      className="mt-2 w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nereye</label>
                  <select
                    name="toLocation"
                    required
                    value={editFormData.toLocation}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">{locationsLoading ? 'Yükleniyor...' : 'Seçiniz'}</option>
                    {locations.map((loc, idx) => <option key={idx} value={loc}>{loc}</option>)}
                    <option value="other" className="font-bold text-blue-600">+ DİĞER (Elle Gir)</option>
                  </select>
                  {editFormData.toLocation === 'other' && (
                    <input
                      type="text"
                      name="customToLocation"
                      required
                      placeholder="Lütfen belirtin..."
                      value={editFormData.customToLocation}
                      onChange={handleInputChange}
                      className="mt-2 w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Gidiş Tarihi</label>
                  <input
                    type="datetime-local"
                    required
                    value={editFormData.startTime}
                    onChange={e => setEditFormData({ ...editFormData, startTime: e.target.value })}
                    className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Dönüş Tarihi</label>
                  <input
                    type="datetime-local"
                    required
                    value={editFormData.endTime}
                    onChange={e => setEditFormData({ ...editFormData, endTime: e.target.value })}
                    className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="flex items-center mt-2">
                <input
                  type="checkbox"
                  id="willCarryItems"
                  checked={editFormData.willCarryItems}
                  onChange={e => setEditFormData({ ...editFormData, willCarryItems: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="willCarryItems" className="ml-2 block text-sm text-gray-700">
                  Eşya Taşıncak
                </label>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  disabled={isSubmitting}
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 disabled:bg-blue-400"
                >
                  {isSubmitting ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}