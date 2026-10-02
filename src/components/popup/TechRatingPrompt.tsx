'use client';

import React, { Fragment, useEffect, useState } from 'react';
import axios from 'axios';
import { Dialog, Transition } from '@headlessui/react';
import StarRating, { RATING_LABELS } from '@/src/components/ui/StarRating';

interface IPendingRating {
  _id: string;
  title: string;
  completedAt?: string | null;
  technicalStaff?: { _id: string; name: string }[];
}

const DISMISS_KEY = 'techRatingDismissed';
const POLL_MS = 30_000;

const readDismissed = (): string[] => {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(window.sessionStorage.getItem(DISMISS_KEY) || '[]');
  } catch {
    return [];
  }
};

function RatingDialog({
  request,
  onRated,
  onDismiss
}: {
  request: IPendingRating;
  onRated: (id: string) => void;
  onDismiss: (id: string) => void;
}) {
  const [score, setScore] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const staffNames = (request.technicalStaff || []).map((s) => s.name).join(', ');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!score || submitting) return;
    setSubmitting(true);
    setError('');
    try {
      await axios.post(`/api/technicalrequests/${request._id}/rating`, { score, comment });
      setDone(true);
      setTimeout(() => onRated(request._id), 1400);
    } catch (err) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.msg : undefined;
      setError(msg || 'Değerlendirme kaydedilemedi. Lütfen tekrar deneyin.');
      setSubmitting(false);
    }
  };

  return (
    <Transition appear show as={Fragment}>
      <Dialog as="div" className="relative z-[60]" onClose={() => !done && onDismiss(request._id)}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
        >
          <div className="fixed inset-0 bg-base-content/40 backdrop-blur-sm" />
        </Transition.Child>
        <div className="fixed inset-0 overflow-y-auto p-4">
          <div className="flex min-h-full items-center justify-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
            >
              <Dialog.Panel className="w-full max-w-md rounded-2xl border border-base-200 bg-base-100 p-6 shadow-2xl">
                {done ? (
                  <div className="py-6 text-center">
                    <StarRating value={score} size="lg" />
                    <h3 className="mt-4 text-lg font-semibold text-base-content">Teşekkür ederiz!</h3>
                    <p className="mt-1 text-sm text-base-content/60">Değerlendirmeniz kaydedildi.</p>
                  </div>
                ) : (
                  <form onSubmit={submit}>
                    <Dialog.Title className="text-lg font-semibold text-base-content">
                      Teknik destek talebinizi değerlendirin
                    </Dialog.Title>
                    <p className="mt-1 text-sm text-base-content/60">
                      <span className="font-medium text-base-content/80">&ldquo;{request.title}&rdquo;</span> talebiniz tamamlandı.
                      {staffNames && <> İşlemi gerçekleştiren: {staffNames}.</>}
                    </p>

                    <div className="mt-5 flex flex-col items-center gap-2">
                      <StarRating value={score} onChange={setScore} size="lg" />
                      <span className="h-5 text-sm font-medium text-base-content/70">
                        {score ? RATING_LABELS[score] : 'Puan vermek için bir yıldıza tıklayın'}
                      </span>
                    </div>

                    <label className="mt-4 block text-sm font-medium text-base-content/80">
                      Yorumunuz <span className="font-normal text-base-content/50">(opsiyonel)</span>
                      <textarea
                        rows={3}
                        maxLength={500}
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="Hizmetle ilgili görüşlerinizi yazabilirsiniz..."
                        className="mt-1.5 w-full rounded-lg border border-base-300 bg-base-100 px-3 py-2.5 text-sm font-normal text-base-content placeholder:text-base-content/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
                      />
                      <span className="mt-0.5 block text-right text-xs font-normal text-base-content/40">{comment.length}/500</span>
                    </label>

                    {error && <p className="mt-2 text-sm font-medium text-error" role="alert">{error}</p>}

                    <div className="mt-5 flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => onDismiss(request._id)}
                        className="h-10 rounded-lg px-4 text-sm font-medium text-base-content/70 ring-1 ring-inset ring-base-300 hover:bg-base-200"
                      >
                        Daha Sonra
                      </button>
                      <button
                        type="submit"
                        disabled={!score || submitting}
                        className="h-10 rounded-lg bg-primary px-5 text-sm font-medium text-primary-content hover:brightness-95 disabled:opacity-50"
                      >
                        {submitting ? 'Gönderiliyor...' : 'Gönder'}
                      </button>
                    </div>
                  </form>
                )}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

// Tamamlanan ve henüz değerlendirilmemiş teknik talepleri tespit edip popup ile puan ister.
export default function TechRatingPrompt() {
  const [queue, setQueue] = useState<IPendingRating[]>([]);
  const [dismissed, setDismissed] = useState<string[]>(readDismissed);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await axios.get('/api/technicalrequests/pending-rating');
        if (!cancelled) setQueue(res.data?.data || []);
      } catch {
        // Sessizce geç: popup kritik bir akış değil
      }
    };

    load();
    const timer = setInterval(load, POLL_MS);

    // Push geldiğinde (service worker mesajı) ve sekmeye dönüldüğünde anında yenile
    const onVisible = () => {
      if (document.visibilityState === 'visible') load();
    };
    const onSwMessage = (event: MessageEvent) => {
      if (event.data?.type === 'push-received') load();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', load);
    navigator.serviceWorker?.addEventListener('message', onSwMessage);

    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', load);
      navigator.serviceWorker?.removeEventListener('message', onSwMessage);
    };
  }, []);

  const dismiss = (id: string) => {
    setDismissed((prev) => {
      const next = prev.includes(id) ? prev : [...prev, id];
      try {
        window.sessionStorage.setItem(DISMISS_KEY, JSON.stringify(next));
      } catch {
        // sessionStorage kullanılamıyorsa yalnızca bellekte tutulur
      }
      return next;
    });
  };

  const current = queue.find((r) => !dismissed.includes(r._id));
  if (!current) return null;

  return (
    <RatingDialog
      key={current._id}
      request={current}
      onRated={(id) => setQueue((prev) => prev.filter((r) => r._id !== id))}
      onDismiss={dismiss}
    />
  );
}
