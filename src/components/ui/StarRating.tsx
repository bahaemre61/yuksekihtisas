'use client';

import React, { useState } from 'react';
import { StarIcon as StarSolid } from '@heroicons/react/24/solid';
import { StarIcon as StarOutline } from '@heroicons/react/24/outline';

const SIZES = { sm: 'h-4 w-4', md: 'h-6 w-6', lg: 'h-9 w-9' } as const;

export const RATING_LABELS: Record<number, string> = {
  1: 'Çok Kötü',
  2: 'Kötü',
  3: 'Orta',
  4: 'İyi',
  5: 'Çok İyi'
};

// onChange verilirse etkileşimli (1-5 seçim), verilmezse salt görüntüleme yıldızlarıdır.
export default function StarRating({
  value,
  onChange,
  size = 'md'
}: {
  value: number;
  onChange?: (score: number) => void;
  size?: keyof typeof SIZES;
}) {
  const [hover, setHover] = useState(0);
  const interactive = Boolean(onChange);
  const shown = interactive && hover ? hover : value;

  if (!interactive) {
    return (
      <span className="inline-flex items-center gap-0.5" role="img" aria-label={`5 üzerinden ${value} yıldız`}>
        {[1, 2, 3, 4, 5].map((n) =>
          n <= value ? (
            <StarSolid key={n} className={`${SIZES[size]} text-amber-400`} />
          ) : (
            <StarOutline key={n} className={`${SIZES[size]} text-base-content/25`} />
          )
        )}
      </span>
    );
  }

  return (
    <div className="inline-flex items-center gap-1" role="radiogroup" aria-label="Puan" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} yıldız - ${RATING_LABELS[n]}`}
          onClick={() => onChange?.(n)}
          onMouseEnter={() => setHover(n)}
          onFocus={() => setHover(n)}
          onBlur={() => setHover(0)}
          className="rounded-md p-0.5 transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          {n <= shown ? (
            <StarSolid className={`${SIZES[size]} text-amber-400`} />
          ) : (
            <StarOutline className={`${SIZES[size]} text-base-content/30`} />
          )}
        </button>
      ))}
    </div>
  );
}
