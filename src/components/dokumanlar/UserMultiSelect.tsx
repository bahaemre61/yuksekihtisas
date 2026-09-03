'use client';

import React, { useState } from 'react';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';

export interface IUser {
  _id: string;
  name: string;
  email: string;
  role: string;
}

export default function UserMultiSelect({
  label,
  users,
  selectedIds,
  onChange
}: {
  label: string;
  users: IUser[];
  selectedIds: string[];
  onChange: (selected: string[]) => void;
}) {
  const [search, setSearch] = useState('');

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  const toggleUser = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((item) => item !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const selectAll = () => {
    const allFiltered = filteredUsers.map((u) => u._id);
    const combined = Array.from(new Set([...selectedIds, ...allFiltered]));
    onChange(combined);
  };

  const clearAll = () => {
    onChange([]);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-base-content/80">{label}</label>
        <span className="text-xs font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full border border-primary/20">
          {selectedIds.length} kişi seçildi
        </span>
      </div>

      <div className="relative">
        <MagnifyingGlassIcon className="h-4 w-4 absolute left-3 top-2.5 text-base-content/40" />
        <input
          type="text"
          className="input input-bordered input-sm w-full pl-9 text-xs focus:ring-2 focus:ring-primary/20 transition-all rounded-xl"
          placeholder="Kullanıcı ara (ad veya e-posta)..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch('')}
            className="absolute right-2.5 top-2 text-base-content/40 hover:text-base-content"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="flex items-center justify-between text-[11px] text-base-content/60 px-1">
        <span>Gösterilen: {filteredUsers.length} kullanıcı</span>
        <div className="space-x-3">
          <button
            type="button"
            onClick={selectAll}
            className="text-primary font-bold hover:underline transition-all"
          >
            Tümünü Seç
          </button>
          <span>|</span>
          <button
            type="button"
            onClick={clearAll}
            className="text-error font-bold hover:underline transition-all"
          >
            Seçimleri Temizle
          </button>
        </div>
      </div>

      <div className="border border-base-200 rounded-2xl overflow-y-auto max-h-60 p-2 space-y-1.5 bg-base-100/50 backdrop-blur-xs">
        {filteredUsers.length === 0 ? (
          <p className="text-xs text-base-content/50 text-center py-6">Eşleşen kullanıcı bulunamadı.</p>
        ) : (
          filteredUsers.map((u) => {
            const isChecked = selectedIds.includes(u._id);
            return (
              <label
                key={u._id}
                className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all duration-200 ${
                  isChecked
                    ? 'bg-primary/10 border border-primary/40 shadow-xs translate-x-0.5'
                    : 'hover:bg-base-200/70 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-primary checkbox-xs rounded-md"
                    checked={isChecked}
                    onChange={() => toggleUser(u._id)}
                  />
                  <div>
                    <div className="font-bold text-xs text-base-content">{u.name}</div>
                    <div className="text-[11px] text-base-content/60">{u.email}</div>
                  </div>
                </div>
              </label>
            );
          })
        )}
      </div>
    </div>
  );
}
