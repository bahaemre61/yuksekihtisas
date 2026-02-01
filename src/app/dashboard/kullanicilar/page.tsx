'use client';

import React, {useEffect, useState, Fragment} from 'react';
import axios from 'axios';
import { TrashIcon, UserPlusIcon, PencilSquareIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { Dialog, Transition } from '@headlessui/react';

interface IUser{
    _id: string;
    name: string;
    email: string;
    role: 'user' | 'driver' | 'admin' | 'amir' | 'tech';
}

export default function UserPage() {
    const [users, setUsers] = useState<IUser[]>([]);
    const [loading, setLoading] = useState(true);

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
    const [editPassword, setEditPassword] = useState('');


    const fetchUser = async() =>{
        try{
            const res= await axios.get('/api/admin/users');
            setUsers(res.data);
        }catch(err){
            console.error(err);
        }finally{
            setLoading(false);
        }
    };
    useEffect(() => {
        fetchUser();
    },[]);

    const handleAddUser = async(e: React.FormEvent) => {
        e.preventDefault();
        try{
            await axios.post('/api/admin/users', {
                name: newName,
                email: newEmail,
                password : newPassword,
                role : newRole
            });
            alert("Kullanıcı oluşturuldu!");
            setShowAddForm(false);
            setNewName(''); setNewEmail(''); setNewPassword('');
            fetchUser();
        }catch(err:any)
        {
            alert(err.response?.data?.msg || "Hata oluştu");
        }
    };

    const handleDelete = async (id:string) => {
        if(!confirm("Bu kullanıcıyı silmek istediğinize emin misiniz?")) return;
        try{
            await axios.delete(`/api/admin/users/${id}`);
            setUsers(prev=>prev.filter(u => u._id !== id));
        }catch (err:any)
        {
            alert(err.response?.data?.msg ||'Silinemedi')
        }
    };

    const openEditModal = (user: IUser) => {
    setEditingUser(user);
    setEditName(user.name);
    setEditEmail(user.email);
    setEditRole(user.role);
    setEditPassword(''); 
    setIsEditModalOpen(true);
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;
    try {
        await axios.put(`/api/admin/users/${editingUser._id}`, {
            name: editName,
            email: editEmail,
            role: editRole,
        });

        alert("Güncelleme başarılı!");
        setIsEditModalOpen(false);
        fetchUser(); 
    } catch (err: any) {
        alert(err.response?.data?.msg || "Güncellenemedi");
    }
  };

    if(loading) return <div className='p-6'>Yükleniyor...</div>;

    return (
    <div className="bg-white p-6 rounded-lg shadow-lg">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Kullanıcı Yönetimi</h2>
        <button 
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors shadow-sm"
        >
            <UserPlusIcon className="h-4 w-4 mr-2" />
            {showAddForm ? 'İptal' : 'Kullanıcı Ekle'}
        </button>
      </div>

      {showAddForm && (
        <form onSubmit={handleAddUser} className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200 shadow-inner animate-fade-in-down">
            <div className="flex flex-col md:flex-row gap-3 items-end">
                <div className="w-full md:w-1/4">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Ad Soyad</label>
                    <input type="text" required value={newName} onChange={e => setNewName(e.target.value)} 
                        className="w-full px-3 py-1.5 text-sm border rounded focus:ring-1 focus:ring-blue-500 outline-none" />
                </div>
                <div className="w-full md:w-1/4">
                    <label className="block text-xs font-medium text-gray-500 mb-1">E-posta</label>
                    <input type="email" required value={newEmail} onChange={e => setNewEmail(e.target.value)} 
                        className="w-full px-3 py-1.5 text-sm border rounded focus:ring-1 focus:ring-blue-500 outline-none" />
                </div>
                <div className="w-full md:w-1/4">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Şifre</label>
                    <input type="password" required value={newPassword} onChange={e => setNewPassword(e.target.value)} 
                        className="w-full px-3 py-1.5 text-sm border rounded focus:ring-1 focus:ring-blue-500 outline-none" />
                </div>
                <div className="w-full md:w-1/5">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Rol</label>
                    <select value={newRole} onChange={e => setNewRole(e.target.value)} 
                        className="w-full px-3 py-1.5 text-sm border rounded bg-white focus:ring-1 focus:ring-blue-500 outline-none">
                        <option value="user">Kullanıcı</option>
                        <option value="driver">Şoför</option>
                        <option value="admin">Admin</option>
                        <option value="amir">Amir</option>
                        <option value="amir">Teknik</option>
                    </select>
                </div>
                <div className="w-full md:w-auto">
                    <button type="submit" className="w-full md:w-auto px-4 py-1.5 bg-green-600 text-white text-sm font-medium rounded hover:bg-green-700 transition-colors">
                        Kaydet
                    </button>
                </div>
            </div>
        </form>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
                <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">İsim</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">E-posta</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rol</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
                </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
                {users.map(user => (
                    <tr key={user._id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{user.name}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full border 
                                ${user.role === 'admin' ? 'bg-purple-50 text-purple-700 border-purple-200' : 
                                  user.role === 'amir' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                  user.role === 'driver' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 
                                  user.role === 'tech' ? 'bg-green-50 text-green-700 border-green-200' :
                                  'bg-gray-50 text-gray-600 border-gray-200'}`}>
                                {user.role.toUpperCase()}
                            </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex items-center justify-end space-x-2">
                                <button 
                                    onClick={() => openEditModal(user)} 
                                    className="p-1 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded"
                                    title="Düzenle"
                                >
                                    <PencilSquareIcon className="h-4 w-4" />
                                </button>
                                <button 
                                    onClick={() => handleDelete(user._id)} 
                                    className="p-1 text-red-600 hover:text-red-900 hover:bg-red-50 rounded"
                                    title="Sil"
                                >
                                    <TrashIcon className="h-4 w-4" />
                                </button>
                            </div>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
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
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                  <div className="flex justify-between items-center mb-4">
                    <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                        Kullanıcı Düzenle
                    </Dialog.Title>
                    <button onClick={() => setIsEditModalOpen(false)} className="text-gray-400 hover:text-gray-500">
                        <XMarkIcon className="h-6 w-6" />
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Ad Soyad</label>
                        <input type="text" value={editName} onChange={e => setEditName(e.target.value)} 
                            className="mt-1 w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 outline-none" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">E-posta</label>
                        <input type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)} 
                            className="mt-1 w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 outline-none" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Rol</label>
                        <select value={editRole} onChange={e => setEditRole(e.target.value)} 
                            className="mt-1 w-full px-3 py-2 border rounded-md bg-white focus:ring-blue-500 focus:border-blue-500 outline-none">
                            <option value="user">Kullanıcı</option>
                            <option value="driver">Şoför</option>
                            <option value="admin">Admin</option>
                            <option value="amir">Amir</option>
                            <option value="tech">Teknik</option>
                        </select>
                    </div>
                
                  </div>

                  <div className="mt-6 flex justify-end space-x-3">
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-md border border-transparent bg-gray-100 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-200 focus:outline-none"
                      onClick={() => setIsEditModalOpen(false)}
                    >
                      İptal
                    </button>
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none"
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