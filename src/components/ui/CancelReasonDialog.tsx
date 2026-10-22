'use client';

import React, { Fragment, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';

const MIN = 3;
const MAX = 500;

// Talebi iptal/red ederken neden yazdıran modal. Neden talep sahibine iletilir.
function Body({
    title,
    description,
    submitting,
    error,
    onConfirm,
    onClose
}: {
    title: string;
    description?: React.ReactNode;
    submitting: boolean;
    error?: string;
    onConfirm: (reason: string) => void;
    onClose: () => void;
}) {
    const [reason, setReason] = useState('');
    const trimmed = reason.trim();

    return (
        <form
            onSubmit={(e) => {
                e.preventDefault();
                if (trimmed.length >= MIN && !submitting) onConfirm(trimmed);
            }}
        >
            <Dialog.Title className="text-lg font-semibold text-base-content">{title}</Dialog.Title>
            {description && <div className="mt-1 text-sm text-base-content/60">{description}</div>}

            <label className="mt-4 block text-sm font-medium text-base-content/80">
                İptal / red nedeni <span className="text-error">*</span>
                <textarea
                    autoFocus
                    rows={4}
                    maxLength={MAX}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Örn: Bu saat aralığında müsait araç bulunmuyor."
                    className="mt-1.5 w-full rounded-lg border border-base-300 bg-base-100 px-3 py-2.5 text-sm font-normal text-base-content placeholder:text-base-content/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
                />
                <span className="mt-0.5 block text-right text-xs font-normal text-base-content/40">{reason.length}/{MAX}</span>
            </label>
            <p className="text-xs text-base-content/50">Bu neden talep sahibine bildirim ve e-posta ile iletilir.</p>

            {error && <p className="mt-2 text-sm font-medium text-error" role="alert">{error}</p>}

            <div className="mt-5 flex justify-end gap-2">
                <button
                    type="button"
                    onClick={onClose}
                    disabled={submitting}
                    className="h-10 rounded-lg px-4 text-sm font-medium text-base-content/70 ring-1 ring-inset ring-base-300 hover:bg-base-200 disabled:opacity-50"
                >
                    Vazgeç
                </button>
                <button
                    type="submit"
                    disabled={trimmed.length < MIN || submitting}
                    className="h-10 rounded-lg bg-error px-5 text-sm font-medium text-error-content hover:brightness-95 disabled:opacity-50"
                >
                    {submitting ? 'İptal ediliyor...' : 'Talebi İptal Et'}
                </button>
            </div>
        </form>
    );
}

export default function CancelReasonDialog({
    open,
    title = 'Talebi iptal et',
    description,
    submitting = false,
    error,
    onConfirm,
    onClose
}: {
    open: boolean;
    title?: string;
    description?: React.ReactNode;
    submitting?: boolean;
    error?: string;
    onConfirm: (reason: string) => void;
    onClose: () => void;
}) {
    return (
        <Transition appear show={open} as={Fragment}>
            <Dialog as="div" className="relative z-[60]" onClose={() => !submitting && onClose()}>
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
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-200"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-150"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="w-full max-w-md rounded-2xl border border-base-200 bg-base-100 p-6 shadow-2xl">
                                {/* Her açılışta yeni örnek: yazılan neden bir önceki talepten taşınmaz */}
                                <Body
                                    title={title}
                                    description={description}
                                    submitting={submitting}
                                    error={error}
                                    onConfirm={onConfirm}
                                    onClose={onClose}
                                />
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
}
