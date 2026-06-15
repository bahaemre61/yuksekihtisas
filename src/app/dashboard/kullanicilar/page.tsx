'use client';

import React, { useEffect, useState, Fragment } from 'react';
import axios from 'axios';
import { 
    TrashIcon, 
    UserPlusIcon, 
    PencilSquareIcon, 
    XMarkIcon, 
    MagnifyingGlassIcon 
} from '@heroicons/react/24/outline';
import { Dialog, Transition } from '@headlessui/react';

interface IUser {
    _id: string;
    name: string;
    email: string;
    role: 'user' | 'driver' | 'admin' | 'amir' | 'tech' | 'supervisor' | 'techamir' | 'akademik';
    isActive?: boolean;
}

export default function UserPage() {
    const [users, setUsers] = useState<IUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState(''); 

    const [showAddForm, setShowAddForm] = useState(false);
    const [newName, setNewName] = useState('');
    const [newEmail, setNewEmail] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [newRole, setNewRole] = useState('user');

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<IUser | null>(null);
    const [editName, setEditName] = useState('');
    const [editEmail, setEditEmail] = useState('');
    const [editRole, setEditRole] = useState('user');
    const [editIsActive, setEditIsActive] = useState(true);

    // fetchUser artık opsiyonel bir arama parametresi alıyor
    const fetchUser = async (search: string = '') => {
        try {
            const res = await axios.get(`/api/admin/users?search=${search}`);
            setUsers(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // Debounce: Kullanıcı yazmayı bıraktıktan 300ms sonra arama yapar
    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            fetchUser(searchTerm);
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm]);

    const handleAddUser = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await axios.post('/api/admin/users', {
                name: newName,
                email: newEmail,
                password: newPassword,
                role: newRole
            });
            alert("Kullanıcı oluşturuldu!");
            setShowAddForm(false);
            setNewName(''); setNewEmail(''); setNewPassword('');
            fetchUser(searchTerm); 
        } catch (err: any) {
            alert(err.response?.data?.msg || "Hata oluştu");
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Bu kullanıcıyı silmek istediğinize emin misiniz?")) return;
        try {
            await axios.delete(`/api/admin/users/${id}`);
            setUsers(prev => prev.filter(u => u._id !== id));
        } catch (err: any) {
            alert(err.response?.data?.msg || 'Silinemedi')
        }
    };

    const openEditModal = (user: IUser) => {
        setEditingUser(user);
        setEditName(user.name);
        setEditEmail(user.email);
        setEditRole(user.role);
        setEditIsActive(user.isActive !== false);
        setIsEditModalOpen(true);
    };

    const handleUpdateUser = async () => {
        if (!editingUser) return;
        try {
            await axios.put(`/api/admin/users/${editingUser._id}`, {
                name: editName,
                email: editEmail,
                role: editRole,
                isActive: editIsActive,
            });

            alert("Güncelleme başarılı!");
            setIsEditModalOpen(false);
            fetchUser(searchTerm);
        } catch (err: any) {
            alert(err.response?.data?.msg || "Güncellenemedi");
        }
    };

    return (
        <div className="bg-base-100 p-6 rounded-lg shadow-lg border border-base-200">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <h2 className="text-2xl font-bold text-base-content">Kullanıcı Yönetimi</h2>
                
                <div className="flex w-full md:w-auto gap-2">
                    <div className="relative grow md:w-64">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <MagnifyingGlassIcon className="h-4 w-4 text-base-content/40" />
                        </div>
                        <input
                            type="text"
                            placeholder="İsim veya e-posta ara..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 text-sm border border-base-300 bg-base-100 text-base-content rounded-md focus:ring-1 focus:ring-primary outline-none transition-all"
                        />
                    </div>

                    <button
                        onClick={() => setShowAddForm(!showAddForm)}
                        className="flex items-center px-4 py-2 bg-primary text-primary-content text-sm rounded-md hover:brightness-90 transition-colors shadow-sm whitespace-nowrap"
                    >
                        <UserPlusIcon className="h-4 w-4 mr-2" />
                        {showAddForm ? 'İptal' : 'Kullanıcı Ekle'}
                    </button>
                </div>
            </div>

            {showAddForm && (
                <form onSubmit={handleAddUser} className="mb-6 p-4 bg-base-200 rounded-lg border border-base-300 shadow-inner">
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
                        <div className="md:col-span-1">
                            <label className="block text-xs font-medium text-base-content/60 mb-1">Ad Soyad</label>
                            <input type="text" required value={newName} onChange={e => setNewName(e.target.value)}
                                className="w-full px-3 py-1.5 text-sm border border-base-300 bg-base-100 text-base-content rounded focus:ring-1 focus:ring-primary outline-none" />
                        </div>
                        <div className="md:col-span-1">
                            <label className="block text-xs font-medium text-base-content/60 mb-1">E-posta</label>
                            <input type="email" required value={newEmail} onChange={e => setNewEmail(e.target.value)}
                                className="w-full px-3 py-1.5 text-sm border border-base-300 bg-base-100 text-base-content rounded focus:ring-1 focus:ring-primary outline-none" />
                        </div>
                        <div className="md:col-span-1">
                            <label className="block text-xs font-medium text-base-content/60 mb-1">Şifre</label>
                            <input type="password" required value={newPassword} onChange={e => setNewPassword(e.target.value)}
                                className="w-full px-3 py-1.5 text-sm border border-base-300 bg-base-100 text-base-content rounded focus:ring-1 focus:ring-primary outline-none" />
                        </div>
                        <div className="md:col-span-1">
                            <label className="block text-xs font-medium text-base-content/60 mb-1">Rol</label>
                            <select value={newRole} onChange={e => setNewRole(e.target.value)}
                                className="w-full px-3 py-1.5 text-sm border border-base-300 rounded bg-base-100 text-base-content focus:ring-1 focus:ring-primary outline-none">
                                <option value="user">Kullanıcı</option>
                                <option value="driver">Şoför</option>
                                <option value="admin">Admin</option>
                                <option value="amir">Amir</option>
                                <option value="tech">Teknik</option>
                                <option value="supervisor">Süpervizör</option>
                                <option value="techamir">Teknik Amir</option>
                                <option value="akademik">Akademik</option>
                            </select>
                        </div>
                        <div className="md:col-span-1">
                            <button type="submit" className="w-full px-4 py-1.5 bg-success text-success-content text-sm font-medium rounded hover:brightness-90 transition-colors">
                                Kaydet
                            </button>
                        </div>
                    </div>
                </form>
            )}

            <div className="overflow-x-auto min-h-[300px]">
                {loading ? (
                    <div className="flex justify-center items-center py-20 text-base-content/50">Yükleniyor...</div>
                ) : (
                    <table className="min-w-full divide-y divide-base-200">
                        <thead className="bg-base-200">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-base-content/60 uppercase tracking-wider">İsim</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-base-content/60 uppercase tracking-wider">E-posta</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-base-content/60 uppercase tracking-wider">Rol</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-base-content/60 uppercase tracking-wider">Durum</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-base-content/60 uppercase tracking-wider">İşlemler</th>
                            </tr>
                        </thead>
                        <tbody className="bg-base-100 divide-y divide-base-200">
                            {users.length > 0 ? (
                                users.map(user => (
                                    <tr key={user._id} className="hover:bg-base-200/50 transition-colors">
                                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-base-content">{user.name}</td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-base-content/60">{user.email}</td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full border 
                                                ${user.role === 'admin' ? 'bg-primary/10 text-primary border-primary/30' :
                                                    user.role === 'amir' ? 'bg-info/10 text-info border-info/30' :
                                                        user.role === 'driver' ? 'bg-warning/10 text-warning border-warning/30' :
                                                            user.role === 'tech' ? 'bg-success/10 text-success border-success/30' :
                                                               user.role === 'supervisor' ? 'bg-secondary/10 text-secondary border-secondary/30' :
                                                               user.role === 'techamir' ? 'bg-accent/10 text-accent border-accent/30' :
                                                               user.role === 'akademik' ? 'bg-purple-500/10 text-purple-500 border-purple-500/30' :
                                                                'bg-base-300 text-base-content border-base-300'}`}>
                                                {user.role.toUpperCase()}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full border 
                                                ${user.isActive !== false ? 'bg-success/10 text-success border-success/30' : 'bg-error/10 text-error border-error/30'}`}>
                                                {user.isActive !== false ? 'Aktif' : 'Deaktif'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex items-center justify-end space-x-2">
                                                <button
                                                    onClick={() => openEditModal(user)}
                                                    className="p-1 text-info hover:text-info/80 hover:bg-info/10 rounded"
                                                    title="Düzenle"
                                                >
                                                    <PencilSquareIcon className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(user._id)}
                                                    className="p-1 text-error hover:text-error/80 hover:bg-error/10 rounded"
                                                    title="Sil"
                                                >
                                                    <TrashIcon className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={4} className="px-4 py-10 text-center text-base-content/40">Sonuç bulunamadı.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>

            <Transition appear show={isEditModalOpen} as={Fragment}>
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
            <div className="fixed inset-0 bg-black bg-opacity-25" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-base-100 p-6 text-left align-middle shadow-xl transition-all border border-base-200">
                  <div className="flex justify-between items-center mb-4">
                    <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-base-content">
                        Kullanıcı Düzenle
                    </Dialog.Title>
                    <button onClick={() => setIsEditModalOpen(false)} className="text-base-content/40 hover:text-base-content/60">
                        <XMarkIcon className="h-6 w-6" />
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-base-content/60">Ad Soyad</label>
                        <input type="text" value={editName} onChange={e => setEditName(e.target.value)} 
                            className="mt-1 w-full px-3 py-2 border border-base-300 bg-base-100 text-base-content rounded-md focus:ring-1 focus:ring-primary outline-none" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-base-content/60">E-posta</label>
                        <input type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)} 
                            className="mt-1 w-full px-3 py-2 border border-base-300 bg-base-100 text-base-content rounded-md focus:ring-1 focus:ring-primary outline-none" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-base-content/60">Rol</label>
                        <select value={editRole} onChange={e => setEditRole(e.target.value)} 
                            className="mt-1 w-full px-3 py-2 border border-base-300 bg-base-100 text-base-content rounded-md focus:ring-1 focus:ring-primary outline-none">
                            <option value="user">Kullanıcı</option>
                            <option value="driver">Şoför</option>
                            <option value="admin">Admin</option>
                            <option value="amir">Amir</option>
                            <option value="tech">Teknik</option>
                            <option value="supervisor">Genel Sekreterlik</option>
                            <option value="techamir">Teknik Amir</option>
                            <option value="akademik">Akademik</option>
                        </select>
                    </div>

                    <div className="flex items-center pt-2">
                        <input
                            type="checkbox"
                            id="editIsActive"
                            checked={editIsActive}
                            onChange={(e) => setEditIsActive(e.target.checked)}
                            className="checkbox checkbox-primary mr-2"
                        />
                        <label htmlFor="editIsActive" className="text-sm font-medium text-base-content/70 cursor-pointer select-none">
                            Hesap Aktif
                        </label>
                    </div>
                
                  </div>

                  <div className="mt-6 flex justify-end space-x-3">
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-md border border-transparent bg-base-200 px-4 py-2 text-sm font-medium text-base-content hover:bg-base-300 focus:outline-none"
                      onClick={() => setIsEditModalOpen(false)}
                    >
                      İptal
                    </button>
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-md border border-transparent bg-primary px-4 py-2 text-sm font-medium text-primary-content hover:brightness-90 focus:outline-none"
                      onClick={handleUpdateUser}
                    >
                      Güncelle
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
                </Dialog>
            </Transition>
        </div>
    );
}
