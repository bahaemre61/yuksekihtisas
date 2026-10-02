'use client';

import React, { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Dialog, Menu, MenuButton, MenuItem, MenuItems, Transition } from '@headlessui/react';
import { CalendarIcon, EllipsisHorizontalIcon, FunnelIcon, PlusIcon } from '@heroicons/react/24/outline';
import Alert from '@/src/components/ui/Alert';
import { TASKS_READ_ONLY } from '@/src/lib/taskConfig';

type TaskStatus = 'todo' | 'in_progress' | 'completed';
type TaskPriority = 'low' | 'medium' | 'high';

interface ITaskUser {
  _id: string;
  name: string;
  role: string;
}

interface ITask {
  _id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string | null;
  createdBy: ITaskUser;
  assignee: ITaskUser;
  canManage: boolean;
  canMove: boolean;
  createdAt: string;
}

interface IAssignable {
  _id: string;
  name: string;
  role: string;
  isMe: boolean;
}

const COLUMNS: { key: TaskStatus; label: string; dot: string }[] = [
  { key: 'todo', label: 'Yapılacak', dot: 'bg-sky-500' },
  { key: 'in_progress', label: 'Devam Eden', dot: 'bg-amber-500' },
  { key: 'completed', label: 'Tamamlanan', dot: 'bg-emerald-500' }
];

const PRIORITY_META: Record<TaskPriority, { label: string; cls: string; rank: number }> = {
  high: { label: 'Yüksek', cls: 'bg-rose-50 text-rose-600 dark:bg-rose-500/15', rank: 0 },
  medium: { label: 'Orta', cls: 'bg-amber-50 text-amber-600 dark:bg-amber-500/15', rank: 1 },
  low: { label: 'Düşük', cls: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15', rank: 2 }
};

const initials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toLocaleUpperCase('tr-TR'))
    .join('');

const emptyForm = { title: '', description: '', priority: 'medium' as TaskPriority, dueDate: '', assignee: '' };

export default function TaskKanbanPage() {
  // Şimdilik salt okunur: görev oluşturma/taşıma/düzenleme/silme kapalı (src/lib/taskConfig.ts)
  const readOnly = TASKS_READ_ONLY;
  const [tasks, setTasks] = useState<ITask[]>([]);
  const [assignables, setAssignables] = useState<IAssignable[]>([]);
  const [meId, setMeId] = useState('');
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [activeTab, setActiveTab] = useState<'all' | TaskStatus>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [personFilter, setPersonFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'newest' | 'due' | 'priority'>('newest');

  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<TaskStatus | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<ITask | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const loadAll = useCallback(async () => {
    try {
      const [me, taskRes, assignRes] = await Promise.all([
        axios.get('/api/me'),
        axios.get('/api/tasks'),
        axios.get('/api/tasks/assignable')
      ]);
      setMeId(me.data._id);
      setTasks(taskRes.data);
      setAssignables(assignRes.data);
    } catch (err) {
      console.error('Görev verileri alınamadı', err);
      setFeedback({ type: 'error', text: 'Görevler yüklenemedi.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const hasSubordinates = assignables.some((a) => !a.isMe);

  const visibleTasks = useMemo(() => {
    let list = tasks.filter((t) => {
      if (personFilter === 'all') return true;
      if (personFilter === 'mine') return t.assignee._id === meId;
      if (personFilter === 'created') return t.createdBy._id === meId;
      return t.assignee._id === personFilter;
    });

    list = [...list].sort((a, b) => {
      if (sortBy === 'priority') return PRIORITY_META[a.priority].rank - PRIORITY_META[b.priority].rank;
      if (sortBy === 'due') {
        const ad = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
        const bd = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
        return ad - bd;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    return list;
  }, [tasks, personFilter, sortBy, meId]);

  const countOf = (status: TaskStatus) => visibleTasks.filter((t) => t.status === status).length;

  const openCreate = () => {
    if (readOnly) return;
    setEditingTask(null);
    setForm({ ...emptyForm, assignee: meId });
    setModalOpen(true);
  };

  const openEdit = (task: ITask) => {
    if (readOnly) return;
    setEditingTask(task);
    setForm({
      title: task.title,
      description: task.description || '',
      priority: task.priority,
      dueDate: task.dueDate ? task.dueDate.slice(0, 10) : '',
      assignee: task.assignee._id
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const payload = {
        title: form.title,
        description: form.description,
        priority: form.priority,
        dueDate: form.dueDate || null,
        assignee: form.assignee
      };
      if (editingTask) {
        const res = await axios.put(`/api/tasks/${editingTask._id}`, payload);
        setTasks((prev) => prev.map((t) => (t._id === editingTask._id ? res.data : t)));
        setFeedback({ type: 'success', text: 'Görev güncellendi.' });
      } else {
        const res = await axios.post('/api/tasks', payload);
        setTasks((prev) => [res.data, ...prev]);
        setFeedback({ type: 'success', text: 'Görev oluşturuldu.' });
      }
      setModalOpen(false);
    } catch (err) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.msg : undefined;
      setFeedback({ type: 'error', text: msg || 'Görev kaydedilemedi.' });
    } finally {
      setSaving(false);
    }
  };

  const moveTask = async (taskId: string, status: TaskStatus) => {
    if (readOnly) return;
    const current = tasks.find((t) => t._id === taskId);
    if (!current || current.status === status || !current.canMove) return;

    setTasks((prev) => prev.map((t) => (t._id === taskId ? { ...t, status } : t)));
    try {
      const res = await axios.put(`/api/tasks/${taskId}`, { status });
      setTasks((prev) => prev.map((t) => (t._id === taskId ? res.data : t)));
    } catch (err) {
      setTasks((prev) => prev.map((t) => (t._id === taskId ? { ...t, status: current.status } : t)));
      const msg = axios.isAxiosError(err) ? err.response?.data?.msg : undefined;
      setFeedback({ type: 'error', text: msg || 'Görev taşınamadı.' });
    }
  };

  const deleteTask = async (task: ITask) => {
    if (readOnly) return;
    if (!confirm(`"${task.title}" görevini silmek istediğinize emin misiniz?`)) return;
    try {
      await axios.delete(`/api/tasks/${task._id}`);
      setTasks((prev) => prev.filter((t) => t._id !== task._id));
      setFeedback({ type: 'success', text: 'Görev silindi.' });
    } catch (err) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.msg : undefined;
      setFeedback({ type: 'error', text: msg || 'Görev silinemedi.' });
    }
  };

  const isOverdue = (task: ITask) =>
    !!task.dueDate && task.status !== 'completed' && new Date(task.dueDate).getTime() < new Date().setHours(0, 0, 0, 0);

  const visibleColumns = activeTab === 'all' ? COLUMNS : COLUMNS.filter((c) => c.key === activeTab);

  const renderCard = (task: ITask) => (
    <div
      key={task._id}
      draggable={task.canMove && !readOnly}
      onDragStart={(e) => {
        setDragId(task._id);
        e.dataTransfer.setData('text/plain', task._id);
        e.dataTransfer.effectAllowed = 'move';
      }}
      onDragEnd={() => {
        setDragId(null);
        setDragOverCol(null);
      }}
      className={`rounded-xl border border-base-200 bg-base-100 p-4 shadow-xs transition ${
        task.canMove && !readOnly ? 'cursor-grab active:cursor-grabbing hover:border-primary/40' : ''
      } ${dragId === task._id ? 'opacity-40' : ''}`}
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-sm font-medium text-base-content break-words">{task.title}</h4>
        {!readOnly && (task.canMove || task.canManage) && (
          <Menu as="div" className="relative shrink-0">
            <MenuButton
              className="rounded-md p-0.5 text-base-content/40 hover:bg-base-200 hover:text-base-content focus:outline-none"
              aria-label="Görev menüsü"
            >
              <EllipsisHorizontalIcon className="h-5 w-5" />
            </MenuButton>
            <MenuItems className="absolute right-0 z-20 mt-1 w-44 rounded-xl border border-base-200 bg-base-100 p-1 shadow-lg focus:outline-none">
              {task.canMove &&
                COLUMNS.filter((c) => c.key !== task.status).map((c) => (
                  <MenuItem key={c.key}>
                    <button
                      type="button"
                      onClick={() => moveTask(task._id, c.key)}
                      className="w-full rounded-lg px-3 py-1.5 text-left text-sm text-base-content/80 data-[focus]:bg-base-200"
                    >
                      {c.label} sütununa taşı
                    </button>
                  </MenuItem>
                ))}
              {task.canManage && (
                <>
                  <MenuItem>
                    <button
                      type="button"
                      onClick={() => openEdit(task)}
                      className="w-full rounded-lg px-3 py-1.5 text-left text-sm text-base-content/80 data-[focus]:bg-base-200"
                    >
                      Düzenle
                    </button>
                  </MenuItem>
                  <MenuItem>
                    <button
                      type="button"
                      onClick={() => deleteTask(task)}
                      className="w-full rounded-lg px-3 py-1.5 text-left text-sm text-rose-600 data-[focus]:bg-rose-50"
                    >
                      Sil
                    </button>
                  </MenuItem>
                </>
              )}
            </MenuItems>
          </Menu>
        )}
      </div>

      {task.description && (
        <p className="mt-1.5 line-clamp-2 text-xs text-base-content/60">{task.description}</p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${PRIORITY_META[task.priority].cls}`}>
          {PRIORITY_META[task.priority].label}
        </span>
        {task.dueDate && (
          <span
            className={`inline-flex items-center gap-1 text-xs font-medium ${
              isOverdue(task) ? 'text-rose-600' : 'text-base-content/60'
            }`}
          >
            <CalendarIcon className="h-3.5 w-3.5" />
            {new Date(task.dueDate).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' })}
            {isOverdue(task) && ' · Gecikti'}
          </span>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-base-200 pt-3">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary"
            title={task.assignee.name}
          >
            {initials(task.assignee.name)}
          </span>
          <span className="truncate text-xs font-medium text-base-content/80">{task.assignee.name}</span>
        </div>
        {task.createdBy._id !== task.assignee._id && (
          <span className="truncate text-[11px] text-base-content/50" title={`Atayan: ${task.createdBy.name}`}>
            Atayan: {task.createdBy.name}
          </span>
        )}
      </div>
    </div>
  );

  return (
    <div className="w-full space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-base-content tracking-tight">Görev Panosu</h1>
        <p className="mt-1 text-sm text-base-content/60">
          {readOnly
            ? 'Size atanan ve hiyerarşinizdeki görevleri görüntüleyebilirsiniz.'
            : hasSubordinates
              ? 'Kendinize ve hiyerarşide altınızdaki kişilere görev atayabilir, görevleri sürükleyerek ilerletebilirsiniz.'
              : 'Kendinize görev oluşturabilir ve atanan görevleri sürükleyerek ilerletebilirsiniz.'}
        </p>
      </div>

      {readOnly && (
        <Alert variant="info">
          Görev panosu şimdilik salt okunurdur. Görevleri yalnızca görüntüleyebilirsiniz; ekleme, taşıma ve düzenleme daha sonra açılacaktır.
        </Alert>
      )}

      {feedback && (
        <Alert variant={feedback.type} onClose={() => setFeedback(null)}>
          {feedback.text}
        </Alert>
      )}

      <div className="rounded-2xl border border-base-200 bg-base-100 p-4 sm:p-6">
        {/* Sekmeler */}
        <div className="grid grid-cols-2 gap-1 rounded-lg bg-base-200/60 p-1 sm:grid-cols-4" role="tablist">
          {([{ key: 'all', label: 'Tüm Görevler', count: visibleTasks.length }, ...COLUMNS.map((c) => ({ key: c.key, label: c.label, count: countOf(c.key) }))] as { key: 'all' | TaskStatus; label: string; count: number }[]).map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.key ? 'bg-base-100 text-base-content shadow-xs' : 'text-base-content/60 hover:text-base-content'
              }`}
            >
              {tab.label}
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">{tab.count}</span>
            </button>
          ))}
        </div>

        {/* Araç çubuğu */}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-base-100 px-4 text-sm font-medium text-base-content/80 ring-1 ring-inset ring-base-300 transition hover:bg-base-200"
          >
            <FunnelIcon className="h-4 w-4" />
            Filtrele & Sırala
          </button>
          {!readOnly && (
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-content transition hover:brightness-95"
          >
            Yeni Görev Ekle
            <PlusIcon className="h-4 w-4" />
          </button>
          )}
        </div>

        {showFilters && (
          <div className="mt-3 grid gap-3 rounded-xl border border-base-200 p-4 sm:grid-cols-2">
            <label className="text-sm text-base-content/70">
              Kişi / Kapsam
              <select
                value={personFilter}
                onChange={(e) => setPersonFilter(e.target.value)}
                className="mt-1 h-10 w-full rounded-lg border border-base-300 bg-transparent px-3 text-sm text-base-content"
              >
                <option value="all">Görebildiğim tüm görevler</option>
                <option value="mine">Bana atananlar</option>
                <option value="created">Benim atadıklarım</option>
                {assignables
                  .filter((a) => !a.isMe)
                  .map((a) => (
                    <option key={a._id} value={a._id}>
                      {a.name}
                    </option>
                  ))}
              </select>
            </label>
            <label className="text-sm text-base-content/70">
              Sıralama
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'newest' | 'due' | 'priority')}
                className="mt-1 h-10 w-full rounded-lg border border-base-300 bg-transparent px-3 text-sm text-base-content"
              >
                <option value="newest">En yeni</option>
                <option value="due">Bitiş tarihine göre</option>
                <option value="priority">Önceliğe göre</option>
              </select>
            </label>
          </div>
        )}

        {/* Sütunlar */}
        {loading ? (
          <div className="flex justify-center p-16">
            <span className="loading loading-spinner loading-md text-primary" />
          </div>
        ) : (
          <div className={`mt-6 grid gap-4 ${visibleColumns.length === 3 ? 'lg:grid-cols-3' : ''}`}>
            {visibleColumns.map((col) => {
              const colTasks = visibleTasks.filter((t) => t.status === col.key);
              return (
                <div
                  key={col.key}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOverCol(col.key);
                  }}
                  onDragLeave={() => setDragOverCol((c) => (c === col.key ? null : c))}
                  onDrop={(e) => {
                    e.preventDefault();
                    const id = e.dataTransfer.getData('text/plain') || dragId;
                    setDragOverCol(null);
                    if (id) moveTask(id, col.key);
                  }}
                  className={`rounded-xl border p-3 transition-colors ${
                    dragOverCol === col.key ? 'border-primary bg-primary/5' : 'border-base-200 bg-base-200/30'
                  }`}
                >
                  <div className="mb-3 flex items-center gap-2 px-1">
                    <span className={`h-2 w-2 rounded-full ${col.dot}`} />
                    <h3 className="text-sm font-medium text-base-content">{col.label}</h3>
                    <span className="rounded-full bg-base-200 px-2 py-0.5 text-xs text-base-content/60">{colTasks.length}</span>
                  </div>
                  <div className="space-y-3">
                    {colTasks.length === 0 ? (
                      <p className="rounded-lg border border-dashed border-base-300 py-8 text-center text-xs text-base-content/40">
                        Bu sütunda görev yok
                      </p>
                    ) : (
                      colTasks.map(renderCard)
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Görev oluştur / düzenle */}
      <Transition appear show={modalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setModalOpen(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-base-content/40 backdrop-blur-sm" />
          </Transition.Child>
          <div className="fixed inset-0 overflow-y-auto p-4">
            <div className="flex min-h-full items-center justify-center">
              <Dialog.Panel className="w-full max-w-lg rounded-2xl border border-base-200 bg-base-100 p-6 shadow-2xl">
                <div className="mb-4 flex items-center justify-between">
                  <Dialog.Title className="text-lg font-semibold text-base-content">
                    {editingTask ? 'Görevi Düzenle' : 'Yeni Görev'}
                  </Dialog.Title>
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="text-2xl leading-none text-base-content/50 hover:text-base-content"
                    aria-label="Kapat"
                  >
                    &times;
                  </button>
                </div>

                <form onSubmit={handleSave} className="space-y-4">
                  <label className="block text-sm font-medium text-base-content/80">
                    Başlık *
                    <input
                      type="text"
                      required
                      maxLength={200}
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      className="mt-1 h-11 w-full rounded-lg border border-base-300 bg-transparent px-3 text-sm font-normal text-base-content focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
                      placeholder="Örn: Aylık raporu hazırla"
                    />
                  </label>

                  <label className="block text-sm font-medium text-base-content/80">
                    Açıklama
                    <textarea
                      rows={3}
                      maxLength={2000}
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-base-300 bg-transparent px-3 py-2 text-sm font-normal text-base-content focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
                    />
                  </label>

                  <label className="block text-sm font-medium text-base-content/80">
                    Atanacak Kişi
                    <select
                      value={form.assignee}
                      onChange={(e) => setForm({ ...form, assignee: e.target.value })}
                      className="mt-1 h-11 w-full rounded-lg border border-base-300 bg-transparent px-3 text-sm font-normal text-base-content"
                    >
                      {assignables.map((a) => (
                        <option key={a._id} value={a._id}>
                          {a.isMe ? `${a.name} (Ben)` : a.name}
                        </option>
                      ))}
                    </select>
                    {!hasSubordinates && (
                      <span className="mt-1 block text-xs font-normal text-base-content/50">
                        Hiyerarşide altınızda kimse olmadığı için görevi yalnızca kendinize atayabilirsiniz.
                      </span>
                    )}
                  </label>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block text-sm font-medium text-base-content/80">
                      Öncelik
                      <select
                        value={form.priority}
                        onChange={(e) => setForm({ ...form, priority: e.target.value as TaskPriority })}
                        className="mt-1 h-11 w-full rounded-lg border border-base-300 bg-transparent px-3 text-sm font-normal text-base-content"
                      >
                        <option value="low">Düşük</option>
                        <option value="medium">Orta</option>
                        <option value="high">Yüksek</option>
                      </select>
                    </label>
                    <label className="block text-sm font-medium text-base-content/80">
                      Bitiş Tarihi
                      <input
                        type="date"
                        value={form.dueDate}
                        onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                        className="mt-1 h-11 w-full rounded-lg border border-base-300 bg-transparent px-3 text-sm font-normal text-base-content"
                      />
                    </label>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setModalOpen(false)}
                      className="h-10 rounded-lg px-4 text-sm font-medium text-base-content/70 ring-1 ring-inset ring-base-300 hover:bg-base-200"
                    >
                      İptal
                    </button>
                    <button
                      type="submit"
                      disabled={saving || !form.title.trim()}
                      className="h-10 rounded-lg bg-primary px-5 text-sm font-medium text-primary-content hover:brightness-95 disabled:opacity-50"
                    >
                      {saving ? 'Kaydediliyor...' : 'Kaydet'}
                    </button>
                  </div>
                </form>
              </Dialog.Panel>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
}
