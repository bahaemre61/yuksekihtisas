'use client';

import React, { useState } from 'react';

export type AlertVariant = 'success' | 'error' | 'warning' | 'info';

// "Material Dashboard" referansındaki gradyanlı, kapatılabilir basit bildirim çubuğu
const VARIANT_GRADIENTS: Record<AlertVariant, string> = {
  success: 'linear-gradient(195deg, #66bb6a, #43a047)',
  error: 'linear-gradient(195deg, #ef5350, #e53935)',
  warning: 'linear-gradient(195deg, #ffa726, #fb8c00)',
  info: 'linear-gradient(195deg, #49a3f1, #1a73e8)'
};

export default function Alert({
  variant,
  children,
  onClose
}: {
  variant: AlertVariant;
  children: React.ReactNode;
  onClose?: () => void;
}) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <div
      className="relative flex items-center justify-between gap-3 rounded-md py-3 pl-4 pr-10 text-sm font-semibold text-white"
      style={{ backgroundImage: VARIANT_GRADIENTS[variant] }}
      role="alert"
    >
      <span>{children}</span>
      <button
        type="button"
        aria-label="Kapat"
        onClick={() => {
          setDismissed(true);
          onClose?.();
        }}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/80 hover:text-white text-lg leading-none"
      >
        &times;
      </button>
    </div>
  );
}
