'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ShoppingBagIcon } from '@heroicons/react/24/outline';
import MalzemeTalepPool from '@/src/components/forms/MalzemeTalepPool';
import MalzemeTalepForm, { IUser } from '@/src/components/forms/MalzemeTalepForm';

export default function MalzemeTalepleriPage() {
  const [currentUser, setCurrentUser] = useState<IUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isNewFormModalOpen, setIsNewFormModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    fetchUser();
  }, []);

  const fetchUser = async () => {
    try {
      const res = await axios.get('/api/me');
      setCurrentUser(res.data);
    } catch (err) {
      console.error('User fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[1750px] mx-auto p-2.5 sm:p-4 md:p-6 space-y-6">
      {loading ? (
        <div className="flex flex-col items-center justify-center p-16 space-y-4">
          <span className="loading loading-spinner loading-lg text-primary"></span>
          <p className="text-xs font-semibold text-base-content/60 animate-pulse">Malzeme talepleri yükleniyor...</p>
        </div>
      ) : (
        <MalzemeTalepPool
          key={refreshKey}
          currentUser={currentUser}
          onOpenNewFormModal={() => setIsNewFormModalOpen(true)}
        />
      )}

      <MalzemeTalepForm
        isOpen={isNewFormModalOpen}
        onClose={() => setIsNewFormModalOpen(false)}
        currentUser={currentUser}
        onSuccess={() => setRefreshKey((prev) => prev + 1)}
      />
    </div>
  );
}
