import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import connectToDatabase from '@/src/lib/db';
import { getAuthenticatedUser } from '@/src/lib/auth';
import { getImporter, importers } from '@/src/lib/bulkImport/importers';
import { MAX_ROWS, runImport } from '@/src/lib/bulkImport/runner';

// Panelde veri tiplerini, alan açıklamalarını ve örnek JSON'ları listeler
export async function GET(request: NextRequest) {
    const { user, error } = getAuthenticatedUser(request);
    if (error) return error;
    if (user.role !== 'admin') return NextResponse.json({ msg: 'Yasak: Yetkisiz giriş.' }, { status: 403 });

    return NextResponse.json({
        maxRows: MAX_ROWS,
        types: importers.map(({ key, label, description, fields, example }) => ({ key, label, description, fields, example }))
    });
}

// body: { type, rows: [...], dryRun?: boolean (varsayılan true), skipInvalid?: boolean }
export async function POST(request: NextRequest) {
    const { user, error } = getAuthenticatedUser(request);
    if (error) return error;
    if (user.role !== 'admin') return NextResponse.json({ msg: 'Yasak: Yetkisiz giriş.' }, { status: 403 });

    try {
        const body = await request.json();
        const importer = typeof body?.type === 'string' ? getImporter(body.type) : undefined;
        if (!importer) {
            return NextResponse.json({ msg: 'Geçersiz veri tipi.' }, { status: 400 });
        }
        if (!Array.isArray(body.rows)) {
            return NextResponse.json({ msg: '"rows" bir dizi olmalı.' }, { status: 400 });
        }
        if (body.rows.length > MAX_ROWS) {
            return NextResponse.json({ msg: `Tek seferde en fazla ${MAX_ROWS} satır aktarılabilir.` }, { status: 400 });
        }

        // Güvenli varsayılan: açıkça dryRun:false gönderilmedikçe hiçbir şey yazılmaz
        const dryRun = body.dryRun !== false;

        await connectToDatabase();
        const report = await runImport(importer, body.rows, { dryRun, skipInvalid: body.skipInvalid === true });

        if (!dryRun) {
            console.log(`[bulk-import] ${user.name} (${user.id}) ${importer.key}: ${JSON.stringify(report.summary)}`);
        }
        return NextResponse.json(report);
    } catch (err) {
        console.error('Bulk import error:', err);
        return NextResponse.json({ msg: 'Aktarım sırasında sunucu hatası oluştu.' }, { status: 500 });
    }
}
