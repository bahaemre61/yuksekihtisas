'use client';

import React, { useState } from 'react';
import axios from 'axios';
import { UserPlusIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';
import { IUser } from './UserMultiSelect';

export default function UserRoleManagement({
  allUsers,
  onRefresh
}: {
  allUsers: IUser[];
  onRefresh: () => void;
}) {
  const [selectedUserForRole, setSelectedUserForRole] = useState<string>('');
  const [newRoleForUser, setNewRoleForUser] = useState<string>('kanit_sorumlu');

  const handleAssignUserRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForRole) {
      alert('Lütfen bir kullanıcı seçin.');
      return;
    }
    try {
      const res = await axios.post('/api/evidence/users', {
        targetUserId: selectedUserForRole,
        newRole: newRoleForUser
      });
      alert(res.data.msg);
      setSelectedUserForRole('');
      onRefresh();
    } catch (err: any) {
      alert(err.response?.data?.msg || 'Rol atama hatası');
    }
  };

  return (
    <div className="bg-base-100 p-6 md:p-8 rounded-3xl border border-base-200 shadow-sm space-y-6">
      <div>
        <h3 className="font-black text-xl text-base-content flex items-center gap-2.5">
          <UserPlusIcon className="h-7 w-7 text-primary" />
          Sistem Yetkilendirme & Rol Yönetimi
        </h3>
        <p className="text-xs text-base-content/70 mt-1">
          Kullanıcılara Alan Sorumlusu (Amir) veya Raportör yetkisi tanımlayabilirsiniz.
        </p>
      </div>

      <form onSubmit={handleAssignUserRole} className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-base-200/50 p-5 rounded-2xl border border-base-200 items-end">
        <div>
          <label className="label text-xs font-bold">Kullanıcı Seçin *</label>
          <select
            className="select select-bordered select-sm w-full font-bold rounded-xl"
            value={selectedUserForRole}
            onChange={(e) => setSelectedUserForRole(e.target.value)}
            required
          >
            <option value="">-- Kullanıcı Seçiniz --</option>
            {allUsers.map((u) => (
              <option key={u._id} value={u._id}>
                {u.name} ({u.email})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label text-xs font-bold">Atanacak Rol *</label>
          <select
            className="select select-bordered select-sm w-full font-bold rounded-xl"
            value={newRoleForUser}
            onChange={(e) => setNewRoleForUser(e.target.value)}
            required
          >
            <option value="kanit_sorumlu">Kanıt / Alan Sorumlusu (Amir)</option>
            <option value="raportor">Raportör (İncelemeci)</option>
            <option value="mali_isler">Mali İşler Sorumlusu</option>
            <option value="user">Normal Kullanıcı (Veri Giriş)</option>
            <option value="admin">Admin (Tam Yetkili)</option>
          </select>
        </div>

        <div>
          <button type="submit" className="btn btn-primary btn-sm w-full gap-2 rounded-xl font-bold shadow-md hover:scale-[1.01] transition-all">
            <ShieldCheckIcon className="h-4 w-4" />
            Yetkiyi Tanımla
          </button>
        </div>
      </form>

      {/* Users List Table */}
      <div className="overflow-x-auto pt-2">
        <table className="table table-zebra w-full text-xs">
          <thead>
            <tr className="border-b border-base-200">
              <th className="font-bold">Kullanıcı Adı</th>
              <th className="font-bold">E-Posta</th>
              <th className="font-bold">Sistemdeki Rolü</th>
            </tr>
          </thead>
          <tbody>
            {allUsers.map((u) => (
              <tr key={u._id}>
                <td className="font-bold text-base-content">{u.name}</td>
                <td>{u.email}</td>
                <td>
                  <span className="badge badge-ghost badge-sm uppercase font-bold px-2 py-0.5 rounded-full">
                    {u.role}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
