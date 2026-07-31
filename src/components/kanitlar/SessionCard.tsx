'use client';

import React from 'react';
import { CloudArrowUpIcon, UserPlusIcon } from '@heroicons/react/24/outline';
import { IUser } from './UserMultiSelect';

export interface IEvidenceSession {
  _id: string;
  title: string;
  description?: string;
  createdBy: IUser;
  reporters: IUser[];
  dataEntryUsers: IUser[];
  status: 'active' | 'completed' | 'archived';
  createdAt: string;
}

export default function SessionCard({
  session,
  isSelected,
  currentUser,
  isSorumluOrAdmin,
  onSelectSession,
  onOpenAssignModal
}: {
  session: IEvidenceSession;
  isSelected: boolean;
  currentUser: IUser | null;
  isSorumluOrAdmin: boolean;
  onSelectSession: (session: IEvidenceSession) => void;
  onOpenAssignModal: (session: IEvidenceSession) => void;
}) {
  return (
    <div
      className={`group relative bg-base-100 p-6 rounded-3xl border transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl flex flex-col justify-between overflow-hidden ${
        isSelected
          ? 'border-primary ring-2 ring-primary/20 shadow-lg shadow-primary/10'
          : 'border-base-200/90 hover:border-primary/40'
      }`}
    >
      <div
        className={`absolute top-0 left-0 right-0 h-1 transition-all ${
          isSelected
            ? 'bg-gradient-to-r from-primary via-blue-500 to-secondary'
            : 'bg-transparent group-hover:bg-primary/30'
        }`}
      />

      <div>
        <div className="flex items-start justify-between gap-3 mb-3">
          <h3 className="font-black text-lg text-base-content group-hover:text-primary transition-colors line-clamp-1">
            {session.title}
          </h3>
          <span className="badge badge-success badge-sm font-bold uppercase tracking-wider px-2.5 py-1 rounded-full shadow-xs">
            Aktif
          </span>
        </div>

        <p className="text-xs text-base-content/70 mb-5 line-clamp-2 leading-relaxed">
          {session.description || 'Bu oturum için ek açıklama girilmedi.'}
        </p>

        <div className="space-y-2.5 border-t border-base-200/70 pt-4 text-xs">
          <div className="flex items-center justify-between text-base-content/80">
            <span className="font-medium text-base-content/60">Oturum Sahibi:</span>
            <span className="font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-lg border border-primary/20">
              {session.createdBy?.name || 'Sorumlu'}
            </span>
          </div>

          <div className="flex items-center justify-between text-base-content/80">
            <span className="font-medium text-base-content/60">Raportörler:</span>
            <span className="badge badge-ghost badge-sm font-bold rounded-lg">
              {session.reporters?.length || 0} Kişi
            </span>
          </div>

          <div className="flex items-center justify-between text-base-content/80">
            <span className="font-medium text-base-content/60">Veri Giriciler:</span>
            <span className="badge badge-ghost badge-sm font-bold rounded-lg">
              {session.dataEntryUsers?.length || 0} Kişi
            </span>
          </div>
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-base-200/70 flex gap-2">
        <button
          onClick={() => onSelectSession(session)}
          className="btn btn-primary btn-sm flex-1 gap-2 rounded-xl shadow-md hover:shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-all font-bold"
        >
          <CloudArrowUpIcon className="h-4 w-4" />
          Kanıt Yükle & Aç
        </button>

        {(isSorumluOrAdmin || session.createdBy?._id === currentUser?._id) && (
          <button
            onClick={() => onOpenAssignModal(session)}
            className="btn btn-outline btn-secondary btn-sm gap-1.5 rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all font-bold"
            title="Raportör ve Kullanıcı Atama"
          >
            <UserPlusIcon className="h-4 w-4" />
            Üye Atama
          </button>
        )}
      </div>
    </div>
  );
}
