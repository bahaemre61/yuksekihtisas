'use client';

import React, {useEffect, useState} from 'react'
import axios from 'axios';


enum RequestStatus {ASSIGNED = 'assigned'}

interface IVehicleReuqest{
    _id : string;
    purpose : string;
    fromLocation : string;
    toLocation : string;
    status : RequestStatus;
    startTime : string;
    endTime : string;
    priority : 'normal' | 'high';
    requestingUser: {name: string; email :string};
}

const formatTRDate = (dateString : string) => {
    return new Date(dateString).toLocaleString('tr-TR', {
        day: '2-digit',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit'
    });
};

export default function DriverTasksPage(){
    const[tasks, setTasks] = useState<IVehicleReuqest[]>([]);
    const[loading, setLoading] = useState(true);
    const[complteingId, setCompletingId] = useState<string | null>(null);
    const[error, setError] = useState<string | null>(null);

    const fetchTasks = async () => {
        setLoading(true);
        try{
            const res = await axios.get('/api/driver/assignments');
            setTasks(res.data);
        }catch(err){

            console.error(err);
        }
        setLoading(false);
    };
    useEffect(()=> {
        fetchTasks();
    }, []);
    
    const handleCompleteJob = async(requestId : string) => {
        if(!confirm("Bu görevi tamamlandı olarak işartlemek istiyor musun ?")) return;

        setCompletingId(requestId);
        try{
            await axios.put(`/api/requests/${requestId}/complete`);
            setTasks((prev)=> prev.filter((t)=> t._id !== requestId));
        }catch(err) {
            alert("İşlem başarısız oldu.");
        }finally{
            setCompletingId(null);
        }
    };

    if(loading) return <div className='p-6 text-center'>Yükleniyor...</div>
    return(
        <div className='bg-white p-6 rounded-lg shadow-lg'>
            <h2 className='text-2xl font-semibold text-gray-800 mb-6'>Aktif Görevlerim</h2>
            
            {tasks.length === 0 ? (
                <div className='text-center text-gray-500 py-10 border-2 border-dashed border-gray-300 rounded-lg'>
                <p>Üzerinizde atanmış aktif bir görev yok.</p>
                <p className='text-sm mt-2'>Yeni iş almak için "Talep Yığına"na bakın.</p>
                </div>
            ): (
                <div className='space-y-5'>
                    {tasks.map((req)=>
                    <div key={req._id} className='border-l-4 border-blue-500 bg-blue-50 rounded-r-lg shadow-sm'>
                        <div className='flex flex-col md:flex-row justify-between'>

                            <div className='flex-1'>
                                <h3 className='text-lg font-bold text-gray-900'>{req.purpose}</h3>
                                <div className='mt-2 text-sm text-gray-700 space-y-1'>
                                    <p><span className='font-semibold'>Yolcu:</span>{req.requestingUser.name}</p>
                                    <p><span className="font-semibold">Güzergah:</span> {req.fromLocation} ➔ {req.toLocation}</p>
                                    <p><span className="font-semibold">Zaman:</span> {formatTRDate(req.startTime)} - {formatTRDate(req.endTime)}</p>
                                </div>
                            </div>

                            <div className='mt-4 md:mt-0 md:ml-4 flex items-center'>
                                <button
                                onClick={()=> handleCompleteJob(req._id)}
                                disabled={complteingId === req._id}
                                className='w-full md:w-auto px-t py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 focus:outline-none foucs:ring-2 focus:ring-green-500 disabled:bg-gray-400'
                                >
                                    {complteingId === req._id ?'İşleniyor... ':'Görevi Tamamla'}
                                </button>
                            </div>

                        </div>
                    </div>
                    )}
                    

                </div>

            )}
        </div>
    )
}