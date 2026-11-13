'use client';

import React from 'react';
import { riskLevel } from '@/src/lib/riskConfig';

const inputCls =
    'w-full rounded-lg border border-base-300 bg-base-100 px-3 py-2.5 text-sm text-base-content placeholder:text-base-content/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10 disabled:opacity-60 disabled:cursor-not-allowed';

export function Section({
    no, title, hint, children, tone = 'primary'
}: {
    no: string;
    title: string;
    hint?: string;
    children: React.ReactNode;
    tone?: 'primary' | 'warning' | 'success' | 'info' | 'secondary' | 'error';
}) {
    const toneCls: Record<string, string> = {
        primary: 'bg-primary text-primary-content', warning: 'bg-warning text-warning-content', success: 'bg-success text-success-content',
        info: 'bg-info text-info-content', secondary: 'bg-secondary text-secondary-content', error: 'bg-error text-error-content'
    };
    return (
        <section className="rounded-xl border border-base-200 bg-base-100 shadow-sm">
            <header className="flex items-start gap-3 border-b border-base-200 px-5 py-4">
                <span className={`flex h-7 min-w-7 items-center justify-center rounded-lg px-1.5 text-xs font-bold ${toneCls[tone]}`}>{no}</span>
                <div>
                    <h2 className="text-sm font-bold uppercase tracking-wide text-base-content">{title}</h2>
                    {hint && <p className="mt-0.5 text-xs text-base-content/60">{hint}</p>}
                </div>
            </header>
            <div className="space-y-4 p-5">{children}</div>
        </section>
    );
}

export function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
    return (
        <div>
            <label className="mb-1.5 block text-sm font-medium text-base-content/80">
                {label} {required && <span className="text-error">*</span>}
            </label>
            {children}
            {hint && <p className="mt-1 text-xs text-base-content/50">{hint}</p>}
        </div>
    );
}

export function TextInput({ value, onChange, disabled, placeholder, list }: {
    value: string; onChange: (v: string) => void; disabled?: boolean; placeholder?: string; list?: string;
}) {
    return <input className={inputCls} value={value} disabled={disabled} placeholder={placeholder} list={list} onChange={(e) => onChange(e.target.value)} />;
}

export function TextArea({ value, onChange, disabled, placeholder, rows = 3 }: {
    value: string; onChange: (v: string) => void; disabled?: boolean; placeholder?: string; rows?: number;
}) {
    return <textarea className={inputCls} rows={rows} maxLength={2000} value={value} disabled={disabled} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />;
}

export function DateInput({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled?: boolean }) {
    return <input type="date" className={inputCls} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} />;
}

export function SelectInput({ value, onChange, options, disabled, placeholder = 'Seçiniz' }: {
    value: string; onChange: (v: string) => void; options: readonly string[]; disabled?: boolean; placeholder?: string;
}) {
    return (
        <select className={inputCls} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)}>
            <option value="">{placeholder}</option>
            {options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
    );
}

// Tek seçimli: [{value,label}]
export function RadioGroup({ value, onChange, options, disabled }: {
    value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; disabled?: boolean;
}) {
    return (
        <div className="flex flex-wrap gap-2" role="radiogroup">
            {options.map((o) => (
                <button
                    key={o.value}
                    type="button"
                    role="radio"
                    aria-checked={value === o.value}
                    disabled={disabled}
                    onClick={() => onChange(value === o.value ? '' : o.value)}
                    className={`rounded-lg border px-3.5 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                        value === o.value ? 'border-primary bg-primary text-primary-content' : 'border-base-300 text-base-content/70 hover:bg-base-200'
                    }`}
                >
                    {o.label}
                </button>
            ))}
        </div>
    );
}

// Çoklu seçim
export function CheckGroup({ value, onChange, options, disabled }: {
    value: string[]; onChange: (v: string[]) => void; options: readonly string[]; disabled?: boolean;
}) {
    const toggle = (o: string) => onChange(value.includes(o) ? value.filter((x) => x !== o) : [...value, o]);
    return (
        <div className="flex flex-wrap gap-2">
            {options.map((o) => (
                <label
                    key={o}
                    className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                        value.includes(o) ? 'border-primary bg-primary/10 text-primary' : 'border-base-300 text-base-content/70 hover:bg-base-200'
                    } ${disabled ? 'pointer-events-none opacity-60' : ''}`}
                >
                    <input type="checkbox" className="checkbox checkbox-primary checkbox-xs" checked={value.includes(o)} onChange={() => toggle(o)} disabled={disabled} />
                    {o}
                </label>
            ))}
        </div>
    );
}

export function ScoreSelect({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled?: boolean }) {
    return <SelectInput value={value} onChange={onChange} disabled={disabled} options={['1', '2', '3', '4', '5']} placeholder="Seçiniz (1-5)" />;
}

const LEVEL_CLS: Record<string, string> = {
    dusuk: 'bg-success/15 text-success border-success/30',
    orta: 'bg-warning/15 text-warning border-warning/30',
    yuksek: 'bg-orange-500/15 text-orange-500 border-orange-500/30',
    cok_yuksek: 'bg-error/15 text-error border-error/30'
};

export function RiskBadge({ score }: { score: number | null | undefined }) {
    const level = riskLevel(score);
    if (!score || !level) return <span className="text-xs text-base-content/40">—</span>;
    return (
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${LEVEL_CLS[level.key]}`}>
            {score} · {level.label}
        </span>
    );
}

// Olasılık × Etki → Puan / Düzey (otomatik)
export function ScoreSummary({ olasilik, etki }: { olasilik: string; etki: string }) {
    const score = Number(olasilik) && Number(etki) ? Number(olasilik) * Number(etki) : null;
    return (
        <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-base-200/60 p-3">
                <div className="text-xs text-base-content/60">Risk Puanı (O×E)</div>
                <div className="mt-0.5 text-xl font-bold text-base-content">{score ?? '—'}</div>
            </div>
            <div className="rounded-lg bg-base-200/60 p-3">
                <div className="text-xs text-base-content/60">Risk Düzeyi</div>
                <div className="mt-1"><RiskBadge score={score} /></div>
            </div>
        </div>
    );
}

export const TRIPLE_OPTIONS = [{ value: 'evet', label: 'Evet' }, { value: 'kismen', label: 'Kısmen' }, { value: 'hayir', label: 'Hayır' }];
export const YES_NO_OPTIONS = [{ value: 'evet', label: 'Evet' }, { value: 'hayir', label: 'Hayır' }];

export function Notice({ tone, children }: { tone: 'info' | 'warning'; children: React.ReactNode }) {
    return (
        <p className={`rounded-lg border-l-4 p-3 text-xs ${tone === 'warning' ? 'border-warning bg-warning/10 text-base-content/80' : 'border-info bg-info/10 text-base-content/80'}`}>
            {children}
        </p>
    );
}
