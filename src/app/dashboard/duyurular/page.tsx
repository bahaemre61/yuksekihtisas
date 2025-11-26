'use client';

import React, {useEffect, useState} from 'react';
import axios from 'axios';
import { MegaphoneIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';

interface IAnnouncement{
  _id : string;
  title : string;
  content : string;
  priority : 'normal' | 'urgent';
  createdAt : string;
}
//import useUser from '@/src/lib/hooks/useUser';
export default function AnnouncementsPage() {

    const [announcements, setAnnouncements] = useState<IAnnouncement[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);

    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [priority, setPriority] = useState<'normal' | 'urgent'>('normal');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
      const initData = async () => {
        try{
          const userRes = await axios.get('/api/me');
          if(userRes.data.role === 'admin') setIsAdmin(true);

          const annRes = await axios.get('/api/announcements');
          setAnnouncements(annRes.data);
        }catch (err){
          console.error(err);
        }finally{
          setLoading(false);
        }
      };
      initData();
    }, []);
    const handleAddAnnouncement = async(e:React.FormEvent) => {
      e.preventDefault();
      setIsSubmitting(true);
     try{
      const res = await axios.post('/api/announcements', {title,content,priority});
      setAnnouncements([res.data, ...announcements]);

      setTitle('');
      setContent('');
      setPriority('normal');
      alert('Duyuru yayınlandı.');
     }catch (err){
      alert('Hata oluştu.');
     }finally{
      setIsSubmitting(false);
     }
    };
    if(loading) return <div className='p-6'>Yükleniyor...</div>
    return (
    <div className="max-w-4xl mx-auto space-y-8">
      
      {isAdmin && (
        <div className="bg-white p-6 rounded-lg shadow-lg border-l-4 border-blue-500">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Yeni Duyuru Yayınla</h3>
            <form onSubmit={handleAddAnnouncement} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                        <input 
                            type="text" placeholder="Duyuru Başlığı" required 
                            value={title} onChange={e => setTitle(e.target.value)}
                            className="w-full p-2 border rounded"
                        />
                    </div>
                    <div>
                        <select 
                            value={priority} onChange={(e: any) => setPriority(e.target.value)}
                            className="w-full p-2 border rounded bg-white"
                        >
                            <option value="normal">Normal</option>
                            <option value="urgent">Acil / Önemli</option>
                        </select>
                    </div>
                </div>
                <textarea 
                    placeholder="Duyuru İçeriği..." required rows={3}
                    value={content} onChange={e => setContent(e.target.value)}
                    className="w-full p-2 border rounded"
                />
                <div className="text-right">
                    <button 
                        type="submit" disabled={isSubmitting}
                        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
                    >
                        {isSubmitting ? 'Yayınlanıyor...' : 'Yayınla'}
                    </button>
                </div>
            </form>
        </div>
      )}

      <h2 className="text-2xl font-bold text-gray-800 flex items-center">
        <MegaphoneIcon className="h-8 w-8 mr-2 text-blue-600" />
        İdari Duyurular
      </h2>

      <div className="space-y-4">
        {announcements.length === 0 ? (
            <p className="text-gray-500">Henüz yayınlanmış bir duyuru yok.</p>
        ) : (
            announcements.map((ann) => (
                <div key={ann._id} className={`bg-white p-6 rounded-lg shadow border-l-4 ${ann.priority === 'urgent' ? 'border-red-500' : 'border-gray-300'}`}>
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className="text-xl font-semibold text-gray-800 flex items-center">
                                {ann.priority === 'urgent' && <ExclamationCircleIcon className="h-6 w-6 text-red-500 mr-2" />}
                                {ann.title}
                            </h3>
                            <p className="mt-2 text-gray-600 whitespace-pre-wrap">{ann.content}</p>
                        </div>
                        <span className="text-xs text-gray-400 whitespace-nowrap ml-4">
                            {new Date(ann.createdAt).toLocaleDateString('tr-TR')}
                        </span>
                    </div>
                </div>
            ))
        )}
      </div>

    </div>
  );
}