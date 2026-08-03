'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  FolderPlusIcon,
  CloudArrowUpIcon,
  ShieldCheckIcon,
  UserPlusIcon,
  SparklesIcon,
  UserGroupIcon,
  ArrowPathIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';

import { IUser } from '@/src/components/kanitlar/UserMultiSelect';
import SessionCard, { IEvidenceSession } from '@/src/components/kanitlar/SessionCard';
import NewSessionModal from '@/src/components/kanitlar/NewSessionModal';
import AssignUsersModal from '@/src/components/kanitlar/AssignUsersModal';
import DocumentRequestModal from '@/src/components/kanitlar/DocumentRequestModal';
import EvidenceUploadSection, { ICompletedFormInfo } from '@/src/components/kanitlar/EvidenceUploadSection';
import EvidenceTable, { IEvidence } from '@/src/components/kanitlar/EvidenceTable';
import ReviewPanel from '@/src/components/kanitlar/ReviewPanel';
import UserRoleManagement from '@/src/components/kanitlar/UserRoleManagement';

export default function KanitlarPage() {
  const [currentUser, setCurrentUser] = useState<IUser | null>(null);
  const [allUsers, setAllUsers] = useState<IUser[]>([]);
  const [sessions, setSessions] = useState<IEvidenceSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<IEvidenceSession | null>(null);
  const [evidences, setEvidences] = useState<IEvidence[]>([]);

  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'sessions' | 'evidence' | 'review' | 'admin'>('sessions');

  // Completed Form State for Sequential Stepper (Unlocks Step 2 & 3 after Step 1)
  const [completedForm, setCompletedForm] = useState<ICompletedFormInfo | null>(null);

  // Modals
  const [isNewSessionModalOpen, setIsNewSessionModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assignSession, setAssignSession] = useState<IEvidenceSession | null>(null);
  const [isDocRequestModalOpen, setIsDocRequestModalOpen] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [meRes, usersRes, sessionsRes] = await Promise.all([
        axios.get('/api/me'),
        axios.get('/api/evidence/users'),
        axios.get('/api/evidence/sessions')
      ]);

      setCurrentUser(meRes.data);
      setAllUsers(usersRes.data);
      setSessions(sessionsRes.data);

      if (sessionsRes.data.length > 0) {
        setSelectedSession(sessionsRes.data[0]);
        fetchEvidences(sessionsRes.data[0]._id);
      }
    } catch (err) {
      console.error('Initial data fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSessions = async () => {
    try {
      const res = await axios.get('/api/evidence/sessions');
      setSessions(res.data);
    } catch (err) {
      console.error('Fetch sessions error:', err);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await axios.get('/api/evidence/users');
      setAllUsers(res.data);
    } catch (err) {
      console.error('Fetch users error:', err);
    }
  };

  const fetchEvidences = async (sessionId: string) => {
    try {
      const res = await axios.get(`/api/evidence?sessionId=${sessionId}`);
      setEvidences(res.data);
    } catch (err) {
      console.error('Fetch evidences error:', err);
    }
  };

  const handleOpenAssignModal = (session: IEvidenceSession) => {
    setAssignSession(session);
    setIsAssignModalOpen(true);
  };

  const isSorumluOrAdmin =
    currentUser?.role === 'admin' ||
    currentUser?.role === 'kanit_sorumlu' ||
    currentUser?.role === 'supervisor' ||
    currentUser?.role === 'amir';

  const isRaportor =
    currentUser?.role === 'raportor' ||
    (selectedSession && selectedSession.reporters?.some((r) => r._id === currentUser?._id));

  const canReview = isSorumluOrAdmin || isRaportor;

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Sleek Header Banner */}
      <div className="relative overflow-hidden bg-linear-to-r from-primary/10 via-base-100 to-secondary/15 p-6 md:p-8 rounded-3xl shadow-sm border border-base-200/80 backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all duration-300 hover:shadow-md">
        <div className="space-y-2 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-extrabold uppercase tracking-wider border border-primary/20 shadow-xs">
            <SparklesIcon className="h-4 w-4 text-primary animate-spin-slow" />
            Kanıt Portalı
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-base-content">
            Kanıt Yönetimi & Oturum Alanı
          </h1>
          <p className="text-xs md:text-sm text-base-content/70 max-w-2xl leading-relaxed">
            Veri girme oturumlarını başlatın, dijital doküman talep formlarını doldurun ve kanıtlarınızı güvenle yükleyin.
          </p>
        </div>

        {isSorumluOrAdmin && (
          <button
            onClick={() => setIsNewSessionModalOpen(true)}
            className="group relative inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl bg-linear-to-r from-primary to-blue-600 hover:from-primary/95 hover:to-blue-700 text-white font-bold text-sm shadow-xl shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 shrink-0 cursor-pointer overflow-hidden"
          >
            <FolderPlusIcon className="h-5 w-5 group-hover:scale-110 transition-transform" />
            <span>Yeni Veri Oturumu Aç</span>
          </button>
        )}
      </div>

      {/* Modern Navigation Tabs */}
      <div className="flex flex-wrap gap-2 p-2 bg-base-200/60 rounded-2xl border border-base-200/80 backdrop-blur-md">
        <button
          onClick={() => setActiveTab('sessions')}
          className={`group flex items-center gap-2.5 rounded-xl px-5 py-3 font-bold text-xs md:text-sm transition-all duration-300 cursor-pointer ${
            activeTab === 'sessions'
              ? 'bg-primary text-primary-content shadow-lg shadow-primary/30 scale-[1.01]'
              : 'text-base-content/70 hover:bg-base-100 hover:text-base-content'
          }`}
        >
          <UserGroupIcon className="h-5 w-5 group-hover:scale-110 transition-transform" />
          <span>Veri Oturumları</span>
          <span className={`px-2 py-0.5 rounded-full text-[11px] font-black transition-all ${
            activeTab === 'sessions' ? 'bg-primary-content/20 text-primary-content' : 'bg-base-300 text-base-content/70'
          }`}>
            {sessions.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('evidence')}
          className={`group flex items-center gap-2.5 rounded-xl px-5 py-3 font-bold text-xs md:text-sm transition-all duration-300 cursor-pointer ${
            activeTab === 'evidence'
              ? 'bg-primary text-primary-content shadow-lg shadow-primary/30 scale-[1.01]'
              : 'text-base-content/70 hover:bg-base-100 hover:text-base-content'
          }`}
        >
          <CloudArrowUpIcon className="h-5 w-5 group-hover:scale-110 transition-transform" />
          <span>Kanıt Yükle & Doküman Formu</span>
          {selectedSession && (
            <span className="hidden sm:inline text-xs font-medium opacity-80 max-w-[140px] truncate">
              ({selectedSession.title})
            </span>
          )}
        </button>

        {canReview && (
          <button
            onClick={() => setActiveTab('review')}
            className={`group flex items-center gap-2.5 rounded-xl px-5 py-3 font-bold text-xs md:text-sm transition-all duration-300 cursor-pointer ${
              activeTab === 'review'
                ? 'bg-primary text-primary-content shadow-lg shadow-primary/30 scale-[1.01]'
                : 'text-base-content/70 hover:bg-base-100 hover:text-base-content'
            }`}
          >
            <ShieldCheckIcon className="h-5 w-5 group-hover:scale-110 transition-transform" />
            <span>Raportör İnceleme Paneli</span>
          </button>
        )}

        {isSorumluOrAdmin && (
          <button
            onClick={() => setActiveTab('admin')}
            className={`group flex items-center gap-2.5 rounded-xl px-5 py-3 font-bold text-xs md:text-sm transition-all duration-300 cursor-pointer ${
              activeTab === 'admin'
                ? 'bg-primary text-primary-content shadow-lg shadow-primary/30 scale-[1.01]'
                : 'text-base-content/70 hover:bg-base-100 hover:text-base-content'
            }`}
          >
            <UserPlusIcon className="h-5 w-5 group-hover:scale-110 transition-transform" />
            <span>Yetki Yönetimi</span>
          </button>
        )}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex flex-col items-center justify-center p-16 space-y-4">
          <span className="loading loading-spinner loading-lg text-primary"></span>
          <p className="text-xs font-semibold text-base-content/60 animate-pulse">Veriler ve oturumlar yükleniyor...</p>
        </div>
      )}

      {/* TAB 1: SESSIONS LIST */}
      {!loading && activeTab === 'sessions' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sessions.length === 0 ? (
            <div className="col-span-full p-16 text-center bg-base-100/60 rounded-3xl border-2 border-dashed border-base-300 space-y-4">
              <DocumentTextIcon className="h-16 w-16 text-base-content/30 mx-auto" />
              <p className="font-bold text-base-content/70 text-lg">Henüz açık bir veri girme oturumu bulunmuyor.</p>
              {isSorumluOrAdmin && (
                <button
                  onClick={() => setIsNewSessionModalOpen(true)}
                  className="btn btn-primary btn-md gap-2 rounded-xl shadow-lg shadow-primary/20 hover:scale-105 transition-all"
                >
                  <FolderPlusIcon className="h-5 w-5" />
                  İlk Oturumu Oluştur
                </button>
              )}
            </div>
          ) : (
            sessions.map((session) => (
              <SessionCard
                key={session._id}
                session={session}
                isSelected={selectedSession?._id === session._id}
                currentUser={currentUser}
                isSorumluOrAdmin={isSorumluOrAdmin || false}
                onSelectSession={(s) => {
                  setSelectedSession(s);
                  fetchEvidences(s._id);
                  setActiveTab('evidence');
                }}
                onOpenAssignModal={handleOpenAssignModal}
              />
            ))
          )}
        </div>
      )}

      {/* TAB 2: EVIDENCE & SEQUENTIAL 3-STEP WORKFLOW */}
      {!loading && activeTab === 'evidence' && (
        <div className="space-y-8">
          {/* Active Session Picker Banner */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-base-100 p-4 rounded-2xl border border-base-200 shadow-xs">
            <div className="flex items-center gap-2 shrink-0">
              <SparklesIcon className="h-5 w-5 text-primary" />
              <span className="font-black text-sm text-base-content">Seçili Oturum:</span>
            </div>
            <select
              className="select select-bordered select-sm flex-1 w-full font-bold text-xs md:text-sm rounded-xl focus:ring-2 focus:ring-primary/20 transition-all"
              value={selectedSession?._id || ''}
              onChange={(e) => {
                const s = sessions.find((item) => item._id === e.target.value);
                if (s) {
                  setSelectedSession(s);
                  fetchEvidences(s._id);
                }
              }}
            >
              {sessions.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.title} (Oluşturan: {s.createdBy?.name})
                </option>
              ))}
            </select>
            <button
              onClick={() => selectedSession && fetchEvidences(selectedSession._id)}
              className="btn btn-ghost btn-sm btn-square rounded-xl hover:bg-base-200 hover:rotate-180 transition-transform duration-500"
              title="Yenile"
            >
              <ArrowPathIcon className="h-4 w-4" />
            </button>
          </div>

          {selectedSession && (
            <div className="space-y-8">
              {/* Full-Width 3-Step Sequential Workflow Section */}
              <EvidenceUploadSection
                sessionId={selectedSession._id}
                onUploadSuccess={() => fetchEvidences(selectedSession._id)}
                onOpenDocumentRequestModal={() => setIsDocRequestModalOpen(true)}
                completedForm={completedForm}
                onResetFormStep={() => setCompletedForm(null)}
              />

              {/* Uploaded Evidences Table Component */}
              <EvidenceTable
                evidences={evidences}
                canReview={canReview || false}
                currentUser={currentUser}
                selectedSession={selectedSession}
                onRefresh={() => fetchEvidences(selectedSession._id)}
              />
            </div>
          )}
        </div>
      )}

      {/* TAB 3: RAPORTOR REVIEW PANEL */}
      {!loading && activeTab === 'review' && canReview && (
        <ReviewPanel
          sessions={sessions}
          selectedSession={selectedSession}
          evidences={evidences}
          onSelectSession={(s) => {
            setSelectedSession(s);
            fetchEvidences(s._id);
          }}
          onRefresh={() => selectedSession && fetchEvidences(selectedSession._id)}
        />
      )}

      {/* TAB 4: ADMIN ROLE MANAGEMENT */}
      {!loading && activeTab === 'admin' && isSorumluOrAdmin && (
        <UserRoleManagement allUsers={allUsers} onRefresh={fetchUsers} />
      )}

      {/* MODALS */}
      <NewSessionModal
        isOpen={isNewSessionModalOpen}
        onClose={() => setIsNewSessionModalOpen(false)}
        allUsers={allUsers}
        onSuccess={fetchSessions}
      />

      <AssignUsersModal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        session={assignSession}
        allUsers={allUsers}
        onSuccess={fetchSessions}
      />

      {selectedSession && (
        <DocumentRequestModal
          isOpen={isDocRequestModalOpen}
          onClose={() => setIsDocRequestModalOpen(false)}
          sessionId={selectedSession._id}
          currentUser={currentUser}
          onSuccess={(formData) => {
            setCompletedForm(formData);
            fetchEvidences(selectedSession._id);
          }}
        />
      )}
    </div>
  );
}
