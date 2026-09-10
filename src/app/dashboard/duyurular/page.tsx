'use client';

import React, {useEffect, useState} from 'react';
import axios from 'axios';
import { MegaphoneIcon, ExclamationCircleIcon, TrashIcon, ArrowTopRightOnSquareIcon, LinkIcon } from '@heroicons/react/24/outline';

interface IAnnouncement{
  _id : string;
  title : string;
  content : string;
  priority : 'normal' | 'urgent';
  link?: string;
  href?: string;
  createdAt : string;
}

export default function AnnouncementsPage() {

    const [announcements, setAnnouncements] = useState<IAnnouncement[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);

    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [link, setLink] = useState('');
    const [priority, setPriority] = useState<'normal' | 'urgent'>('normal');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [deletingId, setDeletingId] = useState<string | null>(null);

    const getFormattedUrl = (url?: string) => {
      if (!url) return '';
      const trimmed = url.trim();
      if (/^https?:\/\//i.test(trimmed)) {
        return trimmed;
      }
      return `https://${trimmed}`;
    };

    useEffect(() => {
      const initData = async () => {
        try{
          const userRes = await axios.get('/api/me');
          if(userRes.data.role === 'admin' || userRes.data.role === 'supervisor') setIsAdmin(true);

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
      const res = await axios.post('/api/announcements', {title, content, priority, link: link.trim(), href: link.trim()});
      setAnnouncements([res.data, ...announcements]);

      setTitle('');
      setContent('');
      setLink('');
      setPriority('normal');
      alert('Duyuru yayınlandı.');
     }catch (err){
      alert('Hata oluştu.');
     }finally{
      setIsSubmitting(false);
     }
    };

    const handleDeleteAnnouncement = async(id:string) => {
      if(!confirm('Bu duyuruyu silmek istediğinize emin misiniz?')) return;
      setDeletingId(id);

      try{
        await axios.delete(`/api/announcements/${id}`);
        setAnnouncements((prev) => prev.filter((ann) => ann._id !== id));
        alert('Duyuru silindi.');
      }catch(err){
        console.error(err);
        alert('Silme işlemi sırasında hata oluştu.');
      }finally{
        setDeletingId(null);
      }
    };

    if(loading) return <div className='p-6 text-base-content'>Yükleniyor...</div>
    return (
    <div className="max-w-4xl mx-auto space-y-8">
      
      {isAdmin && (
        <div className="bg-base-100 p-6 rounded-2xl shadow-lg border-l-4 border-info">
            <h3 className="text-lg font-bold text-base-content mb-4 flex items-center gap-2">
                <MegaphoneIcon className="h-5 w-5 text-info" />
                Yeni Duyuru Yayınla
            </h3>
            <form onSubmit={handleAddAnnouncement} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                        <input 
                            type="text" placeholder="Duyuru Başlığı" required 
                            value={title} onChange={e => setTitle(e.target.value)}
                            className="w-full p-2.5 border border-base-300 rounded-xl bg-base-100 text-base-content outline-none focus:ring-1 focus:ring-primary text-sm"
                        />
                    </div>
                    <div>
                        <select 
                            value={priority} onChange={(e: any) => setPriority(e.target.value)}
                            className="w-full p-2.5 border border-base-300 rounded-xl bg-base-100 text-base-content outline-none text-sm font-medium"
                        >
                            <option value="normal">Normal</option>
                            <option value="urgent">Acil / Önemli</option>
                        </select>
                    </div>
                </div>

                <div>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-base-content/40">
                            <LinkIcon className="h-4 w-4" />
                        </div>
                        <input 
                            type="text" 
                            placeholder="Yönlendirme Linki / Web Sitesi (Opsiyonel, örn: https://example.com)"
                            value={link} 
                            onChange={e => setLink(e.target.value)}
                            className="w-full pl-9 pr-3 py-2.5 border border-base-300 rounded-xl bg-base-100 text-base-content text-sm outline-none focus:ring-1 focus:ring-primary"
                        />
                    </div>
                    <span className="text-[11px] text-base-content/50 mt-1 block pl-1">
                        Link girilirse kullanıcılar duyuruya veya butona tıklayarak doğrudan belirtilen siteye yönlendirilir.
                    </span>
                </div>

                <textarea 
                    placeholder="Duyuru İçeriği..." required rows={3}
                    value={content} onChange={e => setContent(e.target.value)}
                    className="w-full p-2.5 border border-base-300 rounded-xl bg-base-100 text-base-content outline-none focus:ring-1 focus:ring-primary text-sm"
                />
                <div className="text-right">
                    <button 
                        type="submit" disabled={isSubmitting}
                        className="btn btn-primary btn-sm px-5 rounded-xl font-bold shadow-sm"
                    >
                        {isSubmitting ? 'Yayınlanıyor...' : 'Yayınla'}
                    </button>
                </div>
            </form>
        </div>
      )}

      <h2 className="text-2xl font-black text-base-content flex items-center">
        <MegaphoneIcon className="h-7 w-7 mr-2 text-primary" />
        İdari Duyurular
      </h2>

      <div className="space-y-4">
        {announcements.length === 0 ? (
            <p className="text-base-content/60">Henüz yayınlanmış bir duyuru yok.</p>
        ) : (
            announcements.map((ann) => {
                const targetUrl = ann.link || ann.href;
                const formattedUrl = getFormattedUrl(targetUrl);

                return (
                  <div key={ann._id} className={`bg-base-100 p-6 rounded-2xl shadow-sm border-l-4 ${ann.priority === 'urgent' ? 'border-error bg-rose-500/5' : 'border-base-300'}`}>
                      <div className="flex justify-between items-start gap-4">
                          <div className="space-y-2 flex-1">
                              <h3 className="text-lg font-bold text-base-content flex items-center gap-2 flex-wrap">
                                  {ann.priority === 'urgent' && <ExclamationCircleIcon className="h-5 w-5 text-error shrink-0" />}
                                  {targetUrl ? (
                                      <a
                                          href={formattedUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="hover:text-primary hover:underline flex items-center gap-1.5 transition-colors"
                                          title="Bağlantıyı yeni sekmede aç"
                                      >
                                          <span>{ann.title}</span>
                                          <ArrowTopRightOnSquareIcon className="h-4 w-4 text-primary shrink-0" />
                                      </a>
                                  ) : (
                                      <span>{ann.title}</span>
                                  )}
                              </h3>
                              <p className="text-sm text-base-content/80 whitespace-pre-wrap leading-relaxed">{ann.content}</p>

                              {targetUrl && (
                                <div className="pt-2">
                                  <a
                                    href={formattedUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 rounded-xl text-xs font-bold transition-all hover:scale-[1.02] shadow-xs"
                                    title={formattedUrl}
                                  >
                                    <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" />
                                    <span>Bağlantıya Git ({targetUrl})</span>
                                  </a>
                                </div>
                              )}
                          </div>
                          <div className='flex flex-col items-end shrink-0 space-y-2'>
                          <span className="text-xs text-base-content/50 whitespace-nowrap">
                              {new Date(ann.createdAt).toLocaleDateString('tr-TR')}
                          </span>
                          {isAdmin && (
                            <button
                            onClick={() => handleDeleteAnnouncement(ann._id)}
                            className="btn btn-ghost btn-xs btn-square text-error hover:bg-error/10 rounded-lg transition-colors disabled:opacity-50"
                            title='Duyuruyu Sil'
                          >
                            {deletingId === ann._id ?(
                              <span className='loading loading-spinner loading-xs'></span>
                            ) : (
                              <TrashIcon className="h-4 w-4" />
                            )}
                          </button>
                          )}
                       </div>
                   </div>
                  </div>
                );
            })
        )}
      </div>

    </div>
  );
}