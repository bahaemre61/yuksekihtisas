'use client';
import { useState, useEffect } from 'react';

export default function TeknikIslerimPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = async () => {
    const res = await fetch('/api/technicalrequests/my-tasks');
    const data = await res.json();
    if (data.success) setTasks(data.data);
    setLoading(false);
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleComplete = async (requestId: string) => {
    if(!confirm('Bu işi tamamlandı olarak işaretlemek istiyor musunuz?')) return;

    const res = await fetch('/api/technicalrequests/my-tasks', {
      method: 'PUT',
      body: JSON.stringify({ requestId })
    });

    if (res.ok) {
      alert('İş başarıyla kapatıldı!');
      setTasks(prev => prev.filter(task => task._id !== requestId));
    }
  };

  if (loading) return <div className="p-10 text-center text-base-content/60">İşler yükleniyor...</div>;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-base-content flex items-center gap-2">
        🛠️ Üzerimdeki İşler
      </h1>

      {tasks.length === 0 ? (
        <div className="bg-success/10 p-8 rounded-lg border border-success/30 text-center">
          <h3 className="text-lg font-bold text-success">Harika!</h3>
          <p className="text-success/80">Şu an üzerine atanmış bekleyen bir iş yok.</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {tasks.map((task) => (
            <div key={task._id} className="bg-base-100 border-l-4 border-info rounded-lg shadow-sm p-6 relative">
              
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-bold text-base-content">{task.title}</h3>
                  <p className="text-xs text-base-content/60">{new Date(task.createdAt).toLocaleString('tr-TR')}</p>
                </div>
                <span className={`px-2 py-1 text-xs font-bold rounded ${task.priority === 'HIGH' ? 'bg-error/20 text-error' : 'bg-base-200 text-base-content/70'}`}>
                  {task.priority === 'HIGH' ? 'ACİL' : 'Normal'}
                </span>
              </div>

              <div className="space-y-2 mb-6">
                <div className="flex items-center gap-2 text-sm text-base-content/80">
                  <span className="font-semibold w-20">Talep Eden:</span>
                  <span>{task.user?.name}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-base-content/80">
                  <span className="font-semibold w-20">Konum:</span>
                  <span>{task.location}</span>
                </div>
                <div className="bg-base-200/50 p-3 rounded text-sm text-base-content/70 mt-2">
                  {task.description}
                </div>
              </div>

              <button 
                onClick={() => handleComplete(task._id)}
                className="w-full bg-success hover:brightness-90 text-success-content font-medium py-2 rounded transition-colors flex items-center justify-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                İşi Tamamla
              </button>

            </div>
          ))}
        </div>
      )}
    </div>
  );
}