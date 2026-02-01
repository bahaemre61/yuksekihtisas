'use client';

import React, {useEffect, useState} from 'react';
import axios from 'axios';
import Link from 'next/link';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

enum RequestStatus{
    PENDING = 'pending',
    ASSIGNED = 'assigned',
    COMPLETED = 'completed',
    CANCELLED = 'cancelled', 
}

interface IVehicleReuqest{
    _id : string;
    purpose : string;
    fromLocation : string;
    toLocation : string;
    status : RequestStatus;
    startTime : string;
    requestingUser: {name : string; email: string};
    assignedDriver?: {name : string; email: string};
}

export default function AdminDashboardPage(){
    const[requests, setRequests] = useState<IVehicleReuqest[]>([]);
    const[loading, setLoading] = useState(true);

    const fectAllRequests = async () => {
        setLoading(true);
        try{
            const res = await axios.get('/api/admin/requests');
        setRequests(res.data);
        }catch(err){
            console.error(err);
            alert("Veriler yüklenmedi");
        }
        setLoading(false);
    };
    useEffect(() => {
        fectAllRequests();
    }, []);

    const handleUnassign = async (id: string) => {
    if(!confirm("Bu işi şoförden alıp tekrar havuza (Pending) atmak istediğinize emin misiniz?")) return;
    
    try {
        await axios.put(`/api/admin/requests/${id}/unassign`);
        setRequests(prev => prev.map(req => 
            req._id === id 
            ? { ...req, status: RequestStatus.PENDING, assignedDriver: undefined } 
            : req
        ));
    } catch (err) {
        alert("İşlem başarısız.");
    }
  };

  const getStatusColor = (status : string) => {
    switch(status){
        case 'pending' : return 'bg-yellow-100 text-yellow-800';
        case 'assigned': return 'bg-blue-100 text-blue-800';
        case 'completed': return 'bg-green-100 text-green-800';
        case 'cancelled': return 'bg-red-100 text-red-800';
        default: return 'bg-gray-100 text-gray-800'
    }
  };
  if(loading) return <div className='p-6'>Yükleniyor...</div>
  return (
    <div className="bg-white shadow-sm rounded-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center gap-4">
            <Link href="/dashboard/admin" className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <ArrowLeftIcon className="h-6 w-6 text-gray-600"/>
            </Link> 
        <h2 className="text-xl font-semibold text-gray-800">Sistemdeki Tüm Talepler</h2>
      </div>    
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Talep Eden</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Güzergah & Amaç</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tarih</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Durum</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Şoför</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {requests.map((req) => (
              <tr key={req._id}>
                <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{req.requestingUser?.name || 'Silinmiş'}</div>
                    <div className="text-sm text-gray-500">{req.requestingUser?.email}</div>
                </td>
                <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 font-medium">{req.purpose}</div>
                    <div className="text-sm text-gray-500">{req.fromLocation} ➔ {req.toLocation}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(req.startTime).toLocaleDateString('tr-TR')} <br/>
                    {new Date(req.startTime).toLocaleTimeString('tr-TR', {hour: '2-digit', minute:'2-digit'})}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(req.status)}`}>
                        {req.status.toUpperCase()}
                    </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {req.assignedDriver ? req.assignedDriver.name : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {req.status === 'assigned' && (
                        <button 
                            onClick={() => handleUnassign(req._id)}
                            className="text-indigo-600 hover:text-indigo-900"
                        >
                            Boşa Çıkar
                        </button>
                    )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}