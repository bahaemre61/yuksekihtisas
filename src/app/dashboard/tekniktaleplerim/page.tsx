'use client'; 

import { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { TrashIcon, PencilSquareIcon, XMarkIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

enum RequestStatus {
  PENDING = 'pending',
  ASSIGNED = 'assigned',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

// Teknik Talep Veri Tipi
interface ITechnicalRequest {
  _id: string;
  title: string;
  description: string;
  location: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  status: RequestStatus;
  createdAt: string;
  technicalStaff?: { _id: string, name: string, title?: string }[];
}

const StatusBadge = ({ status }: { status: RequestStatus }) => {
  let colorClass = '';
  let text = status.toUpperCase();

  switch (status) {
    case RequestStatus.PENDING:
      colorClass = 'bg-yellow-100 text-yellow-800';
      text = 'Beklemede';
      break;
    case RequestStatus.ASSIGNED:
      colorClass = 'bg-blue-100 text-blue-800';
      text = 'İşleme Alındı';
      break;
    case RequestStatus.COMPLETED:
      colorClass = 'bg-green-100 text-green-800';
      text = 'Tamamlandı';
      break;
    case RequestStatus.CANCELLED:
      colorClass = 'bg-red-100 text-red-800';
      text = 'İptal Edildi';
      break;
  }
  return (
    <span className={`px-3 py-1 inline-flex text-xs font-semibold rounded-full ${colorClass}`}>
      {text}
    </span>
  );
};

const PriorityBadge = ({ priority }: { priority: string }) => {
  let color = 'bg-gray-100 text-gray-800';
  let label = 'Normal';

  if (priority === 'HIGH') { color = 'bg-red-100 text-red-800'; label = 'ACİL'; }
  else if (priority === 'MEDIUM') { color = 'bg-orange-100 text-orange-800'; label = 'Orta'; }
  else { color = 'bg-green-100 text-green-800'; label = 'Düşük'; }

  return <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${color}`}>{label}</span>;
}

const formatTRDate = (dateString : string) =>{
  return new Date(dateString).toLocaleString('tr-TR',{
    day : 'numeric',
    month : 'long',
    hour : '2-digit',
    minute : '2-digit'
  })
}

export default function MyRequestsPage() {
  const [requests, setRequests] = useState<ITechnicalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editingRequest, setEditingRequest] = useState<ITechnicalRequest | null>(null);
  const [editFormData, setEditFormData] = useState({
    title: '',
    description: '',
    location: '',
    customLocation: '',
    priority: 'MEDIUM'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [locations, setLocations] = useState<string[]>([]);
  const [locationsLoading, setLocationsLoading] = useState(true);
  const [canSelectHighPriority, setCanSelectHighPriority] = useState(false);
  const [showCancelled, setShowCancelled] = useState(false);

  // Verileri Çek
  useEffect(() => {
    const fetchRequests = async () => {
      setLoading(true);
      setError(null);
      try {
        // API endpointimiz
        const res = await axios.get('/api/technicalrequests/my'); 
        if(res.data.success) {
            setRequests(res.data.data);
        }
      } catch (err: any) {
        console.error("Talepler yüklenemedi", err);
        setError(err.response?.data?.msg || "Talepler yüklenirken bir hata oluştu.");
      }
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

    const checkUserRole = async () => {
      try {
        const res = await axios.get('/api/me'); 
        const data = res.data;
        if (['admin', 'amir', 'ADMIN', 'AMIR', 'TECHAMIR', 'techamir', 'SUPERVISOR', 'supervisor'].includes(data.role)) {
          setCanSelectHighPriority(true);
        }
      } catch (error) {
        console.error('Yetki kontrolü yapılamadı', error);
      }
    };
    
    fetchRequests();
    fetchLocations();
    checkUserRole();
  }, []); 

  const filteredRequests = useMemo(() => {
    let result = requests;
    if (!showCancelled) {
      result = result.filter(r => r.status !== RequestStatus.CANCELLED);
    }
    return result;
  }, [requests, showCancelled]);

  // İptal Fonksiyonu
  const handleCancel = async(requestId: string) =>{
    if(!confirm("Bu talebi iptal etmek istediğinize emin misiniz?")) return;

    try{
      await axios.put('/api/technicalrequests/cancel', { requestId });

      setRequests((prev) =>
        prev.map((req)=>
          req._id === requestId ? {...req, status: RequestStatus.CANCELLED}: req
      ));
    }catch(err : any){
      alert(err.response?.data?.msg || "İptal işlemi başarısız oldu.");
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({ ...prev, [name]: value }));
  };

  const openEditModal = (req: ITechnicalRequest) => {
    setEditingRequest(req);
    const isKnown = locations.includes(req.location);
    setEditFormData({
      title: req.title,
      description: req.description,
      location: isKnown ? req.location : 'other',
      customLocation: isKnown ? '' : req.location,
      priority: req.priority
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
      location: editFormData.location === 'other' ? editFormData.customLocation : editFormData.location
    };

    try {
      const res = await axios.put(`/api/technicalrequests/${editingRequest._id}`, payload);
      
      setRequests((prev) =>
        prev.map((req) =>
          req._id === editingRequest._id ? { ...req, ...res.data.data } : req
        )
      );
      closeEditModal();
    } catch (err: any) {
      alert("Güncelleme başarısız: " + (err.response?.data?.msg || err.message));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <svg className="h-8 w-8 animate-spin text-orange-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    );
  }

  if (error) {
     return (
       <div className="rounded-md bg-red-100 p-4 border border-red-300">
         <p className="text-sm font-medium text-red-700">{error}</p>
       </div>
     );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <h2 className="text-2xl font-semibold text-gray-800">Teknik Taleplerim</h2>
        <button 
          onClick={() => setShowCancelled(!showCancelled)}
          className="flex items-center gap-2 text-xs font-semibold text-gray-500 hover:text-blue-600 transition-colors"
        >
          {showCancelled ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
          {showCancelled ? 'İptalleri Gizle' : 'İptalleri Göster'}
        </button>
      </div>
      
      {filteredRequests.length === 0 ? (
        <div className="text-center text-gray-500 py-10 border-2 border-dashed border-gray-300 rounded-lg">
          <p>Henüz gösterilecek bir teknik destek talebiniz bulunmuyor.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {filteredRequests.map((req) => (
            <div key={req._id} className={`border border-gray-200 rounded-lg p-4 shadow-sm transition-shadow hover:shadow-md ${req.status === RequestStatus.CANCELLED ? 'opacity-60 bg-gray-50' : 'bg-white'}`}>
              <div className="flex flex-col sm:flex-row justify-between sm:items-start">
                
                {/* SOL TARAFTAKİ DETAYLAR */}
                <div className="flex-1 mb-4 sm:mb-0 pr-4">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-semibold text-gray-900">{req.title}</h3>
                    <PriorityBadge priority={req.priority} />
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                    {req.description}
                  </p>

                  <div className="flex flex-wrap gap-4 text-sm text-gray-500 mt-3">
                    <div className="flex items-center gap-1">
                        <span className="font-bold text-gray-700">Konum:</span> {req.location}
                    </div>
                    <div className="flex items-center gap-1">
                        <span className="font-bold text-gray-700">Tarih:</span> {formatTRDate(req.createdAt)}
                    </div>
                  </div>
                </div>             

                {/* SAĞ TARAFTAKİ STATÜ VE PERSONEL LİSTESİ */}
                <div className="shrink-0 ml-0 sm:ml-4 sm:text-right space-y-3 flex flex-col items-start sm:items-end">
                  <StatusBadge status={req.status} />
                  
                  {/* 2. GÜNCELLEME BURADA: Personel Listesi */}
                  <div className="text-sm text-gray-500 flex flex-col items-start sm:items-end">
                    <strong className="mb-1">Teknik Ekip:</strong>
                    
                    {req.technicalStaff && req.technicalStaff.length > 0 ? (
                        <div className="flex flex-col gap-1 sm:items-end">
                            {req.technicalStaff.map((staff, idx) => (
                                <span key={idx} className="bg-gray-100 text-gray-800 px-2 py-0.5 rounded text-xs font-medium border border-gray-200">
                                    {staff.name}
                                </span>
                            ))}
                        </div>
                    ) : (
                        <span className="italic text-gray-400"> Henüz Atanmadı </span>
                    )}
                  </div>

                  {req.status === RequestStatus.PENDING && (
                    <div className="mt-3 flex items-center justify-end sm:justify-start gap-2">
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Başlık</label>
                <input 
                  type="text" 
                  name="title"
                  required
                  value={editFormData.title} 
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Açıklama</label>
                <textarea 
                  name="description"
                  required
                  rows={3}
                  value={editFormData.description} 
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Konum</label>
                <select 
                  name="location" 
                  value={editFormData.location} 
                  onChange={handleInputChange} 
                  required 
                  className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">{locationsLoading ? 'Yükleniyor...' : 'Seçiniz'}</option>
                  {locations.map((loc, index) => <option key={index} value={loc}>{loc}</option>)}
                  <option value="other" className="font-bold text-blue-600">+ DİĞER (Elle Gir)</option>
                </select>
                {editFormData.location === 'other' && (
                  <input 
                    type="text" 
                    name="customLocation"
                    value={editFormData.customLocation} 
                    onChange={handleInputChange}
                    placeholder="Lütfen konumu belirtin..." 
                    className="mt-2 block w-full rounded-md border border-gray-300 px-4 py-2 text-sm outline-none focus:ring-blue-500" 
                    required 
                  />
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Öncelik</label>
                <select
                  name="priority"
                  value={editFormData.priority}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="LOW">Düşük</option>
                  <option value="MEDIUM">Orta</option>
                  {canSelectHighPriority && <option value="HIGH">Acil</option>}
                </select>
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