import type { BatchItem, ImportReport, Importer, RowResult, RunOptions } from './types';

export const MAX_ROWS = 2000;

// Dosya şu biçimlerden birinde olabilir:
//   [ {...}, {...} ]
//   { "type": "kullanicilar", "rows": [ {...} ] }   (rows yerine data / items da olur)
export function extractRows(payload: unknown): { type?: string; rows: unknown[] } | { error: string } {
    if (Array.isArray(payload)) return { rows: payload };
    if (payload && typeof payload === 'object') {
        const obj = payload as Record<string, unknown>;
        const rows = obj.rows ?? obj.data ?? obj.items;
        if (Array.isArray(rows)) {
            return { type: typeof obj.type === 'string' ? obj.type : undefined, rows };
        }
    }
    return { error: 'JSON bir dizi olmalı ya da {"type": "...", "rows": [...]} biçiminde olmalı.' };
}

export async function runImport(importer: Importer, rawRows: unknown[], options: RunOptions): Promise<ImportReport> {
    const results: RowResult[] = [];
    const valid: BatchItem<unknown>[] = [];
    const seen = new Map<string, number>();

    if (rawRows.length === 0) {
        return buildReport(importer.key, options.dryRun, false, results);
    }
    if (rawRows.length > MAX_ROWS) {
        throw new Error(`Tek seferde en fazla ${MAX_ROWS} satır aktarılabilir (${rawRows.length} satır geldi).`);
    }

    // 1) Biçim doğrulama + dosya içi tekrar kontrolü
    rawRows.forEach((raw, index) => {
        const parsed = importer.parse(raw);
        if ('error' in parsed) {
            results[index] = { index, label: `Satır ${index + 1}`, status: 'error', message: parsed.error };
            return;
        }
        const label = importer.label_of(parsed.data);
        const key = importer.uniqueKey(parsed.data);
        const firstSeen = seen.get(key);
        if (firstSeen !== undefined) {
            results[index] = { index, label, status: 'error', message: `Dosyada tekrar ediyor (satır ${firstSeen + 1} ile aynı).` };
            return;
        }
        seen.set(key, index);
        valid.push({ index, data: parsed.data });
        results[index] = { index, label, status: 'will_create' };
    });

    // 2) Çapraz kontrol (ör. amir e-postası)
    if (importer.crossCheck && valid.length > 0) {
        const problems = await importer.crossCheck(valid);
        for (const [index, message] of problems) {
            results[index] = { ...results[index], status: 'error', message };
        }
    }

    // 3) Veritabanında zaten olanlar atlanır
    for (const item of valid) {
        if (results[item.index].status !== 'will_create') continue;
        if (await importer.exists(item.data)) {
            results[item.index] = { ...results[item.index], status: 'skipped', message: 'Zaten kayıtlı, atlanacak.' };
        }
    }

    const hasErrors = results.some((r) => r.status === 'error');

    // Hata varsa ve "hatalıları atla" seçilmediyse hiçbir şey yazma
    if (!options.dryRun && hasErrors && !options.skipInvalid) {
        return buildReport(importer.key, options.dryRun, true, results);
    }

    // 4) Yazma
    if (!options.dryRun) {
        const created: BatchItem<unknown>[] = [];
        for (const item of valid) {
            if (results[item.index].status !== 'will_create') continue;
            try {
                await importer.create(item.data);
                results[item.index] = { ...results[item.index], status: 'created' };
                created.push(item);
            } catch (err) {
                results[item.index] = { ...results[item.index], status: 'error', message: errorMessage(err) };
            }
        }
        if (importer.finalize && created.length > 0) {
            const problems = await importer.finalize(created);
            for (const [index, message] of problems) {
                results[index] = { ...results[index], message };
            }
        }
    }

    return buildReport(importer.key, options.dryRun, false, results);
}

function errorMessage(err: unknown): string {
    if (err && typeof err === 'object') {
        const e = err as { code?: number; message?: string };
        if (e.code === 11000) return 'Zaten kayıtlı (benzersizlik ihlali).';
        if (e.message) return e.message;
    }
    return 'Bilinmeyen hata.';
}

function buildReport(type: string, dryRun: boolean, aborted: boolean, rows: RowResult[]): ImportReport {
    const list = rows.filter(Boolean);
    return {
        type,
        dryRun,
        aborted,
        summary: {
            total: list.length,
            willCreate: list.filter((r) => r.status === 'will_create').length,
            created: list.filter((r) => r.status === 'created').length,
            skipped: list.filter((r) => r.status === 'skipped').length,
            errors: list.filter((r) => r.status === 'error').length
        },
        rows: list
    };
}
